/**
 * Pure tool logic shared by the T1–T10 islands (Workstream F). No UI, no engine import:
 * engine calls go through a small `FitEngine`-style interface so the mock engine (tests)
 * and the real engine (browser, Node) can both drive it.
 */
import {
  KB,
  isEngineError,
  type DocSpec,
  type DocType,
  type EngineImage,
  type FitCheck,
  type FitOptions,
  type FitResult,
} from '@/engine/types';

// ---------------------------------------------------------------------------
// T1 compress to X KB
// ---------------------------------------------------------------------------

export const KB_PRESETS = [10, 20, 30, 50, 100, 200, 500] as const;
export const MIN_TARGET_KB = 5;
export const MAX_TARGET_KB = 5000;

/** SPEC T1: the output lands in [target − 10%, target]. One decimal. */
export function lowerBoundKB(targetKB: number): number {
  return Math.round(targetKB * 0.9 * 10) / 10;
}

export type KbRangeError = 'targetInvalid' | 'minInvalid' | 'minAboveMax';

/** Validate a user KB target (and optional minimum). Null when fine. */
export function validateKb(targetKB: number, minKB: number | null): KbRangeError | null {
  if (!Number.isFinite(targetKB) || targetKB < MIN_TARGET_KB || targetKB > MAX_TARGET_KB) {
    return 'targetInvalid';
  }
  if (minKB !== null) {
    if (!Number.isFinite(minKB) || minKB < 0) return 'minInvalid';
    if (minKB > targetKB) return 'minAboveMax';
  }
  return null;
}

/**
 * Engine spec for "compress to `targetKB`": KB-only `other` document (aspect follows the
 * image, no default photo size), min = max(user min, target − 10%).
 */
export function compressSpec(
  targetKB: number,
  userMinKB: number | null = null,
  format: 'jpg' | 'png' = 'jpg',
  doc: DocType = 'other',
): DocSpec {
  const floor = lowerBoundKB(targetKB);
  return {
    doc,
    label: { en: 'Image', hi: 'इमेज' },
    widthPx: null,
    heightPx: null,
    minKB: Math.max(userMinKB ?? 0, floor),
    maxKB: targetKB,
    format,
    dpi: null,
    fileName: `image-${kbLabel(targetKB)}kb.${format}`,
    rules: [],
  };
}

/** "20", "22.5" — used in file names and analytics targets. */
export function kbLabel(kb: number): string {
  return String(Math.round(kb * 10) / 10);
}

/** T1 "keep dimensions" vs "allow downscale" (FitOptions). */
export function compressFitOptions(keepDims: boolean): FitOptions {
  return keepDims
    ? { keepSourceDims: true, allowDownscale: false }
    : { keepSourceDims: true, allowDownscale: true };
}

/** The part of the engine the fit helpers need (real engine and mock both satisfy it). */
export interface FitEngine {
  fit(img: EngineImage, spec: DocSpec, opts?: FitOptions): Promise<FitResult>;
  resize(img: EngineImage, w: number, h: number): Promise<EngineImage>;
  release(img: EngineImage): void;
}

export const DOWNSCALE_STEP = 0.6;
export const MIN_LONG_SIDE = 96;

/**
 * Fit, and when downscaling is allowed and the image is too detailed for the target,
 * shrink it by DOWNSCALE_STEP and try again (the engine's own KB-only shrink stops at
 * 50% of the start size). `img` is never released here; intermediate handles are.
 */
export async function fitWithDownscale(
  engine: FitEngine,
  img: EngineImage,
  spec: DocSpec,
  opts: FitOptions,
  maxRetries = 4,
): Promise<{ result: FitResult; scaled: boolean }> {
  let cur = img;
  let scaled = false;
  try {
    for (let attempt = 0; ; attempt++) {
      try {
        const result = await engine.fit(cur, spec, opts);
        return { result, scaled };
      } catch (e) {
        const long = Math.max(cur.width, cur.height);
        const canShrink =
          opts.allowDownscale !== false &&
          attempt < maxRetries &&
          isEngineError(e) &&
          e.code === 'TOO_DETAILED' &&
          long * DOWNSCALE_STEP >= MIN_LONG_SIDE;
        if (!canShrink) throw e;
        const w = Math.max(1, Math.round(cur.width * DOWNSCALE_STEP));
        const h = Math.max(1, Math.round(cur.height * DOWNSCALE_STEP));
        const next = await engine.resize(cur, w, h);
        if (cur !== img) engine.release(cur);
        cur = next;
        scaled = true;
      }
    }
  } finally {
    if (cur !== img) engine.release(cur);
  }
}

// ---------------------------------------------------------------------------
// T2 resize: units, DPI, aspect lock
// ---------------------------------------------------------------------------

export type SizeUnit = 'px' | 'cm' | 'mm' | 'in';
export const SIZE_UNITS: readonly SizeUnit[] = ['px', 'cm', 'mm', 'in'];
export const DEFAULT_DPI = 200;
export const MAX_SIDE_PX = 8000;

const PER_INCH: Record<Exclude<SizeUnit, 'px'>, number> = { cm: 2.54, mm: 25.4, in: 1 };

/** Physical size → pixels at `dpi` (rounded, ≥ 1). */
export function toPx(value: number, unit: SizeUnit, dpi: number): number {
  if (!Number.isFinite(value) || value <= 0) return 0;
  const px = unit === 'px' ? value : (value / PER_INCH[unit]) * dpi;
  return Math.max(1, Math.round(px));
}

/** Pixels → `unit` at `dpi` (2 decimals for physical units). */
export function fromPx(px: number, unit: SizeUnit, dpi: number): number {
  if (unit === 'px') return Math.round(px);
  return Math.round(((px / dpi) * PER_INCH[unit]) * 100) / 100;
}

/** With the aspect locked, the other side follows the one the user typed. */
export function lockedPair(
  changed: 'w' | 'h',
  value: number,
  aspect: number,
  decimals = 2,
): { w: number; h: number } {
  if (!(aspect > 0) || !Number.isFinite(value)) return { w: value, h: value };
  const k = 10 ** decimals;
  const round = (n: number) => Math.max(decimals ? 0 : 1, Math.round(n * k) / k);
  return changed === 'w' ? { w: value, h: round(value / aspect) } : { w: round(value * aspect), h: value };
}

export function validPx(w: number, h: number): boolean {
  return (
    Number.isInteger(w) && Number.isInteger(h) && w >= 1 && h >= 1 && w <= MAX_SIDE_PX && h <= MAX_SIDE_PX
  );
}

/** Fixed-pixel spec for T2/T10 (no KB minimum unless given). */
export function fixedSpec(o: {
  doc?: DocType;
  w: number;
  h: number;
  minKB?: number | null;
  maxKB?: number | null;
  dpi?: number | null;
  format?: 'jpg' | 'png';
  fileName?: string;
}): DocSpec {
  const format = o.format ?? 'jpg';
  return {
    doc: o.doc ?? 'other',
    label: { en: 'Image', hi: 'इमेज' },
    widthPx: o.w,
    heightPx: o.h,
    minKB: o.minKB ?? null,
    maxKB: o.maxKB ?? NO_LIMIT_KB,
    format,
    dpi: o.dpi ?? null,
    fileName: o.fileName ?? `image-${o.w}x${o.h}.${format}`,
    rules: [],
  };
}

/** Stand-in max when the user set no KB limit; the size row is then hidden. */
export const NO_LIMIT_KB = 50 * 1024;

/** Drop the size rows when the user asked for no KB limit. */
export function visibleChecks(checks: readonly FitCheck[], hasKbLimit: boolean): FitCheck[] {
  return hasKbLimit ? [...checks] : checks.filter((c) => c.rule !== 'size' && c.rule !== 'size1000');
}

// ---------------------------------------------------------------------------
// Output checks for tools that do not go through fit() (T3, T6, T7, T8)
// ---------------------------------------------------------------------------

export type SniffedFormat = 'jpg' | 'png' | 'webp' | 'pdf';

export function sniffFormat(b: Uint8Array): SniffedFormat | null {
  if (b.length >= 3 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return 'jpg';
  if (b.length >= 4 && b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47) return 'png';
  if (
    b.length >= 12 &&
    b[0] === 0x52 &&
    b[1] === 0x49 &&
    b[2] === 0x46 &&
    b[3] === 0x46 &&
    b[8] === 0x57 &&
    b[9] === 0x45 &&
    b[10] === 0x42 &&
    b[11] === 0x50
  )
    return 'webp';
  if (b.length >= 4 && b[0] === 0x25 && b[1] === 0x50 && b[2] === 0x44 && b[3] === 0x46) return 'pdf';
  return null;
}

/** "34.2 KB" with 1 KB = 1024 B (same style as the engine's checks). */
export function kbText(bytes: number): string {
  const kb = bytes / KB;
  return `${kb < 100 ? (Math.round(kb * 10) / 10).toString() : Math.round(kb)} KB`;
}

export function rangeText(minKB: number | null, maxKB: number): string {
  return minKB !== null && minKB > 0 ? `${kbLabel(minKB)}–${kbLabel(maxKB)} KB` : `≤ ${kbLabel(maxKB)} KB`;
}

export interface OutputCheckInput {
  bytes: Uint8Array;
  format: SniffedFormat;
  width?: number;
  height?: number;
  /** Required exact pixels, when the user set them. */
  expect?: { w: number; h: number };
  maxKB?: number | null;
  minKB?: number | null;
}

/** K7 rows for a tool output: dims (when known), size (when limited), format. */
export function outputChecks(o: OutputCheckInput): FitCheck[] {
  const rows: FitCheck[] = [];
  if (o.width !== undefined && o.height !== undefined) {
    const pass = !o.expect || (o.expect.w === o.width && o.expect.h === o.height);
    rows.push({
      rule: 'dims',
      pass,
      actual: `${o.width}×${o.height} px`,
      required: o.expect ? `${o.expect.w}×${o.expect.h} px` : 'any',
      level: o.expect ? 'required' : 'info',
    });
  }
  if (o.maxKB !== undefined && o.maxKB !== null) {
    const size = o.bytes.length;
    // KB rule (Q26): hard limits are minKB×1024 and maxKB×1000 bytes.
    const pass = size <= o.maxKB * 1000 && size >= (o.minKB ?? 0) * KB;
    rows.push({
      rule: 'size',
      pass,
      actual: kbText(size),
      required: rangeText(o.minKB ?? null, o.maxKB),
      level: 'required',
    });
  }
  const got = sniffFormat(o.bytes);
  rows.push({
    rule: 'format',
    pass: got === o.format,
    actual: got ? got.toUpperCase() : 'unknown',
    required: o.format.toUpperCase(),
    level: 'required',
  });
  return rows;
}

// ---------------------------------------------------------------------------
// File names (local downloads only; never sent anywhere, never in analytics)
// ---------------------------------------------------------------------------

/** Safe ASCII base name from a user file name, without extension. */
export function baseName(name: string, fallback = 'image'): string {
  const noExt = name.replace(/\.[^./\\]+$/, '');
  const safe = noExt
    .normalize('NFKD')
    .replace(/[^\w-]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 40);
  return safe || fallback;
}

/** Unique names for a ZIP: "a.jpg", "a-2.jpg", ... */
export function uniqueNames(names: readonly string[]): string[] {
  const seen = new Map<string, number>();
  return names.map((n) => {
    const key = n.toLowerCase();
    const count = (seen.get(key) ?? 0) + 1;
    seen.set(key, count);
    if (count === 1) return n;
    const dot = n.lastIndexOf('.');
    return dot > 0 ? `${n.slice(0, dot)}-${count}${n.slice(dot)}` : `${n}-${count}`;
  });
}

export function mimeFor(format: SniffedFormat): string {
  return format === 'jpg'
    ? 'image/jpeg'
    : format === 'png'
      ? 'image/png'
      : format === 'webp'
        ? 'image/webp'
        : 'application/pdf';
}

// ---------------------------------------------------------------------------
// T6 images to PDF: list order
// ---------------------------------------------------------------------------

export const MAX_FILES = 20;

/** Move item `from` to index `to` (clamped). Returns a new array. */
export function moveItem<T>(list: readonly T[], from: number, to: number): T[] {
  const out = [...list];
  if (from < 0 || from >= out.length) return out;
  const dest = Math.max(0, Math.min(out.length - 1, to));
  const [it] = out.splice(from, 1);
  out.splice(dest, 0, it as T);
  return out;
}

/** Append files up to MAX_FILES; reports how many were dropped. */
export function addCapped<T>(list: readonly T[], add: readonly T[], max = MAX_FILES): { list: T[]; dropped: number } {
  const room = Math.max(0, max - list.length);
  return { list: [...list, ...add.slice(0, room)], dropped: Math.max(0, add.length - room) };
}

// ---------------------------------------------------------------------------
// T8 photo sheet capacity (mirrors src/engine/sheet.ts layout; kept here so the
// island doesn't import the engine module, which pulls pdf-lib)
// ---------------------------------------------------------------------------

export const SHEET_COPIES = [4, 8, 12, 16] as const;
export type SheetCopies = (typeof SHEET_COPIES)[number];
const PAPER_MM = { a4: { w: 210, h: 297 }, '4x6': { w: 101.6, h: 152.4 } } as const;
const MARGIN = 5;
const GAP = 3;

export function sheetCapacity(paper: 'a4' | '4x6', wMm = 35, hMm = 45): number {
  const p = PAPER_MM[paper];
  const cap = (pw: number, ph: number) =>
    Math.max(0, Math.floor((pw - 2 * MARGIN + GAP) / (wMm + GAP))) *
    Math.max(0, Math.floor((ph - 2 * MARGIN + GAP) / (hMm + GAP)));
  return Math.max(cap(p.w, p.h), cap(p.h, p.w));
}

// ---------------------------------------------------------------------------
// T9 batch: sequential runner with a stop flag
// ---------------------------------------------------------------------------

export type BatchStatus = 'waiting' | 'working' | 'done' | 'failed' | 'skipped';

export interface BatchItemState<R> {
  status: BatchStatus;
  result?: R;
  error?: unknown;
}

/**
 * Process items one at a time (Q16: no engine cancel). `shouldStop()` is checked before
 * each item; remaining items become 'skipped'. `onUpdate` gets the index and new state.
 */
export async function runBatch<I, R>(
  items: readonly I[],
  work: (item: I, index: number) => Promise<R>,
  hooks: {
    shouldStop: () => boolean;
    onUpdate: (index: number, state: BatchItemState<R>) => void;
  },
): Promise<{ done: number; failed: number; skipped: number }> {
  let done = 0;
  let failed = 0;
  let skipped = 0;
  for (let i = 0; i < items.length; i++) {
    if (hooks.shouldStop()) {
      for (let j = i; j < items.length; j++) hooks.onUpdate(j, { status: 'skipped' });
      skipped = items.length - i;
      break;
    }
    hooks.onUpdate(i, { status: 'working' });
    try {
      const result = await work(items[i] as I, i);
      done++;
      hooks.onUpdate(i, { status: 'done', result });
    } catch (error) {
      failed++;
      hooks.onUpdate(i, { status: 'failed', error });
    }
  }
  return { done, failed, skipped };
}

// ---------------------------------------------------------------------------
// T10 custom preset: shareable query (?w=200&h=230&min=20&max=50&dpi=200&fmt=jpg)
// ---------------------------------------------------------------------------

export interface CustomSettings {
  w: number | null;
  h: number | null;
  minKB: number | null;
  maxKB: number;
  dpi: number | null;
  format: 'jpg' | 'png';
}

export const DEFAULT_CUSTOM: CustomSettings = {
  w: 200,
  h: 230,
  minKB: 20,
  maxKB: 50,
  dpi: 200,
  format: 'jpg',
};

function num(v: string | null, lo: number, hi: number, int = true): number | null {
  if (v === null || v.trim() === '') return null;
  const n = Number(v);
  if (!Number.isFinite(n) || n < lo || n > hi) return null;
  return int ? Math.round(n) : Math.round(n * 10) / 10;
}

/** Parse the query string. Bad or missing values fall back to defaults (never throws). */
export function parseCustomQuery(search: string): CustomSettings {
  const q = new URLSearchParams(search);
  if (![...q.keys()].some((k) => ['w', 'h', 'min', 'max', 'dpi', 'fmt'].includes(k))) {
    return { ...DEFAULT_CUSTOM };
  }
  let w = num(q.get('w'), 1, MAX_SIDE_PX);
  let h = num(q.get('h'), 1, MAX_SIDE_PX);
  if (w === null || h === null) w = h = null; // both or neither (DocSpec rule)
  const maxKB = num(q.get('max'), 1, MAX_TARGET_KB, false) ?? DEFAULT_CUSTOM.maxKB;
  let minKB = num(q.get('min'), 0, MAX_TARGET_KB, false);
  if (minKB !== null && (minKB > maxKB || minKB === 0)) minKB = null;
  const dpi = num(q.get('dpi'), 50, 1200);
  const fmt = q.get('fmt')?.toLowerCase();
  return { w, h, minKB, maxKB, dpi, format: fmt === 'png' ? 'png' : 'jpg' };
}

export function buildCustomQuery(s: CustomSettings): string {
  const q = new URLSearchParams();
  if (s.w !== null && s.h !== null) {
    q.set('w', String(s.w));
    q.set('h', String(s.h));
  }
  if (s.minKB !== null) q.set('min', kbLabel(s.minKB));
  q.set('max', kbLabel(s.maxKB));
  if (s.dpi !== null) q.set('dpi', String(s.dpi));
  q.set('fmt', s.format);
  return `?${q.toString()}`;
}

export function customSpec(s: CustomSettings): DocSpec {
  const fileName = `custom.${s.format}`;
  if (s.w !== null && s.h !== null) {
    return fixedSpec({ w: s.w, h: s.h, minKB: s.minKB, maxKB: s.maxKB, dpi: s.dpi, format: s.format, fileName });
  }
  return { ...compressSpec(s.maxKB, s.minKB, s.format), minKB: s.minKB, dpi: s.dpi, fileName };
}

/** Problems in custom settings, as i18n key suffixes. */
export function customErrors(s: CustomSettings): ('dims' | 'kb' | 'dpi')[] {
  const out: ('dims' | 'kb' | 'dpi')[] = [];
  if ((s.w === null) !== (s.h === null) || (s.w !== null && s.h !== null && !validPx(s.w, s.h))) out.push('dims');
  const kbOk =
    Number.isFinite(s.maxKB) &&
    s.maxKB >= 1 &&
    s.maxKB <= MAX_TARGET_KB &&
    (s.minKB === null || (Number.isFinite(s.minKB) && s.minKB >= 0 && s.minKB <= s.maxKB));
  if (!kbOk) out.push('kb');
  if (s.dpi !== null && (s.dpi < 50 || s.dpi > 1200)) out.push('dpi');
  return out;
}

// ---------------------------------------------------------------------------
// Ink tools (T4/T5/declaration): size option from a preset group or custom
// ---------------------------------------------------------------------------

export interface SizeOption {
  id: string;
  /** Short label, e.g. "140×60 px, 10–20 KB". */
  label: string;
  /** Exams using it, e.g. "IBPS PO, SBI Clerk +6". */
  exams: string;
  spec: DocSpec;
}

/** Analytics target for an ink/size tool: "140x60:10-20" (no user data). */
export function specTarget(spec: DocSpec): string {
  const dims = spec.widthPx !== null ? `${spec.widthPx}x${spec.heightPx}` : 'any';
  return `${dims}:${spec.minKB ?? 0}-${spec.maxKB ?? 0}`;
}

export interface CustomInk {
  w: number | null;
  h: number | null;
  minKB: number | null;
  maxKB: number | null;
  dpi: number | null;
}

/** Spec for an ink tool's custom size: fixed px when both sides are set, else KB-only. */
export function inkSpec(doc: 'signature' | 'thumb' | 'declaration', c: CustomInk): DocSpec | null {
  if (c.maxKB === null || validateKb(c.maxKB, c.minKB)) return null;
  const fileName = doc === 'signature' ? 'sign.jpg' : doc === 'thumb' ? 'thumb.jpg' : 'decl.jpg';
  const cleanup = doc === 'declaration' ? null : doc;
  if (c.w !== null && c.h !== null) {
    if (!validPx(c.w, c.h)) return null;
    return { ...fixedSpec({ doc, w: c.w, h: c.h, minKB: c.minKB, maxKB: c.maxKB, dpi: c.dpi, fileName }), cleanup };
  }
  if ((c.w === null) !== (c.h === null)) return null;
  return { ...compressSpec(c.maxKB, null, 'jpg', doc), minKB: c.minKB, dpi: c.dpi, fileName, cleanup };
}

/** Width/height from a baseline or progressive JPEG's SOF marker (null when not found). */
export function jpegSize(b: Uint8Array): { w: number; h: number } | null {
  if (sniffFormat(b) !== 'jpg') return null;
  let i = 2;
  while (i + 9 < b.length) {
    if (b[i] !== 0xff) {
      i++;
      continue;
    }
    const m = b[i + 1]!;
    if (m === 0xd8 || m === 0x01 || (m >= 0xd0 && m <= 0xd7)) {
      i += 2;
      continue;
    }
    const len = (b[i + 2]! << 8) | b[i + 3]!;
    if (m >= 0xc0 && m <= 0xcf && m !== 0xc4 && m !== 0xc8 && m !== 0xcc) {
      return { h: (b[i + 5]! << 8) | b[i + 6]!, w: (b[i + 7]! << 8) | b[i + 8]! };
    }
    i += 2 + len;
  }
  return null;
}

/** Common print sizes for T8 (mm). */
export const PHOTO_SIZES = [
  { id: 'in', wMm: 35, hMm: 45 },
  { id: 'us', wMm: 51, hMm: 51 },
  { id: 'stamp', wMm: 25, hMm: 30 },
] as const;
