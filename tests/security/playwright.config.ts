// Playwright config for the Security suite (PLAN 3.12, R7): `npm run test:csp`, or
// `npx playwright test -c tests/security/playwright.config.ts`. Runs against the built site
// (`npm run build` first) served by `astro preview`; csp.spec.ts replays public/_headers on
// every response so the <meta> CSP and the header CSPs are enforced together.
//
// Env: E2E_BASE_URL (test a running server instead), CSP_PORT (default 4861).
import { defineConfig, devices } from '@playwright/test';

const PORT = Number(process.env.CSP_PORT ?? 4861);
const external = process.env.E2E_BASE_URL;
const baseURL = external ?? `http://127.0.0.1:${PORT}`;

export default defineConfig({
  testDir: '.',
  testMatch: '**/*.spec.ts',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: process.env.CI ? 2 : 4,
  timeout: 120_000,
  expect: { timeout: 15_000 },
  reporter: process.env.CI ? [['github'], ['list']] : 'list',
  outputDir: '../../test-results/security',
  use: { baseURL, trace: 'retain-on-failure', acceptDownloads: true },
  projects: [
    { name: 'csp-chromium', use: { ...devices['Pixel 5'], channel: 'chromium' } },
    { name: 'csp-webkit', use: { ...devices['iPhone 12'] } },
  ],
  webServer: external
    ? undefined
    : {
        command: `npm run preview -- --port ${PORT} --host 127.0.0.1`,
        cwd: '../..',
        url: baseURL,
        reuseExistingServer: !process.env.CI,
        timeout: 120_000,
      },
});
