/**
 * Tailwind CSS 3.4 configuration.
 *
 * DESIGN TOKENS
 * Colour tokens are CSS custom properties defined in src/styles/global.css:
 *   - light theme inside `:root { ... }`
 *   - dark theme inside `:root[data-theme='dark'] { ... }` (it inherits tokens it omits)
 * Each token is written as space-separated RGB channels followed by its hex value in a comment:
 *   --ink: 30 42 120; /* #1E2A78 *\/
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
        // "Exam Hall" palette.
        ink: { DEFAULT: token('ink'), hover: token('ink-hover') },
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
        margin: token('margin-line'),
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
        sans: ['Inter', 'Noto Sans Devanagari', ...defaultTheme.fontFamily.sans],
        hindi: ['Noto Sans Devanagari', 'Inter', ...defaultTheme.fontFamily.sans],
      },
      borderRadius: {
        card: '12px',
      },
      boxShadow: {
        btn: '0 1px 2px rgb(var(--shadow-rgb) / 0.12), 0 1px 1px rgb(var(--shadow-rgb) / 0.06)',
        'btn-hover': '0 4px 10px -2px rgb(var(--shadow-rgb) / 0.22)',
        lift: '0 10px 30px -12px rgb(var(--shadow-rgb) / 0.25)',
      },
      minHeight: { tap: '48px' },
      minWidth: { tap: '48px' },
      height: { tap: '48px' },
      width: { tap: '48px' },
    },
  },
  plugins: [require('@tailwindcss/typography')],
};
