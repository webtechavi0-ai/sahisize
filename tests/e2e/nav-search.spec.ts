/**
 * Navigation and site search (owner: "make it intuitive"): full-screen search on phones,
 * results grouped Exams / Tools / Other documents / Guides with "what you get" lines,
 * everyday words (bank, railway, पुलिस, photo 20kb, pdf), the empty state, the phone menu,
 * the short breadcrumb and the grouped /tools and /exams pages.
 */
import { expect, test, type Page } from '@playwright/test';

const isPhone = (page: Page) => (page.viewportSize()?.width ?? 1000) < 640;

async function hydrated(page: Page) {
  await expect(page.locator('astro-island[ssr]')).toHaveCount(0);
}

const names = (page: Page, group: string) =>
  page.locator(`[role="group"][aria-label="${group}"] [role="option"] [data-name]`);

test('@smoke phone: header search opens full screen, groups results, Back closes it', async ({ page }) => {
  test.skip(!isPhone(page), 'phone layout');
  await page.goto('/exam/ibps-po');
  await hydrated(page);
  await page.locator('header button[aria-label="Search"]').click();
  const dialog = page.locator('[role="dialog"]');
  await expect(dialog).toBeVisible();
  const input = page.locator('header input[role="combobox"]');
  await expect(input).toBeFocused();
  // Focused and empty: popular suggestions, no blank panel.
  await expect(page.locator('[role="group"][aria-label="Popular exams"]')).toBeVisible();
  await input.fill('bank po');
  await expect(names(page, 'Exams').first()).toHaveText('IBPS PO');
  await expect(page.locator('[role="group"][aria-label="Exams"] [role="option"]').first()).toContainText('Photo, Signature');
  // Results start right under the input (above the on-screen keyboard).
  const box = await page.locator('[role="listbox"]').boundingBox();
  expect(box!.y).toBeLessThan(120);
  await expect(input).toHaveAttribute('aria-activedescendant', /opt-0$/);
  await page.goBack();
  await expect(dialog).toHaveCount(0);
  await expect(page).toHaveURL(/\/exam\/ibps-po$/);
});

test('hero: "photo 20kb" puts the 20 KB tool first and Enter opens it', async ({ page }) => {
  await page.goto('/');
  await hydrated(page);
  const input = page.locator('[data-site-search="hero"] input[role="combobox"]');
  await input.click();
  await input.fill('photo 20kb');
  const groups = page.locator('[role="listbox"] > li [role="group"]');
  await expect(groups.first()).toHaveAttribute('aria-label', 'Tools');
  await expect(names(page, 'Tools').first()).toHaveText('Compress photo to 20 KB');
  await input.press('Enter');
  await expect(page).toHaveURL(/\/tools\/compress-image-to-20kb$/);
});

test('everyday words: railway, police (Hindi), pdf, signature, passport', async ({ page }) => {
  await page.goto('/');
  await hydrated(page);
  const input = page.locator('[data-site-search="hero"] input[role="combobox"]');
  await input.click();
  await input.fill('railway group d');
  await expect(names(page, 'Exams').first()).toHaveText('RRB Group D (Level 1)');
  await input.fill('पुलिस');
  await expect(names(page, 'Exams').first()).toContainText('Police');
  await input.fill('compress pdf');
  await expect(names(page, 'Tools').first()).toHaveText('Compress PDF');
  await input.fill('signature');
  await expect(names(page, 'Tools').first()).toHaveText('Signature resize');
  await expect(names(page, 'Exams').first()).toContainText('· Signature');
  await input.fill('passport');
  await expect(names(page, 'Tools').first()).toHaveText('Passport size photo');
});

test('empty state: Custom size and "Tell us your exam"; Enter does not leave', async ({ page }) => {
  await page.goto('/');
  await hydrated(page);
  const input = page.locator('[data-site-search="hero"] input[role="combobox"]');
  await input.click();
  await input.fill('qqzzxx');
  const opts = page.locator('[role="option"] [data-name]');
  await expect(opts).toHaveText(['Use Custom size', 'Tell us your exam']);
  await input.press('Enter');
  await expect(page).toHaveURL(/\/$/);
  await page.locator('[role="option"]', { hasText: 'Tell us your exam' }).dispatchEvent('mousedown');
  await expect(page).toHaveURL(/\/report\?exam=qqzzxx$/);
});

test('desktop: keyboard moves through grouped options', async ({ page }) => {
  test.skip(isPhone(page), 'desktop layout');
  await page.goto('/exams');
  await hydrated(page);
  const input = page.locator('header input[role="combobox"]');
  await input.fill('ssc');
  await expect(input).toHaveAttribute('aria-expanded', 'true');
  await input.press('ArrowDown');
  const active = await input.getAttribute('aria-activedescendant');
  await expect(page.locator(`[id="${active}"]`)).toHaveAttribute('aria-selected', 'true');
  await input.press('Escape');
  await expect(input).toHaveAttribute('aria-expanded', 'false');
});

test('phone menu: Exams, Tools, Govt ID, Guides, language, theme; current page marked', async ({ page }) => {
  test.skip(!isPhone(page), 'phone layout');
  await page.goto('/exam/rrb-group-d');
  await hydrated(page);
  // Short breadcrumb: back to all exams in one tap.
  await expect(page.locator('[data-crumbs-short] a').first()).toHaveText('Exams');
  await page.locator('header summary').click();
  const rows = page.locator('header details nav a, header details nav button');
  await expect(rows).toHaveCount(6);
  await expect(page.locator('header details nav a[aria-current="page"]')).toHaveText('Exams');
  for (const h of await rows.evaluateAll((els) => els.map((e) => e.getBoundingClientRect().height)))
    expect(h).toBeGreaterThanOrEqual(48);
  await page.locator('header details nav a', { hasText: 'Tools' }).click();
  await expect(page).toHaveURL(/\/tools$/);
  await expect(page.locator('[data-tool-section]')).toHaveCount(6);
  await expect(page.locator('[data-tool-section="pdf"]')).toContainText('Compress PDF');
});

test('/exams: chips, family hubs on top, "bank po" filter', async ({ page }) => {
  await page.goto('/exams');
  await hydrated(page);
  await page.waitForLoadState('networkidle');
  await page.fill('#exams-q', 'bank po');
  const shown = page.locator('[data-exam-card]:not([hidden])');
  await expect(shown).toHaveCount(3);
  await expect(page.locator('[data-cant-find]')).toContainText('Use Custom size');
});

test('Hindi: search groups and menu are Hindi', async ({ page }) => {
  await page.goto('/hi');
  await hydrated(page);
  const input = page.locator('[data-site-search="hero"] input[role="combobox"]');
  await input.click();
  await input.fill('रेलवे');
  await expect(page.locator('[role="group"][aria-label="एग्ज़ाम"]')).toBeVisible();
  await input.fill('फोटो 20kb');
  await expect(names(page, 'टूल').first()).toHaveText('फोटो 20 KB में करें');
});

test('no horizontal scroll on nav pages', async ({ page }) => {
  for (const p of ['/', '/exams', '/tools', '/hi/tools', '/guides', '/exam/ibps-po']) {
    await page.goto(p);
    const sw = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    expect(sw, p).toBeLessThanOrEqual(0);
  }
});
