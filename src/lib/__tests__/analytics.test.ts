import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  combineSenders,
  configureAnalytics,
  flattenProps,
  gtagEventName,
  gtagParams,
  gtagSender,
  track,
  type AnalyticsSender,
} from '@/lib/analytics';
import { GA_MEASUREMENT_ID, gtagBootstrap } from '@/config/analytics';

type W = { gtag?: (...a: unknown[]) => void };

afterEach(() => {
  vi.unstubAllGlobals();
  configureAnalytics(null);
});

describe('gtag sender', () => {
  it('mirrors product events to window.gtag with flat, safe props', () => {
    const gtag = vi.fn();
    vi.stubGlobal('window', { gtag } satisfies W);
    configureAnalytics(gtagSender());
    track('fit_done', { exam: 'ssc-cgl', doc: 'signature', pass: true, stages: ['encode', 'search'], ms: 120 });
    expect(gtag).toHaveBeenCalledWith('event', 'fit_done', {
      exam: 'ssc-cgl',
      doc: 'signature',
      pass: true,
      stages: 'encode,search',
      ms: 120,
      transport_type: 'beacon',
    });
  });

  it('sends doc_downloaded and kit_zip_downloaded', () => {
    const gtag = vi.fn();
    vi.stubGlobal('window', { gtag } satisfies W);
    configureAnalytics(gtagSender());
    track('doc_downloaded', { exam: 'jee-main', doc: 'certificate', via: 'download' });
    track('kit_zip_downloaded', { exam: 'jee-main', docs: 3, via: 'share' });
    expect(gtag.mock.calls.map((c) => c[1])).toEqual(['doc_downloaded', 'kit_zip_downloaded']);
  });

  it('renames the reserved GA4 "error" event', () => {
    expect(gtagEventName('error')).toBe('app_error');
    expect(gtagEventName('doc_uploaded')).toBe('doc_uploaded');
  });

  it('skips pageviews (gtag config records page_view itself)', () => {
    const gtag = vi.fn();
    vi.stubGlobal('window', { gtag } satisfies W);
    gtagSender()('pageview', {});
    expect(gtag).not.toHaveBeenCalled();
  });

  it('does nothing without gtag or window', () => {
    expect(() => gtagSender()('tool_used', { tool: 'resize-image' })).not.toThrow();
    vi.stubGlobal('window', {});
    expect(() => gtagSender()('tool_used', { tool: 'resize-image' })).not.toThrow();
  });

  it('trims params to GA4 limits', () => {
    const p = gtagParams({ ['k'.repeat(50)]: 'v'.repeat(150) });
    const [[k, v]] = Object.entries(p) as [[string, string]];
    expect(k.length).toBe(40);
    expect(v.length).toBe(100);
  });
});

describe('combineSenders', () => {
  it('returns null when nothing is configured', () => {
    expect(combineSenders([null, null])).toBeNull();
  });
  it('keeps sending when one sender throws', () => {
    const ok = vi.fn();
    const bad: AnalyticsSender = () => {
      throw new Error('x');
    };
    combineSenders([bad, ok])!('tool_used', { tool: 'a' });
    expect(ok).toHaveBeenCalledOnce();
  });
});

describe('flattenProps', () => {
  it('drops undefined and non-scalar values', () => {
    expect(flattenProps({ a: undefined, b: { x: 1 }, c: 'slug', d: [1, 2] })).toEqual({ c: 'slug', d: '1,2' });
  });
});

describe('GA config', () => {
  it('has a valid default measurement id and a bootstrap that configures it', () => {
    expect(GA_MEASUREMENT_ID).toMatch(/^G-[A-Z0-9]+$/);
    expect(gtagBootstrap('G-TEST123')).toContain(`gtag('config',"G-TEST123")`);
  });
});
