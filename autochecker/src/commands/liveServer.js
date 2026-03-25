// filepath: src/commands/liveServer.js

const vscode = require('vscode');
const fs = require('fs');
const path = require('path');
const http = require('http');
const { getRoot } = require('../utils/helpers');

// ── Live Server ─────────────────────────────────────────────────────────────

const LIVE_SERVER_PORT = 5500;
const MIME_TYPES = {
  '.html': 'text/html',
  '.css': 'text/css',
  '.js': 'text/javascript',
  '.mjs': 'text/javascript',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.webp': 'image/webp',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
  '.otf': 'font/otf',
  '.mp4': 'video/mp4',
  '.webm': 'video/webm',
  '.mp3': 'audio/mpeg',
  '.wav': 'audio/wav',
  '.pdf': 'application/pdf',
  '.map': 'application/json',
  '.ts': 'text/javascript',
  '.tsx': 'text/javascript',
  '.jsx': 'text/javascript',
};

const LIVE_RELOAD_SCRIPT = `
<script>
(function() {
  var ws = new WebSocket('ws://localhost:${LIVE_SERVER_PORT + 1}');
  ws.onmessage = function(e) {
    if (e.data === 'reload') location.reload();
  };
  ws.onclose = function() {
    setTimeout(function() { location.reload(); }, 1000);
  };
})();
</script>
`;

let liveServer = null;
let wsServer = null;
let wsClients = [];
let fileWatcher = null;
let statusBarItem = null;

function getMimeType(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  return MIME_TYPES[ext] || 'application/octet-stream';
}

function htmlEscape(s) {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function injectLiveReload(html) {
  if (html.includes('</body>')) {
    return html.replace('</body>', LIVE_RELOAD_SCRIPT + '</body>');
  }
  return html + LIVE_RELOAD_SCRIPT;
}

function notifyClients() {
  wsClients.forEach((ws) => {
    try {
      if (ws.readyState === 1) ws.send('reload');
    } catch (_) {}
  });
}

function startWebSocketServer() {
  const net = require('net');
  const crypto = require('crypto');

  wsServer = net.createServer((socket) => {
    let handshaken = false;
    let buffer = Buffer.alloc(0);

    socket.on('data', (data) => {
      if (!handshaken) {
        const request = data.toString();
        const keyMatch = request.match(/Sec-WebSocket-Key:\s*(.+)\r\n/i);
        if (!keyMatch) return socket.destroy();

        const acceptKey = crypto
          .createHash('sha1')
          .update(keyMatch[1].trim() + '258EAFA5-E914-47DA-95CA-5AB5DC4AB6D0')
          .digest('base64');

        socket.write(
          'HTTP/1.1 101 Switching Protocols\r\n' +
            'Upgrade: websocket\r\n' +
            'Connection: Upgrade\r\n' +
            `Sec-WebSocket-Accept: ${acceptKey}\r\n\r\n`,
        );

        handshaken = true;
        wsClients.push(socket);
        return;
      }

      // Parse WebSocket frames (handle ping/pong and close)
      buffer = Buffer.concat([buffer, data]);
      while (buffer.length >= 2) {
        const opcode = buffer[0] & 0x0f;
        const masked = (buffer[1] & 0x80) !== 0;
        let payloadLen = buffer[1] & 0x7f;
        let offset = 2;

        if (payloadLen === 126) {
          if (buffer.length < 4) return;
          payloadLen = buffer.readUInt16BE(2);
          offset = 4;
        } else if (payloadLen === 127) {
          if (buffer.length < 10) return;
          payloadLen = Number(buffer.readBigUInt64BE(2));
          offset = 10;
        }

        if (masked) offset += 4;
        if (buffer.length < offset + payloadLen) return;

        // Close frame
        if (opcode === 8) {
          socket.destroy();
          return;
        }

        buffer = buffer.slice(offset + payloadLen);
      }
    });

    socket.on('close', () => {
      wsClients = wsClients.filter((c) => c !== socket);
    });

    socket.on('error', () => {
      wsClients = wsClients.filter((c) => c !== socket);
    });
  });

  wsServer.listen(LIVE_SERVER_PORT + 1);
}

function startLiveServer() {
  const rootDir = getRoot();
  if (!rootDir) return;

  if (liveServer) {
    vscode.window.showWarningMessage(
      'AutoChecker: Live Server is already running on port ' + LIVE_SERVER_PORT,
    );
    return;
  }

  liveServer = http.createServer((req, res) => {
    let urlPath = decodeURIComponent(req.url.split('?')[0]);
    if (urlPath === '/') urlPath = '/index.html';

    const filePath = path.join(rootDir, urlPath);

    // Security: prevent path traversal.
    // Use path.resolve() + separator suffix to avoid prefix-match bypass
    // (e.g. rootDir=/workspace would incorrectly allow /workspace-evil).
    const resolvedRoot = path.resolve(rootDir);
    const resolvedFile = path.resolve(filePath);
    if (resolvedFile !== resolvedRoot && !resolvedFile.startsWith(resolvedRoot + path.sep)) {
      res.writeHead(403);
      res.end('Forbidden');
      return;
    }

    fs.stat(filePath, (err, stats) => {
      if (err || !stats.isFile()) {
        // Try index.html in directory
        const indexPath = path.join(filePath, 'index.html');
        fs.stat(indexPath, (err2, stats2) => {
          if (err2 || !stats2.isFile()) {
            res.writeHead(404, { 'Content-Type': 'text/html; charset=utf-8' });
            // htmlEscape prevents XSS via crafted URLs (e.g. decoded %3Cscript%3E)
            res.end(`<h1>404</h1><p>${htmlEscape(urlPath)} not found</p>`);
            return;
          }
          serveFile(indexPath, res);
        });
        return;
      }
      serveFile(filePath, res);
    });
  });

  function serveFile(filePath, res) {
    const mime = getMimeType(filePath);
    fs.readFile(filePath, (err, data) => {
      if (err) {
        res.writeHead(500);
        res.end('Internal Server Error');
        return;
      }

      res.writeHead(200, {
        'Content-Type': mime,
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Access-Control-Allow-Origin': '*',
      });

      // Inject live reload script into HTML files
      if (mime === 'text/html') {
        res.end(injectLiveReload(data.toString('utf-8')));
      } else {
        res.end(data);
      }
    });
  }

  liveServer.on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
      vscode.window.showErrorMessage(`AutoChecker: Port ${LIVE_SERVER_PORT} is already in use.`);
    } else {
      vscode.window.showErrorMessage(`AutoChecker: Live Server error — ${err.message}`);
    }
    liveServer = null;
  });

  liveServer.listen(LIVE_SERVER_PORT, () => {
    // Start WebSocket server for live reload
    startWebSocketServer();

    // File watcher — reload on save
    const watcher = vscode.workspace.createFileSystemWatcher(
      new vscode.RelativePattern(rootDir, '**/*.{html,css,js,json,svg,jsx,tsx,ts}'),
    );
    watcher.onDidChange(() => notifyClients());
    watcher.onDidCreate(() => notifyClients());
    watcher.onDidDelete(() => notifyClients());
    fileWatcher = watcher;

    // Status bar
    statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100);
    statusBarItem.text = '$(radio-tower) Port: ' + LIVE_SERVER_PORT;
    statusBarItem.tooltip = 'AutoChecker Live Server — click to stop';
    statusBarItem.command = 'autochecker.stopLiveServer';
    statusBarItem.show();

    const url = `http://localhost:${LIVE_SERVER_PORT}`;
    vscode.window
      .showInformationMessage(`AutoChecker: Live Server running at ${url}`, 'Open in Browser')
      .then((action) => {
        if (action === 'Open in Browser') {
          vscode.env.openExternal(vscode.Uri.parse(url));
        }
      });
  });
}

function stopLiveServer() {
  if (!liveServer) {
    vscode.window.showWarningMessage('AutoChecker: Live Server is not running.');
    return;
  }

  // Close all WebSocket clients
  wsClients.forEach((ws) => {
    try {
      ws.destroy();
    } catch (_) {}
  });
  wsClients = [];

  // Close WebSocket server
  if (wsServer) {
    wsServer.close();
    wsServer = null;
  }

  // Close HTTP server
  liveServer.close();
  liveServer = null;

  // Dispose file watcher
  if (fileWatcher) {
    fileWatcher.dispose();
    fileWatcher = null;
  }

  // Remove status bar
  if (statusBarItem) {
    statusBarItem.dispose();
    statusBarItem = null;
  }

  vscode.window.showInformationMessage('AutoChecker: Live Server stopped.');
}

module.exports = { getMimeType, injectLiveReload, notifyClients, startWebSocketServer, startLiveServer, stopLiveServer };
