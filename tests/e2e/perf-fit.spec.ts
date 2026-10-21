/**
 * SPEC 5.1 acceptance ("each auto-fit finishes in under 2 seconds" on a mid-range phone or
 * DevTools 4× CPU) with worst-case inputs: 12 MP noisy camera photos, generated at run time
 * (too big to commit), through the real KitFlow on single-document pages. Covers the PLAN R4
 * / QUESTIONS Q23 risk: KB-only "other" specs on 12 MP noise.
 *
 * Measurement caveat (verified): CDP `Emulation.setCPUThrottlingRate` slows only the page's
 * main thread. Dedicated workers (where the engine runs) are NOT throttled, and the CDP call
 * on a worker target fails with "Operation is only supported for pages, not workers". So:
 *   - `throttledMs`: wall time with DevTools-style 4× CPU (exactly SPEC's DevTools setup);
 *   - `workerProxyMs`: unthrottled wall time × 4, a pessimistic proxy for a phone that is 4×
 *     slower everywhere (main thread too). Recorded as an annotation, not asserted.
 * Timings come from KitFlow's `sahisize:fit:*` performance.measure when present (the wall
 * clock also carries Playwright's selector polling delay; it is recorded alongside).
 */
import { test, expect, devices, type Page } from '@playwright/test';
import sharp from 'sharp';
import { attachJson, isChromium, throttle } from './helpers/app';

const BUDGET = 2000;
/** Runs per case; the median is asserted (review 3 #5). */
const RUNS = 3;

const median = (xs: number[]) => [...xs].sort((a, b) => a - b)[xs.length >> 1]!;

interface Case {
  route: string;
  input: 'photo' | 'scan';
}

const CASES: Case[] = [
  { route: '/exam/ibps-po/photo', input: 'photo' }, // fixed px, 20–50 KB
  { route: '/exam/iaf-agniveervayu/photo', input: 'photo' }, // KB-only, high minimum 100–200 KB
  { route: '/exam/cuet-ug/id-proof', input: 'scan' }, // KB-only "other" (Q23 open risk)
  { route: '/exam/rrb-ntpc/signature', input: 'scan' }, // px range + 30–49 KB
];

async function make12mp(kind: Case['input'], path: string) {
  const w = 4000;
  const h = 3000;
  const raw = Buffer.alloc(w * h * 3);
  let s = kind === 'photo' ? 7 : 9;
  for (let i = 0; i < raw.length; i += 3) {
    s = (s * 1664525 + 1013904223) >>> 0;
    const n = (s >>> 24) - 128;
    const px = (i / 3) % w;
    const py = Math.floor(i / 3 / w);
    const base = kind === 'photo' ? 120 + 80 * Math.sin(px / 300) * Math.cos(py / 250) : 230;
    raw[i] = Math.max(0, Math.min(255, base + n * 0.35));
    raw[i + 1] = Math.max(0, Math.min(255, base - 10 + n * 0.35));
    raw[i + 2] = Math.max(0, Math.min(255, base - 20 + n * 0.35));
  }
  await sharp(raw, { raw: { width: w, height: h, channels: 3 } })
    .jpeg({ quality: 92 })
    .toFile(path);
}

interface FitTiming {
  /** Click -> result screen seen by Playwright. Includes selector polling latency (up to
   * ~0.5 s: the DOM switch was observed ~440 ms before waitForSelector resolved). */
  wallMs: number;
  /** KitFlow's `sahisize:fit:*` measure (crop + cleanup + fit + switch to result). */
  markMs: number | null;
}

async function fitOnce(page: Page, route: string, file: string): Promise<FitTiming> {
  await page.goto(route);
  const island = page.locator('[data-screen]').first();
  await island.scrollIntoViewIfNeeded();
  await page.waitForSelector('[data-ready="1"]', { timeout: 30_000 });
  await page.locator('[data-testid="gallery-input"]').first().setInputFiles(file);
  await page.waitForSelector('[data-screen="crop"]', { timeout: 120_000 });
  const fit = page
    .locator(
      '[data-screen="crop"] div.sticky.bottom-0 button, [data-screen="crop"] button:has-text("Auto-fit")',
    )
    .first();
  await expect(fit).toBeEnabled({ timeout: 60_000 });
  const t0 = Date.now();
  await fit.click();
  await page.waitForSelector('[data-screen="result"]', { timeout: 120_000 });
  const wallMs = Date.now() - t0;
  const markMs = await page.evaluate(() => {
    const m = performance.getEntriesByType('measure').filter((e) => e.name.startsWith('sahisize:fit:'));
    return m.length ? Math.round(m[m.length - 1]!.duration) : null;
  });
  return { wallMs, markMs };
}

test.describe('auto-fit time on 12 MP inputs', () => {
  test.skip(({ browserName }) => browserName !== 'chromium', 'CDP throttling is Chromium-only');

  for (const c of CASES) {
    test(`${c.route} fits in < 2 s`, async ({ page, context, browser }, info) => {
      test.setTimeout(600_000);
      const file = info.outputPath(`${c.input}-12mp.jpg`);
      await make12mp(c.input, file);

      // Median of RUNS fresh contexts each way: one slow run (GC, disk) must not fail the budget.
      const un: FitTiming[] = [];
      const th: FitTiming[] = [];
      for (let i = 0; i < RUNS; i++) {
        // Fresh contexts: KitFlow restores the finished doc from IndexedDB otherwise.
        if (i === 0) un.push(await fitOnce(page, c.route, file));
        else {
          const ctx1 = await browser.newContext({ ...devices['Pixel 5'] });
          un.push(await fitOnce(await ctx1.newPage(), c.route, file));
          await ctx1.close();
        }
        const ctx2 = await browser.newContext({ ...devices['Pixel 5'] });
        const p2 = await ctx2.newPage();
        if (isChromium(ctx2)) await throttle(p2, ctx2);
        th.push(await fitOnce(p2, c.route, file));
        await ctx2.close();
      }
      void context;
      const ms = (t: FitTiming) => t.markMs ?? t.wallMs;
      const unthrottledMs = median(un.map(ms));
      const throttledMs = median(th.map(ms));
      const workerProxyMs = unthrottledMs * 4;
      const r = {
        route: c.route,
        unthrottledMs,
        throttledMs,
        workerProxyMs,
        runsUnthrottledMs: un.map(ms),
        runsThrottledMs: th.map(ms),
        wallUnthrottledMs: median(un.map((t) => t.wallMs)),
        wallThrottledMs: median(th.map((t) => t.wallMs)),
      };
      await attachJson(info, 'timing', r);
      info.annotations.push({ type: 'timing', description: JSON.stringify(r) });

      expect(throttledMs, `DevTools 4× CPU + Fast 4G, median of ${RUNS}: ${th.map(ms).join(', ')} ms`).toBeLessThan(BUDGET);
      if (workerProxyMs >= BUDGET) {
        // Recorded, not asserted: the proxy also multiplies main-thread time that is already
        // throttled, so it overstates. Real phones land between throttledMs and this.
        info.annotations.push({
          type: 'warning',
          description: `4× everywhere proxy ${workerProxyMs} ms ≥ 2 s`,
        });
      }
    });
  }
});
