/**
 * schema.org JSON-LD builders. Pure; render with `<JsonLd data={...} />`
 * (src/components/seo/JsonLd.tsx), which serializes with `serializeJsonLd`.
 *
 * Typical pages:
 *  - home:        organization() + website(lang)
 *  - tool:        webApplication() + howTo() + faqPage() + breadcrumbList()
 *  - exam:        howTo() + faqPage() + breadcrumbList() (+ itemList for hubs)
 *  - guide:       article() + breadcrumbList() (+ faqPage when it has FAQs)
 */
import {
  BRAND_OWNER,
  CONTACT_EMAIL,
  ENTITY_NAME,
  LOGO_PATH,
  SITE_NAME,
  SITE_URL,
  SOCIAL_LINKS,
  SPEC_REVIEWER,
  TAGLINE,
} from '@/config/site';
import { HTML_LANG, type Lang } from '@/i18n/config';
import { absoluteUrl, canonicalUrl, isAbsoluteUrl } from './urls';

export type JsonLdObject = { '@context'?: string; '@type': string } & Record<string, unknown>;

const CTX = 'https://schema.org';
export const ORGANIZATION_ID = `${SITE_URL}/#organization`;
export const WEBSITE_ID = `${SITE_URL}/#website`;

function url(pathOrUrl: string): string {
  return isAbsoluteUrl(pathOrUrl) ? pathOrUrl : canonicalUrl(pathOrUrl);
}

export interface Crumb {
  name: string;
  /** Site path ("/exams") or absolute URL. The last crumb (current page) may omit it. */
  path?: string;
}

export function breadcrumbList(crumbs: readonly Crumb[]): JsonLdObject {
  return {
    '@context': CTX,
    '@type': 'BreadcrumbList',
    itemListElement: crumbs.map((c, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: c.name,
      ...(c.path ? { item: url(c.path) } : {}),
    })),
  };
}

export function organization(opts: { sameAs?: readonly string[] } = {}): JsonLdObject {
  return {
    '@context': CTX,
    '@type': 'Organization',
    '@id': ORGANIZATION_ID,
    name: SITE_NAME,
    legalName: ENTITY_NAME,
    url: `${SITE_URL}/`,
    logo: absoluteUrl(LOGO_PATH),
    slogan: TAGLINE.en,
    parentOrganization: { '@type': 'Organization', name: BRAND_OWNER },
    contactPoint: {
      '@type': 'ContactPoint',
      contactType: 'customer support',
      email: CONTACT_EMAIL,
      url: absoluteUrl('/report'),
      availableLanguage: ['en', 'hi'],
    },
    sameAs: [...(opts.sameAs ?? SOCIAL_LINKS)],
  };
}

/**
 * WebSite with a SearchAction (sitelinks search box). The exam list filters by `?q=`.
 * `searchPath` defaults to "/exams" ("/hi/exams" for Hindi).
 */
export function website(lang: Lang = 'en', searchPath?: string): JsonLdObject {
  const search = searchPath ?? (lang === 'hi' ? '/hi/exams' : '/exams');
  return {
    '@context': CTX,
    '@type': 'WebSite',
    '@id': WEBSITE_ID,
    name: SITE_NAME,
    url: `${SITE_URL}/`,
    inLanguage: HTML_LANG[lang],
    publisher: { '@id': ORGANIZATION_ID },
    potentialAction: {
      '@type': 'SearchAction',
      target: { '@type': 'EntryPoint', urlTemplate: `${url(search)}?q={search_term_string}` },
      'query-input': 'required name=search_term_string',
    },
  };
}

export interface WebAppInput {
  name: string;
  description: string;
  path: string;
  lang?: Lang;
  /** Short feature list ("Works offline", "No upload"). */
  featureList?: readonly string[];
}

/** A free in-browser tool (WebApplication + free Offer). */
export function webApplication(a: WebAppInput): JsonLdObject {
  return {
    '@context': CTX,
    '@type': 'WebApplication',
    name: a.name,
    description: a.description,
    url: url(a.path),
    applicationCategory: 'MultimediaApplication',
    operatingSystem: 'Any (runs in the browser)',
    browserRequirements: 'Requires JavaScript and WebAssembly',
    inLanguage: HTML_LANG[a.lang ?? 'en'],
    isAccessibleForFree: true,
    ...(a.featureList?.length ? { featureList: [...a.featureList] } : {}),
    offers: { '@type': 'Offer', price: '0', priceCurrency: 'INR' },
    publisher: { '@id': ORGANIZATION_ID },
  };
}

/** The whole site as an installable app (home page). */
export function softwareApplication(lang: Lang = 'en'): JsonLdObject {
  return {
    '@context': CTX,
    '@type': 'SoftwareApplication',
    name: SITE_NAME,
    url: `${SITE_URL}/`,
    applicationCategory: 'UtilitiesApplication',
    operatingSystem: 'Android, iOS, Windows, macOS, Linux (browser)',
    inLanguage: HTML_LANG[lang],
    isAccessibleForFree: true,
    offers: { '@type': 'Offer', price: '0', priceCurrency: 'INR' },
    publisher: { '@id': ORGANIZATION_ID },
  };
}

export interface HowToInput {
  name: string;
  description?: string;
  steps: readonly { name: string; text: string; path?: string }[];
  /** ISO 8601 duration, e.g. "PT2M". */
  totalTimeIso?: string;
}

export function howTo(h: HowToInput): JsonLdObject | null {
  if (!h.steps.length) return null;
  return {
    '@context': CTX,
    '@type': 'HowTo',
    name: h.name,
    ...(h.description ? { description: h.description } : {}),
    ...(h.totalTimeIso ? { totalTime: h.totalTimeIso } : {}),
    estimatedCost: { '@type': 'MonetaryAmount', currency: 'INR', value: '0' },
    step: h.steps.map((s, i) => ({
      '@type': 'HowToStep',
      position: i + 1,
      name: s.name,
      text: s.text,
      ...(s.path ? { url: url(s.path) } : {}),
    })),
  };
}

/** FAQPage, or null when there are no items (never emit an empty FAQPage). */
export function faqPage(items: readonly { q: string; a: string }[]): JsonLdObject | null {
  if (items.length === 0) return null;
  return {
    '@context': CTX,
    '@type': 'FAQPage',
    mainEntity: items.map((f) => ({
      '@type': 'Question',
      name: f.q,
      acceptedAnswer: { '@type': 'Answer', text: f.a },
    })),
  };
}

/** ItemList of pages (hubs list their member pages). */
export function itemList(name: string, items: readonly { name: string; path: string }[]): JsonLdObject {
  return {
    '@context': CTX,
    '@type': 'ItemList',
    name,
    numberOfItems: items.length,
    itemListElement: items.map((x, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: x.name,
      url: url(x.path),
    })),
  };
}

export interface ArticleInput {
  title: string;
  description: string;
  path: string;
  /** ISO date or timestamp. */
  publishedAt: string;
  updatedAt?: string;
  lang: Lang;
  image?: string;
  /** Spec reviewer; defaults to SPEC_REVIEWER (null = no reviewer is claimed). */
  reviewer?: { name: string; jobTitle?: string; url?: string } | null;
}

function isoDateTime(s: string): string {
  return new Date(s.length === 10 ? `${s}T00:00:00Z` : s).toISOString();
}

export function article(a: ArticleInput): JsonLdObject {
  const reviewer = a.reviewer === undefined ? SPEC_REVIEWER : a.reviewer;
  // Article has no `reviewedBy`; WebPage does, so the reviewer sits on the page entity.
  const page = reviewer
    ? {
        '@type': 'WebPage',
        '@id': url(a.path),
        reviewedBy: {
          '@type': 'Person',
          name: reviewer.name,
          ...(reviewer.jobTitle ? { jobTitle: reviewer.jobTitle } : {}),
          ...(reviewer.url ? { url: reviewer.url } : {}),
        },
      }
    : url(a.path);
  return {
    '@context': CTX,
    '@type': 'Article',
    headline: a.title,
    description: a.description,
    mainEntityOfPage: page,
    datePublished: isoDateTime(a.publishedAt),
    dateModified: isoDateTime(a.updatedAt ?? a.publishedAt),
    inLanguage: HTML_LANG[a.lang],
    ...(a.image ? { image: absoluteUrl(a.image) } : {}),
    author: { '@type': 'Organization', name: SITE_NAME, url: `${SITE_URL}/` },
    publisher: {
      '@type': 'Organization',
      name: SITE_NAME,
      logo: { '@type': 'ImageObject', url: absoluteUrl(LOGO_PATH) },
    },
  };
}

/**
 * JSON for a `<script type="application/ld+json">` body. Escapes <, >, & and the JS line
 * separators so content can never close the script element.
 */
export function serializeJsonLd(data: JsonLdObject | readonly JsonLdObject[]): string {
  return JSON.stringify(data)
    .replace(/</g, '\\u003c')
    .replace(/>/g, '\\u003e')
    .replace(/&/g, '\\u0026')
    .replace(/ /g, '\\u2028')
    .replace(/ /g, '\\u2029');
}

/** Drop nulls (builders return null when there is nothing to say). */
export function compactJsonLd(items: readonly (JsonLdObject | null | undefined | false)[]): JsonLdObject[] {
  return items.filter((x): x is JsonLdObject => !!x);
}
