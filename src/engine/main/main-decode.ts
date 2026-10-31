/**
 * Main-thread fallbacks used when the worker cannot do the job itself (no OffscreenCanvas in the
 * worker, e.g. iOS < 16.4, or GIF/BMP there): decode with the browser and render the name/date
 * strip on a DOM canvas. Pixels are then handed to the worker.
 */
import { cappedSize } from '../core/geometry';
import { canvasTextRaster, type TextContext2D, type TextRasterFn } from '../core/strip';
import { EngineError, type RasterImage } from '../types';

interface DrawableSource {
  source: CanvasImageSource;
  width: number;
  height: number;
  close(): void;
}

async function loadDrawable(file: Blob): Promise<DrawableSource> {
  try {
    const bmp = await createImageBitmap(file, { imageOrientation: 'from-image' });
    return { source: bmp, width: bmp.width, height: bmp.height, close: () => bmp.close() };
  } catch {
    const url = URL.createObjectURL(file);
    try {
      const img = new Image();
      img.decoding = 'async';
      img.src = url;
      await img.decode();
      return { source: img, width: img.naturalWidth, height: img.naturalHeight, close: () => img.removeAttribute('src') };
    } catch {
      throw new EngineError('DECODE_FAILED', 'The browser could not read this image');
    } finally {
      URL.revokeObjectURL(url);
    }
  }
}

export async function decodeOnMainThread(file: Blob, maxSide: number): Promise<RasterImage> {
  const src = await loadDrawable(file);
  try {
    if (src.width < 1 || src.height < 1) throw new EngineError('DECODE_FAILED', 'Empty image');
    const { w, h } = cappedSize(src.width, src.height, maxSide);
    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    try {
      const ctx = canvas.getContext('2d', { willReadFrequently: true });
      if (!ctx) throw new EngineError('OUT_OF_MEMORY', 'Canvas unavailable');
      ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(src.source, 0, 0, w, h);
      const id = ctx.getImageData(0, 0, w, h);
      return { data: new Uint8ClampedArray(id.data.buffer), width: w, height: h };
    } finally {
      canvas.width = canvas.height = 0;
    }
  } finally {
    src.close();
  }
}

/** Name/date strip rasteriser on a DOM canvas. */
export function domTextRaster(): TextRasterFn {
  return canvasTextRaster((w, h) => {
    const c = document.createElement('canvas');
    c.width = w;
    c.height = h;
    return c.getContext('2d', { willReadFrequently: true }) as TextContext2D | null;
  });
}
