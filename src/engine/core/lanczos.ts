/**
 * Pure-JS separable Lanczos3 (the fallback when the resize WASM is unavailable) and the integer
 * box pre-pass shared with the WASM path.
 */
import { boxDownscale } from './raster';
import type { RasterImage } from '../types';

/** Lanczos must still see at least this much reduction after the integer box pre-pass. */
export const BOX_MIN_RATIO = 1.25;

/**
 * Big reductions (e.g. 12 MP -> 200×230): average f×f blocks first so Lanczos3 still sees
 * >= 1.25× the target resolution. ~4× cheaper and visually identical at these output sizes.
 */
export function boxPrepass(r: RasterImage, w: number, h: number): RasterImage {
  const f = Math.floor(Math.min(r.width / w, r.height / h) / BOX_MIN_RATIO);
  return f >= 2 ? boxDownscale(r, f) : r;
}

function sinc(x: number): number {
  if (x === 0) return 1;
  const px = Math.PI * x;
  return Math.sin(px) / px;
}

function lanczos3(x: number): number {
  return x > -3 && x < 3 ? sinc(x) * sinc(x / 3) : 0;
}

interface Weights {
  start: Int32Array;
  count: Int32Array;
  w: Float32Array;
  stride: number;
}

function weights(srcLen: number, dstLen: number): Weights {
  const scale = dstLen / srcLen;
  const fscale = Math.min(1, scale); // widen the kernel when downscaling
  const support = 3 / fscale;
  const stride = Math.ceil(support * 2) + 2;
  const start = new Int32Array(dstLen);
  const count = new Int32Array(dstLen);
  const w = new Float32Array(dstLen * stride);
  for (let i = 0; i < dstLen; i++) {
    const center = (i + 0.5) / scale - 0.5;
    const lo = Math.max(0, Math.ceil(center - support));
    const hi = Math.min(srcLen - 1, Math.floor(center + support));
    const n = Math.min(stride, hi - lo + 1);
    let sum = 0;
    for (let k = 0; k < n; k++) {
      const v = lanczos3((lo + k - center) * fscale);
      w[i * stride + k] = v;
      sum += v;
    }
    if (sum !== 0) for (let k = 0; k < n; k++) w[i * stride + k] = w[i * stride + k]! / sum;
    start[i] = lo;
    count[i] = n;
  }
  return { start, count, w, stride };
}

/** Separable Lanczos3 on RGBA (no premultiply). */
export function resizeLanczosJs(r: RasterImage, w: number, h: number): RasterImage {
  const { width: sw, height: sh, data: s } = r;
  const wx = weights(sw, w);
  const wy = weights(sh, h);
  const tmp = new Float32Array(w * sh * 4);
  for (let y = 0; y < sh; y++) {
    const row = y * sw * 4;
    for (let x = 0; x < w; x++) {
      const st = wx.start[x]!;
      const n = wx.count[x]!;
      const base = x * wx.stride;
      let r0 = 0, g0 = 0, b0 = 0, a0 = 0;
      for (let k = 0; k < n; k++) {
        const kw = wx.w[base + k]!;
        const p = row + (st + k) * 4;
        r0 += s[p]! * kw;
        g0 += s[p + 1]! * kw;
        b0 += s[p + 2]! * kw;
        a0 += s[p + 3]! * kw;
      }
      const o = (y * w + x) * 4;
      tmp[o] = r0;
      tmp[o + 1] = g0;
      tmp[o + 2] = b0;
      tmp[o + 3] = a0;
    }
  }
  const out = new Uint8ClampedArray(w * h * 4);
  for (let y = 0; y < h; y++) {
    const st = wy.start[y]!;
    const n = wy.count[y]!;
    const base = y * wy.stride;
    for (let x = 0; x < w; x++) {
      let r0 = 0, g0 = 0, b0 = 0, a0 = 0;
      for (let k = 0; k < n; k++) {
        const kw = wy.w[base + k]!;
        const p = ((st + k) * w + x) * 4;
        r0 += tmp[p]! * kw;
        g0 += tmp[p + 1]! * kw;
        b0 += tmp[p + 2]! * kw;
        a0 += tmp[p + 3]! * kw;
      }
      const o = (y * w + x) * 4;
      out[o] = r0;
      out[o + 1] = g0;
      out[o + 2] = b0;
      out[o + 3] = a0;
    }
  }
  return { data: out, width: w, height: h };
}
