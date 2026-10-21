/**
 * In-memory fake engine with canned results. Same exports as src/engine/api.ts so
 * tests can do `vi.mock('@/engine/api', () => import('@/engine/mock'))`.
 * Created in Phase 1; Workstream B owns it from Phase 2.
 *
 * Behaviour:
 *  - decode(): reads dims from PNG/JPEG headers when it can, else 1200×1600.
 *    Throws UNSUPPORTED_TYPE for non-images and TOO_LARGE_INPUT over 25 MB.
 *  - fit(): returns a passing FitResult at the chosen dims with sizeBytes at the
 *    middle of the KB window. `bytes` is a real (16×16) baseline JPEG padded with
 *    COM segments to exactly `sizeBytes`, so blob previews and magic-byte checks work.
 *  - configureMock({ failFit, latencyMs }) to simulate errors and slowness.
 */
import {
  EngineError,
  KB,
  pixelMode,
  cropAspect,
  letterboxesOnMismatch,
  type ChosenDims,
  type CleanupOptions,
  type CompressPdfOptions,
  type ConvertFormat,
  type ConvertOptions,
  type DecodePdfPagesOptions,
  type FitWarning,
  type CropRect,
  type DecodeOptions,
  type DocSpec,
  type DocType,
  type EngineApi,
  type EngineErrorCode,
  type EngineImage,
  type FitCheck,
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

export type * from './types';
export { EngineError, isEngineError } from './types';

// 16×16 baseline JPEG (FFD8 FFE0 JFIF ...), generated with @jsquash/jpeg.
const TINY_JPEG_B64 =
  '/9j/4AAQSkZJRgABAQAAAQABAAD/2wCEAAgICAgJCAkKCgkNDgwODRMREBARExwUFhQWFBwrGx8bGx8bKyYuJSMlLiZENS8vNUROQj5CTl9VVV93cXecnNEBCAgICAkICQoKCQ0ODA4NExEQEBETHBQWFBYUHCsbHxsbHxsrJi4lIyUuJkQ1Ly81RE5CPkJOX1VVX3dxd5yc0f/AABEIABAAEAMBIgACEQEDEQH/xABVAAEBAAAAAAAAAAAAAAAAAAAABxAAAQMEAwAAAAAAAAAAAAAAAgMREgAEBhQFFlIBAQAAAAAAAAAAAAAAAAAAAAARAQAAAAAAAAAAAAAAAAAAAAD/2gAMAwEAAhEDEQA/AKVlWRdd49K81Nia4pQnBnEid2LzTFci7Fx6t5qa8FyShObsIk7sPqmVY72Lj0rPb14LirOE3YSFmcfVMVx3rvHq2e3sTXJWcIM4iLM5eaD/2Q==';

function b64ToBytes(b64: string): Bytes {
  if (typeof atob === 'function') {
    const s = atob(b64);
    const out = new Uint8Array(s.length);
    for (let i = 0; i < s.length; i++) out[i] = s.charCodeAt(i);
    return out;
  }
  return Uint8Array.from(Buffer.from(b64, 'base64'));
}

export const TINY_JPEG: Bytes = b64ToBytes(TINY_JPEG_B64);

/** Pad a JFIF JPEG to `target` bytes (exact when target - length >= 4) with COM segments after APP0. */
export function padJpegTo(jpeg: Bytes, target: number): Bytes {
  if (target <= jpeg.length) return jpeg;
  const app0End = 4 + ((jpeg[4]! << 8) | jpeg[5]!); // SOI(2) + APP0 marker(2) + length
  let need = Math.max(4, target - jpeg.length);
  const segs: Bytes[] = [];
  while (need > 0) {
    let take = Math.min(need, 65537); // 2-byte marker + max length field 65535
    if (need - take > 0 && need - take < 4) take -= 4;
    segs.push(comSeg(take));
    need -= take;
  }
  const padLen = segs.reduce((n, x) => n + x.length, 0);
  const out = new Uint8Array(jpeg.length + padLen);
  out.set(jpeg.subarray(0, app0End), 0);
  let o = app0End;
  for (const seg of segs) {
    out.set(seg, o);
    o += seg.length;
  }
  out.set(jpeg.subarray(app0End), o);
  return out;
}

function comSeg(totalLen: number): Bytes {
  const s = new Uint8Array(totalLen).fill(0x20);
  const len = totalLen - 2;
  s[0] = 0xff;
  s[1] = 0xfe;
  s[2] = (len >> 8) & 0xff;
  s[3] = len & 0xff;
  return s;
}

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

export interface MockConfig {
  /** Artificial delay per call (ms). Default 0. */
  latencyMs: number;
  /** Make fit() throw this code for these doc types. */
  failFit: Partial<Record<DocType, EngineErrorCode>>;
  /** Override sizeBytes per doc type (e.g. to render a failing KB check). */
  sizeOverride: Partial<Record<DocType, number>>;
}

const defaults: MockConfig = { latencyMs: 0, failFit: {}, sizeOverride: {} };
let config: MockConfig = { ...defaults };

export function configureMock(patch: Partial<MockConfig>): void {
  config = { ...config, ...patch };
}

export function resetMock(): void {
  config = { ...defaults, failFit: {}, sizeOverride: {} };
  handles.clear();
  nextId = 1;
}

const delay = () =>
  config.latencyMs > 0 ? new Promise((r) => setTimeout(r, config.latencyMs)) : Promise.resolve();

// ---------------------------------------------------------------------------
// Handles
// ---------------------------------------------------------------------------

const handles = new Map<string, EngineImage>();
let nextId = 1;

function newHandle(width: number, height: number): EngineImage {
  const img: EngineImage = {
    id: `mock-${nextId++}`,
    width: Math.max(1, Math.round(width)),
    height: Math.max(1, Math.round(height)),
  };
  handles.set(img.id, img);
  return img;
}

function assertHandle(img: EngineImage): void {
  if (!handles.has(img.id))
    throw new EngineError('DECODE_FAILED', `unknown or released handle ${img.id}`);
}

async function sniffDims(file: Blob): Promise<{ w: number; h: number } | null> {
  try {
    const head = new Uint8Array(await file.slice(0, 64 * 1024).arrayBuffer());
    // PNG IHDR
    if (head[0] === 0x89 && head[1] === 0x50 && head.length >= 24) {
      const dv = new DataView(head.buffer, head.byteOffset);
      return { w: dv.getUint32(16), h: dv.getUint32(20) };
    }
    // JPEG SOFn
    if (head[0] === 0xff && head[1] === 0xd8) {
      let i = 2;
      while (i + 9 < head.length) {
        if (head[i] !== 0xff) return null;
        const m = head[i + 1]!;
        const len = (head[i + 2]! << 8) | head[i + 3]!;
        if (m >= 0xc0 && m <= 0xcf && m !== 0xc4 && m !== 0xc8 && m !== 0xcc) {
          return { h: (head[i + 5]! << 8) | head[i + 6]!, w: (head[i + 7]! << 8) | head[i + 8]! };
        }
        i += 2 + len;
      }
    }
  } catch {
    /* ignore */
  }
  return null;
}

// ---------------------------------------------------------------------------
// Canned results
// ---------------------------------------------------------------------------

const KB_ONLY_LONG_SIDE: Record<DocType, number> = {
  photo: 531,
  signature: 600,
  thumb: 400,
  declaration: 1200,
  certificate: 1600,
  other: 1600,
};

/** Simplified chooseDims for the mock (the real one is src/engine/dims.ts). Follows cropAspect(). */
export function mockDims(spec: DocSpec, src: { width: number; height: number }): ChosenDims {
  const mode = pixelMode(spec);
  const aspect = cropAspect(spec) ?? src.width / src.height;
  if (mode === 'fixed') {
    const w = spec.widthPx!;
    const h = spec.heightPx!;
    return {
      w,
      h,
      mode,
      flex: { canShrink: false, canGrow: false, minW: w, minH: h, maxW: w, maxH: h },
    };
  }
  if (mode === 'range') {
    const minW = spec.minWidthPx ?? 1;
    const minH = spec.minHeightPx ?? 1;
    let w: number;
    let h: number;
    if (spec.maxWidthPx !== undefined && spec.maxHeightPx !== undefined) {
      w = spec.maxWidthPx;
      h = spec.maxHeightPx;
    } else {
      // only a minimum: min × 2.5, long side capped at 600 (PLAN 3.4)
      const s = Math.min(2.5, 600 / Math.max(minW, minH));
      w = Math.round(minW * s);
      h = Math.round(minH * s);
    }
    return {
      w,
      h,
      mode,
      flex: {
        canShrink: true,
        canGrow: true,
        minW,
        minH,
        maxW: spec.maxWidthPx ?? w,
        maxH: spec.maxHeightPx ?? h,
      },
    };
  }
  if (spec.doc === 'photo') {
    return {
      w: 413,
      h: 531,
      mode,
      flex: { canShrink: true, canGrow: false, minW: 207, minH: 266, maxW: 413, maxH: 531 },
    };
  }
  const long = Math.min(Math.max(src.width, src.height), KB_ONLY_LONG_SIDE[spec.doc]);
  const w = Math.max(1, Math.round(aspect >= 1 ? long : long * aspect));
  const h = Math.max(1, Math.round(aspect >= 1 ? long / aspect : long));
  return {
    w,
    h,
    mode,
    flex: {
      canShrink: true,
      canGrow: false,
      minW: Math.round(w / 2),
      minH: Math.round(h / 2),
      maxW: w,
      maxH: h,
    },
  };
}

function fmtKB(bytes: number, unit = KB): string {
  return `${(bytes / unit).toFixed(1)} KB`;
}

/** Build a passing FitResult for `spec` (exported for B/F tests and stories). */
export function mockFitResult(
  spec: DocSpec,
  src: { width: number; height: number } = { width: 1200, height: 1600 },
  overrides: Partial<FitResult> = {},
): FitResult {
  if (spec.maxKB === null) {
    throw new EngineError('SPEC_INCOMPLETE', `${spec.fileName}: size not verified yet`);
  }
  const maxKB = spec.maxKB;
  const dims = mockDims(spec, src);
  const lo = (spec.minKB ?? 0) * KB;
  const hi = maxKB * KB;
  const target = config.sizeOverride[spec.doc] ?? Math.round((lo + Math.min(hi, maxKB * 1000)) / 2);
  const warnings: FitWarning[] = [];
  if (Math.abs(src.width / src.height - dims.w / dims.h) / (dims.w / dims.h) > 0.01) {
    warnings.push(letterboxesOnMismatch(spec.doc) ? 'LETTERBOXED' : 'COVER_CROPPED');
  }
  const bytes = padJpegTo(TINY_JPEG, Math.max(target, TINY_JPEG.length));
  const sizeBytes = bytes.length;
  const inRange = sizeBytes >= lo && sizeBytes <= hi;
  const isPng = spec.format === 'png';
  const range = spec.minKB !== null ? `${spec.minKB}–${maxKB} KB` : `≤ ${maxKB} KB`;
  const dpi = spec.dpi ?? (spec.physical ? 200 : null);
  const checks: FitCheck[] = [
    {
      rule: 'dims',
      pass: true,
      actual: `${dims.w}×${dims.h} px`,
      required:
        dims.mode === 'fixed'
          ? `${dims.w}×${dims.h} px`
          : dims.mode === 'range'
            ? `${dims.flex.minW}–${dims.flex.maxW} × ${dims.flex.minH}–${dims.flex.maxH} px`
            : 'any (KB-only)',
      level: 'required',
    },
    { rule: 'size', pass: inRange, actual: fmtKB(sizeBytes), required: range, level: 'required' },
    {
      rule: 'size1000',
      pass: sizeBytes >= (spec.minKB ?? 0) * 1000 && sizeBytes <= maxKB * 1000,
      actual: fmtKB(sizeBytes, 1000),
      required: range,
      level: 'warning',
    },
    {
      rule: 'format',
      pass: true,
      actual: isPng ? 'PNG' : 'JPG',
      required: isPng ? 'PNG' : 'JPG',
      level: 'required',
    },
  ];
  if (!isPng)
    checks.push({
      rule: 'baseline',
      pass: true,
      actual: 'Baseline',
      required: 'Baseline',
      level: 'required',
    });
  if (dpi !== null)
    checks.push({
      rule: 'dpi',
      pass: true,
      actual: `${dpi} DPI`,
      required: `${dpi} DPI`,
      level: 'required',
    });
  checks.push({
    rule: 'background',
    pass: true,
    actual:
      spec.doc === 'photo' || spec.doc === 'signature' || spec.doc === 'thumb' ? 'White' : 'n/a',
    required:
      spec.doc === 'photo' || spec.doc === 'signature' || spec.doc === 'thumb' ? 'White' : 'n/a',
    level:
      spec.doc === 'photo' || spec.doc === 'signature' || spec.doc === 'thumb' ? 'warning' : 'info',
  });
  return {
    bytes,
    widthPx: dims.w,
    heightPx: dims.h,
    sizeBytes,
    quality: isPng ? 0 : 82,
    stages: dpi !== null ? ['encode', 'search', 'dpi'] : ['encode', 'search'],
    checks,
    format: isPng ? 'png' : 'jpg',
    durationMs: 120,
    warnings,
    dims,
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// EngineApi implementation (same names as api.ts)
// ---------------------------------------------------------------------------

const IMAGE_TYPES = /^image\/(jpeg|png|webp|heic|heif)$/;

export function isEngineSupported(): boolean {
  return true;
}

export function terminateEngine(): void {
  handles.clear();
}

export async function decode(file: Blob, _opts?: DecodeOptions): Promise<EngineImage> {
  await delay();
  if (file.size > 25 * 1024 * 1024) {
    throw new EngineError('TOO_LARGE_INPUT', 'file too large', {
      sizeMB: +(file.size / 1048576).toFixed(1),
      maxMB: 25,
    });
  }
  if (file.type && !IMAGE_TYPES.test(file.type)) {
    throw new EngineError('UNSUPPORTED_TYPE', `unsupported type ${file.type}`, { type: file.type });
  }
  const d = (await sniffDims(file)) ?? { w: 1200, h: 1600 };
  const cap = _opts?.maxSide ?? 4000;
  const s = Math.min(1, cap / Math.max(d.w, d.h));
  return newHandle(d.w * s, d.h * s);
}

export async function crop(
  img: EngineImage,
  rect: CropRect,
  _rotationDeg: number,
  _flip: Flip,
): Promise<EngineImage> {
  await delay();
  assertHandle(img);
  return newHandle(rect.w, rect.h);
}

export async function cleanup(
  img: EngineImage,
  _kind: 'signature' | 'thumb',
  _opts: CleanupOptions,
): Promise<EngineImage> {
  await delay();
  assertHandle(img);
  // ink box ~80% of the input, then white-padded to targetAspect (Q14)
  let w = img.width * 0.8;
  let h = img.height * 0.8;
  if (_opts.targetAspect && _opts.targetAspect > 0) {
    if (w / h < _opts.targetAspect) w = h * _opts.targetAspect;
    else h = w / _opts.targetAspect;
  }
  return newHandle(w, h);
}

export async function fit(img: EngineImage, spec: DocSpec, _opts?: FitOptions): Promise<FitResult> {
  await delay();
  assertHandle(img);
  if (spec.maxKB === null) {
    throw new EngineError('SPEC_INCOMPLETE', `${spec.fileName}: size not verified yet`);
  }
  const code = config.failFit[spec.doc];
  if (code)
    throw new EngineError(code, `mock failure for ${spec.doc}`, {
      maxKB: spec.maxKB,
      minKB: spec.minKB ?? 0,
    });
  return mockFitResult(spec, img);
}

const TINY_PDF = new TextEncoder().encode(
  '%PDF-1.4\n1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj\n2 0 obj<</Type/Pages/Kids[3 0 R]/Count 1>>endobj\n3 0 obj<</Type/Page/Parent 2 0 R/MediaBox[0 0 595 842]>>endobj\ntrailer<</Root 1 0 R>>\n%%EOF\n',
);

export async function imagesToPdf(
  files: (Blob | EngineImage)[],
  opts: ImagesToPdfOptions,
): Promise<Bytes> {
  for (let i = 0; i < files.length; i++) {
    await delay();
    opts.onProgress?.(i + 1, files.length);
  }
  return TINY_PDF.slice();
}

export async function decodePdfPages(
  file: Blob,
  opts?: DecodePdfPagesOptions,
): Promise<EngineImage[]> {
  await delay();
  if (file.type && file.type !== 'application/pdf') {
    throw new EngineError('UNSUPPORTED_TYPE', `unsupported type ${file.type}`, { type: file.type });
  }
  const head = new TextDecoder().decode(await file.slice(0, 1024).arrayBuffer());
  if (head.includes('/Encrypt')) throw new EngineError('PDF_ENCRYPTED', 'password-protected PDF');
  const dpi = opts?.dpi ?? 150;
  const count = opts?.pages?.length ?? 1;
  // A4 at `dpi`
  return Array.from({ length: count }, () => newHandle((210 / 25.4) * dpi, (297 / 25.4) * dpi));
}

export async function compressPdf(
  file: Blob,
  maxKB: number,
  _opts?: CompressPdfOptions,
): Promise<Bytes> {
  await delay();
  if (file.size <= maxKB * KB)
    throw new EngineError('ALREADY_SMALL', 'already small', {
      sizeKB: Math.round(file.size / KB),
      maxKB,
    });
  return TINY_PDF.slice();
}

export async function zip(files: ZipEntry[], readme?: string): Promise<Bytes> {
  await delay();
  // Not a real ZIP: "PK" magic + concatenated names; enough for download plumbing tests.
  const names = files.map((f) => f.name).join('\n') + (readme ? '\nREADME.txt' : '');
  const body = new TextEncoder().encode(names);
  const out = new Uint8Array(4 + body.length);
  out.set([0x50, 0x4b, 0x03, 0x04]);
  out.set(body, 4);
  return out;
}

export function prewarm(_kinds?: PrewarmKind[]): void {}

export function release(img: EngineImage): void {
  handles.delete(img.id);
}

export async function resize(
  img: EngineImage,
  width: number,
  height: number,
): Promise<EngineImage> {
  await delay();
  assertHandle(img);
  return newHandle(width, height);
}

export async function convert(
  img: EngineImage,
  _format: ConvertFormat,
  _opts?: ConvertOptions,
): Promise<Bytes> {
  await delay();
  assertHandle(img);
  return TINY_JPEG.slice();
}

export async function photoSheet(img: EngineImage, _opts: PhotoSheetOptions): Promise<Bytes> {
  await delay();
  assertHandle(img);
  return TINY_PDF.slice();
}

export async function preview(img: EngineImage, _opts?: PreviewOptions): Promise<PreviewResult> {
  await delay();
  assertHandle(img);
  return { bytes: TINY_JPEG.slice(), mime: 'image/jpeg', width: 16, height: 16 };
}

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
