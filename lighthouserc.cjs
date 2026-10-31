// Lighthouse CI: `npm run build && npm run lhci`.
// Starts the built standalone server (self-contained after the postbuild step).
// Locally, point CHROME_PATH at a Chrome/Chromium binary if none is installed system-wide.
const PORT = process.env.LHCI_PORT || '4173';
const BASE = `http://127.0.0.1:${PORT}`;
const KB = 1024;

module.exports = {
  ci: {
    collect: {
      startServerCommand: `PORT=${PORT} HOSTNAME=127.0.0.1 NODE_ENV=production node .next/standalone/server.js`,
      startServerReadyPattern: 'Ready|started server|Local:',
      startServerReadyTimeout: 60000,
      url: [
        `${BASE}/`,
        `${BASE}/exam/ibps-po`,
        `${BASE}/exam/ibps-po/photo`,
        `${BASE}/tools/compress-image-to-20kb`,
        `${BASE}/guides`,
        `${BASE}/hi`,
      ],
      numberOfRuns: 3,
      settings: {
        // Default Lighthouse mobile emulation (Moto G Power, slow 4G, 4x CPU).
        chromeFlags: '--no-sandbox --headless=new',
      },
    },
    assert: {
      assertions: {
        'categories:performance': ['error', { minScore: 0.9, aggregationMethod: 'median-run' }],
        'categories:accessibility': ['error', { minScore: 0.95 }],
        'categories:best-practices': ['error', { minScore: 0.95 }],
        'categories:seo': ['error', { minScore: 0.95 }],
        // Transfer sizes on first load; scripts/check-budgets.ts enforces the per-page budgets
        // (165 KB JS on content pages, 200 KB on tool pages) across every prerendered page.
        // Lighthouse also counts gtag.js (~100 KB gz), hence the higher ceiling here.
        'resource-summary:script:size': ['error', { maxNumericValue: 330 * KB }],
        'resource-summary:stylesheet:size': ['error', { maxNumericValue: 30 * KB }],
        // gtag.js is the only third party (script + collect beacon).
        'resource-summary:third-party:count': ['warn', { maxNumericValue: 3 }],
        // Engine WASM must not load before a file is picked.
        'resource-summary:other:size': ['warn', { maxNumericValue: 50 * KB }],
        'total-byte-weight': ['error', { maxNumericValue: 560 * KB }],
      },
    },
    upload: { target: 'filesystem', outputDir: './.lighthouseci' },
  },
};
