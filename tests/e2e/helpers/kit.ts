/**
 * Drives KitFlow (src/islands/KitFlow.tsx) end to end through its public DOM contract:
 * `[data-screen]`, `[data-ready]`, the gallery `<input data-testid="gallery-input">` and the
 * sticky bottom action bar. Adapted from the Phase 2 reviewer's driver.
 */
import { expect, type Page } from '@playwright/test';
import { kitAction, kitScreen, preset, waitScreenNot } from './app';

export interface FitTiming {
  doc: string;
  /** Wall clock from the Auto-fit click to the result screen (includes crop, cleanup, render). */
  wallMs: number;
  /** Duration of a `performance.mark/measure` emitted by KitFlow for this fit, if any. */
  markMs: number | null;
}

export interface KitRun {
  fits: FitTiming[];
  final: string | null;
  /** performance entries whose name mentions "fit" (KitFlow contract, PLAN H1). */
  fitEntries: { name: string; entryType: string; startTime: number; duration: number }[];
  results: Record<string, { pass: boolean; rules: Record<string, boolean> }>;
}

/** doc type → fixture path. Keys: photo, signature, thumb, declaration, certificate, other. */
export type KitFiles = Partial<Record<string, string>>;

async function fitEntries(page: Page) {
  return page.evaluate(() =>
    performance
      .getEntries()
      .filter((e) => (e.entryType === 'mark' || e.entryType === 'measure') && /fit/i.test(e.name))
      .map((e) => ({ name: e.name, entryType: e.entryType, startTime: e.startTime, duration: e.duration })),
  );
}

export async function runKit(
  page: Page,
  slug: string,
  files: KitFiles,
  opts: { lang?: 'en' | 'hi'; stepTimeout?: number } = {},
): Promise<KitRun> {
  const lang = opts.lang ?? 'en';
  const stepTimeout = opts.stepTimeout ?? 90_000;
  const docs = preset(slug).documents;
  const labels = docs.map((d) => ({ doc: d.doc, label: d.label[lang].toLowerCase() }));

  await page.goto(`${lang === 'hi' ? '/hi' : ''}/kit/${slug}`);
  await page.waitForSelector('[data-ready="1"]');
  const run: KitRun = { fits: [], final: null, fitEntries: [], results: {} };
  const heading = () => page.locator('h1[tabindex="-1"], h2[tabindex="-1"]').first().innerText();
  const docFor = (h: string) => {
    const lower = h.toLowerCase();
    // Longest label first so "Left thumb impression" wins over shorter overlaps.
    const hit = [...labels].sort((a, b) => b.label.length - a.label.length).find((l) => lower.includes(l.label));
    return hit?.doc ?? null;
  };

  for (let step = 0; step < 40; step++) {
    const s = await kitScreen(page);
    if (s === 'summary') break;
    if (s === 'checklist') {
      await kitAction(page).click();
      await waitScreenNot(page, 'checklist', stepTimeout);
      continue;
    }
    const h = await heading();
    const doc = docFor(h);
    if (s === 'upload') {
      const f = doc ? files[doc] : undefined;
      if (!f) throw new Error(`no fixture for "${h}" (doc ${doc})`);
      await page.locator('[data-testid="gallery-input"]').first().setInputFiles(f);
      const spec = docs.find((d) => d.doc === doc);
      if (spec?.format === 'pdf') {
        // Certificate step: pages are listed, then "Make PDF" in the action bar.
        await expect(kitAction(page)).toBeEnabled({ timeout: stepTimeout });
        await kitAction(page).click();
      }
      await waitScreenNot(page, 'upload', stepTimeout);
      continue;
    }
    if (s === 'crop') {
      await expect(kitAction(page)).toBeEnabled({ timeout: stepTimeout });
      const before = (await fitEntries(page)).length;
      const t0 = Date.now();
      await kitAction(page).click();
      await waitScreenNot(page, 'crop', stepTimeout);
      const wallMs = Date.now() - t0;
      const entries = await fitEntries(page);
      const mine = entries.slice(before);
      const measure = mine.find((e) => e.entryType === 'measure');
      let markMs: number | null = measure ? measure.duration : null;
      if (markMs === null && mine.length >= 2) markMs = mine[mine.length - 1]!.startTime - mine[0]!.startTime;
      run.fits.push({ doc: doc ?? h, wallMs, markMs });
      continue;
    }
    if (s === 'result') {
      const rules: Record<string, boolean> = {};
      for (const li of await page.locator('li[data-rule]').all()) {
        rules[(await li.getAttribute('data-rule'))!] = (await li.getAttribute('data-pass')) === 'true';
      }
      const act = kitAction(page);
      const pass = await act.isEnabled();
      run.results[doc ?? h] = { pass, rules };
      if (!pass) break;
      await act.click();
      await waitScreenNot(page, 'result', stepTimeout);
      continue;
    }
    throw new Error(`unexpected screen ${s}`);
  }
  run.final = await kitScreen(page);
  run.fitEntries = await fitEntries(page);
  return run;
}
