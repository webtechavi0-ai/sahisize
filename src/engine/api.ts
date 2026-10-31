/**
 * ★ Frozen contract (Phase 1): exported names and signatures.
 * Workstream A owns the function BODIES from Phase 2 (PLAN 2, 3.7).
 *
 * The only module UI code may import from the engine (besides types.ts).
 * Every function lazily creates one module Web Worker on first use.
 *
 */
import * as Comlink from 'comlink';
import { installErrorTransfer } from './errors';
import {
  EngineError,
  type CleanupOptions,
  type CompressPdfOptions,
  type ConvertFormat,
  type ConvertOptions,
  type DecodePdfPagesOptions,
  type CropRect,
  type DecodeOptions,
  type DocSpec,
  type EngineApi,
  type EngineImage,
  type FitOptions,
  type FitResult,
  type Flip,
  type ImagesToPdfOptions,
  type PhotoSheetOptions,
  type PrewarmKind,
  type PreviewOptions,
  type PreviewResult,
  type ZipEntry,
  type Bytes,
} from './types';
import type { PdfInputItem, WorkerApi, WorkerCaps } from './worker-protocol';
import type { RasterImage } from './types';
import { chooseDims } from './dims';
import { stripHeight, stripLines, canvasTextRaster } from './strip';
import { assertNotAlreadySmall, runCompressPdf } from './compress-pdf';

export type * from './types';
export { EngineError } from './types';

let worker: Worker | null = null;
let remote: Comlink.Remote<WorkerApi> | null = null;
let capsP: Promise<WorkerCaps> | null = null;

function caps(): Promise<WorkerCaps> {
  return (capsP ??= getRemote()
    .caps()
    .catch(() => ({ offscreenCanvas: false, wasm: typeof WebAssembly !== 'undefined' })));
}

function txRaster(r: RasterImage): RasterImage {
  return Comlink.transfer(r, [r.data.buffer]);
}

/** Main-thread decode (PLAN 3.7 step 4): worker without OffscreenCanvas, or GIF/BMP there. */
async function decodeOnMainThread(file: Blob, maxSide: number): Promise<RasterImage> {
  let src: CanvasImageSource & { width: number; height: number };
  let close = () => {};
  try {
    const bmp = await createImageBitmap(file, { imageOrientation: 'from-image' });
    src = bmp;
    close = () => bmp.close();
  } catch {
    const url = URL.createObjectURL(file);
    try {
      const img = new Image();
      img.decoding = 'async';
      img.src = url;
      await img.decode();
      src = Object.assign(img, { width: img.naturalWidth, height: img.naturalHeight });
    } catch {
      throw new EngineError('DECODE_FAILED', 'The browser could not read this image');
    } finally {
      URL.revokeObjectURL(url);
    }
  }
  try {
    const k = Math.min(1, maxSide / Math.max(src.width, src.height));
    const w = Math.max(1, Math.round(src.width * k));
    const h = Math.max(1, Math.round(src.height * k));
    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) throw new EngineError('OUT_OF_MEMORY', 'Canvas unavailable');
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(src, 0, 0, w, h);
    const id = ctx.getImageData(0, 0, w, h);
    canvas.width = canvas.height = 0;
    return { data: new Uint8ClampedArray(id.data.buffer), width: w, height: h };
  } finally {
    close();
  }
}

async function isPdfBlob(b: Blob): Promise<boolean> {
  if (b.type === 'application/pdf') return true;
  const head = new Uint8Array(await b.slice(0, 5).arrayBuffer());
  return head[0] === 0x25 && head[1] === 0x50 && head[2] === 0x44 && head[3] === 0x46;
}

function getRemote(): Comlink.Remote<WorkerApi> {
  if (remote) return remote;
  if (typeof Worker === 'undefined') {
    throw new EngineError('WASM_UNSUPPORTED', 'Web Workers are not available in this environment');
  }
  installErrorTransfer();
  // Same pattern in dev, build and Playwright (PLAN 1.6 #3). Do not switch to `?worker`.
  worker = new Worker(new URL('./worker.ts', import.meta.url), {
    type: 'module',
    name: 'sahisize-engine',
  });
  remote = Comlink.wrap<WorkerApi>(worker);
  worker.addEventListener('error', () => terminateEngine());
  return remote;
}

/** Terminate the worker (frees all handles). The next call starts a fresh worker. */
export function terminateEngine(): void {
  if (remote) remote[Comlink.releaseProxy]();
  worker?.terminate();
  worker = null;
  remote = null;
  capsP = null;
}

// ---------------------------------------------------------------------------
// SPEC 7.8
// ---------------------------------------------------------------------------

export async function decode(file: Blob, opts?: DecodeOptions): Promise<EngineImage> {
  const r = getRemote();
  try {
    return await r.decode(file, opts);
  } catch (e) {
    // The worker could not decode (no OffscreenCanvas + a format without a WASM decoder,
    // e.g. iOS 15 + GIF): decode on the main thread and hand the pixels over.
    const code = (e as EngineError)?.code;
    const needsMain = (e as EngineError)?.details?.needsMainThread === 1;
    const c = await caps();
    if (typeof document === 'undefined' || !(needsMain || (code === 'DECODE_FAILED' && !c.offscreenCanvas))) throw e;
    const raster = await decodeOnMainThread(file, opts?.maxSide ?? 4000);
    return r.adoptRaster(txRaster(raster));
  }
}

export async function crop(
  img: EngineImage,
  rect: CropRect,
  rotationDeg: number,
  flip: Flip,
): Promise<EngineImage> {
  return getRemote().crop(img, rect, rotationDeg, flip);
}

export async function cleanup(
  img: EngineImage,
  kind: 'signature' | 'thumb',
  opts: CleanupOptions,
): Promise<EngineImage> {
  return getRemote().cleanup(img, kind, opts);
}

export async function fit(img: EngineImage, spec: DocSpec, opts?: FitOptions): Promise<FitResult> {
  const r = getRemote();
  let strip: RasterImage | undefined;
  const lines = opts?.nameDate ? stripLines(opts.nameDate) : [];
  if (lines.length && typeof document !== 'undefined' && !(await caps()).offscreenCanvas) {
    // No OffscreenCanvas in the worker (iOS < 16.4): render the K11 strip here.
    const d = chooseDims(spec, img.width / img.height, { w: img.width, h: img.height }, opts);
    const raster = canvasTextRaster((w, h) => {
      const c = document.createElement('canvas');
      c.width = w;
      c.height = h;
      return c;
    });
    strip = await raster(lines, d.w, stripHeight(d.h));
  }
  return r.fit(img, spec, opts, strip ? txRaster(strip) : undefined);
}

export async function imagesToPdf(
  files: (Blob | EngineImage)[],
  opts: ImagesToPdfOptions,
): Promise<Bytes> {
  const { onProgress, ...rest } = opts;
  const r = getRemote();
  const items: PdfInputItem[] = [];
  for (const f of files) {
    if (!(f instanceof Blob)) items.push({ kind: 'image', img: f });
    else if (await isPdfBlob(f)) {
      // PDFs are rasterised on the main thread (pdfjs legacy build), pages become images.
      const pages = await decodePdfPages(f, { dpi: 150 });
      for (const p of pages) items.push({ kind: 'image', img: p });
    } else items.push({ kind: 'blob', blob: f });
  }
  try {
    return await r.imagesToPdf(items, rest, onProgress ? Comlink.proxy(onProgress) : undefined);
  } finally {
    for (let i = 0; i < items.length; i++) {
      const it = items[i]!;
      if (it.kind === 'image' && !files.includes(it.img)) release(it.img);
    }
  }
}

export async function decodePdfPages(
  file: Blob,
  opts?: DecodePdfPagesOptions,
): Promise<EngineImage[]> {
  if (file.size > MAX_PDF_BYTES) {
    throw new EngineError('TOO_LARGE_INPUT', 'PDF is too large', {
      sizeMB: Math.round((file.size / 1048576) * 10) / 10,
      maxMB: Math.round(MAX_PDF_BYTES / 1048576),
    });
  }
  const r = getRemote();
  const { openPdf } = await import('./pdf-raster');
  const pdf = await openPdf(file);
  const out: EngineImage[] = [];
  try {
    const pages = (opts?.pages ?? Array.from({ length: pdf.numPages }, (_, i) => i + 1)).filter(
      (n) => Number.isInteger(n) && n >= 1 && n <= pdf.numPages,
    );
    for (const n of pages) {
      const raster = await pdf.render(n, opts?.dpi ?? 150, 4000);
      out.push(await r.adoptRaster(txRaster(raster)));
    }
    return out;
  } catch (e) {
    for (const img of out) release(img);
    throw e;
  } finally {
    await pdf.destroy();
  }
}

/** Same limit as images (SPEC K3). */
const MAX_PDF_BYTES = 25 * 1024 * 1024;

export async function compressPdf(
  file: Blob,
  maxKB: number,
  opts?: CompressPdfOptions,
): Promise<Bytes> {
  assertNotAlreadySmall(file.size, maxKB);
  if (file.size > MAX_PDF_BYTES) {
    throw new EngineError('TOO_LARGE_INPUT', 'PDF is too large', {
      sizeMB: Math.round((file.size / 1048576) * 10) / 10,
      maxMB: Math.round(MAX_PDF_BYTES / 1048576),
    });
  }
  const r = getRemote();
  const { openPdf } = await import('./pdf-raster');
  const pdf = await openPdf(file);
  try {
    const sizes: { w: number; h: number }[] = [];
    for (let n = 1; n <= pdf.numPages; n++) sizes.push(await pdf.pageSize(n));
    return await runCompressPdf(
      file.size,
      maxKB,
      {
        numPages: pdf.numPages,
        imageShare: (n) => pdf.imageShare(n),
        async build(pages, dpi, kb, onPage) {
          const imgs: EngineImage[] = [];
          try {
            for (const n of pages) {
              imgs.push(await r.adoptRaster(txRaster(await pdf.render(n, dpi, 4000))));
              onPage();
            }
          } catch (e) {
            for (const img of imgs) release(img);
            throw e;
          }
          // assemblePdfFromRasters frees the handles.
          return r.assemblePdfFromRasters(imgs, { maxKB: kb, pageSizesPt: pages.map((n) => sizes[n - 1]!) });
        },
      },
      opts,
    );
  } finally {
    await pdf.destroy();
  }
}

export async function zip(files: ZipEntry[], readme?: string): Promise<Bytes> {
  return getRemote().zip(files, readme);
}

// ---------------------------------------------------------------------------
// Additive (PLAN 3.7)
// ---------------------------------------------------------------------------

export function prewarm(kinds?: PrewarmKind[]): void {
  try {
    void getRemote()
      .prewarm(kinds)
      .catch(() => {});
  } catch {
    // never throws
  }
}

export function release(img: EngineImage): void {
  if (!remote) return;
  void remote.release(img).catch(() => {});
}

export async function resize(
  img: EngineImage,
  width: number,
  height: number,
): Promise<EngineImage> {
  return getRemote().resize(img, width, height);
}

export async function convert(
  img: EngineImage,
  format: ConvertFormat,
  opts?: ConvertOptions,
): Promise<Bytes> {
  return getRemote().convert(img, format, opts);
}

export async function photoSheet(img: EngineImage, opts: PhotoSheetOptions): Promise<Bytes> {
  return getRemote().photoSheet(img, opts);
}

export async function preview(img: EngineImage, opts?: PreviewOptions): Promise<PreviewResult> {
  return getRemote().preview(img, opts);
}

/** Same functions as one object, for dependency injection. */
export const engine: EngineApi = {
  decode,
  crop,
  cleanup,
  fit,
  imagesToPdf,
  decodePdfPages,
  compressPdf,
  zip,
  prewarm,
  release,
  resize,
  convert,
  photoSheet,
  preview,
};
