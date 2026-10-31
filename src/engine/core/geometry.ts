/**
 * Resize-driven geometry: long-side cap, letterbox and cover-crop. The resampler is injected
 * (`ResizeFn`) so this stays pure; the worker passes the WASM/JS Lanczos from codecs/resize.ts.
 */
import { blit, createRaster, cropRaster, WHITE, type RGBA } from './raster';
import type { RasterImage } from '../types';

export type ResizeFn = (r: RasterImage, w: number, h: number) => Promise<RasterImage>;

/** w×h scaled so the long side is <= maxSide (unchanged when already small). */
export function cappedSize(w: number, h: number, maxSide: number): { w: number; h: number } {
  const long = Math.max(w, h);
  if (long <= maxSide) return { w, h };
  const k = maxSide / long;
  return { w: Math.max(1, Math.round(w * k)), h: Math.max(1, Math.round(h * k)) };
}

/** Downscale so the long side is <= maxSide. Returns the input when already small. */
export async function capLongSide(r: RasterImage, maxSide: number, resize: ResizeFn): Promise<RasterImage> {
  if (Math.max(r.width, r.height) <= maxSide) return r;
  const { w, h } = cappedSize(r.width, r.height, maxSide);
  return resize(r, w, h);
}

/** Scale to fit inside w×h, centre, pad with `fill`. */
export async function letterbox(
  r: RasterImage,
  w: number,
  h: number,
  resize: ResizeFn,
  fill: RGBA = WHITE,
): Promise<RasterImage> {
  const k = Math.min(w / r.width, h / r.height);
  const iw = Math.max(1, Math.min(w, Math.round(r.width * k)));
  const ih = Math.max(1, Math.min(h, Math.round(r.height * k)));
  const inner = await resize(r, iw, ih);
  if (iw === w && ih === h) return inner;
  const out = createRaster(w, h, fill);
  blit(out, inner, Math.floor((w - iw) / 2), Math.floor((h - ih) / 2));
  return out;
}

/** Scale to fill w×h, centre-crop the overflow. */
export async function coverCrop(r: RasterImage, w: number, h: number, resize: ResizeFn): Promise<RasterImage> {
  const target = w / h;
  const src = r.width / r.height;
  let cw = r.width;
  let ch = r.height;
  if (src > target) cw = Math.max(1, Math.round(r.height * target));
  else if (src < target) ch = Math.max(1, Math.round(r.width / target));
  const cropped =
    cw === r.width && ch === r.height
      ? r
      : cropRaster(r, { x: Math.floor((r.width - cw) / 2), y: Math.floor((r.height - ch) / 2), w: cw, h: ch });
  return resize(cropped, w, h);
}
