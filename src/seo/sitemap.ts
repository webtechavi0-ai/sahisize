/**
 * Sitemap data (SPEC 9.1): split by type, each URL with hreflang alternates when the
 * counterpart exists. Hidden presets, noindex pages (custom preset, kit, report,
 * offline, 404, dev) are excluded.
 *
 * <lastmod> is a real content date or absent, never the build date:
 *  - exam and exam-document pages: the preset's `lastChecked`
 *  - guides: `updatedAt`, else `publishedAt`
 *  - every other page: omitted
 */
import { SITE_URL, absoluteUrl } from '@/config/site';
import { docSlug, getKitDocuments, getPublishedPresets } from '@/content/presets';
import {
  COMPRESS_KB_TARGETS,
  JPG_PDF_KB_TARGETS,
  KB_CLUSTER_EXTRA_PATHS,
  PDF_KB_TARGETS,
  TOOLS,
  compressPdfToKbPath,
  jpgToPdfUnderKbPath,
} from '@/config/tools';
import { hindiExamSlugs, hindiToolPath, type Alternates } from './hreflang';
import { ID_CHECKED_ON, idDocumentUrls } from '@/config/id-documents';
import { familyMembers, hubFamilies, hubPath } from './families';

export const SITEMAP_TYPES = [
  'pages',
  'exams',
  'documents',
  'tools',
  'guides',
  'id-documents',
] as const;
export type SitemapType = (typeof SITEMAP_TYPES)[number];

export interface SitemapUrl {
  path: string;
  alternates?: Alternates;
  lastmod?: string;
}

/** Each URL appears once; a pair is listed from both sides with the same alternates. */
function withPair(en: string, hi: string | null, lastmod?: string): SitemapUrl[] {
  const alternates = { en, hi };
  const out: SitemapUrl[] = [{ path: en, alternates, lastmod }];
  if (hi) out.push({ path: hi, alternates, lastmod });
  return out;
}

export function pagesUrls(): SitemapUrl[] {
  return [
    ...withPair('/', '/hi'),
    ...withPair('/exams', '/hi/exams'),
    ...withPair('/guides', '/hi/guides'),
    ...withPair('/editorial-policy', '/hi/editorial-policy'),
    { path: '/sources' },
    { path: '/about' },
    { path: '/privacy' },
    { path: '/terms' },
    { path: '/disclaimer' },
    { path: '/contact' },
  ];
}

/** Exam pages plus the exam-family hubs (/exams/ssc …), each hub dated by its newest member check. */
export function examUrls(): SitemapUrl[] {
  const hi = new Set(hindiExamSlugs());
  const hubs = hubFamilies().map((f) => ({
    path: hubPath(f),
    lastmod: familyMembers(f)
      .map((p) => p.lastChecked)
      .sort()
      .pop(),
  }));
  return [
    ...hubs,
    ...getPublishedPresets().flatMap((p) =>
      withPair(`/exam/${p.slug}`, hi.has(p.slug) ? `/hi/exam/${p.slug}` : null, p.lastChecked),
    ),
  ];
}

export function documentUrls(): SitemapUrl[] {
  return getPublishedPresets().flatMap((p) =>
    getKitDocuments(p).map((d) => ({
      path: `/exam/${p.slug}/${docSlug(d)}`,
      lastmod: p.lastChecked,
    })),
  );
}

export function toolUrls(): SitemapUrl[] {
  const paths = [
    '/tools',
    ...TOOLS.filter((t) => t.slug !== 'custom-preset').map((t) => t.path),
    ...COMPRESS_KB_TARGETS.map((n) => `/tools/compress-image-to-${n}kb`),
    ...PDF_KB_TARGETS.map(compressPdfToKbPath),
    ...JPG_PDF_KB_TARGETS.map(jpgToPdfUnderKbPath),
    ...KB_CLUSTER_EXTRA_PATHS,
  ];
  return paths.flatMap((p) => withPair(p, hindiToolPath(p)));
}

export interface GuideEntryLike {
  slug: string;
  lang: 'en' | 'hi';
  /** ISO date strings. */
  publishedAt: string;
  updatedAt?: string;
}

const isoDay = (d: string) => d.slice(0, 10);

/** A guide's lastmod: `updatedAt`, else `publishedAt`. */
export function guideLastmod(g: Pick<GuideEntryLike, 'publishedAt' | 'updatedAt'>): string {
  return isoDay(g.updatedAt ?? g.publishedAt);
}

export function guideUrls(entries: readonly GuideEntryLike[]): SitemapUrl[] {
  const en = new Map(entries.filter((g) => g.lang === 'en').map((g) => [g.slug, g]));
  const hi = new Map(entries.filter((g) => g.lang === 'hi').map((g) => [g.slug, g]));
  const out: SitemapUrl[] = [];
  for (const [slug, g] of en) {
    const alternates = { en: `/guides/${slug}`, hi: hi.has(slug) ? `/hi/guides/${slug}` : null };
    out.push({ path: `/guides/${slug}`, alternates, lastmod: guideLastmod(g) });
  }
  for (const [slug, g] of hi) {
    out.push({
      path: `/hi/guides/${slug}`,
      alternates: en.has(slug) ? { en: `/guides/${slug}`, hi: `/hi/guides/${slug}` } : undefined,
      lastmod: guideLastmod(g),
    });
  }
  return out;
}

/** Govt ID Documents section: its own sitemap group, never mixed into exams or tools. */
export function idDocumentsUrls(): SitemapUrl[] {
  return idDocumentUrls().flatMap((u) => withPair(u.en, u.hi, ID_CHECKED_ON));
}

export function renderUrlset(urls: SitemapUrl[]): string {
  const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;');
  const body = urls
    .map((u) => {
      const alt = u.alternates?.hi
        ? [
            `    <xhtml:link rel="alternate" hreflang="en-IN" href="${esc(absoluteUrl(u.alternates.en))}"/>`,
            `    <xhtml:link rel="alternate" hreflang="hi-IN" href="${esc(absoluteUrl(u.alternates.hi))}"/>`,
            `    <xhtml:link rel="alternate" hreflang="x-default" href="${esc(absoluteUrl(u.alternates.en))}"/>`,
          ].join('\n') + '\n'
        : '';
      const lm = u.lastmod ? `    <lastmod>${u.lastmod}</lastmod>\n` : '';
      return `  <url>\n    <loc>${esc(absoluteUrl(u.path))}</loc>\n${lm}${alt}  </url>`;
    })
    .join('\n');
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">\n${body}\n</urlset>\n`;
}

export function renderIndex(types: readonly string[]): string {
  const body = types
    .map((t) => `  <sitemap>\n    <loc>${SITE_URL}/sitemap-${t}.xml</loc>\n  </sitemap>`)
    .join('\n');
  return `<?xml version="1.0" encoding="UTF-8"?>\n<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${body}\n</sitemapindex>\n`;
}
