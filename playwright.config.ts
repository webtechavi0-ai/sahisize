// Playwright e2e config (Workstream H, SPEC 14.3). Runs against the built site:
// `npm run build && npm run test:e2e` starts `npm run preview` on dist/.
//
// Env:
//   E2E_BASE_URL  test an already running server instead (no webServer is started)
//   E2E_DIST      the dist/ directory that server serves (route detection in tools.spec)
//   E2E_WORKERS   override the worker count (perf numbers are noisier with more workers)
import { defineConfig, devices } from '@playwright/test';

const PORT = Number(process.env.E2E_PORT ?? 4321);
const external = process.env.E2E_BASE_URL;
const baseURL = external ?? `http://127.0.0.1:${PORT}`;

export default defineConfig({
  testDir: 'tests/e2e',
  testMatch: '**/*.spec.ts',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: process.env.E2E_WORKERS ? Number(process.env.E2E_WORKERS) : process.env.CI ? 2 : 4,
  timeout: 120_000,
  expect: { timeout: 15_000 },
  reporter: process.env.CI ? [['github'], ['html', { open: 'never' }], ['list']] : 'list',
  use: {
    baseURL,
    trace: 'retain-on-failure',
    acceptDownloads: true,
  },
  // channel 'chromium' = full Chromium in new headless mode (closer to Chrome Android than
  // the headless shell; also what is installed locally).
  projects: [
    // Main project: SPEC 5.1 / 14.3 mobile emulation. Every suite except perf runs here.
    {
      name: 'mobile-chrome',
      use: { ...devices['Pixel 5'], channel: 'chromium' },
      testIgnore: ['perf-fit.spec.ts'],
    },
    // Timing-sensitive: run alone (`--project perf --workers 1`), see perf-fit.spec.ts.
    {
      name: 'perf',
      use: { ...devices['Pixel 5'], channel: 'chromium' },
      testMatch: ['perf-fit.spec.ts'],
    },
    // Desktop layout: tools, a11y, Hindi switch (keyboard and wide layout).
    {
      name: 'desktop-chrome',
      use: { ...devices['Desktop Chrome'], channel: 'chromium' },
      testMatch: ['tools.spec.ts', 'a11y.spec.ts', 'hindi.spec.ts'],
    },
    // SPEC 13 browsers: Safari iOS smoke (kit + one tool), tagged @smoke.
    {
      name: 'webkit-iphone12',
      use: { ...devices['iPhone 12'] },
      grep: /@smoke/,
    },
  ],
  webServer: external
    ? undefined
    : {
        command: `npm run preview -- --port ${PORT} --host 127.0.0.1`,
        url: baseURL,
        reuseExistingServer: !process.env.CI,
        timeout: 120_000,
      },
});
