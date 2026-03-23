// filepath: src/commands/scanner.js

const vscode = require('vscode');
const fs = require('fs');
const path = require('path');
const { getRoot } = require('../utils/helpers');

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

module.exports = { scanTodos, scanDeadCode, findDuplicates };
