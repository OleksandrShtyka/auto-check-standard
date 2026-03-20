# AutoChecker — Boilerplate Generator 🚀

[![Marketplace Version](https://img.shields.io/visual-studio-marketplace/v/shtyka-dev.autochecker?style=flat-square)](https://marketplace.visualstudio.com/items?itemName=shtyka-dev.autochecker)
[![Installs](https://img.shields.io/visual-studio-marketplace/i/shtyka-dev.autochecker?style=flat-square)](https://marketplace.visualstudio.com/items?itemName=shtyka-dev.autochecker)

**AutoChecker** is a powerful VS Code extension designed for professional frontend engineers. It automates the tedious process of setting up project configurations, ensuring every workspace adheres to high-performance architecture and clean-code standards in seconds.

Stop wasting time copying `.prettierrc` or `.eslintrc.json` from project to project. One command, zero friction.

---

## ⚡ Quick Start

1. **Open** any folder or project in VS Code.
2. Press `Ctrl+Shift+P` (or `Cmd+Shift+P` on macOS).
3. Type and select: **`Init Full Architecture`**.
4. **Confirm** the prompt, and you're ready to code.

---

## 📦 What's Inside?

AutoChecker scaffolds a complete, production-ready ecosystem for your project:

| File | Technical Detail |
| :--- | :--- |
| **`.prettierrc`** | Integrated with `prettier-plugin-tailwindcss` and `@trivago/prettier-plugin-sort-imports`. Semi: true, SingleQuote: true. |
| **`.eslintrc.json`** | Next.js Core Web Vitals + TypeScript ESLint. Disallows `no-explicit-any` and enforces strict linting. |
| **`.gitignore`** | Comprehensive list (Node, Next.js, OS files, Env logs, and build artifacts). |
| **`settings.json`** | Forces `editor.formatOnSave`, sets Prettier as default, and enables ESLint autofix on save. |
| **`rafc snippet`** | High-performance React FC template with TypeScript interfaces and `cn()` utility support. |

---

## 🛠 Features

- **FAANG-style Snippets**: The built-in `rafc` snippet generates a named export component with a dedicated props interface, optimized for Tailwind CSS projects.
- **Auto-Formatting**: Automatically configures your VS Code workspace to format code on every save.
- **Smart Validation**: Checks if a folder is open before running to prevent file system errors.
- **Conflict Prevention**: Includes a confirmation modal to ensure you don't accidentally overwrite existing configs.

---

## 🚀 Development & Contribution

If you want to contribute or customize the architecture:

1. Clone the repository.
2. Run `npm install`.
3. Press `F5` (or `Fn+F5` on Mac) to launch the **Extension Development Host**.
4. Modify `src/extension.js` to update the boilerplate logic.

---

## 📄 License

Created by **Oleksandr Shtyka** (`shtyka-dev`).
Distributed under the MIT License. 

**Happy Coding! 🦾**
