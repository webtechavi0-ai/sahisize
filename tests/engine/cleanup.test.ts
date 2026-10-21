import { describe, expect, it } from 'vitest';
import { cleanupRaster, type CleanupStats } from '@/engine/cleanup';
import type { RasterImage } from '@/engine/types';
import { synthSignature, synthThumb, type Paper } from './helpers/synth';

interface Metrics {
  /** Ink bounding-box width / output width (SPEC 7.4: >= 80%). */
  coverage: number;
  /** Pure-white share of non-ink pixels (SPEC 14.1: >= 98%). */
  whiteBg: number;
  dark: number;
}

function metrics(r: RasterImage): Metrics {
  const { width: w, height: h, data: d } = r;
  let x0 = w, x1 = -1, dark = 0, bg = 0, white = 0;
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) {
      const p = (y * w + x) * 4;
      const l = (d[p]! * 77 + d[p + 1]! * 150 + d[p + 2]! * 29) >> 8;
      if (l < 128) {
        dark++;
        if (x < x0) x0 = x;
        if (x > x1) x1 = x;
      } else {
        bg++;
        if (d[p] === 255 && d[p + 1] === 255 && d[p + 2] === 255) white++;
      }
    }
  return { coverage: x1 >= x0 ? (x1 - x0 + 1) / w : 0, whiteBg: bg ? white / bg : 1, dark };
}

const sum = (m: Uint8Array) => m.reduce((a, b) => a + b, 0);

describe('cleanup (SPEC 7.4, 14.1)', () => {
  const cases: { paper: Paper; thickness: number; seed: number; w: number; h: number; ink?: 'black' | 'blue' }[] = [];
  let seed = 100;
  for (const paper of ['shadow', 'grey', 'white'] as Paper[])
    for (const thickness of [2, 4, 9])
      for (const [w, h] of [[1200, 500], [1600, 900]] as const) cases.push({ paper, thickness, seed: seed++, w, h });
  cases.push({ paper: 'shadow', thickness: 5, seed: 900, w: 1400, h: 600, ink: 'blue' });

  it.each(cases)('signature $paper paper, $thickness px strokes, $w×$h', async ({ paper, thickness, seed, w, h, ink }) => {
    const { raster, mask } = synthSignature(w, h, seed, { paper, thickness, ink });
    const stats = {} as CleanupStats;
    const out = await cleanupRaster(raster, 'signature', { strength: 50, ink: 'black', targetAspect: 7 / 3 }, undefined, stats);
    const m = metrics(out);
    expect(m.coverage).toBeGreaterThanOrEqual(0.8);
    expect(m.whiteBg).toBeGreaterThanOrEqual(0.98);
    const truth = sum(mask);
    expect(m.dark).toBeGreaterThan(truth * 0.7); // ink kept
    expect(m.dark).toBeLessThan(truth * 1.5); // no shadow turned into ink
    expect(Math.abs(out.width / out.height - 7 / 3)).toBeLessThan(0.02);
  });

  it('thumb, blue ink path keeps blue ink on pure white', async () => {
    const { raster, mask } = synthThumb(800, 800, 7, 'blue', 'shadow');
    const out = await cleanupRaster(raster, 'thumb', { strength: 50, ink: 'blue', targetAspect: 1 });
    const m = metrics(out);
    expect(m.whiteBg).toBeGreaterThanOrEqual(0.98);
    expect(m.dark).toBeGreaterThan(sum(mask) * 0.6);
    // ink pixels are blue-dominant
    let blue = 0, inkPx = 0;
    for (let p = 0; p < out.data.length; p += 4) {
      if (out.data[p] === 255) continue;
      inkPx++;
      if (out.data[p + 2]! > out.data[p]! + 40) blue++;
    }
    expect(blue / inkPx).toBeGreaterThan(0.95);
  });

  it('despeckle drops dust dots; blank page returns white', async () => {
    const { raster } = synthSignature(1000, 400, 3, { paper: 'white', thickness: 4 });
    for (let i = 0; i < 40; i++) {
      const x = 20 + ((i * 97) % 960);
      const y = 5 + ((i * 53) % 30);
      const p = (y * 1000 + x) * 4;
      raster.data[p] = raster.data[p + 1] = raster.data[p + 2] = 10;
    }
    const stats = {} as CleanupStats;
    await cleanupRaster(raster, 'signature', { strength: 50, ink: 'black' }, undefined, stats);
    expect(stats.speckles).toBeGreaterThanOrEqual(30);
    expect(stats.bbox!.y).toBeGreaterThan(40); // dust rows near the top are not part of the ink box
    const blank = { data: new Uint8ClampedArray(300 * 200 * 4).fill(240), width: 300, height: 200 };
    const out = await cleanupRaster(blank, 'signature', { strength: 50, ink: 'black' });
    expect(metrics(out).dark).toBe(0);
  });

  it('strength slider: higher strength keeps fewer faint pixels', async () => {
    const { raster } = synthSignature(1000, 400, 5, { paper: 'shadow', thickness: 3 });
    const lo = {} as CleanupStats;
    const hi = {} as CleanupStats;
    await cleanupRaster(raster, 'signature', { strength: 10, ink: 'black' }, undefined, lo);
    await cleanupRaster(raster, 'signature', { strength: 90, ink: 'black' }, undefined, hi);
    expect(hi.threshold).toBeLessThan(lo.threshold);
    expect(hi.inkPixels).toBeLessThanOrEqual(lo.inkPixels);
  });

  it('runs under 400 ms on a 4000×3000 photo (Node proxy for SPEC 7.4 target)', async () => {
    const { raster } = synthSignature(4000, 3000, 77, { paper: 'shadow', thickness: 12 });
    await cleanupRaster(raster, 'signature', { strength: 50, ink: 'black' }); // warm WASM resize
    const t = performance.now();
    await cleanupRaster(raster, 'signature', { strength: 50, ink: 'black', targetAspect: 7 / 3 });
    const ms = performance.now() - t;
    console.log(`[perf] cleanup 4000×3000: ${ms.toFixed(0)} ms`);
    expect(ms).toBeLessThan(400);
  }, 60_000);
});
