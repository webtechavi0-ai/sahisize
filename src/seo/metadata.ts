/**
 * Next.js Metadata builder: title, description, canonical, robots, hreflang (only when the
 * counterpart exists), Open Graph (en_IN / hi_IN, 1200×630) and Twitter large card.
 *
 *   export async function generateMetadata(): Promise<Metadata> {
 *     return buildMetadata({ lang, path: '/exam/ibps-po', title, description,
 *                            alternates: { en: '/exam/ibps-po', hi: '/hi/exam/ibps-po' } });
 *   }
 */
import type { Metadata } from 'next';
import { DEFAULT_OG_IMAGE, OG_IMAGE_HEIGHT, OG_IMAGE_WIDTH, SITE_NAME, SITE_URL } from '@/config/site';
import { OG_LOCALE, otherLang, type Lang } from '@/i18n/config';
import { languageAlternates, type Alternates } from './hreflang';
import { absoluteUrl, canonicalUrl } from './urls';

export interface BuildMetadataInput {
  lang: Lang;
  /** Path of THIS page (canonical), e.g. "/hi/exam/ibps-po". */
  path: string;
  /** Full <title>, used as-is (build it with fitTitle/withSiteName). */
  title: string;
  description: string;
  /** en/hi counterparts. hreflang is emitted only when `alternates.hi` is set. */
  alternates?: Alternates | null;
  /** Site path or absolute URL of a 1200×630 PNG. Default: /og/default.png. */
  ogImage?: string;
  /** Alt text for the OG image (default: the title). */
  ogImageAlt?: string;
  /** noindex,follow (report, offline, kit, custom preset). */
  noindex?: boolean;
  type?: 'website' | 'article';
  /** Article dates (ISO) for type 'article'. */
  publishedTime?: string;
  modifiedTime?: string;
  keywords?: readonly string[];
}

export function buildMetadata(m: BuildMetadataInput): Metadata {
  const canonical = canonicalUrl(m.path);
  const image = absoluteUrl(m.ogImage ?? DEFAULT_OG_IMAGE);
  const languages = languageAlternates(m.alternates);
  const type = m.type ?? 'website';
  return {
    metadataBase: new URL(SITE_URL),
    title: { absolute: m.title },
    description: m.description,
    ...(m.keywords?.length ? { keywords: [...m.keywords] } : {}),
    alternates: { canonical, ...(languages ? { languages } : {}) },
    robots: m.noindex ? { index: false, follow: true } : { index: true, follow: true },
    openGraph: {
      siteName: SITE_NAME,
      type,
      title: m.title,
      description: m.description,
      url: canonical,
      locale: OG_LOCALE[m.lang],
      ...(languages ? { alternateLocale: [OG_LOCALE[otherLang(m.lang)]] } : {}),
      images: [
        { url: image, width: OG_IMAGE_WIDTH, height: OG_IMAGE_HEIGHT, type: 'image/png', alt: m.ogImageAlt ?? m.title },
      ],
      ...(type === 'article' && m.publishedTime
        ? { publishedTime: m.publishedTime, modifiedTime: m.modifiedTime ?? m.publishedTime }
        : {}),
    },
    twitter: { card: 'summary_large_image', title: m.title, description: m.description, images: [image] },
  };
}
