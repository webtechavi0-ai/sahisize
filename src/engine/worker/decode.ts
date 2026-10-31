/**
 * Input decode inside the worker:
 *  1. createImageBitmap(blob, { imageOrientation: 'from-image' }) + OffscreenCanvas getImageData.
 *     When the header says the image is over the cap, the bitmap is requested at the capped size
 *     (resizeWidth/resizeHeight), so 12 MP inputs never exist at full size twice;
 *  2. otherwise WASM decode (jpeg/png/webp) + EXIF orientation;
 *  3. HEIC: native first, then libheif-js;
 *  4. cap the long side (default 4000 px).
 * The main-thread fallback (no OffscreenCanvas, GIF/BMP in such a worker) lives in main/.
 */
import { decodeHeicWasm } from '../codecs/heic';
import { decodeJpeg, decodePng, decodeWebp } from '../codecs/codecs';
import { resizeRaster } from '../codecs/resize';
import { readOrientation } from '../core/exif';
import { capLongSide, cappedSize } from '../core/geometry';
import { applyOrientation } from '../core/raster';
import { HEADER_PROBE_BYTES, readImageHeader, sniff, type ImageHeader, type SniffedType } from '../core/sniff';
import { DEFAULT_MAX_SIDE, MAX_UPLOAD_BYTES, sizeDetails } from '../limits';
import { EngineError, isEngineError, type DecodeOptions, type RasterImage } from '../types';

export interface NativeDecodeEnv {
  createImageBitmap?: (b: Blob, o?: ImageBitmapOptions) => Promise<ImageBitmap>;
  OffscreenCanvas?: typeof OffscreenCanvas;
}

export function defaultNativeEnv(): NativeDecodeEnv {
  const g = globalThis as { createImageBitmap?: unknown; OffscreenCanvas?: unknown };
  return {
    createImageBitmap:
      typeof g.createImageBitmap === 'function' ? globalThis.createImageBitmap.bind(globalThis) : undefined,
    OffscreenCanvas: typeof g.OffscreenCanvas === 'function' ? globalThis.OffscreenCanvas : undefined,
  };
}

/** Relative aspect difference above which a resized bitmap is considered wrongly oriented. */
const ASPECT_TOLERANCE = 0.02;

async function bitmapAtSize(
  env: Required<NativeDecodeEnv>,
  blob: Blob,
  header: ImageHeader | null,
  maxSide: number,
): Promise<ImageBitmap> {
  const base: ImageBitmapOptions = { imageOrientation: 'from-image' };
  if (header && Math.max(header.displayWidth, header.displayHeight) > maxSide) {
    const t = cappedSize(header.displayWidth, header.displayHeight, maxSide);
    try {
      const bmp = await env.createImageBitmap(blob, { ...base, resizeWidth: t.w, resizeHeight: t.h, resizeQuality: 'high' });
      // Browsers disagree on whether resize happens before or after orientation: if the aspect
      // came out swapped, decode again without the resize hint.
      const want = t.w / t.h;
      if (Math.abs(bmp.width / bmp.height / want - 1) <= ASPECT_TOLERANCE) return bmp;
      bmp.close();
    } catch {
      // resize options unsupported: plain decode below
    }
  }
  return env.createImageBitmap(blob, base);
}

/** Native browser decode at the capped size. Throws when unavailable. */
export async function decodeNative(
  blob: Blob,
  maxSide: number,
  env: NativeDecodeEnv = defaultNativeEnv(),
  header: ImageHeader | null = null,
): Promise<RasterImage> {
  const { createImageBitmap: cib, OffscreenCanvas: OC } = env;
  if (!cib || !OC) throw new Error('native decode unavailable');
  const bmp = await bitmapAtSize({ createImageBitmap: cib, OffscreenCanvas: OC }, blob, header, maxSide);
  try {
    const { w, h } = cappedSize(bmp.width, bmp.height, maxSide);
    const canvas = new OC(w, h);
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) throw new Error('no 2d context');
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(bmp, 0, 0, w, h);
    const id = ctx.getImageData(0, 0, w, h);
    canvas.width = canvas.height = 0; // release the backing store early
    return { data: new Uint8ClampedArray(id.data.buffer, id.data.byteOffset, id.data.byteLength), width: w, height: h };
  } finally {
    bmp.close();
  }
}

/** WASM decode of raw bytes (Node, workers without OffscreenCanvas). Applies EXIF orientation. */
export async function decodeBytes(bytes: Uint8Array, type: SniffedType): Promise<RasterImage> {
  try {
    switch (type) {
      case 'jpeg':
        return applyOrientation(await decodeJpeg(bytes), readOrientation(bytes));
      case 'png':
        return await decodePng(bytes);
      case 'webp':
        return await decodeWebp(bytes);
      case 'heic':
        return await decodeHeicWasm(bytes);
      default:
        throw new EngineError('DECODE_FAILED', `No WASM decoder for ${type}`, { type, needsMainThread: 1 });
    }
  } catch (e) {
    if (isEngineError(e)) throw e;
    if (e instanceof RangeError) throw new EngineError('OUT_OF_MEMORY', String(e));
    throw new EngineError('DECODE_FAILED', String(e), { type });
  }
}

export interface DecodeBlobOptions extends DecodeOptions {
  /** false skips the native path (tests, or a worker known to lack it). */
  native?: boolean;
  env?: NativeDecodeEnv;
}

export async function decodeBlob(blob: Blob, opts: DecodeBlobOptions = {}): Promise<RasterImage> {
  if (blob.size > MAX_UPLOAD_BYTES) {
    throw new EngineError('TOO_LARGE_INPUT', 'File is too large', sizeDetails(blob.size, MAX_UPLOAD_BYTES));
  }
  const maxSide = opts.maxSide ?? DEFAULT_MAX_SIDE;
  const head = new Uint8Array(await blob.slice(0, HEADER_PROBE_BYTES).arrayBuffer());
  const type = sniff(head, blob.type);
  if (type === 'pdf') throw new EngineError('UNSUPPORTED_TYPE', 'PDF must go through decodePdfPages', { type: 'pdf' });
  if (type === 'unknown') {
    throw new EngineError('UNSUPPORTED_TYPE', 'Not a supported image', { type: blob.type || 'unknown' });
  }

  if (opts.native !== false) {
    const env = opts.env ?? defaultNativeEnv();
    if (env.createImageBitmap && env.OffscreenCanvas) {
      try {
        return await decodeNative(blob, maxSide, env, readImageHeader(head, type));
      } catch {
        // fall through to WASM (e.g. HEIC on Chrome)
      }
    }
  }
  const bytes = new Uint8Array(await blob.arrayBuffer());
  const r = await decodeBytes(bytes, type);
  if (r.width < 1 || r.height < 1) throw new EngineError('DECODE_FAILED', 'Empty image');
  return capLongSide(r, maxSide, resizeRaster);
}
