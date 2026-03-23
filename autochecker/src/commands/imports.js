// filepath: src/commands/imports.js

const vscode = require('vscode');

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

module.exports = { sortImports, removeUnusedImports };
