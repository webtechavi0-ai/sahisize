import { describe, expect, it } from 'vitest';
import { exifPayload, fakeJpeg } from '../testing/fixtures';
import { inspectJpeg, makeJfifApp0, padWithCom, setDpi, stripMetadata, walkMarkers } from './jpeg-markers';

describe('jpeg markers', () => {
  it('walks to SOS and inspects the header', () => {
    const b = fakeJpeg({ w: 200, h: 230, exif: exifPayload(6, true), com: 'hi' });
    const info = inspectJpeg(b);
    expect(info.markers).toEqual(['APP0', 'APP1', 'COM', 'SOF0', 'SOS']);
    expect([info.width, info.height, info.baseline, info.hasExif, info.comSegments]).toEqual([200, 230, true, true, 1]);
    expect(info.lumaSampling).toEqual({ h: 2, v: 2 });
    expect(inspectJpeg(fakeJpeg({ sof: 0xc2 })).progressive).toBe(true);
  });

  it('setDpi patches the first JFIF APP0 in place (same length)', () => {
    const b = fakeJpeg();
    const out = setDpi(b, 200);
    expect(out.length).toBe(b.length);
    expect(inspectJpeg(out).jfif).toEqual({ units: 1, xDensity: 200, yDensity: 200 });
    expect(b[13]).toBe(0); // input untouched
  });

  it('setDpi inserts a JFIF APP0 right after SOI when missing', () => {
    const b = fakeJpeg({ jfif: false, exif: exifPayload(1, false) });
    const out = setDpi(b, 300);
    expect(out.length).toBe(b.length + 18);
    expect(Array.from(out.subarray(2, 20))).toEqual(Array.from(makeJfifApp0(1, 300, 300)));
    expect(inspectJpeg(out).markers[0]).toBe('APP0');
  });

  it('stripMetadata keeps only the first JFIF APP0', () => {
    const b = fakeJpeg({ exif: exifPayload(6, true), com: 'comment' });
    const out = stripMetadata(b);
    const info = inspectJpeg(out);
    expect(info.markers).toEqual(['APP0', 'SOF0', 'SOS']);
    expect(info.hasExif).toBe(false);
    // scan data is byte-identical
    expect(Array.from(out.subarray(out.length - 8))).toEqual(Array.from(b.subarray(b.length - 8)));
  });

  it('padWithCom reaches the exact target size after the JFIF APP0', () => {
    const b = fakeJpeg();
    for (const target of [b.length + 4, b.length + 100, b.length + 70_000, b.length + 65_539]) {
      const out = padWithCom(b, target);
      expect(out.length).toBe(target);
      const segs = walkMarkers(out);
      expect(segs[0]!.marker).toBe(0xe0);
      expect(segs[1]!.marker).toBe(0xfe);
    }
    // gaps of 1-3 bytes round up to the 4-byte minimum segment
    expect(padWithCom(b, b.length + 2).length).toBe(b.length + 4);
    expect(padWithCom(b, b.length - 5).length).toBe(b.length);
  });
});
