// filepath: src/commands/cssTools.js

const vscode = require('vscode');

// ── Font Preview (Google Fonts) ─────────────────────────────────────────────

async function fontPreview() {
  const fonts = [
    {
      label: 'Inter',
      detail: 'Clean sans-serif, great for UI',
      import:
        "@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');",
    },
    {
      label: 'Poppins',
      detail: 'Geometric, modern',
      import:
        "@import url('https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700&display=swap');",
    },
    {
      label: 'Manrope',
      detail: 'Semi-rounded, trendy',
      import:
        "@import url('https://fonts.googleapis.com/css2?family=Manrope:wght@400;500;600;700&display=swap');",
    },
    {
      label: 'Space Grotesk',
      detail: 'Techy, distinctive',
      import:
        "@import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;600;700&display=swap');",
    },
    {
      label: 'DM Sans',
      detail: 'Clean, geometric sans',
      import:
        "@import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&display=swap');",
    },
    {
      label: 'Plus Jakarta Sans',
      detail: 'Modern, professional',
      import:
        "@import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700&display=swap');",
    },
    {
      label: 'Geist',
      detail: 'Vercel system font',
      import:
        "@import url('https://fonts.googleapis.com/css2?family=Geist:wght@400;500;600;700&display=swap');",
    },
    {
      label: 'JetBrains Mono',
      detail: 'Best monospace for code',
      import:
        "@import url('https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500;600;700&display=swap');",
    },
    {
      label: 'Fira Code',
      detail: 'Monospace with ligatures',
      import:
        "@import url('https://fonts.googleapis.com/css2?family=Fira+Code:wght@400;500;600;700&display=swap');",
    },
    {
      label: 'Playfair Display',
      detail: 'Elegant serif for headings',
      import:
        "@import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;500;600;700&display=swap');",
    },
  ];
  const picked = await vscode.window.showQuickPick(fonts, {
    placeHolder: 'Pick font to copy @import',
  });
  if (picked) {
    await vscode.env.clipboard.writeText(
      picked.import + `\n\nfont-family: '${picked.label}', sans-serif;`,
    );
    vscode.window.showInformationMessage(
      `AutoChecker: Copied ${picked.label} import + font-family`,
    );
  }
}

// ── CSS Unit Converter ──────────────────────────────────────────────────────

async function cssUnitConverter() {
  const input = await vscode.window.showInputBox({
    prompt: 'Enter value (e.g. 16px, 1rem, 2em, 50vh)',
    placeHolder: '16px',
  });
  if (!input) return;

  const baseFontSize = 16;
  const match = input.trim().match(/^([\d.]+)\s*(px|rem|em|vh|vw|%)$/);
  if (!match) {
    vscode.window.showErrorMessage('AutoChecker: Invalid format. Use: 16px, 1rem, 2em, 50vh');
    return;
  }

  const val = parseFloat(match[1]);
  const unit = match[2];
  const conversions = [];

  if (unit === 'px') {
    conversions.push(
      `${val}px`,
      `${(val / baseFontSize).toFixed(4).replace(/\.?0+$/, '')}rem`,
      `${(val / baseFontSize).toFixed(4).replace(/\.?0+$/, '')}em`,
    );
  } else if (unit === 'rem' || unit === 'em') {
    conversions.push(`${val * baseFontSize}px`, `${val}rem`, `${val}em`);
  } else {
    conversions.push(`${val}${unit}`);
  }

  const picked = await vscode.window.showQuickPick(
    conversions.map((c) => ({ label: c })),
    { placeHolder: 'Pick to copy' },
  );
  if (picked) {
    await vscode.env.clipboard.writeText(picked.label);
    vscode.window.showInformationMessage(`AutoChecker: Copied ${picked.label}`);
  }
}

// ── Color Picker & Converter ────────────────────────────────────────────────

function hexToRgb(hex) {
  hex = hex.replace(/^#/, '');
  if (hex.length === 3)
    hex = hex
      .split('')
      .map((c) => c + c)
      .join('');
  const n = parseInt(hex, 16);
  return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
}

function rgbToHsl(r, g, b) {
  r /= 255;
  g /= 255;
  b /= 255;
  const max = Math.max(r, g, b),
    min = Math.min(r, g, b);
  let h,
    s,
    l = (max + min) / 2;
  if (max === min) {
    h = s = 0;
  } else {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r:
        h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
        break;
      case g:
        h = ((b - r) / d + 2) / 6;
        break;
      case b:
        h = ((r - g) / d + 4) / 6;
        break;
    }
  }
  return { h: Math.round(h * 360), s: Math.round(s * 100), l: Math.round(l * 100) };
}

async function openColorPicker() {
  const editor = vscode.window.activeTextEditor;

  // Try to detect color under cursor
  let defaultColor = '#3B82F6';
  if (editor) {
    const doc = editor.document;
    const line = doc.lineAt(editor.selection.active.line).text;
    const hexMatch = line.match(/#[0-9a-fA-F]{3,8}\b/);
    if (hexMatch) defaultColor = hexMatch[0];
  }

  const input = await vscode.window.showInputBox({
    prompt: 'Enter color (HEX, rgb(), or hsl())',
    value: defaultColor,
    placeHolder: '#3B82F6 or rgb(59,130,246) or hsl(217,91%,60%)',
  });
  if (!input) return;

  let r, g, b, hex;
  const trimmed = input.trim();

  // Parse HEX
  if (trimmed.startsWith('#')) {
    const parsed = hexToRgb(trimmed);
    r = parsed.r;
    g = parsed.g;
    b = parsed.b;
    hex =
      trimmed.length <= 4
        ? '#' +
          trimmed
            .replace('#', '')
            .split('')
            .map((c) => c + c)
            .join('')
        : trimmed;
  }
  // Parse rgb()
  else if (trimmed.startsWith('rgb')) {
    const nums = trimmed.match(/\d+/g);
    if (nums && nums.length >= 3) {
      r = +nums[0];
      g = +nums[1];
      b = +nums[2];
    }
    hex = '#' + [r, g, b].map((v) => v.toString(16).padStart(2, '0')).join('');
  }
  // Parse hsl()
  else if (trimmed.startsWith('hsl')) {
    const nums = trimmed.match(/[\d.]+/g);
    if (nums && nums.length >= 3) {
      const h = +nums[0] / 360,
        s = +nums[1] / 100,
        l = +nums[2] / 100;
      const hue2rgb = (p, q, t) => {
        if (t < 0) t += 1;
        if (t > 1) t -= 1;
        if (t < 1 / 6) return p + (q - p) * 6 * t;
        if (t < 1 / 2) return q;
        if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
        return p;
      };
      const q = l < 0.5 ? l * (1 + s) : l + s - l * s,
        p = 2 * l - q;
      r = Math.round(hue2rgb(p, q, h + 1 / 3) * 255);
      g = Math.round(hue2rgb(p, q, h) * 255);
      b = Math.round(hue2rgb(p, q, h - 1 / 3) * 255);
    }
    hex = '#' + [r, g, b].map((v) => v.toString(16).padStart(2, '0')).join('');
  } else {
    vscode.window.showErrorMessage('AutoChecker: Unsupported color format.');
    return;
  }

  const hsl = rgbToHsl(r, g, b);
  const formats = [
    `HEX: ${hex}`,
    `RGB: rgb(${r}, ${g}, ${b})`,
    `HSL: hsl(${hsl.h}, ${hsl.s}%, ${hsl.l}%)`,
  ];

  const picked = await vscode.window.showQuickPick(formats, {
    placeHolder: 'Pick format to copy to clipboard',
  });

  if (picked) {
    const value = picked.split(': ').slice(1).join(': ');
    await vscode.env.clipboard.writeText(value);
    vscode.window.showInformationMessage(`AutoChecker: Copied ${value}`);
  }
}

module.exports = { fontPreview, cssUnitConverter, openColorPicker, hexToRgb, rgbToHsl };
