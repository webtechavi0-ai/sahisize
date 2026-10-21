/** @type {import('tailwindcss').Config} */
const defaultTheme = require('tailwindcss/defaultTheme');

/** @param {string} name */
const token = (name) => `rgb(var(--color-${name}) / <alpha-value>)`;

module.exports = {
  content: ['./src/**/*.{astro,html,js,jsx,md,mdx,ts,tsx}'],
  // Manual toggle writes <html data-theme="dark|light">; CSS handles the
  // prefers-color-scheme fallback for the tokens (src/styles/global.css).
  darkMode: ['selector', '[data-theme="dark"]'],
  theme: {
    extend: {
      colors: {
        primary: token('primary'),
        'on-primary': token('on-primary'),
        action: { DEFAULT: token('action'), hover: token('action-hover') },
        'action-text': token('action-text'),
        'saffron-text': token('saffron-text'),
        success: { DEFAULT: token('success'), text: token('success-text') },
        error: { DEFAULT: token('error'), text: token('error-text') },
        bg: token('bg'),
        surface: token('surface'),
        text: token('text'),
        muted: token('muted'),
        border: { DEFAULT: token('border'), strong: token('border-strong') },
      },
      fontFamily: {
        sans: ['Inter', 'Noto Sans Devanagari', ...defaultTheme.fontFamily.sans],
        hindi: ['Noto Sans Devanagari', 'Inter', ...defaultTheme.fontFamily.sans],
      },
      borderRadius: {
        card: '12px',
      },
      minHeight: { tap: '48px' },
      minWidth: { tap: '48px' },
      height: { tap: '48px' },
      width: { tap: '48px' },
    },
  },
  plugins: [require('@tailwindcss/typography')],
};
