/**
 * Separable Gaussian blur (SPEC 7.3 step 2: σ 0.5 → 1.5 to reduce detail when q=5 is still
 * over max KB). Edges are clamped.
 */
import type { RasterImage } from './types';

function kernel(sigma: number): Float32Array {
  const radius = Math.max(1, Math.ceil(sigma * 3));
  const k = new Float32Array(radius * 2 + 1);
  let sum = 0;
  for (let i = -radius; i <= radius; i++) {
    const v = Math.exp(-(i * i) / (2 * sigma * sigma));
    k[i + radius] = v;
    sum += v;
  }
  for (let i = 0; i < k.length; i++) k[i]! /= sum;
  return k;
}

export function gaussianBlur(r: RasterImage, sigma: number): RasterImage {
  if (sigma <= 0) return { data: new Uint8ClampedArray(r.data), width: r.width, height: r.height };
  const { width: w, height: h, data: s } = r;
  const k = kernel(sigma);
  const rad = (k.length - 1) >> 1;
  const tmp = new Float32Array(w * h * 4);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      let a0 = 0, a1 = 0, a2 = 0, a3 = 0;
      for (let i = -rad; i <= rad; i++) {
        const xx = x + i < 0 ? 0 : x + i >= w ? w - 1 : x + i;
        const p = (y * w + xx) * 4;
        const kv = k[i + rad]!;
        a0 += s[p]! * kv;
        a1 += s[p + 1]! * kv;
        a2 += s[p + 2]! * kv;
        a3 += s[p + 3]! * kv;
      }
      const o = (y * w + x) * 4;
      tmp[o] = a0;
      tmp[o + 1] = a1;
      tmp[o + 2] = a2;
      tmp[o + 3] = a3;
    }
  }
  const out = new Uint8ClampedArray(w * h * 4);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      let a0 = 0, a1 = 0, a2 = 0, a3 = 0;
      for (let i = -rad; i <= rad; i++) {
        const yy = y + i < 0 ? 0 : y + i >= h ? h - 1 : y + i;
        const p = (yy * w + x) * 4;
        const kv = k[i + rad]!;
        a0 += tmp[p]! * kv;
        a1 += tmp[p + 1]! * kv;
        a2 += tmp[p + 2]! * kv;
        a3 += tmp[p + 3]! * kv;
      }
      const o = (y * w + x) * 4;
      out[o] = a0;
      out[o + 1] = a1;
      out[o + 2] = a2;
      out[o + 3] = a3;
    }
  }
  return { data: out, width: w, height: h };
}

/** Box blur on a single-channel float/byte plane (used by cleanup's background estimate). */
export function boxBlurPlane(src: Float32Array, w: number, h: number, radius: number): Float32Array {
  const tmp = new Float32Array(w * h);
  const out = new Float32Array(w * h);
  const win = radius * 2 + 1;
  for (let y = 0; y < h; y++) {
    let acc = 0;
    const row = y * w;
    for (let i = -radius; i <= radius; i++) acc += src[row + Math.min(w - 1, Math.max(0, i))]!;
    for (let x = 0; x < w; x++) {
      tmp[row + x] = acc / win;
      const add = src[row + Math.min(w - 1, x + radius + 1)]!;
      const sub = src[row + Math.max(0, x - radius)]!;
      acc += add - sub;
    }
  }
  for (let x = 0; x < w; x++) {
    let acc = 0;
    for (let i = -radius; i <= radius; i++) acc += tmp[Math.min(h - 1, Math.max(0, i)) * w + x]!;
    for (let y = 0; y < h; y++) {
      out[y * w + x] = acc / win;
      const add = tmp[Math.min(h - 1, y + radius + 1) * w + x]!;
      const sub = tmp[Math.max(0, y - radius) * w + x]!;
      acc += add - sub;
    }
  }
  return out;
}
