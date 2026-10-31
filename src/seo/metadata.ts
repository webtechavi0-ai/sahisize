/**
 * Next.js Metadata builder (SPEC 9.1): title, description, canonical, robots, Open Graph,
 * Twitter and hreflang (only when the counterpart exists). Replaces the old SeoHead.
 * Pages: `export const metadata = buildMetadata({...})` or inside `generateMetadata`.
 */
import type { Metadata } from 'next';
import { DEFAULT_OG_IMAGE, OG_LOCALE, SITE_NAME, SITE_URL, absoluteUrl, type Lang } from '@/config/site';
import { hreflangLinks, type Alternates } from '@/seo/hreflang';

export interface PageMeta {
  title: string;
  description: string;
  lang?: Lang;
  /** Path for the canonical URL, e.g. "/exam/ibps-po". */
  canonicalPath: string;
  noindex?: boolean;
  /** en/hi counterparts for hreflang and the language toggle. */
  alternates?: Alternates;
  ogImage?: string;
  ogType?: 'website' | 'article';
}

export function normalizePath(p: string): string {
  const s = p.replace(/\.html$/, '').replace(/\/index$/, '/').replace(/(.)\/$/, '$1');
  return s || '/';
}

export function buildMetadata(m: PageMeta): Metadata {
  const lang = m.lang ?? 'en';
  const canonical = absoluteUrl(normalizePath(m.canonicalPath));
  const image = absoluteUrl(m.ogImage ?? DEFAULT_OG_IMAGE);
  const links = m.alternates ? hreflangLinks(m.alternates) : [];
  const otherLocale = lang === 'hi' ? OG_LOCALE.en : OG_LOCALE.hi;
  const languages: Record<string, string> = {};
  for (const l of links) languages[l.hreflang] = l.href;
  return {
    metadataBase: new URL(SITE_URL),
    title: { absolute: m.title },
    description: m.description,
    alternates: { canonical, ...(links.length ? { languages } : {}) },
    robots: m.noindex ? { index: false, follow: true } : undefined,
    openGraph: {
      siteName: SITE_NAME,
      type: m.ogType ?? 'website',
      title: m.title,
      description: m.description,
      url: canonical,
      images: [{ url: image, width: 1200, height: 630, type: 'image/png' }],
      locale: OG_LOCALE[lang],
      ...(links.length ? { alternateLocale: [otherLocale] } : {}),
    },
    twitter: { card: 'summary_large_image', title: m.title, description: m.description, images: [image] },
  };
}
