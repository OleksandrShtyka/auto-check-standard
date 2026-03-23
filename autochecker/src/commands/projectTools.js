// filepath: src/commands/projectTools.js

const vscode = require('vscode');
const fs = require('fs');
const path = require('path');
const { getRoot } = require('../utils/helpers');

// ── README Generator ────────────────────────────────────────────────────────

async function generateReadme() {
  const rootDir = getRoot();
  if (!rootDir) return;

  const projectName = path.basename(rootDir);
  const name = await vscode.window.showInputBox({ prompt: 'Project name', value: projectName });
  if (!name) return;

  const desc =
    (await vscode.window.showInputBox({
      prompt: 'Short description',
      placeHolder: 'A modern web application built with...',
    })) || '';

  const stack = await vscode.window.showQuickPick(
    [
      'Next.js + TypeScript + Tailwind',
      'React + Vite + TypeScript',
      'Node.js + Express + TypeScript',
      'Custom',
    ],
    { placeHolder: 'Tech stack' },
  );

  const content = `# ${name}

${desc}

## Tech Stack

${
  stack === 'Custom'
    ? '- TODO: Add your stack'
    : stack
        .split(' + ')
        .map((t) => `- ${t}`)
        .join('\n')
}

## Getting Started

\`\`\`bash
# Install dependencies
npm install

# Run development server
npm run dev

# Build for production
npm run build
\`\`\`

## Project Structure

\`\`\`
${name}/
├── src/
│   ├── components/    # Reusable UI components
│   ├── hooks/         # Custom React hooks
│   ├── utils/         # Utility functions
│   ├── types/         # TypeScript type definitions
│   ├── services/      # API service layer
│   └── constants/     # App constants
├── public/            # Static assets
└── package.json
\`\`\`

## Scripts

| Command | Description |
|---------|-------------|
| \`npm run dev\` | Start development server |
| \`npm run build\` | Build for production |
| \`npm run lint\` | Run ESLint |

## Environment Variables

Copy \`.env.example\` to \`.env\` and fill in values:

\`\`\`bash
cp .env.example .env
\`\`\`

## License

MIT
`;

  const readmePath = path.join(rootDir, 'README.md');
  if (fs.existsSync(readmePath)) {
    const overwrite = await vscode.window.showWarningMessage(
      'README.md exists. Overwrite?',
      { modal: true },
      'Overwrite',
    );
    if (!overwrite) return;
  }

  fs.writeFileSync(readmePath, content, 'utf-8');
  vscode.window.showInformationMessage('AutoChecker: Created README.md 📖');
  const doc = await vscode.workspace.openTextDocument(readmePath);
  await vscode.window.showTextDocument(doc);
}

// ── Package.json Script Editor ──────────────────────────────────────────────

async function editPackageScripts() {
  const rootDir = getRoot();
  if (!rootDir) return;

  const pkgPath = path.join(rootDir, 'package.json');
  if (!fs.existsSync(pkgPath)) {
    vscode.window.showErrorMessage('AutoChecker: No package.json.');
    return;
  }

  const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf-8'));
  const scripts = pkg.scripts || {};

  const action = await vscode.window.showQuickPick(
    ['▶️ Run script', '➕ Add script', '✏️ Edit script', '🗑️ Remove script'],
    { placeHolder: `${Object.keys(scripts).length} scripts in package.json` },
  );
  if (!action) return;

  if (action.includes('Run')) {
    const names = Object.entries(scripts).map(([k, v]) => ({ label: k, description: String(v) }));
    const picked = await vscode.window.showQuickPick(names, { placeHolder: 'Pick script to run' });
    if (!picked) return;
    const terminal = vscode.window.createTerminal('AutoChecker: npm');
    terminal.show();
    terminal.sendText(`cd "${rootDir}" && npm run ${picked.label}`);
  } else if (action.includes('Add')) {
    const name = await vscode.window.showInputBox({ prompt: 'Script name', placeHolder: 'test' });
    if (!name) return;
    const cmd = await vscode.window.showInputBox({ prompt: 'Command', placeHolder: 'vitest run' });
    if (!cmd) return;
    pkg.scripts = pkg.scripts || {};
    pkg.scripts[name] = cmd;
    fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + '\n', 'utf-8');
    vscode.window.showInformationMessage(`AutoChecker: Added script "${name}"`);
  } else if (action.includes('Edit')) {
    const names = Object.keys(scripts).map((k) => ({ label: k, description: scripts[k] }));
    const picked = await vscode.window.showQuickPick(names, { placeHolder: 'Pick script to edit' });
    if (!picked) return;
    const newCmd = await vscode.window.showInputBox({
      prompt: 'New command',
      value: scripts[picked.label],
    });
    if (!newCmd) return;
    pkg.scripts[picked.label] = newCmd;
    fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + '\n', 'utf-8');
    vscode.window.showInformationMessage(`AutoChecker: Updated "${picked.label}"`);
  } else {
    const names = Object.keys(scripts).map((k) => ({ label: k, description: scripts[k] }));
    const picked = await vscode.window.showQuickPick(names, {
      placeHolder: 'Pick script to remove',
    });
    if (!picked) return;
    delete pkg.scripts[picked.label];
    fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + '\n', 'utf-8');
    vscode.window.showInformationMessage(`AutoChecker: Removed "${picked.label}"`);
  }
}

// ── .env Generator ──────────────────────────────────────────────────────────

const ENV_TEMPLATES = {
  'Next.js': `# App
NEXT_PUBLIC_APP_URL=http://localhost:3000
NEXT_PUBLIC_APP_NAME=MyApp

# Database
DATABASE_URL=postgresql://user:password@localhost:5432/mydb

# Auth
NEXTAUTH_SECRET=your-secret-here
NEXTAUTH_URL=http://localhost:3000

# API Keys
NEXT_PUBLIC_API_KEY=
API_SECRET_KEY=

# External Services
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=
SMTP_PASS=
`,
  'Vite + React': `# App
VITE_APP_TITLE=MyApp
VITE_API_URL=http://localhost:3001/api

# API Keys
VITE_PUBLIC_KEY=
VITE_GOOGLE_MAPS_KEY=

# Backend
PORT=3001
DATABASE_URL=postgresql://user:password@localhost:5432/mydb
JWT_SECRET=your-secret-here
JWT_EXPIRES_IN=7d

# Redis
REDIS_URL=redis://localhost:6379

# S3 / Storage
AWS_ACCESS_KEY_ID=
AWS_SECRET_ACCESS_KEY=
AWS_BUCKET_NAME=
`,
  'Node.js API': `# Server
PORT=3000
NODE_ENV=development

# Database
DATABASE_URL=postgresql://user:password@localhost:5432/mydb
DB_HOST=localhost
DB_PORT=5432
DB_NAME=mydb
DB_USER=user
DB_PASS=password

# Auth
JWT_SECRET=your-secret-here
JWT_EXPIRES_IN=7d

# API Keys
API_KEY=
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=

# Email
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=
SMTP_PASS=

# Redis
REDIS_URL=redis://localhost:6379

# Logging
LOG_LEVEL=debug
`,
  Minimal: `# App
PORT=3000
NODE_ENV=development

# Database
DATABASE_URL=

# Auth
JWT_SECRET=
API_KEY=
`,
};

async function generateEnv() {
  const rootDir = getRoot();
  if (!rootDir) return;

  const template = await vscode.window.showQuickPick(Object.keys(ENV_TEMPLATES), {
    placeHolder: 'Pick .env template',
  });
  if (!template) return;

  const envPath = path.join(rootDir, '.env');
  const examplePath = path.join(rootDir, '.env.example');

  if (fs.existsSync(envPath)) {
    const overwrite = await vscode.window.showWarningMessage(
      'AutoChecker: .env already exists. Overwrite?',
      { modal: true },
      'Overwrite',
      'Create .env.example only',
    );
    if (!overwrite) return;
    if (overwrite === 'Create .env.example only') {
      fs.writeFileSync(examplePath, ENV_TEMPLATES[template], 'utf-8');
      vscode.window.showInformationMessage('AutoChecker: Created .env.example');
      return;
    }
  }

  fs.writeFileSync(envPath, ENV_TEMPLATES[template], 'utf-8');
  fs.writeFileSync(examplePath, ENV_TEMPLATES[template], 'utf-8');
  vscode.window.showInformationMessage(`AutoChecker: Created .env + .env.example (${template})`);
}

// ── Package Quick Install ───────────────────────────────────────────────────

const POPULAR_PACKAGES = {
  'UI & Styling': [
    'tailwindcss',
    'postcss',
    'autoprefixer',
    'clsx',
    'tailwind-merge',
    'class-variance-authority',
    'lucide-react',
    '@radix-ui/react-dialog',
    '@radix-ui/react-dropdown-menu',
  ],
  'State & Data': [
    'axios',
    'swr',
    'react-query',
    '@tanstack/react-query',
    'zustand',
    'jotai',
    'zod',
    'react-hook-form',
  ],
  Animation: ['framer-motion', 'gsap', 'lottie-react'],
  'Dev Tools': [
    'prettier',
    'eslint',
    'typescript',
    '@types/node',
    '@types/react',
    'prettier-plugin-tailwindcss',
  ],
  'Auth & DB': ['next-auth', 'prisma', '@prisma/client', 'bcryptjs', 'jsonwebtoken'],
};

async function packageQuickInstall() {
  const rootDir = getRoot();
  if (!rootDir) return;

  // First: pick category or custom
  const categories = [...Object.keys(POPULAR_PACKAGES), '✏️ Custom package name'];
  const category = await vscode.window.showQuickPick(categories, {
    placeHolder: 'Pick category or enter custom package',
  });
  if (!category) return;

  let packages;
  if (category === '✏️ Custom package name') {
    const input = await vscode.window.showInputBox({
      prompt: 'Package names (space separated)',
      placeHolder: 'axios zod framer-motion',
    });
    if (!input) return;
    packages = [input.trim()];
  } else {
    const picked = await vscode.window.showQuickPick(
      POPULAR_PACKAGES[category].map((p) => ({ label: p, picked: false })),
      { canPickMany: true, placeHolder: `Select packages from ${category}` },
    );
    if (!picked || picked.length === 0) return;
    packages = picked.map((p) => p.label);
  }

  // Dev or regular?
  const depType = await vscode.window.showQuickPick(['dependencies', 'devDependencies'], {
    placeHolder: 'Install as...',
  });
  if (!depType) return;

  const flag = depType === 'devDependencies' ? ' -D' : '';
  const cmd = `npm install${flag} ${packages.join(' ')}`;

  const terminal = vscode.window.createTerminal('AutoChecker: npm');
  terminal.show();
  terminal.sendText(`cd "${rootDir}" && ${cmd}`);

  vscode.window.showInformationMessage(`AutoChecker: Running ${cmd}`);
}

// ── Project Tree Generator ──────────────────────────────────────────────────

const TREE_IGNORE = new Set([
  'node_modules',
  '.git',
  '.next',
  'dist',
  'build',
  '.DS_Store',
  'coverage',
  '.vscode',
  '.idea',
  '__pycache__',
  '.cache',
  '.turbo',
  '.vercel',
  '.output',
  'Thumbs.db',
]);

function buildTree(dirPath, prefix, maxDepth, currentDepth) {
  if (currentDepth >= maxDepth) return '';

  let entries;
  try {
    entries = fs.readdirSync(dirPath, { withFileTypes: true });
  } catch (_) {
    return '';
  }

  // Filter and sort: dirs first, then files
  entries = entries
    .filter((e) => !TREE_IGNORE.has(e.name) && !e.name.startsWith('.'))
    .sort((a, b) => {
      if (a.isDirectory() && !b.isDirectory()) return -1;
      if (!a.isDirectory() && b.isDirectory()) return 1;
      return a.name.localeCompare(b.name);
    });

  let result = '';
  entries.forEach((entry, i) => {
    const isLast = i === entries.length - 1;
    const connector = isLast ? '└── ' : '├── ';
    const childPrefix = isLast ? '    ' : '│   ';

    result += prefix + connector + entry.name + (entry.isDirectory() ? '/' : '') + '\n';

    if (entry.isDirectory()) {
      result += buildTree(
        path.join(dirPath, entry.name),
        prefix + childPrefix,
        maxDepth,
        currentDepth + 1,
      );
    }
  });

  return result;
}

async function generateProjectTree() {
  const rootDir = getRoot();
  if (!rootDir) return;

  const depthStr = await vscode.window.showQuickPick(
    ['2 levels', '3 levels', '4 levels', '5 levels'],
    { placeHolder: 'Tree depth' },
  );
  if (!depthStr) return;

  const maxDepth = parseInt(depthStr);
  const projectName = path.basename(rootDir);
  const tree = `${projectName}/\n` + buildTree(rootDir, '', maxDepth, 0);

  const wrapped = '```\n' + tree + '```';

  await vscode.env.clipboard.writeText(wrapped);
  vscode.window.showInformationMessage(`AutoChecker: Project tree copied to clipboard! 🌳`);
}

module.exports = { generateReadme, editPackageScripts, generateEnv, packageQuickInstall, buildTree, generateProjectTree };
