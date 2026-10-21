/**
 * WCAG AA contrast check for the design tokens in src/styles/global.css (SPEC 3.2).
 * Text pairs need >= 4.5:1; non-text UI pairs (icons, control borders) need >= 3:1.
 * Run: npx tsx scripts/contrast-check.ts
 */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const css = readFileSync(
  fileURLToPath(new URL('../src/styles/global.css', import.meta.url)),
  'utf8',
);

function block(selector: string): Record<string, string> {
  const start = css.indexOf(selector);
  if (start < 0) throw new Error(`selector not found: ${selector}`);
  const open = css.indexOf('{', start);
  const close = css.indexOf('}', open);
  const out: Record<string, string> = {};
  for (const m of css
    .slice(open, close)
    .matchAll(/--([a-z-]+):[^;]+;\s*\/\*\s*(#[0-9A-Fa-f]{6})\s*\*\//g)) {
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
  ['text', 'paper'],
  ['text', 'card'],
  ['text-muted', 'paper'],
  ['text-muted', 'card'],
  ['ink', 'paper'],
  ['ink', 'card'],
  ['chalk-text', 'paper'],
  ['chalk-text', 'card'],
  ['danger-text', 'paper'],
  ['danger-text', 'card'],
  ['saffron-text', 'paper'],
  ['saffron-text', 'card'],
  // Filled buttons and chips.
  ['on-saffron', 'saffron'],
  ['on-saffron', 'saffron-hover'],
  ['on-ink', 'ink'],
  ['on-ink', 'ink-hover'],
  // Soft tinted backgrounds: chip hover, tips, trust pill, PASS stamp, promo card.
  ['text', 'saffron-soft'],
  ['ink', 'saffron-soft'],
  ['saffron-text', 'saffron-soft'],
  ['text', 'chalk-soft'],
  ['chalk-text', 'chalk-soft'],
  ['ink', 'chalk-soft'],
  // Full-screen viewer: caption and buttons on the backdrop.
  ['on-scrim', 'scrim'],
];
const NON_TEXT: [string, string][] = [
  ['chalk', 'paper'],
  ['chalk', 'card'],
  ['chalk', 'chalk-soft'],
  ['danger', 'paper'],
  ['danger', 'card'],
  ['rule-strong', 'paper'],
  ['rule-strong', 'card'],
  ['ink', 'paper'],
  ['ink', 'card'],
  ['ink', 'saffron-soft'],
];
/**
 * Tinted backgrounds (class "bg-TINT/ALPHA text-FG"): the tint is composited over both page
 * backgrounds (paper and card) before the text ratio is taken. `alphaDark` overrides the alpha
 * (and `fgDark` the text) in dark mode. Keep this list in sync with the tinted-background + text pairs in components.
 */
export const TINTED: {
  fg: string;
  tint: string;
  alpha: number;
  /** Dark-mode overrides. */
  fgDark?: string;
  alphaDark?: number;
  where: string;
}[] = [
  { fg: 'chalk-text', tint: 'chalk', alpha: 0.15, where: 'PassCheck badge, DocCard done icon' },
  { fg: 'danger-text', tint: 'danger', alpha: 0.15, where: 'PassCheck badge' },
  { fg: 'ink', tint: 'saffron', alpha: 0.55, fgDark: 'text', alphaDark: 0.35, where: 'hero .marker' },
  { fg: 'text', tint: 'paper', alpha: 0.95, where: 'sticky Download bar (bg-paper/95)' },
];

export function composite(fg: string, alpha: number, bg: string): string {
  const ch = (h: string, i: number) => parseInt(h.slice(i, i + 2), 16);
  return (
    '#' +
    [1, 3, 5]
      .map((i) => Math.round(ch(fg, i) * alpha + ch(bg, i) * (1 - alpha)))
      .map((v) => v.toString(16).padStart(2, '0'))
      .join('')
  );
}

// Not checked: `saffron` fill vs page paper (~2:1 light). WCAG 1.4.11 does not require a
// 3:1 boundary when the control is identified by its text label (5.9:1 on the fill).
// Rule: saffron buttons always carry a visible text label; never an icon-only saffron button.

const light = block(':root {');
let failed = 0;
for (const [theme, sel] of [
  ['light', ':root {'],
  ['dark', ":root[data-theme='dark']"],
] as const) {
  // Dark inherits tokens it does not redefine (scrim, sheet).
  const t = { ...light, ...block(sel) };
  console.log(`\n${theme}`);
  for (const [pairs, min] of [
    [TEXT, 4.5],
    [NON_TEXT, 3],
  ] as const) {
    for (const [fg, bg] of pairs) {
      const r = ratio(t[fg]!, t[bg]!);
      const ok = r >= min;
      if (!ok) failed++;
      console.log(
        `${ok ? 'ok  ' : 'FAIL'} ${fg.padEnd(14)} on ${bg.padEnd(13)} ${r.toFixed(2)}:1 (min ${min})`,
      );
    }
  }
  for (const { fg: f, tint, alpha: a, fgDark, alphaDark } of TINTED) {
    const dark = theme === 'dark';
    const alpha = dark && alphaDark !== undefined ? alphaDark : a;
    const fg = dark && fgDark ? fgDark : f;
    for (const page of ['paper', 'card']) {
      const under = composite(t[tint]!, alpha, t[page]!);
      const r = ratio(t[fg]!, under);
      const ok = r >= 4.5;
      if (!ok) failed++;
      const label = `${tint}/${Math.round(alpha * 100)} over ${page}`;
      console.log(`${ok ? 'ok  ' : 'FAIL'} ${fg.padEnd(14)} on ${label.padEnd(24)} ${r.toFixed(2)}:1 (min 4.5)`);
    }
  }
}
if (failed) {
  console.error(`\n${failed} pair(s) below WCAG AA`);
  process.exit(1);
}
console.log('\nAll token pairs pass WCAG AA.');
