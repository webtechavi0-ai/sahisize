import { beforeAll, describe, expect, it } from 'vitest';
import { encodeJpeg, encodePng } from '../codecs/codecs';
import { inspectJpeg } from '../core/jpeg-markers';
import { exifPayload, gradient } from '../testing/fixtures';
import { useNodeWasm } from '../testing/node-wasm-source';
import type { DocSpec } from '../types';
import { createEngineCore } from './engine-core';

beforeAll(() => useNodeWasm());

/** Insert an EXIF APP1 right after the JFIF APP0 of a real JPEG. */
function withExif(jpeg: Uint8Array, orientation: number): Uint8Array<ArrayBuffer> {
  const payload = exifPayload(orientation, true);
  const seg = [0xff, 0xe1, (payload.length + 2) >> 8, (payload.length + 2) & 0xff, ...payload];
  const app0End = 4 + ((jpeg[4]! << 8) | jpeg[5]!);
  const out = new Uint8Array(jpeg.length + seg.length);
  out.set(jpeg.subarray(0, app0End));
  out.set(seg, app0End);
  out.set(jpeg.subarray(app0End), app0End + seg.length);
  return out;
}

const photo: DocSpec = {
  doc: 'photo',
  label: { en: 'Photo', hi: 'फोटो' },
  widthPx: 100,
  heightPx: 120,
  minKB: null,
  maxKB: 30,
  format: 'jpg',
  dpi: 200,
  fileName: 'photo.jpg',
  rules: [],
};

describe('engine core (Node, WASM decode path)', () => {
  it('decodes, applies EXIF orientation, crops, fits and releases', async () => {
    const core = createEngineCore({ native: false, now: () => 0 });
    core.init(3);
    const jpeg = withExif(await encodeJpeg(gradient(64, 32), 90), 6);
    const img = await core.decode(new Blob([jpeg], { type: 'image/jpeg' }));
    expect(img.id).toMatch(/^g3-\d+$/);
    expect([img.width, img.height]).toEqual([32, 64]); // rotated upright

    const cropped = await core.crop(img, { x: 0, y: 0, w: 30, h: 36 }, 0, { h: false, v: false });
    expect([cropped.width, cropped.height]).toEqual([30, 36]);

    const res = await core.fit(cropped, photo);
    expect([res.widthPx, res.heightPx]).toEqual([100, 120]);
    expect(inspectJpeg(res.bytes).jfif?.xDensity).toBe(200);

    core.release(img);
    expect(core.handleCount()).toBe(1);
    await expect(core.preview(img)).rejects.toMatchObject({ code: 'STALE_HANDLE' });
  });

  it('caps the long side and rejects unsupported input', async () => {
    const core = createEngineCore({ native: false });
    const png = await encodePng(gradient(300, 100));
    const img = await core.decode(new Blob([png]), { maxSide: 150 });
    expect([img.width, img.height]).toEqual([150, 50]);
    await expect(core.decode(new Blob([new Uint8Array([1, 2, 3, 4])]))).rejects.toMatchObject({ code: 'UNSUPPORTED_TYPE' });
    await expect(core.decode(new Blob([new TextEncoder().encode('%PDF-1.4')]))).rejects.toMatchObject({
      code: 'UNSUPPORTED_TYPE',
      details: { type: 'pdf' },
    });
  });

  it('converts, zips and builds PDFs from handles', async () => {
    const core = createEngineCore({ native: false });
    const img = await core.adoptRaster(gradient(80, 60));
    const jpg = await core.convert(img, 'jpg', { quality: 80 });
    expect(inspectJpeg(jpg).baseline).toBe(true);
    const pdf = await core.imagesToPdf([{ kind: 'image', img }], { page: 'a4', maxKB: null });
    expect(new TextDecoder().decode(pdf.subarray(0, 5))).toBe('%PDF-');
    const zip = await core.zip([{ name: 'a.jpg', bytes: jpg }], 'readme');
    expect(zip[0]).toBe(0x50);
    await expect(core.adoptRaster({ data: new Uint8ClampedArray(3), width: 1, height: 1 })).rejects.toMatchObject({
      code: 'DECODE_FAILED',
    });
  });
});
