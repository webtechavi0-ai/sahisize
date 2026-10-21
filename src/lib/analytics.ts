/**
 * ★ Frozen contract (Phase 1). Typed, privacy-safe analytics (SPEC 11.1).
 *
 * - Events only. NEVER images, file names, or user-typed names. Props are
 *   restricted to enums, numbers, booleans and slugs by the types below.
 * - No-op until a sender is configured with `configureAnalytics()` (Workstream C
 *   wires the provider from src/config/analytics.ts; default provider 'none').
 * - Arrays are flattened to comma-joined strings before sending, because
 *   Plausible/Umami props must be scalar.
 */
import type { DocType, EngineErrorCode, FitStage } from '@/engine/types';

/** Input size bucket; never the exact size. */
export type KbBucket =
  '<20' | '20-50' | '50-100' | '100-200' | '200-500' | '500-1000' | '1-5MB' | '5-10MB' | '>10MB';

export type InputFormat = 'jpg' | 'png' | 'webp' | 'heic' | 'pdf' | 'other';

/** Exam slug (from presets) or tool slug. Never free text. */
type Slug = string;

export interface AnalyticsEventMap {
  exam_selected: { exam: Slug; source: 'search' | 'grid' | 'link' | 'related' };
  kit_started: { exam: Slug; docs: number };
  doc_uploaded: {
    exam?: Slug;
    tool?: Slug;
    doc: DocType;
    inputFormat: InputFormat;
    kbBucket: KbBucket;
  };
  fit_done: {
    exam?: Slug;
    tool?: Slug;
    doc: DocType;
    pass: boolean;
    stages: FitStage[];
    ms: number;
  };
  doc_downloaded: { exam?: Slug; tool?: Slug; doc: DocType; via: 'download' | 'share' };
  kit_zip_downloaded: { exam: Slug; docs: number; via: 'download' | 'share' };
  tool_used: { tool: Slug; target?: string };
  portal_feedback: { exam: Slug; doc?: DocType; answer: 'yes' | 'no' | 'skip' };
  promo_click: {
    slot: 'promo' | 'affiliate';
    placement: 'kit-summary' | 'tool' | 'exam' | 'guide';
    exam?: Slug;
    group?: string;
  };
  error: {
    code: EngineErrorCode | 'IDB_UNAVAILABLE' | 'UNKNOWN';
    doc?: DocType;
    exam?: Slug;
    tool?: Slug;
  };
}

export type AnalyticsEvent = keyof AnalyticsEventMap;

/** Scalar props actually sent to the provider. */
export type FlatProps = Record<string, string | number | boolean>;

export type AnalyticsSender = (event: AnalyticsEvent, props: FlatProps) => void;

let sender: AnalyticsSender | null = null;

/** Install the provider adapter. Pass null to disable. */
export function configureAnalytics(s: AnalyticsSender | null): void {
  sender = s;
}

export function isAnalyticsEnabled(): boolean {
  return sender !== null;
}

export function flattenProps(props: object): FlatProps {
  const out: FlatProps = {};
  for (const [k, v] of Object.entries(props)) {
    if (v === undefined || v === null) continue;
    if (Array.isArray(v)) out[k] = v.join(',');
    else if (typeof v === 'string' || typeof v === 'number' || typeof v === 'boolean') out[k] = v;
  }
  return out;
}

/** Fire-and-forget. Never throws, never blocks the UI. */
export function track<E extends AnalyticsEvent>(event: E, props: AnalyticsEventMap[E]): void {
  if (!sender) return;
  try {
    sender(event, flattenProps(props));
  } catch {
    // analytics must never break the app
  }
}

/** Bucket a byte size for doc_uploaded (SPEC 11.1 "input KB bucket"). */
export function kbBucket(bytes: number): KbBucket {
  const kb = bytes / 1024;
  if (kb < 20) return '<20';
  if (kb < 50) return '20-50';
  if (kb < 100) return '50-100';
  if (kb < 200) return '100-200';
  if (kb < 500) return '200-500';
  if (kb < 1024) return '500-1000';
  if (kb < 5 * 1024) return '1-5MB';
  if (kb < 10 * 1024) return '5-10MB';
  return '>10MB';
}

/** Map a File/Blob MIME type (or name extension) to an InputFormat. Never sends the name. */
export function inputFormat(type: string, nameForExtOnly?: string): InputFormat {
  const t = type.toLowerCase();
  if (t === 'image/jpeg' || t === 'image/jpg') return 'jpg';
  if (t === 'image/png') return 'png';
  if (t === 'image/webp') return 'webp';
  if (t === 'image/heic' || t === 'image/heif') return 'heic';
  if (t === 'application/pdf') return 'pdf';
  const ext = nameForExtOnly?.split('.').pop()?.toLowerCase();
  if (ext === 'jpg' || ext === 'jpeg') return 'jpg';
  if (ext === 'png' || ext === 'webp' || ext === 'pdf') return ext;
  if (ext === 'heic' || ext === 'heif') return 'heic';
  return 'other';
}
