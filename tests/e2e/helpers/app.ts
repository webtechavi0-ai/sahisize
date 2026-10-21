/**
 * Shared Playwright helpers for the SahiSize e2e suites (Workstream H).
 */
import { readFileSync, existsSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { BrowserContext, Page, TestInfo } from '@playwright/test';

export const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../../..');
export const FIX = join(ROOT, 'tests/fixtures/e2e');
export const fixture = (name: string) => join(FIX, name);

/** Built site served by the webServer; used to discover which routes exist. */
export const DIST = process.env.E2E_DIST ?? join(ROOT, 'dist');

export interface PresetDoc {
  doc: string;
  slug?: string;
  widthPx: number | null;
  heightPx: number | null;
  minKB: number | null;
  maxKB: number | null;
  format: 'jpg' | 'png' | 'pdf';
  dpi: number | null;
  fileName: string;
  label: { en: string; hi: string };
}

export function preset(slug: string): { slug: string; documents: PresetDoc[] } {
  return JSON.parse(readFileSync(join(ROOT, 'src/content/presets', `${slug}.json`), 'utf8'));
}

/** True when the built site has a page for `route` (Cloudflare clean URL → .html file). */
export function routeExists(route: string): boolean {
  const clean = route.replace(/\?.*$/, '').replace(/\/$/, '');
  if (clean === '') return existsSync(join(DIST, 'index.html'));
  return existsSync(join(DIST, `${clean}.html`)) || existsSync(join(DIST, clean, 'index.html'));
}

/** Chrome DevTools "Fast 4G" (chrome-devtools-frontend NetworkManager). */
export const FAST_4G = {
  offline: false,
  latency: 60 * 2.75,
  downloadThroughput: ((9 * 1000 * 1000) / 8) * 0.9,
  uploadThroughput: ((1.5 * 1000 * 1000) / 8) * 0.9,
};

/**
 * SPEC 5.1 acceptance conditions: 4× CPU slowdown + Fast 4G via CDP. Chromium only;
 * returns false on other engines (the caller annotates the test).
 */
export async function throttle(page: Page, ctx: BrowserContext, cpuRate = 4): Promise<boolean> {
  if (ctx.browser()?.browserType().name() !== 'chromium') return false;
  const cdp = await ctx.newCDPSession(page);
  await cdp.send('Emulation.setCPUThrottlingRate', { rate: cpuRate });
  await cdp.send('Network.enable');
  await cdp.send('Network.emulateNetworkConditions', FAST_4G);
  return true;
}

export const isChromium = (ctx: BrowserContext) => ctx.browser()?.browserType().name() === 'chromium';

/** Sticky bottom action bar of KitFlow (one primary button). */
export const kitAction = (page: Page) => page.locator('div.sticky.bottom-0 button').first();

export const kitScreen = (page: Page) => page.getAttribute('[data-screen]', 'data-screen');

export async function waitScreenNot(page: Page, s: string, timeout = 60_000) {
  await page.waitForFunction(
    (x) => document.querySelector('[data-screen]')?.getAttribute('data-screen') !== x,
    s,
    { timeout },
  );
}

/** Wait for the service worker to install (precache done), activate and control the page. */
export async function waitForServiceWorker(page: Page, timeout = 30_000) {
  const until = Date.now() + timeout;
  const state = () =>
    page.evaluate(async () => {
      const reg = await navigator.serviceWorker?.getRegistration();
      return { active: !!reg?.active, controlled: !!navigator.serviceWorker?.controller };
    });
  let s = await state();
  while (!s.active && Date.now() < until) {
    await page.waitForTimeout(250);
    s = await state();
  }
  if (!s.active) throw new Error('service worker never activated');
  if (!s.controlled) {
    await page.reload();
    while (!(s = await state()).controlled && Date.now() < until) await page.waitForTimeout(250);
    if (!s.controlled) throw new Error('service worker does not control the page after reload');
  }
}

/** Download → Buffer. */
export async function downloadBytes(page: Page, click: () => Promise<unknown>, timeout = 30_000) {
  const [dl] = await Promise.all([page.waitForEvent('download', { timeout }), click()]);
  const path = await dl.path();
  return { name: dl.suggestedFilename(), bytes: new Uint8Array(readFileSync(path!)) };
}

export function attachJson(info: TestInfo, name: string, data: unknown) {
  return info.attach(name, { body: JSON.stringify(data, null, 2), contentType: 'application/json' });
}

/** Collect console errors and page errors for diagnostics. */
export function collectErrors(page: Page): string[] {
  const out: string[] = [];
  page.on('console', (m) => m.type() === 'error' && out.push(`console: ${m.text()}`));
  page.on('pageerror', (e) => out.push(`pageerror: ${e.message}`));
  return out;
}
