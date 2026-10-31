/**
 * "Grain" stage: seeded, very low amplitude noise (±1…±4 levels), invisible to the eye, that
 * gives the JPEG encoder entropy to reach a minimum KB.
 */
import type { RasterImage } from '../types';

/** mulberry32 PRNG: fast and deterministic. */
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export const DEFAULT_GRAIN_SEED = 0x5a17;

/** Add uniform integer noise in [-amp, +amp] to RGB (same offset per pixel keeps hue). */
export function addGrain(r: RasterImage, amp: number, seed = DEFAULT_GRAIN_SEED): RasterImage {
  const rnd = mulberry32(seed + amp * 7919);
  const d = r.data;
  const out = new Uint8ClampedArray(d.length);
  const span = 2 * amp + 1;
  for (let p = 0; p < d.length; p += 4) {
    const n = Math.floor(rnd() * span) - amp;
    // small independent chroma jitter adds entropy in Cb/Cr too
    const c = Math.floor(rnd() * 3) - 1;
    out[p] = d[p]! + n + c;
    out[p + 1] = d[p + 1]! + n;
    out[p + 2] = d[p + 2]! + n - c;
    out[p + 3] = d[p + 3]!;
  }
  return { data: out, width: r.width, height: r.height };
}
