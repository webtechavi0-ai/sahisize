/**
 * Input decode (SPEC 7.1, PLAN 3.7 decode chain):
 *  1. createImageBitmap(blob, {imageOrientation:'from-image'}) + OffscreenCanvas getImageData
 *     (draws straight at the capped size, so 12 MP inputs never exist at full size twice);
 *  2. otherwise jsquash decode (jpeg/png/webp) + exif.ts orientation;
 *  3. HEIC: native first, then libheif-js;
 *  4. cap the long side at 4000 px.
 * Main-thread fallback (no OffscreenCanvas, GIF/BMP in such a worker) is in api.ts.
 */
import { MAX_UPLOAD_BYTES } from '../config/site';
import { decodeJpeg, decodePng, decodeWebp } from './codecs';
import { readOrientation } from './exif';
import { decodeHeicWasm } from './heic';
import { applyOrientation } from './raster';
import { capLongSide, resizeRaster } from './resize';
import { EngineError, type DecodeOptions, type RasterImage } from './types';

export const DEFAULT_MAX_SIDE = 4000;

export type SniffedType = 'jpeg' | 'png' | 'webp' | 'heic' | 'gif' | 'bmp' | 'pdf' | 'unknown';

export function sniff(b: Uint8Array, mime = ''): SniffedType {
  if (b.length >= 3 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return 'jpeg';
  if (b.length >= 8 && b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47) return 'png';
  if (b.length >= 12 && b[0] === 0x52 && b[1] === 0x49 && b[2] === 0x46 && b[3] === 0x46 && b[8] === 0x57 && b[9] === 0x45 && b[10] === 0x42 && b[11] === 0x50) return 'webp';
  if (b.length >= 4 && b[0] === 0x25 && b[1] === 0x50 && b[2] === 0x44 && b[3] === 0x46) return 'pdf';
  if (b.length >= 6 && b[0] === 0x47 && b[1] === 0x49 && b[2] === 0x46 && b[3] === 0x38) return 'gif';
  if (b.length >= 2 && b[0] === 0x42 && b[1] === 0x4d) return 'bmp';
  if (b.length >= 12 && b[4] === 0x66 && b[5] === 0x74 && b[6] === 0x79 && b[7] === 0x70) {
    const brand = String.fromCharCode(b[8]!, b[9]!, b[10]!, b[11]!);
    if (/^(heic|heix|hevc|hevx|heim|heis|mif1|msf1|avif)$/.test(brand)) return brand === 'avif' ? 'unknown' : 'heic';
  }
  if (/hei[cf]/i.test(mime)) return 'heic';
  return 'unknown';
}

export interface NativeDecodeEnv {
  createImageBitmap?: (b: Blob, o?: ImageBitmapOptions) => Promise<ImageBitmap>;
  OffscreenCanvas?: typeof OffscreenCanvas;
}

function defaultEnv(): NativeDecodeEnv {
  const g = globalThis as unknown as NativeDecodeEnv;
  return {
    createImageBitmap: typeof g.createImageBitmap === 'function' ? g.createImageBitmap.bind(globalThis) : undefined,
    OffscreenCanvas: typeof g.OffscreenCanvas === 'function' ? g.OffscreenCanvas : undefined,
  };
}

function cappedSize(w: number, h: number, maxSide: number): { w: number; h: number } {
  const long = Math.max(w, h);
  if (long <= maxSide) return { w, h };
  const k = maxSide / long;
  return { w: Math.max(1, Math.round(w * k)), h: Math.max(1, Math.round(h * k)) };
}

/** Native browser decode at the capped size. Throws when unavailable. */
export async function decodeNative(blob: Blob, maxSide: number, env: NativeDecodeEnv = defaultEnv()): Promise<RasterImage> {
  if (!env.createImageBitmap || !env.OffscreenCanvas) throw new Error('native decode unavailable');
  const bmp = await env.createImageBitmap(blob, { imageOrientation: 'from-image' });
  try {
    const { w, h } = cappedSize(bmp.width, bmp.height, maxSide);
    const canvas = new env.OffscreenCanvas(w, h);
    const ctx = canvas.getContext('2d', { willReadFrequently: true }) as OffscreenCanvasRenderingContext2D | null;
    if (!ctx) throw new Error('no 2d context');
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(bmp, 0, 0, w, h);
    const id = ctx.getImageData(0, 0, w, h);
    return { data: new Uint8ClampedArray(id.data.buffer, id.data.byteOffset, id.data.byteLength), width: w, height: h };
  } finally {
    bmp.close();
  }
}

/** WASM decode of raw bytes (Node, workers without OffscreenCanvas). Applies EXIF orientation. */
export async function decodeBytes(bytes: Uint8Array, type: SniffedType): Promise<RasterImage> {
  try {
    switch (type) {
      case 'jpeg': {
        const r = await decodeJpeg(bytes);
        return applyOrientation(r, readOrientation(bytes));
      }
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
    if (e instanceof EngineError) throw e;
    if (e instanceof RangeError) throw new EngineError('OUT_OF_MEMORY', String(e));
    throw new EngineError('DECODE_FAILED', String(e), { type });
  }
}

export interface DecodeBlobOptions extends DecodeOptions {
  /** Skip the native path (tests, or a worker known to lack it). */
  native?: boolean;
  env?: NativeDecodeEnv;
}

export async function decodeBlob(blob: Blob, opts: DecodeBlobOptions = {}): Promise<RasterImage> {
  if (blob.size > MAX_UPLOAD_BYTES) {
    throw new EngineError('TOO_LARGE_INPUT', 'File is too large', {
      sizeMB: Math.round((blob.size / 1048576) * 10) / 10,
      maxMB: Math.round(MAX_UPLOAD_BYTES / 1048576),
    });
  }
  const maxSide = opts.maxSide ?? DEFAULT_MAX_SIDE;
  const head = new Uint8Array(await blob.slice(0, 64).arrayBuffer());
  const type = sniff(head, blob.type);
  if (type === 'pdf') throw new EngineError('UNSUPPORTED_TYPE', 'PDF must go through decodePdfPages', { type: 'pdf' });
  if (type === 'unknown') throw new EngineError('UNSUPPORTED_TYPE', 'Not a supported image', { type: blob.type || 'unknown' });

  if (opts.native !== false) {
    const env = opts.env ?? defaultEnv();
    if (env.createImageBitmap && env.OffscreenCanvas) {
      try {
        return await decodeNative(blob, maxSide, env);
      } catch {
        // fall through to WASM (e.g. HEIC on Chrome)
      }
    }
  }
  const bytes = new Uint8Array(await blob.arrayBuffer());
  let r = await decodeBytes(bytes, type);
  if (r.width < 1 || r.height < 1) throw new EngineError('DECODE_FAILED', 'Empty image');
  r = await capLongSide(r, maxSide, resizeRaster);
  return r;
}
