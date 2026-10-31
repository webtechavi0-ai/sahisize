/** Test support: deterministic synthetic rasters and minimal JPEG byte streams. */
import { mulberry32 } from '../core/grain';
import type { RasterImage } from '../types';

/** Smooth gradient with optional noise (noise makes JPEGs bigger). */
export function gradient(w: number, h: number, noise = 0, seed = 1): RasterImage {
  const rnd = mulberry32(seed);
  const data = new Uint8ClampedArray(w * h * 4);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const p = (y * w + x) * 4;
      const n = noise ? (rnd() - 0.5) * 2 * noise : 0;
      data[p] = (x / w) * 255 + n;
      data[p + 1] = (y / h) * 255 + n;
      data[p + 2] = 128 + n;
      data[p + 3] = 255;
    }
  }
  return { data, width: w, height: h };
}

/** w×h raster where pixel (x, y) has R = x, G = y (for orientation tests). */
export function coordRaster(w: number, h: number): RasterImage {
  const data = new Uint8ClampedArray(w * h * 4);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const p = (y * w + x) * 4;
      data[p] = x;
      data[p + 1] = y;
      data[p + 2] = 0;
      data[p + 3] = 255;
    }
  }
  return { data, width: w, height: h };
}

export function pixel(r: RasterImage, x: number, y: number): [number, number] {
  const p = (y * r.width + x) * 4;
  return [r.data[p]!, r.data[p + 1]!];
}

const seg = (marker: number, payload: number[]): number[] => {
  const len = payload.length + 2;
  return [0xff, marker, (len >> 8) & 0xff, len & 0xff, ...payload];
};

/** EXIF APP1 payload with only IFD0 Orientation. */
export function exifPayload(orientation: number, littleEndian: boolean): number[] {
  const u16 = (v: number) => (littleEndian ? [v & 0xff, v >> 8] : [v >> 8, v & 0xff]);
  const u32 = (v: number) =>
    littleEndian ? [v & 0xff, (v >> 8) & 0xff, (v >> 16) & 0xff, v >>> 24] : [v >>> 24, (v >> 16) & 0xff, (v >> 8) & 0xff, v & 0xff];
  const tiff = [
    ...(littleEndian ? [0x49, 0x49] : [0x4d, 0x4d]),
    ...u16(42),
    ...u32(8),
    ...u16(1), // one entry
    ...u16(0x0112),
    ...u16(3), // SHORT
    ...u32(1),
    ...u16(orientation),
    0,
    0,
    ...u32(0), // next IFD
  ];
  return [0x45, 0x78, 0x69, 0x66, 0, 0, ...tiff];
}

/**
 * A structurally valid JPEG header (not decodable pixels): SOI, optional APP segments, SOF0
 * w×h, SOS, a few scan bytes, EOI. Enough for marker-level tools.
 */
export function fakeJpeg(opts: { w?: number; h?: number; jfif?: boolean; exif?: number[]; com?: string; sof?: number } = {}): Uint8Array<ArrayBuffer> {
  const { w = 64, h = 48, jfif = true, sof = 0xc0 } = opts;
  const bytes: number[] = [0xff, 0xd8];
  if (jfif) bytes.push(...seg(0xe0, [0x4a, 0x46, 0x49, 0x46, 0, 1, 1, 0, 0, 1, 0, 1, 0, 0]));
  if (opts.exif) bytes.push(...seg(0xe1, opts.exif));
  if (opts.com) bytes.push(...seg(0xfe, [...opts.com].map((c) => c.charCodeAt(0))));
  bytes.push(...seg(sof, [8, h >> 8, h & 0xff, w >> 8, w & 0xff, 3, 1, 0x22, 0, 2, 0x11, 1, 3, 0x11, 1]));
  bytes.push(...seg(0xda, [3, 1, 0, 2, 0x11, 3, 0x11, 0, 63, 0]));
  bytes.push(0x12, 0x34, 0x56, 0xff, 0x00, 0x78, 0xff, 0xd9);
  return new Uint8Array(bytes);
}
