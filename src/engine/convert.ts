/**
 * T3 format conversion. JPG flattens transparency onto `background` (default white) and is
 * baseline 4:2:0 with JFIF only, like fit().
 */
import { encodeJpeg, encodePng, encodeWebp } from './codecs';
import { stripMetadata } from './jpeg-markers';
import { flattenAlpha, hasAlpha, parseColor } from './raster';
import type { Bytes, ConvertFormat, ConvertOptions, RasterImage } from './types';

export async function convertRaster(r: RasterImage, format: ConvertFormat, opts: ConvertOptions = {}): Promise<Bytes> {
  const q = Math.max(1, Math.min(100, Math.round(opts.quality ?? 90)));
  if (format === 'png') return encodePng(r);
  if (format === 'webp') return encodeWebp(r, q);
  const flat = hasAlpha(r) ? flattenAlpha(r, parseColor(opts.background ?? '#FFFFFF')) : r;
  return stripMetadata(await encodeJpeg(flat, q));
}
