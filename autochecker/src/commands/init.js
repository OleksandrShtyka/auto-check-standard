// filepath: src/commands/init.js

const vscode = require('vscode');
const fs = require('fs');
const path = require('path');
const { CONFIG_FILES, SCAFFOLD_DIRS, SCAFFOLD_FILES } = require('../config');
const { getRoot, ensureDirSync, writeFileEntry, writeEntries } = require('../utils/helpers');

/** Generate config files only (.prettierrc, .eslintrc, .gitignore, .vscode/) */
async function initConfigs() {
  const rootDir = getRoot();
  if (!rootDir) return;

  const confirm = await vscode.window.showWarningMessage(
    'AutoChecker: Create config files? Existing files will be overwritten.',
    { modal: true },
    'Proceed',
  );
  if (confirm !== 'Proceed') return;

  writeEntries(rootDir, CONFIG_FILES, `Created ${CONFIG_FILES.length} config files`);
}

/** Scaffold project directory structure only */
async function initScaffold() {
  const rootDir = getRoot();
  if (!rootDir) return;

  const confirm = await vscode.window.showWarningMessage(
    'AutoChecker: Create project scaffold directories?',
    { modal: true },
    'Proceed',
  );
  if (confirm !== 'Proceed') return;

  try {
    for (const dir of SCAFFOLD_DIRS) {
      ensureDirSync(path.join(rootDir, dir));
    }

    for (const entry of SCAFFOLD_FILES) {
      const fullPath = path.join(rootDir, entry.relativePath);
      // Don't overwrite existing files in scaffold
      if (!fs.existsSync(fullPath)) {
        writeFileEntry(rootDir, entry);
      }
    }

    vscode.window.showInformationMessage(
      `AutoChecker: Scaffolded ${SCAFFOLD_DIRS.length} directories! 📁`,
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    vscode.window.showErrorMessage(`AutoChecker: Failed — ${message}`);
  }
}

/** Full init — configs + scaffold */
async function initFullArchitecture() {
  const rootDir = getRoot();
  if (!rootDir) return;

  const confirm = await vscode.window.showWarningMessage(
    'AutoChecker: This will create config files AND scaffold directories. Existing config files will be overwritten.',
    { modal: true },
    'Proceed',
  );
  if (confirm !== 'Proceed') return;

  try {
    // Configs
    for (const entry of CONFIG_FILES) {
      writeFileEntry(rootDir, entry);
    }

    // Scaffold dirs
    for (const dir of SCAFFOLD_DIRS) {
      ensureDirSync(path.join(rootDir, dir));
    }

    // Scaffold files (skip existing)
    for (const entry of SCAFFOLD_FILES) {
      const fullPath = path.join(rootDir, entry.relativePath);
      if (!fs.existsSync(fullPath)) {
        writeFileEntry(rootDir, entry);
      }
    }

    const total = CONFIG_FILES.length + SCAFFOLD_DIRS.length;
    vscode.window.showInformationMessage(
      `AutoChecker: Full architecture initialized — ${CONFIG_FILES.length} configs + ${SCAFFOLD_DIRS.length} directories! 🚀`,
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    vscode.window.showErrorMessage(`AutoChecker: Failed — ${message}`);
  }
}

module.exports = { initConfigs, initScaffold, initFullArchitecture };
