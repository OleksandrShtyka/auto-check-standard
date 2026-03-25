// filepath: src/commands/stringTools.js

const vscode = require('vscode');

// ── String Case Converter ───────────────────────────────────────────────────

async function convertCase() {
  const editor = vscode.window.activeTextEditor;
  if (!editor || editor.selection.isEmpty) {
    vscode.window.showWarningMessage('AutoChecker: Select text first.');
    return;
  }

  const text = editor.document.getText(editor.selection);
  // Split by common separators
  const words = text
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/[-_./\\]/g, ' ')
    .split(/\s+/)
    .map((w) => w.toLowerCase())
    .filter(Boolean);

  const cases = [
    {
      label: 'camelCase',
      value: words.map((w, i) => (i === 0 ? w : w[0].toUpperCase() + w.slice(1))).join(''),
    },
    { label: 'PascalCase', value: words.map((w) => w[0].toUpperCase() + w.slice(1)).join('') },
    { label: 'snake_case', value: words.join('_') },
    { label: 'kebab-case', value: words.join('-') },
    { label: 'SCREAMING_SNAKE', value: words.join('_').toUpperCase() },
    { label: 'dot.case', value: words.join('.') },
    { label: 'path/case', value: words.join('/') },
  ];

  const picked = await vscode.window.showQuickPick(cases, { placeHolder: `Convert "${text}"` });
  if (picked) {
    await editor.edit((eb) => eb.replace(editor.selection, picked.value));
  }
}

// ── Password/Secret Generator ───────────────────────────────────────────────

async function generatePassword() {
  const length = await vscode.window.showQuickPick(['16', '32', '48', '64', '128'], {
    placeHolder: 'Secret length',
  });
  if (!length) return;

  const crypto = require('crypto');
  const format = await vscode.window.showQuickPick(
    ['Alphanumeric (a-zA-Z0-9)', 'Hex (0-9a-f)', 'Base64', 'URL-safe Base64'],
    { placeHolder: 'Format' },
  );
  if (!format) return;

  let secret;
  const len = parseInt(length);
  if (format.includes('Hex')) {
    secret = crypto
      .randomBytes(Math.ceil(len / 2))
      .toString('hex')
      .slice(0, len);
  } else if (format.includes('URL')) {
    secret = crypto.randomBytes(len).toString('base64url').slice(0, len);
  } else if (format.includes('Base64')) {
    secret = crypto.randomBytes(len).toString('base64').slice(0, len);
  } else {
    const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    // Rejection sampling: discard bytes that would cause modulo bias.
    // 256 % 62 = 8, so bytes 248-255 are skipped to ensure uniform distribution.
    const limit = 256 - (256 % chars.length);
    const result = [];
    while (result.length < len) {
      const batch = crypto.randomBytes(len * 2);
      for (const b of batch) {
        if (b < limit) {
          result.push(chars[b % chars.length]);
          if (result.length === len) break;
        }
      }
    }
    secret = result.join('');
  }

  await vscode.env.clipboard.writeText(secret);

  const editor = vscode.window.activeTextEditor;
  if (editor) {
    const pos = editor.selection.active;
    await editor.edit((eb) => eb.insert(pos, secret));
    vscode.window.showInformationMessage(`AutoChecker: Inserted ${len}-char secret`);
  } else {
    vscode.window.showInformationMessage(`AutoChecker: Copied ${len}-char secret to clipboard`);
  }
}

module.exports = { convertCase, generatePassword };
