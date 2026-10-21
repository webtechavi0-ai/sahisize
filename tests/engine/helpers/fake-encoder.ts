/**
 * Fake JPEG encoder for fit.test.ts (PLAN 3.8): size = f(q, entropy, pixels), deterministic and
 * fast. Output is a structurally valid JPEG header (SOI, JFIF APP0, SOF0 with dims, SOS) followed
 * by filler, so DPI patching, padding and header verification all run for real.
 */
import { resizeLanczosJs } from '@/engine/resize';
import type { FitDeps } from '@/engine/fit';
import type { RasterImage } from '@/engine/types';

/** Mean absolute horizontal luma difference (0 for flat images, ~85 for noise). */
export function entropy(r: RasterImage): number {
  const { width: w, height: h, data: d } = r;
  let acc = 0;
  let n = 0;
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w - 1; x++) {
      const p = (y * w + x) * 4;
      acc += Math.abs(d[p]! - d[p + 4]!) + Math.abs(d[p + 1]! - d[p + 5]!);
      n += 2;
    }
  return n ? acc / n : 0;
}

export function fakeJpeg(w: number, h: number, size: number): Uint8Array {
  const head = [
    0xff, 0xd8,
    0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0x00, 0x01, 0x01, 0x00, 0x00, 0x01, 0x00, 0x01, 0x00, 0x00,
    0xff, 0xc0, 0x00, 0x11, 0x08, h >> 8, h & 255, w >> 8, w & 255, 0x03, 0x01, 0x22, 0x00, 0x02, 0x11, 0x01, 0x03, 0x11, 0x01,
    0xff, 0xda, 0x00, 0x0c, 0x03, 0x01, 0x00, 0x02, 0x11, 0x03, 0x11, 0x00, 0x3f, 0x00,
  ];
  const total = Math.max(head.length + 2, Math.round(size));
  const out = new Uint8Array(total);
  out.set(head);
  out.fill(0x55, head.length, total - 2);
  out[total - 2] = 0xff;
  out[total - 1] = 0xd9;
  return out;
}

export type SizeModel = (q: number, entropy: number, pixels: number) => number;

/** Default: roughly MozJPEG-like growth with q. */
export const defaultModel: SizeModel = (q, e, px) => {
  const g = q <= 90 ? Math.exp((q - 90) * 0.03) : 1 + (q - 90) * 0.12 + (q === 100 ? 0.5 : 0);
  return 600 + px * (0.05 + e * 0.04) * g;
};

export function fakeDeps(model: SizeModel = defaultModel): FitDeps & { calls: number[] } {
  const calls: number[] = [];
  return {
    calls,
    async encodeJpeg(r, q) {
      calls.push(q);
      return fakeJpeg(r.width, r.height, model(q, entropy(r), r.width * r.height));
    },
    resize: async (r, w, h) => resizeLanczosJs(r, w, h),
    now: () => 0,
  };
}
