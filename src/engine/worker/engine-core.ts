/**
 * The engine behind the worker: an image-handle registry plus every WorkerApi call.
 * Environment-agnostic (no Comlink, no `self`), so Node tests can drive the exact code the
 * worker runs; worker.ts only adds Comlink and transfers.
 */
import { decodeJpeg, decodePng, encodeJpeg, encodePng, prewarmCodecs, type CodecKind } from '../codecs/codecs';
import { resizeRaster } from '../codecs/resize';
import { cleanupRaster } from '../core/cleanup';
import { fitRaster, type FitDeps } from '../core/fit';
import { capLongSide } from '../core/geometry';
import { assembleCompressed, imagesToPdfCore } from '../core/pdf-assemble';
import { flattenAlpha, hasAlpha, transformAndCrop } from '../core/raster';
import { photoSheetCore } from '../core/sheet';
import { canvasTextRaster, type TextContext2D, type TextRasterFn } from '../core/strip';
import { buildZip } from '../core/zip';
import { DEFAULT_MAX_SIDE } from '../limits';
import { EngineError, isEngineError, type EngineImage, type PrewarmKind, type RasterImage } from '../types';
import { convertRaster } from './convert';
import { decodeBlob, type NativeDecodeEnv } from './decode';
import type { WorkerApi } from './protocol';

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

const MAX_RESIZE_SIDE = 10000;
const DEFAULT_PREVIEW_SIDE = 1024;

function isHandle(x: RasterImage | EngineImage): x is EngineImage {
  return typeof (x as EngineImage).id === 'string' && !('data' in x);
}

function defaultTextRaster(): TextRasterFn | undefined {
  if (typeof OffscreenCanvas === 'undefined') return undefined;
  return canvasTextRaster((w, h) => new OffscreenCanvas(w, h).getContext('2d') as TextContext2D | null);
}

function validRaster(r: RasterImage | undefined): r is RasterImage {
  return !!r && r.width >= 1 && r.height >= 1 && r.data.length === r.width * r.height * 4;
}

export function createEngineCore(env: CoreEnv = {}): EngineCore {
  const registry = new Map<string, RasterImage>();
  let generation = 0;
  let seq = 0;
  const now = env.now ?? (() => (typeof performance !== 'undefined' ? performance.now() : Date.now()));
  const textRaster = env.textRaster ?? defaultTextRaster();

  const put = (r: RasterImage): EngineImage => {
    const id = `g${generation}-${++seq}`;
    registry.set(id, r);
    return { id, width: r.width, height: r.height };
  };
  const get = (img: EngineImage): RasterImage => {
    const r = img ? registry.get(img.id) : undefined;
    if (!r) throw new EngineError('STALE_HANDLE', 'Image handle is not valid (released?)', { id: img?.id ?? '' });
    return r;
  };
  /** Normalise any failure into an EngineError. */
  const guard = async <T>(fn: () => Promise<T>): Promise<T> => {
    try {
      return await fn();
    } catch (e) {
      if (isEngineError(e)) throw e;
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
  const adopt = async (raster: RasterImage): Promise<EngineImage> => {
    if (!validRaster(raster)) throw new EngineError('DECODE_FAILED', 'Invalid raster');
    return put(await capLongSide(raster, DEFAULT_MAX_SIDE, resizeRaster));
  };

  const core: EngineCore = {
    getRaster: get,
    handleCount: () => registry.size,

    init(gen) {
      generation = gen;
    },

    caps: () => ({
      offscreenCanvas: typeof OffscreenCanvas !== 'undefined',
      wasm: typeof WebAssembly !== 'undefined',
    }),

    decode: (blob, opts) =>
      guard(async () => put(await decodeBlob(blob, { ...opts, native: env.native, env: env.nativeEnv }))),

    adoptRaster: (raster) => guard(() => adopt(raster)),

    resize: (img, width, height) =>
      guard(async () => {
        const w = Math.round(width);
        const h = Math.round(height);
        if (!(w >= 1 && h >= 1 && w <= MAX_RESIZE_SIDE && h <= MAX_RESIZE_SIDE)) {
          throw new EngineError('INTERNAL', 'Invalid resize dimensions', { width, height });
        }
        return put(await resizeRaster(get(img), w, h));
      }),

    crop: (img, rect, rotationDeg, flip) =>
      guard(async () => put(transformAndCrop(get(img), rect, rotationDeg || 0, flip ?? { h: false, v: false }))),

    cleanup: (img, kind, opts) =>
      guard(async () => put(await cleanupRaster(get(img), kind, opts ?? { strength: 50, ink: 'black' }, resizeRaster))),

    fit: (img, spec, opts, stripRaster) =>
      guard(() => fitRaster(get(img), spec, fitDeps, { ...(opts ?? {}), stripRaster })),

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
        try {
          const rasters = pages.map((p) => (isHandle(p) ? get(p) : p));
          return await assembleCompressed(rasters, opts.pageSizesPt, opts.maxKB, encodeJpeg);
        } finally {
          for (const p of pages) if (isHandle(p)) registry.delete(p.id);
        }
      }),

    zip: (files, readme) => guard(async () => buildZip(files, readme)),

    async prewarm(kinds?: PrewarmKind[]) {
      const list: CodecKind[] = [...(kinds ?? ['jpeg', 'resize'])];
      if (list.includes('jpeg')) list.push('jpeg-dec'); // the verify step decodes
      await prewarmCodecs(list);
    },

    release(img) {
      if (img) registry.delete(img.id);
    },

    convert: (img, format, opts) => guard(() => convertRaster(get(img), format, opts)),

    photoSheet: (img, opts) => guard(() => photoSheetCore(get(img), opts, encodeJpeg, resizeRaster)),

    preview: (img, opts) =>
      guard(async () => {
        let r = await capLongSide(get(img), opts?.maxSide ?? DEFAULT_PREVIEW_SIDE, resizeRaster);
        if (hasAlpha(r)) r = flattenAlpha(r);
        const bytes = await encodeJpeg(r, 85);
        return { bytes, mime: 'image/jpeg' as const, width: r.width, height: r.height };
      }),
  };
  return core;
}
