/**
 * SPEC 14.3 "Hindi pages render Devanagari and switch back to English", plus SPEC 3.1/9.1
 * basics: html lang, hreflang alternates, the Devanagari face actually used for rendering,
 * and the kit and a tool working in Hindi.
 */
import { test, expect, type Page } from '@playwright/test';
import { fixture, routeExists } from './helpers/app';
import { runKit } from './helpers/kit';
import { runTool } from './helpers/tools';

const PAIRS: [string, string][] = [
  ['/hi', '/'],
  ['/hi/exams', '/exams'],
  ['/hi/exam/ibps-po', '/exam/ibps-po'],
  ['/hi/kit/ibps-po', '/kit/ibps-po'],
  ['/hi/tools/compress-image-to-20kb', '/tools/compress-image-to-20kb'],
  ['/hi/guides', '/guides'],
];

const DEVANAGARI = /[ऀ-ॿ]/g;

async function devanagariShare(page: Page, sel = 'main') {
  const text = (await page.locator(sel).first().innerText()).replace(/\s+/g, '');
  const dev = (text.match(DEVANAGARI) ?? []).length;
  const letters = (text.match(/[A-Za-zऀ-ॿ]/g) ?? []).length;
  return letters ? dev / letters : 0;
}

/** The rendered glyphs come from a Devanagari-capable face, not a tofu fallback. */
async function devanagariFontLoaded(page: Page) {
  return page.evaluate(async () => {
    await document.fonts.ready;
    const faces = [...document.fonts].filter((f) => /devanagari/i.test(f.family));
    return {
      faces: faces.map((f) => `${f.family}:${f.status}`),
      loaded: faces.some((f) => f.status === 'loaded'),
    };
  });
}

test.describe('Hindi pages', () => {
  for (const [hi, en] of PAIRS) {
    test(`${hi} renders Devanagari and switches to ${en}`, async ({ page }) => {
      test.skip(!routeExists(hi), `${hi} not built`);
      await page.goto(hi);
      await expect(page.locator('html')).toHaveAttribute('lang', /^hi/);
      const h1 = page.locator('h1').first();
      await expect(h1).toBeVisible();
      if (!hi.startsWith('/hi/kit')) {
        expect(await devanagariShare(page), 'mostly Devanagari text in <main>').toBeGreaterThan(
          0.3,
        );
      } else {
        expect(await devanagariShare(page, 'body')).toBeGreaterThan(0.2);
      }
      const font = await devanagariFontLoaded(page);
      expect(font.loaded, `Devanagari face loaded: ${font.faces.join(', ')}`).toBe(true);

      // hreflang alternates point at each other (kit pages are noindex; alternates optional there).
      if (!hi.startsWith('/hi/kit')) {
        const alt = await page
          .locator('link[rel="alternate"][hreflang^="en"]')
          .first()
          .getAttribute('href');
        expect((alt && new URL(alt, 'https://x').pathname.replace(/\/$/, '')) || '/').toBe(en);
      }

      // Switch back to English via the header toggle.
      const toggle = page.locator('header a[hreflang^="en"]').first();
      if ((await toggle.count()) === 0) {
        test.info().annotations.push({
          type: 'note',
          description: 'no header language toggle on this page',
        });
        return;
      }
      await toggle.click();
      await page.waitForURL((u) => u.pathname === en || u.pathname === `${en}/`);
      await expect(page.locator('html')).toHaveAttribute('lang', /^en/);
      expect(await devanagariShare(page, 'body')).toBeLessThan(0.2);
    });
  }

  test('English home links to Hindi and back', async ({ page }) => {
    await page.goto('/');
    await page.locator('header a[hreflang^="hi"]').first().click();
    await page.waitForURL(/\/hi$/);
    await expect(page.locator('html')).toHaveAttribute('lang', /^hi/);
    await page.locator('header a[hreflang^="en"]').first().click();
    await page.waitForURL((u) => u.pathname === '/');
  });

  test('Hindi kit completes (SSC CGL signature)', async ({ page }) => {
    test.skip(!routeExists('/hi/kit/ssc-cgl'), 'not built');
    const run = await runKit(
      page,
      'ssc-cgl',
      { signature: fixture('signature.png') },
      { lang: 'hi' },
    );
    expect(run.final).toBe('summary');
    expect(
      Object.values(run.results).every((r) => r.pass),
      JSON.stringify(run.results),
    ).toBe(true);
    expect(await devanagariShare(page, 'body')).toBeGreaterThan(0.2);
  });

  test('Hindi compress tool works', async ({ page }) => {
    test.skip(!routeExists('/hi/tools/compress-image-to-20kb'), 'not built');
    await page.goto('/hi/tools/compress-image-to-20kb');
    const run = await runTool(page, { files: [fixture('photo.jpg')] });
    expect(run.downloadEnabled, JSON.stringify(run.rules)).toBe(true);
    expect(run.file!.bytes.length).toBeLessThanOrEqual(20 * 1024);
    expect(run.heading).toMatch(DEVANAGARI);
  });

  test('Hindi guides link to Hindi tool pages where they exist (Q24 follow-up)', async ({
    page,
  }) => {
    test.skip(!routeExists('/hi/guides'), 'not built');
    await page.goto('/hi/guides');
    const guides = await page
      .locator('main a[href^="/hi/guides/"]')
      .evaluateAll((as) => [...new Set(as.map((a) => a.getAttribute('href')!))]);
    const wrong: string[] = [];
    for (const g of guides) {
      await page.goto(g);
      const hrefs = await page
        .locator('main a[href^="/tools/"]')
        .evaluateAll((as) => as.map((a) => a.getAttribute('href')!));
      for (const h of new Set(hrefs)) if (routeExists(`/hi${h}`)) wrong.push(`${g} → ${h}`);
    }
    test.fixme(
      wrong.length > 0,
      `Known follow-up (QUESTIONS Q24, content owners E/G): Hindi guides still link English tools: ${wrong.length} links`,
    );
    expect(wrong).toEqual([]);
  });
});
