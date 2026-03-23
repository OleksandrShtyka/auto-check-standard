// filepath: src/sidebar/SidebarProvider.js

const vscode = require('vscode');

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
  *, *::before, *::after { margin: 0; padding: 0; box-sizing: border-box; }

  body {
    font-family: var(--vscode-font-family);
    font-size: 13px;
    color: var(--vscode-foreground);
    background: var(--vscode-sideBar-background);
    line-height: 1.4;
    overflow-x: hidden;
  }

  /* ── Header ── */
  .header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 10px 12px 9px;
    border-bottom: 1px solid var(--vscode-panel-border, rgba(255,255,255,0.07));
  }
  .header-brand { display: flex; align-items: center; gap: 7px; }
  .header-logo {
    width: 20px; height: 20px;
    background: var(--vscode-button-background);
    border-radius: 4px;
    display: flex; align-items: center; justify-content: center;
    font-size: 11px; flex-shrink: 0;
  }
  .header-name {
    font-size: 11px; font-weight: 700;
    text-transform: uppercase; letter-spacing: 0.8px;
  }
  .header-version {
    font-size: 10px; opacity: 0.35; font-weight: 400; margin-left: 1px;
  }

  /* ── Search ── */
  .search-wrap {
    position: relative;
    padding: 7px 10px;
    border-bottom: 1px solid var(--vscode-panel-border, rgba(255,255,255,0.07));
  }
  .search-icon {
    position: absolute; left: 18px; top: 50%; transform: translateY(-50%);
    opacity: 0.35; font-size: 12px; pointer-events: none;
  }
  .search {
    width: 100%;
    background: var(--vscode-input-background);
    border: 1px solid var(--vscode-input-border, transparent);
    color: var(--vscode-input-foreground);
    border-radius: 4px;
    padding: 4px 8px 4px 26px;
    font-size: 12px; font-family: inherit;
    outline: none;
  }
  .search::placeholder { color: var(--vscode-input-placeholderForeground); }
  .search:focus { border-color: var(--vscode-focusBorder); }

  /* ── Quick actions ── */
  .quick {
    display: flex; gap: 6px;
    padding: 8px 10px;
    border-bottom: 1px solid var(--vscode-panel-border, rgba(255,255,255,0.07));
  }
  .btn-primary {
    flex: 1;
    background: var(--vscode-button-background);
    color: var(--vscode-button-foreground);
    border: none; border-radius: 3px;
    padding: 5px 8px;
    font-size: 11px; font-weight: 600; font-family: inherit;
    cursor: pointer;
    display: flex; align-items: center; justify-content: center; gap: 5px;
    transition: background 0.1s;
  }
  .btn-primary:hover { background: var(--vscode-button-hoverBackground); }
  .btn-secondary {
    background: var(--vscode-button-secondaryBackground, rgba(255,255,255,0.07));
    color: var(--vscode-button-secondaryForeground, var(--vscode-foreground));
    border: none; border-radius: 3px;
    padding: 5px 10px;
    font-size: 11px; font-family: inherit;
    cursor: pointer;
    display: flex; align-items: center; gap: 5px;
    white-space: nowrap;
    transition: background 0.1s;
  }
  .btn-secondary:hover { background: var(--vscode-button-secondaryHoverBackground, rgba(255,255,255,0.12)); }

  /* ── Accordion groups ── */
  .group {
    border-bottom: 1px solid var(--vscode-panel-border, rgba(255,255,255,0.06));
  }
  .group-header {
    display: flex; align-items: center; gap: 6px;
    padding: 6px 10px;
    cursor: pointer; user-select: none;
    font-size: 11px; font-weight: 600;
    text-transform: uppercase; letter-spacing: 0.5px;
    transition: background 0.08s;
  }
  .group-header:hover { background: var(--vscode-list-hoverBackground); }
  .chevron {
    font-size: 9px; opacity: 0.45;
    transition: transform 0.18s;
  }
  .group.open .chevron { transform: rotate(90deg); }
  .group-icon { font-size: 12px; width: 16px; text-align: center; flex-shrink: 0; }
  .group-label { flex: 1; }
  .badge {
    font-size: 9px;
    background: var(--vscode-badge-background);
    color: var(--vscode-badge-foreground);
    border-radius: 8px; padding: 0 5px; line-height: 14px;
    min-width: 14px; text-align: center;
  }
  .group-body { max-height: 0; overflow: hidden; transition: max-height 0.22s ease; }
  .group.open .group-body { max-height: 700px; }
  .group-content { padding: 3px 0 6px; }

  /* ── Action rows ── */
  .action {
    display: flex; align-items: center; gap: 7px;
    width: 100%; padding: 4px 10px 4px 30px;
    background: transparent; border: none;
    color: var(--vscode-foreground);
    font-size: 12px; font-family: inherit;
    text-align: left; cursor: pointer;
    transition: background 0.08s;
  }
  .action:hover { background: var(--vscode-list-hoverBackground); }
  .action:active { background: var(--vscode-list-activeSelectionBackground); color: var(--vscode-list-activeSelectionForeground); }
  .action-icon { width: 14px; text-align: center; font-size: 11px; flex-shrink: 0; opacity: 0.6; }
  .action-label { flex: 1; }
  .action-kbd {
    font-size: 9px;
    font-family: var(--vscode-editor-font-family, monospace);
    background: var(--vscode-keybindingLabel-background, rgba(255,255,255,0.08));
    color: var(--vscode-keybindingLabel-foreground, inherit);
    border: 1px solid var(--vscode-keybindingLabel-border, rgba(255,255,255,0.14));
    border-bottom-width: 2px;
    border-radius: 3px; padding: 0 4px; line-height: 14px;
    opacity: 0.75; white-space: nowrap;
  }

  /* ── Live server status dot ── */
  .status-dot {
    width: 6px; height: 6px; border-radius: 50%; flex-shrink: 0;
    background: rgba(255,255,255,0.15);
    transition: background 0.3s, box-shadow 0.3s;
  }
  .status-dot.on {
    background: #4ec9b0;
    box-shadow: 0 0 5px #4ec9b0;
  }

  /* ── Separator ── */
  .sep {
    height: 1px;
    background: var(--vscode-panel-border, rgba(255,255,255,0.06));
    margin: 3px 10px 3px 30px;
  }

  /* ── Search states ── */
  .action.hidden { display: none !important; }
  .group.all-hidden { display: none; }
  .no-results {
    display: none; text-align: center;
    padding: 24px 16px; font-size: 12px; opacity: 0.4;
  }
  .no-results.visible { display: block; }
</style>
</head>
<body>

<div class="header">
  <div class="header-brand">
    <div class="header-logo">⚡</div>
    <span class="header-name">AutoChecker</span>
    <span class="header-version">v0.0.9</span>
  </div>
</div>

<div class="search-wrap">
  <span class="search-icon">⌕</span>
  <input class="search" type="text" placeholder="Filter commands…" oninput="filterCommands(this.value)">
</div>

<div class="quick">
  <button class="btn-primary" onclick="run('autochecker.initFullArchitecture')">
    🚀 Init Architecture
  </button>
  <button class="btn-secondary" onclick="run('autochecker.openHttpClient')">
    🌐 HTTP
  </button>
</div>

<!-- Project Setup -->
<div class="group open">
  <div class="group-header" onclick="toggle(this.parentElement, event)">
    <span class="chevron">▶</span>
    <span class="group-icon">📦</span>
    <span class="group-label">Project Setup</span>
    <span class="badge">3</span>
  </div>
  <div class="group-body"><div class="group-content">
    <button class="action" data-label="full architecture" onclick="run('autochecker.initFullArchitecture')">
      <span class="action-icon">🚀</span><span class="action-label">Full Architecture</span>
    </button>
    <button class="action" data-label="configs only" onclick="run('autochecker.initConfigs')">
      <span class="action-icon">⚙</span><span class="action-label">Configs Only</span>
    </button>
    <button class="action" data-label="scaffold only" onclick="run('autochecker.initScaffold')">
      <span class="action-icon">📁</span><span class="action-label">Scaffold Only</span>
    </button>
  </div></div>
</div>

<!-- Live Server -->
<div class="group">
  <div class="group-header" onclick="toggle(this.parentElement, event)">
    <span class="chevron">▶</span>
    <span class="group-icon">🖥</span>
    <span class="group-label">Live Server</span>
    <span class="status-dot" id="server-dot"></span>
  </div>
  <div class="group-body"><div class="group-content">
    <button class="action" data-label="start server live" onclick="run('autochecker.startLiveServer')">
      <span class="action-icon">▶</span><span class="action-label">Start</span><span class="action-kbd">:5500</span>
    </button>
    <button class="action" data-label="stop server live" onclick="run('autochecker.stopLiveServer')">
      <span class="action-icon">⏹</span><span class="action-label">Stop</span>
    </button>
  </div></div>
</div>

<!-- Console Logs -->
<div class="group">
  <div class="group-header" onclick="toggle(this.parentElement, event)">
    <span class="chevron">▶</span>
    <span class="group-icon">📋</span>
    <span class="group-label">Console Logs</span>
    <span class="badge">9</span>
  </div>
  <div class="group-body"><div class="group-content">
    <button class="action" data-label="console.log insert" onclick="run('autochecker.insertLog')">
      <span class="action-icon">·</span><span class="action-label">console.log</span><span class="action-kbd">⌘⇧L</span>
    </button>
    <button class="action" data-label="console.warn insert" onclick="run('autochecker.insertWarn')">
      <span class="action-icon">·</span><span class="action-label">console.warn</span><span class="action-kbd">⌘⇧W</span>
    </button>
    <button class="action" data-label="console.error insert" onclick="run('autochecker.insertError')">
      <span class="action-icon">·</span><span class="action-label">console.error</span><span class="action-kbd">⌘⇧E</span>
    </button>
    <button class="action" data-label="console.info insert" onclick="run('autochecker.insertInfo')">
      <span class="action-icon">·</span><span class="action-label">console.info</span>
    </button>
    <button class="action" data-label="console.debug insert" onclick="run('autochecker.insertDebug')">
      <span class="action-icon">·</span><span class="action-label">console.debug</span>
    </button>
    <button class="action" data-label="console.table insert" onclick="run('autochecker.insertTable')">
      <span class="action-icon">·</span><span class="action-label">console.table</span>
    </button>
    <div class="sep"></div>
    <button class="action" data-label="comment all logs" onclick="run('autochecker.commentAllLogs')">
      <span class="action-icon">💬</span><span class="action-label">Comment All</span><span class="action-kbd">⌘⌥C</span>
    </button>
    <button class="action" data-label="uncomment all logs" onclick="run('autochecker.uncommentAllLogs')">
      <span class="action-icon">🔓</span><span class="action-label">Uncomment All</span><span class="action-kbd">⌘⌥U</span>
    </button>
    <button class="action" data-label="delete all logs" onclick="run('autochecker.deleteAllLogs')">
      <span class="action-icon">🗑</span><span class="action-label">Delete All</span><span class="action-kbd">⌘⌥D</span>
    </button>
  </div></div>
</div>

<!-- Code Quality -->
<div class="group">
  <div class="group-header" onclick="toggle(this.parentElement, event)">
    <span class="chevron">▶</span>
    <span class="group-icon">🛠</span>
    <span class="group-label">Code Quality</span>
    <span class="badge">5</span>
  </div>
  <div class="group-body"><div class="group-content">
    <button class="action" data-label="sort imports" onclick="run('autochecker.sortImports')">
      <span class="action-icon">↕</span><span class="action-label">Sort Imports</span>
    </button>
    <button class="action" data-label="remove unused imports" onclick="run('autochecker.removeUnusedImports')">
      <span class="action-icon">🧹</span><span class="action-label">Remove Unused Imports</span>
    </button>
    <button class="action" data-label="scan todos fixmes" onclick="run('autochecker.scanTodos')">
      <span class="action-icon">📌</span><span class="action-label">Scan TODOs / FIXMEs</span>
    </button>
    <button class="action" data-label="dead code scanner" onclick="run('autochecker.scanDeadCode')">
      <span class="action-icon">💀</span><span class="action-label">Dead Code Scanner</span>
    </button>
    <button class="action" data-label="find duplicates" onclick="run('autochecker.findDuplicates')">
      <span class="action-icon">⧉</span><span class="action-label">Find Duplicates</span>
    </button>
  </div></div>
</div>

<!-- Generators -->
<div class="group">
  <div class="group-header" onclick="toggle(this.parentElement, event)">
    <span class="chevron">▶</span>
    <span class="group-icon">⚡</span>
    <span class="group-label">Generators</span>
    <span class="badge">7</span>
  </div>
  <div class="group-body"><div class="group-content">
    <button class="action" data-label="react component generate" onclick="run('autochecker.generateComponent')">
      <span class="action-icon">◈</span><span class="action-label">React Component</span>
    </button>
    <button class="action" data-label="custom hook generate" onclick="run('autochecker.generateHook')">
      <span class="action-icon">🪝</span><span class="action-label">Custom Hook</span>
    </button>
    <button class="action" data-label="nextjs api route generate" onclick="run('autochecker.generateApiRoute')">
      <span class="action-icon">🛣</span><span class="action-label">Next.js API Route</span>
    </button>
    <button class="action" data-label="json typescript interface generate" onclick="run('autochecker.jsonToInterface')">
      <span class="action-icon">📐</span><span class="action-label">JSON → TS Interface</span>
    </button>
    <button class="action" data-label="barrel export index generate" onclick="run('autochecker.generateBarrelExport')">
      <span class="action-icon">📦</span><span class="action-label">Barrel Export</span>
    </button>
    <button class="action" data-label="env template generate" onclick="run('autochecker.generateEnv')">
      <span class="action-icon">🔑</span><span class="action-label">.env Template</span>
    </button>
    <button class="action" data-label="file scaffolder generate" onclick="run('autochecker.fileScaffolder')">
      <span class="action-icon">📄</span><span class="action-label">File Scaffolder</span>
    </button>
  </div></div>
</div>

<!-- Frontend -->
<div class="group">
  <div class="group-header" onclick="toggle(this.parentElement, event)">
    <span class="chevron">▶</span>
    <span class="group-icon">🎨</span>
    <span class="group-label">Frontend</span>
    <span class="badge">6</span>
  </div>
  <div class="group-body"><div class="group-content">
    <button class="action" data-label="sort tailwind classes" onclick="run('autochecker.sortTailwind')">
      <span class="action-icon">🔤</span><span class="action-label">Sort Tailwind Classes</span>
    </button>
    <button class="action" data-label="css to tailwind convert" onclick="run('autochecker.cssToTailwind')">
      <span class="action-icon">🔀</span><span class="action-label">CSS → Tailwind</span>
    </button>
    <button class="action" data-label="breakpoint viewer responsive" onclick="run('autochecker.breakpoints')">
      <span class="action-icon">📱</span><span class="action-label">Breakpoint Viewer</span>
    </button>
    <button class="action" data-label="font preview google" onclick="run('autochecker.fontPreview')">
      <span class="action-icon">Ⓣ</span><span class="action-label">Font Preview</span>
    </button>
    <button class="action" data-label="css unit converter px rem em" onclick="run('autochecker.cssUnitConverter')">
      <span class="action-icon">📏</span><span class="action-label">CSS Unit Converter</span>
    </button>
    <button class="action" data-label="color picker hex rgb hsl" onclick="run('autochecker.colorPicker')">
      <span class="action-icon">🎨</span><span class="action-label">Color Picker</span>
    </button>
  </div></div>
</div>

<!-- Utilities -->
<div class="group">
  <div class="group-header" onclick="toggle(this.parentElement, event)">
    <span class="chevron">▶</span>
    <span class="group-icon">🔧</span>
    <span class="group-label">Utilities</span>
    <span class="badge">4</span>
  </div>
  <div class="group-body"><div class="group-content">
    <button class="action" data-label="json format minify" onclick="run('autochecker.jsonFormat')">
      <span class="action-icon">{ }</span><span class="action-label">JSON Format / Minify</span>
    </button>
    <button class="action" data-label="jwt decoder" onclick="run('autochecker.decodeJwt')">
      <span class="action-icon">🔑</span><span class="action-label">JWT Decoder</span>
    </button>
    <button class="action" data-label="string case converter camel pascal snake kebab" onclick="run('autochecker.convertCase')">
      <span class="action-icon">Aa</span><span class="action-label">Case Converter</span>
    </button>
    <button class="action" data-label="password secret generator" onclick="run('autochecker.generatePassword')">
      <span class="action-icon">🔐</span><span class="action-label">Password / Secret Gen</span>
    </button>
  </div></div>
</div>

<!-- DX & Productivity -->
<div class="group">
  <div class="group-header" onclick="toggle(this.parentElement, event)">
    <span class="chevron">▶</span>
    <span class="group-icon">✦</span>
    <span class="group-label">DX & Productivity</span>
    <span class="badge">6</span>
  </div>
  <div class="group-body"><div class="group-content">
    <button class="action" data-label="wrap try catch" onclick="run('autochecker.wrapTryCatch')">
      <span class="action-icon">🛡</span><span class="action-label">Wrap in Try/Catch</span>
    </button>
    <button class="action" data-label="comment header insert" onclick="run('autochecker.commentHeader')">
      <span class="action-icon">📝</span><span class="action-label">Comment Header</span>
    </button>
    <button class="action" data-label="add bookmark" onclick="run('autochecker.addBookmark')">
      <span class="action-icon">🔖</span><span class="action-label">Add Bookmark</span>
    </button>
    <button class="action" data-label="show bookmarks" onclick="run('autochecker.showBookmarks')">
      <span class="action-icon">📚</span><span class="action-label">Show Bookmarks</span>
    </button>
    <button class="action" data-label="save snippet" onclick="run('autochecker.saveSnippet')">
      <span class="action-icon">✂</span><span class="action-label">Save Snippet</span>
    </button>
    <button class="action" data-label="insert snippet" onclick="run('autochecker.insertSnippet')">
      <span class="action-icon">📎</span><span class="action-label">Insert Snippet</span>
    </button>
  </div></div>
</div>

<!-- Project -->
<div class="group">
  <div class="group-header" onclick="toggle(this.parentElement, event)">
    <span class="chevron">▶</span>
    <span class="group-icon">📁</span>
    <span class="group-label">Project</span>
    <span class="badge">6</span>
  </div>
  <div class="group-body"><div class="group-content">
    <button class="action" data-label="readme generator" onclick="run('autochecker.generateReadme')">
      <span class="action-icon">📖</span><span class="action-label">README Generator</span>
    </button>
    <button class="action" data-label="package.json scripts edit" onclick="run('autochecker.editPackageScripts')">
      <span class="action-icon">⚙</span><span class="action-label">Package Scripts</span>
    </button>
    <button class="action" data-label="check outdated dependencies npm" onclick="run('autochecker.checkOutdated')">
      <span class="action-icon">🔄</span><span class="action-label">Check Outdated Deps</span>
    </button>
    <button class="action" data-label="package quick install npm" onclick="run('autochecker.packageInstall')">
      <span class="action-icon">⬇</span><span class="action-label">Quick Install</span>
    </button>
    <button class="action" data-label="kill port process" onclick="run('autochecker.killPort')">
      <span class="action-icon">💀</span><span class="action-label">Kill Port</span>
    </button>
    <button class="action" data-label="project tree clipboard" onclick="run('autochecker.projectTree')">
      <span class="action-icon">🌳</span><span class="action-label">Project Tree</span>
    </button>
  </div></div>
</div>

<div class="no-results" id="no-results">No commands found</div>

<script>
  const vscodeApi = acquireVsCodeApi();

  function run(cmd) {
    vscodeApi.postMessage({ type: 'runCommand', command: cmd });
  }

  function toggle(group, e) {
    if (e.target.closest('.action, .btn-primary, .btn-secondary')) return;
    group.classList.toggle('open');
  }

  function filterCommands(query) {
    const q = query.toLowerCase().trim();
    const groups = document.querySelectorAll('.group');
    let anyVisible = false;

    groups.forEach(group => {
      const btns = group.querySelectorAll('.action');
      let groupHasVisible = false;

      btns.forEach(btn => {
        const label = (btn.dataset.label || btn.textContent).toLowerCase();
        const matches = !q || label.includes(q);
        btn.classList.toggle('hidden', !matches);
        if (matches) { groupHasVisible = true; anyVisible = true; }
      });

      group.classList.toggle('all-hidden', !groupHasVisible);
      if (q && groupHasVisible) group.classList.add('open');
    });

    document.getElementById('no-results').classList.toggle('visible', q.length > 0 && !anyVisible);
  }
</script>
</body>
</html>`;
  }
}

module.exports = { SidebarProvider };
