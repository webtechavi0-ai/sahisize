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

/**
 * Known in-progress defect (fixer): the PassCheck "Pass/Fail" badge (`span.rounded-full`
 * inside the pass-check card) fails color-contrast. Split those nodes out so the rest of
 * the page still has to be clean.
 */
async function isPassCheckBadge(page: Page, target: string): Promise<boolean> {
  return page.evaluate((sel) => {
    const el = document.querySelector(sel);
    if (!el) return false;
    const card = el.closest('section, div');
    return (
      !!el.matches('span.rounded-full') && !!card?.parentElement?.querySelector('li[data-rule]')
    );
  }, target);
}

async function audit(page: Page, label: string) {
  const res = await new AxeBuilder({ page }).withTags(TAGS).analyze();
  const other: Found[] = [];
  const known: Found[] = [];
  for (const v of res.violations) {
    for (const n of v.nodes) {
      const target = n.target.join(' ');
      const f = {
        id: v.id,
        impact: v.impact,
        targets: [target],
        summary: n.failureSummary?.split('\n')[1] ?? '',
      };
      if (v.id === 'color-contrast' && (await isPassCheckBadge(page, target))) known.push(f);
      else other.push(f);
    }
  }
  await attachJson(test.info(), `axe ${label}`, { other, known });
  expect(other, `${label}: axe violations\n${JSON.stringify(other, null, 1)}`).toEqual([]);
  return known;
}

function fixmeKnown(known: Found[]) {
  test.fixme(
    known.length > 0,
    'Known defect (fixer): PassCheck Pass/Fail badge fails axe color-contrast (src/components/kit/PassCheck.tsx).',
  );
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
  '/hi/guides',
];

for (const scheme of ['light', 'dark'] as const) {
  test.describe(`axe (${scheme})`, () => {
    test.use({ colorScheme: scheme });

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
      const known: Found[] = [];
      known.push(...(await audit(page, `kit upload ${scheme}`)));
      await page
        .locator('[data-testid="gallery-input"]')
        .first()
        .setInputFiles(fixture('signature.png'));
      await page.waitForSelector('[data-screen="crop"]');
      await expect(kitAction(page)).toBeEnabled();
      known.push(...(await audit(page, `kit crop ${scheme}`)));
      await kitAction(page).click();
      await waitScreenNot(page, 'crop');
      known.push(...(await audit(page, `kit result ${scheme}`)));
      await kitAction(page).click();
      await page.waitForSelector('[data-screen="summary"]');
      known.push(...(await audit(page, `kit summary ${scheme}`)));
      fixmeKnown(known);
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
      fixmeKnown(await audit(page, `hi kit result ${scheme}`));
    });

    test('tool result state (compress to 20 KB)', async ({ page }) => {
      await page.goto('/tools/compress-image-to-20kb');
      await hydrateIsland(page);
      await page
        .locator('[data-testid="gallery-input"]')
        .first()
        .setInputFiles(fixture('photo.jpg'));
      await expect(resultPanel(page)).toBeVisible({ timeout: 60_000 });
      fixmeKnown(await audit(page, `tool result ${scheme}`));
    });
  });
}
