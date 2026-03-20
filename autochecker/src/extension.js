// filepath: src/extension.js

const vscode = require('vscode');
const fs = require('fs');
const path = require('path');

// ── Config Data ──────────────────────────────────────────────────────────────

const PRETTIERRC = JSON.stringify(
  {
    semi: true,
    trailingComma: 'all',
    singleQuote: true,
    printWidth: 100,
    tabWidth: 2,
    singleAttributePerLine: true,
    plugins: ['prettier-plugin-tailwindcss', '@trivago/prettier-plugin-sort-imports'],
    importOrder: ['^@/(.*)$', '^[./]'],
    importOrderSeparation: true,
    importOrderSortSpecifiers: true,
  },
  null,
  2
);

const ESLINTRC = JSON.stringify(
  {
    extends: [
      'next/core-web-vitals',
      'plugin:@typescript-eslint/recommended',
      'plugin:prettier/recommended',
    ],
    rules: {
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/no-unused-vars': 'warn',
      'no-console': ['warn', { allow: ['warn', 'error'] }],
      'react/self-closing-comp': 'error',
      'import/order': 'off',
    },
  },
  null,
  2
);

const GITIGNORE = `# Dependencies
node_modules/
/.pnp
.pnp.js

# Testing
/coverage

# Next.js
/.next/
/out/

# Production
/build
/dist

# Debug
npm-debug.log*
yarn-debug.log*
yarn-error.log*
.pnpm-debug.log*

# Env
.env*
.env.local

# OS
.DS_Store
Thumbs.db

# Custom
arch_swiss_knife.py
`;

const VSCODE_SETTINGS = JSON.stringify(
  {
    'editor.formatOnSave': true,
    'editor.defaultFormatter': 'esbenp.prettier-vscode',
    'editor.codeActionsOnSave': {
      'source.fixAll.eslint': 'explicit',
    },
    'tailwindCSS.emmetCompletions': true,
    'editor.inlineSuggest.enabled': true,
  },
  null,
  2
);

const CODE_SNIPPETS = JSON.stringify(
  {
    'React Architecture Component': {
      prefix: 'rafc',
      body: [
        "import { FC } from 'react';",
        "import { cn } from '@/utils/cn';",
        '',
        'interface ${1:${TM_FILENAME_BASE}}Props {',
        '  className?: string;',
        '}',
        '',
        'export const ${1:${TM_FILENAME_BASE}}: FC<${1:${TM_FILENAME_BASE}}Props> = ({ className }) => {',
        '  return (',
        "    <div className={cn('$2', className)}>",
        '      $0',
        '    </div>',
        '  );',
        '};',
      ],
      description: 'Base FAANG-style React Component',
    },
  },
  null,
  2
);

// ── File entries ─────────────────────────────────────────────────────────────

const FILES = [
  { relativePath: '.prettierrc', content: PRETTIERRC },
  { relativePath: '.eslintrc.json', content: ESLINTRC },
  { relativePath: '.gitignore', content: GITIGNORE },
  { relativePath: path.join('.vscode', 'settings.json'), content: VSCODE_SETTINGS },
  { relativePath: path.join('.vscode', 'shtyka.code-snippets'), content: CODE_SNIPPETS },
];

// ── Helpers ──────────────────────────────────────────────────────────────────

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

// ── Command Handler ──────────────────────────────────────────────────────────

async function initFullArchitecture() {
  const workspaceFolders = vscode.workspace.workspaceFolders;

  if (!workspaceFolders || workspaceFolders.length === 0) {
    vscode.window.showErrorMessage(
      'AutoChecker: No workspace folder is open. Please open a folder first.'
    );
    return;
  }

  const rootDir = workspaceFolders[0].uri.fsPath;

  const confirm = await vscode.window.showWarningMessage(
    'AutoChecker: This will create config files in your workspace root. Existing files will be overwritten.',
    { modal: true },
    'Proceed'
  );

  if (confirm !== 'Proceed') {
    return;
  }

  try {
    for (const entry of FILES) {
      writeFileEntry(rootDir, entry);
    }

    vscode.window.showInformationMessage(
      `AutoChecker: Successfully created ${FILES.length} config files! 🚀`
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    vscode.window.showErrorMessage(`AutoChecker: Failed to create files — ${message}`);
  }
}

// ── Extension Lifecycle ──────────────────────────────────────────────────────

function activate(context) {
  const disposable = vscode.commands.registerCommand(
    'autochecker.initFullArchitecture',
    initFullArchitecture
  );

  context.subscriptions.push(disposable);
}

function deactivate() {}

module.exports = { activate, deactivate };
