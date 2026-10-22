/**
 * Sitemap data (SPEC 9.1): split by type, each URL with hreflang alternates when the
 * counterpart exists. Hidden presets, noindex pages (custom preset, kit, report,
 * offline, 404, dev) are excluded.
 *
 * <lastmod> is a real content date or absent, never the build date:
 *  - exam and exam-document pages: the preset's `lastChecked`
 *  - guides: frontmatter `updatedAt`, else the git last-commit date of the .mdx file
 *    (skipped in a shallow clone, where every file has the same date), else `publishedAt`
 *  - every other page: omitted
 */
import type * as NodeChildProcess from 'node:child_process';
import { SITE_URL, absoluteUrl } from '@/config/site';
import { docSlug, getKitDocuments, getPublishedPresets } from '@/content/presets';
import { COMPRESS_KB_TARGETS, TOOLS } from '@/config/tools';
import { hindiExamSlugs, hindiToolPath, type Alternates } from './hreflang';

export const SITEMAP_TYPES = ['pages', 'exams', 'documents', 'tools', 'guides'] as const;
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

export function examUrls(): SitemapUrl[] {
  const hi = new Set(hindiExamSlugs());
  return getPublishedPresets().flatMap((p) =>
    withPair(`/exam/${p.slug}`, hi.has(p.slug) ? `/hi/exam/${p.slug}` : null, p.lastChecked),
  );
}

export function documentUrls(): SitemapUrl[] {
  return getPublishedPresets().flatMap((p) =>
    getKitDocuments(p).map((d) => ({ path: `/exam/${p.slug}/${docSlug(d)}`, lastmod: p.lastChecked })),
  );
}

export function toolUrls(): SitemapUrl[] {
  const paths = [
    '/tools',
    ...TOOLS.filter((t) => t.slug !== 'custom-preset').map((t) => t.path),
    ...COMPRESS_KB_TARGETS.map((n) => `/tools/compress-image-to-${n}kb`),
  ];
  return paths.flatMap((p) => withPair(p, hindiToolPath(p)));
}

export interface GuideEntryLike {
  slug: string;
  lang: 'en' | 'hi';
  publishedAt: Date;
  updatedAt?: Date;
  /** Source file, relative to the repo root (e.g. "src/content/guides/en/x.mdx"). */
  filePath?: string;
}

const isoDay = (d: Date) => d.toISOString().slice(0, 10);

let gitState: 'unknown' | 'ok' | 'none' = 'unknown';
/** `git log -1 --format=%cs -- <file>` (YYYY-MM-DD), or null when git is unusable here. */
export function gitLastCommitDate(filePath: string): string | null {
  const cp = globalThis.process?.getBuiltinModule?.('node:child_process') as
    | typeof NodeChildProcess
    | undefined;
  if (!cp || gitState === 'none') return null;
  const git = (args: string[]) =>
    cp.execFileSync('git', args, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim();
  try {
    if (gitState === 'unknown') {
      gitState = git(['rev-parse', '--is-shallow-repository']) === 'false' ? 'ok' : 'none';
      if (gitState === 'none') return null;
    }
    const out = git(['log', '-1', '--format=%cs', '--', filePath]);
    return /^\d{4}-\d{2}-\d{2}$/.test(out) ? out : null;
  } catch {
    gitState = 'none';
    return null;
  }
}

/** A guide's lastmod: `updatedAt`, else the later of its git date and `publishedAt`. */
export function guideLastmod(
  g: Pick<GuideEntryLike, 'publishedAt' | 'updatedAt' | 'filePath'>,
  gitDate: (file: string) => string | null = gitLastCommitDate,
): string {
  if (g.updatedAt) return isoDay(g.updatedAt);
  const published = isoDay(g.publishedAt);
  const fromGit = g.filePath ? gitDate(g.filePath) : null;
  return fromGit && fromGit > published ? fromGit : published;
}

export function guideUrls(
  entries: readonly GuideEntryLike[],
  gitDate: (file: string) => string | null = gitLastCommitDate,
): SitemapUrl[] {
  const en = new Map(entries.filter((g) => g.lang === 'en').map((g) => [g.slug, g]));
  const hi = new Map(entries.filter((g) => g.lang === 'hi').map((g) => [g.slug, g]));
  const out: SitemapUrl[] = [];
  for (const [slug, g] of en) {
    const alternates = { en: `/guides/${slug}`, hi: hi.has(slug) ? `/hi/guides/${slug}` : null };
    out.push({ path: `/guides/${slug}`, alternates, lastmod: guideLastmod(g, gitDate) });
  }
  for (const [slug, g] of hi) {
    out.push({
      path: `/hi/guides/${slug}`,
      alternates: en.has(slug) ? { en: `/guides/${slug}`, hi: `/hi/guides/${slug}` } : undefined,
      lastmod: guideLastmod(g, gitDate),
    });
  }
  return out;
}

export function renderUrlset(urls: SitemapUrl[]): string {
  const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;');
  const body = urls
    .map((u) => {
      const alt =
        u.alternates?.hi
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
