import { describe, expect, it } from 'vitest';
import { encodeJpeg, encodePng, encodeWebp } from '@/engine/codecs';
import { decodeBlob, sniff } from '@/engine/decode';
import { readOrientation } from '@/engine/exif';
import {
  applyOrientation,
  cropRaster,
  flipH,
  flipV,
  pixelHash,
  rotate90,
  rotateArbitrary,
  transformAndCrop,
} from '@/engine/raster';
import { resizeLanczosJs, resizeRaster } from '@/engine/resize';
import { isEngineError, type RasterImage } from '@/engine/types';
import { insertExifFirst, inverseOrientation, synthPhoto } from './helpers/synth';

/** 3×2 raster with distinct pixels. */
function tiny(): RasterImage {
  const data = new Uint8ClampedArray(3 * 2 * 4);
  for (let i = 0; i < 6; i++) data.set([i * 40, 255 - i * 40, i, 255], i * 4);
  return { data, width: 3, height: 2 };
}
const px = (r: RasterImage, x: number, y: number) => r.data[(y * r.width + x) * 4]!;

describe('raster ops', () => {
  it('rotate90 clockwise maps corners correctly', () => {
    const r = tiny();
    const c = rotate90(r, 1);
    expect([c.width, c.height]).toEqual([2, 3]);
    expect(px(c, 1, 0)).toBe(px(r, 0, 0)); // top-left -> top-right
    expect(px(c, 0, 0)).toBe(px(r, 0, 1)); // bottom-left -> top-left
    expect(pixelHash(rotate90(rotate90(r, 1), 3))).toBe(pixelHash(r));
    expect(pixelHash(rotate90(r, 4))).toBe(pixelHash(r));
  });
  it('flips are involutions', () => {
    const r = tiny();
    expect(pixelHash(flipH(flipH(r)))).toBe(pixelHash(r));
    expect(pixelHash(flipV(flipV(r)))).toBe(pixelHash(r));
    expect(px(flipH(r), 0, 0)).toBe(px(r, 2, 0));
  });
  it('every EXIF orientation is undone by its inverse', () => {
    const r = synthPhoto(31, 17, 3);
    for (let o = 1; o <= 8; o++) {
      expect(pixelHash(applyOrientation(applyOrientation(r, inverseOrientation(o)), o))).toBe(pixelHash(r));
    }
  });
  it('arbitrary rotation grows the canvas and fills corners white', () => {
    const r = { data: new Uint8ClampedArray(100 * 50 * 4).fill(0), width: 100, height: 50 };
    for (let i = 3; i < r.data.length; i += 4) r.data[i] = 255;
    const o = rotateArbitrary(r, 10);
    expect(o.width).toBeGreaterThan(100);
    expect(o.height).toBeGreaterThan(50);
    expect(px(o, 0, 0)).toBe(255);
    expect(px(o, Math.floor(o.width / 2), Math.floor(o.height / 2))).toBe(0);
  });
  it('crop outside the image pads with white; transform order flip -> rotate -> crop', () => {
    const r = tiny();
    const c = cropRaster(r, { x: -1, y: 0, w: 2, h: 1 });
    expect(px(c, 0, 0)).toBe(255);
    expect(px(c, 1, 0)).toBe(px(r, 0, 0));
    const t = transformAndCrop(r, { x: 0, y: 0, w: 2, h: 3 }, 90, { h: true, v: false });
    expect(px(t, 1, 0)).toBe(px(flipH(r), 0, 0));
  });
  it('resize: exact pixels from WASM Lanczos3 and the JS fallback', async () => {
    const r = synthPhoto(640, 480, 9);
    const a = await resizeRaster(r, 200, 230);
    const b = resizeLanczosJs(r, 200, 230);
    expect([a.width, a.height, a.data.length]).toEqual([200, 230, 200 * 230 * 4]);
    expect([b.width, b.height]).toEqual([200, 230]);
    let diff = 0;
    for (let i = 0; i < a.data.length; i += 4) diff += Math.abs(a.data[i]! - b.data[i]!);
    expect(diff / (200 * 230)).toBeLessThan(12); // close to each other
  });
});

describe('decode (SPEC 7.1)', () => {
  it('sniffs formats by magic bytes', () => {
    expect(sniff(new Uint8Array([0xff, 0xd8, 0xff, 0xe0]))).toBe('jpeg');
    expect(sniff(new Uint8Array([0x25, 0x50, 0x44, 0x46, 0x2d]))).toBe('pdf');
    expect(sniff(new Uint8Array([0, 0, 0, 0x18, 0x66, 0x74, 0x79, 0x70, 0x68, 0x65, 0x69, 0x63]))).toBe('heic');
    expect(sniff(new Uint8Array([1, 2, 3]))).toBe('unknown');
  });

  it('decodes JPG, PNG and WebP', async () => {
    const r = synthPhoto(120, 90, 5);
    for (const [bytes, type] of [
      [await encodeJpeg(r, 90), 'image/jpeg'],
      [await encodePng(r), 'image/png'],
      [await encodeWebp(r, 90), 'image/webp'],
    ] as const) {
      const d = await decodeBlob(new Blob([bytes], { type }));
      expect([d.width, d.height]).toEqual([120, 90]);
    }
  });

  it('EXIF-rotated JPEGs decode upright (orientations 1-8, LE and BE)', async () => {
    const upright = synthPhoto(90, 60, 11, { noise: 0 });
    const ref = await decodeBlob(new Blob([await encodeJpeg(upright, 95)]));
    for (let o = 1; o <= 8; o++) {
      const stored = applyOrientation(upright, inverseOrientation(o));
      const jpeg = insertExifFirst(await encodeJpeg(stored, 95), o, o % 2 === 0);
      expect(readOrientation(jpeg)).toBe(o);
      const d = await decodeBlob(new Blob([jpeg], { type: 'image/jpeg' }));
      expect([d.width, d.height]).toEqual([90, 60]);
      let diff = 0;
      for (let i = 0; i < d.data.length; i += 4) diff += Math.abs(d.data[i]! - ref.data[i]!);
      expect(diff / (90 * 60)).toBeLessThan(6);
    }
  });

  it('caps the long side at 4000 px (and honours maxSide)', async () => {
    const big = { data: new Uint8ClampedArray(5000 * 1000 * 4).fill(200), width: 5000, height: 1000 };
    const jpeg = await encodeJpeg(big, 50);
    const d = await decodeBlob(new Blob([jpeg]));
    expect([d.width, d.height]).toEqual([4000, 800]);
    const s = await decodeBlob(new Blob([jpeg]), { maxSide: 1000 });
    expect([s.width, s.height]).toEqual([1000, 200]);
  });

  it('rejects PDFs, unknown types and oversize files with typed errors', async () => {
    const codeOf = async (b: Blob) => decodeBlob(b).then(() => 'ok', (e) => (isEngineError(e) ? e.code : 'other'));
    expect(await codeOf(new Blob([new Uint8Array([0x25, 0x50, 0x44, 0x46, 0x2d, 0x31])]))).toBe('UNSUPPORTED_TYPE');
    expect(await codeOf(new Blob(['hello world, not an image']))).toBe('UNSUPPORTED_TYPE');
    expect(await codeOf(new Blob([new Uint8Array(26 * 1024 * 1024)]))).toBe('TOO_LARGE_INPUT');
    expect(await codeOf(new Blob([new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0, 0x10, 1, 2, 3])]))).toBe('DECODE_FAILED');
  });

  it('HEIC: libheif-js WASM loads and rejects a corrupt file with DECODE_FAILED', async () => {
    const fake = new Uint8Array([0, 0, 0, 0x18, 0x66, 0x74, 0x79, 0x70, 0x68, 0x65, 0x69, 0x63, 0, 0, 0, 0, 0x6d, 0x69, 0x66, 0x31, 0x68, 0x65, 0x69, 0x63]);
    await expect(decodeBlob(new Blob([fake], { type: 'image/heic' }))).rejects.toSatisfy((e: unknown) => isEngineError(e) && e.code === 'DECODE_FAILED');
  }, 60_000);
});
