/**
 * WCAG AA contrast gate for the colour design tokens.
 *
 * Tokens live in src/styles/globals.css (documented in tailwind.config.cjs):
 *   light: `:root { ... }`   dark: `:root[data-theme='dark'] { ... }` (inherits omitted tokens)
 * Each token line must keep its hex value in a trailing comment:
 *   --ink: 30 42 120; /* #1E2A78 *\/
 *
 * Text pairs need >= 4.5:1; non-text UI pairs (icons, control borders) need >= 3:1; tinted
 * backgrounds are composited over both page backgrounds before the text ratio is taken.
 * A pair that names a token missing from the file fails: keep the lists below in sync with the
 * design system when tokens are renamed.
 *
 *   npm run check:contrast
 *   tsx scripts/contrast-check.ts [path/to/tokens.css]
 */
import { existsSync, readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';

const ROOT = resolve(import.meta.dirname, '..');
const TOKENS_FILE = resolve(process.argv[2] ?? join(ROOT, 'src', 'styles', 'globals.css'));

const LIGHT_SELECTOR = /:root\s*\{/;
const DARK_SELECTOR = /:root\[data-theme=(['"])dark\1\]\s*\{/;

/** Text on background: >= 4.5:1. */
export const TEXT_PAIRS: [fg: string, bg: string][] = [
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

/** Non-text UI (icons, control borders, focus rings): >= 3:1. */
export const NON_TEXT_PAIRS: [fg: string, bg: string][] = [
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
 * Tinted backgrounds (`bg-TINT/ALPHA text-FG`). `fgDark`/`alphaDark` override in dark mode.
 * Keep in sync with tinted-background + text combinations used by components.
 */
export const TINTED: {
  fg: string;
  tint: string;
  alpha: number;
  fgDark?: string;
  alphaDark?: number;
  where: string;
}[] = [
  { fg: 'chalk-text', tint: 'chalk', alpha: 0.15, where: 'pass badge, done icon' },
  { fg: 'danger-text', tint: 'danger', alpha: 0.15, where: 'fail badge' },
  {
    fg: 'ink',
    tint: 'saffron',
    alpha: 0.55,
    fgDark: 'text',
    alphaDark: 0.35,
    where: 'hero marker',
  },
  { fg: 'text', tint: 'paper', alpha: 0.95, where: 'sticky download bar (bg-paper/95)' },
];

// Not checked on purpose: the saffron fill against the page (~2:1 in light). WCAG 1.4.11 does
// not require a 3:1 boundary when the control is identified by its text label. Rule: saffron
// buttons always carry a visible text label; never an icon-only saffron button.

type Tokens = Record<string, string>;

function readBlock(css: string, selector: RegExp): Tokens | null {
  const m = selector.exec(css);
  if (!m) return null;
  const open = m.index + m[0].length - 1;
  const close = css.indexOf('}', open);
  const out: Tokens = {};
  const body = css.slice(open + 1, close < 0 ? undefined : close);
  for (const t of body.matchAll(/--([a-z0-9-]+)\s*:[^;]+;\s*\/\*\s*(#[0-9A-Fa-f]{6})\s*\*\//g)) {
    out[t[1]!] = t[2]!.toUpperCase();
  }
  return out;
}

function luminance(hex: string): number {
  const [r, g, b] = [1, 3, 5].map((i) => {
    const v = parseInt(hex.slice(i, i + 2), 16) / 255;
    return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
  }) as [number, number, number];
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

export function ratio(a: string, b: string): number {
  const [x, y] = [luminance(a), luminance(b)];
  return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05);
}

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

function main(): void {
  if (!existsSync(TOKENS_FILE)) {
    console.error(`contrast-check: token file not found: ${TOKENS_FILE}`);
    process.exit(2);
  }
  const css = readFileSync(TOKENS_FILE, 'utf8');
  const light = readBlock(css, LIGHT_SELECTOR);
  if (!light || !Object.keys(light).length) {
    console.error(
      `contrast-check: no ":root { --name: R G B; /* #RRGGBB */ }" tokens in ${TOKENS_FILE}`,
    );
    process.exit(2);
  }
  const dark = readBlock(css, DARK_SELECTOR);
  const themes: [string, Tokens][] = [['light', light]];
  if (dark) themes.push(['dark', { ...light, ...dark }]);
  else console.warn("contrast-check: no :root[data-theme='dark'] block; checking light only");

  let failed = 0;
  const line = (ok: boolean, fg: string, on: string, r: number | null, min: number) => {
    if (!ok) failed++;
    const shown = r === null ? 'missing token' : `${r.toFixed(2)}:1`;
    console.log(
      `${ok ? 'ok  ' : 'FAIL'} ${fg.padEnd(14)} on ${on.padEnd(26)} ${shown} (min ${min})`,
    );
  };

  for (const [theme, t] of themes) {
    console.log(`\n${theme}`);
    for (const [pairs, min] of [
      [TEXT_PAIRS, 4.5],
      [NON_TEXT_PAIRS, 3],
    ] as const) {
      for (const [fg, bg] of pairs) {
        const a = t[fg];
        const b = t[bg];
        const r = a && b ? ratio(a, b) : null;
        line(r !== null && r >= min, fg, bg, r, min);
      }
    }
    for (const { fg: f, tint, alpha: a, fgDark, alphaDark } of TINTED) {
      const isDark = theme === 'dark';
      const alpha = isDark && alphaDark !== undefined ? alphaDark : a;
      const fg = isDark && fgDark ? fgDark : f;
      for (const page of ['paper', 'card']) {
        const label = `${tint}/${Math.round(alpha * 100)} over ${page}`;
        const [fgHex, tintHex, pageHex] = [t[fg], t[tint], t[page]];
        const r =
          fgHex && tintHex && pageHex ? ratio(fgHex, composite(tintHex, alpha, pageHex)) : null;
        line(r !== null && r >= 4.5, fg, label, r, 4.5);
      }
    }
  }

  if (failed) {
    console.error(`\n${failed} pair(s) below WCAG AA (or missing tokens)`);
    process.exit(1);
  }
  console.log('\nAll token pairs pass WCAG AA.');
}

main();
