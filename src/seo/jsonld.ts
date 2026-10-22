/**
 * JSON-LD builders (SPEC 9.1): WebApplication on tools, HowTo + FAQPage on exam and
 * tool pages, BreadcrumbList everywhere, Article on guides, Organization (+ WebSite)
 * on home. Pure functions; unit-tested in tests/unit/seo/jsonld.test.ts.
 *
 * Rendered by SeoHead.astro as `<script type="application/ld+json">`, a non-executed
 * data block (CSP, PLAN 3.12). `serializeJsonLd` escapes `<` so content can never
 * close the script element.
 */
import {
  BRAND_OWNER,
  CONTACT_EMAIL,
  ENTITY_NAME,
  SITE_NAME,
  SITE_URL,
  SOCIAL_LINKS,
  SPEC_REVIEWER,
  TAGLINE,
  absoluteUrl,
} from '@/config/site';

export type JsonLd = Record<string, unknown>;

const CTX = 'https://schema.org';

export interface Crumb {
  name: string;
  /** Site path ("/exams") or absolute URL. The last crumb may omit it. */
  path?: string;
}

function abs(pathOrUrl: string): string {
  return /^https?:\/\//.test(pathOrUrl) ? pathOrUrl : absoluteUrl(pathOrUrl);
}

export function breadcrumbList(crumbs: readonly Crumb[]): JsonLd {
  return {
    '@context': CTX,
    '@type': 'BreadcrumbList',
    itemListElement: crumbs.map((c, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: c.name,
      ...(c.path ? { item: abs(c.path) } : {}),
    })),
  };
}

export interface OrganizationOptions {
  /** Official profile URLs; defaults to SOCIAL_LINKS (empty until the owner fills it). */
  sameAs?: readonly string[];
}

export function organization(opts: OrganizationOptions = {}): JsonLd {
  const sameAs = [...(opts.sameAs ?? SOCIAL_LINKS)];
  return {
    '@context': CTX,
    '@type': 'Organization',
    '@id': `${SITE_URL}/#organization`,
    name: SITE_NAME,
    legalName: ENTITY_NAME,
    url: `${SITE_URL}/`,
    logo: absoluteUrl('/pwa-512.png'),
    slogan: TAGLINE.en,
    parentOrganization: { '@type': 'Organization', name: BRAND_OWNER },
    contactPoint: {
      '@type': 'ContactPoint',
      contactType: 'customer support',
      email: CONTACT_EMAIL,
      url: absoluteUrl('/report'),
      availableLanguage: ['en', 'hi'],
    },
    sameAs,
  };
}

export function website(lang: 'en' | 'hi' = 'en'): JsonLd {
  return {
    '@context': CTX,
    '@type': 'WebSite',
    '@id': `${SITE_URL}/#website`,
    name: SITE_NAME,
    url: `${SITE_URL}/`,
    inLanguage: lang === 'hi' ? 'hi-IN' : 'en-IN',
    publisher: { '@id': `${SITE_URL}/#organization` },
  };
}

export interface WebAppInput {
  name: string;
  description: string;
  path: string;
  lang?: 'en' | 'hi';
}

export function webApplication(a: WebAppInput): JsonLd {
  return {
    '@context': CTX,
    '@type': 'WebApplication',
    name: a.name,
    description: a.description,
    url: abs(a.path),
    applicationCategory: 'MultimediaApplication',
    operatingSystem: 'Any (runs in the browser)',
    browserRequirements: 'Requires JavaScript and WebAssembly',
    inLanguage: a.lang === 'hi' ? 'hi-IN' : 'en-IN',
    isAccessibleForFree: true,
    offers: { '@type': 'Offer', price: '0', priceCurrency: 'INR' },
    publisher: { '@id': `${SITE_URL}/#organization` },
  };
}

export interface HowToInput {
  name: string;
  description?: string;
  steps: readonly { name: string; text: string; path?: string }[];
  totalTimeIso?: string;
}

export function howTo(h: HowToInput): JsonLd {
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
      ...(s.path ? { url: abs(s.path) } : {}),
    })),
  };
}

export function faqPage(items: readonly { q: string; a: string }[]): JsonLd | null {
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

export interface ArticleInput {
  title: string;
  description: string;
  path: string;
  publishedAt: Date;
  updatedAt?: Date;
  lang: 'en' | 'hi';
  image?: string;
  /** Spec reviewer; defaults to SPEC_REVIEWER (null = no reviewer is claimed). */
  reviewer?: { name: string; jobTitle?: string; url?: string } | null;
}

export function article(a: ArticleInput): JsonLd {
  const reviewer = a.reviewer === undefined ? SPEC_REVIEWER : a.reviewer;
  // Article has no `reviewedBy`; WebPage does, so the reviewer sits on the page entity.
  const page = reviewer
    ? {
        '@type': 'WebPage',
        '@id': abs(a.path),
        reviewedBy: {
          '@type': 'Person',
          name: reviewer.name,
          ...(reviewer.jobTitle ? { jobTitle: reviewer.jobTitle } : {}),
          ...(reviewer.url ? { url: reviewer.url } : {}),
        },
      }
    : abs(a.path);
  return {
    '@context': CTX,
    '@type': 'Article',
    headline: a.title,
    description: a.description,
    mainEntityOfPage: page,
    datePublished: a.publishedAt.toISOString(),
    dateModified: (a.updatedAt ?? a.publishedAt).toISOString(),
    inLanguage: a.lang === 'hi' ? 'hi-IN' : 'en-IN',
    ...(a.image ? { image: abs(a.image) } : {}),
    author: { '@type': 'Organization', name: SITE_NAME, url: `${SITE_URL}/` },
    publisher: {
      '@type': 'Organization',
      name: SITE_NAME,
      logo: { '@type': 'ImageObject', url: absoluteUrl('/pwa-512.png') },
    },
  };
}

/** JSON for a <script type="application/ld+json"> body. Escapes <, > and & as \u escapes. */
export function serializeJsonLd(data: JsonLd | readonly JsonLd[]): string {
  return JSON.stringify(data)
    .replace(/</g, '\\u003c')
    .replace(/>/g, '\\u003e')
    .replace(/&/g, '\\u0026')
    .replace(/\u2028/g, '\\u2028')
    .replace(/\u2029/g, '\\u2029');
}
