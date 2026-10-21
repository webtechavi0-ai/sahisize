import { describe, expect, it } from 'vitest';
import { decodeJpeg, encodeJpeg } from '@/engine/codecs';
import { inspectJpeg, padWithCom, setDpi, stripMetadata, walkMarkers, MAX_SEGMENT_PAYLOAD } from '@/engine/jpeg-markers';
import { pixelHash } from '@/engine/raster';
import { insertCom, insertExifFirst, removeApp0, synthPhoto } from './helpers/synth';

const photo = synthPhoto(160, 120, 7, { noise: 8 });
const base = await encodeJpeg(photo, 80);

describe('encoder output (SPEC 7.3 encoder settings)', () => {
  it('is baseline SOF0, 4:2:0, JFIF only', () => {
    const info = inspectJpeg(base);
    expect(info.sof).toBe(0xc0);
    expect(info.baseline).toBe(true);
    expect(info.progressive).toBe(false);
    expect(info.lumaSampling).toEqual({ h: 2, v: 2 });
    expect(info.markers[0]).toBe('APP0');
    expect(info.markers.filter((m) => m.startsWith('APP'))).toEqual(['APP0']);
    expect(info.width).toBe(160);
    expect(info.height).toBe(120);
  });
});

describe('setDpi (SPEC 7.5, 14.1)', () => {
  it('patches an existing JFIF APP0 in place (same size)', () => {
    const out = setDpi(base, 200);
    expect(out.length).toBe(base.length);
    expect(inspectJpeg(out).jfif).toEqual({ units: 1, xDensity: 200, yDensity: 200 });
  });

  it('inserts JFIF APP0 when missing', async () => {
    const noApp0 = removeApp0(base);
    expect(inspectJpeg(noApp0).jfif).toBeNull();
    const out = setDpi(noApp0, 300);
    expect(out.length).toBe(noApp0.length + 18);
    const info = inspectJpeg(out);
    expect(info.markers[0]).toBe('APP0');
    expect(info.jfif).toEqual({ units: 1, xDensity: 300, yDensity: 300 });
    expect(pixelHash(await decodeJpeg(out))).toBe(pixelHash(await decodeJpeg(base)));
  });

  it('handles EXIF APP1 before APP0 (phone layout): JFIF moved first, one JFIF total', async () => {
    const withExif = insertExifFirst(base, 6);
    expect(inspectJpeg(withExif).markers.slice(0, 2)).toEqual(['APP1', 'APP0']);
    const out = setDpi(withExif, 200);
    const info = inspectJpeg(out);
    expect(info.markers[0]).toBe('APP0');
    expect(info.markers.filter((m) => m === 'APP0').length).toBe(1);
    expect(info.jfif?.xDensity).toBe(200);
    // after stripMetadata EXIF is gone and JFIF kept
    const clean = stripMetadata(out);
    const ci = inspectJpeg(clean);
    expect(ci.hasExif).toBe(false);
    expect(ci.jfif).toEqual({ units: 1, xDensity: 200, yDensity: 200 });
    expect(pixelHash(await decodeJpeg(clean))).toBe(pixelHash(await decodeJpeg(base)));
  });

  it('handles existing COM segments', async () => {
    const withCom = insertCom(base, 'scanner comment');
    const out = setDpi(withCom, 240);
    const info = inspectJpeg(out);
    expect(info.jfif?.xDensity).toBe(240);
    expect(info.comSegments).toBe(1);
    expect(pixelHash(await decodeJpeg(out))).toBe(pixelHash(await decodeJpeg(base)));
  });

  it('handles no APP0 + EXIF + COM together', () => {
    const messy = insertCom(insertExifFirst(removeApp0(base), 3, false), 'x');
    const out = stripMetadata(setDpi(messy, 96));
    const info = inspectJpeg(out);
    expect(info.markers[0]).toBe('APP0');
    expect(info.hasExif).toBe(false);
    expect(info.comSegments).toBe(0);
    expect(info.jfif).toEqual({ units: 1, xDensity: 96, yDensity: 96 });
  });

  it('tolerates 0xFF fill bytes before a marker', () => {
    const b = new Uint8Array(base.length + 2);
    b.set(base.subarray(0, 2));
    b[2] = 0xff;
    b[3] = 0xff;
    b.set(base.subarray(2), 4);
    expect(() => walkMarkers(b)).not.toThrow();
    expect(inspectJpeg(setDpi(b, 200)).jfif?.xDensity).toBe(200);
  });
});

describe('padWithCom (SPEC 7.3 step 4b, 14.1)', () => {
  it('reaches the exact target size and keeps pixels identical', async () => {
    const target = base.length + 12345;
    const out = padWithCom(base, target);
    expect(out.length).toBe(target);
    const info = inspectJpeg(out);
    expect(info.markers.slice(0, 2)).toEqual(['APP0', 'COM']);
    expect(pixelHash(await decodeJpeg(out))).toBe(pixelHash(await decodeJpeg(base)));
  });

  it('uses several COM segments above 65,533 bytes of payload', async () => {
    const target = base.length + MAX_SEGMENT_PAYLOAD * 2 + 1000;
    const out = padWithCom(base, target);
    expect(out.length).toBe(target);
    expect(inspectJpeg(out).comSegments).toBe(3);
    expect(pixelHash(await decodeJpeg(out))).toBe(pixelHash(await decodeJpeg(base)));
  });

  it('never splits into a 1-3 byte remainder', () => {
    for (const extra of [1, 2, 3, 4, 5, 65537, 65538, 65539, 65540, 65541, 131074]) {
      const out = padWithCom(base, base.length + extra);
      expect(out.length - base.length).toBeGreaterThanOrEqual(extra);
      expect(out.length - base.length).toBeLessThanOrEqual(Math.max(4, extra));
      expect(() => walkMarkers(out)).not.toThrow();
    }
  });

  it('pads after SOI when there is no APP0', async () => {
    const noApp0 = removeApp0(base);
    const out = padWithCom(noApp0, noApp0.length + 500);
    expect(inspectJpeg(out).markers[0]).toBe('COM');
    expect(pixelHash(await decodeJpeg(out))).toBe(pixelHash(await decodeJpeg(base)));
  });
});
