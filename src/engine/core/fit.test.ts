import { beforeAll, describe, expect, it } from 'vitest';
import { decodeJpeg, decodePng, encodeJpeg, encodePng } from '../codecs/codecs';
import { resizeRaster } from '../codecs/resize';
import { gradient } from '../testing/fixtures';
import { useNodeWasm } from '../testing/node-wasm-source';
import { EngineError, type DocSpec, type RasterImage } from '../types';
import { Encoder, fitRaster, searchDown, type FitDeps } from './fit';
import { inspectJpeg } from './jpeg-markers';
import { targetWindow } from './kb';
import { readPngDpi } from './png-chunks';
import { allRequiredPass } from './verify';

beforeAll(() => useNodeWasm());

const spec = (over: Partial<DocSpec>): DocSpec => ({
  doc: 'photo',
  label: { en: 'Photo', hi: 'फोटो' },
  widthPx: 200,
  heightPx: 230,
  minKB: 20,
  maxKB: 50,
  format: 'jpg',
  dpi: null,
  fileName: 'photo.jpg',
  rules: [],
  ...over,
});

const realDeps: FitDeps = {
  encodeJpeg,
  encodePng,
  resize: resizeRaster,
  decode: (b, f) => (f === 'jpg' ? decodeJpeg(b) : decodePng(b)),
  now: () => 0,
};

/** Fake encoder: bytes whose length follows size(q, pixels). Enough for the search/error paths. */
function fakeDeps(sizeOf: (q: number, px: number) => number): FitDeps {
  return {
    encodeJpeg: async (r: RasterImage, q: number) => new Uint8Array(Math.round(sizeOf(q, r.width * r.height))),
    resize: resizeRaster,
    now: () => 0,
  };
}

describe('fitRaster with real codecs', () => {
  it('fits a fixed-size photo into 20–50 KB as baseline JPEG with DPI', async () => {
    const res = await fitRaster(gradient(800, 920, 40), spec({ dpi: 200 }), realDeps);
    const win = targetWindow(20, 50);
    expect(res.widthPx).toBe(200);
    expect(res.heightPx).toBe(230);
    expect(res.sizeBytes).toBeGreaterThanOrEqual(win.hardLo);
    expect(res.sizeBytes).toBeLessThanOrEqual(win.hardHi);
    const info = inspectJpeg(res.bytes);
    expect(info.baseline).toBe(true);
    expect(info.jfif).toEqual({ units: 1, xDensity: 200, yDensity: 200 });
    expect(info.hasExif).toBe(false);
    expect(allRequiredPass(res.checks)).toBe(true);
    expect(res.stages).toContain('dpi');
  });

  it('pads a plain image up to the minimum with COM segments', async () => {
    const flat: RasterImage = { data: new Uint8ClampedArray(200 * 230 * 4).fill(255), width: 200, height: 230 };
    const res = await fitRaster(flat, spec({}), realDeps);
    expect(res.warnings).toContain('PADDED');
    expect(res.sizeBytes).toBeGreaterThanOrEqual(20 * 1024);
    expect(inspectJpeg(res.bytes).comSegments).toBeGreaterThan(0);
    expect(allRequiredPass(res.checks)).toBe(true);
  });

  it('letterboxes a signature with a mismatched aspect', async () => {
    const res = await fitRaster(gradient(300, 300, 5), spec({ doc: 'signature', widthPx: 140, heightPx: 60, minKB: null, maxKB: 20 }), realDeps);
    expect(res.warnings).toContain('LETTERBOXED');
    expect([res.widthPx, res.heightPx]).toEqual([140, 60]);
  });

  it('writes PNG pHYs for PNG specs', async () => {
    const res = await fitRaster(gradient(100, 100), spec({ format: 'png', widthPx: 100, heightPx: 100, minKB: null, maxKB: 100, dpi: 300 }), realDeps);
    expect(res.format).toBe('png');
    expect(readPngDpi(res.bytes)).toBe(300);
  });

  it('KB-only photo downsizes to reach max KB', async () => {
    const res = await fitRaster(gradient(1200, 1600, 80), spec({ widthPx: null, heightPx: null, minKB: null, maxKB: 15 }), realDeps);
    expect(res.sizeBytes).toBeLessThanOrEqual(15 * 1000);
    expect(res.dims?.mode).toBe('kb-only');
  });
});

describe('fitRaster errors', () => {
  it('throws SPEC_INCOMPLETE without maxKB and UNSUPPORTED_TYPE for pdf', async () => {
    await expect(fitRaster(gradient(10, 10), spec({ maxKB: null }), realDeps)).rejects.toMatchObject({ code: 'SPEC_INCOMPLETE' });
    await expect(fitRaster(gradient(10, 10), spec({ format: 'pdf' }), realDeps)).rejects.toMatchObject({ code: 'UNSUPPORTED_TYPE' });
    await expect(fitRaster(gradient(10, 10), spec({ minKB: 60, maxKB: 50 }), realDeps)).rejects.toBeInstanceOf(EngineError);
  });

  it('throws TOO_DETAILED when even blurred q=5 is over max (fixed pixels)', async () => {
    const deps = fakeDeps(() => 80_000);
    await expect(fitRaster(gradient(200, 230), spec({}), deps)).rejects.toMatchObject({
      code: 'TOO_DETAILED',
      details: { maxKB: 50 },
    });
  });
});

describe('searchDown', () => {
  it('finds the highest q under the window top within the iteration budget', async () => {
    const win = targetWindow(null, 50);
    const sizeAt = (q: number) => Math.round(8000 * Math.exp((Math.log(8) / 85) * (q - 5)));
    const enc = new Encoder(gradient(4, 4), async (_r, q) => new Uint8Array(sizeAt(q)));
    const c90 = await enc.at(90);
    const found = await searchDown(enc, win, 90, c90.size);
    expect(found).not.toBeNull();
    expect(found!.size).toBeLessThanOrEqual(win.hi);
    expect(sizeAt(found!.q + 4)).toBeGreaterThan(win.hi); // within tolerance of the best q
    expect(enc.count).toBeLessThanOrEqual(8);
  });
});
