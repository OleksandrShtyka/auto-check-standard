// filepath: src/commands/devTools.js

const vscode = require('vscode');
const fs = require('fs');
const path = require('path');
const { getRoot } = require('../utils/helpers');

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

module.exports = { killPort, checkOutdated, wrapTryCatch, commentHeader };
