/**
 * Analytics provider config (SPEC 11.1). Cookie-less, events only.
 *
 * Default provider is 'none' until the production domain is set (QUESTIONS Q3).
 * We never load a third-party script: events are sent with `navigator.sendBeacon`
 * (fallback `fetch keepalive`) straight to the provider's event API, so only
 * `connect-src` needs the provider origin (add it to ANALYTICS_ORIGINS in
 * src/config/csp.ts when switching on).
 *
 * Payloads come from src/lib/analytics.ts, whose types forbid file names, image
 * data and user-typed text.
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

export const ANALYTICS: AnalyticsConfig = {
  provider: 'none',
  host: '',
  siteId: '',
  pageviews: true,
};

/** Endpoint for the configured provider, or null when off. */
export function analyticsEndpoint(cfg: AnalyticsConfig = ANALYTICS): string | null {
  if (cfg.provider === 'none' || !cfg.host || !cfg.siteId) return null;
  if (cfg.provider === 'plausible') return `${cfg.host}/api/event`;
  return `${cfg.host}/api/send`;
}

/**
 * Build the request body for one event. `url` is the page URL WITHOUT query string
 * or hash (query strings can carry prefilled report text).
 */
export function analyticsBody(
  cfg: AnalyticsConfig,
  name: string,
  url: string,
  props: Record<string, string | number | boolean>,
  extra: { referrer?: string; lang?: string; screen?: string } = {},
): string {
  if (cfg.provider === 'plausible') {
    return JSON.stringify({
      name,
      url,
      domain: cfg.siteId,
      referrer: extra.referrer || null,
      props: Object.keys(props).length ? props : undefined,
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
      data: Object.keys(props).length ? props : undefined,
    },
  });
}
