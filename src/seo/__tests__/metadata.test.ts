import { describe, expect, it } from 'vitest';
import { DEFAULT_SITE_URL, SITE_URL } from '@/config/site';
import { organization } from '@/seo/jsonld';
import { buildMetadata } from '@/seo/metadata';
import { renderUrlset } from '@/seo/sitemap';
import { canonicalUrl } from '@/seo/urls';

const base = { lang: 'en' as const, title: 'T | SahiSize', description: 'd' };
const pair = { en: '/kit/ssc-cgl', hi: '/hi/kit/ssc-cgl' };

describe('site URL', () => {
  it('defaults to the production domain', () => {
    expect(DEFAULT_SITE_URL).toBe('https://sahisize.online');
  });
});

describe('canonicalUrl', () => {
  it('renders the home page as the bare origin, like Next.js does', () => {
    expect(canonicalUrl('/')).toBe(SITE_URL);
    expect(canonicalUrl('/exams/')).toBe(`${SITE_URL}/exams`);
  });
  it('sitemap <loc> for home equals the canonical', () => {
    expect(renderUrlset([{ path: '/' }])).toContain(`<loc>${SITE_URL}</loc>`);
  });
});

describe('buildMetadata', () => {
  it('emits hreflang for an indexable pair', () => {
    const m = buildMetadata({ ...base, path: '/exam/ssc-cgl', alternates: { en: '/exam/ssc-cgl', hi: '/hi/exam/ssc-cgl' } });
    expect(m.alternates?.languages).toBeDefined();
    expect(m.robots).toEqual({ index: true, follow: true });
  });
  it('emits no hreflang on a noindex page', () => {
    const m = buildMetadata({ ...base, path: '/kit/ssc-cgl', alternates: pair, noindex: true });
    expect(m.alternates?.languages).toBeUndefined();
    expect(m.openGraph && 'alternateLocale' in m.openGraph).toBe(false);
    expect(m.robots).toEqual({ index: false, follow: true });
  });
  it('can leave robots out (not-found page: Next adds noindex itself)', () => {
    const m = buildMetadata({ ...base, path: '/404', omitRobots: true });
    expect('robots' in m).toBe(false);
  });
});

describe('organization JSON-LD', () => {
  it('omits an empty sameAs', () => {
    expect('sameAs' in organization({ sameAs: [] })).toBe(false);
  });
  it('keeps real profile URLs only', () => {
    expect(organization({ sameAs: ['https://x.com/sahisize', 'not a url'] }).sameAs).toEqual(['https://x.com/sahisize']);
  });
});
