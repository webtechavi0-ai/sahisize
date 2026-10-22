/**
 * Home page owner feedback: hero copy, "Not an exam?" chips, popular exams filter, card
 * alignment, "Other documents" section and search group (Aadhaar note), notebook lines.
 */
import { test, expect } from '@playwright/test';

test('hero H1 with the marker on "right size" and no stray spaces', async ({ page }) => {
  await page.goto('/');
  const h1 = page.locator('h1');
  await expect(h1).toHaveText('Exam photo & signature resize — right size, first time.');
  await expect(h1.locator('.marker')).toHaveText('right size');
  const html = await h1.innerHTML();
  expect(html).toMatch(/^Exam photo &amp; signature resize — <span[^>]*>right size<\/span>, first time\.$/);
  await page.goto('/hi');
  await expect(page.locator('h1 .marker')).toHaveText('सही साइज़');
});

test('"Not an exam?" chips: links, 48px targets, search stays above the fold at 360x640', async ({ browser, baseURL }) => {
  const ctx = await browser.newContext({ baseURL, viewport: { width: 360, height: 640 }, isMobile: true, hasTouch: true });
  const page = await ctx.newPage();
  await page.goto('/');
  const chips = page.locator('[data-not-exam] a');
  await expect(chips).toHaveCount(3);
  expect(await chips.evaluateAll((as) => as.map((a) => a.getAttribute('href')))).toEqual([
    '/id-documents/pan-card-photo-size',
    '/tools/passport-size-photo',
    '/tools/custom-preset',
  ]);
  for (const box of await chips.evaluateAll((as) => as.map((a) => a.getBoundingClientRect().toJSON()))) {
    expect(box.height).toBeGreaterThanOrEqual(48);
    expect(box.width).toBeGreaterThanOrEqual(48);
  }
  const search = await page.locator('input[role="combobox"]').boundingBox();
  expect(search!.y + search!.height).toBeLessThan(640);
  // Phones: plain paper, no ruled lines.
  expect(await page.evaluate(() => getComputedStyle(document.body).backgroundImage)).toBe('none');
  await page.goto('/hi');
  expect(await page.locator('[data-not-exam] a').evaluateAll((as) => as.map((a) => a.getAttribute('href')))).toEqual([
    '/hi/id-documents/pan-card-photo-size',
    '/hi/tools/passport-size-photo',
    '/tools/custom-preset',
  ]);
  await ctx.close();
});

test('popular exams: no past cycles or unverified sources, at most 12, equal-height rows', async ({ browser, baseURL }) => {
  const ctx = await browser.newContext({ baseURL, viewport: { width: 1440, height: 900 } });
  const page = await ctx.newPage();
  await page.goto('/');
  const cards = page.locator('section[aria-labelledby="pop-h"] li a');
  const n = await cards.count();
  expect(n).toBeGreaterThan(0);
  expect(n).toBeLessThanOrEqual(12);
  await expect(page.locator('section[aria-labelledby="pop-h"] a[href$="/nabard-grade-a"]')).toHaveCount(0);
  const boxes = await cards.evaluateAll((as) => as.map((a) => a.getBoundingClientRect().toJSON()));
  const rows = new Map<number, number[]>();
  for (const b of boxes) rows.set(Math.round(b.y), [...(rows.get(Math.round(b.y)) ?? []), b.height]);
  for (const hs of rows.values()) expect(Math.max(...hs) - Math.min(...hs)).toBeLessThanOrEqual(1);
  // Docs line pinned to the bottom: same offset from each card's bottom edge.
  const docOffsets = await cards.evaluateAll((as) =>
    as.map((a) => a.getBoundingClientRect().bottom - a.querySelector('[data-card-docs]')!.getBoundingClientRect().bottom),
  );
  expect(Math.max(...docOffsets) - Math.min(...docOffsets)).toBeLessThanOrEqual(1);
  // Short name visible, full name in title and accessible name.
  const sbi = page.locator('section[aria-labelledby="pop-h"] a[href="/exam/sbi-clerk"]');
  if (await sbi.count()) {
    await expect(sbi).toHaveAttribute('title', 'SBI Clerk (Junior Associate)');
    await expect(sbi).toHaveAccessibleName(/SBI Clerk \(Junior Associate\)/);
  }
  await ctx.close();
});

test('"Other documents (not exams)" section with PAN cards from config', async ({ page }) => {
  await page.goto('/');
  const sec = page.locator('[data-other-docs]');
  await expect(sec.locator('h2')).toHaveText('Other documents (not exams)');
  await expect(sec.locator('[data-other-doc]')).toHaveCount(6);
  const pan = sec.locator('[data-other-doc="pan-photo"]');
  await expect(pan).toContainText('3.5×2.5 cm · ≤ 20 KB');
  await expect(pan).toContainText('Not affiliated with NSDL/UTIITSL');
  await expect(sec.locator('img')).toHaveCount(0);
});

test('search "aadhar" shows the Other documents group with the enrolment-centre note', async ({ page }) => {
  await page.goto('/');
  const input = page.locator('input[role="combobox"]');
  await expect(page.locator('astro-island', { has: input })).not.toHaveAttribute('ssr', /.*/);
  await input.fill('aadhar');
  const group = page.locator('[role="group"][aria-label="Other documents"]');
  await expect(group).toBeVisible();
  await expect(group).toContainText('enrolment centre');
  await group.locator('[role="option"]').first().dispatchEvent('mousedown');
  await expect(page).toHaveURL(/\/id-documents#not-covered$/);
  await expect(page.locator('#not-covered')).toBeVisible();
});

test('search "pan card" lists PAN pages apart from exam groups', async ({ page }) => {
  await page.goto('/');
  const input = page.locator('input[role="combobox"]');
  await expect(page.locator('astro-island', { has: input })).not.toHaveAttribute('ssr', /.*/);
  await input.fill('pan card');
  const group = page.locator('[role="group"][aria-label="Other documents"]');
  await expect(group.locator('[role="option"]').first()).toHaveText('PAN card photo');
  await expect(page.locator('[role="option"]')).toHaveCount(await group.locator('[role="option"]').count());
});
