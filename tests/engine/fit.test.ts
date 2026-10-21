import { describe, expect, it } from 'vitest';
import { fitRaster, MAX_SEARCH_ITER } from '@/engine/fit';
import { inspectJpeg } from '@/engine/jpeg-markers';
import { createRaster } from '@/engine/raster';
import { blockTextRaster } from '@/engine/strip';
import { isEngineError, type DocSpec } from '@/engine/types';
import { fakeDeps, type SizeModel } from './helpers/fake-encoder';
import { synthDetailed, synthPhoto } from './helpers/synth';

const S = (o: Partial<DocSpec>): DocSpec => ({
  doc: 'photo',
  label: { en: 'Photo', hi: 'फोटो' },
  widthPx: 200,
  heightPx: 230,
  minKB: 20,
  maxKB: 50,
  format: 'jpg',
  dpi: 200,
  fileName: 'photo.jpg',
  rules: [],
  ...o,
});
const img = synthPhoto(400, 460, 1, { noise: 4 });

/** size depends only on q (and a scale factor). */
const qModel = (f: (q: number) => number): SizeModel => (q) => f(q);

describe('fitRaster stages under a fake encoder (SPEC 7.3, PLAN 3.5)', () => {
  it('q=90 inside the window: encode + dpi only', async () => {
    const deps = fakeDeps(qModel(() => 30000));
    const r = await fitRaster(img, S({}), deps);
    expect(r.stages).toEqual(['encode', 'dpi']);
    expect(r.quality).toBe(90);
    expect(inspectJpeg(r.bytes).jfif).toEqual({ units: 1, xDensity: 200, yDensity: 200 });
    expect(r.widthPx).toBe(200);
    expect(r.heightPx).toBe(230);
    expect(r.checks.every((c) => c.pass)).toBe(true);
  });

  it('too big: binary search picks the highest q under max within 8 iterations', async () => {
    const f = (q: number) => 20000 + q * 900; // q=33 -> 49700 <= 50000; q=34 -> 50600
    const deps = fakeDeps(qModel(f));
    const r = await fitRaster(img, S({}), deps);
    expect(r.stages).toEqual(['encode', 'search', 'dpi']);
    expect(r.sizeBytes).toBeLessThanOrEqual(50000);
    expect(r.sizeBytes).toBeGreaterThanOrEqual(20480);
    expect(r.quality).toBe(33);
    expect(deps.calls.length - 1).toBeLessThanOrEqual(MAX_SEARCH_ITER + 1);
  });

  it('exact highest q when the window is narrow', async () => {
    const f = (q: number) => 1000 + q * 400; // max 20 KB: q=47 -> 19800, q=48 -> 20200
    const deps = fakeDeps(qModel(f));
    const r = await fitRaster(img, S({ minKB: 10, maxKB: 20 }), deps);
    expect(r.quality).toBe(47);
  });

  it('too big at q=5 with fixed pixels: blur stage, then TOO_DETAILED when blur is not enough', async () => {
    const detailed = synthDetailed(200, 230, 3);
    // size proportional to entropy: blur reduces it
    const model: SizeModel = (q, e) => (q <= 90 ? 1 : 2) * e * 1400;
    const deps = fakeDeps(model);
    const r = await fitRaster(detailed, S({ maxKB: 60, minKB: 10 }), deps);
    expect(r.stages).toContain('blur');
    expect(r.warnings).toContain('BLURRED');
    expect(r.sizeBytes).toBeLessThanOrEqual(60000);

    const hopeless = fakeDeps(() => 999999);
    await expect(fitRaster(detailed, S({}), hopeless)).rejects.toSatisfy(
      (e: unknown) => isEngineError(e) && e.code === 'TOO_DETAILED' && e.details?.maxKB === 50,
    );
  });

  it('too small: search up in [90,100]', async () => {
    const f = (q: number) => (q <= 90 ? 15000 : 15000 + (q - 90) * 1500); // q=94 -> 21000
    const r = await fitRaster(img, S({}), fakeDeps(qModel(f)));
    expect(r.stages).toEqual(['encode', 'search', 'dpi']);
    expect(r.quality).toBe(94);
  });

  it('still too small at q=100: grain makes it', async () => {
    const model: SizeModel = (q, e) => 5000 + e * 8000 * (q >= 95 ? 1 : 0.5);
    const flat = createRaster(300, 345, [250, 250, 250, 255]);
    const r = await fitRaster(flat, S({}), fakeDeps(model), { seed: 1 });
    expect(r.stages).toContain('grain');
    expect(r.warnings).toContain('GRAIN');
    expect(r.stages).not.toContain('pad');
    expect(r.sizeBytes).toBeGreaterThanOrEqual(20480);
  });

  it('grain not enough: COM padding to the middle of the window', async () => {
    const r = await fitRaster(img, S({}), fakeDeps(() => 3000));
    expect(r.stages).toEqual(['encode', 'search', 'grain', 'dpi', 'pad']);
    expect(r.warnings).toContain('PADDED');
    expect(r.sizeBytes).toBe(Math.round((20480 + 50000) / 2));
    expect(inspectJpeg(r.bytes).comSegments).toBe(1);
  });

  it('pixel range: shrinks 5% steps when q=5 is still too big', async () => {
    const spec = S({ doc: 'signature', widthPx: null, heightPx: null, minWidthPx: 350, maxWidthPx: 500, minHeightPx: 350, maxHeightPx: 500, minKB: 20, maxKB: 100 });
    const model: SizeModel = (_q, _e, px) => px * 0.45; // 500² -> 112 KB, 465² -> 97 KB
    const r = await fitRaster(createRaster(800, 800), spec, fakeDeps(model));
    expect(r.stages).toContain('shrink');
    expect(r.widthPx).toBeLessThan(500);
    expect(r.widthPx).toBeGreaterThanOrEqual(350);
    expect(r.widthPx).toBe(r.heightPx);
  });

  it('pixel range: grows before grain/pad (RRB min 140×60)', async () => {
    const spec = S({ doc: 'signature', widthPx: null, heightPx: null, minWidthPx: 140, minHeightPx: 60, minKB: 30, maxKB: 49, dpi: 100 });
    const model: SizeModel = (q, _e, px) => px * (q === 100 ? 0.15 : 0.1); // 350×150 too small; ~600×257 -> 23 KB
    const r = await fitRaster(createRaster(700, 300), spec, fakeDeps(model));
    expect(r.stages.indexOf('grow')).toBeGreaterThan(-1);
    expect(r.stages.indexOf('grow')).toBeLessThan(r.stages.indexOf('pad'));
    expect(r.widthPx).toBeGreaterThan(350);
    expect(r.widthPx).toBeLessThanOrEqual(600);
    expect(r.sizeBytes).toBeGreaterThanOrEqual(30 * 1024);
    expect(r.sizeBytes).toBeLessThanOrEqual(49 * 1000);
  });

  it('KB-only: shrinks rather than going below q=50', async () => {
    const spec = S({ widthPx: null, heightPx: null, minKB: 10, maxKB: 100 });
    const model: SizeModel = (q, _e, px) => px * 1.2 * Math.exp((q - 90) * 0.02); // 413×531 @q50 ~ 118 KB
    const r = await fitRaster(img, spec, fakeDeps(model));
    expect(r.stages).toContain('shrink');
    expect(r.warnings).toContain('DOWNSCALED');
    expect(r.quality).toBeGreaterThanOrEqual(50);
    expect(r.widthPx).toBeLessThan(413);
    expect(r.widthPx).toBeGreaterThanOrEqual(207);
  });

  it('KB-only with allowDownscale=false never shrinks', async () => {
    const spec = S({ widthPx: null, heightPx: null, minKB: 10, maxKB: 100 });
    const model: SizeModel = (q, _e, px) => px * 0.9 * Math.exp((q - 90) * 0.02);
    const r = await fitRaster(img, spec, fakeDeps(model), { allowDownscale: false });
    expect(r.stages).not.toContain('shrink');
    expect(r.widthPx).toBe(413);
  });

  it('SPEC_INCOMPLETE when maxKB is null; pdf format rejected', async () => {
    await expect(fitRaster(img, S({ maxKB: null }), fakeDeps())).rejects.toSatisfy((e: unknown) => isEngineError(e) && e.code === 'SPEC_INCOMPLETE');
    await expect(fitRaster(img, S({ format: 'pdf' }), fakeDeps())).rejects.toSatisfy((e: unknown) => isEngineError(e) && e.code === 'UNSUPPORTED_TYPE');
  });

  it('aspect mismatch: photo cover-crops, signature letterboxes (Q14)', async () => {
    const wide = synthPhoto(800, 300, 2);
    const p = await fitRaster(wide, S({}), fakeDeps(qModel(() => 30000)));
    expect(p.warnings).toContain('COVER_CROPPED');
    const s = await fitRaster(wide, S({ doc: 'signature', widthPx: 140, heightPx: 60, minKB: 10, maxKB: 20 }), fakeDeps(qModel(() => 15000)));
    expect(s.warnings).toContain('LETTERBOXED');
  });

  it('DPI: physical size without dpi writes 200; no dpi and no physical leaves the default', async () => {
    const a = await fitRaster(img, S({ dpi: null, physical: { width: 3.5, height: 4.5, unit: 'cm' } }), fakeDeps(qModel(() => 30000)));
    expect(inspectJpeg(a.bytes).jfif).toEqual({ units: 1, xDensity: 200, yDensity: 200 });
    const b = await fitRaster(img, S({ dpi: null }), fakeDeps(qModel(() => 30000)));
    expect(inspectJpeg(b.bytes).jfif?.units).toBe(0);
    expect(b.stages).not.toContain('dpi');
    expect(b.checks.find((c) => c.rule === 'dpi')?.level).toBe('info');
  });

  it('name/date strip (K11) stays inside the final pixels', async () => {
    const deps = { ...fakeDeps(qModel(() => 30000)), textRaster: blockTextRaster };
    const r = await fitRaster(img, S({ needsNameDateStrip: true }), deps, { nameDate: { name: 'ASHA KUMARI', date: '21/10/2026' } });
    expect(r.stages).toContain('strip');
    expect(r.widthPx).toBe(200);
    expect(r.heightPx).toBe(230);
  });

  it('size1000 warning when a file passes only under 1024', async () => {
    // window is [lo, hi] with hi = max*1000, so a normal fit always passes both readings
    const r = await fitRaster(img, S({}), fakeDeps(qModel(() => 49990)));
    expect(r.checks.find((c) => c.rule === 'size1000')?.pass).toBe(true);
    expect(r.warnings).not.toContain('PASSES_ONLY_1024');
  });
});
