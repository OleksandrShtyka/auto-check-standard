// filepath: src/commands/generators.js

const vscode = require('vscode');
const fs = require('fs');
const path = require('path');
const { getRoot, ensureDirSync } = require('../utils/helpers');

// ── Custom Hook Generator ───────────────────────────────────────────────────

async function generateHook() {
  const rootDir = getRoot();
  if (!rootDir) return;

  const name = await vscode.window.showInputBox({
    prompt: 'Hook name (e.g. useDebounce)',
    placeHolder: 'useMyHook',
    validateInput: (v) => {
      if (!v) return 'Name is required';
      if (!v.startsWith('use')) return 'Hook must start with "use"';
      return null;
    },
  });
  if (!name) return;

  const hooksDir = path.join(rootDir, 'src', 'hooks');
  ensureDirSync(hooksDir);

  const content = `import { useState, useEffect, useCallback } from 'react';

interface ${name.charAt(0).toUpperCase() + name.slice(1)}Options {
  // Add options here
}

export function ${name}(options?: ${name.charAt(0).toUpperCase() + name.slice(1)}Options) {
  const [state, setState] = useState(null);

  useEffect(() => {
    // Effect logic here
  }, []);

  return { state };
}
`;

  const filePath = path.join(hooksDir, `${name}.ts`);
  fs.writeFileSync(filePath, content, 'utf-8');

  // Update barrel export
  const indexPath = path.join(hooksDir, 'index.ts');
  const exportLine = `export { ${name} } from './${name}';\n`;
  if (fs.existsSync(indexPath)) {
    const existing = fs.readFileSync(indexPath, 'utf-8');
    if (!existing.includes(name)) {
      fs.appendFileSync(indexPath, exportLine);
    }
  } else {
    fs.writeFileSync(indexPath, exportLine);
  }

  vscode.window.showInformationMessage(`AutoChecker: Created ${name}.ts 🪝`);
  const doc = await vscode.workspace.openTextDocument(filePath);
  await vscode.window.showTextDocument(doc);
}

// ── API Route Generator (Next.js) ───────────────────────────────────────────

async function generateApiRoute() {
  const rootDir = getRoot();
  if (!rootDir) return;

  const routePath = await vscode.window.showInputBox({
    prompt: 'API route path (e.g. users, auth/login)',
    placeHolder: 'users',
  });
  if (!routePath) return;

  const methods = await vscode.window.showQuickPick(
    ['GET + POST', 'GET only', 'POST only', 'GET + POST + PUT + DELETE (CRUD)'],
    { placeHolder: 'Which HTTP methods?' },
  );
  if (!methods) return;

  let content = `import { NextRequest, NextResponse } from 'next/server';\n\n`;

  if (methods.includes('GET')) {
    content += `export async function GET(request: NextRequest) {
  try {
    // TODO: implement GET logic
    return NextResponse.json({ data: [] });
  } catch (error) {
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}\n\n`;
  }

  if (methods.includes('POST')) {
    content += `export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    // TODO: implement POST logic
    return NextResponse.json({ data: body }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}\n\n`;
  }

  if (methods.includes('PUT')) {
    content += `export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    // TODO: implement PUT logic
    return NextResponse.json({ data: body });
  } catch (error) {
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}\n\n`;
  }

  if (methods.includes('DELETE')) {
    content += `export async function DELETE(request: NextRequest) {
  try {
    // TODO: implement DELETE logic
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}\n`;
  }

  // Try app/api first, fallback to src/app/api
  let apiDir = path.join(rootDir, 'src', 'app', 'api', routePath);
  if (fs.existsSync(path.join(rootDir, 'app'))) {
    apiDir = path.join(rootDir, 'app', 'api', routePath);
  }

  ensureDirSync(apiDir);
  const filePath = path.join(apiDir, 'route.ts');
  fs.writeFileSync(filePath, content, 'utf-8');

  vscode.window.showInformationMessage(`AutoChecker: Created /api/${routePath}/route.ts 🛣️`);
  const doc = await vscode.workspace.openTextDocument(filePath);
  await vscode.window.showTextDocument(doc);
}

// ── Barrel Export Generator ─────────────────────────────────────────────────

async function generateBarrelExport() {
  const rootDir = getRoot();
  if (!rootDir) return;

  // Let user pick a directory
  const uri = await vscode.window.showOpenDialog({
    canSelectFiles: false,
    canSelectFolders: true,
    canSelectMany: false,
    defaultUri: vscode.Uri.file(path.join(rootDir, 'src')),
    openLabel: 'Select folder for barrel export',
  });

  if (!uri || uri.length === 0) return;

  const targetDir = uri[0].fsPath;
  let entries;
  try {
    entries = fs.readdirSync(targetDir, { withFileTypes: true });
  } catch (_) {
    return;
  }

  const exportLines = [];

  for (const entry of entries) {
    if (entry.name === 'index.ts' || entry.name === 'index.tsx') continue;

    if (entry.isDirectory()) {
      // Check if dir has its own index
      const subIndex = path.join(targetDir, entry.name, 'index.ts');
      const subIndexX = path.join(targetDir, entry.name, 'index.tsx');
      if (fs.existsSync(subIndex) || fs.existsSync(subIndexX)) {
        exportLines.push(`export * from './${entry.name}';`);
      }
    } else if (
      /\.(ts|tsx)$/.test(entry.name) &&
      !entry.name.endsWith('.d.ts') &&
      !entry.name.endsWith('.test.ts') &&
      !entry.name.endsWith('.spec.ts')
    ) {
      const baseName = entry.name.replace(/\.(ts|tsx)$/, '');
      exportLines.push(`export * from './${baseName}';`);
    }
  }

  if (exportLines.length === 0) {
    vscode.window.showInformationMessage('AutoChecker: No exportable files found.');
    return;
  }

  const indexPath = path.join(targetDir, 'index.ts');
  const content = exportLines.join('\n') + '\n';

  fs.writeFileSync(indexPath, content, 'utf-8');
  vscode.window.showInformationMessage(
    `AutoChecker: Generated barrel export with ${exportLines.length} entries 📦`,
  );

  const doc = await vscode.workspace.openTextDocument(indexPath);
  await vscode.window.showTextDocument(doc);
}

// ── Component Generator ─────────────────────────────────────────────────────

async function generateComponent() {
  const rootDir = getRoot();
  if (!rootDir) return;

  const name = await vscode.window.showInputBox({
    prompt: 'Component name (PascalCase)',
    placeHolder: 'Button',
    validateInput: (v) => {
      if (!v) return 'Name is required';
      if (!/^[A-Z][a-zA-Z0-9]*$/.test(v)) return 'Use PascalCase (e.g. MyButton)';
      return null;
    },
  });
  if (!name) return;

  const style = await vscode.window.showQuickPick(
    ['Tailwind (className only)', 'CSS Module (.module.css)', 'Styled Components', 'No styles'],
    { placeHolder: 'Styling approach' },
  );
  if (!style) return;

  const baseDir = path.join(rootDir, 'src', 'components', name);
  ensureDirSync(baseDir);

  // TSX file
  let importStyle = '';
  let classAttr = "className={cn('', className)}";

  if (style === 'CSS Module (.module.css)') {
    importStyle = `import styles from './${name}.module.css';\n`;
    classAttr = 'className={cn(styles.root, className)}';
  } else if (style === 'Styled Components') {
    importStyle = `import { Wrapper } from './${name}.styled';\n`;
    classAttr = 'className={className}';
  }

  const tsxContent = `import { FC } from 'react';
import { cn } from '@/utils/cn';
${importStyle}
interface ${name}Props {
  className?: string;
}

export const ${name}: FC<${name}Props> = ({ className }) => {
  return (
    <div ${classAttr}>
      ${name}
    </div>
  );
};
`;

  const indexContent = `export { ${name} } from './${name}';\n`;

  fs.writeFileSync(path.join(baseDir, `${name}.tsx`), tsxContent, 'utf-8');
  fs.writeFileSync(path.join(baseDir, 'index.ts'), indexContent, 'utf-8');

  if (style === 'CSS Module (.module.css)') {
    fs.writeFileSync(path.join(baseDir, `${name}.module.css`), `.root {\n  \n}\n`, 'utf-8');
  } else if (style === 'Styled Components') {
    const styledContent = `import styled from 'styled-components';\n\nexport const Wrapper = styled.div\`\n  \n\`;\n`;
    fs.writeFileSync(path.join(baseDir, `${name}.styled.ts`), styledContent, 'utf-8');
  }

  vscode.window.showInformationMessage(`AutoChecker: Created component ${name}/ 🧩`);

  // Open the TSX file
  const doc = await vscode.workspace.openTextDocument(path.join(baseDir, `${name}.tsx`));
  await vscode.window.showTextDocument(doc);
}

// ── File Scaffolder ─────────────────────────────────────────────────────────

const SCAFFOLD_TEMPLATES = {
  'React Page (Next.js)': {
    ext: '.tsx',
    content: (name) =>
      `export default function ${name}Page() {\n  return (\n    <main>\n      <h1>${name}</h1>\n    </main>\n  );\n}\n`,
  },
  'React Layout (Next.js)': {
    ext: '.tsx',
    content: (name) =>
      `export default function ${name}Layout({\n  children,\n}: {\n  children: React.ReactNode;\n}) {\n  return <>{children}</>;\n}\n`,
  },
  'Server Action': {
    ext: '.ts',
    content: (name) =>
      `'use server';\n\nexport async function ${name.charAt(0).toLowerCase() + name.slice(1)}Action(formData: FormData) {\n  // TODO: implement\n}\n`,
  },
  'Zustand Store': {
    ext: '.ts',
    content: (name) =>
      `import { create } from 'zustand';\n\ninterface ${name}State {\n  // TODO: define state\n}\n\nexport const use${name}Store = create<${name}State>((set) => ({\n  // TODO: initial state\n}));\n`,
  },
  'Zod Schema': {
    ext: '.ts',
    content: (name) =>
      `import { z } from 'zod';\n\nexport const ${name.charAt(0).toLowerCase() + name.slice(1)}Schema = z.object({\n  // TODO: define schema\n});\n\nexport type ${name} = z.infer<typeof ${name.charAt(0).toLowerCase() + name.slice(1)}Schema>;\n`,
  },
  'Middleware (Next.js)': {
    ext: '.ts',
    content: () =>
      `import { NextResponse } from 'next/server';\nimport type { NextRequest } from 'next/server';\n\nexport function middleware(request: NextRequest) {\n  return NextResponse.next();\n}\n\nexport const config = {\n  matcher: ['/api/:path*'],\n};\n`,
  },
  'Test File (Vitest)': {
    ext: '.test.ts',
    content: (name) =>
      `import { describe, it, expect } from 'vitest';\n\ndescribe('${name}', () => {\n  it('should work', () => {\n    expect(true).toBe(true);\n  });\n});\n`,
  },
};

async function fileScaffolder() {
  const rootDir = getRoot();
  if (!rootDir) return;

  const template = await vscode.window.showQuickPick(Object.keys(SCAFFOLD_TEMPLATES), {
    placeHolder: 'Pick file template',
  });
  if (!template) return;

  const name = await vscode.window.showInputBox({
    prompt: 'Name (PascalCase)',
    placeHolder: 'Dashboard',
  });
  if (!name) return;

  const t = SCAFFOLD_TEMPLATES[template];
  const filePath = await vscode.window.showInputBox({
    prompt: 'File path (relative to project root)',
    value: `src/${name.charAt(0).toLowerCase() + name.slice(1)}${t.ext}`,
  });
  if (!filePath) return;

  const fullPath = path.join(rootDir, filePath);
  ensureDirSync(path.dirname(fullPath));
  fs.writeFileSync(fullPath, t.content(name), 'utf-8');

  vscode.window.showInformationMessage(`AutoChecker: Created ${filePath} 📄`);
  const doc = await vscode.workspace.openTextDocument(fullPath);
  await vscode.window.showTextDocument(doc);
}

module.exports = { generateHook, generateApiRoute, generateBarrelExport, generateComponent, fileScaffolder };
