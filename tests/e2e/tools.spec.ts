/**
 * SPEC 14.3 "Each tool page: upload fixture → result passes → download", plus the per-tool
 * rules from SPEC 5.2 that are checkable from the downloaded bytes. Tools whose route is not
 * built yet are skipped (route detected from dist/).
 */
import { test, expect } from '@playwright/test';
import { unzipSync } from 'fflate';
import { fixture, routeExists } from './helpers/app';
import {
  insidePage,
  isA4,
  isJpeg,
  isPdf,
  isPng,
  jpegInfo,
  pdfImagePlacements,
} from './helpers/files';
import { pxFromText, runTool, type ToolRun, type ToolStep } from './helpers/tools';

interface ToolCase {
  name: string;
  route: string;
  step: ToolStep;
  verify: (run: ToolRun) => Promise<void> | void;
  tag?: string;
}

const photo = fixture('photo.jpg');
const sign = fixture('signature.png');
const thumb = fixture('thumb.jpg');
const decl = fixture('declaration.jpg');

function expectAllRequiredPass(run: ToolRun) {
  expect(
    run.downloadEnabled,
    `download enabled; heading "${run.heading}"; rules ${JSON.stringify(run.rules)}`,
  ).toBe(true);
  expect(run.file, 'file downloaded').toBeDefined();
}

/** Output JPEG matches the px the PassCheck claims; baseline; has a JFIF density. */
function expectJpegMatchesChecks(run: ToolRun) {
  const b = run.file!.bytes;
  expect(isJpeg(b), 'JPEG output').toBe(true);
  const j = jpegInfo(b);
  expect(j.sof, 'baseline SOF0').toBe(0xc0);
  const dims = run.rules.dims && pxFromText(run.rules.dims.text);
  if (dims) expect([j.width, j.height]).toEqual(dims);
  return j;
}

const compressTargets = [10, 20, 30, 50, 100, 200, 500];

const CASES: ToolCase[] = [
  ...compressTargets.map((n): ToolCase => ({
    name: `compress to ${n} KB`,
    route: `/tools/compress-image-to-${n}kb`,
    tag: n === 20 ? ' @smoke' : '',
    step: { files: [n <= 100 ? photo : decl] },
    verify: (run) => {
      expectAllRequiredPass(run);
      expectJpegMatchesChecks(run);
      const size = run.file!.bytes.length;
      // SPEC T1: output lands within [target − 10%, target] (either KB reading).
      expect(size, `${size} B ≤ ${n} KB`).toBeLessThanOrEqual(n * 1024);
      expect(size, `${size} B ≥ ${n} KB − 10%`).toBeGreaterThanOrEqual(0.9 * n * 1000);
    },
  })),
  {
    name: 'compress (custom target, default 50 KB)',
    route: '/tools/compress-image',
    step: { files: [photo] },
    verify: (run) => {
      expectAllRequiredPass(run);
      expectJpegMatchesChecks(run);
      expect(run.file!.bytes.length).toBeLessThanOrEqual(50 * 1024);
    },
  },
  {
    name: 'resize to 300 px wide',
    route: '/tools/resize-image',
    step: {
      files: [photo],
      fill: [{ label: /^Width/, value: '300', afterPrefill: true }],
      resultText: /300\s*×\s*36[67]/,
    },
    verify: (run) => {
      expectAllRequiredPass(run);
      const j = expectJpegMatchesChecks(run);
      expect(j.width).toBe(300);
      // aspect lock on by default: 900×1100 → 300×367 (±1)
      expect(Math.abs(j.height - 367)).toBeLessThanOrEqual(1);
    },
  },
  {
    name: 'convert JPG → PNG/WebP (default format)',
    route: '/tools/convert-image',
    step: { files: [photo] },
    verify: (run) => {
      expectAllRequiredPass(run);
      const b = run.file!.bytes;
      const ext = run.file!.name.split('.').pop();
      if (ext === 'png') expect(isPng(b)).toBe(true);
      else if (ext === 'webp') expect(Buffer.from(b.slice(8, 12)).toString()).toBe('WEBP');
      else expect(isJpeg(b)).toBe(true);
    },
  },
  {
    name: 'signature resize (first exam rule)',
    route: '/tools/signature-resize',
    step: { files: [sign], action: /^Auto-fit$/ },
    verify: (run) => {
      expectAllRequiredPass(run);
      expectJpegMatchesChecks(run);
    },
  },
  {
    name: 'thumb impression (first exam rule)',
    route: '/tools/thumb-impression',
    step: { files: [thumb], action: /^Auto-fit$/ },
    verify: (run) => {
      expectAllRequiredPass(run);
      expectJpegMatchesChecks(run);
    },
  },
  {
    name: 'handwritten declaration scan',
    route: '/tools/handwritten-declaration',
    step: { files: [decl], action: /^Auto-fit$/ },
    verify: (run) => {
      expectAllRequiredPass(run);
      expectJpegMatchesChecks(run);
    },
  },
  {
    name: 'images to PDF (A4, ≤ 300 KB)',
    route: '/tools/images-to-pdf',
    step: { files: [photo, decl], action: /^Make PDF/ },
    verify: async (run) => {
      expectAllRequiredPass(run);
      const b = run.file!.bytes;
      expect(isPdf(b)).toBe(true);
      expect(b.length).toBeLessThanOrEqual(300 * 1024);
      const { pages, images } = await pdfImagePlacements(b);
      expect(pages).toBe(2);
      for (const p of images) {
        expect(isA4(p.pageW, p.pageH), `A4 page ${p.page}`).toBe(true);
        expect(insidePage(p), `image inside page ${p.page}: ${JSON.stringify(p)}`).toBe(true);
      }
    },
  },
  {
    name: 'compress PDF (image-heavy → ≤ 300 KB)',
    route: '/tools/compress-pdf',
    step: { files: [fixture('scan.pdf')], action: /^Compress/ },
    verify: async (run) => {
      expectAllRequiredPass(run);
      const b = run.file!.bytes;
      expect(isPdf(b)).toBe(true);
      expect(b.length).toBeLessThanOrEqual(300 * 1024);
      expect((await pdfImagePlacements(b)).pages).toBe(2);
    },
  },
  {
    name: 'compress PDF to 200 KB (size page preset)',
    route: '/tools/compress-pdf-to-200kb',
    step: { files: [fixture('scan.pdf')], action: /^Compress to 200 KB/ },
    verify: async (run) => {
      expectAllRequiredPass(run);
      const b = run.file!.bytes;
      expect(isPdf(b)).toBe(true);
      expect(run.file!.name).toMatch(/-200kb\.pdf$/);
      expect(b.length).toBeLessThanOrEqual(200 * 1000);
      expect((await pdfImagePlacements(b)).pages).toBe(2);
    },
  },
  {
    name: 'JPG to PDF under 300 KB (size page preset)',
    route: '/tools/jpg-to-pdf-under-300kb',
    step: { files: [photo, decl], action: /^Make PDF/ },
    verify: async (run) => {
      expectAllRequiredPass(run);
      const b = run.file!.bytes;
      expect(isPdf(b)).toBe(true);
      expect(run.file!.name).toBe('documents-300kb.pdf');
      expect(b.length).toBeLessThanOrEqual(300 * 1000);
      const { pages, images } = await pdfImagePlacements(b);
      expect(pages).toBe(2);
      for (const p of images) expect(isA4(p.pageW, p.pageH), `A4 page ${p.page}`).toBe(true);
    },
  },
  {
    name: 'passport photo sheet (4 copies)',
    route: '/tools/passport-photo-sheet',
    step: { files: [photo], action: /^Make sheet/ },
    verify: async (run) => {
      expectAllRequiredPass(run);
      const b = run.file!.bytes;
      if (isPdf(b)) {
        const { pages, images } = await pdfImagePlacements(b);
        expect(pages).toBe(1);
        for (const p of images) expect(insidePage(p), JSON.stringify(p)).toBe(true);
      } else {
        expect(isJpeg(b)).toBe(true);
        // 300 DPI print sheet (SPEC T8)
        expect(jpegInfo(b).xDensity).toBe(300);
      }
    },
  },
  {
    name: 'batch compress (2 images → ZIP ≤ 50 KB each)',
    route: '/tools/batch-compress',
    step: { files: [photo, thumb], action: /^Compress 2 images/, doneButton: /\(ZIP\)/ },
    verify: (run) => {
      const zip = unzipSync(run.file!.bytes);
      const imgs = Object.entries(zip).filter(([n]) => /\.jpe?g$/i.test(n));
      expect(imgs.length).toBe(2);
      for (const [n, b] of imgs) {
        expect(isJpeg(b), n).toBe(true);
        expect(b.length, n).toBeLessThanOrEqual(50 * 1024);
      }
    },
  },
  {
    name: 'custom preset from URL (?w=200&h=230&min=20&max=50)',
    route: '/tools/custom-preset?w=200&h=230&min=20&max=50',
    step: { files: [photo], action: /^Auto-fit$/ },
    verify: (run) => {
      expectAllRequiredPass(run);
      const j = expectJpegMatchesChecks(run);
      expect([j.width, j.height]).toEqual([200, 230]);
      const n = run.file!.bytes.length;
      expect(n).toBeGreaterThanOrEqual(20 * 1024);
      expect(n).toBeLessThanOrEqual(50 * 1000);
    },
  },
];

test.describe('standalone tools', () => {
  for (const c of CASES) {
    test(`${c.name}${c.tag ?? ''}`, async ({ page }) => {
      test.skip(!routeExists(c.route), `route ${c.route} not built yet`);
      await page.goto(c.route);
      const run = await runTool(page, c.step);
      await c.verify(run);
    });
  }

  test('compress PDF: text-only PDF reports "already small"', async ({ page }) => {
    test.skip(!routeExists('/tools/compress-pdf'), 'route not built yet');
    await page.goto('/tools/compress-pdf');
    const { hydrateIsland } = await import('./helpers/tools');
    await hydrateIsland(page);
    await page
      .locator('[data-testid="gallery-input"]')
      .first()
      .setInputFiles(fixture('text-only.pdf'));
    const btn = page.getByRole('button', { name: /^Compress/ }).first();
    await expect(btn).toBeEnabled();
    await btn.click();
    await expect(page.getByText(/already (small|under)/i).first()).toBeVisible({ timeout: 60_000 });
  });

  test('compress PDF: a mostly-text PDF stops early with "Compress anyway"', async ({ page }) => {
    test.skip(!routeExists('/tools/compress-pdf'), 'route not built yet');
    await page.goto('/tools/compress-pdf');
    const { hydrateIsland } = await import('./helpers/tools');
    await hydrateIsland(page);
    await page.locator('[data-testid="gallery-input"]').first().setInputFiles(fixture('text-long.pdf'));
    await page.getByText('100 KB', { exact: true }).first().click();
    const btn = page.getByRole('button', { name: /^Compress to 100 KB/ }).first();
    await expect(btn).toBeEnabled();
    const t0 = Date.now();
    await btn.click();
    await expect(page.getByText(/mostly text/i).first()).toBeVisible({ timeout: 30_000 });
    expect(Date.now() - t0).toBeLessThan(10_000); // no rasterising before the message
    await page.getByRole('button', { name: 'Compress anyway' }).click();
    // 40 text pages cannot reach 100 KB even at 72 DPI: the sample pass says so quickly.
    await expect(page.getByText(/Ready:|Could not make the PDF smaller/).first()).toBeVisible({ timeout: 60_000 });
  });

  test('tools index links to every built tool', async ({ page }) => {
    test.skip(!routeExists('/tools'), 'no /tools index');
    await page.goto('/tools');
    for (const c of CASES) {
      const path = c.route.replace(/\?.*$/, '');
      if (!routeExists(path) || /custom-preset/.test(path)) continue;
      if (/compress-image-to-(10|30|100|200|500)kb/.test(path)) continue; // not all n are linked
      await expect(page.locator(`a[href="${path}"]`).first(), path).toBeAttached();
    }
  });
});
