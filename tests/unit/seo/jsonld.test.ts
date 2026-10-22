import { describe, expect, it } from 'vitest';
import {
  article,
  breadcrumbList,
  faqPage,
  howTo,
  organization,
  serializeJsonLd,
  webApplication,
  website,
} from '@/seo/jsonld';
import { getPromo, withUtm } from '@/config/monetization';
import { analyticsBody, analyticsEndpoint, ANALYTICS } from '@/config/analytics';
import { SITE_URL } from '@/config/site';

describe('JSON-LD builders (SPEC 9.1)', () => {
  it('BreadcrumbList with absolute URLs and positions', () => {
    const b = breadcrumbList([{ name: 'Home', path: '/' }, { name: 'Exams', path: '/exams' }, { name: 'IBPS PO' }]);
    expect(b['@type']).toBe('BreadcrumbList');
    const items = b.itemListElement as { position: number; item?: string }[];
    expect(items.map((i) => i.position)).toEqual([1, 2, 3]);
    expect(items[1]!.item).toBe(`${SITE_URL}/exams`);
    expect(items[2]!.item).toBeUndefined();
  });
  it('Organization and WebSite', () => {
    expect(organization()['@type']).toBe('Organization');
    expect(organization().legalName).toBe('Logicbuds Private Limited');
    expect(website('hi').inLanguage).toBe('hi-IN');
  });
  it('WebApplication is free', () => {
    const w = webApplication({ name: 'Compress', description: 'd', path: '/tools/compress-image' });
    expect(w['@type']).toBe('WebApplication');
    expect((w.offers as { price: string }).price).toBe('0');
    expect(w.url).toBe(`${SITE_URL}/tools/compress-image`);
  });
  it('HowTo steps are numbered', () => {
    const h = howTo({ name: 'x', steps: [{ name: 'a', text: 'A' }, { name: 'b', text: 'B', path: '/kit/ibps-po' }] });
    const steps = h.step as { position: number; url?: string }[];
    expect(steps[1]!.position).toBe(2);
    expect(steps[1]!.url).toBe(`${SITE_URL}/kit/ibps-po`);
  });
  it('FAQPage is null when empty', () => {
    expect(faqPage([])).toBeNull();
    const f = faqPage([{ q: 'Q?', a: 'A.' }])!;
    expect((f.mainEntity as unknown[]).length).toBe(1);
  });
  it('Article dates', () => {
    const a = article({
      title: 't',
      description: 'd',
      path: '/guides/x',
      publishedAt: new Date('2026-10-01T00:00:00Z'),
      lang: 'en',
    });
    expect(a.datePublished).toBe('2026-10-01T00:00:00.000Z');
    expect(a.dateModified).toBe(a.datePublished);
  });
  it('serialisation cannot close a script tag', () => {
    const s = serializeJsonLd(faqPage([{ q: '</script><script>alert(1)</script>', a: 'a & b' }])!);
    expect(s).not.toContain('</script>');
    expect(s).not.toContain('<');
    expect(JSON.parse(s).mainEntity[0].name).toBe('</script><script>alert(1)</script>');
  });
});

describe('monetization (SPEC 10)', () => {
  it('UTM tags', () => {
    const u = new URL(withUtm('https://example.com/?a=1', 'ibps-po'));
    expect(u.searchParams.get('utm_source')).toBe('sahisize');
    expect(u.searchParams.get('utm_medium')).toBe('promo');
    expect(u.searchParams.get('utm_campaign')).toBe('ibps-po');
    expect(u.searchParams.get('a')).toBe('1');
  });
  it('promo default on, English Setu', () => {
    const p = getPromo({ placement: 'exam', lang: 'en', exam: 'ibps-po', group: 'banking' })!;
    expect(p.partner).toBe('English Setu');
    expect(p.href).toContain('utm_campaign=ibps-po');
  });
});

describe('analytics config (SPEC 11.1)', () => {
  it('off by default', () => {
    expect(ANALYTICS.provider).toBe('none');
    expect(analyticsEndpoint()).toBeNull();
  });
  it('plausible body', () => {
    const cfg = { provider: 'plausible' as const, host: 'https://p.io', siteId: 'sahisize.in', pageviews: true };
    expect(analyticsEndpoint(cfg)).toBe('https://p.io/api/event');
    const b = JSON.parse(analyticsBody(cfg, 'promo_click', 'https://sahisize.in/exam/x', { slot: 'promo' }));
    expect(b).toMatchObject({ name: 'promo_click', domain: 'sahisize.in', props: { slot: 'promo' } });
  });
  it('umami body uses path only', () => {
    const cfg = { provider: 'umami' as const, host: 'https://u.io', siteId: 'abc', pageviews: true };
    const b = JSON.parse(analyticsBody(cfg, 'tool_used', 'https://sahisize.in/tools/x', { tool: 'x' }));
    expect(b.payload.url).toBe('/tools/x');
    expect(b.payload.website).toBe('abc');
  });
});
