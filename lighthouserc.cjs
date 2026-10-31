// Lighthouse CI (Workstream H; SPEC 13/14.4, PLAN 3.16). `npm run build && npm run lhci`.
// Serves out/ with `serve` so clean URLs resolve as on Cloudflare Pages.
// Locally, point CHROME_PATH at a Chrome/Chromium binary if none is installed system-wide.
const PORT = process.env.LHCI_PORT || '4173';
const BASE = `http://127.0.0.1:${PORT}`;
const KB = 1024;

module.exports = {
  ci: {
    collect: {
      startServerCommand: `npx serve out -l tcp://127.0.0.1:${PORT}`,
      startServerReadyPattern: 'localhost|127\\.0\\.0\\.1',
      startServerReadyTimeout: 60000,
      url: [
        `${BASE}/`,
        `${BASE}/exam/ibps-po`,
        `${BASE}/tools/compress-image-to-20kb`,
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
        'categories:performance': ['error', { minScore: 0.95, aggregationMethod: 'median-run' }],
        'categories:accessibility': ['error', { minScore: 0.95 }],
        'categories:best-practices': ['error', { minScore: 0.95 }],
        'categories:seo': ['error', { minScore: 0.95 }],
        // SPEC 13 budgets as Lighthouse sees them (transfer sizes on first load).
        // scripts/check-budgets.ts enforces JS+CSS ≤ 120 KB gz per page across all of dist/.
        'resource-summary:script:size': ['error', { maxNumericValue: 120 * KB }],
        'resource-summary:stylesheet:size': ['error', { maxNumericValue: 30 * KB }],
        'resource-summary:third-party:count': ['error', { maxNumericValue: 0 }],
        // Engine WASM must not load before a file is picked.
        'resource-summary:other:size': ['warn', { maxNumericValue: 50 * KB }],
        'total-byte-weight': ['error', { maxNumericValue: 300 * KB }],
      },
    },
    upload: { target: 'filesystem', outputDir: './.lighthouseci' },
  },
};
