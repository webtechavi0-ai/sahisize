/**
 * Sitemap XML. Pure: the URL lists come from '@/server/content' (`sitemapUrls(type)`).
 * Each URL carries hreflang xhtml:link pairs when its counterpart exists, and a <lastmod>
 * that is a real content date (never the build date) or absent.
 */
import { SITE_URL } from '@/config/site';
import { hreflangLinks, type Alternates } from './hreflang';
import { canonicalUrl } from './urls';

export const SITEMAP_TYPES = ['pages', 'exams', 'documents', 'tools', 'guides', 'id-documents'] as const;
export type SitemapType = (typeof SITEMAP_TYPES)[number];

export function isSitemapType(v: string): v is SitemapType {
  return (SITEMAP_TYPES as readonly string[]).includes(v);
}

export interface SitemapUrl {
  path: string;
  alternates?: Alternates;
  /** YYYY-MM-DD */
  lastmod?: string;
}

/** A page listed from both sides with the same alternates (Hindi entry only when it exists). */
export function withPair(en: string, hi: string | null, lastmod?: string): SitemapUrl[] {
  const alternates: Alternates = { en, hi };
  const out: SitemapUrl[] = [{ path: en, alternates, ...(lastmod ? { lastmod } : {}) }];
  if (hi) out.push({ path: hi, alternates, ...(lastmod ? { lastmod } : {}) });
  return out;
}

/** YYYY-MM-DD of an ISO date or timestamp. */
export function isoDay(d: string): string {
  return d.slice(0, 10);
}

/** Latest of a list of ISO dates, or undefined. */
export function latestDay(dates: readonly (string | undefined)[]): string | undefined {
  const days = dates.filter((d): d is string => !!d).map(isoDay).sort();
  return days[days.length - 1];
}

function esc(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

export function renderUrlset(urls: readonly SitemapUrl[]): string {
  const body = urls
    .map((u) => {
      const alt = hreflangLinks(u.alternates)
        .map((l) => `    <xhtml:link rel="alternate" hreflang="${l.hreflang}" href="${esc(l.href)}"/>\n`)
        .join('');
      const lm = u.lastmod ? `    <lastmod>${esc(u.lastmod)}</lastmod>\n` : '';
      return `  <url>\n    <loc>${esc(canonicalUrl(u.path))}</loc>\n${lm}${alt}  </url>`;
    })
    .join('\n');
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">\n${body}\n</urlset>\n`;
}

export function renderIndex(types: readonly string[], lastmods: Partial<Record<string, string>> = {}): string {
  const body = types
    .map((t) => {
      const lm = lastmods[t] ? `\n    <lastmod>${esc(lastmods[t]!)}</lastmod>` : '';
      return `  <sitemap>\n    <loc>${esc(`${SITE_URL}/sitemap-${t}.xml`)}</loc>${lm}\n  </sitemap>`;
    })
    .join('\n');
  return `<?xml version="1.0" encoding="UTF-8"?>\n<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${body}\n</sitemapindex>\n`;
}

/** Response headers for a sitemap route handler. */
export const SITEMAP_HEADERS = {
  'Content-Type': 'application/xml; charset=utf-8',
  'Cache-Control': 'public, max-age=3600',
} as const;

/** robots.txt body. noindex pages carry their own robots meta tag. */
export function renderRobots(): string {
  return ['User-agent: *', 'Allow: /', 'Disallow: /dev/', '', `Sitemap: ${SITE_URL}/sitemap-index.xml`, ''].join('\n');
}

export const ROBOTS_HEADERS = { 'Content-Type': 'text/plain; charset=utf-8' } as const;
