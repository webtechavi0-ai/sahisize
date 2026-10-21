/**
 * ★ Frozen contract (Phase 1). Engine types shared by the engine (A), UI (B),
 * site (C), presets (D) and tools (F).
 *
 * Matches SPEC 7.8 names and shapes, with the deviations recorded in
 * QUESTIONS.md:
 *  - Q5: images cross the worker boundary as opaque `EngineImage` handles
 *    (id + dims) instead of `ImageBitmap`. Pixels stay in the worker.
 *  - Q4: `DocSpec.physical` / `pxDerived` (cm/mm/in source size, px derived at
 *    authoring time). The engine never converts cm; it only uses `physical`
 *    to decide the default DPI to write (SPEC 7.5).
 *  - Additive, optional fields only (FitResult.durationMs/warnings/dims/format,
 *    FitCheck.level/id, extra stages 'shrink' | 'grow' | 'strip').
 *
 * Changing anything here needs orchestrator approval and a QUESTIONS.md note.
 */

// ---------------------------------------------------------------------------
// Shared primitives
// ---------------------------------------------------------------------------

/**
 * Byte arrays crossing the API are ArrayBuffer-backed (never SharedArrayBuffer),
 * so `new Blob([bytes])` type-checks under TS 5.7+ lib typings.
 */
export type Bytes = Uint8Array<ArrayBuffer>;

/** SPEC 7.8 */
export type DocType = 'photo' | 'signature' | 'thumb' | 'declaration' | 'certificate' | 'other';

export const DOC_TYPES: readonly DocType[] = [
  'photo',
  'signature',
  'thumb',
  'declaration',
  'certificate',
  'other',
] as const;

/** Bilingual string. `hi` may be Hinglish where natural (SPEC 3.1). */
export interface LocalizedText {
  en: string;
  hi: string;
}

/** Output encodings a preset may require. `pdf` only for `doc: 'certificate'`. */
export type OutputFormat = 'jpg' | 'png' | 'pdf';

/** Physical size from a notice (QUESTIONS Q4). */
export interface PhysicalSize {
  width: number;
  height: number;
  unit: 'cm' | 'mm' | 'in';
}

// ---------------------------------------------------------------------------
// DocSpec (SPEC 7.8 + Q4)
// ---------------------------------------------------------------------------

/**
 * One document an exam needs, as the engine consumes it.
 *
 * Pixel modes (PLAN 3.4, decided by `chooseDims` in src/engine/dims.ts):
 *  - Fixed:  widthPx and heightPx both set -> exact output size.
 *  - Range:  widthPx/heightPx null and any min/max*Px set -> aspect follows the crop.
 *  - KB-only: widthPx/heightPx null and no ranges -> defaults per doc type.
 * `widthPx` and `heightPx` are either both null or both numbers.
 *
 * KB values use 1 KB = 1024 bytes (SPEC 7.3). `minKB: null` means no minimum.
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
  maxKB: number;
  format: OutputFormat;
  /** DPI to write in the JFIF header. null = 200 if `physical` is set, else encoder default (SPEC 7.5). */
  dpi: number | null;
  /** Output file name incl. extension, e.g. "photo.jpg" (SPEC K8). Unique within an exam. */
  fileName: string;
  maxFileNameChars?: number;
  /** Human rules: background, ink colour, etc. */
  rules: LocalizedText[];
  /** Render name + date strip inside the final pixels (SPEC K11). */
  needsNameDateStrip?: boolean;
  /** Cleanup kind on by default for this document (SPEC K6). */
  cleanup?: 'signature' | 'thumb' | null;
  /** Q4: size as printed in the notice. widthPx/heightPx were derived from it at authoring time. */
  physical?: PhysicalSize;
  /** Q4: true when widthPx/heightPx were computed from `physical` and `dpi` (default 200). */
  pxDerived?: boolean;
}

// ---------------------------------------------------------------------------
// Images and geometry
// ---------------------------------------------------------------------------

/**
 * Opaque handle to a decoded image that lives inside the engine worker (Q5).
 * Width/height are after EXIF orientation and the 4000 px long-side cap.
 * Call `release(img)` when done; handles are invalid after release.
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

/**
 * Crop rectangle in pixels of the *transformed* image (see `crop()` below).
 * Values may be fractional; the engine rounds to whole pixels.
 */
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
  /** Ink colour to keep. 'blue' only makes sense for thumbs (SPEC 7.4). */
  ink: 'black' | 'blue';
}

export interface NameDate {
  name: string;
  /** Display string exactly as it should be printed, e.g. "21/10/2026". */
  date: string;
}

// ---------------------------------------------------------------------------
// Fit result
// ---------------------------------------------------------------------------

/**
 * Stages that ran during auto-fit (SPEC 7.3, analytics `fit_done.stages`).
 * SPEC 7.8 stages plus 'shrink' / 'grow' (pixel-range stepping, PLAN 3.4)
 * and 'strip' (name/date strip composed, K11).
 */
export type FitStage =
  'encode' | 'search' | 'blur' | 'grain' | 'pad' | 'dpi' | 'shrink' | 'grow' | 'strip';

/** Stable ids for pass-check rows (SPEC K7). UI maps these to i18n labels. */
export type FitCheckRule =
  | 'dims' // Width x Height
  | 'size' // File size, 1 KB = 1024 B
  | 'size1000' // File size under 1 KB = 1000 B (warning only)
  | 'format' // magic bytes
  | 'baseline' // JPEG SOF0, not progressive
  | 'dpi' // JFIF density
  | 'background'; // white-ratio heuristic; 'info' when not checkable

export interface FitCheck {
  /** One of FitCheckRule (typed `string` in SPEC 7.8). */
  rule: FitCheckRule;
  pass: boolean;
  /** Language-neutral display value, e.g. "200×230 px", "34.2 KB", "JPG", "200 DPI". */
  actual: string;
  /** e.g. "200×230 px", "20–50 KB", "any (KB-only)". */
  required: string;
  /**
   * 'required': a failing row disables download (K7).
   * 'warning': shown, does not block (e.g. size1000).
   * 'info': not checkable / not applicable (e.g. background "n/a").
   * Default when absent: 'required'.
   */
  level?: 'required' | 'warning' | 'info';
}

/** Output of `chooseDims` (PLAN 3.4), echoed in FitResult for display. */
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

/** SPEC 7.8 + optional additive fields. */
export interface FitResult {
  bytes: Bytes;
  widthPx: number;
  heightPx: number;
  sizeBytes: number;
  /** Final encoder quality (1-100). 0 for PNG. */
  quality: number;
  stages: FitStage[];
  checks: FitCheck[];
  /** Encoded format of `bytes`. */
  format?: 'jpg' | 'png';
  /** Wall time of the fit call inside the worker. */
  durationMs?: number;
  /** Non-blocking notes, e.g. 'PADDED' or 'PASSES_ONLY_1024'. */
  warnings?: FitWarning[];
  dims?: ChosenDims;
}

export type FitWarning =
  | 'PADDED' // COM padding used (R5: shown as "padding used" note)
  | 'GRAIN' // invisible grain added
  | 'BLURRED' // mild blur applied to reach max KB
  | 'PASSES_ONLY_1024' // within range only under 1 KB = 1024 B
  | 'PASSES_ONLY_1000' // within range only under 1 KB = 1000 B
  | 'DOWNSCALED'; // KB-only output shrunk to fit max KB

// ---------------------------------------------------------------------------
// Errors
// ---------------------------------------------------------------------------

/** Closed union (PLAN 3.7). The UI maps each to an i18n message with numbers. */
export type EngineErrorCode =
  | 'TOO_DETAILED' // cannot get under max KB even at q=5 + blur
  | 'TOO_PLAIN' // cannot get over min KB even after grain + pad (should not happen)
  | 'DECODE_FAILED'
  | 'TOO_LARGE_INPUT' // > MAX_UPLOAD_BYTES
  | 'UNSUPPORTED_TYPE'
  | 'PDF_IMPOSSIBLE' // PDF cannot reach max KB
  | 'ALREADY_SMALL' // compressPdf: input already under max KB
  | 'WASM_UNSUPPORTED' // WebAssembly blocked/unavailable (old Chrome CSP, Q10)
  | 'NOT_IMPLEMENTED'; // Phase 1 stub only

/** Alias used in PLAN 3.5/3.7. */
export type FitErrorCode = EngineErrorCode;

/** Numbers for the error message, e.g. { minKBReached: 61, maxKB: 50 }. */
export type EngineErrorDetails = Record<string, number | string>;

/**
 * Error thrown by every engine call. Survives the worker boundary
 * (src/engine/errors.ts installs a comlink transfer handler).
 */
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

/** Alias used in PLAN 3.5. */
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
  /** Long-side cap applied immediately after decode. Default 4000 (SPEC 7.1). */
  maxSide?: number;
}

export interface FitOptions {
  /** K11 strip. Ignored unless the spec has needsNameDateStrip or the tool asks for it. */
  nameDate?: NameDate;
  /** KB-only specs: keep the input pixel size instead of the doc default (T1 "keep dimensions"). */
  keepSourceDims?: boolean;
  /** KB-only specs: allow shrinking to reach max KB (T1 "allow downscale"). Default true. */
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
}

export interface PhotoSheetOptions {
  copies: 4 | 8 | 12 | 16;
  paper: 'a4' | '4x6';
  /** Default 'pdf'. */
  output?: 'pdf' | 'jpg';
}

export type ConvertFormat = 'jpg' | 'png' | 'webp';

export type PrewarmKind = 'jpeg' | 'resize' | 'png' | 'webp';

/** Called with (done, total). Pass through Comlink.proxy is handled inside api.ts. */
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

// ---------------------------------------------------------------------------
// Engine API (implemented by src/engine/api.ts and src/engine/mock.ts)
// ---------------------------------------------------------------------------

/**
 * The full engine surface the UI may call. SPEC 7.8 functions first,
 * then PLAN 3.7 additive functions. All byte arrays are transferred, not copied.
 */
export interface EngineApi {
  /**
   * Decode JPG/PNG/WebP/HEIC (PDF is NOT decoded here; pass PDFs to imagesToPdf/compressPdf).
   * Applies EXIF orientation and the long-side cap.
   * Throws TOO_LARGE_INPUT, UNSUPPORTED_TYPE, DECODE_FAILED.
   */
  decode(file: Blob, opts?: DecodeOptions): Promise<EngineImage>;

  /**
   * Returns a NEW handle; `img` stays valid.
   * Order of operations: flip (h then v) -> rotate `rotationDeg` clockwise about the
   * centre (any angle; canvas grows to the rotated bounding box, new corners are
   * white) -> crop `rect`, which is expressed in that transformed image's pixels.
   */
  crop(img: EngineImage, rect: CropRect, rotationDeg: number, flip: Flip): Promise<EngineImage>;

  /** SPEC 7.4 cleanup. Returns a NEW handle cropped to ink. */
  cleanup(
    img: EngineImage,
    kind: 'signature' | 'thumb',
    opts: CleanupOptions,
  ): Promise<EngineImage>;

  /**
   * SPEC 7.3 auto-fit to `spec` (resize to chosen dims, encode, KB search, DPI, verify).
   * Throws TOO_DETAILED / TOO_PLAIN with details. Never mutates `img`.
   * `spec.format === 'pdf'` is not valid here (use imagesToPdf).
   */
  fit(img: EngineImage, spec: DocSpec, opts?: FitOptions): Promise<FitResult>;

  /**
   * Combine images (and PDFs, rasterised on the main thread) into one PDF under maxKB.
   * Throws PDF_IMPOSSIBLE.
   */
  imagesToPdf(files: (Blob | EngineImage)[], opts: ImagesToPdfOptions): Promise<Bytes>;

  /** Re-render pages at 150 -> 100 -> 72 DPI. Throws ALREADY_SMALL, PDF_IMPOSSIBLE. */
  compressPdf(file: Blob, maxKB: number, opts?: CompressPdfOptions): Promise<Bytes>;

  /** fflate ZIP; JPEG/PDF stored with level 0. Adds README.txt when given. */
  zip(files: ZipEntry[], readme?: string): Promise<Bytes>;

  // ---- additive (PLAN 3.7) ----

  /** Start WASM fetch/compile early (Uploader pointerenter/focus). Never throws. */
  prewarm(kinds?: PrewarmKind[]): void;

  /** Free a handle's pixels in the worker. Safe to call twice. */
  release(img: EngineImage): void;

  /** T3 convert to jpg/png/webp. `quality` 1-100 for lossy formats (default 90). */
  convert(img: EngineImage, format: ConvertFormat, quality?: number): Promise<Bytes>;

  /** T8 sheet at 300 DPI with cut lines. Returns PDF bytes (or JPEG when output: 'jpg'). */
  photoSheet(img: EngineImage, opts: PhotoSheetOptions): Promise<Bytes>;

  /** Small encoded preview of a handle (e.g. after cleanup), for <img src=blob:>. */
  preview(img: EngineImage, opts?: PreviewOptions): Promise<PreviewResult>;
}

// ---------------------------------------------------------------------------
// Small shared helpers (pure, no imports)
// ---------------------------------------------------------------------------

/** 1 KB = 1024 bytes (SPEC 7.3). */
export const KB = 1024;

export function bytesToKB(bytes: number): number {
  return bytes / KB;
}

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
