/**
 * Tailwind CSS 3.4 configuration.
 *
 * DESIGN TOKENS
 * Colour tokens are CSS custom properties defined in src/styles/global.css:
 *   - light theme inside `:root { ... }`
 *   - dark theme inside `:root[data-theme='dark'] { ... }` (it inherits tokens it omits)
 * Each token is written as space-separated RGB channels followed by its hex value in a comment:
 *   --ink: 67 56 202; /* #4338CA *\/
 * scripts/contrast-check.ts (`npm run check:contrast`) parses exactly that format, so keep it.
 * Map tokens to Tailwind colours with the `token()` helper below.
 *
 * @type {import('tailwindcss').Config}
 */

const defaultTheme = require('tailwindcss/defaultTheme');

/** @param {string} name CSS variable name without the leading `--`. */
const token = (name) => `rgb(var(--${name}) / <alpha-value>)`;

module.exports = {
  content: ['./src/**/*.{ts,tsx,mdx}', './src/content/**/*.json'],
  // Light by default; the pre-paint theme script sets <html data-theme="dark"> for a stored
  // dark choice. `dark:` variants key off the same attribute.
  darkMode: ['selector', '[data-theme="dark"]'],
  theme: {
    extend: {
      // >=1440px: wide layouts.
      screens: { wide: '1440px' },
      colors: {
        // "Clear Desk" palette (docs/design/home-redesign-spec.md §1).
        ink: { DEFAULT: token('ink'), hover: token('ink-hover'), soft: token('ink-soft') },
        heading: token('heading'),
        band: token('band'),
        'on-ink': token('on-ink'),
        saffron: {
          DEFAULT: token('saffron'),
          hover: token('saffron-hover'),
          soft: token('saffron-soft'),
          text: token('saffron-text'),
        },
        'on-saffron': token('on-saffron'),
        chalk: { DEFAULT: token('chalk'), soft: token('chalk-soft'), text: token('chalk-text') },
        paper: token('paper'),
        card: token('card'),
        rule: { DEFAULT: token('rule'), strong: token('rule-strong') },
        danger: { DEFAULT: token('danger'), text: token('danger-text') },
        scrim: token('scrim'),
        'on-scrim': token('on-scrim'),
        sheet: { DEFAULT: token('sheet'), check: token('sheet-check') },
        text: token('text'),
        muted: token('text-muted'),
        // Legacy semantic names (SPEC 3.2), aliased to the palette so every component follows it.
        primary: token('ink'),
        'on-primary': token('on-ink'),
        action: { DEFAULT: token('saffron'), hover: token('saffron-hover') },
        'action-text': token('on-saffron'),
        success: { DEFAULT: token('chalk'), text: token('chalk-text') },
        error: { DEFAULT: token('danger'), text: token('danger-text') },
        bg: token('paper'),
        surface: token('card'),
        border: { DEFAULT: token('rule'), strong: token('rule-strong') },
      },
      fontFamily: {
        sans: ['Inter', '"Inter Fallback"', 'Noto Sans Devanagari', ...defaultTheme.fontFamily.sans],
        hindi: ['Noto Sans Devanagari', 'Inter', '"Inter Fallback"', ...defaultTheme.fontFamily.sans],
      },
      // Type scale (spec §3.2). 700 is the heaviest weight shipped: never font-extrabold/black.
      // Hindi overrides (line height, tracking, hero size) live in global.css.
      fontSize: {
        hero: ['clamp(1.75rem, 1.35rem + 1.8vw, 2.75rem)', { lineHeight: '1.15', letterSpacing: '-0.025em', fontWeight: '700' }],
        h1: ['clamp(1.5rem, 1.25rem + 1.1vw, 2.25rem)', { lineHeight: '1.2', letterSpacing: '-0.02em', fontWeight: '700' }],
        h2: ['clamp(1.25rem, 1.1rem + 0.6vw, 1.625rem)', { lineHeight: '1.25', letterSpacing: '-0.015em', fontWeight: '700' }],
        h3: ['1.0625rem', { lineHeight: '1.35', fontWeight: '700' }],
        lead: ['clamp(1.0625rem, 1rem + 0.25vw, 1.1875rem)', { lineHeight: '1.5' }],
        stat: ['clamp(1.625rem, 1.4rem + 0.8vw, 2rem)', { lineHeight: '1', letterSpacing: '-0.02em', fontWeight: '700' }],
      },
      borderRadius: {
        card: '16px',
      },
      boxShadow: {
        btn: '0 1px 2px rgb(var(--shadow-rgb) / 0.12), inset 0 -2px 0 rgb(0 0 0 / 0.08)',
        'btn-hover': '0 6px 16px -6px rgb(var(--shadow-rgb) / 0.30)',
        e1: '0 1px 2px rgb(var(--shadow-rgb) / 0.06), 0 1px 3px rgb(var(--shadow-rgb) / 0.08)',
        e2: '0 10px 28px -12px rgb(var(--shadow-rgb) / 0.28)',
        e3: '0 24px 48px -16px rgb(var(--shadow-rgb) / 0.30)',
        // Alias of e2 so older uses follow.
        lift: '0 10px 28px -12px rgb(var(--shadow-rgb) / 0.28)',
      },
      minHeight: { tap: '48px' },
      minWidth: { tap: '48px' },
      height: { tap: '48px' },
      width: { tap: '48px' },
    },
  },
  plugins: [require('@tailwindcss/typography')],
};
