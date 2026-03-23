// filepath: src/commands/snippets.js

const vscode = require('vscode');
const fs = require('fs');
const path = require('path');
const { getRoot, ensureDirSync } = require('../utils/helpers');

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

module.exports = { loadSnippets, saveSnippets, saveSnippet, insertSnippet };
