# Changelog

All notable changes to **AutoChecker** VS Code extension.

**Marketplace:** [shtyka-dev.autochecker](https://marketplace.visualstudio.com/items?itemName=shtyka-dev.autochecker)

---

## [0.0.11] — 2026-03-25

### 🐍 Python Tools (11 new commands)

- **Insert print()** — Turbo Console Log for Python, inserts `print(f"🔥 DF: filename:line → var=", var)` with auto-detected variable under cursor (`Cmd+Alt+P` in `.py` files)
- **Wrap try/except** — wraps selected code in try/except with `traceback.print_exc()`
- **Generate Class** — creates Python class with `__init__`, type hints, docstring; validated PascalCase input
- **Generate Function** — function template with docstring and type annotations
- **Sort Imports** — sorts Python imports by group: stdlib → third-party → local, with blank line separators
- **Generate requirements.txt** — scans all `.py` files for `import`/`from` statements, deduplicates, generates file
- **Create venv** — creates virtual environment via integrated terminal with shell-escaped name
- **Generate Route** — Flask or FastAPI endpoint with error handling and method selection
- **Scan TODOs** — finds TODO/FIXME/HACK across all `.py` files with QuickPick click-to-navigate
- **Generate \_\_init\_\_.py** — auto barrel export for Python packages
- **Run Python File** — executes current `.py` file in terminal with shell-safe path

### 🔒 Security Fixes

- **Path traversal (liveServer)** — replaced naive `startsWith` prefix match with `path.resolve()` + `path.sep` boundary check
- **XSS (liveServer)** — 404 page no longer reflects raw `urlPath` in HTML response; output is now escaped
- **Shell injection (pythonTools)** — `createVenv` and `runPythonFile` now escape shell arguments via dedicated `escapeShellArg()` helper
- **Code injection (pythonTools)** — class and function name inputs validated against `/^[A-Za-z_][A-Za-z0-9_]*$/` before interpolation into generated code
- **Python string escape (pythonTools)** — route path strings are escaped to prevent injection in generated Flask/FastAPI code
- **PID injection (devTools)** — `killPort` now validates `lsof` output as numeric PIDs before passing to `kill` command
- **Modulo bias (stringTools)** — password generator replaced `byte % chars.length` with rejection sampling for cryptographically uniform distribution
- **Token exposure (httpClient)** — Bearer tokens are redacted in saved history file (`Authorization: Bearer ***`)
- **Unbounded response (httpClient)** — HTTP client enforces 10 MB response body size limit
- **History size guard (httpClient)** — `autochecker-history.json` validates file size before JSON parsing

### Added

- Python Tools section in sidebar dashboard (🐍 accordion group with 11 buttons)
- Keybinding `Cmd+Alt+P` / `Ctrl+Alt+P` for insert print() (scoped to `editorLangId == python`)

---

## [0.0.10] — 2026-03-25

### Changed

- **Modular architecture** — monolithic 3480-line `extension.js` refactored into 20 files across `commands/`, `config/`, `sidebar/`, `utils/` directories
- Each module has single responsibility with clean exports
- Maximum file size reduced from 3480 to ~600 lines

### Structure

```
src/
├── extension.js              # Entry point + command registration
├── commands/
│   ├── init.js               # Project setup (configs, scaffold)
│   ├── liveServer.js         # HTTP + WebSocket + watcher + status bar
│   ├── consoleLog.js         # Turbo console log (insert/comment/delete)
│   ├── imports.js            # Sort imports, remove unused
│   ├── scanner.js            # TODO scanner, dead code, duplicates
│   ├── generators.js         # Hook, API route, barrel export, component, scaffolder
│   ├── json.js               # JSON format, JWT decode, JSON→Interface
│   ├── tailwind.js           # Tailwind sort, CSS→Tailwind, breakpoints
│   ├── cssTools.js           # Font preview, CSS units, color picker
│   ├── stringTools.js        # Case converter, password generator
│   ├── devTools.js           # Kill port, outdated check, try/catch wrap, comment header
│   ├── bookmarks.js          # Code bookmarks (add/show/clear)
│   ├── snippets.js           # Snippet manager (save/insert)
│   └── projectTools.js       # README, package.json editor, .env, npm install, project tree
├── config/
│   └── index.js              # All config constants (prettier, eslint, gitignore, etc.)
├── sidebar/
│   ├── SidebarProvider.js    # Webview sidebar with accordion UI
│   └── httpClient.js         # Postman-style HTTP client panel
└── utils/
    └── helpers.js            # Shared utilities (getRoot, ensureDir, writeFile)
```

---

## [0.0.9] — 2026-03-21

### 🎨 Frontend Tools (5 new)

- **Tailwind Class Sorter** — sorts classes in `className` by official Tailwind property order
- **CSS → Tailwind Converter** — converts 50+ CSS properties to Tailwind utility classes with px→rem auto-conversion
- **Responsive Breakpoint Viewer** — shows Tailwind breakpoints (sm/md/lg/xl/2xl) with one-click media query copy
- **Font Preview** — 10 curated Google Fonts (Inter, Poppins, Manrope, Geist, JetBrains Mono...) with `@import` + `font-family` copy
- **CSS Unit Converter** — px↔rem↔em with 16px base

### 🔧 Formatters (4 new)

- **JSON Formatter / Minifier** — prettify (2 or 4 spaces) or minify JSON in active file or selection
- **JWT Decoder** — decodes header + payload, shows human-readable dates, detects expired tokens
- **String Case Converter** — 7 formats: camelCase, PascalCase, snake_case, kebab-case, SCREAMING_SNAKE, dot.case, path/case
- **Password / Secret Generator** — 16–128 chars in alphanumeric, hex, base64, or URL-safe; inserts at cursor or copies to clipboard

### 🚀 DX & Productivity (8 new)

- **Wrap in Try/Catch** — wraps selected code in try/catch with `console.error`
- **Quick Comment Header** — inserts `// ── Section ───────` separator at cursor
- **Code Bookmarks** — add, show, clear bookmarks for quick navigation across files
- **Snippet Manager** — save selected code as reusable snippets in `.vscode/autochecker-snippets.json`
- **Kill Port** — enter port number, finds and kills the process (macOS `lsof` + Windows `netstat`)
- **File Scaffolder** — 7 templates: Next.js Page/Layout, Server Action, Zustand Store, Zod Schema, Middleware, Vitest Test

### 📦 Project (4 new)

- **README Generator** — generates README.md with project name, description, tech stack, structure, scripts
- **Package.json Script Editor** — run/add/edit/remove scripts through QuickPick UI
- **Dependency Outdated Checker** — runs `npm outdated` in integrated terminal
- **.env Generator** — (moved to Project section)

---

## [0.0.8] — 2026-03-21

### 🛠️ Code Quality (5 new)

- **Import Sorter** — sorts imports by group: react → next → third-party → @/ aliases → relative, with blank line separators
- **Unused Imports Remover** — detects and removes imports where no imported name is used; preserves side-effect imports (`import 'styles.css'`)
- **TODO/FIXME Scanner** — scans entire project for TODO, FIXME, HACK, BUG, XXX, WARN; QuickPick with click-to-navigate
- **Dead Code Scanner** — finds variables and functions declared but never referenced in current file
- **Duplicate Code Finder** — sliding window detection of 3+ line duplicate blocks; ignores trivial patterns

### ⚡ Code Generation (4 new)

- **Custom Hook Generator** — creates `src/hooks/useMyHook.ts` with useState/useEffect template + auto-updates barrel export
- **Next.js API Route Generator** — creates `app/api/.../route.ts` with selected HTTP methods and try/catch handling
- **JSON → TypeScript Interface** — recursive type inference from JSON (nested objects, arrays); inserts at cursor or clipboard
- **Barrel Export Generator** — auto-generates `index.ts` with `export *` for all .ts/.tsx files in selected directory

---

## [0.0.7] — 2026-03-21

### Added

- **Color Picker / Converter** — input HEX, RGB, or HSL; converts to all three formats; auto-detects color under cursor
- **.env Generator** — 4 templates (Next.js, Vite + React, Node.js API, Minimal); creates both `.env` and `.env.example`; smart overwrite detection
- **Package Quick Install** — categorized UI (UI & Styling, State & Data, Animation, Dev Tools, Auth & DB) with multi-select + `npm install` terminal execution
- **Component Generator** — PascalCase input, 4 styling modes (Tailwind, CSS Module, Styled Components, None); creates TSX + index.ts + style file; auto-opens created file
- **Project Tree Generator** — generates ASCII tree (2–5 levels) with smart ignore (node_modules, .git, .next, dist); copies markdown-wrapped tree to clipboard

---

## [0.0.6] — 2026-03-21

### Added

- **Sidebar Dashboard** — Activity Bar icon (⚡ SVG lightning bolt) with Webview sidebar panel
- **Accordion UI** — collapsible sections with chevron animation, badge counts per group, primary CTA button
- All commands accessible via sidebar buttons without opening Command Palette

### Fixed

- Activity Bar icon: replaced `$(tools)` codicon syntax with actual SVG file path (`assets/icon.svg`)

---

## [0.0.5] — 2026-03-21

### Added

- **HTTP Client (Postman-style)** — full Webview panel inside VS Code
- 7 HTTP methods: GET, POST, PUT, PATCH, DELETE, HEAD, OPTIONS
- Request tabs: Headers (key-value editor), Body (JSON/raw), Auth (Bearer token), History
- Response display: color-coded status badge (2xx/3xx/4xx/5xx), timing in ms, response size, prettified JSON body, response headers list
- Request history persisted in `.vscode/autochecker-history.json` (last 50 entries)
- HTTP + HTTPS support, 30s timeout, `retainContextWhenHidden`

---

## [0.0.4] — 2026-03-21

### Added

- **Turbo Console Log** — insert console.log/warn/error/info/debug/table on the next line
- Format: `console.log('🔥 DF: App.jsx:12 → userName:', userName)` with file name, line number, variable name
- Auto-detects variable under cursor or uses text selection
- **Comment All Logs** — comments out all `console.*` statements in current file
- **Uncomment All Logs** — restores commented console statements
- **Delete All Logs** — removes all `console.*` lines (both active and commented)

### Keybindings

| Action               | macOS         | Windows        |
| -------------------- | ------------- | -------------- |
| Insert console.log   | `Cmd+Shift+L` | `Ctrl+Shift+L` |
| Insert console.warn  | `Cmd+Shift+W` | `Ctrl+Shift+W` |
| Insert console.error | `Cmd+Shift+E` | `Ctrl+Shift+E` |
| Comment All Logs     | `Cmd+Alt+C`   | `Ctrl+Alt+C`   |
| Uncomment All Logs   | `Cmd+Alt+U`   | `Ctrl+Alt+U`   |
| Delete All Logs      | `Cmd+Alt+D`   | `Ctrl+Alt+D`   |

---

## [0.0.3] — 2026-03-21

### Added

- **Live Server** — static HTTP server on port 5500 with auto `index.html` resolution
- **Live Reload** — WebSocket server on port 5501; injects reload script into HTML files; reloads browser on file save
- FileSystemWatcher monitoring `*.html, *.css, *.js, *.json, *.svg, *.jsx, *.tsx, *.ts`
- Status bar indicator (`$(radio-tower) Port: 5500`) with click-to-stop
- "Open in Browser" notification button after server start
- Path traversal protection + no-cache response headers
- Auto-cleanup of all server resources on `deactivate()`

---

## [0.0.2] — 2026-03-21

### Added

- **Multi-command architecture** — 3 separate commands:
  - `Init Full Architecture` — configs + scaffold in one go
  - `Init Configs Only` — only configuration files
  - `Init Scaffold Only` — only directory structure
- **Project scaffold** — generates 8 directories with starter files:
  - `src/components/`, `src/hooks/`, `src/utils/` — `.gitkeep`
  - `src/styles/` — `globals.css` with Tailwind directives
  - `src/lib/`, `src/services/` — `.gitkeep`
  - `src/types/` — `index.ts` with empty export
  - `src/constants/` — `index.ts` with `APP_NAME` constant
- Non-destructive scaffold — does not overwrite existing files

### Changed

- Updated all config contents to production versions:
  - `.prettierrc` — added `trailingComma: "all"`, `singleAttributePerLine`, `importOrder` with sorting
  - `.eslintrc.json` — added `plugin:prettier/recommended`, `no-unused-vars`, `no-console`, `self-closing-comp`
  - `.vscode/settings.json` — added `codeActionsOnSave` with ESLint autofix, Tailwind emmet
  - `rafc` snippet — now uses `cn()` utility, named export, "Base FAANG-style React Component"
  - `.gitignore` — expanded with coverage, pnp, pnpm-debug sections

### Metadata

- Publisher: `shtyka-dev`
- Repository: `github.com/OleksandrShtyka/auto-check-standard`
- License: MIT

---

## [0.0.1] — 2026-03-21

### Added

- Initial release — single command `autochecker.initFullArchitecture`
- Generates 5 configuration files:
  - `.prettierrc` — Prettier with Tailwind + import sort plugins
  - `.eslintrc.json` — Next.js + TypeScript ESLint config
  - `.gitignore` — standard web-dev ignore list
  - `.vscode/settings.json` — format on save + Prettier as default formatter
  - `.vscode/shtyka.code-snippets` — `rafc` React FC snippet with TypeScript props
- Modal confirmation before overwriting existing files
- Workspace validation with error message if no folder is open

### Technical Notes

- Originally built in TypeScript; migrated to JavaScript (CommonJS) due to VS Code TS Language Server caching issue where `@types/node` was installed and `tsc` compiled cleanly, but the editor showed red squiggles on `'fs'` and `'path'` imports
- Restart TS Server and Developer: Reload Window did not resolve the issue
- JavaScript version requires no build step, no `npm install`, and eliminates the TS Server dependency entirely
- macOS: F5 controls screen brightness; use `Fn+F5` or `Run → Start Debugging` to launch Extension Development Host
- Zero runtime dependencies — uses only built-in Node.js modules (`fs`, `path`) and VS Code API

---

**📦 [Install from Marketplace](https://marketplace.visualstudio.com/items?itemName=shtyka-dev.autochecker)**
