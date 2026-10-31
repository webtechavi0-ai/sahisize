/**
 * Name + date strip, rendered INSIDE the final pixels: the photo area shrinks to make room and
 * the output size never changes.
 */
import { blit, createRaster } from './raster';
import type { NameDate, RasterImage } from '../types';

/** Renders black text lines centred on an opaque white w×h raster. */
export type TextRasterFn = (lines: string[], w: number, h: number) => RasterImage | Promise<RasterImage>;

/** Strip height for an output of height h: 18%, at least 16 px, at most 40% of h. */
export function stripHeight(h: number): number {
  return Math.max(1, Math.min(Math.floor(h * 0.4), Math.max(16, Math.round(h * 0.18))));
}

export function stripLines(nd: NameDate): string[] {
  return [nd.name.trim(), nd.date.trim()].filter((s) => s.length > 0);
}

/** Put `content` (w × (h - strip.height)) above `strip` into a w×h raster. */
export function composeWithStrip(content: RasterImage, strip: RasterImage, w: number, h: number): RasterImage {
  const out = createRaster(w, h);
  blit(out, content, 0, 0);
  blit(out, strip, 0, h - strip.height);
  return out;
}

/** The subset of the 2D context API the text rasteriser needs (DOM canvas or OffscreenCanvas). */
export interface TextContext2D {
  fillStyle: string | CanvasGradient | CanvasPattern;
  font: string;
  textAlign: CanvasTextAlign;
  textBaseline: CanvasTextBaseline;
  fillRect(x: number, y: number, w: number, h: number): void;
  fillText(text: string, x: number, y: number, maxWidth?: number): void;
  measureText(text: string): { width: number };
  getImageData(x: number, y: number, w: number, h: number): { data: Uint8ClampedArray };
}

/** Builds a TextRasterFn from a factory returning a 2D context of a w×h canvas. */
export function canvasTextRaster(makeContext: (w: number, h: number) => TextContext2D | null): TextRasterFn {
  return (lines, w, h) => {
    const ctx = makeContext(w, h);
    if (!ctx) throw new Error('2d context unavailable');
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = '#000000';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const lineH = h / Math.max(1, lines.length);
    for (let i = 0; i < lines.length; i++) {
      const text = lines[i]!;
      let size = Math.floor(lineH * 0.78);
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
