import 'server-only';
/**
 * Sitemap URL lists, split by type. Hidden presets and noindex pages (kit, custom preset,
 * report, offline) are excluded. <lastmod> is a real content date or absent:
 *  - exam and exam-document pages: the preset's lastChecked (hubs: newest member check)
 *  - guides: updatedAt, else publishedAt
 *  - ID pages: the section's checkedOn
 *  - /exams, /sources: newest preset lastChecked; /guides: newest guide date
 *  - tool pages and the remaining static pages: the last git commit that touched their
 *    content/route files (`git log`, read once per build). Without a git checkout (e.g. a
 *    Docker build from a tarball) the date is omitted, never replaced by the build date.
 *
 *   // app/sitemap-exams.xml/route.ts
 *   export const dynamic = 'force-static';
 *   export const GET = () => new Response(sitemapXml('exams'), { headers: SITEMAP_HEADERS });
 */
import { execFileSync } from 'node:child_process';
import { ROUTES, examDocPath, examPath, guidePath } from '@/config/routes';
import { PRINT_PHOTO_SLUGS } from '@/config/exams';
import { NOINDEX_TOOL_SLUGS } from '@/config/tools';
import { kitDocuments } from '@/lib/presets';
import { allToolPageSlugs, toolPagePath } from '@/lib/tool-pages';
import { SITEMAP_TYPES, latestDay, renderIndex, renderUrlset, withPair, type SitemapType, type SitemapUrl } from '@/seo/sitemap';
import { printPhotoPages } from './exam-print';
import { familyMembers, hubFamilies } from './families';
import { guideLastmod, listGuides } from './guides';
import { hindiPathFor, hasHindiExam } from './hindi';
import { idDocumentUrls, idSection } from './id-documents';
import { publishedPresets } from './presets';

let gitDays: Map<string, string> | null | undefined;

/** File -> YYYY-MM-DD of the newest commit touching it (src/ only), or null without git. */
function gitDayIndex(): Map<string, string> | null {
  if (gitDays !== undefined) return gitDays;
  try {
    const log = execFileSync('git', ['log', '--format=@%cs', '--name-only', '--', 'src'], {
      cwd: process.cwd(),
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
      timeout: 15_000,
      maxBuffer: 64 * 1024 * 1024,
    });
    gitDays = parseGitDays(log);
  } catch {
    gitDays = null;
  }
  return gitDays;
}

/** Parse `git log --format=@%cs --name-only` (newest first): first date seen per file wins. */
export function parseGitDays(log: string): Map<string, string> {
  const out = new Map<string, string>();
  let day = '';
  for (const line of log.split('\n')) {
    const l = line.trim();
    if (!l) continue;
    if (l.startsWith('@')) day = l.slice(1);
    else if (day && !out.has(l)) out.set(l, day);
  }
  return out;
}

/** Newest commit day over files or directories (repo-relative), or undefined. */
function gitDay(paths: readonly string[]): string | undefined {
  const idx = gitDayIndex();
  if (!idx) return undefined;
  const days: string[] = [];
  for (const p of paths) {
    const exact = idx.get(p);
    if (exact) days.push(exact);
    else for (const [file, d] of idx) if (file.startsWith(`${p}/`)) days.push(d);
  }
  return latestDay(days);
}

const routeDir = (path: string) => `src/app/(en)${path === '/' ? '' : path}`;

function withDay(path: string, lastmod: string | undefined): SitemapUrl {
  return lastmod ? { path, lastmod } : { path };
}

function pagesUrls(): SitemapUrl[] {
  const presetDay = latestDay(publishedPresets().map((p) => p.lastChecked));
  const guideDay = latestDay([...listGuides('en'), ...listGuides('hi')].map(guideLastmod));
  const pageFiles = (p: string) => [`${routeDir(p)}/page.tsx`, `src/app/hi${p === '/' ? '' : p}/page.tsx`];
  const dayOf: Record<string, string | undefined> = {
    [ROUTES.home]: latestDay([presetDay, gitDay([...pageFiles(ROUTES.home), 'src/components/site/HomePage.tsx'])]),
    [ROUTES.exams]: presetDay,
    [ROUTES.guides]: guideDay,
    [ROUTES.sources]: presetDay,
    [ROUTES.editorialPolicy]: gitDay(pageFiles(ROUTES.editorialPolicy)),
  };
  const paired = [ROUTES.home, ROUTES.exams, ROUTES.guides, ROUTES.editorialPolicy];
  const single = [ROUTES.sources, ROUTES.about, ROUTES.privacy, ROUTES.terms, ROUTES.disclaimer, ROUTES.contact];
  return [
    ...paired.flatMap((p) => withPair(p, hindiPathFor(p), dayOf[p])),
    ...single.map((p) => withDay(p, dayOf[p] ?? gitDay([`${routeDir(p)}/page.tsx`]))),
  ];
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
  return [
    ...publishedPresets().flatMap((p) =>
      kitDocuments(p).flatMap((d) => {
        const path = examDocPath(p.slug, d.slug ?? d.doc);
        return withPair(path, hindiPathFor(path), p.lastChecked);
      }),
    ),
    // Exam-day print photo pages (English only).
    ...PRINT_PHOTO_SLUGS.flatMap((s) => printPhotoPages(s).map((x) => withDay(x.path, x.preset.lastChecked))),
  ];
}

function toolUrls(): SitemapUrl[] {
  const slugs = allToolPageSlugs().filter((s) => !NOINDEX_TOOL_SLUGS.includes(s));
  const copyFiles = (slug: string) => [`src/content/tools/en/${slug}.json`, `src/content/tools/hi/${slug}.json`];
  const indexDay = gitDay(['src/content/tools/sections.json', `${routeDir(ROUTES.tools)}/page.tsx`]);
  // Pages without a copy file of their own are generated from the shared tool template.
  const templateDay = gitDay([routeDir(ROUTES.tools), 'src/components/layouts/ToolLayout.tsx']);
  return [
    ...withPair(ROUTES.tools, hindiPathFor(ROUTES.tools), indexDay),
    ...slugs.flatMap((s) => withPair(toolPagePath(s), hindiPathFor(toolPagePath(s)), gitDay(copyFiles(s)) ?? templateDay)),
  ];
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

/** Index with each sitemap's lastmod = the newest <lastmod> inside it. */
export function sitemapIndexXml(): string {
  const lastmods: Partial<Record<SitemapType, string>> = {};
  for (const t of SITEMAP_TYPES) {
    const day = latestDay(sitemapUrls(t).map((u) => u.lastmod));
    if (day) lastmods[t] = day;
  }
  return renderIndex(SITEMAP_TYPES, lastmods);
}
