// filepath: src/commands/pythonTools.js

const vscode = require('vscode');
const fs = require('fs');
const path = require('path');
const { getRoot } = require('../utils/helpers');

// ── Security Helpers ─────────────────────────────────────────────────────────

/** Validates a string as a safe Python identifier. */
function isPythonIdentifier(s) {
  return /^[a-zA-Z_][a-zA-Z0-9_]*$/.test(s);
}

/** Escapes double-quote characters for safe shell interpolation inside "…". */
function escapeShellArg(s) {
  return s.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
}

/** Validates a venv directory name: only word chars, dots, hyphens, no slashes. */
function isSafeVenvName(s) {
  return /^[a-zA-Z0-9._-]+$/.test(s) && !s.includes('..') && s.length <= 64;
}

/** Escapes a string for safe interpolation inside Python double-quoted strings. */
function escapePythonStr(s) {
  return s.replace(/\\/g, '\\\\').replace(/"/g, '\\"').replace(/\n/g, '\\n').replace(/\r/g, '');
}

// ── Insert Print Statement ───────────────────────────────────────────────────

async function insertPrint() {
  const editor = vscode.window.activeTextEditor;
  if (!editor) return;

  const sel = editor.selection;
  const raw = editor.document.getText(sel).trim() || 'value';
  // Only use the selection as a variable reference if it's a simple identifier.
  // Otherwise fall back to a safe placeholder to avoid generating broken code.
  const word = isPythonIdentifier(raw) ? raw : 'value';
  const pos = new vscode.Position(sel.end.line + 1, 0);
  const indent = editor.document.lineAt(sel.end.line).text.match(/^(\s*)/)[1];

  await editor.edit((eb) =>
    eb.insert(pos, `${indent}print(f"[DEBUG] ${word} =", ${word})\n`),
  );
}

// ── Wrap in Try/Except ───────────────────────────────────────────────────────

async function wrapTryExcept() {
  const editor = vscode.window.activeTextEditor;
  if (!editor || editor.selection.isEmpty) {
    vscode.window.showWarningMessage('AutoChecker: Select code to wrap.');
    return;
  }

  const sel = editor.selection;
  const text = editor.document.getText(sel);
  const indent = editor.document.lineAt(sel.start.line).text.match(/^(\s*)/)[1];
  const inner = text
    .split('\n')
    .map((l) => `${indent}    ${l}`)
    .join('\n');

  const wrapped =
    `${indent}try:\n${inner}\n` +
    `${indent}except Exception as e:\n${indent}    print(f"[ERROR] {e}")\n` +
    `${indent}    raise`;

  await editor.edit((eb) => eb.replace(sel, wrapped));
}

// ── Generate Python Class ────────────────────────────────────────────────────

async function generatePythonClass() {
  const editor = vscode.window.activeTextEditor;
  if (!editor) return;

  const name = await vscode.window.showInputBox({
    prompt: 'Class name',
    placeHolder: 'MyClass',
    validateInput: (v) =>
      isPythonIdentifier(v) ? null : 'Must be a valid Python identifier (letters, digits, underscore)',
  });
  if (!name) return;

  const kind = await vscode.window.showQuickPick(
    ['Regular class', 'Dataclass', 'Abstract class'],
    { placeHolder: 'Class type' },
  );
  if (!kind) return;

  let snippet = '';
  const pos = editor.selection.active;

  if (kind === 'Dataclass') {
    snippet =
      `from dataclasses import dataclass, field\n\n` +
      `\n@dataclass\nclass ${name}:\n` +
      `    name: str = ""\n` +
      `    value: int = 0\n\n` +
      `    def __post_init__(self) -> None:\n` +
      `        pass\n`;
  } else if (kind === 'Abstract class') {
    snippet =
      `from abc import ABC, abstractmethod\n\n` +
      `\nclass ${name}(ABC):\n` +
      `    def __init__(self) -> None:\n` +
      `        pass\n\n` +
      `    @abstractmethod\n` +
      `    def execute(self) -> None:\n` +
      `        ...\n`;
  } else {
    snippet =
      `\nclass ${name}:\n` +
      `    def __init__(self) -> None:\n` +
      `        pass\n\n` +
      `    def __repr__(self) -> str:\n` +
      `        return f"${name}()"\n\n` +
      `    def __str__(self) -> str:\n` +
      `        return f"${name}"\n`;
  }

  await editor.edit((eb) => eb.insert(new vscode.Position(pos.line, 0), snippet));
}

// ── Generate Typed Function ──────────────────────────────────────────────────

async function generatePythonFunction() {
  const editor = vscode.window.activeTextEditor;
  if (!editor) return;

  const name = await vscode.window.showInputBox({
    prompt: 'Function name',
    placeHolder: 'my_function',
    validateInput: (v) =>
      isPythonIdentifier(v) ? null : 'Must be a valid Python identifier (letters, digits, underscore)',
  });
  if (!name) return;

  const isAsync = await vscode.window.showQuickPick(['sync', 'async'], {
    placeHolder: 'Sync or async?',
  });
  if (!isAsync) return;

  const pos = editor.selection.active;
  const indent = editor.document.lineAt(pos.line).text.match(/^(\s*)/)[1];
  const prefix = isAsync === 'async' ? 'async def' : 'def';

  const snippet =
    `\n${indent}${prefix} ${name}() -> None:\n` +
    `${indent}    """\n` +
    `${indent}    TODO: describe ${name}.\n` +
    `${indent}    """\n` +
    `${indent}    pass\n`;

  await editor.edit((eb) => eb.insert(new vscode.Position(pos.line, 0), snippet));
}

// ── Sort Python Imports ──────────────────────────────────────────────────────

const STDLIB_MODULES = new Set([
  'abc', 'ast', 'asyncio', 'builtins', 'collections', 'contextlib', 'copy',
  'csv', 'dataclasses', 'datetime', 'enum', 'functools', 'hashlib', 'io',
  'itertools', 'json', 'logging', 'math', 'os', 'pathlib', 'pickle', 'platform',
  'queue', 're', 'shutil', 'signal', 'socket', 'sqlite3', 'string', 'struct',
  'subprocess', 'sys', 'tempfile', 'threading', 'time', 'traceback', 'typing',
  'unittest', 'urllib', 'uuid', 'warnings', 'weakref', 'xml', 'zipfile',
]);

function getImportRoot(line) {
  const m = line.match(/^(?:import|from)\s+([\w.]+)/);
  return m ? m[1].split('.')[0] : '';
}

async function sortPythonImports() {
  const editor = vscode.window.activeTextEditor;
  if (!editor) return;

  const doc = editor.document;
  const lines = doc.getText().split('\n');

  // Collect consecutive import lines at the top (skip shebang / encoding lines)
  let start = 0;
  while (start < lines.length && /^#/.test(lines[start].trim())) start++;

  const importLines = [];
  let end = start;
  while (end < lines.length) {
    const l = lines[end];
    if (/^(import|from)\s/.test(l) || (importLines.length > 0 && l.trim() === '')) {
      importLines.push({ idx: end, text: l });
      end++;
    } else {
      break;
    }
  }

  const nonEmpty = importLines.filter((l) => l.text.trim() !== '');
  if (nonEmpty.length === 0) {
    vscode.window.showInformationMessage('AutoChecker: No imports found.');
    return;
  }

  const stdlib = nonEmpty.filter((l) => STDLIB_MODULES.has(getImportRoot(l.text)));
  const thirdParty = nonEmpty.filter((l) => !STDLIB_MODULES.has(getImportRoot(l.text)) && !l.text.includes(' .'));
  const local = nonEmpty.filter((l) => /^from\s+\./.test(l.text));

  const sorted = [
    ...stdlib.map((l) => l.text).sort(),
    ...(stdlib.length && thirdParty.length ? [''] : []),
    ...thirdParty.map((l) => l.text).sort(),
    ...(thirdParty.length && local.length ? [''] : []),
    ...local.map((l) => l.text).sort(),
    '',
  ].join('\n');

  const range = new vscode.Range(new vscode.Position(start, 0), new vscode.Position(end, 0));
  await editor.edit((eb) => eb.replace(range, sorted + '\n'));
  vscode.window.showInformationMessage('AutoChecker: Python imports sorted.');
}

// ── Generate requirements.txt ────────────────────────────────────────────────

async function generateRequirements() {
  const rootDir = getRoot();
  if (!rootDir) return;

  const files = getAllPyFiles(rootDir);
  const imports = new Set();

  for (const file of files) {
    const content = fs.readFileSync(file, 'utf8');
    const lines = content.split('\n');
    for (const line of lines) {
      const m = line.match(/^(?:import|from)\s+([\w]+)/);
      if (m && !STDLIB_MODULES.has(m[1]) && m[1] !== '__future__') {
        imports.add(m[1].replace(/_/g, '-'));
      }
    }
  }

  if (imports.size === 0) {
    vscode.window.showInformationMessage('AutoChecker: No third-party imports found.');
    return;
  }

  const content = [...imports].sort().join('\n') + '\n';
  const reqPath = path.join(rootDir, 'requirements.txt');

  if (fs.existsSync(reqPath)) {
    const choice = await vscode.window.showQuickPick(['Overwrite', 'Cancel'], {
      placeHolder: 'requirements.txt already exists',
    });
    if (choice !== 'Overwrite') return;
  }

  fs.writeFileSync(reqPath, content);
  vscode.window.showInformationMessage(
    `AutoChecker: requirements.txt generated with ${imports.size} packages.`,
  );
  vscode.workspace.openTextDocument(reqPath).then((d) => vscode.window.showTextDocument(d));
}

function getAllPyFiles(dir, found = []) {
  const skip = new Set(['node_modules', '.git', '__pycache__', '.venv', 'venv', 'env']);
  try {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      if (skip.has(entry.name)) continue;
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) getAllPyFiles(full, found);
      else if (entry.name.endsWith('.py')) found.push(full);
    }
  } catch (err) {
    // Log permission/access errors but continue scanning other dirs.
    console.warn(`[AutoChecker] getAllPyFiles skipped "${dir}":`, err.message);
  }
  return found;
}

// ── Create Virtual Environment ───────────────────────────────────────────────

async function createVenv() {
  const rootDir = getRoot();
  if (!rootDir) return;

  const name = await vscode.window.showInputBox({
    prompt: 'Virtual environment name',
    placeHolder: '.venv',
    value: '.venv',
    validateInput: (v) =>
      isSafeVenvName(v) ? null : 'Use only letters, digits, dots, hyphens, underscores (no slashes)',
  });
  if (!name) return;

  // Guard even if validateInput is bypassed: reject unsafe names before shell use.
  if (!isSafeVenvName(name)) {
    vscode.window.showErrorMessage('AutoChecker: Invalid virtual environment name.');
    return;
  }

  const terminal = vscode.window.createTerminal('AutoChecker: venv');
  terminal.show();
  // Both rootDir and name are quoted; name is additionally restricted to safe chars.
  terminal.sendText(`cd "${escapeShellArg(rootDir)}" && python3 -m venv "${name}"`);
  vscode.window.showInformationMessage(`AutoChecker: Creating venv "${name}"...`);
}

// ── Generate Flask/FastAPI Route ─────────────────────────────────────────────

async function generatePythonRoute() {
  const editor = vscode.window.activeTextEditor;
  if (!editor) return;

  const framework = await vscode.window.showQuickPick(['Flask', 'FastAPI'], {
    placeHolder: 'Framework',
  });
  if (!framework) return;

  const routePath = await vscode.window.showInputBox({
    prompt: 'Route path',
    placeHolder: '/items/{id}',
    value: '/items',
  });
  if (!routePath) return;

  const methods = await vscode.window.showQuickPick(
    ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
    { placeHolder: 'HTTP method', canPickMany: true },
  );
  if (!methods || methods.length === 0) return;

  const pos = editor.selection.active;
  const indent = editor.document.lineAt(pos.line).text.match(/^(\s*)/)[1];

  let snippet = '';

  // Escape the route path so it cannot break out of the Python string literal.
  const safeRoutePath = escapePythonStr(routePath);

  if (framework === 'FastAPI') {
    const paramName = routePath.match(/\{(\w+)\}/)?.[1];
    for (const method of methods) {
      const decorator = method.toLowerCase();
      const hasParam = !!paramName;
      // Build function suffix from safe chars only.
      const funcSuffix =
        routePath.replace(/\//g, '_').replace(/[^a-zA-Z0-9_]/g, '').replace(/^_/, '') || 'root';
      const funcName = `${decorator}_${funcSuffix}`;
      const paramStr = hasParam ? `${paramName}: int` : '';
      snippet +=
        `\n${indent}@router.${decorator}("${safeRoutePath}")\n` +
        `${indent}async def ${funcName}(${paramStr}) -> dict:\n` +
        `${indent}    return {"message": "ok"}\n`;
    }
  } else {
    const methodsStr = methods.map((m) => `"${m}"`).join(', ');
    const funcName =
      routePath.replace(/\//g, '_').replace(/[^a-zA-Z0-9_]/g, '').replace(/^_/, '') || 'index';
    snippet =
      `\n${indent}@app.route("${safeRoutePath}", methods=[${methodsStr}])\n` +
      `${indent}def ${funcName}():\n` +
      `${indent}    return jsonify({"message": "ok"})\n`;
  }

  await editor.edit((eb) => eb.insert(new vscode.Position(pos.line, 0), snippet));
}

// ── Scan TODO/FIXME (Python) ─────────────────────────────────────────────────

async function scanPythonTodos() {
  const rootDir = getRoot();
  if (!rootDir) return;

  const tags = ['TODO', 'FIXME', 'HACK', 'BUG', 'NOTE', 'WARN'];
  const files = getAllPyFiles(rootDir);
  const results = [];

  for (const file of files) {
    const lines = fs.readFileSync(file, 'utf8').split('\n');
    for (let i = 0; i < lines.length; i++) {
      for (const tag of tags) {
        if (lines[i].includes(tag)) {
          results.push({
            label: `[${tag}] ${lines[i].trim().slice(0, 60)}`,
            description: `${path.relative(rootDir, file)}:${i + 1}`,
            file,
            line: i,
          });
        }
      }
    }
  }

  if (results.length === 0) {
    vscode.window.showInformationMessage('AutoChecker: No TODOs found in Python files.');
    return;
  }

  const pick = await vscode.window.showQuickPick(results, {
    placeHolder: `Found ${results.length} TODO(s) in Python files`,
  });
  if (!pick) return;

  const doc = await vscode.workspace.openTextDocument(pick.file);
  const ed = await vscode.window.showTextDocument(doc);
  const pos = new vscode.Position(pick.line, 0);
  ed.selection = new vscode.Selection(pos, pos);
  ed.revealRange(new vscode.Range(pos, pos));
}

// ── Generate __init__.py ─────────────────────────────────────────────────────

async function generateInitPy() {
  const editor = vscode.window.activeTextEditor;
  const rootDir = getRoot();
  if (!rootDir) return;

  let targetDir = rootDir;

  if (editor) {
    const docDir = path.dirname(editor.document.uri.fsPath);
    const choice = await vscode.window.showQuickPick(
      [
        { label: 'Current file directory', value: docDir },
        { label: 'Workspace root', value: rootDir },
      ],
      { placeHolder: 'Where to create __init__.py?' },
    );
    if (!choice) return;
    targetDir = choice.value;
  }

  const initPath = path.join(targetDir, '__init__.py');
  if (fs.existsSync(initPath)) {
    vscode.window.showInformationMessage('AutoChecker: __init__.py already exists.');
    return;
  }

  fs.writeFileSync(initPath, '');
  vscode.window.showInformationMessage(`AutoChecker: Created __init__.py in ${path.relative(rootDir, targetDir) || '.'}`);
  vscode.workspace.openTextDocument(initPath).then((d) => vscode.window.showTextDocument(d));
}

// ── Run Python File ──────────────────────────────────────────────────────────

async function runPythonFile() {
  const editor = vscode.window.activeTextEditor;
  if (!editor) {
    vscode.window.showWarningMessage('AutoChecker: Open a Python file first.');
    return;
  }

  const filePath = editor.document.uri.fsPath;
  if (!filePath.endsWith('.py')) {
    vscode.window.showWarningMessage('AutoChecker: Active file is not a Python file.');
    return;
  }

  await editor.document.save();
  const terminal = vscode.window.createTerminal('AutoChecker: Python');
  terminal.show();
  // Escape the path for safe shell interpolation inside double quotes.
  terminal.sendText(`python3 "${escapeShellArg(filePath)}"`);
}

module.exports = {
  insertPrint,
  wrapTryExcept,
  generatePythonClass,
  generatePythonFunction,
  sortPythonImports,
  generateRequirements,
  createVenv,
  generatePythonRoute,
  scanPythonTodos,
  generateInitPy,
  runPythonFile,
};
