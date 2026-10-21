/**
 * SPEC 5.3 / 13 / 14.3: after one visit, tools and kit flows work with the network off
 * (PWA precache). Load the home page once, wait for the service worker to finish
 * precaching, go offline, then complete a compress task and a kit document.
 */
import { test, expect, type Page } from '@playwright/test';
import { fixture, waitForServiceWorker } from './helpers/app';
import { runKit } from './helpers/kit';
import { runTool } from './helpers/tools';
import { isJpeg } from './helpers/files';

async function primeOffline(page: Page) {
  await page.goto('/');
  await waitForServiceWorker(page, 60_000);
}

test.describe('offline after first visit', () => {
  test.skip(
    ({ browserName }) => browserName !== 'chromium',
    'offline emulation of SW fetches is Chromium-only in Playwright',
  );

  test('precache holds every tool and kit page', async ({ page }) => {
    await primeOffline(page);
    const urls: string[] = await page.evaluate(async () => {
      const out: string[] = [];
      for (const k of await caches.keys()) {
        const c = await caches.open(k);
        for (const r of await c.keys()) out.push(new URL(r.url).pathname);
      }
      return out;
    });
    for (const p of [
      '/',
      '/offline',
      '/tools/compress-image-to-20kb',
      '/kit/ibps-po',
      '/hi/kit/ibps-po',
    ]) {
      expect(urls, `precached ${p}`).toContain(p);
    }
    expect(
      urls.some((u) => u.endsWith('.wasm')),
      'engine WASM precached',
    ).toBe(true);
  });

  test('compress to 20 KB works offline', async ({ page, context }) => {
    await primeOffline(page);
    await context.setOffline(true);
    await page.goto('/tools/compress-image-to-20kb');
    const run = await runTool(page, { files: [fixture('photo.jpg')] });
    expect(run.downloadEnabled, JSON.stringify(run.rules)).toBe(true);
    expect(isJpeg(run.file!.bytes)).toBe(true);
    expect(run.file!.bytes.length).toBeLessThanOrEqual(20 * 1024);
  });

  test('a kit (SSC CGL signature) completes offline', async ({ page, context }) => {
    await primeOffline(page);
    await context.setOffline(true);
    const run = await runKit(page, 'ssc-cgl', { signature: fixture('signature.png') });
    expect(run.final).toBe('summary');
    expect(
      Object.values(run.results).every((r) => r.pass),
      JSON.stringify(run.results),
    ).toBe(true);
  });

  test('an uncached page falls back to /offline', async ({ page, context }) => {
    await primeOffline(page);
    await context.setOffline(true);
    // Guides are runtime-cached only once visited; this one was never visited.
    const res = await page.goto('/guides/jpg-vs-png-vs-pdf').catch(() => null);
    void res;
    // The app's own /offline page (not Chrome's network error page).
    await expect(page).toHaveTitle(/offline.*SahiSize/i);
  });
});
