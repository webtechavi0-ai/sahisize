/**
 * Name + date strip (SPEC K11): rendered INSIDE the final pixels. The photo area is reduced to
 * make room; it never overflows the output size.
 */
import { blit, createRaster } from './raster';
import type { NameDate, RasterImage } from './types';

/** Renders black text lines centred on an opaque white w×h raster. */
export type TextRasterFn = (lines: string[], w: number, h: number) => RasterImage | Promise<RasterImage>;

/** Strip height for an output of height h: 18%, at least 16 px, at most 40% of h. */
export function stripHeight(h: number): number {
  return Math.max(1, Math.min(Math.floor(h * 0.4), Math.max(16, Math.round(h * 0.18))));
}

export function stripLines(nd: NameDate): string[] {
  return [nd.name.trim(), nd.date.trim()].filter((s) => s.length > 0);
}

/** Put `content` (w × (h - strip.height)) above `strip` (w × sh) into a w×h raster. */
export function composeWithStrip(content: RasterImage, strip: RasterImage, w: number, h: number): RasterImage {
  const out = createRaster(w, h);
  blit(out, content, 0, 0);
  blit(out, strip, 0, h - strip.height);
  return out;
}

/**
 * Canvas-based rasteriser usable with OffscreenCanvas (worker) or a DOM canvas (main thread).
 * `make(w, h)` must return a canvas whose getContext('2d') supports fillText.
 */
export function canvasTextRaster(
  make: (w: number, h: number) => { getContext(id: '2d'): unknown } | null,
): TextRasterFn {
  return (lines, w, h) => {
    const canvas = make(w, h);
    const ctx = canvas?.getContext('2d') as CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D | null;
    if (!ctx) throw new Error('2d context unavailable');
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = '#000000';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const n = Math.max(1, lines.length);
    const lineH = h / n;
    for (let i = 0; i < lines.length; i++) {
      let size = Math.floor(lineH * 0.78);
      const text = lines[i]!;
      do {
        ctx.font = `600 ${size}px system-ui, -apple-system, "Segoe UI", Roboto, "Noto Sans", sans-serif`;
        if (ctx.measureText(text).width <= w * 0.94 || size <= 6) break;
        size--;
      } while (size > 6);
      ctx.fillText(text, w / 2, lineH * (i + 0.5), w * 0.96);
    }
    const img = ctx.getImageData(0, 0, w, h);
    return { data: new Uint8ClampedArray(img.data), width: w, height: h };
  };
}

/** Test/headless rasteriser: draws one dark bar per line (no fonts needed). */
export const blockTextRaster: TextRasterFn = (lines, w, h) => {
  const out = createRaster(w, h);
  const n = Math.max(1, lines.length);
  const lineH = h / n;
  for (let i = 0; i < lines.length; i++) {
    const tw = Math.min(w - 4, Math.max(4, lines[i]!.length * Math.max(2, Math.floor(lineH * 0.45))));
    const th = Math.max(2, Math.floor(lineH * 0.5));
    const x0 = Math.floor((w - tw) / 2);
    const y0 = Math.floor(lineH * i + (lineH - th) / 2);
    for (let y = y0; y < y0 + th; y++)
      for (let x = x0; x < x0 + tw; x++) {
        const p = (y * w + x) * 4;
        out.data[p] = out.data[p + 1] = out.data[p + 2] = 0;
      }
  }
  return out;
};
