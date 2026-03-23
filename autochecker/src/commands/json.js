// filepath: src/commands/json.js

const vscode = require('vscode');

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

module.exports = { jsonToInterface, jsonFormat, decodeJwt };
