// filepath: src/config/index.js

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
  2,
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
  2,
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
  2,
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
  2,
);

// ── Scaffold Directories ────────────────────────────────────────────────────

const SCAFFOLD_DIRS = [
  'src/components',
  'src/hooks',
  'src/utils',
  'src/styles',
  'src/lib',
  'src/types',
  'src/services',
  'src/constants',
];

const SCAFFOLD_FILES = [
  {
    relativePath: path.join('src', 'components', '.gitkeep'),
    content: '',
  },
  {
    relativePath: path.join('src', 'hooks', '.gitkeep'),
    content: '',
  },
  {
    relativePath: path.join('src', 'utils', '.gitkeep'),
    content: '',
  },
  {
    relativePath: path.join('src', 'styles', 'globals.css'),
    content: `@tailwind base;\n@tailwind components;\n@tailwind utilities;\n`,
  },
  {
    relativePath: path.join('src', 'lib', '.gitkeep'),
    content: '',
  },
  {
    relativePath: path.join('src', 'types', 'index.ts'),
    content: `// Global type definitions\nexport {};\n`,
  },
  {
    relativePath: path.join('src', 'services', '.gitkeep'),
    content: '',
  },
  {
    relativePath: path.join('src', 'constants', 'index.ts'),
    content: `// App-wide constants\nexport const APP_NAME = 'MyApp';\n`,
  },
];

// ── Config File Entries ─────────────────────────────────────────────────────

const CONFIG_FILES = [
  { relativePath: '.prettierrc', content: PRETTIERRC },
  { relativePath: '.eslintrc.json', content: ESLINTRC },
  { relativePath: '.gitignore', content: GITIGNORE },
  { relativePath: path.join('.vscode', 'settings.json'), content: VSCODE_SETTINGS },
  { relativePath: path.join('.vscode', 'shtyka.code-snippets'), content: CODE_SNIPPETS },
];

module.exports = {
  PRETTIERRC,
  ESLINTRC,
  GITIGNORE,
  VSCODE_SETTINGS,
  CODE_SNIPPETS,
  SCAFFOLD_DIRS,
  SCAFFOLD_FILES,
  CONFIG_FILES,
};
