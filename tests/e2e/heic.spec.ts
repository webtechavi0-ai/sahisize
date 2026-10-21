/**
 * QUESTIONS Q24: the "20 KB on mobile" guide claims "SahiSize reads HEIC and outputs a normal
 * JPG, so you can compress and convert in one step". Checked end to end with an iPhone-style
 * HEIC fixture (HEVC still image, made with macOS sips) on the convert tool, the 20 KB
 * compress tool and the kit photo step.
 */
import { test, expect } from '@playwright/test';
import { fixture, routeExists } from './helpers/app';
import { isJpeg, jpegInfo } from './helpers/files';
import { runKit } from './helpers/kit';
import { hydrateIsland, runTool } from './helpers/tools';

const HEIC = fixture('photo.heic');

test.describe('HEIC input → JPG output', () => {
  test('convert tool: HEIC → JPG', async ({ page }) => {
    test.skip(!routeExists('/tools/convert-image'), 'route not built yet');
    await page.goto('/tools/convert-image');
    await hydrateIsland(page);
    await page.getByRole('radio', { name: 'JPG' }).check();
    const run = await runTool(page, { files: [HEIC], resultText: /JPG/ });
    expect(run.downloadEnabled, JSON.stringify(run.rules)).toBe(true);
    expect(run.file!.name).toMatch(/\.jpe?g$/);
    expect(isJpeg(run.file!.bytes)).toBe(true);
    const j = jpegInfo(run.file!.bytes);
    expect(j.width).toBe(600); // fixture is 600 px wide
  });

  test('compress to 20 KB: HEIC in, JPG ≤ 20 KB out (guide claim)', async ({ page }) => {
    test.skip(!routeExists('/tools/compress-image-to-20kb'), 'route not built yet');
    await page.goto('/tools/compress-image-to-20kb');
    const run = await runTool(page, { files: [HEIC] });
    expect(run.downloadEnabled, JSON.stringify(run.rules)).toBe(true);
    expect(isJpeg(run.file!.bytes)).toBe(true);
    expect(jpegInfo(run.file!.bytes).sof).toBe(0xc0);
    expect(run.file!.bytes.length).toBeLessThanOrEqual(20 * 1024);
  });

  test('IBPS PO kit: photo step accepts HEIC', async ({ page }) => {
    const run = await runKit(page, 'ibps-po', {
      photo: HEIC,
      signature: fixture('signature.png'),
      thumb: fixture('thumb.jpg'),
      declaration: fixture('declaration.jpg'),
      certificate: fixture('declaration.jpg'),
    });
    expect(run.results.photo?.pass, JSON.stringify(run.results.photo)).toBe(true);
  });
});
