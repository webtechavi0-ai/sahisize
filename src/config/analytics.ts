/**
 * Analytics provider config. Cookie-less, events only, and no third-party script: events
 * are sent with `navigator.sendBeacon` (fallback `fetch keepalive`) straight to the
 * provider's event API by src/lib/analytics.ts. Default provider is 'none'.
 *
 * Values come from env at build time so ops can switch providers without a code change:
 *   NEXT_PUBLIC_ANALYTICS_PROVIDER = plausible | umami | none
 *   NEXT_PUBLIC_ANALYTICS_HOST     = https://plausible.io   (no trailing slash)
 *   NEXT_PUBLIC_ANALYTICS_SITE_ID  = plausible domain or umami website id
 * When switching on, add the host to the CSP `connect-src`.
 */
export type AnalyticsProvider = 'plausible' | 'umami' | 'none';

export interface AnalyticsConfig {
  provider: AnalyticsProvider;
  /** Provider origin, e.g. "https://plausible.io". No trailing slash. */
  host: string;
  /** Plausible: the site domain. Umami: the website id. */
  siteId: string;
  /** Send a pageview on load. */
  pageviews: boolean;
}

function provider(v: string | undefined): AnalyticsProvider {
  return v === 'plausible' || v === 'umami' ? v : 'none';
}

export const ANALYTICS: AnalyticsConfig = {
  provider: provider(process.env.NEXT_PUBLIC_ANALYTICS_PROVIDER),
  host: (process.env.NEXT_PUBLIC_ANALYTICS_HOST ?? '').replace(/\/+$/, ''),
  siteId: process.env.NEXT_PUBLIC_ANALYTICS_SITE_ID ?? '',
  pageviews: true,
};

/** Event endpoint for the configured provider, or null when analytics is off. */
export function analyticsEndpoint(cfg: AnalyticsConfig = ANALYTICS): string | null {
  if (cfg.provider === 'none' || !cfg.host || !cfg.siteId) return null;
  return cfg.provider === 'plausible' ? `${cfg.host}/api/event` : `${cfg.host}/api/send`;
}

/** Origins the CSP must allow in `connect-src` for analytics (empty when off). */
export function analyticsOrigins(cfg: AnalyticsConfig = ANALYTICS): string[] {
  return analyticsEndpoint(cfg) ? [new URL(cfg.host).origin] : [];
}

/**
 * Request body for one event. `url` is the page URL WITHOUT query string or hash (query
 * strings can carry prefilled report text).
 */
export function analyticsBody(
  cfg: AnalyticsConfig,
  name: string,
  url: string,
  props: Record<string, string | number | boolean>,
  extra: { referrer?: string; lang?: string; screen?: string } = {},
): string {
  const hasProps = Object.keys(props).length > 0;
  if (cfg.provider === 'plausible') {
    return JSON.stringify({
      name,
      url,
      domain: cfg.siteId,
      referrer: extra.referrer || null,
      props: hasProps ? props : undefined,
    });
  }
  const u = new URL(url);
  return JSON.stringify({
    type: 'event',
    payload: {
      website: cfg.siteId,
      hostname: u.hostname,
      url: u.pathname,
      language: extra.lang,
      screen: extra.screen,
      referrer: extra.referrer || undefined,
      name: name === 'pageview' ? undefined : name,
      data: hasProps ? props : undefined,
    },
  });
}
