/**
 * Govt ID Documents section, rendered (owner rules 2, 4, 5, 6):
 *  - every page shows the disclaimer (top and foot), an https source link on an official
 *    domain and "Checked on 22 Oct 2026"
 *  - no field that could take a PAN or Aadhaar number
 *  - a full photo run leaves IndexedDB and localStorage as they were (persistence off)
 */
import { test, expect, type Page } from '@playwright/test';
import { fixture, routeExists } from './helpers/app';
import { runTool } from './helpers/tools';

const DISCLAIMER = 'Not affiliated with NSDL, UTIITSL or UIDAI. Please verify on the official website.';
const OFFICIAL = /^https:\/\/([a-z0-9-]+\.)*(proteantech\.in|nsdl\.com|utiitsl\.com|uidai\.gov\.in)\//;

const ROUTES = [
  { route: '/id-documents', hi: false },
  { route: '/id-documents/pan-card-photo-size', hi: false },
  { route: '/id-documents/pan-card-signature-size', hi: false },
  { route: '/hi/id-documents', hi: true },
  { route: '/hi/id-documents/pan-card-photo-size', hi: true },
];

async function noIdNumberFields(page: Page) {
  const bad = await page.evaluate(() =>
    [...document.querySelectorAll('input, textarea, [contenteditable="true"]')]
      .filter((el) => {
        const type = (el.getAttribute('type') ?? 'text').toLowerCase();
        return !(el instanceof HTMLInputElement) || !['file', 'number', 'range', 'checkbox', 'radio', 'hidden'].includes(type);
      })
      .map((el) => el.outerHTML.slice(0, 120)),
  );
  expect(bad, 'free-text fields on an id-documents page').toEqual([]);
}

test.describe('Govt ID Documents pages', () => {
  for (const r of ROUTES) {
    test(`${r.route}: disclaimer, official source, checked date, no ID fields`, async ({ page }) => {
      test.skip(!routeExists(r.route), 'route not built yet');
      await page.goto(r.route);
      await expect(page.locator('[data-id-disclaimer]')).toHaveCount(2);
      await expect(page.locator('[data-id-disclaimer="top"]')).toContainText(DISCLAIMER);
      await expect(page.locator('[data-id-disclaimer="bottom"]')).toContainText(DISCLAIMER);
      if (r.hi) await expect(page.locator('[data-id-disclaimer="top"]')).toContainText('कृपया आधिकारिक वेबसाइट पर जाँच लें');
      const sources = await page.locator('a[data-id-source]').evaluateAll((as) => as.map((a) => a.getAttribute('href') ?? ''));
      expect(sources.length).toBeGreaterThan(0);
      for (const s of sources) expect(s).toMatch(OFFICIAL);
      await expect(page.locator('body')).toContainText('Checked on 22 Oct 2026');
      await expect(page.locator('h1')).toHaveCount(1);
      // Not listed as an exam, and no government structured data.
      const ld = await page.locator('script[type="application/ld+json"]').allInnerTexts();
      expect(ld.join('\n')).not.toMatch(/Government(Service|Organization)/);
      await noIdNumberFields(page);
    });
  }

  for (const vp of [
    { width: 390, height: 844 },
    { width: 360, height: 640 },
  ]) {
    test(`upload button is above the fold at ${vp.width}×${vp.height}, with the compact disclaimer above it`, async ({ page }) => {
      await page.setViewportSize(vp);
      for (const r of ROUTES.filter((x) => x.route.includes('pan-card'))) {
        if (!routeExists(r.route)) continue;
        await page.goto(r.route);
        const top = page.locator('[data-id-disclaimer="top"]');
        await expect(top.locator('a[data-id-source]')).toBeVisible();
        await expect(top.locator('[data-id-checked]')).toBeVisible();
        const btn = page.locator('[data-tool-slot] button').first();
        await expect(btn).toBeVisible({ timeout: 30_000 });
        const box = (await btn.boundingBox())!;
        expect(box.y + box.height, r.route).toBeLessThanOrEqual(vp.height);
        expect((await top.boundingBox())!.y, r.route).toBeLessThan(box.y);
      }
    });
  }

  test('photo run stores nothing in IndexedDB or localStorage', async ({ page }) => {
    test.setTimeout(120_000);
    const route = '/id-documents/pan-card-photo-size';
    test.skip(!routeExists(route), 'route not built yet');
    await page.goto(route);
    const snapshot = () =>
      page.evaluate(async () => ({
        ls: Object.keys(localStorage).sort(),
        ss: Object.keys(sessionStorage).sort(),
        // Workbox keeps its own cache-expiry DB for page caching; anything else is ours.
        idb: ((await indexedDB.databases?.()) ?? []).map((d) => d.name ?? '').filter((n) => !/^workbox/.test(n)).sort(),
      }));
    const before = await snapshot();
    const run = await runTool(page, { files: [fixture('photo.jpg')] });
    expect(run.rules.size?.pass ?? true).toBe(true);
    await noIdNumberFields(page);
    expect(await snapshot()).toEqual(before);
    expect(before.idb).toEqual([]);
  });
});
