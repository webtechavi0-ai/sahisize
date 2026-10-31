import 'server-only';
/**
 * Which pages exist in Hindi, derived from content (never a hand-synced route list):
 *  - exams/kits: hindi-exams.json (validated against exam-copy/hi and the presets)
 *  - guides:     files in guides/hi
 *  - tools:      files in tools/hi
 *  - ID pages:   pages in id-documents/copy/hi.json
 *  - static:     STATIC_HINDI_PAGES (config/routes.ts)
 *
 *   localHref('/exam/ibps-po', 'hi')          -> '/hi/exam/ibps-po'
 *   localHref('/exam/ibps-so', 'hi')          -> '/exam/ibps-so'   (no Hindi page)
 *   localHref('/tools/resize-image#x', 'hi')  -> '/hi/tools/resize-image#x'
 *   alternatesFor('/guides/jpg-vs-png-vs-pdf') -> { en: '/guides/…', hi: '/hi/guides/…' }
 */
import { STATIC_HINDI_PAGES } from '@/config/routes';
import { localizePath, stripLocale, type Lang } from '@/i18n/config';
import { kitDocuments } from '@/lib/presets';
import type { Alternates } from '@/seo/hreflang';
import { once } from './core/read';
import { getPublishedPreset, publishedPresets } from './presets';
import { content } from './registry';

/** Exams with Hindi /hi/exam and /hi/kit pages, in hindi-exams.json order (published only). */
export const hindiExamSlugs = once((): string[] => {
  const pub = new Set(publishedPresets().map((p) => p.slug));
  return content().hindiExams.filter((s) => pub.has(s));
});

export function hasHindiExam(slug: string): boolean {
  return hindiExamSlugs().includes(slug);
}

/** Hindi kit pages: Hindi exams that have at least one kit document. */
export const hindiKitSlugs = once((): string[] =>
  hindiExamSlugs().filter((s) => {
    const p = getPublishedPreset(s);
    return !!p && kitDocuments(p).length > 0;
  }),
);

/** Slugs of published (non-draft) Hindi guides. */
export const hindiGuideSlugs = once(
  (): Set<string> => new Set(content().guides.hi.filter((g) => !g.draft).map((g) => g.slug)),
);

/** Tool page slugs with a Hindi page (files in src/content/tools/hi), sorted. */
export const hindiToolSlugs = once((): string[] => [...content().toolCopy.hi.keys()].sort());

export function hasHindiTool(slug: string): boolean {
  return content().toolCopy.hi.has(slug);
}

/** Govt ID page slugs with a Hindi page. */
export const hindiIdDocSlugs = once((): string[] => Object.keys(content().idCopy.hi?.pages ?? {}));

/** The Hindi path for an English site path when that Hindi page exists, else null. */
export function hindiPathFor(enPath: string): string | null {
  const p = stripLocale(enPath.replace(/(.)\/$/, '$1') || '/');
  let m: RegExpExecArray | null;
  if ((m = /^\/exam\/([a-z0-9-]+)$/.exec(p))) return hasHindiExam(m[1]!) ? `/hi${p}` : null;
  if ((m = /^\/kit\/([a-z0-9-]+)$/.exec(p))) return hindiKitSlugs().includes(m[1]!) ? `/hi${p}` : null;
  if ((m = /^\/guides\/([a-z0-9-]+)$/.exec(p))) return hindiGuideSlugs().has(m[1]!) ? `/hi${p}` : null;
  if ((m = /^\/tools\/([a-z0-9-]+)$/.exec(p))) return hasHindiTool(m[1]!) ? `/hi${p}` : null;
  if ((m = /^\/id-documents\/([a-z0-9-]+)$/.exec(p))) return hindiIdDocSlugs().includes(m[1]!) ? `/hi${p}` : null;
  if (STATIC_HINDI_PAGES.includes(p)) return localizePath(p, 'hi');
  return null;
}

/**
 * The href to use on a page in `lang` for an English site path: on Hindi pages the /hi
 * counterpart when it exists, else the English path. Query strings and #hashes are kept;
 * absolute URLs, mailto: and #anchors pass through.
 */
export function localHref(enPath: string, lang: Lang): string {
  if (lang !== 'hi' || !enPath.startsWith('/') || enPath.startsWith('//')) return enPath;
  const m = /^([^?#]*)(.*)$/.exec(enPath)!;
  const hi = hindiPathFor(m[1] || '/');
  return (hi ?? (stripLocale(m[1] || '/'))) + (m[2] ?? '');
}

/** en/hi pair of a page from its English (or Hindi) path, for hreflang and the language toggle. */
export function alternatesFor(path: string): Alternates {
  const en = stripLocale(path.split(/[?#]/)[0] || '/');
  return { en, hi: hindiPathFor(en) };
}

export function hasHindiCounterpart(enPath: string): boolean {
  return hindiPathFor(enPath) !== null;
}
