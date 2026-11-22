/**
 * Typed, privacy-safe analytics. Client-only at runtime (no-op on the server).
 *
 * - Events only. NEVER images, file names or user-typed text: props are restricted to
 *   enums, numbers, booleans and slugs by the types below.
 * - `track()` sends each event to GA4 through `window.gtag` when gtag.js is on the page
 *   (RootShell loads it), and also as a beacon to the optional provider configured in
 *   src/config/analytics.ts (provider 'none', the default, sends no beacon).
 * - Pageviews go only to the beacon provider: gtag.js records its own page_view.
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

type Gtag = (command: 'event', name: string, params: Record<string, string | number | boolean>) => void;

/**
 * GA4 event name for one of ours. "error" is a reserved GA4 event name and would be
 * dropped, so it is sent as "app_error". Every other name is already GA4-safe.
 */
export function gtagEventName(event: AnalyticsEvent): string {
  return event === 'error' ? 'app_error' : event;
}

/** GA4 limits: parameter names <= 40 chars, string values <= 100 chars. */
export function gtagParams(props: FlatProps): FlatProps {
  const out: FlatProps = {};
  for (const [k, v] of Object.entries(props)) {
    out[k.slice(0, 40)] = typeof v === 'string' ? v.slice(0, 100) : v;
  }
  return out;
}

/**
 * GA4 sender: `gtag('event', name, params)` when `window.gtag` exists (looked up at send
 * time, so it works whether or not gtag.js has finished loading: the inline stub queues to
 * dataLayer). Pageviews are skipped because gtag's `config` already sends page_view.
 * `transport_type: 'beacon'` lets a download/share event survive the tab being hidden.
 */
export function gtagSender(): AnalyticsSender {
  return (event, props) => {
    if (event === 'pageview' || typeof window === 'undefined') return;
    const gtag = (window as unknown as { gtag?: Gtag }).gtag;
    if (typeof gtag !== 'function') return;
    gtag('event', gtagEventName(event), { ...gtagParams(props), transport_type: 'beacon' });
  };
}

/** Send to every sender; one failing sender never blocks the others. */
export function combineSenders(senders: readonly (AnalyticsSender | null)[]): AnalyticsSender | null {
  const list = senders.filter((s): s is AnalyticsSender => !!s);
  if (!list.length) return null;
  if (list.length === 1) return list[0]!;
  return (event, props) => {
    for (const s of list) {
      try {
        s(event, props);
      } catch {
        // analytics must never break the app
      }
    }
  };
}

let sender: AnalyticsSender | null | undefined;

/** Override the sender (tests, or null to disable). Default: GA4 + beacon on first use. */
export function configureAnalytics(s: AnalyticsSender | null): void {
  sender = s;
}

function currentSender(): AnalyticsSender | null {
  if (sender === undefined) {
    sender = typeof window === 'undefined' ? null : combineSenders([gtagSender(), beaconSender()]);
  }
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
