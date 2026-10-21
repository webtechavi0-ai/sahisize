/**
 * Wires src/lib/analytics.ts to the provider in src/config/analytics.ts (SPEC 11.1).
 * No third-party script: events go out with sendBeacon (fallback fetch keepalive).
 * URLs are sent without query string or hash.
 */
import { ANALYTICS, analyticsBody, analyticsEndpoint } from '@/config/analytics';
import { configureAnalytics, type FlatProps, type track as trackFn } from '@/lib/analytics';

function pageUrl(): string {
  return `${location.origin}${location.pathname}`;
}

function send(endpoint: string, name: string, props: FlatProps): void {
  const body = analyticsBody(ANALYTICS, name, pageUrl(), props, {
    referrer: document.referrer ? new URL(document.referrer).origin : undefined,
    lang: document.documentElement.lang,
    screen: `${screen.width}x${screen.height}`,
  });
  try {
    const blob = new Blob([body], { type: 'text/plain' });
    if (navigator.sendBeacon?.(endpoint, blob)) return;
  } catch {
    /* fall through */
  }
  void fetch(endpoint, {
    method: 'POST',
    body,
    keepalive: true,
    headers: { 'Content-Type': 'text/plain' },
    credentials: 'omit',
  }).catch(() => {});
}

export function initAnalytics(): void {
  const endpoint = analyticsEndpoint();
  if (!endpoint) return;
  configureAnalytics((event, props) => send(endpoint, event, props));
  if (ANALYTICS.pageviews) send(endpoint, 'pageview', {});
}

/**
 * Delegated click tracking for promo/affiliate links rendered by PromoSlot and
 * AffiliateSlot: <a data-promo-slot data-promo-placement ...>.
 */
export function initPromoTracking(track: typeof trackFn): void {
  document.addEventListener(
    'click',
    (e) => {
      const a = (e.target as Element | null)?.closest?.<HTMLAnchorElement>('a[data-promo-slot]');
      if (!a) return;
      const d = a.dataset;
      if (d.promoId === 'exampilot') {
        const where = d.promoPlacement;
        track('promo_click', {
          slot: 'promo',
          promo: 'exampilot',
          placement: where === 'sidebar' || where === 'banner' ? where : 'inline',
          ...(d.promoPage ? { page: d.promoPage } : {}),
        });
        return;
      }
      track('promo_click', {
        slot: d.promoSlot === 'affiliate' ? 'affiliate' : 'promo',
        placement: (d.promoPlacement as 'tool' | 'exam' | 'guide' | 'kit-summary') ?? 'exam',
        ...(d.promoExam ? { exam: d.promoExam } : {}),
        ...(d.promoGroup ? { group: d.promoGroup } : {}),
      });
    },
    { capture: true },
  );
}
