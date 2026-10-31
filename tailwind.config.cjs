/**
 * Tailwind CSS 3.4 configuration.
 *
 * DESIGN TOKENS
 * Colour tokens are CSS custom properties defined in src/styles/globals.css:
 *   - light theme inside `:root { ... }`
 *   - dark theme inside `:root[data-theme='dark'] { ... }` (it inherits tokens it omits)
 * Each token is written as space-separated RGB channels followed by its hex value in a comment:
 *   --ink: 30 42 120; /* #1E2A78 *\/
 * scripts/contrast-check.ts (`npm run check:contrast`) parses exactly that format, so keep it.
 * Map tokens to Tailwind colours with the `token()` helper below.
 *
 * @type {import('tailwindcss').Config}
 */

/** @param {string} name CSS variable name without the leading `--`. */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const token = (name) => `rgb(var(--${name}) / <alpha-value>)`;

module.exports = {
  content: ['./src/**/*.{ts,tsx,mdx}', './src/content/**/*.json'],
  // Light by default; the pre-paint theme script sets <html data-theme="dark"> for a stored
  // dark choice. `dark:` variants key off the same attribute.
  darkMode: ['selector', '[data-theme="dark"]'],
  theme: {
    extend: {
      // ===== DESIGN TOKENS: owned by the design-system agent (start) =====
      // colors: { ink: { DEFAULT: token('ink'), hover: token('ink-hover') }, ... },
      // fontFamily, borderRadius, boxShadow, screens, spacing ...
      // ===== DESIGN TOKENS (end) =====
    },
  },
  plugins: [require('@tailwindcss/typography')],
};
