// @vitest-environment node
/**
 * The two new tools on the REAL engine in Node, with the same spec/options helpers the
 * islands use:
 *  - increase: a plain image that is far under the minimum lands in
 *    [minKB×1024, maxKB×1000] with the exact source pixels;
 *  - name-date: the strip is drawn inside the final 350×450 px (MPPSC rule) and the KB
 *    range still passes.
 */
import { describe, expect, it } from 'vitest';
import { setWasmSource } from '@/engine/codecs';
import { installImageDataPolyfill, nodeWasmSource } from '@/engine/codecs-node';
import { createEngineCore } from '@/engine/engine-core';
import { blockTextRaster } from '@/engine/strip';
import type { FitResult, RasterImage } from '@/engine/types';
import { increaseFitOptions, increaseSpec } from '@/components/tools/increase';
import { nameDateFitOptions } from '@/components/tools/name-date';
import { nameDateExams } from '@/components/tools/name-date-server';

installImageDataPolyfill();
setWasmSource(nodeWasmSource);

/** White paper with a few dark strokes (a signature-like, very compressible image). */
function plain(w: number, h: number): RasterImage {
  const data = new Uint8ClampedArray(w * h * 4).fill(255);
  for (let y = Math.floor(h * 0.4); y < Math.floor(h * 0.6); y++) {
    for (let x = Math.floor(w * 0.1); x < Math.floor(w * 0.9); x++) {
      if ((x + y) % 7 < 2) {
        const p = (y * w + x) * 4;
        data[p] = data[p + 1] = data[p + 2] = 20;
      }
    }
  }
  return { data, width: w, height: h };
}

/** A smooth grey "face photo" stand-in. */
function photo(w: number, h: number): RasterImage {
  const data = new Uint8ClampedArray(w * h * 4);
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) {
      const p = (y * w + x) * 4;
      data[p] = 120 + ((x * 3) % 40);
      data[p + 1] = 110 + ((y * 5) % 50);
      data[p + 2] = 100 + (((x + y) * 2) % 60);
      data[p + 3] = 255;
    }
  return { data, width: w, height: h };
}

const requiredPass = (r: FitResult) => r.checks.filter((c) => (c.level ?? 'required') === 'required').every((c) => c.pass);

describe('increase image size in KB (real engine)', () => {
  const core = createEngineCore({ native: false });

  for (const [w, h, min, max] of [
    [140, 60, 10, 20],
    [300, 200, 20, 50],
    [600, 400, 50, 100],
  ] as const) {
    it(`${w}×${h} → at least ${min} KB, at most ${max} KB, same pixels`, async () => {
      const img = await core.adoptRaster(plain(w, h));
      try {
        const r = await core.fit(img, increaseSpec(min, max), increaseFitOptions(true));
        expect([r.widthPx, r.heightPx]).toEqual([w, h]);
        expect(r.sizeBytes).toBeGreaterThanOrEqual(min * 1024);
        expect(r.sizeBytes).toBeLessThanOrEqual(max * 1000);
        expect(r.format).toBe('jpg');
        expect(requiredPass(r)).toBe(true);
      } finally {
        await core.release(img);
      }
    }, 120_000);
  }
});

describe('name and date on photo (real engine)', () => {
  const core = createEngineCore({ native: false, textRaster: blockTextRaster });

  it('draws the strip inside the MPPSC 350×450 px rule and passes 25–100 KB', async () => {
    const mppsc = nameDateExams('en').find((e) => e.slug === 'mppsc')!;
    const img = await core.adoptRaster(photo(700, 900));
    try {
      const r = await core.fit(img, mppsc.option.spec, nameDateFitOptions({ name: 'Asha Verma', date: '21/10/2026' }));
      expect([r.widthPx, r.heightPx]).toEqual([350, 450]);
      expect(r.stages).toContain('strip');
      expect(r.sizeBytes).toBeGreaterThanOrEqual(25 * 1024);
      expect(r.sizeBytes).toBeLessThanOrEqual(100 * 1000);
      expect(requiredPass(r)).toBe(true);
      // The bottom-left corner is the strip's white background; the top-left is the photo.
      const out = core.getRaster(await core.decode(new Blob([r.bytes])));
      const lum = (x: number, y: number) => {
        const p = (y * out.width + x) * 4;
        return (out.data[p]! + out.data[p + 1]! + out.data[p + 2]!) / 3;
      };
      expect(lum(3, out.height - 3)).toBeGreaterThan(235);
      expect(lum(3, 3)).toBeLessThan(200);
    } finally {
      await core.release(img);
    }
  }, 120_000);
});
