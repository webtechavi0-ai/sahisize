/**
 * Visual-design behaviour: light default theme, stored dark theme without a flash, no
 * horizontal scroll at common widths, the full-screen preview, ExamPilot promo placement
 * and the dismissible home banner.
 */
import { test, expect, type Page } from '@playwright/test';
import { fixture } from './helpers/app';
import { hydrateIsland, resultPanel } from './helpers/tools';

const DARK_PAPER = 'rgb(14, 20, 48)';
const LIGHT_PAPER = 'rgb(255, 251, 243)';

async function compressTo20(page: Page) {
  await page.goto('/tools/compress-image-to-20kb');
  await hydrateIsland(page);
  await page.locator('[data-testid="gallery-input"]').first().setInputFiles(fixture('photo.jpg'));
  await expect(resultPanel(page)).toBeVisible({ timeout: 60_000 });
}

test.describe('theme', () => {
  test('light by default even when the OS prefers dark', async ({ browser, baseURL }) => {
    const ctx = await browser.newContext({ baseURL, colorScheme: 'dark' });
    const page = await ctx.newPage();
    await page.goto('/');
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
    expect(await page.evaluate(() => getComputedStyle(document.body).backgroundColor)).toBe(
      LIGHT_PAPER,
    );
    await ctx.close();
  });

  test('a stored dark choice applies before first paint', async ({ browser, baseURL }) => {
    const ctx = await browser.newContext({ baseURL, colorScheme: 'light' });
    await ctx.addInitScript(() => {
      localStorage.setItem('sahisize:theme', 'dark');
      // Record the theme at the moment <body> is inserted, i.e. before anything can paint.
      new MutationObserver((_, obs) => {
        if (document.body) {
          (window as unknown as { __themeAtBody: string | null }).__themeAtBody =
            document.documentElement.getAttribute('data-theme');
          obs.disconnect();
        }
      }).observe(document, { childList: true, subtree: true });
    });
    const page = await ctx.newPage();
    await page.goto('/tools/compress-image');
    expect(await page.evaluate(() => (window as unknown as { __themeAtBody: string }).__themeAtBody)).toBe(
      'dark',
    );
    expect(await page.evaluate(() => getComputedStyle(document.body).backgroundColor)).toBe(
      DARK_PAPER,
    );
    await ctx.close();
  });

  test('the toggle stores the choice and survives a reload', async ({ page }) => {
    await page.goto('/');
    await page.locator('[data-theme-toggle]').first().click();
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
    await page.reload();
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  });
});

const WIDTHS = [360, 390, 414, 768, 1024, 1280, 1440, 1920];
const PAGES = ['/', '/tools/compress-image', '/exams', '/exam/ibps-po', '/kit/ibps-po', '/hi'];

test.describe('no horizontal scroll', () => {
  for (const w of WIDTHS) {
    for (const orientation of ['portrait', 'landscape'] as const) {
      test(`${w}px ${orientation}`, async ({ browser, baseURL }) => {
        const h = orientation === 'portrait' ? Math.round(w * 1.8) : Math.max(320, Math.round(w * 0.5));
        const ctx = await browser.newContext({ baseURL, viewport: { width: w, height: h } });
        const page = await ctx.newPage();
        const over: string[] = [];
        for (const r of PAGES) {
          await page.goto(r);
          await page.waitForLoadState('networkidle');
          const sw = await page.evaluate(() => document.documentElement.scrollWidth);
          if (sw > w) over.push(`${r}: scrollWidth ${sw} > ${w}`);
        }
        expect(over, over.join('\n')).toEqual([]);
        await ctx.close();
      });
    }
  }

  for (const w of [360, 768, 1024, 1440]) {
    test(`tool result state at ${w}px`, async ({ browser, baseURL }) => {
      const ctx = await browser.newContext({ baseURL, viewport: { width: w, height: 900 } });
      const page = await ctx.newPage();
      await compressTo20(page);
      await page.locator('[data-testid="preview-fullscreen"]').waitFor();
      expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(w);
      await ctx.close();
    });
  }
});

test.describe('full-screen preview', () => {
  const viewer = (page: Page) => page.locator('[data-testid="preview-viewer"]');
  const open = async (page: Page) => {
    const btn = page.locator('[data-testid="preview-fullscreen"]');
    await btn.click();
    await expect(viewer(page)).toBeVisible();
    await expect(page.getByRole('button', { name: /^Close$/ })).toBeFocused();
    await expect(viewer(page)).toContainText(/KB · \d+×\d+ px/);
    return btn;
  };

  test('opens, closes with Esc and with Back, restores focus', async ({ page }) => {
    await compressTo20(page);
    const btn = await open(page);
    await page.keyboard.press('Escape');
    await expect(viewer(page)).toHaveCount(0);
    await expect(btn).toBeFocused();
    expect(await page.evaluate(() => document.fullscreenElement)).toBeNull();

    await open(page);
    await page.evaluate(() => history.back());
    await expect(viewer(page)).toHaveCount(0);
    await expect(page).toHaveURL(/compress-image-to-20kb$/);

    await open(page);
    await page.getByRole('button', { name: /^Close$/ }).click();
    await expect(viewer(page)).toHaveCount(0);
  });

  test('Download in the viewer uses the normal download', async ({ page }) => {
    await compressTo20(page);
    await open(page);
    const [dl] = await Promise.all([
      page.waitForEvent('download'),
      viewer(page).getByRole('button', { name: /^Download$/ }).click(),
    ]);
    expect(dl.suggestedFilename()).toMatch(/-20kb\.jpg$/);
  });

  test('falls back to a fixed overlay without the Fullscreen API', async ({ page }) => {
    await page.addInitScript(() => {
      // iOS Safari has no element fullscreen.
      delete (Element.prototype as Partial<Element>).requestFullscreen;
    });
    await compressTo20(page);
    await open(page);
    const box = await viewer(page).boundingBox();
    const vp = page.viewportSize()!;
    expect(box).toMatchObject({ x: 0, y: 0, width: vp.width, height: vp.height });
    expect(await page.evaluate(() => document.fullscreenElement)).toBeNull();
    await page.keyboard.press('Escape');
    await expect(viewer(page)).toHaveCount(0);
  });
});

test.describe('ExamPilot promo', () => {
  test('phone: inline promo comes after the Download button', async ({ page, isMobile }) => {
    test.skip(!isMobile, 'phone layout');
    await compressTo20(page);
    const download = resultPanel(page).getByRole('button', { name: /^Download/ }).first();
    const promo = page.locator('aside[data-promo="exampilot"]:visible');
    await expect(promo).toHaveCount(1);
    const after = await download.evaluate(
      (d, p) => !!(d.compareDocumentPosition(p!) & Node.DOCUMENT_POSITION_FOLLOWING),
      await promo.elementHandle(),
    );
    expect(after).toBe(true);
    // Nothing promotional above the tool.
    const toolTop = await page.locator('[data-tool-slot]').evaluate((e) => e.getBoundingClientRect().top + scrollY);
    const promoTop = await promo.evaluate((e) => e.getBoundingClientRect().top + scrollY);
    expect(promoTop).toBeGreaterThan(toolTop);
    const link = promo.getByRole('link', { name: /Try ExamPilot/ });
    await expect(link).toHaveAttribute('rel', 'sponsored noopener noreferrer');
    await expect(link).toHaveAttribute('target', '_blank');
    await expect(link).toHaveAttribute(
      'href',
      'https://exampilot.ai/?utm_source=sahisize&utm_medium=referral&utm_campaign=compress-image-to-20kb',
    );
    await expect(promo).toContainText('Sponsored');
  });

  test('>=1440px: sticky sidebar card, no inline copy', async ({ browser, baseURL }) => {
    const ctx = await browser.newContext({ baseURL, viewport: { width: 1440, height: 900 } });
    const page = await ctx.newPage();
    await page.goto('/tools/compress-image');
    await expect(page.locator('[data-promo-sidebar] aside[data-promo="exampilot"]')).toBeVisible();
    await expect(page.locator('aside[data-promo="exampilot"]:visible')).toHaveCount(1);
    await ctx.close();
  });

  test('home banner dismissal persists', async ({ page }) => {
    await page.goto('/');
    const banner = page.locator('[data-exampilot-banner]');
    await expect(banner).toBeVisible();
    const dismiss = page.locator('[data-testid="promo-dismiss"]');
    await expect(page.locator('astro-island', { has: dismiss })).not.toHaveAttribute('ssr', /.*/);
    await dismiss.click();
    await expect(banner).toBeHidden();
    await page.reload();
    await expect(page.locator('html')).toHaveAttribute('data-exampilot-dismissed', '');
    await expect(banner).toBeHidden();
  });
});
