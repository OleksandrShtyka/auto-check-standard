// filepath: src/commands/tailwind.js

const vscode = require('vscode');

// ── Tailwind Class Sorter ───────────────────────────────────────────────────

const TW_ORDER = [
  'container',
  'box',
  'block',
  'inline',
  'flex',
  'grid',
  'table',
  'hidden',
  'visible',
  'static',
  'fixed',
  'absolute',
  'relative',
  'sticky',
  'top',
  'right',
  'bottom',
  'left',
  'z',
  'order',
  'col',
  'row',
  'float',
  'clear',
  'm',
  'mx',
  'my',
  'mt',
  'mr',
  'mb',
  'ml',
  'p',
  'px',
  'py',
  'pt',
  'pr',
  'pb',
  'pl',
  'w',
  'min-w',
  'max-w',
  'h',
  'min-h',
  'max-h',
  'size',
  'font',
  'text',
  'leading',
  'tracking',
  'decoration',
  'underline',
  'overline',
  'line-through',
  'no-underline',
  'uppercase',
  'lowercase',
  'capitalize',
  'normal-case',
  'truncate',
  'overflow',
  'whitespace',
  'break',
  'border',
  'rounded',
  'outline',
  'ring',
  'shadow',
  'opacity',
  'bg',
  'from',
  'via',
  'to',
  'fill',
  'stroke',
  'object',
  'aspect',
  'columns',
  'gap',
  'space',
  'divide',
  'place',
  'items',
  'justify',
  'self',
  'content',
  'align',
  'basis',
  'grow',
  'shrink',
  'scale',
  'rotate',
  'translate',
  'skew',
  'origin',
  'transition',
  'duration',
  'ease',
  'delay',
  'animate',
  'cursor',
  'select',
  'resize',
  'scroll',
  'snap',
  'touch',
  'pointer-events',
  'will-change',
  'appearance',
  'sr-only',
];

function getTwWeight(cls) {
  const base = cls
    .replace(/^(!|-)/, '')
    .replace(
      /^(sm|md|lg|xl|2xl|hover|focus|active|group-hover|dark|disabled|first|last|odd|even):/,
      '',
    )
    .split('-')[0]
    .split(':')
    .pop();
  const idx = TW_ORDER.indexOf(base);
  return idx === -1 ? 500 : idx;
}

async function sortTailwindClasses() {
  const editor = vscode.window.activeTextEditor;
  if (!editor) return;

  const doc = editor.document;
  const text = doc.getText();
  let count = 0;
  const classPattern = /(?:className|class)=["'`]([^"'`]+)["'`]/g;
  const edits = [];
  let match;

  while ((match = classPattern.exec(text)) !== null) {
    const original = match[1];
    const classes = original.trim().split(/\s+/).filter(Boolean);
    if (classes.length < 2) continue;
    const sorted = [...classes].sort((a, b) => getTwWeight(a) - getTwWeight(b));
    if (sorted.join(' ') !== classes.join(' ')) {
      edits.push({
        start: match.index + match[0].indexOf(match[1]),
        len: match[1].length,
        replacement: sorted.join(' '),
      });
      count++;
    }
  }

  if (count === 0) {
    vscode.window.showInformationMessage('AutoChecker: Classes already sorted!');
    return;
  }

  await editor.edit((eb) => {
    for (let i = edits.length - 1; i >= 0; i--) {
      const e = edits[i];
      const startPos = doc.positionAt(e.start);
      const endPos = doc.positionAt(e.start + e.len);
      eb.replace(new vscode.Range(startPos, endPos), e.replacement);
    }
  });
  vscode.window.showInformationMessage(`AutoChecker: Sorted classes in ${count} attributes.`);
}

// ── CSS-to-Tailwind Converter ───────────────────────────────────────────────

const CSS_TO_TW_MAP = {
  'display: flex': 'flex',
  'display: grid': 'grid',
  'display: block': 'block',
  'display: inline': 'inline',
  'display: none': 'hidden',
  'display: inline-flex': 'inline-flex',
  'position: relative': 'relative',
  'position: absolute': 'absolute',
  'position: fixed': 'fixed',
  'position: sticky': 'sticky',
  'text-align: center': 'text-center',
  'text-align: left': 'text-left',
  'text-align: right': 'text-right',
  'font-weight: bold': 'font-bold',
  'font-weight: 700': 'font-bold',
  'font-weight: 600': 'font-semibold',
  'font-weight: 500': 'font-medium',
  'font-weight: 400': 'font-normal',
  'flex-direction: column': 'flex-col',
  'flex-direction: row': 'flex-row',
  'flex-wrap: wrap': 'flex-wrap',
  'justify-content: center': 'justify-center',
  'justify-content: space-between': 'justify-between',
  'justify-content: flex-start': 'justify-start',
  'justify-content: flex-end': 'justify-end',
  'align-items: center': 'items-center',
  'align-items: flex-start': 'items-start',
  'align-items: flex-end': 'items-end',
  'align-items: stretch': 'items-stretch',
  'overflow: hidden': 'overflow-hidden',
  'overflow: auto': 'overflow-auto',
  'overflow: scroll': 'overflow-scroll',
  'cursor: pointer': 'cursor-pointer',
  'cursor: not-allowed': 'cursor-not-allowed',
  'white-space: nowrap': 'whitespace-nowrap',
  'text-decoration: none': 'no-underline',
  'text-decoration: underline': 'underline',
  'width: 100%': 'w-full',
  'height: 100%': 'h-full',
  'width: auto': 'w-auto',
  'height: auto': 'h-auto',
  'border-radius: 50%': 'rounded-full',
  'opacity: 0': 'opacity-0',
  'opacity: 1': 'opacity-100',
};

async function cssToTailwind() {
  const editor = vscode.window.activeTextEditor;
  let cssText;
  if (editor && !editor.selection.isEmpty) {
    cssText = editor.document.getText(editor.selection);
  } else {
    cssText = await vscode.window.showInputBox({
      prompt: 'Paste CSS to convert',
      placeHolder: 'display: flex; justify-content: center;',
    });
  }
  if (!cssText) return;

  const props = cssText
    .split(';')
    .map((p) => p.trim())
    .filter(Boolean);
  const twClasses = [];
  const unconverted = [];

  for (const prop of props) {
    const clean = prop.replace(/\s+/g, ' ').trim();
    if (CSS_TO_TW_MAP[clean]) {
      twClasses.push(CSS_TO_TW_MAP[clean]);
    } else {
      // Try px values: margin: 16px -> m-4, padding: 8px -> p-2
      const pxMatch = clean.match(
        /^(margin|padding|gap|width|height|top|right|bottom|left|border-radius|font-size):\s*(\d+)px$/,
      );
      if (pxMatch) {
        const prefixMap = {
          margin: 'm',
          padding: 'p',
          gap: 'gap',
          width: 'w',
          height: 'h',
          top: 'top',
          right: 'right',
          bottom: 'bottom',
          left: 'left',
          'border-radius': 'rounded',
          'font-size': 'text',
        };
        const prefix = prefixMap[pxMatch[1]];
        const val = parseInt(pxMatch[2]);
        if (prefix === 'text') {
          const sizeMap = {
            12: 'xs',
            14: 'sm',
            16: 'base',
            18: 'lg',
            20: 'xl',
            24: '2xl',
            30: '3xl',
            36: '4xl',
            48: '5xl',
          };
          twClasses.push(`text-${sizeMap[val] || `[${val}px]`}`);
        } else if (prefix === 'rounded') {
          const rMap = {
            0: 'none',
            2: 'sm',
            4: '',
            6: 'md',
            8: 'lg',
            12: 'xl',
            16: '2xl',
            24: '3xl',
          };
          twClasses.push(
            rMap[val] !== undefined
              ? `rounded${rMap[val] ? '-' + rMap[val] : ''}`
              : `rounded-[${val}px]`,
          );
        } else {
          const rem = val / 4;
          twClasses.push(Number.isInteger(rem) ? `${prefix}-${rem}` : `${prefix}-[${val}px]`);
        }
      } else {
        unconverted.push(prop);
      }
    }
  }

  const result = twClasses.join(' ');
  const msg = unconverted.length > 0 ? `\n\n⚠️ Could not convert:\n${unconverted.join('\n')}` : '';

  await vscode.env.clipboard.writeText(result);
  vscode.window.showInformationMessage(
    `AutoChecker: Copied "${result}"${msg ? ' (some props skipped)' : ''}`,
  );
}

// ── Responsive Breakpoint Viewer ────────────────────────────────────────────

async function showBreakpoints() {
  const breakpoints = [
    { label: 'sm (640px)', detail: '@media (min-width: 640px) — Mobile landscape', value: 640 },
    { label: 'md (768px)', detail: '@media (min-width: 768px) — Tablet', value: 768 },
    { label: 'lg (1024px)', detail: '@media (min-width: 1024px) — Laptop', value: 1024 },
    { label: 'xl (1280px)', detail: '@media (min-width: 1280px) — Desktop', value: 1280 },
    { label: '2xl (1536px)', detail: '@media (min-width: 1536px) — Large desktop', value: 1536 },
  ];
  const picked = await vscode.window.showQuickPick(breakpoints, {
    placeHolder: 'Tailwind breakpoints — pick to copy media query',
  });
  if (picked) {
    await vscode.env.clipboard.writeText(`@media (min-width: ${picked.value}px)`);
    vscode.window.showInformationMessage(`AutoChecker: Copied ${picked.label} media query`);
  }
}

module.exports = { TW_ORDER, getTwWeight, sortTailwindClasses, cssToTailwind, showBreakpoints };
