/**
 * Home page: hero copy, the two hero paths (exam form / just a size), popular exams filter,
 * card alignment, grouped tools section and search group (Aadhaar note), notebook lines.
 */
import { test, expect, type Browser, type Locator } from '@playwright/test';

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

async function phone(browser: Browser, baseURL: string | undefined, width: number, height: number) {
  const ctx = await browser.newContext({ baseURL, viewport: { width, height }, isMobile: true, hasTouch: true });
  return { ctx, page: await ctx.newPage() };
}

const boxes = (l: Locator) => l.evaluateAll((as) => as.map((a) => a.getBoundingClientRect().toJSON() as DOMRect));

test('hero path 1 "Filling an exam form?": search + big exam chips above the fold at 360x640', async ({ browser, baseURL }) => {
  const { ctx, page } = await phone(browser, baseURL, 360, 640);
  await page.goto('/');
  const path = page.locator('[data-path="exam"]');
  await expect(path.locator('h2')).toHaveText(/Filling an exam form\?/);
  const search = await path.locator('input[role="combobox"]').boundingBox();
  expect(search!.y + search!.height).toBeLessThan(640);
  const chips = path.locator('[data-exam-chips] a:visible');
  await expect(chips).toHaveCount(6);
  await expect(chips.first()).toHaveAttribute('href', '/exam/ibps-po');
  for (const b of await boxes(chips)) {
    expect(b.height).toBeGreaterThanOrEqual(48);
    expect(b.width).toBeGreaterThanOrEqual(48);
    expect(b.y + b.height).toBeLessThan(640);
  }
  // Phones: plain paper, no ruled lines.
  expect(await page.evaluate(() => getComputedStyle(document.body).backgroundImage)).toBe('none');
  // One tap to the exam page.
  await chips.first().click();
  await expect(page).toHaveURL(/\/exam\/ibps-po$/);
  await page.goto('/hi');
  await expect(page.locator('[data-path="exam"] [data-exam-chips] a').first()).toHaveAttribute('href', '/hi/exam/ibps-po');
  await ctx.close();
});

test('hero path 2 "Just need a size?": six task buttons, all above the fold at 390x844', async ({ browser, baseURL }) => {
  const { ctx, page } = await phone(browser, baseURL, 390, 844);
  await page.goto('/');
  const path = page.locator('[data-path="size"]');
  await expect(path.locator('h2')).toHaveText(/Just need a size\?/);
  const tasks = path.locator('[data-size-tasks] a');
  expect(await tasks.evaluateAll((as) => as.map((a) => a.getAttribute('href')))).toEqual([
    '/tools/compress-image-to-20kb',
    '/tools/compress-image-to-50kb',
    '/tools/signature-resize',
    '/id-documents/pan-card-photo-size',
    '/tools/passport-size-photo',
    '/tools/custom-preset',
  ]);
  for (const b of await boxes(tasks)) {
    expect(b.height).toBeGreaterThanOrEqual(48);
    expect(b.y + b.height).toBeLessThan(844);
  }
  await path.locator('[data-task="20kb"]').click();
  await expect(page).toHaveURL(/\/tools\/compress-image-to-20kb$/);
  await page.goto('/hi');
  expect(await page.locator('[data-path="size"] [data-size-tasks] a').evaluateAll((as) => as.map((a) => a.getAttribute('href')))).toEqual([
    '/hi/tools/compress-image-to-20kb',
    '/hi/tools/compress-image-to-50kb',
    '/hi/tools/signature-resize',
    '/hi/id-documents/pan-card-photo-size',
    '/hi/tools/passport-size-photo',
    '/tools/custom-preset',
  ]);
  await ctx.close();
  // 360x640: the second path starts above the fold (heading + first row of tasks).
  const small = await phone(browser, baseURL, 360, 640);
  await small.page.goto('/');
  const first = await small.page.locator('[data-task="20kb"]').boundingBox();
  expect(first!.y + first!.height).toBeLessThanOrEqual(640);
  await small.ctx.close();
});

test('sponsored banner sits below Popular exams, not between the hero and the exams', async ({ page }) => {
  await page.goto('/');
  const banner = page.locator('[data-exampilot-banner]');
  test.skip((await banner.count()) === 0, 'ExamPilot disabled');
  const pop = await page.locator('section[aria-labelledby="pop-h"]').boundingBox();
  const b = await banner.boundingBox();
  expect(b!.y).toBeGreaterThan(pop!.y + pop!.height - 1);
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

test('one grouped tools section (size, document, PDF) with PAN rows from config', async ({ page }) => {
  await page.goto('/');
  const sec = page.locator('[data-other-docs]');
  await expect(sec.locator('h2')).toHaveText('Photo, signature and document tools');
  await expect(sec.locator('[data-tool-group]')).toHaveCount(3);
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
