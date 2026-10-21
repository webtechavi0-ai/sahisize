/**
 * ★ Frozen contract (Phase 1): exported names and signatures.
 * Workstream A owns the function BODIES from Phase 2 (PLAN 2, 3.7).
 *
 * The only module UI code may import from the engine (besides types.ts).
 * Every function lazily creates one module Web Worker on first use.
 *
 * Tests: `vi.mock('@/engine/api', () => import('@/engine/mock'))` -
 * src/engine/mock.ts exports the same names.
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
import type { PdfInputItem, WorkerApi } from './worker-protocol';

export type * from './types';
export { EngineError, isEngineError } from './types';

let worker: Worker | null = null;
let remote: Comlink.Remote<WorkerApi> | null = null;

/** True when the browser can run the engine at all (Worker + WebAssembly). */
export function isEngineSupported(): boolean {
  return typeof Worker !== 'undefined' && typeof WebAssembly !== 'undefined';
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
  return remote;
}

/** Terminate the worker (frees all handles). The next call starts a fresh worker. */
export function terminateEngine(): void {
  if (remote) remote[Comlink.releaseProxy]();
  worker?.terminate();
  worker = null;
  remote = null;
}

// ---------------------------------------------------------------------------
// SPEC 7.8
// ---------------------------------------------------------------------------

export async function decode(file: Blob, opts?: DecodeOptions): Promise<EngineImage> {
  return getRemote().decode(file, opts);
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
  return getRemote().fit(img, spec, opts);
}

export async function imagesToPdf(
  files: (Blob | EngineImage)[],
  opts: ImagesToPdfOptions,
): Promise<Bytes> {
  const { onProgress, ...rest } = opts;
  // Phase 2 (A): rasterise PDF blobs on the main thread with pdfjs (legacy build) first.
  const items: PdfInputItem[] = files.map((f) =>
    f instanceof Blob ? { kind: 'blob', blob: f } : { kind: 'image', img: f },
  );
  return getRemote().imagesToPdf(items, rest, onProgress ? Comlink.proxy(onProgress) : undefined);
}

export async function decodePdfPages(
  _file: Blob,
  _opts?: DecodePdfPagesOptions,
): Promise<EngineImage[]> {
  // Phase 2 (A): lazy-load pdfjs legacy build on the main thread, render the requested
  // pages at opts.dpi (default 150, 4000 px cap) to RGBA, then
  // getRemote().adoptRasters(rasters) (transfer the buffers). Map password errors to PDF_ENCRYPTED.
  throw new EngineError('NOT_IMPLEMENTED', 'decodePdfPages is not implemented yet');
}

export async function compressPdf(
  _file: Blob,
  _maxKB: number,
  _opts?: CompressPdfOptions,
): Promise<Bytes> {
  // Phase 2 (A): pdfjs rasterise on main thread (150 -> 100 -> 72 DPI), then
  // getRemote().assemblePdfFromRasters(...). Throws ALREADY_SMALL / PDF_IMPOSSIBLE.
  throw new EngineError('NOT_IMPLEMENTED', 'compressPdf is not implemented yet');
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
