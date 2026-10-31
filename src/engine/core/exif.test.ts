import { describe, expect, it } from 'vitest';
import { coordRaster, exifPayload, fakeJpeg, pixel } from '../testing/fixtures';
import { readOrientation } from './exif';
import { applyOrientation } from './raster';
import { readImageHeader, sniff } from './sniff';

describe('EXIF orientation', () => {
  it('reads little- and big-endian IFD0 orientation', () => {
    for (const o of [1, 3, 6, 8]) {
      expect(readOrientation(fakeJpeg({ exif: exifPayload(o, true) }))).toBe(o);
      expect(readOrientation(fakeJpeg({ exif: exifPayload(o, false) }))).toBe(o);
    }
  });

  it('defaults to 1 when absent, invalid or not a JPEG', () => {
    expect(readOrientation(fakeJpeg())).toBe(1);
    expect(readOrientation(fakeJpeg({ exif: exifPayload(9, true) }))).toBe(1);
    expect(readOrientation(new Uint8Array([0x89, 0x50, 0x4e, 0x47]))).toBe(1);
  });

  it('applyOrientation makes the image upright', () => {
    const r = coordRaster(3, 2); // R = x, G = y
    const r6 = applyOrientation(r, 6); // rotate 90° clockwise
    expect([r6.width, r6.height]).toEqual([2, 3]);
    expect(pixel(r6, 0, 0)).toEqual([0, 1]); // bottom-left goes to top-left
    expect(pixel(r6, 1, 0)).toEqual([0, 0]);
    const r8 = applyOrientation(r, 8);
    expect(pixel(r8, 0, 0)).toEqual([2, 0]);
    const r3 = applyOrientation(r, 3);
    expect(pixel(r3, 0, 0)).toEqual([2, 1]);
    const r2 = applyOrientation(r, 2);
    expect(pixel(r2, 0, 0)).toEqual([2, 0]);
    const r5 = applyOrientation(r, 5); // transpose
    expect([r5.width, r5.height]).toEqual([2, 3]);
    expect(pixel(r5, 1, 2)).toEqual([2, 1]);
  });

  it('header reader reports display size after orientation', () => {
    const b = fakeJpeg({ w: 4000, h: 3000, exif: exifPayload(6, true) });
    expect(sniff(b)).toBe('jpeg');
    expect(readImageHeader(b)).toEqual({ width: 4000, height: 3000, orientation: 6, displayWidth: 3000, displayHeight: 4000 });
  });
});
