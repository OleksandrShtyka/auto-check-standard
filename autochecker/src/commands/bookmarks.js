// filepath: src/commands/bookmarks.js

const vscode = require('vscode');
const path = require('path');

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

module.exports = { addBookmark, showBookmarks, clearBookmarks };
