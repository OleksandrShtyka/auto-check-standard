// filepath: src/extension.js

const vscode = require('vscode');
const fs = require('fs');
const path = require('path');
const http = require('http');

// ── Config Data ──────────────────────────────────────────────────────────────

const PRETTIERRC = JSON.stringify(
  {
    semi: true,
    trailingComma: 'all',
    singleQuote: true,
    printWidth: 100,
    tabWidth: 2,
    singleAttributePerLine: true,
    plugins: ['prettier-plugin-tailwindcss', '@trivago/prettier-plugin-sort-imports'],
    importOrder: ['^@/(.*)$', '^[./]'],
    importOrderSeparation: true,
    importOrderSortSpecifiers: true,
  },
  null,
  2,
);

const ESLINTRC = JSON.stringify(
  {
    extends: [
      'next/core-web-vitals',
      'plugin:@typescript-eslint/recommended',
      'plugin:prettier/recommended',
    ],
    rules: {
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/no-unused-vars': 'warn',
      'no-console': ['warn', { allow: ['warn', 'error'] }],
      'react/self-closing-comp': 'error',
      'import/order': 'off',
    },
  },
  null,
  2,
);

const GITIGNORE = `# Dependencies
node_modules/
/.pnp
.pnp.js

# Testing
/coverage

# Next.js
/.next/
/out/

# Production
/build
/dist

# Debug
npm-debug.log*
yarn-debug.log*
yarn-error.log*
.pnpm-debug.log*

# Env
.env*
.env.local

# OS
.DS_Store
Thumbs.db

# Custom
arch_swiss_knife.py
`;

const VSCODE_SETTINGS = JSON.stringify(
  {
    'editor.formatOnSave': true,
    'editor.defaultFormatter': 'esbenp.prettier-vscode',
    'editor.codeActionsOnSave': {
      'source.fixAll.eslint': 'explicit',
    },
    'tailwindCSS.emmetCompletions': true,
    'editor.inlineSuggest.enabled': true,
  },
  null,
  2,
);

const CODE_SNIPPETS = JSON.stringify(
  {
    'React Architecture Component': {
      prefix: 'rafc',
      body: [
        "import { FC } from 'react';",
        "import { cn } from '@/utils/cn';",
        '',
        'interface ${1:${TM_FILENAME_BASE}}Props {',
        '  className?: string;',
        '}',
        '',
        'export const ${1:${TM_FILENAME_BASE}}: FC<${1:${TM_FILENAME_BASE}}Props> = ({ className }) => {',
        '  return (',
        "    <div className={cn('$2', className)}>",
        '      $0',
        '    </div>',
        '  );',
        '};',
      ],
      description: 'Base FAANG-style React Component',
    },
  },
  null,
  2,
);

// ── Scaffold Directories ────────────────────────────────────────────────────

const SCAFFOLD_DIRS = [
  'src/components',
  'src/hooks',
  'src/utils',
  'src/styles',
  'src/lib',
  'src/types',
  'src/services',
  'src/constants',
];

const SCAFFOLD_FILES = [
  {
    relativePath: path.join('src', 'components', '.gitkeep'),
    content: '',
  },
  {
    relativePath: path.join('src', 'hooks', '.gitkeep'),
    content: '',
  },
  {
    relativePath: path.join('src', 'utils', '.gitkeep'),
    content: '',
  },
  {
    relativePath: path.join('src', 'styles', 'globals.css'),
    content: `@tailwind base;\n@tailwind components;\n@tailwind utilities;\n`,
  },
  {
    relativePath: path.join('src', 'lib', '.gitkeep'),
    content: '',
  },
  {
    relativePath: path.join('src', 'types', 'index.ts'),
    content: `// Global type definitions\nexport {};\n`,
  },
  {
    relativePath: path.join('src', 'services', '.gitkeep'),
    content: '',
  },
  {
    relativePath: path.join('src', 'constants', 'index.ts'),
    content: `// App-wide constants\nexport const APP_NAME = 'MyApp';\n`,
  },
];

// ── Config File Entries ─────────────────────────────────────────────────────

const CONFIG_FILES = [
  { relativePath: '.prettierrc', content: PRETTIERRC },
  { relativePath: '.eslintrc.json', content: ESLINTRC },
  { relativePath: '.gitignore', content: GITIGNORE },
  { relativePath: path.join('.vscode', 'settings.json'), content: VSCODE_SETTINGS },
  { relativePath: path.join('.vscode', 'shtyka.code-snippets'), content: CODE_SNIPPETS },
];

// ── Helpers ──────────────────────────────────────────────────────────────────

function getRoot() {
  const folders = vscode.workspace.workspaceFolders;
  if (!folders || folders.length === 0) {
    vscode.window.showErrorMessage(
      'AutoChecker: No workspace folder is open. Please open a folder first.',
    );
    return null;
  }
  return folders[0].uri.fsPath;
}

function ensureDirSync(dirPath) {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
}

function writeFileEntry(rootDir, entry) {
  const fullPath = path.join(rootDir, entry.relativePath);
  ensureDirSync(path.dirname(fullPath));
  fs.writeFileSync(fullPath, entry.content, 'utf-8');
}

function writeEntries(rootDir, entries, label) {
  try {
    for (const entry of entries) {
      writeFileEntry(rootDir, entry);
    }
    vscode.window.showInformationMessage(`AutoChecker: ${label} — done! 🚀`);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    vscode.window.showErrorMessage(`AutoChecker: Failed — ${message}`);
  }
}

// ── Commands ─────────────────────────────────────────────────────────────────

/** Generate config files only (.prettierrc, .eslintrc, .gitignore, .vscode/) */
async function initConfigs() {
  const rootDir = getRoot();
  if (!rootDir) return;

  const confirm = await vscode.window.showWarningMessage(
    'AutoChecker: Create config files? Existing files will be overwritten.',
    { modal: true },
    'Proceed',
  );
  if (confirm !== 'Proceed') return;

  writeEntries(rootDir, CONFIG_FILES, `Created ${CONFIG_FILES.length} config files`);
}

/** Scaffold project directory structure only */
async function initScaffold() {
  const rootDir = getRoot();
  if (!rootDir) return;

  const confirm = await vscode.window.showWarningMessage(
    'AutoChecker: Create project scaffold directories?',
    { modal: true },
    'Proceed',
  );
  if (confirm !== 'Proceed') return;

  try {
    for (const dir of SCAFFOLD_DIRS) {
      ensureDirSync(path.join(rootDir, dir));
    }

    for (const entry of SCAFFOLD_FILES) {
      const fullPath = path.join(rootDir, entry.relativePath);
      // Don't overwrite existing files in scaffold
      if (!fs.existsSync(fullPath)) {
        writeFileEntry(rootDir, entry);
      }
    }

    vscode.window.showInformationMessage(
      `AutoChecker: Scaffolded ${SCAFFOLD_DIRS.length} directories! 📁`,
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    vscode.window.showErrorMessage(`AutoChecker: Failed — ${message}`);
  }
}

/** Full init — configs + scaffold */
async function initFullArchitecture() {
  const rootDir = getRoot();
  if (!rootDir) return;

  const confirm = await vscode.window.showWarningMessage(
    'AutoChecker: This will create config files AND scaffold directories. Existing config files will be overwritten.',
    { modal: true },
    'Proceed',
  );
  if (confirm !== 'Proceed') return;

  try {
    // Configs
    for (const entry of CONFIG_FILES) {
      writeFileEntry(rootDir, entry);
    }

    // Scaffold dirs
    for (const dir of SCAFFOLD_DIRS) {
      ensureDirSync(path.join(rootDir, dir));
    }

    // Scaffold files (skip existing)
    for (const entry of SCAFFOLD_FILES) {
      const fullPath = path.join(rootDir, entry.relativePath);
      if (!fs.existsSync(fullPath)) {
        writeFileEntry(rootDir, entry);
      }
    }

    const total = CONFIG_FILES.length + SCAFFOLD_DIRS.length;
    vscode.window.showInformationMessage(
      `AutoChecker: Full architecture initialized — ${CONFIG_FILES.length} configs + ${SCAFFOLD_DIRS.length} directories! 🚀`,
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    vscode.window.showErrorMessage(`AutoChecker: Failed — ${message}`);
  }
}

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

    // Security: prevent path traversal
    if (!filePath.startsWith(rootDir)) {
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
            res.writeHead(404, { 'Content-Type': 'text/html' });
            res.end(`<h1>404</h1><p>${urlPath} not found</p>`);
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

// ── Turbo Console Log ───────────────────────────────────────────────────────

const LOG_PREFIX = '🔍 ACL:';

function getSelectedVariable(editor) {
  const selection = editor.selection;
  const document = editor.document;

  // If there's a selection, use it
  if (!selection.isEmpty) {
    return document.getText(selection);
  }

  // Otherwise, get the word under cursor
  const wordRange = document.getWordRangeAtPosition(selection.active);
  if (wordRange) {
    return document.getText(wordRange);
  }

  return null;
}

function getLogLine(varName, fileName, lineNumber, method) {
  const label = `${LOG_PREFIX} ${fileName}:${lineNumber}`;
  return `${method}('${label} → ${varName}:', ${varName});`;
}

function detectIndentation(line) {
  const match = line.match(/^(\s*)/);
  return match ? match[1] : '';
}

async function insertLog(method) {
  const editor = vscode.window.activeTextEditor;
  if (!editor) return;

  const document = editor.document;
  const varName = getSelectedVariable(editor);

  if (!varName) {
    vscode.window.showWarningMessage('AutoChecker: Select a variable or place cursor on one.');
    return;
  }

  const activeLine = editor.selection.active.line;
  const currentLineText = document.lineAt(activeLine).text;
  const indent = detectIndentation(currentLineText);
  const fileName = path.basename(document.fileName);
  const logStatement = getLogLine(varName, fileName, activeLine + 1, method);
  const insertLine = activeLine + 1;

  await editor.edit((editBuilder) => {
    editBuilder.insert(new vscode.Position(insertLine, 0), `${indent}${logStatement}\n`);
  });
}

async function commentAllLogs() {
  const editor = vscode.window.activeTextEditor;
  if (!editor) return;

  const document = editor.document;
  const text = document.getText();
  const logPattern = /^(\s*)(console\.(log|warn|error|info|debug|table)\()/gm;
  let match;
  const edits = [];

  while ((match = logPattern.exec(text)) !== null) {
    const pos = document.positionAt(match.index);
    const line = document.lineAt(pos.line);
    const lineText = line.text;

    // Skip already commented lines
    if (lineText.trimStart().startsWith('//')) continue;

    edits.push({
      line: pos.line,
      indent: match[1],
      content: lineText,
    });
  }

  if (edits.length === 0) {
    vscode.window.showInformationMessage('AutoChecker: No console logs found in this file.');
    return;
  }

  await editor.edit((editBuilder) => {
    for (const entry of edits) {
      const line = document.lineAt(entry.line);
      editBuilder.replace(line.range, entry.indent + '// ' + entry.content.trimStart());
    }
  });

  vscode.window.showInformationMessage(`AutoChecker: Commented ${edits.length} console logs.`);
}

async function uncommentAllLogs() {
  const editor = vscode.window.activeTextEditor;
  if (!editor) return;

  const document = editor.document;
  const text = document.getText();
  const commentedLogPattern = /^(\s*)\/\/\s*(console\.(log|warn|error|info|debug|table)\()/gm;
  let match;
  const edits = [];

  while ((match = commentedLogPattern.exec(text)) !== null) {
    const pos = document.positionAt(match.index);
    edits.push({
      line: pos.line,
      indent: match[1],
      statement: match[2],
    });
  }

  if (edits.length === 0) {
    vscode.window.showInformationMessage('AutoChecker: No commented console logs found.');
    return;
  }

  await editor.edit((editBuilder) => {
    for (const entry of edits) {
      const line = document.lineAt(entry.line);
      const lineText = line.text;
      // Remove the "// " prefix, keep indent
      const uncommented = lineText.replace(/^(\s*)\/\/\s*/, '$1');
      editBuilder.replace(line.range, uncommented);
    }
  });

  vscode.window.showInformationMessage(`AutoChecker: Uncommented ${edits.length} console logs.`);
}

async function deleteAllLogs() {
  const editor = vscode.window.activeTextEditor;
  if (!editor) return;

  const document = editor.document;
  const linesToDelete = [];

  for (let i = 0; i < document.lineCount; i++) {
    const lineText = document.lineAt(i).text.trimStart();
    // Match both active and commented console logs
    const cleaned = lineText.replace(/^\/\/\s*/, '');
    if (/^console\.(log|warn|error|info|debug|table)\(/.test(cleaned)) {
      linesToDelete.push(i);
    }
  }

  if (linesToDelete.length === 0) {
    vscode.window.showInformationMessage('AutoChecker: No console logs found to delete.');
    return;
  }

  await editor.edit((editBuilder) => {
    // Delete in reverse to keep line numbers stable
    for (let i = linesToDelete.length - 1; i >= 0; i--) {
      const lineNum = linesToDelete[i];
      const line = document.lineAt(lineNum);
      // Delete the entire line including the newline
      const range =
        lineNum < document.lineCount - 1
          ? new vscode.Range(lineNum, 0, lineNum + 1, 0)
          : line.rangeIncludingLineBreak;
      editBuilder.delete(range);
    }
  });

  vscode.window.showInformationMessage(
    `AutoChecker: Deleted ${linesToDelete.length} console logs. 🗑️`,
  );
}

// ── Import Sorter ───────────────────────────────────────────────────────────

async function sortImports() {
  const editor = vscode.window.activeTextEditor;
  if (!editor) return;

  const doc = editor.document;
  const text = doc.getText();
  const lines = text.split('\n');

  // Find import block (contiguous import lines at top)
  let importStart = -1;
  let importEnd = -1;
  const importLines = [];

  for (let i = 0; i < lines.length; i++) {
    const trimmed = lines[i].trim();
    if (
      trimmed.startsWith('import ') ||
      trimmed.startsWith("import '") ||
      trimmed.startsWith('import "')
    ) {
      if (importStart === -1) importStart = i;
      importEnd = i;
      importLines.push(lines[i]);
    } else if (importStart !== -1 && trimmed === '') {
      // Allow empty lines within import block
      continue;
    } else if (importStart !== -1) {
      break;
    }
  }

  if (importLines.length < 2) {
    vscode.window.showInformationMessage('AutoChecker: Not enough imports to sort.');
    return;
  }

  // Sort: react first, then libs, then @/ aliases, then relative
  const getWeight = (line) => {
    if (/from\s+['"]react['"]/.test(line)) return 0;
    if (/from\s+['"]next/.test(line)) return 1;
    if (/from\s+['"]@\//.test(line)) return 3;
    if (/from\s+['"]\./.test(line)) return 4;
    return 2; // third-party libs
  };

  const sorted = [...importLines].sort((a, b) => {
    const wa = getWeight(a),
      wb = getWeight(b);
    if (wa !== wb) return wa - wb;
    return a.localeCompare(b);
  });

  // Add blank lines between groups
  const result = [];
  let lastWeight = -1;
  for (const line of sorted) {
    const w = getWeight(line);
    if (lastWeight !== -1 && w !== lastWeight) result.push('');
    result.push(line);
    lastWeight = w;
  }

  await editor.edit((eb) => {
    const range = new vscode.Range(importStart, 0, importEnd, lines[importEnd].length);
    eb.replace(range, result.join('\n'));
  });

  vscode.window.showInformationMessage(`AutoChecker: Sorted ${importLines.length} imports.`);
}

// ── Unused Imports Remover ──────────────────────────────────────────────────

async function removeUnusedImports() {
  const editor = vscode.window.activeTextEditor;
  if (!editor) return;

  const doc = editor.document;
  const text = doc.getText();
  const lines = text.split('\n');
  const linesToRemove = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line.startsWith('import ')) continue;

    // Extract imported names
    const namedMatch = line.match(/import\s*\{([^}]+)\}\s*from/);
    const defaultMatch = line.match(/import\s+(\w+)\s+from/);
    const allMatch = line.match(/import\s+\*\s+as\s+(\w+)\s+from/);

    // Side-effect imports (import 'styles.css') — keep
    if (!namedMatch && !defaultMatch && !allMatch) continue;

    const names = [];
    if (namedMatch) {
      namedMatch[1].split(',').forEach((n) => {
        const clean = n.trim().split(/\s+as\s+/);
        names.push(clean[clean.length - 1].trim());
      });
    }
    if (defaultMatch && !allMatch) names.push(defaultMatch[1]);
    if (allMatch) names.push(allMatch[1]);

    // Check if any name is used in the rest of the code (excluding import lines)
    const codeWithoutImports = lines.filter((_, idx) => idx !== i).join('\n');
    const allUnused = names.every((name) => {
      if (!name) return false;
      // Match as whole word, not part of another word
      const regex = new RegExp('\\b' + name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\b');
      // Check usage outside of import statements
      const nonImportCode = codeWithoutImports.replace(/^import\s+.*$/gm, '');
      return !regex.test(nonImportCode);
    });

    if (allUnused && names.length > 0) {
      linesToRemove.push(i);
    }
  }

  if (linesToRemove.length === 0) {
    vscode.window.showInformationMessage('AutoChecker: No unused imports found.');
    return;
  }

  await editor.edit((eb) => {
    for (let i = linesToRemove.length - 1; i >= 0; i--) {
      const lineNum = linesToRemove[i];
      const range =
        lineNum < doc.lineCount - 1
          ? new vscode.Range(lineNum, 0, lineNum + 1, 0)
          : doc.lineAt(lineNum).rangeIncludingLineBreak;
      eb.delete(range);
    }
  });

  vscode.window.showInformationMessage(
    `AutoChecker: Removed ${linesToRemove.length} unused imports. 🧹`,
  );
}

// ── TODO/FIXME Scanner ──────────────────────────────────────────────────────

async function scanTodos() {
  const rootDir = getRoot();
  if (!rootDir) return;

  const pattern = /\b(TODO|FIXME|HACK|BUG|XXX|WARN)\b[:\s]*(.*)/i;
  const results = [];
  const extensions = ['.ts', '.tsx', '.js', '.jsx', '.vue', '.css', '.scss', '.html'];

  function scanDir(dir, depth) {
    if (depth > 6) return;
    let entries;
    try {
      entries = fs.readdirSync(dir, { withFileTypes: true });
    } catch (_) {
      return;
    }

    for (const entry of entries) {
      if (
        entry.name.startsWith('.') ||
        entry.name === 'node_modules' ||
        entry.name === 'dist' ||
        entry.name === 'build' ||
        entry.name === '.next'
      )
        continue;

      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        scanDir(fullPath, depth + 1);
      } else if (extensions.some((ext) => entry.name.endsWith(ext))) {
        try {
          const content = fs.readFileSync(fullPath, 'utf-8');
          const lines = content.split('\n');
          lines.forEach((line, idx) => {
            const match = line.match(pattern);
            if (match) {
              results.push({
                file: path.relative(rootDir, fullPath),
                line: idx + 1,
                tag: match[1].toUpperCase(),
                text: match[2].trim() || '(no description)',
              });
            }
          });
        } catch (_) {}
      }
    }
  }

  scanDir(rootDir, 0);

  if (results.length === 0) {
    vscode.window.showInformationMessage('AutoChecker: No TODOs found! 🎉');
    return;
  }

  const items = results.map((r) => ({
    label: `$(${r.tag === 'FIXME' || r.tag === 'BUG' ? 'warning' : 'checklist'}) [${r.tag}] ${r.text}`,
    description: `${r.file}:${r.line}`,
    filePath: path.join(rootDir, r.file),
    lineNum: r.line,
  }));

  const picked = await vscode.window.showQuickPick(items, {
    placeHolder: `Found ${results.length} TODOs — click to navigate`,
  });

  if (picked) {
    const doc = await vscode.workspace.openTextDocument(picked.filePath);
    const editor = await vscode.window.showTextDocument(doc);
    const pos = new vscode.Position(picked.lineNum - 1, 0);
    editor.selection = new vscode.Selection(pos, pos);
    editor.revealRange(new vscode.Range(pos, pos), vscode.TextEditorRevealType.InCenter);
  }
}

// ── Dead Code Scanner ───────────────────────────────────────────────────────

async function scanDeadCode() {
  const editor = vscode.window.activeTextEditor;
  if (!editor) return;

  const doc = editor.document;
  const text = doc.getText();
  const dead = [];

  // Find exported functions/consts that are only declared, never called in this file
  const funcPattern = /(?:export\s+)?(?:const|let|function)\s+(\w+)/g;
  let match;
  const declarations = [];

  while ((match = funcPattern.exec(text)) !== null) {
    const name = match[1];
    // Skip common patterns
    if (['default', 'React', 'useState', 'useEffect', 'FC', 'memo'].includes(name)) continue;
    if (name.length < 2) continue;
    declarations.push({ name, index: match.index, line: doc.positionAt(match.index).line });
  }

  for (const decl of declarations) {
    const regex = new RegExp('\\b' + decl.name + '\\b', 'g');
    const matches = text.match(regex);
    // If name appears only once (its declaration), it's unused
    if (matches && matches.length === 1) {
      dead.push(decl);
    }
  }

  if (dead.length === 0) {
    vscode.window.showInformationMessage('AutoChecker: No dead code found in this file! 🎉');
    return;
  }

  const items = dead.map((d) => ({
    label: `$(warning) ${d.name}`,
    description: `Line ${d.line + 1} — declared but never used`,
    lineNum: d.line,
  }));

  const picked = await vscode.window.showQuickPick(items, {
    placeHolder: `Found ${dead.length} potentially unused declarations`,
  });

  if (picked) {
    const pos = new vscode.Position(picked.lineNum, 0);
    editor.selection = new vscode.Selection(pos, pos);
    editor.revealRange(new vscode.Range(pos, pos), vscode.TextEditorRevealType.InCenter);
  }
}

// ── Duplicate Code Finder ───────────────────────────────────────────────────

async function findDuplicates() {
  const editor = vscode.window.activeTextEditor;
  if (!editor) return;

  const doc = editor.document;
  const lines = doc.getText().split('\n');
  const minLen = 3; // minimum lines for a duplicate block
  const duplicates = [];
  const seen = new Map();

  // Sliding window — hash blocks of minLen lines
  for (let i = 0; i <= lines.length - minLen; i++) {
    const block = lines
      .slice(i, i + minLen)
      .map((l) => l.trim())
      .filter((l) => l.length > 0);
    if (block.length < minLen) continue;

    const key = block.join('|');
    // Skip trivial blocks (empty, just brackets, just imports)
    if (block.every((l) => l === '{' || l === '}' || l === '' || l.startsWith('import '))) continue;
    if (key.length < 30) continue;

    if (seen.has(key)) {
      const firstLine = seen.get(key);
      if (!duplicates.some((d) => d.first === firstLine && d.second === i + 1)) {
        duplicates.push({
          first: firstLine,
          second: i + 1,
          preview: block[0].substring(0, 60),
          lines: minLen,
        });
      }
    } else {
      seen.set(key, i + 1);
    }
  }

  if (duplicates.length === 0) {
    vscode.window.showInformationMessage('AutoChecker: No duplicate code blocks found! 🎉');
    return;
  }

  const items = duplicates.map((d) => ({
    label: `$(copy) "${d.preview}..."`,
    description: `Lines ${d.first}–${d.first + d.lines - 1}  ↔  ${d.second}–${d.second + d.lines - 1}`,
    lineNum: d.second - 1,
  }));

  const picked = await vscode.window.showQuickPick(items, {
    placeHolder: `Found ${duplicates.length} duplicate blocks`,
  });

  if (picked) {
    const pos = new vscode.Position(picked.lineNum, 0);
    editor.selection = new vscode.Selection(pos, pos);
    editor.revealRange(new vscode.Range(pos, pos), vscode.TextEditorRevealType.InCenter);
  }
}

// ── Custom Hook Generator ───────────────────────────────────────────────────

async function generateHook() {
  const rootDir = getRoot();
  if (!rootDir) return;

  const name = await vscode.window.showInputBox({
    prompt: 'Hook name (e.g. useDebounce)',
    placeHolder: 'useMyHook',
    validateInput: (v) => {
      if (!v) return 'Name is required';
      if (!v.startsWith('use')) return 'Hook must start with "use"';
      return null;
    },
  });
  if (!name) return;

  const hooksDir = path.join(rootDir, 'src', 'hooks');
  ensureDirSync(hooksDir);

  const content = `import { useState, useEffect, useCallback } from 'react';

interface ${name.charAt(0).toUpperCase() + name.slice(1)}Options {
  // Add options here
}

export function ${name}(options?: ${name.charAt(0).toUpperCase() + name.slice(1)}Options) {
  const [state, setState] = useState(null);

  useEffect(() => {
    // Effect logic here
  }, []);

  return { state };
}
`;

  const filePath = path.join(hooksDir, `${name}.ts`);
  fs.writeFileSync(filePath, content, 'utf-8');

  // Update barrel export
  const indexPath = path.join(hooksDir, 'index.ts');
  const exportLine = `export { ${name} } from './${name}';\n`;
  if (fs.existsSync(indexPath)) {
    const existing = fs.readFileSync(indexPath, 'utf-8');
    if (!existing.includes(name)) {
      fs.appendFileSync(indexPath, exportLine);
    }
  } else {
    fs.writeFileSync(indexPath, exportLine);
  }

  vscode.window.showInformationMessage(`AutoChecker: Created ${name}.ts 🪝`);
  const doc = await vscode.workspace.openTextDocument(filePath);
  await vscode.window.showTextDocument(doc);
}

// ── API Route Generator (Next.js) ───────────────────────────────────────────

async function generateApiRoute() {
  const rootDir = getRoot();
  if (!rootDir) return;

  const routePath = await vscode.window.showInputBox({
    prompt: 'API route path (e.g. users, auth/login)',
    placeHolder: 'users',
  });
  if (!routePath) return;

  const methods = await vscode.window.showQuickPick(
    ['GET + POST', 'GET only', 'POST only', 'GET + POST + PUT + DELETE (CRUD)'],
    { placeHolder: 'Which HTTP methods?' },
  );
  if (!methods) return;

  let content = `import { NextRequest, NextResponse } from 'next/server';\n\n`;

  if (methods.includes('GET')) {
    content += `export async function GET(request: NextRequest) {
  try {
    // TODO: implement GET logic
    return NextResponse.json({ data: [] });
  } catch (error) {
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}\n\n`;
  }

  if (methods.includes('POST')) {
    content += `export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    // TODO: implement POST logic
    return NextResponse.json({ data: body }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}\n\n`;
  }

  if (methods.includes('PUT')) {
    content += `export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    // TODO: implement PUT logic
    return NextResponse.json({ data: body });
  } catch (error) {
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}\n\n`;
  }

  if (methods.includes('DELETE')) {
    content += `export async function DELETE(request: NextRequest) {
  try {
    // TODO: implement DELETE logic
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}\n`;
  }

  // Try app/api first, fallback to src/app/api
  let apiDir = path.join(rootDir, 'src', 'app', 'api', routePath);
  if (fs.existsSync(path.join(rootDir, 'app'))) {
    apiDir = path.join(rootDir, 'app', 'api', routePath);
  }

  ensureDirSync(apiDir);
  const filePath = path.join(apiDir, 'route.ts');
  fs.writeFileSync(filePath, content, 'utf-8');

  vscode.window.showInformationMessage(`AutoChecker: Created /api/${routePath}/route.ts 🛣️`);
  const doc = await vscode.workspace.openTextDocument(filePath);
  await vscode.window.showTextDocument(doc);
}

// ── TypeScript Interface Generator from JSON ────────────────────────────────

async function jsonToInterface() {
  const editor = vscode.window.activeTextEditor;
  let jsonStr;

  // Try to use selection or clipboard
  if (editor && !editor.selection.isEmpty) {
    jsonStr = editor.document.getText(editor.selection);
  } else {
    jsonStr = await vscode.env.clipboard.readText();
  }

  if (!jsonStr) {
    jsonStr = await vscode.window.showInputBox({
      prompt: 'Paste JSON to convert to TypeScript interface',
      placeHolder: '{"name": "John", "age": 30}',
    });
  }
  if (!jsonStr) return;

  let parsed;
  try {
    parsed = JSON.parse(jsonStr.trim());
  } catch (e) {
    vscode.window.showErrorMessage('AutoChecker: Invalid JSON.');
    return;
  }

  const name = await vscode.window.showInputBox({
    prompt: 'Interface name',
    value: 'MyInterface',
  });
  if (!name) return;

  function inferType(value, key, indent) {
    if (value === null) return 'null';
    if (Array.isArray(value)) {
      if (value.length === 0) return 'unknown[]';
      return inferType(value[0], key, indent) + '[]';
    }
    if (typeof value === 'object') {
      const inner = Object.entries(value)
        .map(([k, v]) => `${indent}  ${k}: ${inferType(v, k, indent + '  ')};`)
        .join('\n');
      return `{\n${inner}\n${indent}}`;
    }
    return typeof value;
  }

  const fields = Object.entries(parsed)
    .map(([k, v]) => `  ${k}: ${inferType(v, k, '  ')};`)
    .join('\n');

  const result = `interface ${name} {\n${fields}\n}\n`;

  // Insert at cursor or copy to clipboard
  if (editor) {
    const pos = editor.selection.active;
    await editor.edit((eb) => {
      eb.insert(new vscode.Position(pos.line + 1, 0), '\n' + result + '\n');
    });
    vscode.window.showInformationMessage(`AutoChecker: Inserted interface ${name}`);
  } else {
    await vscode.env.clipboard.writeText(result);
    vscode.window.showInformationMessage(`AutoChecker: Interface ${name} copied to clipboard`);
  }
}

// ── Barrel Export Generator ─────────────────────────────────────────────────

async function generateBarrelExport() {
  const rootDir = getRoot();
  if (!rootDir) return;

  // Let user pick a directory
  const uri = await vscode.window.showOpenDialog({
    canSelectFiles: false,
    canSelectFolders: true,
    canSelectMany: false,
    defaultUri: vscode.Uri.file(path.join(rootDir, 'src')),
    openLabel: 'Select folder for barrel export',
  });

  if (!uri || uri.length === 0) return;

  const targetDir = uri[0].fsPath;
  let entries;
  try {
    entries = fs.readdirSync(targetDir, { withFileTypes: true });
  } catch (_) {
    return;
  }

  const exportLines = [];

  for (const entry of entries) {
    if (entry.name === 'index.ts' || entry.name === 'index.tsx') continue;

    if (entry.isDirectory()) {
      // Check if dir has its own index
      const subIndex = path.join(targetDir, entry.name, 'index.ts');
      const subIndexX = path.join(targetDir, entry.name, 'index.tsx');
      if (fs.existsSync(subIndex) || fs.existsSync(subIndexX)) {
        exportLines.push(`export * from './${entry.name}';`);
      }
    } else if (
      /\.(ts|tsx)$/.test(entry.name) &&
      !entry.name.endsWith('.d.ts') &&
      !entry.name.endsWith('.test.ts') &&
      !entry.name.endsWith('.spec.ts')
    ) {
      const baseName = entry.name.replace(/\.(ts|tsx)$/, '');
      exportLines.push(`export * from './${baseName}';`);
    }
  }

  if (exportLines.length === 0) {
    vscode.window.showInformationMessage('AutoChecker: No exportable files found.');
    return;
  }

  const indexPath = path.join(targetDir, 'index.ts');
  const content = exportLines.join('\n') + '\n';

  fs.writeFileSync(indexPath, content, 'utf-8');
  vscode.window.showInformationMessage(
    `AutoChecker: Generated barrel export with ${exportLines.length} entries 📦`,
  );

  const doc = await vscode.workspace.openTextDocument(indexPath);
  await vscode.window.showTextDocument(doc);
}

// ── Tailwind Class Sorter ───────────────────────────────────────────────────

const TW_ORDER = [
  'container',
  'box',
  'block',
  'inline',
  'flex',
  'grid',
  'table',
  'hidden',
  'visible',
  'static',
  'fixed',
  'absolute',
  'relative',
  'sticky',
  'top',
  'right',
  'bottom',
  'left',
  'z',
  'order',
  'col',
  'row',
  'float',
  'clear',
  'm',
  'mx',
  'my',
  'mt',
  'mr',
  'mb',
  'ml',
  'p',
  'px',
  'py',
  'pt',
  'pr',
  'pb',
  'pl',
  'w',
  'min-w',
  'max-w',
  'h',
  'min-h',
  'max-h',
  'size',
  'font',
  'text',
  'leading',
  'tracking',
  'decoration',
  'underline',
  'overline',
  'line-through',
  'no-underline',
  'uppercase',
  'lowercase',
  'capitalize',
  'normal-case',
  'truncate',
  'overflow',
  'whitespace',
  'break',
  'border',
  'rounded',
  'outline',
  'ring',
  'shadow',
  'opacity',
  'bg',
  'from',
  'via',
  'to',
  'fill',
  'stroke',
  'object',
  'aspect',
  'columns',
  'gap',
  'space',
  'divide',
  'place',
  'items',
  'justify',
  'self',
  'content',
  'align',
  'basis',
  'grow',
  'shrink',
  'scale',
  'rotate',
  'translate',
  'skew',
  'origin',
  'transition',
  'duration',
  'ease',
  'delay',
  'animate',
  'cursor',
  'select',
  'resize',
  'scroll',
  'snap',
  'touch',
  'pointer-events',
  'will-change',
  'appearance',
  'sr-only',
];

function getTwWeight(cls) {
  const base = cls
    .replace(/^(!|-)/, '')
    .replace(
      /^(sm|md|lg|xl|2xl|hover|focus|active|group-hover|dark|disabled|first|last|odd|even):/,
      '',
    )
    .split('-')[0]
    .split(':')
    .pop();
  const idx = TW_ORDER.indexOf(base);
  return idx === -1 ? 500 : idx;
}

async function sortTailwindClasses() {
  const editor = vscode.window.activeTextEditor;
  if (!editor) return;

  const doc = editor.document;
  const text = doc.getText();
  let count = 0;
  const classPattern = /(?:className|class)=["'`]([^"'`]+)["'`]/g;
  const edits = [];
  let match;

  while ((match = classPattern.exec(text)) !== null) {
    const original = match[1];
    const classes = original.trim().split(/\s+/).filter(Boolean);
    if (classes.length < 2) continue;
    const sorted = [...classes].sort((a, b) => getTwWeight(a) - getTwWeight(b));
    if (sorted.join(' ') !== classes.join(' ')) {
      edits.push({
        start: match.index + match[0].indexOf(match[1]),
        len: match[1].length,
        replacement: sorted.join(' '),
      });
      count++;
    }
  }

  if (count === 0) {
    vscode.window.showInformationMessage('AutoChecker: Classes already sorted!');
    return;
  }

  await editor.edit((eb) => {
    for (let i = edits.length - 1; i >= 0; i--) {
      const e = edits[i];
      const startPos = doc.positionAt(e.start);
      const endPos = doc.positionAt(e.start + e.len);
      eb.replace(new vscode.Range(startPos, endPos), e.replacement);
    }
  });
  vscode.window.showInformationMessage(`AutoChecker: Sorted classes in ${count} attributes.`);
}

// ── CSS-to-Tailwind Converter ───────────────────────────────────────────────

const CSS_TO_TW_MAP = {
  'display: flex': 'flex',
  'display: grid': 'grid',
  'display: block': 'block',
  'display: inline': 'inline',
  'display: none': 'hidden',
  'display: inline-flex': 'inline-flex',
  'position: relative': 'relative',
  'position: absolute': 'absolute',
  'position: fixed': 'fixed',
  'position: sticky': 'sticky',
  'text-align: center': 'text-center',
  'text-align: left': 'text-left',
  'text-align: right': 'text-right',
  'font-weight: bold': 'font-bold',
  'font-weight: 700': 'font-bold',
  'font-weight: 600': 'font-semibold',
  'font-weight: 500': 'font-medium',
  'font-weight: 400': 'font-normal',
  'flex-direction: column': 'flex-col',
  'flex-direction: row': 'flex-row',
  'flex-wrap: wrap': 'flex-wrap',
  'justify-content: center': 'justify-center',
  'justify-content: space-between': 'justify-between',
  'justify-content: flex-start': 'justify-start',
  'justify-content: flex-end': 'justify-end',
  'align-items: center': 'items-center',
  'align-items: flex-start': 'items-start',
  'align-items: flex-end': 'items-end',
  'align-items: stretch': 'items-stretch',
  'overflow: hidden': 'overflow-hidden',
  'overflow: auto': 'overflow-auto',
  'overflow: scroll': 'overflow-scroll',
  'cursor: pointer': 'cursor-pointer',
  'cursor: not-allowed': 'cursor-not-allowed',
  'white-space: nowrap': 'whitespace-nowrap',
  'text-decoration: none': 'no-underline',
  'text-decoration: underline': 'underline',
  'width: 100%': 'w-full',
  'height: 100%': 'h-full',
  'width: auto': 'w-auto',
  'height: auto': 'h-auto',
  'border-radius: 50%': 'rounded-full',
  'opacity: 0': 'opacity-0',
  'opacity: 1': 'opacity-100',
};

async function cssToTailwind() {
  const editor = vscode.window.activeTextEditor;
  let cssText;
  if (editor && !editor.selection.isEmpty) {
    cssText = editor.document.getText(editor.selection);
  } else {
    cssText = await vscode.window.showInputBox({
      prompt: 'Paste CSS to convert',
      placeHolder: 'display: flex; justify-content: center;',
    });
  }
  if (!cssText) return;

  const props = cssText
    .split(';')
    .map((p) => p.trim())
    .filter(Boolean);
  const twClasses = [];
  const unconverted = [];

  for (const prop of props) {
    const clean = prop.replace(/\s+/g, ' ').trim();
    if (CSS_TO_TW_MAP[clean]) {
      twClasses.push(CSS_TO_TW_MAP[clean]);
    } else {
      // Try px values: margin: 16px -> m-4, padding: 8px -> p-2
      const pxMatch = clean.match(
        /^(margin|padding|gap|width|height|top|right|bottom|left|border-radius|font-size):\s*(\d+)px$/,
      );
      if (pxMatch) {
        const prefixMap = {
          margin: 'm',
          padding: 'p',
          gap: 'gap',
          width: 'w',
          height: 'h',
          top: 'top',
          right: 'right',
          bottom: 'bottom',
          left: 'left',
          'border-radius': 'rounded',
          'font-size': 'text',
        };
        const prefix = prefixMap[pxMatch[1]];
        const val = parseInt(pxMatch[2]);
        if (prefix === 'text') {
          const sizeMap = {
            12: 'xs',
            14: 'sm',
            16: 'base',
            18: 'lg',
            20: 'xl',
            24: '2xl',
            30: '3xl',
            36: '4xl',
            48: '5xl',
          };
          twClasses.push(`text-${sizeMap[val] || `[${val}px]`}`);
        } else if (prefix === 'rounded') {
          const rMap = {
            0: 'none',
            2: 'sm',
            4: '',
            6: 'md',
            8: 'lg',
            12: 'xl',
            16: '2xl',
            24: '3xl',
          };
          twClasses.push(
            rMap[val] !== undefined
              ? `rounded${rMap[val] ? '-' + rMap[val] : ''}`
              : `rounded-[${val}px]`,
          );
        } else {
          const rem = val / 4;
          twClasses.push(Number.isInteger(rem) ? `${prefix}-${rem}` : `${prefix}-[${val}px]`);
        }
      } else {
        unconverted.push(prop);
      }
    }
  }

  const result = twClasses.join(' ');
  const msg = unconverted.length > 0 ? `\n\n⚠️ Could not convert:\n${unconverted.join('\n')}` : '';

  await vscode.env.clipboard.writeText(result);
  vscode.window.showInformationMessage(
    `AutoChecker: Copied "${result}"${msg ? ' (some props skipped)' : ''}`,
  );
}

// ── Responsive Breakpoint Viewer ────────────────────────────────────────────

async function showBreakpoints() {
  const breakpoints = [
    { label: 'sm (640px)', detail: '@media (min-width: 640px) — Mobile landscape', value: 640 },
    { label: 'md (768px)', detail: '@media (min-width: 768px) — Tablet', value: 768 },
    { label: 'lg (1024px)', detail: '@media (min-width: 1024px) — Laptop', value: 1024 },
    { label: 'xl (1280px)', detail: '@media (min-width: 1280px) — Desktop', value: 1280 },
    { label: '2xl (1536px)', detail: '@media (min-width: 1536px) — Large desktop', value: 1536 },
  ];
  const picked = await vscode.window.showQuickPick(breakpoints, {
    placeHolder: 'Tailwind breakpoints — pick to copy media query',
  });
  if (picked) {
    await vscode.env.clipboard.writeText(`@media (min-width: ${picked.value}px)`);
    vscode.window.showInformationMessage(`AutoChecker: Copied ${picked.label} media query`);
  }
}

// ── Font Preview (Google Fonts) ─────────────────────────────────────────────

async function fontPreview() {
  const fonts = [
    {
      label: 'Inter',
      detail: 'Clean sans-serif, great for UI',
      import:
        "@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');",
    },
    {
      label: 'Poppins',
      detail: 'Geometric, modern',
      import:
        "@import url('https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700&display=swap');",
    },
    {
      label: 'Manrope',
      detail: 'Semi-rounded, trendy',
      import:
        "@import url('https://fonts.googleapis.com/css2?family=Manrope:wght@400;500;600;700&display=swap');",
    },
    {
      label: 'Space Grotesk',
      detail: 'Techy, distinctive',
      import:
        "@import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;600;700&display=swap');",
    },
    {
      label: 'DM Sans',
      detail: 'Clean, geometric sans',
      import:
        "@import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&display=swap');",
    },
    {
      label: 'Plus Jakarta Sans',
      detail: 'Modern, professional',
      import:
        "@import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700&display=swap');",
    },
    {
      label: 'Geist',
      detail: 'Vercel system font',
      import:
        "@import url('https://fonts.googleapis.com/css2?family=Geist:wght@400;500;600;700&display=swap');",
    },
    {
      label: 'JetBrains Mono',
      detail: 'Best monospace for code',
      import:
        "@import url('https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500;600;700&display=swap');",
    },
    {
      label: 'Fira Code',
      detail: 'Monospace with ligatures',
      import:
        "@import url('https://fonts.googleapis.com/css2?family=Fira+Code:wght@400;500;600;700&display=swap');",
    },
    {
      label: 'Playfair Display',
      detail: 'Elegant serif for headings',
      import:
        "@import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;500;600;700&display=swap');",
    },
  ];
  const picked = await vscode.window.showQuickPick(fonts, {
    placeHolder: 'Pick font to copy @import',
  });
  if (picked) {
    await vscode.env.clipboard.writeText(
      picked.import + `\n\nfont-family: '${picked.label}', sans-serif;`,
    );
    vscode.window.showInformationMessage(
      `AutoChecker: Copied ${picked.label} import + font-family`,
    );
  }
}

// ── CSS Unit Converter ──────────────────────────────────────────────────────

async function cssUnitConverter() {
  const input = await vscode.window.showInputBox({
    prompt: 'Enter value (e.g. 16px, 1rem, 2em, 50vh)',
    placeHolder: '16px',
  });
  if (!input) return;

  const baseFontSize = 16;
  const match = input.trim().match(/^([\d.]+)\s*(px|rem|em|vh|vw|%)$/);
  if (!match) {
    vscode.window.showErrorMessage('AutoChecker: Invalid format. Use: 16px, 1rem, 2em, 50vh');
    return;
  }

  const val = parseFloat(match[1]);
  const unit = match[2];
  const conversions = [];

  if (unit === 'px') {
    conversions.push(
      `${val}px`,
      `${(val / baseFontSize).toFixed(4).replace(/\.?0+$/, '')}rem`,
      `${(val / baseFontSize).toFixed(4).replace(/\.?0+$/, '')}em`,
    );
  } else if (unit === 'rem' || unit === 'em') {
    conversions.push(`${val * baseFontSize}px`, `${val}rem`, `${val}em`);
  } else {
    conversions.push(`${val}${unit}`);
  }

  const picked = await vscode.window.showQuickPick(
    conversions.map((c) => ({ label: c })),
    { placeHolder: 'Pick to copy' },
  );
  if (picked) {
    await vscode.env.clipboard.writeText(picked.label);
    vscode.window.showInformationMessage(`AutoChecker: Copied ${picked.label}`);
  }
}

// ── JSON Formatter/Minifier ─────────────────────────────────────────────────

async function jsonFormat() {
  const editor = vscode.window.activeTextEditor;
  if (!editor) return;

  const doc = editor.document;
  const text = editor.selection.isEmpty ? doc.getText() : doc.getText(editor.selection);

  let parsed;
  try {
    parsed = JSON.parse(text);
  } catch (_) {
    vscode.window.showErrorMessage('AutoChecker: Invalid JSON.');
    return;
  }

  const action = await vscode.window.showQuickPick(
    ['Prettify (2 spaces)', 'Prettify (4 spaces)', 'Minify'],
    { placeHolder: 'Format action' },
  );
  if (!action) return;

  let result;
  if (action === 'Minify') result = JSON.stringify(parsed);
  else if (action.includes('4')) result = JSON.stringify(parsed, null, 4);
  else result = JSON.stringify(parsed, null, 2);

  const range = editor.selection.isEmpty
    ? new vscode.Range(0, 0, doc.lineCount, 0)
    : editor.selection;
  await editor.edit((eb) => eb.replace(range, result));
  vscode.window.showInformationMessage(
    `AutoChecker: JSON ${action.includes('Min') ? 'minified' : 'formatted'}.`,
  );
}

// ── JWT Decoder ─────────────────────────────────────────────────────────────

async function decodeJwt() {
  let token;
  const editor = vscode.window.activeTextEditor;
  if (editor && !editor.selection.isEmpty) {
    token = editor.document.getText(editor.selection);
  } else {
    token = await vscode.window.showInputBox({
      prompt: 'Paste JWT token',
      placeHolder: 'eyJhbGciOiJIUzI1NiIs...',
    });
  }
  if (!token) return;

  const parts = token.trim().split('.');
  if (parts.length < 2) {
    vscode.window.showErrorMessage('AutoChecker: Invalid JWT format.');
    return;
  }

  try {
    const header = JSON.parse(Buffer.from(parts[0], 'base64url').toString('utf-8'));
    const payload = JSON.parse(Buffer.from(parts[1], 'base64url').toString('utf-8'));

    // Add human-readable dates
    if (payload.exp) payload._exp_human = new Date(payload.exp * 1000).toISOString();
    if (payload.iat) payload._iat_human = new Date(payload.iat * 1000).toISOString();
    if (payload.nbf) payload._nbf_human = new Date(payload.nbf * 1000).toISOString();

    const isExpired = payload.exp && payload.exp * 1000 < Date.now();
    const result = `// Header\n${JSON.stringify(header, null, 2)}\n\n// Payload${isExpired ? ' ⚠️ EXPIRED' : ' ✅ Valid'}\n${JSON.stringify(payload, null, 2)}`;

    const doc = await vscode.workspace.openTextDocument({ content: result, language: 'jsonc' });
    await vscode.window.showTextDocument(doc, { preview: true });
  } catch (_) {
    vscode.window.showErrorMessage('AutoChecker: Failed to decode JWT.');
  }
}

// ── String Case Converter ───────────────────────────────────────────────────

async function convertCase() {
  const editor = vscode.window.activeTextEditor;
  if (!editor || editor.selection.isEmpty) {
    vscode.window.showWarningMessage('AutoChecker: Select text first.');
    return;
  }

  const text = editor.document.getText(editor.selection);
  // Split by common separators
  const words = text
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/[-_./\\]/g, ' ')
    .split(/\s+/)
    .map((w) => w.toLowerCase())
    .filter(Boolean);

  const cases = [
    {
      label: 'camelCase',
      value: words.map((w, i) => (i === 0 ? w : w[0].toUpperCase() + w.slice(1))).join(''),
    },
    { label: 'PascalCase', value: words.map((w) => w[0].toUpperCase() + w.slice(1)).join('') },
    { label: 'snake_case', value: words.join('_') },
    { label: 'kebab-case', value: words.join('-') },
    { label: 'SCREAMING_SNAKE', value: words.join('_').toUpperCase() },
    { label: 'dot.case', value: words.join('.') },
    { label: 'path/case', value: words.join('/') },
  ];

  const picked = await vscode.window.showQuickPick(cases, { placeHolder: `Convert "${text}"` });
  if (picked) {
    await editor.edit((eb) => eb.replace(editor.selection, picked.value));
  }
}

// ── Password/Secret Generator ───────────────────────────────────────────────

async function generatePassword() {
  const length = await vscode.window.showQuickPick(['16', '32', '48', '64', '128'], {
    placeHolder: 'Secret length',
  });
  if (!length) return;

  const crypto = require('crypto');
  const format = await vscode.window.showQuickPick(
    ['Alphanumeric (a-zA-Z0-9)', 'Hex (0-9a-f)', 'Base64', 'URL-safe Base64'],
    { placeHolder: 'Format' },
  );
  if (!format) return;

  let secret;
  const len = parseInt(length);
  if (format.includes('Hex')) {
    secret = crypto
      .randomBytes(Math.ceil(len / 2))
      .toString('hex')
      .slice(0, len);
  } else if (format.includes('URL')) {
    secret = crypto.randomBytes(len).toString('base64url').slice(0, len);
  } else if (format.includes('Base64')) {
    secret = crypto.randomBytes(len).toString('base64').slice(0, len);
  } else {
    const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    secret = Array.from(crypto.randomBytes(len))
      .map((b) => chars[b % chars.length])
      .join('');
  }

  await vscode.env.clipboard.writeText(secret);

  const editor = vscode.window.activeTextEditor;
  if (editor) {
    const pos = editor.selection.active;
    await editor.edit((eb) => eb.insert(pos, secret));
    vscode.window.showInformationMessage(`AutoChecker: Inserted ${len}-char secret`);
  } else {
    vscode.window.showInformationMessage(`AutoChecker: Copied ${len}-char secret to clipboard`);
  }
}

// ── Port Killer ─────────────────────────────────────────────────────────────

async function killPort() {
  const portStr = await vscode.window.showInputBox({
    prompt: 'Port number to kill',
    placeHolder: '3000',
  });
  if (!portStr) return;
  const port = parseInt(portStr);
  if (isNaN(port)) {
    vscode.window.showErrorMessage('AutoChecker: Invalid port.');
    return;
  }

  const { exec } = require('child_process');
  const platform = process.platform;
  const cmd =
    platform === 'win32'
      ? `netstat -ano | findstr :${port} | findstr LISTENING`
      : `lsof -ti:${port}`;

  exec(cmd, (err, stdout) => {
    if (err || !stdout.trim()) {
      vscode.window.showInformationMessage(`AutoChecker: Nothing running on port ${port}.`);
      return;
    }
    const pids = stdout
      .trim()
      .split('\n')
      .map((l) => l.trim().split(/\s+/).pop())
      .filter(Boolean);
    const killCmd =
      platform === 'win32'
        ? pids.map((p) => `taskkill /PID ${p} /F`).join(' && ')
        : `kill -9 ${pids.join(' ')}`;
    exec(killCmd, (killErr) => {
      if (killErr) {
        vscode.window.showErrorMessage(`AutoChecker: Failed to kill port ${port}.`);
      } else {
        vscode.window.showInformationMessage(`AutoChecker: Killed processes on port ${port} 💀`);
      }
    });
  });
}

// ── Dependency Outdated Checker ─────────────────────────────────────────────

async function checkOutdated() {
  const rootDir = getRoot();
  if (!rootDir) return;

  const pkgPath = path.join(rootDir, 'package.json');
  if (!fs.existsSync(pkgPath)) {
    vscode.window.showErrorMessage('AutoChecker: No package.json found.');
    return;
  }

  const terminal = vscode.window.createTerminal('AutoChecker: outdated');
  terminal.show();
  terminal.sendText(`cd "${rootDir}" && npm outdated`);
  vscode.window.showInformationMessage('AutoChecker: Running npm outdated...');
}

// ── File Scaffolder ─────────────────────────────────────────────────────────

const SCAFFOLD_TEMPLATES = {
  'React Page (Next.js)': {
    ext: '.tsx',
    content: (name) =>
      `export default function ${name}Page() {\n  return (\n    <main>\n      <h1>${name}</h1>\n    </main>\n  );\n}\n`,
  },
  'React Layout (Next.js)': {
    ext: '.tsx',
    content: (name) =>
      `export default function ${name}Layout({\n  children,\n}: {\n  children: React.ReactNode;\n}) {\n  return <>{children}</>;\n}\n`,
  },
  'Server Action': {
    ext: '.ts',
    content: (name) =>
      `'use server';\n\nexport async function ${name.charAt(0).toLowerCase() + name.slice(1)}Action(formData: FormData) {\n  // TODO: implement\n}\n`,
  },
  'Zustand Store': {
    ext: '.ts',
    content: (name) =>
      `import { create } from 'zustand';\n\ninterface ${name}State {\n  // TODO: define state\n}\n\nexport const use${name}Store = create<${name}State>((set) => ({\n  // TODO: initial state\n}));\n`,
  },
  'Zod Schema': {
    ext: '.ts',
    content: (name) =>
      `import { z } from 'zod';\n\nexport const ${name.charAt(0).toLowerCase() + name.slice(1)}Schema = z.object({\n  // TODO: define schema\n});\n\nexport type ${name} = z.infer<typeof ${name.charAt(0).toLowerCase() + name.slice(1)}Schema>;\n`,
  },
  'Middleware (Next.js)': {
    ext: '.ts',
    content: () =>
      `import { NextResponse } from 'next/server';\nimport type { NextRequest } from 'next/server';\n\nexport function middleware(request: NextRequest) {\n  return NextResponse.next();\n}\n\nexport const config = {\n  matcher: ['/api/:path*'],\n};\n`,
  },
  'Test File (Vitest)': {
    ext: '.test.ts',
    content: (name) =>
      `import { describe, it, expect } from 'vitest';\n\ndescribe('${name}', () => {\n  it('should work', () => {\n    expect(true).toBe(true);\n  });\n});\n`,
  },
};

async function fileScaffolder() {
  const rootDir = getRoot();
  if (!rootDir) return;

  const template = await vscode.window.showQuickPick(Object.keys(SCAFFOLD_TEMPLATES), {
    placeHolder: 'Pick file template',
  });
  if (!template) return;

  const name = await vscode.window.showInputBox({
    prompt: 'Name (PascalCase)',
    placeHolder: 'Dashboard',
  });
  if (!name) return;

  const t = SCAFFOLD_TEMPLATES[template];
  const filePath = await vscode.window.showInputBox({
    prompt: 'File path (relative to project root)',
    value: `src/${name.charAt(0).toLowerCase() + name.slice(1)}${t.ext}`,
  });
  if (!filePath) return;

  const fullPath = path.join(rootDir, filePath);
  ensureDirSync(path.dirname(fullPath));
  fs.writeFileSync(fullPath, t.content(name), 'utf-8');

  vscode.window.showInformationMessage(`AutoChecker: Created ${filePath} 📄`);
  const doc = await vscode.workspace.openTextDocument(fullPath);
  await vscode.window.showTextDocument(doc);
}

// ── Wrap in Try/Catch ───────────────────────────────────────────────────────

async function wrapTryCatch() {
  const editor = vscode.window.activeTextEditor;
  if (!editor || editor.selection.isEmpty) {
    vscode.window.showWarningMessage('AutoChecker: Select code to wrap.');
    return;
  }

  const sel = editor.selection;
  const text = editor.document.getText(sel);
  const indent = editor.document.lineAt(sel.start.line).text.match(/^(\s*)/)[1];

  const wrapped = `${indent}try {\n${text
    .split('\n')
    .map((l) => '  ' + l)
    .join('\n')}\n${indent}} catch (error) {\n${indent}  console.error(error);\n${indent}}`;

  await editor.edit((eb) => eb.replace(sel, wrapped));
}

// ── Quick Comment Header ────────────────────────────────────────────────────

async function commentHeader() {
  const editor = vscode.window.activeTextEditor;
  if (!editor) return;

  const title = await vscode.window.showInputBox({
    prompt: 'Section title',
    placeHolder: 'Helpers',
  });
  if (!title) return;

  const pos = editor.selection.active;
  const indent = editor.document.lineAt(pos.line).text.match(/^(\s*)/)[1];
  const line = `${indent}// ── ${title} ${'─'.repeat(Math.max(0, 60 - title.length))}`;

  await editor.edit((eb) => eb.insert(new vscode.Position(pos.line, 0), line + '\n\n'));
}

// ── Code Bookmarks ──────────────────────────────────────────────────────────

let bookmarks = [];

async function addBookmark() {
  const editor = vscode.window.activeTextEditor;
  if (!editor) return;

  const line = editor.selection.active.line;
  const text = editor.document.lineAt(line).text.trim();
  const file = editor.document.fileName;

  const label = await vscode.window.showInputBox({
    prompt: 'Bookmark label',
    value: text.substring(0, 50),
  });
  if (!label) return;

  bookmarks.push({ label, file, line, preview: text.substring(0, 60) });
  vscode.window.showInformationMessage(`AutoChecker: Bookmarked line ${line + 1} 🔖`);
}

async function showBookmarks() {
  if (bookmarks.length === 0) {
    vscode.window.showInformationMessage('AutoChecker: No bookmarks yet.');
    return;
  }

  const items = bookmarks.map((b, i) => ({
    label: `🔖 ${b.label}`,
    description: `${path.basename(b.file)}:${b.line + 1}`,
    detail: b.preview,
    idx: i,
    filePath: b.file,
    lineNum: b.line,
  }));

  const picked = await vscode.window.showQuickPick(items, {
    placeHolder: `${bookmarks.length} bookmarks`,
  });
  if (picked) {
    const doc = await vscode.workspace.openTextDocument(picked.filePath);
    const editor = await vscode.window.showTextDocument(doc);
    const pos = new vscode.Position(picked.lineNum, 0);
    editor.selection = new vscode.Selection(pos, pos);
    editor.revealRange(new vscode.Range(pos, pos), vscode.TextEditorRevealType.InCenter);
  }
}

async function clearBookmarks() {
  bookmarks = [];
  vscode.window.showInformationMessage('AutoChecker: All bookmarks cleared.');
}

// ── Snippet Manager ─────────────────────────────────────────────────────────

const SNIPPETS_FILE = '.vscode/autochecker-snippets.json';

function loadSnippets(rootDir) {
  const p = path.join(rootDir, SNIPPETS_FILE);
  try {
    return fs.existsSync(p) ? JSON.parse(fs.readFileSync(p, 'utf-8')) : [];
  } catch (_) {
    return [];
  }
}

function saveSnippets(rootDir, snippets) {
  const p = path.join(rootDir, SNIPPETS_FILE);
  ensureDirSync(path.dirname(p));
  fs.writeFileSync(p, JSON.stringify(snippets, null, 2), 'utf-8');
}

async function saveSnippet() {
  const editor = vscode.window.activeTextEditor;
  if (!editor || editor.selection.isEmpty) {
    vscode.window.showWarningMessage('AutoChecker: Select code to save as snippet.');
    return;
  }

  const rootDir = getRoot();
  if (!rootDir) return;

  const name = await vscode.window.showInputBox({
    prompt: 'Snippet name',
    placeHolder: 'API fetch helper',
  });
  if (!name) return;

  const code = editor.document.getText(editor.selection);
  const snippets = loadSnippets(rootDir);
  snippets.push({ name, code, lang: editor.document.languageId, date: new Date().toISOString() });
  saveSnippets(rootDir, snippets);

  vscode.window.showInformationMessage(`AutoChecker: Saved snippet "${name}" ✂️`);
}

async function insertSnippet() {
  const rootDir = getRoot();
  if (!rootDir) return;

  const snippets = loadSnippets(rootDir);
  if (snippets.length === 0) {
    vscode.window.showInformationMessage('AutoChecker: No saved snippets.');
    return;
  }

  const items = snippets.map((s, i) => ({
    label: `✂️ ${s.name}`,
    description: s.lang,
    detail: s.code.substring(0, 80) + '...',
    idx: i,
  }));
  const picked = await vscode.window.showQuickPick(items, {
    placeHolder: 'Pick snippet to insert',
  });
  if (!picked) return;

  const editor = vscode.window.activeTextEditor;
  if (!editor) return;

  await editor.edit((eb) => eb.insert(editor.selection.active, snippets[picked.idx].code));
}

// ── README Generator ────────────────────────────────────────────────────────

async function generateReadme() {
  const rootDir = getRoot();
  if (!rootDir) return;

  const projectName = path.basename(rootDir);
  const name = await vscode.window.showInputBox({ prompt: 'Project name', value: projectName });
  if (!name) return;

  const desc =
    (await vscode.window.showInputBox({
      prompt: 'Short description',
      placeHolder: 'A modern web application built with...',
    })) || '';

  const stack = await vscode.window.showQuickPick(
    [
      'Next.js + TypeScript + Tailwind',
      'React + Vite + TypeScript',
      'Node.js + Express + TypeScript',
      'Custom',
    ],
    { placeHolder: 'Tech stack' },
  );

  const content = `# ${name}

${desc}

## Tech Stack

${
  stack === 'Custom'
    ? '- TODO: Add your stack'
    : stack
        .split(' + ')
        .map((t) => `- ${t}`)
        .join('\n')
}

## Getting Started

\`\`\`bash
# Install dependencies
npm install

# Run development server
npm run dev

# Build for production
npm run build
\`\`\`

## Project Structure

\`\`\`
${name}/
├── src/
│   ├── components/    # Reusable UI components
│   ├── hooks/         # Custom React hooks
│   ├── utils/         # Utility functions
│   ├── types/         # TypeScript type definitions
│   ├── services/      # API service layer
│   └── constants/     # App constants
├── public/            # Static assets
└── package.json
\`\`\`

## Scripts

| Command | Description |
|---------|-------------|
| \`npm run dev\` | Start development server |
| \`npm run build\` | Build for production |
| \`npm run lint\` | Run ESLint |

## Environment Variables

Copy \`.env.example\` to \`.env\` and fill in values:

\`\`\`bash
cp .env.example .env
\`\`\`

## License

MIT
`;

  const readmePath = path.join(rootDir, 'README.md');
  if (fs.existsSync(readmePath)) {
    const overwrite = await vscode.window.showWarningMessage(
      'README.md exists. Overwrite?',
      { modal: true },
      'Overwrite',
    );
    if (!overwrite) return;
  }

  fs.writeFileSync(readmePath, content, 'utf-8');
  vscode.window.showInformationMessage('AutoChecker: Created README.md 📖');
  const doc = await vscode.workspace.openTextDocument(readmePath);
  await vscode.window.showTextDocument(doc);
}

// ── Package.json Script Editor ──────────────────────────────────────────────

async function editPackageScripts() {
  const rootDir = getRoot();
  if (!rootDir) return;

  const pkgPath = path.join(rootDir, 'package.json');
  if (!fs.existsSync(pkgPath)) {
    vscode.window.showErrorMessage('AutoChecker: No package.json.');
    return;
  }

  const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf-8'));
  const scripts = pkg.scripts || {};

  const action = await vscode.window.showQuickPick(
    ['▶️ Run script', '➕ Add script', '✏️ Edit script', '🗑️ Remove script'],
    { placeHolder: `${Object.keys(scripts).length} scripts in package.json` },
  );
  if (!action) return;

  if (action.includes('Run')) {
    const names = Object.entries(scripts).map(([k, v]) => ({ label: k, description: String(v) }));
    const picked = await vscode.window.showQuickPick(names, { placeHolder: 'Pick script to run' });
    if (!picked) return;
    const terminal = vscode.window.createTerminal('AutoChecker: npm');
    terminal.show();
    terminal.sendText(`cd "${rootDir}" && npm run ${picked.label}`);
  } else if (action.includes('Add')) {
    const name = await vscode.window.showInputBox({ prompt: 'Script name', placeHolder: 'test' });
    if (!name) return;
    const cmd = await vscode.window.showInputBox({ prompt: 'Command', placeHolder: 'vitest run' });
    if (!cmd) return;
    pkg.scripts = pkg.scripts || {};
    pkg.scripts[name] = cmd;
    fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + '\n', 'utf-8');
    vscode.window.showInformationMessage(`AutoChecker: Added script "${name}"`);
  } else if (action.includes('Edit')) {
    const names = Object.keys(scripts).map((k) => ({ label: k, description: scripts[k] }));
    const picked = await vscode.window.showQuickPick(names, { placeHolder: 'Pick script to edit' });
    if (!picked) return;
    const newCmd = await vscode.window.showInputBox({
      prompt: 'New command',
      value: scripts[picked.label],
    });
    if (!newCmd) return;
    pkg.scripts[picked.label] = newCmd;
    fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + '\n', 'utf-8');
    vscode.window.showInformationMessage(`AutoChecker: Updated "${picked.label}"`);
  } else {
    const names = Object.keys(scripts).map((k) => ({ label: k, description: scripts[k] }));
    const picked = await vscode.window.showQuickPick(names, {
      placeHolder: 'Pick script to remove',
    });
    if (!picked) return;
    delete pkg.scripts[picked.label];
    fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + '\n', 'utf-8');
    vscode.window.showInformationMessage(`AutoChecker: Removed "${picked.label}"`);
  }
}

// ── Color Picker & Converter ────────────────────────────────────────────────

function hexToRgb(hex) {
  hex = hex.replace(/^#/, '');
  if (hex.length === 3)
    hex = hex
      .split('')
      .map((c) => c + c)
      .join('');
  const n = parseInt(hex, 16);
  return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
}

function rgbToHsl(r, g, b) {
  r /= 255;
  g /= 255;
  b /= 255;
  const max = Math.max(r, g, b),
    min = Math.min(r, g, b);
  let h,
    s,
    l = (max + min) / 2;
  if (max === min) {
    h = s = 0;
  } else {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r:
        h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
        break;
      case g:
        h = ((b - r) / d + 2) / 6;
        break;
      case b:
        h = ((r - g) / d + 4) / 6;
        break;
    }
  }
  return { h: Math.round(h * 360), s: Math.round(s * 100), l: Math.round(l * 100) };
}

async function openColorPicker() {
  const editor = vscode.window.activeTextEditor;

  // Try to detect color under cursor
  let defaultColor = '#3B82F6';
  if (editor) {
    const doc = editor.document;
    const line = doc.lineAt(editor.selection.active.line).text;
    const hexMatch = line.match(/#[0-9a-fA-F]{3,8}\b/);
    if (hexMatch) defaultColor = hexMatch[0];
  }

  const input = await vscode.window.showInputBox({
    prompt: 'Enter color (HEX, rgb(), or hsl())',
    value: defaultColor,
    placeHolder: '#3B82F6 or rgb(59,130,246) or hsl(217,91%,60%)',
  });
  if (!input) return;

  let r, g, b, hex;
  const trimmed = input.trim();

  // Parse HEX
  if (trimmed.startsWith('#')) {
    const parsed = hexToRgb(trimmed);
    r = parsed.r;
    g = parsed.g;
    b = parsed.b;
    hex =
      trimmed.length <= 4
        ? '#' +
          trimmed
            .replace('#', '')
            .split('')
            .map((c) => c + c)
            .join('')
        : trimmed;
  }
  // Parse rgb()
  else if (trimmed.startsWith('rgb')) {
    const nums = trimmed.match(/\d+/g);
    if (nums && nums.length >= 3) {
      r = +nums[0];
      g = +nums[1];
      b = +nums[2];
    }
    hex = '#' + [r, g, b].map((v) => v.toString(16).padStart(2, '0')).join('');
  }
  // Parse hsl()
  else if (trimmed.startsWith('hsl')) {
    const nums = trimmed.match(/[\d.]+/g);
    if (nums && nums.length >= 3) {
      const h = +nums[0] / 360,
        s = +nums[1] / 100,
        l = +nums[2] / 100;
      const hue2rgb = (p, q, t) => {
        if (t < 0) t += 1;
        if (t > 1) t -= 1;
        if (t < 1 / 6) return p + (q - p) * 6 * t;
        if (t < 1 / 2) return q;
        if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
        return p;
      };
      const q = l < 0.5 ? l * (1 + s) : l + s - l * s,
        p = 2 * l - q;
      r = Math.round(hue2rgb(p, q, h + 1 / 3) * 255);
      g = Math.round(hue2rgb(p, q, h) * 255);
      b = Math.round(hue2rgb(p, q, h - 1 / 3) * 255);
    }
    hex = '#' + [r, g, b].map((v) => v.toString(16).padStart(2, '0')).join('');
  } else {
    vscode.window.showErrorMessage('AutoChecker: Unsupported color format.');
    return;
  }

  const hsl = rgbToHsl(r, g, b);
  const formats = [
    `HEX: ${hex}`,
    `RGB: rgb(${r}, ${g}, ${b})`,
    `HSL: hsl(${hsl.h}, ${hsl.s}%, ${hsl.l}%)`,
  ];

  const picked = await vscode.window.showQuickPick(formats, {
    placeHolder: 'Pick format to copy to clipboard',
  });

  if (picked) {
    const value = picked.split(': ').slice(1).join(': ');
    await vscode.env.clipboard.writeText(value);
    vscode.window.showInformationMessage(`AutoChecker: Copied ${value}`);
  }
}

// ── .env Generator ──────────────────────────────────────────────────────────

const ENV_TEMPLATES = {
  'Next.js': `# App
NEXT_PUBLIC_APP_URL=http://localhost:3000
NEXT_PUBLIC_APP_NAME=MyApp

# Database
DATABASE_URL=postgresql://user:password@localhost:5432/mydb

# Auth
NEXTAUTH_SECRET=your-secret-here
NEXTAUTH_URL=http://localhost:3000

# API Keys
NEXT_PUBLIC_API_KEY=
API_SECRET_KEY=

# External Services
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=
SMTP_PASS=
`,
  'Vite + React': `# App
VITE_APP_TITLE=MyApp
VITE_API_URL=http://localhost:3001/api

# API Keys
VITE_PUBLIC_KEY=
VITE_GOOGLE_MAPS_KEY=

# Backend
PORT=3001
DATABASE_URL=postgresql://user:password@localhost:5432/mydb
JWT_SECRET=your-secret-here
JWT_EXPIRES_IN=7d

# Redis
REDIS_URL=redis://localhost:6379

# S3 / Storage
AWS_ACCESS_KEY_ID=
AWS_SECRET_ACCESS_KEY=
AWS_BUCKET_NAME=
`,
  'Node.js API': `# Server
PORT=3000
NODE_ENV=development

# Database
DATABASE_URL=postgresql://user:password@localhost:5432/mydb
DB_HOST=localhost
DB_PORT=5432
DB_NAME=mydb
DB_USER=user
DB_PASS=password

# Auth
JWT_SECRET=your-secret-here
JWT_EXPIRES_IN=7d

# API Keys
API_KEY=
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=

# Email
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=
SMTP_PASS=

# Redis
REDIS_URL=redis://localhost:6379

# Logging
LOG_LEVEL=debug
`,
  Minimal: `# App
PORT=3000
NODE_ENV=development

# Database
DATABASE_URL=

# Auth
JWT_SECRET=
API_KEY=
`,
};

async function generateEnv() {
  const rootDir = getRoot();
  if (!rootDir) return;

  const template = await vscode.window.showQuickPick(Object.keys(ENV_TEMPLATES), {
    placeHolder: 'Pick .env template',
  });
  if (!template) return;

  const envPath = path.join(rootDir, '.env');
  const examplePath = path.join(rootDir, '.env.example');

  if (fs.existsSync(envPath)) {
    const overwrite = await vscode.window.showWarningMessage(
      'AutoChecker: .env already exists. Overwrite?',
      { modal: true },
      'Overwrite',
      'Create .env.example only',
    );
    if (!overwrite) return;
    if (overwrite === 'Create .env.example only') {
      fs.writeFileSync(examplePath, ENV_TEMPLATES[template], 'utf-8');
      vscode.window.showInformationMessage('AutoChecker: Created .env.example');
      return;
    }
  }

  fs.writeFileSync(envPath, ENV_TEMPLATES[template], 'utf-8');
  fs.writeFileSync(examplePath, ENV_TEMPLATES[template], 'utf-8');
  vscode.window.showInformationMessage(`AutoChecker: Created .env + .env.example (${template})`);
}

// ── Package Quick Install ───────────────────────────────────────────────────

const POPULAR_PACKAGES = {
  'UI & Styling': [
    'tailwindcss',
    'postcss',
    'autoprefixer',
    'clsx',
    'tailwind-merge',
    'class-variance-authority',
    'lucide-react',
    '@radix-ui/react-dialog',
    '@radix-ui/react-dropdown-menu',
  ],
  'State & Data': [
    'axios',
    'swr',
    'react-query',
    '@tanstack/react-query',
    'zustand',
    'jotai',
    'zod',
    'react-hook-form',
  ],
  Animation: ['framer-motion', 'gsap', 'lottie-react'],
  'Dev Tools': [
    'prettier',
    'eslint',
    'typescript',
    '@types/node',
    '@types/react',
    'prettier-plugin-tailwindcss',
  ],
  'Auth & DB': ['next-auth', 'prisma', '@prisma/client', 'bcryptjs', 'jsonwebtoken'],
};

async function packageQuickInstall() {
  const rootDir = getRoot();
  if (!rootDir) return;

  // First: pick category or custom
  const categories = [...Object.keys(POPULAR_PACKAGES), '✏️ Custom package name'];
  const category = await vscode.window.showQuickPick(categories, {
    placeHolder: 'Pick category or enter custom package',
  });
  if (!category) return;

  let packages;
  if (category === '✏️ Custom package name') {
    const input = await vscode.window.showInputBox({
      prompt: 'Package names (space separated)',
      placeHolder: 'axios zod framer-motion',
    });
    if (!input) return;
    packages = [input.trim()];
  } else {
    const picked = await vscode.window.showQuickPick(
      POPULAR_PACKAGES[category].map((p) => ({ label: p, picked: false })),
      { canPickMany: true, placeHolder: `Select packages from ${category}` },
    );
    if (!picked || picked.length === 0) return;
    packages = picked.map((p) => p.label);
  }

  // Dev or regular?
  const depType = await vscode.window.showQuickPick(['dependencies', 'devDependencies'], {
    placeHolder: 'Install as...',
  });
  if (!depType) return;

  const flag = depType === 'devDependencies' ? ' -D' : '';
  const cmd = `npm install${flag} ${packages.join(' ')}`;

  const terminal = vscode.window.createTerminal('AutoChecker: npm');
  terminal.show();
  terminal.sendText(`cd "${rootDir}" && ${cmd}`);

  vscode.window.showInformationMessage(`AutoChecker: Running ${cmd}`);
}

// ── Component Generator ─────────────────────────────────────────────────────

async function generateComponent() {
  const rootDir = getRoot();
  if (!rootDir) return;

  const name = await vscode.window.showInputBox({
    prompt: 'Component name (PascalCase)',
    placeHolder: 'Button',
    validateInput: (v) => {
      if (!v) return 'Name is required';
      if (!/^[A-Z][a-zA-Z0-9]*$/.test(v)) return 'Use PascalCase (e.g. MyButton)';
      return null;
    },
  });
  if (!name) return;

  const style = await vscode.window.showQuickPick(
    ['Tailwind (className only)', 'CSS Module (.module.css)', 'Styled Components', 'No styles'],
    { placeHolder: 'Styling approach' },
  );
  if (!style) return;

  const baseDir = path.join(rootDir, 'src', 'components', name);
  ensureDirSync(baseDir);

  // TSX file
  let importStyle = '';
  let classAttr = "className={cn('', className)}";

  if (style === 'CSS Module (.module.css)') {
    importStyle = `import styles from './${name}.module.css';\n`;
    classAttr = 'className={cn(styles.root, className)}';
  } else if (style === 'Styled Components') {
    importStyle = `import { Wrapper } from './${name}.styled';\n`;
    classAttr = 'className={className}';
  }

  const tsxContent = `import { FC } from 'react';
import { cn } from '@/utils/cn';
${importStyle}
interface ${name}Props {
  className?: string;
}

export const ${name}: FC<${name}Props> = ({ className }) => {
  return (
    <div ${classAttr}>
      ${name}
    </div>
  );
};
`;

  const indexContent = `export { ${name} } from './${name}';\n`;

  fs.writeFileSync(path.join(baseDir, `${name}.tsx`), tsxContent, 'utf-8');
  fs.writeFileSync(path.join(baseDir, 'index.ts'), indexContent, 'utf-8');

  if (style === 'CSS Module (.module.css)') {
    fs.writeFileSync(path.join(baseDir, `${name}.module.css`), `.root {\n  \n}\n`, 'utf-8');
  } else if (style === 'Styled Components') {
    const styledContent = `import styled from 'styled-components';\n\nexport const Wrapper = styled.div\`\n  \n\`;\n`;
    fs.writeFileSync(path.join(baseDir, `${name}.styled.ts`), styledContent, 'utf-8');
  }

  vscode.window.showInformationMessage(`AutoChecker: Created component ${name}/ 🧩`);

  // Open the TSX file
  const doc = await vscode.workspace.openTextDocument(path.join(baseDir, `${name}.tsx`));
  await vscode.window.showTextDocument(doc);
}

// ── Project Tree Generator ──────────────────────────────────────────────────

const TREE_IGNORE = new Set([
  'node_modules',
  '.git',
  '.next',
  'dist',
  'build',
  '.DS_Store',
  'coverage',
  '.vscode',
  '.idea',
  '__pycache__',
  '.cache',
  '.turbo',
  '.vercel',
  '.output',
  'Thumbs.db',
]);

function buildTree(dirPath, prefix, maxDepth, currentDepth) {
  if (currentDepth >= maxDepth) return '';

  let entries;
  try {
    entries = fs.readdirSync(dirPath, { withFileTypes: true });
  } catch (_) {
    return '';
  }

  // Filter and sort: dirs first, then files
  entries = entries
    .filter((e) => !TREE_IGNORE.has(e.name) && !e.name.startsWith('.'))
    .sort((a, b) => {
      if (a.isDirectory() && !b.isDirectory()) return -1;
      if (!a.isDirectory() && b.isDirectory()) return 1;
      return a.name.localeCompare(b.name);
    });

  let result = '';
  entries.forEach((entry, i) => {
    const isLast = i === entries.length - 1;
    const connector = isLast ? '└── ' : '├── ';
    const childPrefix = isLast ? '    ' : '│   ';

    result += prefix + connector + entry.name + (entry.isDirectory() ? '/' : '') + '\n';

    if (entry.isDirectory()) {
      result += buildTree(
        path.join(dirPath, entry.name),
        prefix + childPrefix,
        maxDepth,
        currentDepth + 1,
      );
    }
  });

  return result;
}

async function generateProjectTree() {
  const rootDir = getRoot();
  if (!rootDir) return;

  const depthStr = await vscode.window.showQuickPick(
    ['2 levels', '3 levels', '4 levels', '5 levels'],
    { placeHolder: 'Tree depth' },
  );
  if (!depthStr) return;

  const maxDepth = parseInt(depthStr);
  const projectName = path.basename(rootDir);
  const tree = `${projectName}/\n` + buildTree(rootDir, '', maxDepth, 0);

  const wrapped = '```\n' + tree + '```';

  await vscode.env.clipboard.writeText(wrapped);
  vscode.window.showInformationMessage(`AutoChecker: Project tree copied to clipboard! 🌳`);
}

// ── HTTP Client (Postman-style) ─────────────────────────────────────────────

const https = require('https');

let httpClientPanel = null;
let requestHistory = [];
const HISTORY_FILE = '.vscode/autochecker-history.json';

function loadHistory(rootDir) {
  if (!rootDir) return [];
  const histPath = path.join(rootDir, HISTORY_FILE);
  try {
    if (fs.existsSync(histPath)) {
      return JSON.parse(fs.readFileSync(histPath, 'utf-8'));
    }
  } catch (_) {}
  return [];
}

function saveHistory(rootDir) {
  if (!rootDir) return;
  const histPath = path.join(rootDir, HISTORY_FILE);
  ensureDirSync(path.dirname(histPath));
  // Keep last 50 entries
  const trimmed = requestHistory.slice(-50);
  fs.writeFileSync(histPath, JSON.stringify(trimmed, null, 2), 'utf-8');
}

function getWebviewContent() {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<style>
  :root {
    --bg: var(--vscode-editor-background);
    --fg: var(--vscode-editor-foreground);
    --input-bg: var(--vscode-input-background);
    --input-fg: var(--vscode-input-foreground);
    --input-border: var(--vscode-input-border, #444);
    --btn: var(--vscode-button-background);
    --btn-fg: var(--vscode-button-foreground);
    --btn-hover: var(--vscode-button-hoverBackground);
    --badge-bg: var(--vscode-badge-background);
    --badge-fg: var(--vscode-badge-foreground);
    --border: var(--vscode-panel-border, #333);
    --tab-active: var(--vscode-tab-activeBackground, #1e1e1e);
    --tab-inactive: var(--vscode-tab-inactiveBackground, #2d2d2d);
    --success: #4ec9b0;
    --warn: #cca700;
    --error: #f14c4c;
  }
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: var(--vscode-font-family, sans-serif); font-size: 13px; color: var(--fg); background: var(--bg); padding: 12px; }

  /* URL Bar */
  .url-bar { display: flex; gap: 8px; margin-bottom: 12px; }
  .method-select {
    width: 110px; padding: 6px 8px; border: 1px solid var(--input-border);
    background: var(--input-bg); color: var(--input-fg); border-radius: 4px;
    font-weight: 600; font-size: 13px;
  }
  .url-input {
    flex: 1; padding: 6px 10px; border: 1px solid var(--input-border);
    background: var(--input-bg); color: var(--input-fg); border-radius: 4px;
    font-size: 13px; font-family: var(--vscode-editor-font-family, monospace);
  }
  .send-btn {
    padding: 6px 20px; background: var(--btn); color: var(--btn-fg);
    border: none; border-radius: 4px; cursor: pointer; font-weight: 600; font-size: 13px;
    white-space: nowrap;
  }
  .send-btn:hover { background: var(--btn-hover); }
  .send-btn:disabled { opacity: 0.5; cursor: not-allowed; }

  /* Tabs */
  .tabs { display: flex; border-bottom: 1px solid var(--border); margin-bottom: 8px; }
  .tab {
    padding: 6px 14px; cursor: pointer; font-size: 12px;
    border-bottom: 2px solid transparent; opacity: 0.7;
  }
  .tab:hover { opacity: 1; }
  .tab.active { border-bottom-color: var(--btn); opacity: 1; font-weight: 600; }
  .tab-panel { display: none; }
  .tab-panel.active { display: block; }

  /* KV editor */
  .kv-row { display: flex; gap: 6px; margin-bottom: 4px; align-items: center; }
  .kv-row input {
    flex: 1; padding: 4px 8px; border: 1px solid var(--input-border);
    background: var(--input-bg); color: var(--input-fg); border-radius: 3px;
    font-size: 12px; font-family: var(--vscode-editor-font-family, monospace);
  }
  .kv-remove {
    width: 24px; height: 24px; border: none; background: transparent;
    color: var(--error); cursor: pointer; font-size: 16px; border-radius: 3px;
    display: flex; align-items: center; justify-content: center;
  }
  .kv-remove:hover { background: rgba(241,76,76,0.15); }
  .add-row-btn {
    padding: 3px 10px; border: 1px dashed var(--input-border); background: transparent;
    color: var(--fg); cursor: pointer; border-radius: 3px; font-size: 11px; margin-top: 4px;
    opacity: 0.7;
  }
  .add-row-btn:hover { opacity: 1; }

  /* Body */
  .body-textarea {
    width: 100%; min-height: 120px; padding: 8px; border: 1px solid var(--input-border);
    background: var(--input-bg); color: var(--input-fg); border-radius: 4px;
    font-family: var(--vscode-editor-font-family, monospace); font-size: 12px;
    resize: vertical;
  }

  /* Auth */
  .auth-section { display: flex; flex-direction: column; gap: 6px; }
  .auth-section label { font-size: 11px; opacity: 0.7; }
  .auth-input {
    padding: 5px 8px; border: 1px solid var(--input-border);
    background: var(--input-bg); color: var(--input-fg); border-radius: 3px;
    font-family: var(--vscode-editor-font-family, monospace); font-size: 12px;
  }

  /* Response */
  .response-bar {
    display: flex; align-items: center; gap: 12px; padding: 8px 0;
    border-top: 1px solid var(--border); margin-top: 12px;
  }
  .status-badge {
    padding: 2px 8px; border-radius: 3px; font-weight: 600; font-size: 12px;
  }
  .status-2xx { background: rgba(78,201,176,0.15); color: var(--success); }
  .status-3xx { background: rgba(204,167,0,0.15); color: var(--warn); }
  .status-4xx, .status-5xx { background: rgba(241,76,76,0.15); color: var(--error); }
  .timing { font-size: 11px; opacity: 0.6; }
  .size-info { font-size: 11px; opacity: 0.6; }

  .response-tabs { display: flex; border-bottom: 1px solid var(--border); margin-bottom: 6px; }
  .response-body {
    width: 100%; min-height: 180px; padding: 8px; border: 1px solid var(--input-border);
    background: var(--input-bg); color: var(--input-fg); border-radius: 4px;
    font-family: var(--vscode-editor-font-family, monospace); font-size: 12px;
    white-space: pre-wrap; word-break: break-all; overflow: auto; max-height: 400px;
  }
  .response-headers-list { font-size: 12px; font-family: var(--vscode-editor-font-family, monospace); }
  .response-headers-list div { padding: 2px 0; border-bottom: 1px solid var(--border); }
  .response-headers-list span:first-child { font-weight: 600; color: var(--success); }

  /* History */
  .history-panel { max-height: 300px; overflow-y: auto; }
  .history-item {
    display: flex; align-items: center; gap: 8px; padding: 5px 8px;
    cursor: pointer; border-radius: 3px; font-size: 12px;
  }
  .history-item:hover { background: rgba(255,255,255,0.05); }
  .history-method {
    width: 55px; font-weight: 700; font-size: 10px; text-align: center;
    padding: 1px 4px; border-radius: 2px;
  }
  .m-GET { color: var(--success); }
  .m-POST { color: var(--warn); }
  .m-PUT { color: #569cd6; }
  .m-PATCH { color: #c586c0; }
  .m-DELETE { color: var(--error); }
  .m-HEAD, .m-OPTIONS { color: var(--fg); opacity: 0.6; }
  .history-url {
    flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
    font-family: var(--vscode-editor-font-family, monospace); opacity: 0.8;
  }
  .history-status { font-size: 10px; opacity: 0.5; }
  .history-clear {
    padding: 3px 10px; border: 1px solid var(--input-border); background: transparent;
    color: var(--error); cursor: pointer; border-radius: 3px; font-size: 11px;
    margin-bottom: 8px;
  }
  .no-history { text-align: center; padding: 20px; opacity: 0.4; }

  .section-label { font-size: 11px; font-weight: 600; margin-bottom: 6px; opacity: 0.7; text-transform: uppercase; letter-spacing: 0.5px; }
  .loader { display: none; }
  .loader.active { display: inline-block; }
  @keyframes spin { to { transform: rotate(360deg); } }
  .spinner { display: inline-block; width: 14px; height: 14px; border: 2px solid var(--input-border); border-top-color: var(--btn); border-radius: 50%; animation: spin .6s linear infinite; }
</style>
</head>
<body>
  <!-- URL Bar -->
  <div class="url-bar">
    <select class="method-select" id="method">
      <option value="GET">GET</option>
      <option value="POST">POST</option>
      <option value="PUT">PUT</option>
      <option value="PATCH">PATCH</option>
      <option value="DELETE">DELETE</option>
      <option value="HEAD">HEAD</option>
      <option value="OPTIONS">OPTIONS</option>
    </select>
    <input class="url-input" id="url" type="text" placeholder="https://api.example.com/endpoint" spellcheck="false">
    <button class="send-btn" id="sendBtn" onclick="sendRequest()">
      <span id="sendText">Send</span>
      <span class="loader" id="loader"><span class="spinner"></span></span>
    </button>
  </div>

  <!-- Request Tabs -->
  <div class="tabs" id="reqTabs">
    <div class="tab active" data-tab="headers" onclick="switchReqTab(this)">Headers</div>
    <div class="tab" data-tab="body" onclick="switchReqTab(this)">Body</div>
    <div class="tab" data-tab="auth" onclick="switchReqTab(this)">Auth</div>
    <div class="tab" data-tab="history" onclick="switchReqTab(this)">History</div>
  </div>

  <!-- Headers -->
  <div class="tab-panel active" id="panel-headers">
    <div class="section-label">Request Headers</div>
    <div id="headersContainer">
      <div class="kv-row">
        <input type="text" placeholder="Key" value="Content-Type">
        <input type="text" placeholder="Value" value="application/json">
        <button class="kv-remove" onclick="removeRow(this)">&times;</button>
      </div>
    </div>
    <button class="add-row-btn" onclick="addHeaderRow()">+ Add Header</button>
  </div>

  <!-- Body -->
  <div class="tab-panel" id="panel-body">
    <div class="section-label">Request Body</div>
    <textarea class="body-textarea" id="reqBody" placeholder='{"key": "value"}'></textarea>
  </div>

  <!-- Auth -->
  <div class="tab-panel" id="panel-auth">
    <div class="auth-section">
      <div class="section-label">Bearer Token</div>
      <input class="auth-input" id="authToken" type="text" placeholder="eyJhbGciOiJIUzI1NiIs..." spellcheck="false">
    </div>
  </div>

  <!-- History -->
  <div class="tab-panel" id="panel-history">
    <div class="section-label" style="display:flex;justify-content:space-between;align-items:center;">
      Request History
      <button class="history-clear" onclick="clearHistory()">Clear All</button>
    </div>
    <div class="history-panel" id="historyList"></div>
  </div>

  <!-- Response -->
  <div id="responseSection" style="display:none;">
    <div class="response-bar">
      <span class="status-badge" id="resStatus"></span>
      <span class="timing" id="resTiming"></span>
      <span class="size-info" id="resSize"></span>
    </div>
    <div class="response-tabs" id="resTabs">
      <div class="tab active" data-tab="res-body" onclick="switchResTab(this)">Body</div>
      <div class="tab" data-tab="res-headers" onclick="switchResTab(this)">Headers</div>
    </div>
    <div class="tab-panel active" id="panel-res-body">
      <div class="response-body" id="resBody"></div>
    </div>
    <div class="tab-panel" id="panel-res-headers">
      <div class="response-headers-list" id="resHeaders"></div>
    </div>
  </div>

<script>
  const vscodeApi = acquireVsCodeApi();

  function switchReqTab(el) {
    document.querySelectorAll('#reqTabs .tab').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('#reqTabs ~ .tab-panel').forEach(p => p.classList.remove('active'));
    el.classList.add('active');
    document.getElementById('panel-' + el.dataset.tab).classList.add('active');
    if (el.dataset.tab === 'history') renderHistory();
  }

  function switchResTab(el) {
    document.querySelectorAll('#resTabs .tab').forEach(t => t.classList.remove('active'));
    el.classList.add('active');
    document.getElementById('panel-res-body').classList.remove('active');
    document.getElementById('panel-res-headers').classList.remove('active');
    document.getElementById('panel-' + el.dataset.tab).classList.add('active');
  }

  function addHeaderRow() {
    const c = document.getElementById('headersContainer');
    const row = document.createElement('div');
    row.className = 'kv-row';
    row.innerHTML = '<input type="text" placeholder="Key"><input type="text" placeholder="Value"><button class="kv-remove" onclick="removeRow(this)">&times;</button>';
    c.appendChild(row);
  }

  function removeRow(btn) { btn.parentElement.remove(); }

  function getHeaders() {
    const headers = {};
    document.querySelectorAll('#headersContainer .kv-row').forEach(row => {
      const inputs = row.querySelectorAll('input');
      const k = inputs[0].value.trim();
      const v = inputs[1].value.trim();
      if (k) headers[k] = v;
    });
    const token = document.getElementById('authToken').value.trim();
    if (token) headers['Authorization'] = 'Bearer ' + token;
    return headers;
  }

  function sendRequest() {
    const method = document.getElementById('method').value;
    const url = document.getElementById('url').value.trim();
    if (!url) return;

    const headers = getHeaders();
    const body = document.getElementById('reqBody').value;

    document.getElementById('sendBtn').disabled = true;
    document.getElementById('sendText').style.display = 'none';
    document.getElementById('loader').classList.add('active');

    vscodeApi.postMessage({
      type: 'sendRequest',
      method, url, headers,
      body: ['POST','PUT','PATCH'].includes(method) ? body : undefined
    });
  }

  let history = [];

  function renderHistory() {
    const list = document.getElementById('historyList');
    if (history.length === 0) {
      list.innerHTML = '<div class="no-history">No requests yet</div>';
      return;
    }
    list.innerHTML = history.slice().reverse().map((h, i) =>
      '<div class="history-item" onclick="loadFromHistory(' + (history.length - 1 - i) + ')">' +
        '<span class="history-method m-' + h.method + '">' + h.method + '</span>' +
        '<span class="history-url">' + escapeHtml(h.url) + '</span>' +
        '<span class="history-status">' + (h.status || '') + '</span>' +
      '</div>'
    ).join('');
  }

  function loadFromHistory(idx) {
    const h = history[idx];
    if (!h) return;
    document.getElementById('method').value = h.method;
    document.getElementById('url').value = h.url;
    if (h.body) document.getElementById('reqBody').value = h.body;
    // Restore headers
    const c = document.getElementById('headersContainer');
    c.innerHTML = '';
    if (h.headers) {
      Object.entries(h.headers).forEach(([k, v]) => {
        if (k === 'Authorization') {
          const token = v.replace('Bearer ', '');
          document.getElementById('authToken').value = token;
          return;
        }
        const row = document.createElement('div');
        row.className = 'kv-row';
        row.innerHTML = '<input type="text" placeholder="Key" value="' + escapeAttr(k) + '"><input type="text" placeholder="Value" value="' + escapeAttr(v) + '"><button class="kv-remove" onclick="removeRow(this)">&times;</button>';
        c.appendChild(row);
      });
    }
    // Switch to headers tab
    document.querySelector('#reqTabs .tab[data-tab="headers"]').click();
  }

  function clearHistory() {
    vscodeApi.postMessage({ type: 'clearHistory' });
    history = [];
    renderHistory();
  }

  function escapeHtml(s) { return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }
  function escapeAttr(s) { return s.replace(/"/g,'&quot;').replace(/'/g,'&#39;'); }

  function formatSize(bytes) {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / 1048576).toFixed(1) + ' MB';
  }

  window.addEventListener('message', e => {
    const msg = e.data;
    if (msg.type === 'response') {
      document.getElementById('sendBtn').disabled = false;
      document.getElementById('sendText').style.display = 'inline';
      document.getElementById('loader').classList.remove('active');

      const sec = document.getElementById('responseSection');
      sec.style.display = 'block';

      // Status
      const badge = document.getElementById('resStatus');
      badge.textContent = msg.status + ' ' + (msg.statusText || '');
      badge.className = 'status-badge';
      if (msg.status < 300) badge.classList.add('status-2xx');
      else if (msg.status < 400) badge.classList.add('status-3xx');
      else if (msg.status < 500) badge.classList.add('status-4xx');
      else badge.classList.add('status-5xx');

      document.getElementById('resTiming').textContent = msg.time + ' ms';
      document.getElementById('resSize').textContent = formatSize(msg.bodySize || 0);

      // Body — try to prettify JSON
      let bodyText = msg.body || '';
      try { bodyText = JSON.stringify(JSON.parse(bodyText), null, 2); } catch(_) {}
      document.getElementById('resBody').textContent = bodyText;

      // Headers
      const hList = document.getElementById('resHeaders');
      hList.innerHTML = '';
      if (msg.headers) {
        Object.entries(msg.headers).forEach(([k, v]) => {
          const div = document.createElement('div');
          div.innerHTML = '<span>' + escapeHtml(k) + ':</span> ' + escapeHtml(String(v));
          hList.appendChild(div);
        });
      }

      // Switch to body tab
      document.querySelector('#resTabs .tab[data-tab="res-body"]').click();
    }

    if (msg.type === 'error') {
      document.getElementById('sendBtn').disabled = false;
      document.getElementById('sendText').style.display = 'inline';
      document.getElementById('loader').classList.remove('active');

      const sec = document.getElementById('responseSection');
      sec.style.display = 'block';
      const badge = document.getElementById('resStatus');
      badge.textContent = 'ERROR';
      badge.className = 'status-badge status-5xx';
      document.getElementById('resTiming').textContent = '';
      document.getElementById('resSize').textContent = '';
      document.getElementById('resBody').textContent = msg.message;
      document.getElementById('resHeaders').innerHTML = '';
    }

    if (msg.type === 'history') {
      history = msg.data || [];
      renderHistory();
    }
  });

  // Request initial history
  vscodeApi.postMessage({ type: 'getHistory' });

  // Enter to send
  document.getElementById('url').addEventListener('keydown', e => {
    if (e.key === 'Enter') sendRequest();
  });
</script>
</body>
</html>`;
}

function openHttpClient(context) {
  if (httpClientPanel) {
    httpClientPanel.reveal();
    return;
  }

  httpClientPanel = vscode.window.createWebviewPanel(
    'autochecker.httpClient',
    'AutoChecker: HTTP Client',
    vscode.ViewColumn.One,
    { enableScripts: true, retainContextWhenHidden: true },
  );

  httpClientPanel.webview.html = getWebviewContent();

  // Load history
  const rootDir = getRoot();
  if (rootDir) {
    requestHistory = loadHistory(rootDir);
  }

  httpClientPanel.webview.onDidReceiveMessage(
    async (msg) => {
      if (msg.type === 'getHistory') {
        httpClientPanel.webview.postMessage({ type: 'history', data: requestHistory });
        return;
      }

      if (msg.type === 'clearHistory') {
        requestHistory = [];
        const r = getRoot();
        if (r) saveHistory(r);
        return;
      }

      if (msg.type === 'sendRequest') {
        const startTime = Date.now();
        try {
          const urlObj = new URL(msg.url);
          const isHttps = urlObj.protocol === 'https:';
          const lib = isHttps ? https : http;

          const options = {
            hostname: urlObj.hostname,
            port: urlObj.port || (isHttps ? 443 : 80),
            path: urlObj.pathname + urlObj.search,
            method: msg.method,
            headers: msg.headers || {},
          };

          const req = lib.request(options, (res) => {
            const chunks = [];
            res.on('data', (chunk) => chunks.push(chunk));
            res.on('end', () => {
              const body = Buffer.concat(chunks).toString('utf-8');
              const elapsed = Date.now() - startTime;

              httpClientPanel.webview.postMessage({
                type: 'response',
                status: res.statusCode,
                statusText: res.statusMessage,
                headers: res.headers,
                body: body,
                bodySize: Buffer.byteLength(body, 'utf-8'),
                time: elapsed,
              });

              // Save to history
              const entry = {
                method: msg.method,
                url: msg.url,
                headers: msg.headers,
                body: msg.body,
                status: res.statusCode,
                time: new Date().toISOString(),
              };
              requestHistory.push(entry);
              const r = getRoot();
              if (r) saveHistory(r);

              httpClientPanel.webview.postMessage({ type: 'history', data: requestHistory });
            });
          });

          req.on('error', (err) => {
            httpClientPanel.webview.postMessage({
              type: 'error',
              message: err.message,
            });
          });

          req.setTimeout(30000, () => {
            req.destroy();
            httpClientPanel.webview.postMessage({
              type: 'error',
              message: 'Request timed out (30s)',
            });
          });

          if (msg.body && ['POST', 'PUT', 'PATCH'].includes(msg.method)) {
            req.write(msg.body);
          }

          req.end();
        } catch (err) {
          httpClientPanel.webview.postMessage({
            type: 'error',
            message: err.message,
          });
        }
      }
    },
    undefined,
    context.subscriptions,
  );

  httpClientPanel.onDidDispose(() => {
    httpClientPanel = null;
  });
}

// ── Sidebar Dashboard ───────────────────────────────────────────────────────

class SidebarProvider {
  constructor(context) {
    this._context = context;
    this._view = null;
  }

  resolveWebviewView(webviewView) {
    this._view = webviewView;
    webviewView.webview.options = { enableScripts: true };
    webviewView.webview.html = this._getHtml();

    webviewView.webview.onDidReceiveMessage((msg) => {
      if (msg.type === 'runCommand') {
        vscode.commands.executeCommand(msg.command);
      }
    });
  }

  _getHtml() {
    return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body {
    font-family: var(--vscode-font-family, sans-serif);
    font-size: 12px;
    color: var(--vscode-foreground);
    padding: 0;
    overflow-x: hidden;
  }

  /* Header */
  .header {
    padding: 14px 12px 10px;
    border-bottom: 1px solid var(--vscode-panel-border, rgba(255,255,255,0.08));
  }
  .header-title {
    font-size: 13px; font-weight: 700; letter-spacing: 0.3px;
    display: flex; align-items: center; gap: 6px;
  }
  .header-version {
    font-size: 10px; font-weight: 400; opacity: 0.4;
    background: var(--vscode-badge-background, rgba(255,255,255,0.1));
    color: var(--vscode-badge-foreground, inherit);
    padding: 1px 6px; border-radius: 8px;
  }

  /* Accordion */
  .group { border-bottom: 1px solid var(--vscode-panel-border, rgba(255,255,255,0.08)); }
  .group-header {
    display: flex; align-items: center; gap: 8px;
    padding: 8px 12px; cursor: pointer; user-select: none;
    transition: background 0.1s;
  }
  .group-header:hover { background: var(--vscode-list-hoverBackground, rgba(255,255,255,0.04)); }
  .group-chevron {
    font-size: 10px; width: 14px; text-align: center;
    transition: transform 0.2s; opacity: 0.5;
  }
  .group.open .group-chevron { transform: rotate(90deg); }
  .group-icon { font-size: 13px; width: 18px; text-align: center; }
  .group-label { flex: 1; font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; }
  .group-badge {
    font-size: 9px; padding: 0 5px; border-radius: 6px; line-height: 16px;
    background: var(--vscode-badge-background, rgba(255,255,255,0.1));
    color: var(--vscode-badge-foreground, inherit);
  }
  .group-body {
    max-height: 0; overflow: hidden; transition: max-height 0.25s ease;
  }
  .group.open .group-body { max-height: 500px; }
  .group-content { padding: 2px 0 8px; }

  /* Action buttons */
  .action {
    display: flex; align-items: center; gap: 8px;
    width: 100%; padding: 5px 12px 5px 36px;
    border: none; background: transparent;
    color: var(--vscode-foreground); cursor: pointer;
    font-size: 12px; font-family: inherit; text-align: left;
    transition: background 0.1s; border-radius: 0;
  }
  .action:hover { background: var(--vscode-list-hoverBackground, rgba(255,255,255,0.06)); }
  .action:active { background: var(--vscode-list-activeSelectionBackground, rgba(255,255,255,0.1)); }
  .action-icon { width: 16px; text-align: center; font-size: 12px; flex-shrink: 0; opacity: 0.7; }
  .action-label { flex: 1; }
  .action-hint {
    font-size: 9px; opacity: 0.35;
    font-family: var(--vscode-editor-font-family, monospace);
  }

  /* Primary action */
  .action-primary {
    margin: 6px 12px 4px;
    padding: 7px 12px;
    background: var(--vscode-button-background);
    color: var(--vscode-button-foreground);
    border: none; border-radius: 4px; cursor: pointer;
    font-size: 12px; font-weight: 600; font-family: inherit;
    display: flex; align-items: center; justify-content: center; gap: 6px;
    width: calc(100% - 24px);
    transition: background 0.15s;
  }
  .action-primary:hover { background: var(--vscode-button-hoverBackground); }

  /* Inline separator */
  .sep { height: 1px; background: var(--vscode-panel-border, rgba(255,255,255,0.06)); margin: 4px 36px 4px 36px; }
</style>
</head>
<body>

  <div class="header">
    <div class="header-title">
      ⚡ AutoChecker
      <span class="header-version">v0.0.9</span>
    </div>
  </div>

  <!-- Quick Action -->
  <button class="action-primary" onclick="run('autochecker.initFullArchitecture')">
    🚀 Init Full Architecture
  </button>

  <!-- Project Setup -->
  <div class="group open" onclick="toggle(this, event)">
    <div class="group-header">
      <span class="group-chevron">▶</span>
      <span class="group-icon">📦</span>
      <span class="group-label">Project Setup</span>
      <span class="group-badge">3</span>
    </div>
    <div class="group-body">
      <div class="group-content">
        <button class="action" onclick="run('autochecker.initFullArchitecture')">
          <span class="action-icon">🚀</span>
          <span class="action-label">Full Architecture</span>
        </button>
        <button class="action" onclick="run('autochecker.initConfigs')">
          <span class="action-icon">⚙️</span>
          <span class="action-label">Configs Only</span>
        </button>
        <button class="action" onclick="run('autochecker.initScaffold')">
          <span class="action-icon">📁</span>
          <span class="action-label">Scaffold Only</span>
        </button>
      </div>
    </div>
  </div>

  <!-- Live Server -->
  <div class="group" onclick="toggle(this, event)">
    <div class="group-header">
      <span class="group-chevron">▶</span>
      <span class="group-icon">🖥️</span>
      <span class="group-label">Live Server</span>
      <span class="group-badge">2</span>
    </div>
    <div class="group-body">
      <div class="group-content">
        <button class="action" onclick="run('autochecker.startLiveServer')">
          <span class="action-icon">▶️</span>
          <span class="action-label">Start Server</span>
          <span class="action-hint">:5500</span>
        </button>
        <button class="action" onclick="run('autochecker.stopLiveServer')">
          <span class="action-icon">⏹️</span>
          <span class="action-label">Stop Server</span>
        </button>
      </div>
    </div>
  </div>

  <!-- Console Logs -->
  <div class="group" onclick="toggle(this, event)">
    <div class="group-header">
      <span class="group-chevron">▶</span>
      <span class="group-icon">📋</span>
      <span class="group-label">Console Logs</span>
      <span class="group-badge">9</span>
    </div>
    <div class="group-body">
      <div class="group-content">
        <button class="action" onclick="run('autochecker.insertLog')">
          <span class="action-icon">📋</span>
          <span class="action-label">console.log</span>
          <span class="action-hint">⌘⇧L</span>
        </button>
        <button class="action" onclick="run('autochecker.insertWarn')">
          <span class="action-icon">⚠️</span>
          <span class="action-label">console.warn</span>
          <span class="action-hint">⌘⇧W</span>
        </button>
        <button class="action" onclick="run('autochecker.insertError')">
          <span class="action-icon">❌</span>
          <span class="action-label">console.error</span>
          <span class="action-hint">⌘⇧E</span>
        </button>
        <button class="action" onclick="run('autochecker.insertInfo')">
          <span class="action-icon">ℹ️</span>
          <span class="action-label">console.info</span>
        </button>
        <button class="action" onclick="run('autochecker.insertDebug')">
          <span class="action-icon">🐛</span>
          <span class="action-label">console.debug</span>
        </button>
        <button class="action" onclick="run('autochecker.insertTable')">
          <span class="action-icon">📊</span>
          <span class="action-label">console.table</span>
        </button>

        <div class="sep"></div>

        <button class="action" onclick="run('autochecker.commentAllLogs')">
          <span class="action-icon">💬</span>
          <span class="action-label">Comment All</span>
          <span class="action-hint">⌘⌥C</span>
        </button>
        <button class="action" onclick="run('autochecker.uncommentAllLogs')">
          <span class="action-icon">🔓</span>
          <span class="action-label">Uncomment All</span>
          <span class="action-hint">⌘⌥U</span>
        </button>
        <button class="action" onclick="run('autochecker.deleteAllLogs')">
          <span class="action-icon">🗑️</span>
          <span class="action-label">Delete All</span>
          <span class="action-hint">⌘⌥D</span>
        </button>
      </div>
    </div>
  </div>

  <!-- Code Quality -->
  <div class="group" onclick="toggle(this, event)">
    <div class="group-header">
      <span class="group-chevron">▶</span>
      <span class="group-icon">🛠️</span>
      <span class="group-label">Code Quality</span>
      <span class="group-badge">5</span>
    </div>
    <div class="group-body">
      <div class="group-content">
        <button class="action" onclick="run('autochecker.sortImports')">
          <span class="action-icon">↕️</span>
          <span class="action-label">Sort Imports</span>
        </button>
        <button class="action" onclick="run('autochecker.removeUnusedImports')">
          <span class="action-icon">🧹</span>
          <span class="action-label">Remove Unused Imports</span>
        </button>
        <button class="action" onclick="run('autochecker.scanTodos')">
          <span class="action-icon">📌</span>
          <span class="action-label">Scan TODOs / FIXMEs</span>
        </button>
        <button class="action" onclick="run('autochecker.scanDeadCode')">
          <span class="action-icon">💀</span>
          <span class="action-label">Dead Code Scanner</span>
        </button>
        <button class="action" onclick="run('autochecker.findDuplicates')">
          <span class="action-icon">📎</span>
          <span class="action-label">Find Duplicates</span>
        </button>
      </div>
    </div>
  </div>

  <!-- Code Generation -->
  <div class="group" onclick="toggle(this, event)">
    <div class="group-header">
      <span class="group-chevron">▶</span>
      <span class="group-icon">⚡</span>
      <span class="group-label">Code Generation</span>
      <span class="group-badge">4</span>
    </div>
    <div class="group-body">
      <div class="group-content">
        <button class="action" onclick="run('autochecker.generateHook')">
          <span class="action-icon">🪝</span>
          <span class="action-label">Custom Hook</span>
        </button>
        <button class="action" onclick="run('autochecker.generateApiRoute')">
          <span class="action-icon">🛣️</span>
          <span class="action-label">Next.js API Route</span>
        </button>
        <button class="action" onclick="run('autochecker.jsonToInterface')">
          <span class="action-icon">📐</span>
          <span class="action-label">JSON → TS Interface</span>
        </button>
        <button class="action" onclick="run('autochecker.generateBarrelExport')">
          <span class="action-icon">📦</span>
          <span class="action-label">Barrel Export (index.ts)</span>
        </button>
      </div>
    </div>
  </div>

  <!-- HTTP Client -->
  <div class="group" onclick="toggle(this, event)">
    <div class="group-header">
      <span class="group-chevron">▶</span>
      <span class="group-icon">🌐</span>
      <span class="group-label">HTTP Client</span>
      <span class="group-badge">1</span>
    </div>
    <div class="group-body">
      <div class="group-content">
        <button class="action" onclick="run('autochecker.openHttpClient')">
          <span class="action-icon">🌐</span>
          <span class="action-label">Open Postman Client</span>
        </button>
      </div>
    </div>
  </div>

  <!-- Generators -->
  <div class="group" onclick="toggle(this, event)">
    <div class="group-header">
      <span class="group-chevron">▶</span>
      <span class="group-icon">🔧</span>
      <span class="group-label">Generators</span>
      <span class="group-badge">3</span>
    </div>
    <div class="group-body">
      <div class="group-content">
        <button class="action" onclick="run('autochecker.generateComponent')">
          <span class="action-icon">🔄</span>
          <span class="action-label">React Component</span>
        </button>
        <button class="action" onclick="run('autochecker.generateEnv')">
          <span class="action-icon">🔑</span>
          <span class="action-label">.env Template</span>
        </button>
        <button class="action" onclick="run('autochecker.projectTree')">
          <span class="action-icon">🌳</span>
          <span class="action-label">Project Tree → Clipboard</span>
        </button>
      </div>
    </div>
  </div>

  <!-- Tools -->
  <div class="group" onclick="toggle(this, event)">
    <div class="group-header">
      <span class="group-chevron">▶</span>
      <span class="group-icon">🎨</span>
      <span class="group-label">Frontend Tools</span>
      <span class="group-badge">6</span>
    </div>
    <div class="group-body"><div class="group-content">
      <button class="action" onclick="run('autochecker.sortTailwind')"><span class="action-icon">🔤</span><span class="action-label">Sort Tailwind Classes</span></button>
      <button class="action" onclick="run('autochecker.cssToTailwind')"><span class="action-icon">🔀</span><span class="action-label">CSS → Tailwind</span></button>
      <button class="action" onclick="run('autochecker.breakpoints')"><span class="action-icon">📱</span><span class="action-label">Breakpoint Viewer</span></button>
      <button class="action" onclick="run('autochecker.fontPreview')"><span class="action-icon">🔤</span><span class="action-label">Font Preview</span></button>
      <button class="action" onclick="run('autochecker.cssUnitConverter')"><span class="action-icon">📏</span><span class="action-label">CSS Unit Converter</span></button>
      <button class="action" onclick="run('autochecker.colorPicker')"><span class="action-icon">🎨</span><span class="action-label">Color Picker</span></button>
    </div></div>
  </div>

  <!-- Formatters -->
  <div class="group" onclick="toggle(this, event)">
    <div class="group-header">
      <span class="group-chevron">▶</span>
      <span class="group-icon">🔧</span>
      <span class="group-label">Formatters</span>
      <span class="group-badge">4</span>
    </div>
    <div class="group-body"><div class="group-content">
      <button class="action" onclick="run('autochecker.jsonFormat')"><span class="action-icon">📋</span><span class="action-label">JSON Format / Minify</span></button>
      <button class="action" onclick="run('autochecker.decodeJwt')"><span class="action-icon">🔑</span><span class="action-label">JWT Decoder</span></button>
      <button class="action" onclick="run('autochecker.convertCase')"><span class="action-icon">🔠</span><span class="action-label">String Case Converter</span></button>
      <button class="action" onclick="run('autochecker.generatePassword')"><span class="action-icon">🔐</span><span class="action-label">Password / Secret Gen</span></button>
    </div></div>
  </div>

  <!-- DX -->
  <div class="group" onclick="toggle(this, event)">
    <div class="group-header">
      <span class="group-chevron">▶</span>
      <span class="group-icon">🚀</span>
      <span class="group-label">DX & Productivity</span>
      <span class="group-badge">8</span>
    </div>
    <div class="group-body"><div class="group-content">
      <button class="action" onclick="run('autochecker.wrapTryCatch')"><span class="action-icon">🛡️</span><span class="action-label">Wrap in Try/Catch</span></button>
      <button class="action" onclick="run('autochecker.commentHeader')"><span class="action-icon">📝</span><span class="action-label">Comment Header</span></button>
      <button class="action" onclick="run('autochecker.addBookmark')"><span class="action-icon">🔖</span><span class="action-label">Add Bookmark</span></button>
      <button class="action" onclick="run('autochecker.showBookmarks')"><span class="action-icon">📚</span><span class="action-label">Show Bookmarks</span></button>
      <button class="action" onclick="run('autochecker.saveSnippet')"><span class="action-icon">✂️</span><span class="action-label">Save Snippet</span></button>
      <button class="action" onclick="run('autochecker.insertSnippet')"><span class="action-icon">📎</span><span class="action-label">Insert Snippet</span></button>
      <button class="action" onclick="run('autochecker.killPort')"><span class="action-icon">💀</span><span class="action-label">Kill Port</span></button>
      <button class="action" onclick="run('autochecker.fileScaffolder')"><span class="action-icon">📄</span><span class="action-label">File Scaffolder</span></button>
    </div></div>
  </div>

  <!-- Project -->
  <div class="group" onclick="toggle(this, event)">
    <div class="group-header">
      <span class="group-chevron">▶</span>
      <span class="group-icon">📦</span>
      <span class="group-label">Project</span>
      <span class="group-badge">4</span>
    </div>
    <div class="group-body"><div class="group-content">
      <button class="action" onclick="run('autochecker.generateReadme')"><span class="action-icon">📖</span><span class="action-label">README Generator</span></button>
      <button class="action" onclick="run('autochecker.editPackageScripts')"><span class="action-icon">⚙️</span><span class="action-label">Package.json Scripts</span></button>
      <button class="action" onclick="run('autochecker.checkOutdated')"><span class="action-icon">🔄</span><span class="action-label">Check Outdated Deps</span></button>
      <button class="action" onclick="run('autochecker.generateEnv')"><span class="action-icon">🔑</span><span class="action-label">.env Generator</span></button>
    </div></div>
  </div>

<script>
  const vscodeApi = acquireVsCodeApi();
  function run(cmd) { vscodeApi.postMessage({ type: 'runCommand', command: cmd }); }
  function toggle(group, e) {
    if (e.target.closest('.action, .action-primary')) return;
    group.classList.toggle('open');
  }
</script>
</body>
</html>`;
  }
}

// ── Extension Lifecycle ──────────────────────────────────────────────────────

function activate(context) {
  // Sidebar
  const sidebarProvider = new SidebarProvider(context);
  context.subscriptions.push(
    vscode.window.registerWebviewViewProvider('autochecker.sidebarView', sidebarProvider),
  );

  context.subscriptions.push(
    // Init commands
    vscode.commands.registerCommand('autochecker.initFullArchitecture', initFullArchitecture),
    vscode.commands.registerCommand('autochecker.initConfigs', initConfigs),
    vscode.commands.registerCommand('autochecker.initScaffold', initScaffold),
    // Live server
    vscode.commands.registerCommand('autochecker.startLiveServer', startLiveServer),
    vscode.commands.registerCommand('autochecker.stopLiveServer', stopLiveServer),
    // Turbo console log
    vscode.commands.registerCommand('autochecker.insertLog', () => insertLog('console.log')),
    vscode.commands.registerCommand('autochecker.insertWarn', () => insertLog('console.warn')),
    vscode.commands.registerCommand('autochecker.insertError', () => insertLog('console.error')),
    vscode.commands.registerCommand('autochecker.insertInfo', () => insertLog('console.info')),
    vscode.commands.registerCommand('autochecker.insertDebug', () => insertLog('console.debug')),
    vscode.commands.registerCommand('autochecker.insertTable', () => insertLog('console.table')),
    vscode.commands.registerCommand('autochecker.commentAllLogs', commentAllLogs),
    vscode.commands.registerCommand('autochecker.uncommentAllLogs', uncommentAllLogs),
    vscode.commands.registerCommand('autochecker.deleteAllLogs', deleteAllLogs),
    // Utilities
    vscode.commands.registerCommand('autochecker.colorPicker', openColorPicker),
    vscode.commands.registerCommand('autochecker.generateEnv', generateEnv),
    vscode.commands.registerCommand('autochecker.packageInstall', packageQuickInstall),
    vscode.commands.registerCommand('autochecker.generateComponent', generateComponent),
    vscode.commands.registerCommand('autochecker.projectTree', generateProjectTree),
    // Code Quality
    vscode.commands.registerCommand('autochecker.sortImports', sortImports),
    vscode.commands.registerCommand('autochecker.removeUnusedImports', removeUnusedImports),
    vscode.commands.registerCommand('autochecker.scanTodos', scanTodos),
    vscode.commands.registerCommand('autochecker.scanDeadCode', scanDeadCode),
    vscode.commands.registerCommand('autochecker.findDuplicates', findDuplicates),
    // Code Generation
    vscode.commands.registerCommand('autochecker.generateHook', generateHook),
    vscode.commands.registerCommand('autochecker.generateApiRoute', generateApiRoute),
    vscode.commands.registerCommand('autochecker.jsonToInterface', jsonToInterface),
    vscode.commands.registerCommand('autochecker.generateBarrelExport', generateBarrelExport),
    // Frontend Tools
    vscode.commands.registerCommand('autochecker.sortTailwind', sortTailwindClasses),
    vscode.commands.registerCommand('autochecker.cssToTailwind', cssToTailwind),
    vscode.commands.registerCommand('autochecker.breakpoints', showBreakpoints),
    vscode.commands.registerCommand('autochecker.fontPreview', fontPreview),
    vscode.commands.registerCommand('autochecker.cssUnitConverter', cssUnitConverter),
    // Formatters
    vscode.commands.registerCommand('autochecker.jsonFormat', jsonFormat),
    vscode.commands.registerCommand('autochecker.decodeJwt', decodeJwt),
    vscode.commands.registerCommand('autochecker.convertCase', convertCase),
    vscode.commands.registerCommand('autochecker.generatePassword', generatePassword),
    // DX
    vscode.commands.registerCommand('autochecker.wrapTryCatch', wrapTryCatch),
    vscode.commands.registerCommand('autochecker.commentHeader', commentHeader),
    vscode.commands.registerCommand('autochecker.addBookmark', addBookmark),
    vscode.commands.registerCommand('autochecker.showBookmarks', showBookmarks),
    vscode.commands.registerCommand('autochecker.clearBookmarks', clearBookmarks),
    vscode.commands.registerCommand('autochecker.saveSnippet', saveSnippet),
    vscode.commands.registerCommand('autochecker.insertSnippet', insertSnippet),
    vscode.commands.registerCommand('autochecker.killPort', killPort),
    vscode.commands.registerCommand('autochecker.checkOutdated', checkOutdated),
    vscode.commands.registerCommand('autochecker.fileScaffolder', fileScaffolder),
    // Project
    vscode.commands.registerCommand('autochecker.generateReadme', generateReadme),
    vscode.commands.registerCommand('autochecker.editPackageScripts', editPackageScripts),
    // HTTP Client
    vscode.commands.registerCommand('autochecker.openHttpClient', () => openHttpClient(context)),
  );
}

function deactivate() {
  stopLiveServer();
}

module.exports = { activate, deactivate };
