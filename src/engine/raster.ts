/**
 * Pure RGBA raster operations on typed arrays (PLAN 1.6 #6: no canvas in the core).
 */
import type { CropRect, Flip, RasterImage } from './types';

export type RGBA = readonly [number, number, number, number];
export const WHITE: RGBA = [255, 255, 255, 255];

export function createRaster(width: number, height: number, fill: RGBA = WHITE): RasterImage {
  const data = new Uint8ClampedArray(width * height * 4);
  const [r, g, b, a] = fill;
  if (r === 0 && g === 0 && b === 0 && a === 0) return { data, width, height };
  const u32 = new Uint32Array(data.buffer);
  const tmp = new Uint8ClampedArray([r, g, b, a]);
  u32.fill(new Uint32Array(tmp.buffer)[0]!);
  return { data, width, height };
}

export function cloneRaster(r: RasterImage): RasterImage {
  return { data: new Uint8ClampedArray(r.data), width: r.width, height: r.height };
}

/** Copy `src` into `dst` at (dx, dy), clipped. */
export function blit(dst: RasterImage, src: RasterImage, dx: number, dy: number): void {
  const x0 = Math.max(0, dx);
  const y0 = Math.max(0, dy);
  const x1 = Math.min(dst.width, dx + src.width);
  const y1 = Math.min(dst.height, dy + src.height);
  if (x1 <= x0 || y1 <= y0) return;
  const rowLen = (x1 - x0) * 4;
  for (let y = y0; y < y1; y++) {
    const s = ((y - dy) * src.width + (x0 - dx)) * 4;
    const d = (y * dst.width + x0) * 4;
    dst.data.set(src.data.subarray(s, s + rowLen), d);
  }
}

/** Crop to a rectangle (rounded). Areas outside the source are filled with `fill`. */
export function cropRaster(r: RasterImage, rect: CropRect, fill: RGBA = WHITE): RasterImage {
  const x = Math.round(rect.x);
  const y = Math.round(rect.y);
  const w = Math.max(1, Math.round(rect.w));
  const h = Math.max(1, Math.round(rect.h));
  if (x === 0 && y === 0 && w === r.width && h === r.height) return cloneRaster(r);
  const inside = x >= 0 && y >= 0 && x + w <= r.width && y + h <= r.height;
  const out = inside ? { data: new Uint8ClampedArray(w * h * 4), width: w, height: h } : createRaster(w, h, fill);
  blit(out, r, -x, -y);
  return out;
}

export function flipH(r: RasterImage): RasterImage {
  const { width: w, height: h } = r;
  const src = new Uint32Array(r.data.buffer, r.data.byteOffset, w * h);
  const out = new Uint8ClampedArray(w * h * 4);
  const dst = new Uint32Array(out.buffer);
  for (let y = 0; y < h; y++) {
    const row = y * w;
    for (let x = 0; x < w; x++) dst[row + x] = src[row + w - 1 - x]!;
  }
  return { data: out, width: w, height: h };
}

export function flipV(r: RasterImage): RasterImage {
  const { width: w, height: h } = r;
  const out = new Uint8ClampedArray(w * h * 4);
  const row = w * 4;
  for (let y = 0; y < h; y++) out.set(r.data.subarray((h - 1 - y) * row, (h - y) * row), y * row);
  return { data: out, width: w, height: h };
}

/** Rotate clockwise by k * 90 degrees (exact, lossless). */
export function rotate90(r: RasterImage, k: number): RasterImage {
  const q = ((k % 4) + 4) % 4;
  if (q === 0) return cloneRaster(r);
  const { width: w, height: h } = r;
  const src = new Uint32Array(r.data.buffer, r.data.byteOffset, w * h);
  const out = new Uint8ClampedArray(w * h * 4);
  const dst = new Uint32Array(out.buffer);
  if (q === 2) {
    for (let i = 0, n = w * h; i < n; i++) dst[n - 1 - i] = src[i]!;
    return { data: out, width: w, height: h };
  }
  // q=1: new (x', y') = (h-1-y, x), new width = h
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const v = src[y * w + x]!;
      if (q === 1) dst[x * h + (h - 1 - y)] = v;
      else dst[(w - 1 - x) * h + y] = v;
    }
  }
  return { data: out, width: h, height: w };
}

/**
 * Rotate clockwise by any angle about the centre with bilinear sampling. The canvas grows to
 * the rotated bounding box; new corners are filled with `fill` (white).
 */
export function rotateArbitrary(r: RasterImage, deg: number, fill: RGBA = WHITE): RasterImage {
  const norm = ((deg % 360) + 360) % 360;
  if (Math.abs(norm % 90) < 1e-9) return rotate90(r, Math.round(norm / 90));
  const rad = (norm * Math.PI) / 180;
  const cos = Math.cos(rad);
  const sin = Math.sin(rad);
  const { width: w, height: h, data: s } = r;
  const nw = Math.ceil(Math.abs(w * cos) + Math.abs(h * sin) - 1e-6);
  const nh = Math.ceil(Math.abs(w * sin) + Math.abs(h * cos) - 1e-6);
  const out = new Uint8ClampedArray(nw * nh * 4);
  const cx = w / 2;
  const cy = h / 2;
  const ncx = nw / 2;
  const ncy = nh / 2;
  for (let y = 0; y < nh; y++) {
    const dy = y + 0.5 - ncy;
    for (let x = 0; x < nw; x++) {
      const dx = x + 0.5 - ncx;
      // inverse rotation (counter-clockwise) to find the source point
      const sx = dx * cos + dy * sin + cx - 0.5;
      const sy = -dx * sin + dy * cos + cy - 0.5;
      const o = (y * nw + x) * 4;
      const x0 = Math.floor(sx);
      const y0 = Math.floor(sy);
      const fx = sx - x0;
      const fy = sy - y0;
      for (let c = 0; c < 4; c++) {
        let acc = 0;
        for (let j = 0; j < 2; j++) {
          const yy = y0 + j;
          const wy = j ? fy : 1 - fy;
          for (let i = 0; i < 2; i++) {
            const xx = x0 + i;
            const wx = i ? fx : 1 - fx;
            const v = xx >= 0 && yy >= 0 && xx < w && yy < h ? s[(yy * w + xx) * 4 + c]! : fill[c]!;
            acc += v * wx * wy;
          }
        }
        out[o + c] = acc;
      }
    }
  }
  return { data: out, width: nw, height: nh };
}

/** crop() contract (types.ts): flip (h then v) -> rotate clockwise -> crop rect. */
export function transformAndCrop(r: RasterImage, rect: CropRect, rotationDeg: number, flip: Flip): RasterImage {
  let cur = r;
  if (flip.h) cur = flipH(cur);
  if (flip.v) cur = flipV(cur);
  if (rotationDeg % 360 !== 0) cur = rotateArbitrary(cur, rotationDeg);
  return cropRaster(cur, rect);
}

/** Apply EXIF orientation (1-8) so the image is upright. */
export function applyOrientation(r: RasterImage, orientation: number): RasterImage {
  switch (orientation) {
    case 2:
      return flipH(r);
    case 3:
      return rotate90(r, 2);
    case 4:
      return flipV(r);
    case 5: // transpose
      return flipH(rotate90(r, 1));
    case 6:
      return rotate90(r, 1);
    case 7: // transverse
      return flipH(rotate90(r, 3));
    case 8:
      return rotate90(r, 3);
    default:
      return r;
  }
}

/** Rec. 601 luma, one byte per pixel. */
export function toGray(r: RasterImage): Uint8Array {
  const n = r.width * r.height;
  const out = new Uint8Array(n);
  const d = r.data;
  for (let i = 0, p = 0; i < n; i++, p += 4) {
    out[i] = (d[p]! * 77 + d[p + 1]! * 150 + d[p + 2]! * 29 + 128) >> 8;
  }
  return out;
}

export function hasAlpha(r: RasterImage): boolean {
  const d = r.data;
  for (let p = 3; p < d.length; p += 4) if (d[p]! < 255) return true;
  return false;
}

/** Composite onto an opaque background colour (for JPEG output). Returns a new raster. */
export function flattenAlpha(r: RasterImage, bg: RGBA = WHITE): RasterImage {
  const out = new Uint8ClampedArray(r.data.length);
  const d = r.data;
  for (let p = 0; p < d.length; p += 4) {
    const a = d[p + 3]!;
    if (a === 255) {
      out[p] = d[p]!;
      out[p + 1] = d[p + 1]!;
      out[p + 2] = d[p + 2]!;
    } else {
      const k = a / 255;
      out[p] = d[p]! * k + bg[0] * (1 - k);
      out[p + 1] = d[p + 1]! * k + bg[1] * (1 - k);
      out[p + 2] = d[p + 2]! * k + bg[2] * (1 - k);
    }
    out[p + 3] = 255;
  }
  return { data: out, width: r.width, height: r.height };
}

/** Parse "#RRGGBB" / "#RGB" to RGBA; anything else -> white. */
export function parseColor(s: string | undefined): RGBA {
  if (!s) return WHITE;
  const m = /^#?([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(s.trim());
  if (!m) return WHITE;
  let hex = m[1]!;
  if (hex.length === 3) hex = hex.replace(/./g, (c) => c + c);
  const n = parseInt(hex, 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255, 255];
}

/** FNV-1a 32-bit over RGBA bytes plus dims (for "pixels unchanged" tests). */
export function pixelHash(r: RasterImage): string {
  let h = 0x811c9dc5;
  h = Math.imul(h ^ r.width, 0x01000193);
  h = Math.imul(h ^ r.height, 0x01000193);
  const d = r.data;
  for (let i = 0; i < d.length; i++) h = Math.imul(h ^ d[i]!, 0x01000193);
  return (h >>> 0).toString(16).padStart(8, '0');
}
