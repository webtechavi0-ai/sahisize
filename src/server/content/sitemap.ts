import 'server-only';
/**
 * Sitemap URL lists, split by type. Hidden presets and noindex pages (kit, custom preset,
 * report, offline) are excluded. <lastmod> is a real content date or absent:
 *  - exam and exam-document pages: the preset's lastChecked (hubs: newest member check)
 *  - guides: updatedAt, else publishedAt
 *  - ID pages: the section's checkedOn
 *  - everything else: omitted
 *
 *   // app/sitemap-exams.xml/route.ts
 *   export const dynamic = 'force-static';
 *   export const GET = () => new Response(sitemapXml('exams'), { headers: SITEMAP_HEADERS });
 */
import { ROUTES, examDocPath, examPath, guidePath } from '@/config/routes';
import { NOINDEX_TOOL_SLUGS } from '@/config/tools';
import { kitDocuments } from '@/lib/presets';
import { allToolPageSlugs, toolPagePath } from '@/lib/tool-pages';
import { SITEMAP_TYPES, latestDay, renderIndex, renderUrlset, withPair, type SitemapType, type SitemapUrl } from '@/seo/sitemap';
import { familyMembers, hubFamilies } from './families';
import { guideLastmod, listGuides } from './guides';
import { hindiPathFor, hasHindiExam } from './hindi';
import { idDocumentUrls, idSection } from './id-documents';
import { publishedPresets } from './presets';

function pagesUrls(): SitemapUrl[] {
  const paired = [ROUTES.home, ROUTES.exams, ROUTES.guides, ROUTES.editorialPolicy];
  const single = [ROUTES.sources, ROUTES.about, ROUTES.privacy, ROUTES.terms, ROUTES.disclaimer, ROUTES.contact];
  return [...paired.flatMap((p) => withPair(p, hindiPathFor(p))), ...single.map((path) => ({ path }))];
}

function examUrls(): SitemapUrl[] {
  const hubs = hubFamilies().map((f): SitemapUrl => {
    const lastmod = latestDay(familyMembers(f.slug).map((p) => p.lastChecked));
    return lastmod ? { path: f.path, lastmod } : { path: f.path };
  });
  return [
    ...hubs,
    ...publishedPresets().flatMap((p) =>
      withPair(examPath(p.slug), hasHindiExam(p.slug) ? `/hi${examPath(p.slug)}` : null, p.lastChecked),
    ),
  ];
}

function documentUrls(): SitemapUrl[] {
  return publishedPresets().flatMap((p) =>
    kitDocuments(p).map((d) => ({ path: examDocPath(p.slug, d.slug ?? d.doc), lastmod: p.lastChecked })),
  );
}

function toolUrls(): SitemapUrl[] {
  const paths = [ROUTES.tools, ...allToolPageSlugs().filter((s) => !NOINDEX_TOOL_SLUGS.includes(s)).map(toolPagePath)];
  return paths.flatMap((p) => withPair(p, hindiPathFor(p)));
}

function guideUrls(): SitemapUrl[] {
  const en = new Map(listGuides('en').map((g) => [g.slug, g]));
  const hi = new Map(listGuides('hi').map((g) => [g.slug, g]));
  const out: SitemapUrl[] = [];
  for (const [slug, g] of en) {
    out.push({
      path: guidePath(slug),
      alternates: { en: guidePath(slug), hi: hi.has(slug) ? `/hi${guidePath(slug)}` : null },
      lastmod: guideLastmod(g),
    });
  }
  for (const [slug, g] of hi) {
    out.push({
      path: `/hi${guidePath(slug)}`,
      ...(en.has(slug) ? { alternates: { en: guidePath(slug), hi: `/hi${guidePath(slug)}` } } : {}),
      lastmod: guideLastmod(g),
    });
  }
  return out;
}

function idDocumentsUrls(): SitemapUrl[] {
  const day = idSection().checkedOn;
  return idDocumentUrls().flatMap((u) => withPair(u.en, u.hi, day));
}

/** URL entries of one sitemap. */
export function sitemapUrls(type: SitemapType): SitemapUrl[] {
  switch (type) {
    case 'pages':
      return pagesUrls();
    case 'exams':
      return examUrls();
    case 'documents':
      return documentUrls();
    case 'tools':
      return toolUrls();
    case 'guides':
      return guideUrls();
    case 'id-documents':
      return idDocumentsUrls();
  }
}

/** Every indexable path, all sitemaps (link checks, search index). */
export function allSitemapPaths(): string[] {
  return SITEMAP_TYPES.flatMap((t) => sitemapUrls(t).map((u) => u.path));
}

export function sitemapXml(type: SitemapType): string {
  return renderUrlset(sitemapUrls(type));
}

export function sitemapIndexXml(): string {
  return renderIndex(SITEMAP_TYPES);
}
