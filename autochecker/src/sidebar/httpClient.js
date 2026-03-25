// filepath: src/sidebar/httpClient.js

const vscode = require('vscode');
const fs = require('fs');
const path = require('path');
const http = require('http');
const https = require('https');
const { getRoot, ensureDirSync } = require('../utils/helpers');

// ── HTTP Client (Postman-style) ─────────────────────────────────────────────

let httpClientPanel = null;
let requestHistory = [];
const HISTORY_FILE = '.vscode/autochecker-history.json';

const MAX_HISTORY_ENTRIES = 50;
const MAX_RESPONSE_BODY_BYTES = 10 * 1024 * 1024; // 10 MB

function loadHistory(rootDir) {
  if (!rootDir) return [];
  const histPath = path.join(rootDir, HISTORY_FILE);
  try {
    if (fs.existsSync(histPath)) {
      const raw = JSON.parse(fs.readFileSync(histPath, 'utf-8'));
      // Guard against a manually inflated history file
      if (!Array.isArray(raw)) return [];
      return raw.slice(-MAX_HISTORY_ENTRIES);
    }
  } catch (_) {}
  return [];
}

function saveHistory(rootDir) {
  if (!rootDir) return;
  const histPath = path.join(rootDir, HISTORY_FILE);
  ensureDirSync(path.dirname(histPath));
  const trimmed = requestHistory.slice(-MAX_HISTORY_ENTRIES);
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
            let receivedBytes = 0;
            let bodyLimitExceeded = false;

            res.on('data', (chunk) => {
              receivedBytes += chunk.length;
              if (receivedBytes > MAX_RESPONSE_BODY_BYTES) {
                bodyLimitExceeded = true;
                req.destroy();
                httpClientPanel.webview.postMessage({
                  type: 'error',
                  message: `Response body exceeds ${MAX_RESPONSE_BODY_BYTES / 1024 / 1024} MB limit.`,
                });
                return;
              }
              chunks.push(chunk);
            });

            res.on('end', () => {
              if (bodyLimitExceeded) return;
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

              // Save to history — strip Authorization header to avoid
              // storing Bearer tokens / API keys in plaintext on disk.
              const safeHeaders = { ...msg.headers };
              delete safeHeaders['Authorization'];
              delete safeHeaders['authorization'];
              const entry = {
                method: msg.method,
                url: msg.url,
                headers: safeHeaders,
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

module.exports = { getWebviewContent, openHttpClient };
