/**
 * The engine implementation behind the worker (PLAN 3.7): an image-handle registry
 * `Map<id, RasterImage>` plus every WorkerApi call. Environment-agnostic, so Node tests can
 * drive the exact code the worker runs; worker.ts only adds Comlink + transfers.
 */
import { cleanupRaster } from './cleanup';
import { decodeJpeg, decodePng, encodeJpeg, encodePng, prewarmCodecs, type CodecKind } from './codecs';
import { convertRaster } from './convert';
import { decodeBlob, type NativeDecodeEnv } from './decode';
import { fitRaster, type FitDeps } from './fit';
import { assembleCompressed, imagesToPdfCore } from './pdf';
import { transformAndCrop, flattenAlpha, hasAlpha } from './raster';
import { capLongSide, resizeRaster } from './resize';
import { photoSheetCore } from './sheet';
import { canvasTextRaster, type TextRasterFn } from './strip';
import { buildZip } from './zip';
import { EngineError, type EngineImage, type RasterImage } from './types';
import type { WorkerApi } from './worker-protocol';

export interface CoreEnv {
  /** Use createImageBitmap + OffscreenCanvas when present (default true). */
  native?: boolean;
  nativeEnv?: NativeDecodeEnv;
  textRaster?: TextRasterFn;
  now?: () => number;
}

export interface EngineCore extends WorkerApi {
  /** Test hook: the pixels behind a handle. */
  getRaster(img: EngineImage): RasterImage;
  handleCount(): number;
}

function isHandle(x: unknown): x is EngineImage {
  return typeof x === 'object' && x !== null && typeof (x as EngineImage).id === 'string' && !('data' in x);
}

function defaultTextRaster(): TextRasterFn | undefined {
  if (typeof OffscreenCanvas === 'undefined') return undefined;
  return canvasTextRaster((w, h) => new OffscreenCanvas(w, h));
}

export function createEngineCore(env: CoreEnv = {}): EngineCore {
  const registry = new Map<string, RasterImage>();
  let seq = 0;
  const now = env.now ?? (() => (typeof performance !== 'undefined' ? performance.now() : Date.now()));
  const textRaster = env.textRaster ?? defaultTextRaster();

  const put = (r: RasterImage): EngineImage => {
    const id = `img-${++seq}`;
    registry.set(id, r);
    return { id, width: r.width, height: r.height };
  };
  const get = (img: EngineImage): RasterImage => {
    const r = img && registry.get(img.id);
    if (!r) throw new EngineError('INTERNAL', 'Image handle is not valid (released?)', { id: img?.id ?? '' });
    return r;
  };
  const guard = async <T>(fn: () => Promise<T>): Promise<T> => {
    try {
      return await fn();
    } catch (e) {
      if (e instanceof EngineError) throw e;
      if (e instanceof RangeError || (e instanceof Error && /memory|allocation/i.test(e.message))) {
        throw new EngineError('OUT_OF_MEMORY', String(e));
      }
      throw new EngineError('INTERNAL', e instanceof Error ? e.message : String(e));
    }
  };
  const fitDeps: FitDeps = {
    encodeJpeg,
    encodePng,
    resize: resizeRaster,
    decode: (b, f) => (f === 'jpg' ? decodeJpeg(b) : decodePng(b)),
    textRaster,
    now,
  };

  const core: EngineCore = {
    getRaster: get,
    handleCount: () => registry.size,

    async caps() {
      return { offscreenCanvas: typeof OffscreenCanvas !== 'undefined', wasm: typeof WebAssembly !== 'undefined' };
    },

    decode: (blob, opts) =>
      guard(async () => put(await decodeBlob(blob, { ...opts, native: env.native, env: env.nativeEnv }))),

    adoptRaster: (raster) =>
      guard(async () => {
        if (!raster || raster.width < 1 || raster.height < 1 || raster.data.length !== raster.width * raster.height * 4) {
          throw new EngineError('DECODE_FAILED', 'Invalid raster');
        }
        return put(await capLongSide(raster, 4000));
      }),

    adoptRasters: (rasters) => guard(async () => Promise.all(rasters.map((r) => core.adoptRaster(r)))),

    resize: (img, width, height) =>
      guard(async () => {
        const w = Math.round(width);
        const h = Math.round(height);
        if (!(w >= 1 && h >= 1 && w <= 10000 && h <= 10000)) {
          throw new EngineError('INTERNAL', 'Invalid resize dimensions', { width, height });
        }
        return put(await resizeRaster(get(img), w, h));
      }),

    crop: (img, rect, rotationDeg, flip) =>
      guard(async () => put(transformAndCrop(get(img), rect, rotationDeg || 0, flip ?? { h: false, v: false }))),

    cleanup: (img, kind, opts) => guard(async () => put(await cleanupRaster(get(img), kind, opts ?? { strength: 50, ink: 'black' }))),

    fit: (img, spec, opts, stripRaster) =>
      guard(async () => fitRaster(get(img), spec, fitDeps, { ...(opts ?? {}), stripRaster })),

    imagesToPdf: (items, opts, onProgress) =>
      guard(async () => {
        const rasters: RasterImage[] = [];
        for (const it of items) {
          if (it.kind === 'image') rasters.push(get(it.img));
          else if (it.kind === 'raster') rasters.push(it.raster);
          else rasters.push(await decodeBlob(it.blob, { native: env.native, env: env.nativeEnv }));
        }
        return imagesToPdfCore(rasters, { ...opts, onProgress }, encodeJpeg, resizeRaster);
      }),

    assemblePdfFromRasters: (pages, opts) =>
      guard(async () => {
        const rasters = pages.map((p) => (isHandle(p) ? get(p) : p));
        try {
          return await assembleCompressed(rasters, opts.pageSizesPt, opts.maxKB, encodeJpeg);
        } finally {
          for (const p of pages) if (isHandle(p)) registry.delete(p.id);
        }
      }),

    zip: (files, readme) => guard(async () => buildZip(files, readme)),

    async prewarm(kinds) {
      const map: Record<string, CodecKind> = { jpeg: 'jpeg', resize: 'resize', png: 'png', webp: 'webp' };
      const list = (kinds ?? ['jpeg', 'resize']).map((k) => map[k]).filter((k): k is CodecKind => !!k);
      if (list.includes('jpeg')) list.push('jpeg-dec'); // verify step decodes
      await prewarmCodecs(list);
    },

    async release(img) {
      if (img) registry.delete(img.id);
    },

    convert: (img, format, opts) => guard(async () => convertRaster(get(img), format, opts)),

    photoSheet: (img, opts) => guard(async () => photoSheetCore(get(img), opts, encodeJpeg, resizeRaster)),

    preview: (img, opts) =>
      guard(async () => {
        let r = await capLongSide(get(img), opts?.maxSide ?? 1024);
        if (hasAlpha(r)) r = flattenAlpha(r);
        const bytes = await encodeJpeg(r, 85);
        return { bytes, mime: 'image/jpeg' as const, width: r.width, height: r.height };
      }),
  };
  return core;
}
