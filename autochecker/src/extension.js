// filepath: src/extension.js

const vscode = require('vscode');

const { initConfigs, initScaffold, initFullArchitecture } = require('./commands/init');
const { startLiveServer, stopLiveServer } = require('./commands/liveServer');
const { insertLog, commentAllLogs, uncommentAllLogs, deleteAllLogs } = require('./commands/consoleLog');
const { sortImports, removeUnusedImports } = require('./commands/imports');
const { scanTodos, scanDeadCode, findDuplicates } = require('./commands/scanner');
const { generateHook, generateApiRoute, generateBarrelExport, generateComponent, fileScaffolder } = require('./commands/generators');
const { jsonToInterface, jsonFormat, decodeJwt } = require('./commands/json');
const { sortTailwindClasses, cssToTailwind, showBreakpoints } = require('./commands/tailwind');
const { fontPreview, cssUnitConverter, openColorPicker } = require('./commands/cssTools');
const { convertCase, generatePassword } = require('./commands/stringTools');
const { killPort, checkOutdated, wrapTryCatch, commentHeader } = require('./commands/devTools');
const { addBookmark, showBookmarks, clearBookmarks } = require('./commands/bookmarks');
const { saveSnippet, insertSnippet } = require('./commands/snippets');
const { generateReadme, editPackageScripts, generateEnv, packageQuickInstall, generateProjectTree } = require('./commands/projectTools');
const {
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
} = require('./commands/pythonTools');
const { SidebarProvider } = require('./sidebar/SidebarProvider');
const { openHttpClient } = require('./sidebar/httpClient');

// ── Extension Lifecycle ──────────────────────────────────────────────────────

function activate(context) {
  // Sidebar
  const sidebarProvider = new SidebarProvider(context);
  context.subscriptions.push(
    vscode.window.registerWebviewViewProvider('autochecker.sidebarView', sidebarProvider),
  );

  context.subscriptions.push(
    // Init commands
    vscode.commands.registerCommand('autochecker.initFullArchitecture', initFullArchitecture),
    vscode.commands.registerCommand('autochecker.initConfigs', initConfigs),
    vscode.commands.registerCommand('autochecker.initScaffold', initScaffold),
    // Live server
    vscode.commands.registerCommand('autochecker.startLiveServer', startLiveServer),
    vscode.commands.registerCommand('autochecker.stopLiveServer', stopLiveServer),
    // Turbo console log
    vscode.commands.registerCommand('autochecker.insertLog', () => insertLog('console.log')),
    vscode.commands.registerCommand('autochecker.insertWarn', () => insertLog('console.warn')),
    vscode.commands.registerCommand('autochecker.insertError', () => insertLog('console.error')),
    vscode.commands.registerCommand('autochecker.insertInfo', () => insertLog('console.info')),
    vscode.commands.registerCommand('autochecker.insertDebug', () => insertLog('console.debug')),
    vscode.commands.registerCommand('autochecker.insertTable', () => insertLog('console.table')),
    vscode.commands.registerCommand('autochecker.commentAllLogs', commentAllLogs),
    vscode.commands.registerCommand('autochecker.uncommentAllLogs', uncommentAllLogs),
    vscode.commands.registerCommand('autochecker.deleteAllLogs', deleteAllLogs),
    // Utilities
    vscode.commands.registerCommand('autochecker.colorPicker', openColorPicker),
    vscode.commands.registerCommand('autochecker.generateEnv', generateEnv),
    vscode.commands.registerCommand('autochecker.packageInstall', packageQuickInstall),
    vscode.commands.registerCommand('autochecker.generateComponent', generateComponent),
    vscode.commands.registerCommand('autochecker.projectTree', generateProjectTree),
    // Code Quality
    vscode.commands.registerCommand('autochecker.sortImports', sortImports),
    vscode.commands.registerCommand('autochecker.removeUnusedImports', removeUnusedImports),
    vscode.commands.registerCommand('autochecker.scanTodos', scanTodos),
    vscode.commands.registerCommand('autochecker.scanDeadCode', scanDeadCode),
    vscode.commands.registerCommand('autochecker.findDuplicates', findDuplicates),
    // Code Generation
    vscode.commands.registerCommand('autochecker.generateHook', generateHook),
    vscode.commands.registerCommand('autochecker.generateApiRoute', generateApiRoute),
    vscode.commands.registerCommand('autochecker.jsonToInterface', jsonToInterface),
    vscode.commands.registerCommand('autochecker.generateBarrelExport', generateBarrelExport),
    // Frontend Tools
    vscode.commands.registerCommand('autochecker.sortTailwind', sortTailwindClasses),
    vscode.commands.registerCommand('autochecker.cssToTailwind', cssToTailwind),
    vscode.commands.registerCommand('autochecker.breakpoints', showBreakpoints),
    vscode.commands.registerCommand('autochecker.fontPreview', fontPreview),
    vscode.commands.registerCommand('autochecker.cssUnitConverter', cssUnitConverter),
    // Formatters
    vscode.commands.registerCommand('autochecker.jsonFormat', jsonFormat),
    vscode.commands.registerCommand('autochecker.decodeJwt', decodeJwt),
    vscode.commands.registerCommand('autochecker.convertCase', convertCase),
    vscode.commands.registerCommand('autochecker.generatePassword', generatePassword),
    // DX
    vscode.commands.registerCommand('autochecker.wrapTryCatch', wrapTryCatch),
    vscode.commands.registerCommand('autochecker.commentHeader', commentHeader),
    vscode.commands.registerCommand('autochecker.addBookmark', addBookmark),
    vscode.commands.registerCommand('autochecker.showBookmarks', showBookmarks),
    vscode.commands.registerCommand('autochecker.clearBookmarks', clearBookmarks),
    vscode.commands.registerCommand('autochecker.saveSnippet', saveSnippet),
    vscode.commands.registerCommand('autochecker.insertSnippet', insertSnippet),
    vscode.commands.registerCommand('autochecker.killPort', killPort),
    vscode.commands.registerCommand('autochecker.checkOutdated', checkOutdated),
    vscode.commands.registerCommand('autochecker.fileScaffolder', fileScaffolder),
    // Project
    vscode.commands.registerCommand('autochecker.generateReadme', generateReadme),
    vscode.commands.registerCommand('autochecker.editPackageScripts', editPackageScripts),
    // HTTP Client
    vscode.commands.registerCommand('autochecker.openHttpClient', () => openHttpClient(context)),
    // Python Tools
    vscode.commands.registerCommand('autochecker.py.insertPrint', insertPrint),
    vscode.commands.registerCommand('autochecker.py.wrapTryExcept', wrapTryExcept),
    vscode.commands.registerCommand('autochecker.py.generateClass', generatePythonClass),
    vscode.commands.registerCommand('autochecker.py.generateFunction', generatePythonFunction),
    vscode.commands.registerCommand('autochecker.py.sortImports', sortPythonImports),
    vscode.commands.registerCommand('autochecker.py.generateRequirements', generateRequirements),
    vscode.commands.registerCommand('autochecker.py.createVenv', createVenv),
    vscode.commands.registerCommand('autochecker.py.generateRoute', generatePythonRoute),
    vscode.commands.registerCommand('autochecker.py.scanTodos', scanPythonTodos),
    vscode.commands.registerCommand('autochecker.py.generateInitPy', generateInitPy),
    vscode.commands.registerCommand('autochecker.py.runFile', runPythonFile),
  );
}

function deactivate() {
  stopLiveServer();
}

module.exports = { activate, deactivate };
