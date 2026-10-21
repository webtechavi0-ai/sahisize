// `npm run icons` generates favicon.ico and the PWA PNGs from public/icon.svg.
// Run once and commit the output (PLAN 1.3). Output names match PLAN section 2.
import { defineConfig, minimal2023Preset } from '@vite-pwa/assets-generator/config';

const BG = '#F8FAFC';

export default defineConfig({
  headLinkOptions: { preset: '2023' },
  preset: {
    ...minimal2023Preset,
    transparent: { ...minimal2023Preset.transparent, sizes: [192, 512], favicons: [[48, 'favicon.ico']] },
    maskable: { sizes: [512], padding: 0.3, resizeOptions: { background: BG } },
    apple: { sizes: [180], padding: 0.3, resizeOptions: { background: BG } },
    assetName: (type, size) => {
      if (type === 'maskable') return `pwa-maskable-${size.width}.png`;
      if (type === 'apple') return 'apple-touch-icon.png';
      return `pwa-${size.width}.png`;
    },
  },
  images: ['public/icon.svg'],
});
