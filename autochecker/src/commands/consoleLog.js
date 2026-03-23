// filepath: src/commands/consoleLog.js

const vscode = require('vscode');
const path = require('path');

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

module.exports = { getSelectedVariable, getLogLine, detectIndentation, insertLog, commentAllLogs, uncommentAllLogs, deleteAllLogs };
