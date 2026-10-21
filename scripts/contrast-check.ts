/**
 * WCAG AA contrast check for the design tokens in src/styles/global.css (SPEC 3.2).
 * Text pairs need >= 4.5:1; non-text UI pairs (icons, control borders) need >= 3:1.
 * Run: npx tsx scripts/contrast-check.ts
 */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const css = readFileSync(fileURLToPath(new URL('../src/styles/global.css', import.meta.url)), 'utf8');

function block(selector: string): Record<string, string> {
  const start = css.indexOf(selector);
  if (start < 0) throw new Error(`selector not found: ${selector}`);
  const open = css.indexOf('{', start);
  const close = css.indexOf('}', open);
  const out: Record<string, string> = {};
  for (const m of css.slice(open, close).matchAll(/--color-([a-z-]+):[^;]+;\s*\/\*\s*(#[0-9A-Fa-f]{6})\s*\*\//g)) {
    out[m[1]!] = m[2]!;
  }
  return out;
}

function lum(hex: string): number {
  const [r, g, b] = [1, 3, 5].map((i) => {
    const v = parseInt(hex.slice(i, i + 2), 16) / 255;
    return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
  }) as [number, number, number];
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

export function ratio(a: string, b: string): number {
  const [x, y] = [lum(a), lum(b)];
  return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05);
}

const TEXT: [string, string][] = [
  ['text', 'bg'], ['text', 'surface'],
  ['muted', 'bg'], ['muted', 'surface'],
  ['primary', 'bg'], ['primary', 'surface'],
  ['success-text', 'bg'], ['success-text', 'surface'],
  ['error-text', 'bg'], ['error-text', 'surface'],
  ['action-text', 'action'], ['action-text', 'action-hover'],
  ['on-primary', 'primary'],
];
const NON_TEXT: [string, string][] = [
  ['success', 'bg'], ['success', 'surface'],
  ['error', 'bg'], ['error', 'surface'],
  ['border-strong', 'bg'], ['border-strong', 'surface'],
  ['primary', 'bg'],
];
// Not checked: `action` fill vs page bg (2.05:1 light). WCAG 1.4.11 does not require a
// 3:1 boundary when the control is identified by its text label (8.3:1 on the fill).
// Rule: saffron buttons always carry a visible text label; never an icon-only saffron button.

let failed = 0;
for (const [theme, sel] of [['light', ':root {'], ['dark', ":root[data-theme='dark']"]] as const) {
  const t = block(sel);
  console.log(`\n${theme}`);
  for (const [pairs, min] of [[TEXT, 4.5], [NON_TEXT, 3]] as const) {
    for (const [fg, bg] of pairs) {
      const r = ratio(t[fg]!, t[bg]!);
      const ok = r >= min;
      if (!ok) failed++;
      console.log(`${ok ? 'ok  ' : 'FAIL'} ${fg.padEnd(14)} on ${bg.padEnd(13)} ${r.toFixed(2)}:1 (min ${min})`);
    }
  }
}
if (failed) {
  console.error(`\n${failed} pair(s) below WCAG AA`);
  process.exit(1);
}
console.log('\nAll token pairs pass WCAG AA.');
