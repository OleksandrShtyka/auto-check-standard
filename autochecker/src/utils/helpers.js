// filepath: src/utils/helpers.js

const vscode = require('vscode');
const fs = require('fs');
const path = require('path');

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

module.exports = { getRoot, ensureDirSync, writeFileEntry, writeEntries };
