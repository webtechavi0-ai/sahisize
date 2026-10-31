/**
 * Typed, privacy-safe analytics. Client-only at runtime (no-op on the server).
 *
 * - Events only. NEVER images, file names or user-typed text: props are restricted to
 *   enums, numbers, booleans and slugs by the types below.
 * - No third-party script. `track()` sends a beacon to the provider configured in
 *   src/config/analytics.ts; with provider 'none' (the default) nothing is sent.
 * - Arrays are flattened to comma-joined strings (provider props must be scalar).
 *
 *   track('tool_used', { tool: 'compress-image', target: '20' });
 *   trackPageview();   // once per navigation (ClientBoot does this)
 */
import { ANALYTICS, analyticsBody, analyticsEndpoint, type AnalyticsConfig } from '@/config/analytics';
import type { DocType, EngineErrorCode, FitStage } from '@/engine/types';

/** Input size bucket; never the exact size. */
export type KbBucket =
  | '<20'
  | '20-50'
  | '50-100'
  | '100-200'
  | '200-500'
  | '500-1000'
  | '1-5MB'
  | '5-10MB'
  | '>10MB';

export type InputFormat = 'jpg' | 'png' | 'webp' | 'heic' | 'pdf' | 'other';

/** Exam slug (from presets) or tool slug. Never free text. */
type Slug = string;

export interface AnalyticsEventMap {
  exam_selected: { exam: Slug; source: 'search' | 'grid' | 'link' | 'related' };
  kit_started: { exam: Slug; docs: number };
  doc_uploaded: { exam?: Slug; tool?: Slug; doc: DocType; inputFormat: InputFormat; kbBucket: KbBucket };
  fit_done: { exam?: Slug; tool?: Slug; doc: DocType; pass: boolean; stages: FitStage[]; ms: number };
  doc_downloaded: { exam?: Slug; tool?: Slug; doc: DocType; via: 'download' | 'share' };
  kit_zip_downloaded: { exam: Slug; docs: number; via: 'download' | 'share' };
  tool_used: { tool: Slug; target?: string };
  portal_feedback: { exam: Slug; doc?: DocType; answer: 'yes' | 'no' | 'skip' };
  promo_click: {
    slot: 'promo' | 'affiliate';
    /** Page type, or for ExamPilot where on the page: sidebar card, inline, banner. */
    placement: 'kit-summary' | 'tool' | 'exam' | 'guide' | 'sidebar' | 'inline' | 'banner';
    exam?: Slug;
    group?: string;
    promo?: 'exampilot';
    /** Page slug, e.g. "compress-image" or "home". Never a URL. */
    page?: Slug;
  };
  error: { code: EngineErrorCode | 'IDB_UNAVAILABLE' | 'UNKNOWN'; doc?: DocType; exam?: Slug; tool?: Slug };
}

export type AnalyticsEvent = keyof AnalyticsEventMap;

/** Scalar props actually sent to the provider. */
export type FlatProps = Record<string, string | number | boolean>;

export type AnalyticsSender = (event: AnalyticsEvent | 'pageview', props: FlatProps) => void;

/** Beacon sender for a provider config, or null when analytics is off. */
export function beaconSender(cfg: AnalyticsConfig = ANALYTICS): AnalyticsSender | null {
  const endpoint = analyticsEndpoint(cfg);
  if (!endpoint) return null;
  return (event, props) => {
    if (typeof window === 'undefined') return;
    const url = `${location.origin}${location.pathname}`;
    const body = analyticsBody(cfg, event, url, props, {
      referrer: document.referrer || undefined,
      lang: document.documentElement.lang || undefined,
      screen: `${screen.width}x${screen.height}`,
    });
    const blob = new Blob([body], { type: 'application/json' });
    if (!navigator.sendBeacon?.(endpoint, blob)) {
      void fetch(endpoint, { method: 'POST', body, keepalive: true, headers: { 'Content-Type': 'application/json' } }).catch(
        () => undefined,
      );
    }
  };
}

let sender: AnalyticsSender | null | undefined;

/** Override the sender (tests, or null to disable). Default: beaconSender() on first use. */
export function configureAnalytics(s: AnalyticsSender | null): void {
  sender = s;
}

function currentSender(): AnalyticsSender | null {
  if (sender === undefined) sender = typeof window === 'undefined' ? null : beaconSender();
  return sender;
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
  const s = currentSender();
  if (!s) return;
  try {
    s(event, flattenProps(props));
  } catch {
    // analytics must never break the app
  }
}

/** Pageview (no props). Respects ANALYTICS.pageviews. */
export function trackPageview(): void {
  if (!ANALYTICS.pageviews) return;
  const s = currentSender();
  if (!s) return;
  try {
    s('pageview', {});
  } catch {
    // ignore
  }
}

/** Bucket a byte size (1 KB = 1024 B). */
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

/** Map a MIME type (or the name's extension only) to an InputFormat. Never sends the name. */
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
