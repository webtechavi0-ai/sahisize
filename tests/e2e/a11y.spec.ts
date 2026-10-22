/**
 * SPEC 13 accessibility: axe-core (WCAG 2.0/2.1 A + AA rules) on every route type, English
 * and Hindi, light and dark, including the interactive kit and tool states.
 */
import { test, expect, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { attachJson, fixture, kitAction, routeExists, waitScreenNot } from './helpers/app';
import { hydrateIsland, resultPanel } from './helpers/tools';

const TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'];

interface Found {
  id: string;
  impact: string | null | undefined;
  targets: string[];
  summary: string;
}

async function audit(page: Page, label: string) {
  const res = await new AxeBuilder({ page }).withTags(TAGS).analyze();
  const found: Found[] = res.violations.flatMap((v) =>
    v.nodes.map((n) => ({
      id: v.id,
      impact: v.impact,
      targets: [n.target.join(' ')],
      summary: n.failureSummary?.split('\n')[1] ?? '',
    })),
  );
  await attachJson(test.info(), `axe ${label}`, found);
  expect(found, `${label}: axe violations\n${JSON.stringify(found, null, 1)}`).toEqual([]);
}

const STATIC_ROUTES = [
  '/',
  '/exams',
  '/exam/ibps-po',
  '/exam/ibps-po/signature',
  '/kit/ibps-po',
  '/tools',
  '/tools/compress-image-to-20kb',
  '/tools/resize-image',
  '/tools/images-to-pdf',
  '/tools/custom-preset',
  '/tools/passport-size-photo',
  '/tools/increase-image-size-in-kb',
  '/tools/name-date-on-photo',
  '/guides',
  '/guides/exam-form-checklist',
  '/sources',
  '/about',
  '/privacy',
  '/report',
  '/offline',
  '/this-page-does-not-exist',
];

const HI_ROUTES = [
  '/hi',
  '/hi/exams',
  '/hi/exam/ibps-po',
  '/hi/kit/ibps-po',
  '/hi/tools/compress-image-to-20kb',
  '/hi/tools/photo-3-5x4-5-cm',
  '/hi/tools/name-date-on-photo',
  '/hi/guides',
];

for (const scheme of ['light', 'dark'] as const) {
  test.describe(`axe (${scheme})`, () => {
    test.use({ colorScheme: scheme });
    // The site is light by default whatever the OS prefers; dark is the stored manual choice.
    test.beforeEach(async ({ page }) => {
      if (scheme === 'dark')
        await page.addInitScript(() => localStorage.setItem('sahisize:theme', 'dark'));
    });

    for (const r of [...STATIC_ROUTES, ...HI_ROUTES]) {
      test(`${r}`, async ({ page }) => {
        const is404 = r === '/this-page-does-not-exist';
        test.skip(!is404 && !routeExists(r), `${r} not built`);
        await page.goto(r);
        await page.waitForLoadState('networkidle');
        await expect(page.locator('html')).toHaveAttribute('data-theme', scheme);
        await audit(page, `${r} ${scheme}`);
      });
    }

    test('kit states: upload, crop, result, summary', async ({ page }) => {
      test.setTimeout(180_000);
      await page.goto('/kit/ssc-cgl');
      await page.waitForSelector('[data-ready="1"]');
      await kitAction(page).click(); // checklist → upload
      await page.waitForSelector('[data-screen="upload"]');
      await audit(page, `kit upload ${scheme}`);
      await page
        .locator('[data-testid="gallery-input"]')
        .first()
        .setInputFiles(fixture('signature.png'));
      await page.waitForSelector('[data-screen="crop"]');
      await expect(kitAction(page)).toBeEnabled();
      await audit(page, `kit crop ${scheme}`);
      await kitAction(page).click();
      await waitScreenNot(page, 'crop');
      await audit(page, `kit result ${scheme}`);
      await kitAction(page).click();
      await page.waitForSelector('[data-screen="summary"]');
      await audit(page, `kit summary ${scheme}`);
    });

    test('Hindi kit result state', async ({ page }) => {
      await page.goto('/hi/kit/ssc-cgl');
      await page.waitForSelector('[data-ready="1"]');
      await kitAction(page).click();
      await page
        .locator('[data-testid="gallery-input"]')
        .first()
        .setInputFiles(fixture('signature.png'));
      await page.waitForSelector('[data-screen="crop"]');
      await expect(kitAction(page)).toBeEnabled();
      await kitAction(page).click();
      await waitScreenNot(page, 'crop');
      await audit(page, `hi kit result ${scheme}`);
    });

    test('tool result state (compress to 20 KB)', async ({ page }) => {
      await page.goto('/tools/compress-image-to-20kb');
      await hydrateIsland(page);
      await page
        .locator('[data-testid="gallery-input"]')
        .first()
        .setInputFiles(fixture('photo.jpg'));
      await expect(resultPanel(page)).toBeVisible({ timeout: 60_000 });
      await audit(page, `tool result ${scheme}`);
    });
  });
}

// PLAN B1 / SPEC 6.1: 48 px tap targets on mobile. Inline links inside running text are
// exempt (WCAG 2.5.8 inline exception). Everything else is ≥ 48 px tall; buttons and icon-only
// links are also ≥ 48 px wide, text links ≥ 24 px wide (short words like "Home").
test.describe('tap targets ≥ 48 px', () => {
  test.skip(({ isMobile }) => !isMobile, 'mobile layout only');
  for (const r of ['/', '/exam/ibps-po', '/kit/ibps-po', '/tools/compress-image-to-20kb', '/hi']) {
    test(r, async ({ page }) => {
      await page.goto(r);
      await page.waitForLoadState('networkidle');
      const small = await page.evaluate(() => {
        const out: string[] = [];
        const els = document.querySelectorAll<HTMLElement>(
          'button, a[href], [role="button"], select, input:not([type="hidden"])',
        );
        for (const el of els) {
          const cs = getComputedStyle(el);
          if (cs.display === 'inline' && el.tagName === 'A' && el.closest('p, li, td, dd'))
            continue;
          if (el.closest('.sr-only') || el.classList.contains('sr-only')) continue;
          if (el.matches('a.skip-link, a[href="#main"]')) continue;
          const b = el.getBoundingClientRect();
          if (b.width === 0 || b.height === 0 || cs.visibility === 'hidden') continue;
          const minW = el.tagName === 'A' && (el.innerText || '').trim().length > 0 ? 24 : 47.5;
          if (b.height < 47.5 || b.width < minW) {
            out.push(
              `${el.tagName.toLowerCase()}${el.id ? '#' + el.id : ''} "${(el.innerText || el.getAttribute('aria-label') || '').trim().slice(0, 30)}" ${Math.round(b.width)}×${Math.round(b.height)}`,
            );
          }
        }
        return out;
      });
      expect(small, small.join('\n')).toEqual([]);
    });
  }
});
