/**
 * Public engine API (main thread). Together with ./types this is the only engine module UI code
 * may import; prefer the lazy `@/engine/client` so Comlink and the worker URL stay out of the
 * initial bundle.
 *
 * Every function lazily starts one module Web Worker (supervised: crash recovery, timeouts,
 * abort, stale-handle detection) and accepts an optional trailing `EngineCallOptions`.
 */
import * as Comlink from 'comlink';
import { assertNotAlreadySmall, runCompressPdf } from './core/compress-plan';
import { chooseDims } from './core/dims';
import { stripHeight, stripLines } from './core/strip';
import { installErrorTransfer } from './error-transfer';
import { DEFAULT_MAX_SIDE, MAX_PDF_BYTES, sizeDetails } from './limits';
import { decodeOnMainThread, domTextRaster } from './main/main-decode';
import { WorkerSupervisor, type SpawnedWorker } from './main/supervisor';
import {
  EngineError,
  isEngineError,
  type Bytes,
  type CleanupOptions,
  type CompressPdfOptions,
  type ConvertFormat,
  type ConvertOptions,
  type CropRect,
  type DecodeOptions,
  type DecodePdfPagesOptions,
  type DocSpec,
  type EngineApi,
  type EngineCallOptions,
  type EngineImage,
  type EngineResetReason,
  type FitOptions,
  type FitResult,
  type Flip,
  type ImagesToPdfOptions,
  type PhotoSheetOptions,
  type PrewarmKind,
  type PreviewOptions,
  type PreviewResult,
  type RasterImage,
  type ZipEntry,
} from './types';
import type { PdfInputItem, WorkerApi, WorkerCaps } from './worker/protocol';

export type * from './types';
export { EngineError, isEngineError } from './types';

type Remote = Comlink.Remote<WorkerApi>;

const PDF_RENDER_MAX_SIDE = 4000;
const DEFAULT_PDF_DPI = 150;

function spawnEngineWorker(generation: number): SpawnedWorker<Remote> {
  if (typeof Worker === 'undefined') {
    throw new EngineError('WASM_UNSUPPORTED', 'Web Workers are not available in this environment');
  }
  installErrorTransfer();
  // Keep this exact `new Worker(new URL(...), …)` shape: the bundler detects it and emits the
  // worker as its own hashed chunk.
  const worker = new Worker(new URL('./worker/worker.ts', import.meta.url), {
    type: 'module',
    name: 'sahisize-engine',
  });
  const remote = Comlink.wrap<WorkerApi>(worker);
  // First message on the port: every later call is processed after it.
  remote.init(generation).catch(() => {});
  return {
    remote,
    terminate() {
      try {
        remote[Comlink.releaseProxy]();
      } finally {
        worker.terminate();
      }
    },
    onCrash(cb) {
      worker.addEventListener('error', (e) => cb(e.message || 'worker error'));
      worker.addEventListener('messageerror', () => cb('messageerror'));
    },
  };
}

const supervisor = new WorkerSupervisor<Remote>({ spawn: spawnEngineWorker });

let capsCache: { generation: number; promise: Promise<WorkerCaps> } | null = null;

function caps(): Promise<WorkerCaps> {
  const generation = supervisor.liveGeneration;
  if (capsCache && capsCache.generation === generation) return capsCache.promise;
  const promise = supervisor
    .call((r) => r.caps(), { timeoutMs: 15_000 })
    .catch((): WorkerCaps => ({ offscreenCanvas: false, wasm: typeof WebAssembly !== 'undefined' }));
  capsCache = { generation: supervisor.liveGeneration, promise };
  return promise;
}

function txRaster(r: RasterImage): RasterImage {
  return Comlink.transfer(r, [r.data.buffer]);
}

function throwIfAborted(call?: EngineCallOptions): void {
  if (call?.signal?.aborted) throw new EngineError('CANCELLED', 'Cancelled');
}

async function isPdfBlob(b: Blob): Promise<boolean> {
  if (b.type === 'application/pdf') return true;
  const head = new Uint8Array(await b.slice(0, 5).arrayBuffer());
  return head[0] === 0x25 && head[1] === 0x50 && head[2] === 0x44 && head[3] === 0x46;
}

function isEngineImage(x: Blob | EngineImage): x is EngineImage {
  return !(x instanceof Blob);
}

function assertPdfSize(file: Blob): void {
  if (file.size > MAX_PDF_BYTES) {
    throw new EngineError('TOO_LARGE_INPUT', 'PDF is too large', sizeDetails(file.size, MAX_PDF_BYTES));
  }
}

/** Calls that return a new handle release it when the caller already stopped waiting. */
function handleCall(
  fn: (r: Remote) => Promise<EngineImage>,
  handles: readonly EngineImage[],
  call?: EngineCallOptions,
): Promise<EngineImage> {
  return supervisor.call(fn, { ...call, handles, onLateResult: release });
}

function adopt(raster: RasterImage, call?: EngineCallOptions): Promise<EngineImage> {
  return handleCall((r) => r.adoptRaster(txRaster(raster)), [], call);
}

// ---------------------------------------------------------------------------
// Lifecycle
// ---------------------------------------------------------------------------

/** Terminate the worker (frees all handles; pending calls reject with WORKER_CRASHED). */
export function terminateEngine(): void {
  supervisor.reset('terminated');
  capsCache = null;
}

/**
 * Subscribe to worker resets (crash, timeout, terminate, abort with terminateOnAbort). Every
 * EngineImage held by the UI is invalid afterwards. Returns an unsubscribe function.
 */
export function onEngineReset(cb: (reason: EngineResetReason) => void): () => void {
  return supervisor.onReset(cb);
}

/** True when `img` belongs to the live worker (not released by a reset). */
export function isHandleLive(img: EngineImage | null | undefined): boolean {
  return supervisor.isLive(img);
}

// ---------------------------------------------------------------------------
// Core calls
// ---------------------------------------------------------------------------

export async function decode(file: Blob, opts?: DecodeOptions, call?: EngineCallOptions): Promise<EngineImage> {
  try {
    return await handleCall((r) => r.decode(file, opts), [], call);
  } catch (e) {
    // The worker could not decode (no OffscreenCanvas + a format without a WASM decoder, e.g.
    // iOS 15 + GIF): decode on the main thread and hand the pixels over.
    if (!isEngineError(e) || typeof document === 'undefined') throw e;
    const needsMain = e.details?.needsMainThread === 1;
    if (!needsMain && !(e.code === 'DECODE_FAILED' && !(await caps()).offscreenCanvas)) throw e;
    throwIfAborted(call);
    const raster = await decodeOnMainThread(file, opts?.maxSide ?? DEFAULT_MAX_SIDE);
    return adopt(raster, call);
  }
}

export function crop(
  img: EngineImage,
  rect: CropRect,
  rotationDeg: number,
  flip: Flip,
  call?: EngineCallOptions,
): Promise<EngineImage> {
  return handleCall((r) => r.crop(img, rect, rotationDeg, flip), [img], call);
}

export function cleanup(
  img: EngineImage,
  kind: 'signature' | 'thumb',
  opts: CleanupOptions,
  call?: EngineCallOptions,
): Promise<EngineImage> {
  return handleCall((r) => r.cleanup(img, kind, opts), [img], call);
}

export async function fit(img: EngineImage, spec: DocSpec, opts?: FitOptions, call?: EngineCallOptions): Promise<FitResult> {
  supervisor.assertLive(img);
  let strip: RasterImage | undefined;
  const lines = opts?.nameDate ? stripLines(opts.nameDate) : [];
  if (lines.length && typeof document !== 'undefined' && !(await caps()).offscreenCanvas) {
    // No OffscreenCanvas in the worker (iOS < 16.4): render the name/date strip here.
    const d = chooseDims(spec, img.width / img.height, { w: img.width, h: img.height }, opts);
    strip = await domTextRaster()(lines, d.w, stripHeight(d.h));
  }
  return supervisor.call((r) => r.fit(img, spec, opts, strip ? txRaster(strip) : undefined), {
    ...call,
    handles: [img],
  });
}

export async function imagesToPdf(
  files: (Blob | EngineImage)[],
  opts: ImagesToPdfOptions,
  call?: EngineCallOptions,
): Promise<Bytes> {
  const { onProgress, ...rest } = opts;
  for (const f of files) if (isEngineImage(f)) supervisor.assertLive(f);
  const items: PdfInputItem[] = [];
  const temporary: EngineImage[] = [];
  try {
    for (const f of files) {
      throwIfAborted(call);
      if (isEngineImage(f)) items.push({ kind: 'image', img: f });
      else if (await isPdfBlob(f)) {
        // PDFs are rasterised on the main thread (pdfjs legacy build); pages become images.
        const pages = await decodePdfPages(f, { dpi: DEFAULT_PDF_DPI }, call);
        temporary.push(...pages);
        for (const p of pages) items.push({ kind: 'image', img: p });
      } else items.push({ kind: 'blob', blob: f });
    }
    const progress = onProgress ? Comlink.proxy(onProgress) : undefined;
    return await supervisor.call((r) => r.imagesToPdf(items, rest, progress), {
      ...call,
      handles: items.flatMap((it) => (it.kind === 'image' ? [it.img] : [])),
    });
  } finally {
    for (const img of temporary) release(img);
  }
}

export async function decodePdfPages(
  file: Blob,
  opts?: DecodePdfPagesOptions,
  call?: EngineCallOptions,
): Promise<EngineImage[]> {
  assertPdfSize(file);
  throwIfAborted(call);
  const { openPdf } = await import('./main/pdf-raster');
  const pdf = await openPdf(file);
  const out: EngineImage[] = [];
  try {
    const all = Array.from({ length: pdf.numPages }, (_, i) => i + 1);
    const pages = (opts?.pages ?? all).filter((n) => Number.isInteger(n) && n >= 1 && n <= pdf.numPages);
    for (const n of pages) {
      throwIfAborted(call);
      const raster = await pdf.render(n, opts?.dpi ?? DEFAULT_PDF_DPI, PDF_RENDER_MAX_SIDE);
      out.push(await adopt(raster, call));
    }
    return out;
  } catch (e) {
    for (const img of out) release(img);
    throw e;
  } finally {
    await pdf.destroy().catch(() => {});
  }
}

export async function compressPdf(
  file: Blob,
  maxKB: number,
  opts?: CompressPdfOptions,
  call?: EngineCallOptions,
): Promise<Bytes> {
  assertNotAlreadySmall(file.size, maxKB);
  assertPdfSize(file);
  throwIfAborted(call);
  const { openPdf } = await import('./main/pdf-raster');
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
              throwIfAborted(call);
              imgs.push(await adopt(await pdf.render(n, dpi, PDF_RENDER_MAX_SIDE), call));
              onPage();
            }
          } catch (e) {
            for (const img of imgs) release(img);
            throw e;
          }
          // assemblePdfFromRasters frees the handles it receives.
          return supervisor.call(
            (r) => r.assemblePdfFromRasters(imgs, { maxKB: kb, pageSizesPt: pages.map((n) => sizes[n - 1]!) }),
            { ...call, handles: imgs },
          );
        },
      },
      opts,
    );
  } finally {
    await pdf.destroy().catch(() => {});
  }
}

export function zip(files: ZipEntry[], readme?: string, call?: EngineCallOptions): Promise<Bytes> {
  return supervisor.call((r) => r.zip(files, readme), call);
}

// ---------------------------------------------------------------------------
// Additive
// ---------------------------------------------------------------------------

/** Start WASM fetch/compile early (uploader pointerenter/focus). Never throws. */
export function prewarm(kinds?: PrewarmKind[]): void {
  supervisor.call((r) => r.prewarm(kinds), { timeoutMs: 0 }).catch(() => {});
}

/** Free a handle's pixels in the worker. Safe to call twice and on stale handles. */
export function release(img: EngineImage): void {
  if (!supervisor.isLive(img)) return;
  supervisor.remote().release(img).catch(() => {});
}

export function resize(img: EngineImage, width: number, height: number, call?: EngineCallOptions): Promise<EngineImage> {
  return handleCall((r) => r.resize(img, width, height), [img], call);
}

export function convert(
  img: EngineImage,
  format: ConvertFormat,
  opts?: ConvertOptions,
  call?: EngineCallOptions,
): Promise<Bytes> {
  return supervisor.call((r) => r.convert(img, format, opts), { ...call, handles: [img] });
}

export function photoSheet(img: EngineImage, opts: PhotoSheetOptions, call?: EngineCallOptions): Promise<Bytes> {
  return supervisor.call((r) => r.photoSheet(img, opts), { ...call, handles: [img] });
}

export function preview(img: EngineImage, opts?: PreviewOptions, call?: EngineCallOptions): Promise<PreviewResult> {
  return supervisor.call((r) => r.preview(img, opts), { ...call, handles: [img] });
}

/** Same functions as one object, for dependency injection and test doubles. */
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
