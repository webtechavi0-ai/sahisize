/**
 * Public engine types: the contract shared by the engine and every UI feature.
 *
 * UI code imports ONLY from `@/engine/types`, `@/engine/api` (or the lazy `@/engine/client`).
 * Shapes and names match the previous implementation one to one; additions are optional fields,
 * optional trailing parameters and three new error codes (WORKER_CRASHED, TIMEOUT, STALE_HANDLE).
 *
 * This module is pure (no imports) so it is safe on the server, in the worker and in tests.
 */

// ---------------------------------------------------------------------------
// Shared primitives
// ---------------------------------------------------------------------------

/**
 * Byte arrays crossing the API are ArrayBuffer-backed (never SharedArrayBuffer), so
 * `new Blob([bytes])` type-checks under TS 5.7+ lib typings.
 */
export type Bytes = Uint8Array<ArrayBuffer>;

export type DocType = 'photo' | 'signature' | 'thumb' | 'declaration' | 'certificate' | 'other';

export const DOC_TYPES: readonly DocType[] = [
  'photo',
  'signature',
  'thumb',
  'declaration',
  'certificate',
  'other',
] as const;

/** Bilingual string. `hi` may be Hinglish where natural. */
export interface LocalizedText {
  en: string;
  hi: string;
}

/** Output encodings a preset may require. `pdf` only for `doc: 'certificate'`. */
export type OutputFormat = 'jpg' | 'png' | 'pdf';

/** Physical size as printed in a notice. */
export interface PhysicalSize {
  width: number;
  height: number;
  unit: 'cm' | 'mm' | 'in';
}

// ---------------------------------------------------------------------------
// DocSpec
// ---------------------------------------------------------------------------

/**
 * One document an exam needs, as the engine consumes it.
 *
 * Pixel modes (decided by `chooseDims` in core/dims.ts):
 *  - Fixed:   widthPx and heightPx both set -> exact output size.
 *  - Range:   widthPx/heightPx null and any min/max*Px set -> aspect follows the crop.
 *  - KB-only: widthPx/heightPx null and no ranges -> defaults per doc type.
 * `widthPx` and `heightPx` are either both null or both numbers.
 *
 * KB values use 1 KB = 1024 bytes. `minKB: null` means no minimum. `maxKB: null` means the size
 * is not known yet (preset documents with `toVerify: true`); `fit()` throws SPEC_INCOMPLETE.
 */
export interface DocSpec {
  doc: DocType;
  label: LocalizedText;
  widthPx: number | null;
  heightPx: number | null;
  minWidthPx?: number;
  maxWidthPx?: number;
  minHeightPx?: number;
  maxHeightPx?: number;
  minKB: number | null;
  maxKB: number | null;
  format: OutputFormat;
  /** Explicit crop aspect (w/h) when the notice implies one but gives no fixed pixels. */
  aspect?: number;
  /** DPI to write. null = 200 if `physical` is set, else none. */
  dpi: number | null;
  /** Output file name incl. extension, e.g. "photo.jpg". Unique within an exam. */
  fileName: string;
  maxFileNameChars?: number;
  /** Human rules: background, ink colour, etc. */
  rules: LocalizedText[];
  /** Render a name + date strip inside the final pixels. */
  needsNameDateStrip?: boolean;
  /** Cleanup kind on by default for this document. */
  cleanup?: 'signature' | 'thumb' | null;
  /** Size as printed in the notice; widthPx/heightPx were derived from it at authoring time. */
  physical?: PhysicalSize;
  /** True when widthPx/heightPx were computed from `physical` and `dpi` (default 200). */
  pxDerived?: boolean;
}

// ---------------------------------------------------------------------------
// Images and geometry
// ---------------------------------------------------------------------------

/**
 * Opaque handle to a decoded image that lives inside the engine worker. Width/height are after
 * EXIF orientation and the 4000 px long-side cap. Call `release(img)` when done.
 *
 * Handles belong to one worker generation: after the worker crashes, times out or is
 * terminated, older handles fail with EngineError('STALE_HANDLE').
 */
export interface EngineImage {
  readonly id: string;
  readonly width: number;
  readonly height: number;
}

/** Raw RGBA pixels. The engine core works only on this (no canvas). */
export interface RasterImage {
  data: Uint8ClampedArray;
  width: number;
  height: number;
}

/** Crop rectangle in pixels of the *transformed* image (see `crop()`). May be fractional. */
export interface CropRect {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface Flip {
  h: boolean;
  v: boolean;
}

export interface CleanupOptions {
  /** Threshold strength slider, 0-100. Default 50. */
  strength: number;
  /** Ink colour to keep. 'blue' only makes sense for thumbs. */
  ink: 'black' | 'blue';
  /** After crop-to-ink (+8% padding), pad with white, centred, to this aspect (w/h). */
  targetAspect?: number;
}

export interface NameDate {
  name: string;
  /** Display string exactly as it should be printed, e.g. "21/10/2026". */
  date: string;
}

// ---------------------------------------------------------------------------
// Fit result
// ---------------------------------------------------------------------------

export type FitStage = 'encode' | 'search' | 'blur' | 'grain' | 'pad' | 'dpi' | 'shrink' | 'grow' | 'strip';

/** Stable ids for pass-check rows. UI maps these to i18n labels. */
export type FitCheckRule =
  | 'dims' // Width x Height
  | 'size' // File size, 1 KB = 1024 B
  | 'size1000' // File size under 1 KB = 1000 B (required when both readings can pass, else warning)
  | 'format' // magic bytes
  | 'baseline' // JPEG SOF0, not progressive
  | 'dpi' // JFIF density / PNG pHYs
  | 'background'; // white-ratio heuristic; 'info' when not checkable

export interface FitCheck {
  rule: FitCheckRule;
  pass: boolean;
  /** Language-neutral display value, e.g. "200×230 px", "34.2 KB", "JPG", "200 DPI". */
  actual: string;
  /** e.g. "200×230 px", "20–50 KB", "any (KB-only)". */
  required: string;
  /** 'required' (default when absent) blocks download; 'warning' is shown; 'info' is n/a. */
  level?: 'required' | 'warning' | 'info';
}

/** Output of `chooseDims`, echoed in FitResult for display. */
export interface ChosenDims {
  w: number;
  h: number;
  mode: 'fixed' | 'range' | 'kb-only';
  flex: {
    canShrink: boolean;
    canGrow: boolean;
    minW: number;
    minH: number;
    maxW: number;
    maxH: number;
  };
}

export interface FitResult {
  bytes: Bytes;
  widthPx: number;
  heightPx: number;
  sizeBytes: number;
  /** Final encoder quality (1-100). 0 for PNG. */
  quality: number;
  stages: FitStage[];
  checks: FitCheck[];
  format?: 'jpg' | 'png';
  /** Wall time of the fit call inside the worker. */
  durationMs?: number;
  warnings?: FitWarning[];
  dims?: ChosenDims;
}

export type FitWarning =
  | 'PADDED' // COM / tEXt padding used
  | 'GRAIN' // invisible grain added
  | 'BLURRED' // mild blur applied to reach max KB
  | 'PASSES_ONLY_1024'
  | 'PASSES_ONLY_1000'
  | 'DOWNSCALED' // KB-only output shrunk to fit max KB
  | 'LETTERBOXED' // aspect mismatch padded with white (signature/thumb/declaration/certificate)
  | 'COVER_CROPPED'; // aspect mismatch centre cover-crop (photo/other)

// ---------------------------------------------------------------------------
// Errors
// ---------------------------------------------------------------------------

/** Closed union. The UI maps each to an i18n message with numbers from `details`. */
export type EngineErrorCode =
  | 'TOO_DETAILED' // cannot get under max KB even at q=5 + blur
  | 'TOO_PLAIN' // cannot get over min KB even after grain + pad (should not happen)
  | 'DECODE_FAILED'
  | 'TOO_LARGE_INPUT' // > MAX_UPLOAD_BYTES
  | 'UNSUPPORTED_TYPE'
  | 'PDF_IMPOSSIBLE' // PDF cannot reach max KB
  | 'ALREADY_SMALL' // compressPdf: input already under max KB
  | 'PDF_TEXT_ONLY' // compressPdf: mostly text (retry with allowTextOnly)
  | 'WASM_UNSUPPORTED' // WebAssembly or workers blocked/unavailable
  | 'PDF_ENCRYPTED' // password-protected PDF
  | 'SPEC_INCOMPLETE' // fit() called with maxKB null
  | 'OUT_OF_MEMORY' // allocation failed; suggest a smaller photo
  | 'CANCELLED' // the caller aborted the call (EngineCallOptions.signal)
  | 'INTERNAL' // unexpected bug; UI shows the generic message
  | 'NOT_IMPLEMENTED'
  // Additions (worker supervisor). UIs without a dedicated message can treat them as INTERNAL,
  // with a "try again" action: the next call starts a fresh worker.
  | 'WORKER_CRASHED' // the worker died (crash / OOM kill / terminateEngine) while the call was pending
  | 'TIMEOUT' // the call exceeded its timeout; the worker was restarted
  | 'STALE_HANDLE'; // the EngineImage came from a previous worker generation; decode again

export const ENGINE_ERROR_CODES: readonly EngineErrorCode[] = [
  'TOO_DETAILED',
  'TOO_PLAIN',
  'DECODE_FAILED',
  'TOO_LARGE_INPUT',
  'UNSUPPORTED_TYPE',
  'PDF_IMPOSSIBLE',
  'ALREADY_SMALL',
  'PDF_TEXT_ONLY',
  'WASM_UNSUPPORTED',
  'PDF_ENCRYPTED',
  'SPEC_INCOMPLETE',
  'OUT_OF_MEMORY',
  'CANCELLED',
  'INTERNAL',
  'NOT_IMPLEMENTED',
  'WORKER_CRASHED',
  'TIMEOUT',
  'STALE_HANDLE',
] as const;

/** Alias kept for callers written against the old name. */
export type FitErrorCode = EngineErrorCode;

/** Numbers for the error message, e.g. { minKBReached: 61, maxKB: 50 }. */
export type EngineErrorDetails = Record<string, number | string>;

/** Error thrown by every engine call. Survives the worker boundary (error-transfer.ts). */
export class EngineError extends Error {
  readonly code: EngineErrorCode;
  readonly details?: EngineErrorDetails;
  constructor(code: EngineErrorCode, message?: string, details?: EngineErrorDetails) {
    super(message ?? code);
    this.name = 'EngineError';
    this.code = code;
    this.details = details;
  }
}

export { EngineError as FitError };

export function isEngineError(e: unknown): e is EngineError {
  return (
    e instanceof EngineError ||
    (typeof e === 'object' &&
      e !== null &&
      (e as { name?: unknown }).name === 'EngineError' &&
      typeof (e as { code?: unknown }).code === 'string')
  );
}

// ---------------------------------------------------------------------------
// API option types
// ---------------------------------------------------------------------------

export interface DecodeOptions {
  /** Long-side cap applied during decode. Default 4000. */
  maxSide?: number;
}

export interface FitOptions {
  nameDate?: NameDate;
  /** KB-only specs: keep the input pixel size instead of the doc default. */
  keepSourceDims?: boolean;
  /** KB-only specs: allow shrinking to reach max KB. Default true. */
  allowDownscale?: boolean;
  /** Grain seed for reproducible output (tests). */
  seed?: number;
}

export interface ImagesToPdfOptions {
  page: 'a4' | 'original';
  maxKB: number | null;
  minKB?: number | null;
  onProgress?: ProgressFn;
}

export interface CompressPdfOptions {
  onProgress?: ProgressFn;
  /** Compress a PDF that is mostly text anyway (otherwise PDF_TEXT_ONLY). */
  allowTextOnly?: boolean;
}

export interface PhotoSheetOptions {
  copies: 4 | 8 | 12 | 16;
  paper: 'a4' | '4x6';
  /** Default 'pdf'. */
  output?: 'pdf' | 'jpg';
  /** Printed size of each copy. Default 35×45 mm. */
  widthMm?: number;
  heightMm?: number;
}

export type ConvertFormat = 'jpg' | 'png' | 'webp';

export interface ConvertOptions {
  /** 1-100 for jpg/webp. Default 90. Ignored for png. */
  quality?: number;
  /** Fill for transparent pixels when the output has no alpha (jpg). Default '#FFFFFF'. */
  background?: string;
}

export interface DecodePdfPagesOptions {
  /** Rasterisation DPI. Default 150. Pages are still capped at 4000 px long side. */
  dpi?: number;
  /** 1-based page numbers. Default: all pages. */
  pages?: number[];
}

export type PrewarmKind = 'jpeg' | 'resize' | 'png' | 'webp';

/** Called with (done, total). */
export type ProgressFn = (done: number, total: number) => void;

export interface ZipEntry {
  name: string;
  bytes: Bytes;
}

export interface PreviewOptions {
  /** Long side of the preview. Default 1024. */
  maxSide?: number;
}

export interface PreviewResult {
  bytes: Bytes;
  mime: 'image/jpeg' | 'image/png';
  width: number;
  height: number;
}

/**
 * Optional trailing argument accepted by every async engine call (addition).
 *  - signal: aborting rejects the call with CANCELLED. The worker finishes the current step in
 *    the background and any handle it returns is released; pass `terminateOnAbort` to kill the
 *    worker instead (frees memory at once but invalidates every handle).
 *  - timeoutMs: per worker round trip. Default 180 000 ms. On timeout the worker is restarted
 *    and the call rejects with TIMEOUT. 0 disables the timeout.
 */
export interface EngineCallOptions {
  signal?: AbortSignal;
  timeoutMs?: number;
  terminateOnAbort?: boolean;
}

/** Why the engine worker was reset (see `onEngineReset`). */
export type EngineResetReason = 'crashed' | 'timeout' | 'terminated' | 'aborted';

// ---------------------------------------------------------------------------
// Engine API (implemented by api.ts)
// ---------------------------------------------------------------------------

export interface EngineApi {
  /**
   * Decode JPG/PNG/WebP/HEIC (+ GIF/BMP via the main thread). Applies EXIF orientation and the
   * long-side cap. Throws TOO_LARGE_INPUT, UNSUPPORTED_TYPE, DECODE_FAILED.
   */
  decode(file: Blob, opts?: DecodeOptions, call?: EngineCallOptions): Promise<EngineImage>;
  /**
   * Returns a NEW handle; `img` stays valid. Order: flip (h then v) -> rotate clockwise about the
   * centre (canvas grows, new corners white) -> crop `rect` in the transformed image's pixels.
   */
  crop(img: EngineImage, rect: CropRect, rotationDeg: number, flip: Flip, call?: EngineCallOptions): Promise<EngineImage>;
  /** Signature / thumb cleanup. Returns a NEW handle cropped to ink. */
  cleanup(
    img: EngineImage,
    kind: 'signature' | 'thumb',
    opts: CleanupOptions,
    call?: EngineCallOptions,
  ): Promise<EngineImage>;
  /**
   * Auto-fit to `spec`: resize, encode, KB search, DPI, verify. Throws TOO_DETAILED / TOO_PLAIN,
   * SPEC_INCOMPLETE (maxKB null), UNSUPPORTED_TYPE (format 'pdf'). Never mutates `img`.
   * Aspect mismatch > 1%: signature/thumb/declaration/certificate letterbox (white);
   * photo/other centre cover-crop.
   */
  fit(img: EngineImage, spec: DocSpec, opts?: FitOptions, call?: EngineCallOptions): Promise<FitResult>;
  /** Combine images (and PDFs, rasterised on the main thread) into one PDF under maxKB. */
  imagesToPdf(files: (Blob | EngineImage)[], opts: ImagesToPdfOptions, call?: EngineCallOptions): Promise<Bytes>;
  /** Rasterise PDF pages to handles. Throws PDF_ENCRYPTED, DECODE_FAILED, TOO_LARGE_INPUT. */
  decodePdfPages(file: Blob, opts?: DecodePdfPagesOptions, call?: EngineCallOptions): Promise<EngineImage[]>;
  /** Re-render pages at 150 -> 100 -> 72 DPI. Throws ALREADY_SMALL, PDF_IMPOSSIBLE, PDF_TEXT_ONLY, PDF_ENCRYPTED. */
  compressPdf(file: Blob, maxKB: number, opts?: CompressPdfOptions, call?: EngineCallOptions): Promise<Bytes>;
  /** fflate ZIP; JPEG/PNG/PDF stored. Adds README.txt when given (`{{files}}` placeholder). */
  zip(files: ZipEntry[], readme?: string, call?: EngineCallOptions): Promise<Bytes>;
  /** Start WASM fetch/compile early. Never throws. */
  prewarm(kinds?: PrewarmKind[]): void;
  /** Free a handle's pixels in the worker. Safe to call twice and on stale handles. */
  release(img: EngineImage): void;
  /** Exact Lanczos3 resample to w×h, returns a NEW handle. */
  resize(img: EngineImage, width: number, height: number, call?: EngineCallOptions): Promise<EngineImage>;
  /** Convert to jpg/png/webp. Transparent pixels are flattened onto `background` for jpg. */
  convert(img: EngineImage, format: ConvertFormat, opts?: ConvertOptions, call?: EngineCallOptions): Promise<Bytes>;
  /** Photo sheet at 300 DPI with cut lines. PDF bytes (or JPEG when output: 'jpg'). */
  photoSheet(img: EngineImage, opts: PhotoSheetOptions, call?: EngineCallOptions): Promise<Bytes>;
  /** Small JPEG preview of a handle, for <img src=blob:>. */
  preview(img: EngineImage, opts?: PreviewOptions, call?: EngineCallOptions): Promise<PreviewResult>;
}

/*
 * Notes for callers:
 *  - Batch and multi-file flows call the engine one file at a time; release handles as you go.
 *  - Handwritten-declaration trace sheet: render it on a main-thread <canvas>, then
 *    canvas.toBlob('image/png') -> imagesToPdf([pngBlob], { page: 'a4', maxKB: null }).
 */

// ---------------------------------------------------------------------------
// Small shared helpers (pure)
// ---------------------------------------------------------------------------

/** 1 KB = 1024 bytes. */
export const KB = 1024;

export function bytesToKB(bytes: number): number {
  return bytes / KB;
}

/** KB-only default crop aspects by document type (rule 4 of cropAspect). */
export const KB_ONLY_ASPECT: Partial<Record<DocType, number>> = {
  photo: 3.5 / 4.5,
  signature: 7 / 3,
  thumb: 1,
};

/** Spec-level pixel mode, mirrors chooseDims' `mode` without computing dims. */
export function pixelMode(spec: DocSpec): ChosenDims['mode'] {
  if (spec.widthPx !== null && spec.heightPx !== null) return 'fixed';
  if (
    spec.minWidthPx !== undefined ||
    spec.maxWidthPx !== undefined ||
    spec.minHeightPx !== undefined ||
    spec.maxHeightPx !== undefined
  ) {
    return 'range';
  }
  return 'kb-only';
}

/**
 * Crop-box aspect (w/h) the UI should lock to, or null for a free crop. First match wins:
 *  1. Fixed pixels -> widthPx / heightPx.
 *  2. Explicit `spec.aspect`.
 *  3. Pixel range whose min and max boxes share an aspect, or only a min (or only a max) box.
 *  4. KB-only defaults: photo 3.5:4.5, signature 7:3, thumb 1:1.
 *  5. Otherwise null.
 */
export function cropAspect(spec: DocSpec): number | null {
  if (spec.widthPx !== null && spec.heightPx !== null) return spec.widthPx / spec.heightPx;
  if (spec.aspect !== undefined && spec.aspect > 0) return spec.aspect;
  const { minWidthPx: minW, minHeightPx: minH, maxWidthPx: maxW, maxHeightPx: maxH } = spec;
  if (pixelMode(spec) === 'range') {
    const minA = minW !== undefined && minH !== undefined ? minW / minH : null;
    const maxA = maxW !== undefined && maxH !== undefined ? maxW / maxH : null;
    if (minA !== null && maxA !== null) return Math.abs(minA - maxA) < 1e-6 ? minA : null;
    if (minA !== null && maxW === undefined && maxH === undefined) return minA;
    if (maxA !== null && minW === undefined && minH === undefined) return maxA;
    return null;
  }
  return KB_ONLY_ASPECT[spec.doc] ?? null;
}

/** Docs padded with white on aspect mismatch; the rest are cover-cropped. */
export function letterboxesOnMismatch(doc: DocType): boolean {
  return doc === 'signature' || doc === 'thumb' || doc === 'declaration' || doc === 'certificate';
}
