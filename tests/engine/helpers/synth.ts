/**
 * Deterministic synthetic images for engine tests and scripts/make-test-corpus.ts (SPEC 14.2).
 * Everything is seeded (mulberry32) so the corpus is reproducible.
 */
import { mulberry32 } from '@/engine/grain';
import type { RasterImage } from '@/engine/types';

type Rnd = () => number;

function blank(w: number, h: number, rgb: [number, number, number]): RasterImage {
  const data = new Uint8ClampedArray(w * h * 4);
  for (let p = 0; p < data.length; p += 4) {
    data[p] = rgb[0];
    data[p + 1] = rgb[1];
    data[p + 2] = rgb[2];
    data[p + 3] = 255;
  }
  return { data, width: w, height: h };
}

function setPx(r: RasterImage, x: number, y: number, rgb: readonly number[], a = 1): void {
  if (x < 0 || y < 0 || x >= r.width || y >= r.height) return;
  const p = (y * r.width + x) * 4;
  const d = r.data;
  d[p] = d[p]! * (1 - a) + rgb[0]! * a;
  d[p + 1] = d[p + 1]! * (1 - a) + rgb[1]! * a;
  d[p + 2] = d[p + 2]! * (1 - a) + rgb[2]! * a;
}

function fillEllipse(r: RasterImage, cx: number, cy: number, rx: number, ry: number, rgb: readonly number[]): void {
  const x0 = Math.max(0, Math.floor(cx - rx));
  const x1 = Math.min(r.width - 1, Math.ceil(cx + rx));
  const y0 = Math.max(0, Math.floor(cy - ry));
  const y1 = Math.min(r.height - 1, Math.ceil(cy + ry));
  for (let y = y0; y <= y1; y++) {
    for (let x = x0; x <= x1; x++) {
      const dx = (x + 0.5 - cx) / rx;
      const dy = (y + 0.5 - cy) / ry;
      const d = dx * dx + dy * dy;
      if (d <= 1) setPx(r, x, y, rgb, d > 0.92 ? (1 - d) / 0.08 : 1);
    }
  }
}

function addNoise(r: RasterImage, amp: number, rnd: Rnd): void {
  if (amp <= 0) return;
  const d = r.data;
  for (let p = 0; p < d.length; p += 4) {
    const n = (rnd() - 0.5) * 2 * amp;
    d[p] = d[p]! + n + (rnd() - 0.5) * amp * 0.5;
    d[p + 1] = d[p + 1]! + n;
    d[p + 2] = d[p + 2]! + n + (rnd() - 0.5) * amp * 0.5;
  }
}

export type PhotoBg = 'white' | 'light' | 'blue' | 'gradient' | 'busy';

export interface PhotoOpts {
  bg?: PhotoBg;
  /** Sensor noise amplitude in levels (0-40). */
  noise?: number;
  /** Add striped/textured clothing and hair detail. */
  texture?: boolean;
}

/** Passport-style synthetic portrait: background, shoulders, face, hair, eyes, mouth. */
export function synthPhoto(w: number, h: number, seed: number, opts: PhotoOpts = {}): RasterImage {
  const rnd = mulberry32(seed);
  const bg = opts.bg ?? 'white';
  const base: Record<PhotoBg, [number, number, number]> = {
    white: [250, 250, 250],
    light: [228, 232, 236],
    blue: [120, 160, 220],
    gradient: [235, 235, 240],
    busy: [180, 170, 150],
  };
  const r = blank(w, h, base[bg]);
  if (bg === 'gradient' || bg === 'busy') {
    for (let y = 0; y < h; y++)
      for (let x = 0; x < w; x++) {
        const p = (y * w + x) * 4;
        const g = bg === 'gradient' ? -30 * (y / h) : 40 * Math.sin(x / (w / 9)) * Math.cos(y / (h / 7));
        r.data[p] = r.data[p]! + g;
        r.data[p + 1] = r.data[p + 1]! + g * 0.8;
        r.data[p + 2] = r.data[p + 2]! + g * 0.6;
      }
  }
  const s = Math.min(w, h);
  const cx = w / 2 + (rnd() - 0.5) * s * 0.05;
  const shirt = [30 + rnd() * 120, 40 + rnd() * 100, 60 + rnd() * 120];
  fillEllipse(r, cx, h * 1.02, w * 0.48, h * 0.32, shirt);
  if (opts.texture) {
    for (let y = Math.floor(h * 0.72); y < h; y++)
      for (let x = 0; x < w; x++)
        if ((x + y) % 7 < 2 && r.data[(y * w + x) * 4]! < 200) setPx(r, x, y, [240, 240, 240], 0.5);
  }
  const skin = [190 + rnd() * 40, 140 + rnd() * 40, 110 + rnd() * 30];
  fillEllipse(r, cx, h * 0.68, s * 0.11, h * 0.08, skin); // neck
  const fy = h * 0.42;
  const fry = h * 0.24;
  const frx = Math.min(w * 0.3, fry * 0.78);
  fillEllipse(r, cx, fy - fry * 0.35, frx * 1.08, fry * 0.75, [25, 20, 18]); // hair
  fillEllipse(r, cx, fy, frx, fry, skin);
  if (opts.texture) {
    for (let i = 0; i < 400; i++) {
      const a = rnd() * Math.PI;
      const rr = frx * (0.9 + rnd() * 0.25);
      setPx(r, Math.round(cx + Math.cos(a) * rr), Math.round(fy - fry * 0.35 - Math.sin(a) * fry * 0.7 * rnd()), [60, 50, 40]);
    }
  }
  fillEllipse(r, cx - frx * 0.4, fy - fry * 0.12, frx * 0.14, fry * 0.06, [250, 250, 250]);
  fillEllipse(r, cx + frx * 0.4, fy - fry * 0.12, frx * 0.14, fry * 0.06, [250, 250, 250]);
  fillEllipse(r, cx - frx * 0.4, fy - fry * 0.12, frx * 0.07, fry * 0.05, [40, 30, 25]);
  fillEllipse(r, cx + frx * 0.4, fy - fry * 0.12, frx * 0.07, fry * 0.05, [40, 30, 25]);
  fillEllipse(r, cx, fy + fry * 0.45, frx * 0.35, fry * 0.06, [150, 60, 60]);
  addNoise(r, opts.noise ?? 4, rnd);
  return r;
}

export type Paper = 'white' | 'grey' | 'shadow';

export interface SignatureOpts {
  thickness?: number;
  paper?: Paper;
  ink?: 'black' | 'blue';
  /** Extent of the ink as a fraction of the image width (default 0.6). */
  extent?: number;
}

export interface Synthetic {
  raster: RasterImage;
  /** Ground-truth ink mask (1 = ink). */
  mask: Uint8Array;
}

/** Cursive-like random strokes on paper, optionally with a strong shadow gradient. */
export function synthSignature(w: number, h: number, seed: number, opts: SignatureOpts = {}): Synthetic {
  const rnd = mulberry32(seed);
  const paper = opts.paper ?? 'white';
  const thick = opts.thickness ?? Math.max(1.5, Math.min(w, h) * 0.012);
  const extent = opts.extent ?? 0.6;
  const mask = new Uint8Array(w * h);
  const x0 = w * (0.5 - extent / 2);
  const x1 = w * (0.5 + extent / 2);
  const cy = h * (0.45 + (rnd() - 0.5) * 0.1);
  const amp = Math.min(h * 0.18, (x1 - x0) * 0.12);
  const f1 = 6 + rnd() * 8;
  const f2 = 2 + rnd() * 3;
  const ph = rnd() * 6;
  const steps = Math.ceil((x1 - x0) * 3);
  const stamp = (px: number, py: number, rad: number) => {
    const r2 = rad * rad;
    for (let y = Math.floor(py - rad); y <= Math.ceil(py + rad); y++)
      for (let x = Math.floor(px - rad); x <= Math.ceil(px + rad); x++) {
        if (x < 0 || y < 0 || x >= w || y >= h) continue;
        const dx = x + 0.5 - px;
        const dy = y + 0.5 - py;
        if (dx * dx + dy * dy <= r2) mask[y * w + x] = 1;
      }
  };
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const x = x0 + (x1 - x0) * t + Math.sin(t * Math.PI * f1 + ph) * amp * 0.35;
    const y = cy + Math.sin(t * Math.PI * f2 + ph) * amp + Math.cos(t * Math.PI * f1) * amp * 0.5;
    stamp(x, y, thick / 2);
  }
  // underline flourish
  const uy = cy + amp * 1.3;
  for (let i = 0; i <= steps / 2; i++) {
    const t = i / (steps / 2);
    stamp(x0 + (x1 - x0) * (0.1 + 0.8 * t), uy + Math.sin(t * 3) * amp * 0.1, Math.max(1, thick * 0.4));
  }
  const paperV = paper === 'grey' ? 200 : 240;
  const ink = opts.ink === 'blue' ? [30, 50, 170] : [25, 25, 30];
  const r = blank(w, h, [paperV, paperV, paperV - 4]);
  const d = r.data;
  // shadow: illumination falls off towards one corner plus a soft blob
  const sx = rnd() < 0.5 ? 0 : w;
  const sy = rnd() < 0.5 ? 0 : h;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const p = (y * w + x) * 4;
      let illum = 1;
      if (paper === 'shadow') {
        const dist = Math.hypot(x - sx, y - sy) / Math.hypot(w, h);
        illum = 0.55 + 0.45 * Math.min(1, dist * 1.4);
        illum *= 1 - 0.15 * Math.exp(-(((x - w * 0.7) / (w * 0.2)) ** 2 + ((y - h * 0.3) / (h * 0.3)) ** 2));
      }
      const isInk = mask[y * w + x] === 1;
      for (let c = 0; c < 3; c++) {
        const v = isInk ? ink[c]! : d[p + c]!;
        d[p + c] = v * illum + (rnd() - 0.5) * 6;
      }
    }
  }
  return { raster: r, mask };
}

/** Fingerprint-like concentric ridges in an oval. */
export function synthThumb(w: number, h: number, seed: number, ink: 'black' | 'blue' = 'blue', paper: Paper = 'white'): Synthetic {
  const rnd = mulberry32(seed);
  const mask = new Uint8Array(w * h);
  const cx = w * (0.5 + (rnd() - 0.5) * 0.1);
  const cy = h * (0.5 + (rnd() - 0.5) * 0.1);
  const rx = w * 0.28;
  const ry = h * 0.36;
  const period = Math.max(3, Math.min(w, h) / 40);
  const r = blank(w, h, paper === 'grey' ? [205, 205, 200] : [242, 242, 240]);
  const inkRgb = ink === 'blue' ? [40, 60, 160] : [30, 30, 30];
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const dx = (x - cx) / rx;
      const dy = (y - cy) / ry;
      const d = Math.sqrt(dx * dx + dy * dy);
      if (d > 1) continue;
      const rr = Math.hypot(x - cx, (y - cy) * 0.8) + Math.sin(Math.atan2(y - cy, x - cx) * 3) * period;
      if (Math.sin((rr / period) * Math.PI * 2) > 0.1) {
        mask[y * w + x] = 1;
        const p = (y * w + x) * 4;
        r.data[p] = inkRgb[0]!;
        r.data[p + 1] = inkRgb[1]!;
        r.data[p + 2] = inkRgb[2]!;
      }
    }
  }
  if (paper === 'shadow') shade(r, rnd);
  addNoise(r, 3, rnd);
  return { raster: r, mask };
}

function shade(r: RasterImage, rnd: Rnd): void {
  const { width: w, height: h, data: d } = r;
  const ang = rnd() * Math.PI * 2;
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) {
      const t = ((x / w - 0.5) * Math.cos(ang) + (y / h - 0.5) * Math.sin(ang) + 0.7) / 1.4;
      const k = 0.6 + 0.4 * Math.max(0, Math.min(1, t));
      const p = (y * w + x) * 4;
      d[p] = d[p]! * k;
      d[p + 1] = d[p + 1]! * k;
      d[p + 2] = d[p + 2]! * k;
    }
}

/** Near-blank: one flat colour with optional ±1-2 level noise (hardest for min KB). */
export function synthBlank(w: number, h: number, seed: number, rgb: [number, number, number] = [255, 255, 255], noise = 0): RasterImage {
  const r = blank(w, h, rgb);
  addNoise(r, noise, mulberry32(seed));
  return r;
}

/**
 * Very detailed (hardest for max KB): blocky value noise at several scales (edges survive any
 * downscale), a fine checker and per-pixel colour noise.
 */
export function synthDetailed(w: number, h: number, seed: number): RasterImage {
  const rnd = mulberry32(seed);
  const r = blank(w, h, [128, 128, 128]);
  const d = r.data;
  const long = Math.max(w, h);
  const scales = [long / 6, long / 23, long / 90, long / 300].map((s) => Math.max(1, Math.round(s)));
  const grids = scales.map((s) => {
    const gw = Math.ceil(w / s) + 1;
    const gh = Math.ceil(h / s) + 1;
    const g = new Float32Array(gw * gh * 3);
    for (let i = 0; i < g.length; i++) g[i] = rnd() - 0.5;
    return { s, gw, g };
  });
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) {
      const p = (y * w + x) * 4;
      let a = 0, b = 0, c = 0;
      for (const { s, gw, g } of grids) {
        const gi = (((y / s) | 0) * gw + ((x / s) | 0)) * 3;
        a += g[gi]!;
        b += g[gi + 1]!;
        c += g[gi + 2]!;
      }
      const checker = ((x >> 1) + (y >> 1)) & 1 ? 25 : -25;
      d[p] = 128 + a * 150 + checker + (rnd() - 0.5) * 90;
      d[p + 1] = 128 + b * 150 - checker + (rnd() - 0.5) * 90;
      d[p + 2] = 128 + c * 150 + (rnd() - 0.5) * 110;
    }
  return r;
}

// ---------------------------------------------------------------------------
// EXIF helpers
// ---------------------------------------------------------------------------

/** APP1 Exif segment containing only IFD0 Orientation. */
export function exifOrientationSegment(orientation: number, littleEndian = true): Uint8Array {
  const tiff: number[] = littleEndian
    ? [0x49, 0x49, 0x2a, 0x00, 0x08, 0x00, 0x00, 0x00, 0x01, 0x00, 0x12, 0x01, 0x03, 0x00, 0x01, 0x00, 0x00, 0x00, orientation, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00]
    : [0x4d, 0x4d, 0x00, 0x2a, 0x00, 0x00, 0x00, 0x08, 0x00, 0x01, 0x01, 0x12, 0x00, 0x03, 0x00, 0x00, 0x00, 0x01, 0x00, orientation, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00];
  const payload = [0x45, 0x78, 0x69, 0x66, 0x00, 0x00, ...tiff];
  const len = payload.length + 2;
  return new Uint8Array([0xff, 0xe1, len >> 8, len & 0xff, ...payload]);
}

/** Insert an EXIF APP1 right after SOI (before any APP0), like a phone camera does. */
export function insertExifFirst(jpeg: Uint8Array, orientation: number, littleEndian = true): Uint8Array<ArrayBuffer> {
  const seg = exifOrientationSegment(orientation, littleEndian);
  const out = new Uint8Array(jpeg.length + seg.length);
  out.set(jpeg.subarray(0, 2), 0);
  out.set(seg, 2);
  out.set(jpeg.subarray(2), 2 + seg.length);
  return out;
}

/** Remove the leading JFIF APP0 (simulates encoders that write none). */
export function removeApp0(jpeg: Uint8Array): Uint8Array<ArrayBuffer> {
  if (jpeg[2] === 0xff && jpeg[3] === 0xe0) {
    const len = (jpeg[4]! << 8) | jpeg[5]!;
    const out = new Uint8Array(jpeg.length - len - 2);
    out.set(jpeg.subarray(0, 2), 0);
    out.set(jpeg.subarray(4 + len), 2);
    return out;
  }
  const c = new Uint8Array(jpeg.length);
  c.set(jpeg);
  return c;
}

/** Insert a COM segment after the first segment (or after SOI). */
export function insertCom(jpeg: Uint8Array, text: string): Uint8Array<ArrayBuffer> {
  const payload = new TextEncoder().encode(text);
  const seg = new Uint8Array(payload.length + 4);
  seg.set([0xff, 0xfe, (payload.length + 2) >> 8, (payload.length + 2) & 0xff]);
  seg.set(payload, 4);
  let at = 2;
  if (jpeg[2] === 0xff && jpeg[3] === 0xe0) at = 4 + ((jpeg[4]! << 8) | jpeg[5]!);
  const out = new Uint8Array(jpeg.length + seg.length);
  out.set(jpeg.subarray(0, at), 0);
  out.set(seg, at);
  out.set(jpeg.subarray(at), at + seg.length);
  return out;
}

/** Orientation whose transform undoes `o` (6 <-> 8; the others are involutions). */
export function inverseOrientation(o: number): number {
  return o === 6 ? 8 : o === 8 ? 6 : o;
}
