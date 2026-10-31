/**
 * Internal links on Hindi pages (SEO): point at the /hi/ counterpart of a route when that
 * page exists, else keep the English URL. `localizePath` (src/i18n) prefixes blindly;
 * this checks that the Hindi route is actually built.
 *
 *   localHref('/exam/ibps-po', 'hi')   -> '/hi/exam/ibps-po'   (in hi-top-exams)
 *   localHref('/exam/ibps-so', 'hi')   -> '/exam/ibps-so'      (no Hindi page)
 *   localHref('/report', 'hi')         -> '/report'            (English only)
 *   localHref('/tools/resize-image#x', 'hi') -> '/hi/tools/resize-image#x'
 *
 * Build-time only (reads Hindi guides from src/content). Not for islands.
 */
import { getGuides } from '@/content/loaders';
import type { Lang } from '@/config/site';
import { getKitDocuments, getPreset } from '@/content/presets';
import { hindiExamSlugs, hindiToolPath } from './hreflang';

/** Static (non-[param]) Hindi pages, by English path. Keep in sync with src/app/hi. */
const HI_STATIC_PAGES = new Set([
  '/',
  '/editorial-policy',
  '/exams',
  '/guides',
  '/id-documents',
  '/id-documents/pan-card-photo-size',
]);
function hasStaticHiPage(enPath: string): boolean {
  return HI_STATIC_PAGES.has(enPath);
}

/** Slugs of published Hindi guides. */
export function hindiGuideSlugs(): Set<string> {
  return new Set(getGuides('hi').map((g) => g.slug));
}

/** The Hindi path for an English site path when that Hindi page exists, else null. */
export function hindiPathFor(enPath: string): string | null {
  const p = enPath.replace(/(.)\/$/, '$1') || '/';
  if (p === '/hi' || p.startsWith('/hi/')) return p;
  let m: RegExpExecArray | null;
  if ((m = /^\/exam\/([a-z0-9-]+)$/.exec(p))) return hindiExamSlugs().includes(m[1]!) ? `/hi${p}` : null;
  if ((m = /^\/kit\/([a-z0-9-]+)$/.exec(p))) {
    const preset = getPreset(m[1]!);
    const ok = !!preset && hindiExamSlugs().includes(m[1]!) && getKitDocuments(preset).length > 0;
    return ok ? `/hi${p}` : null;
  }
  if ((m = /^\/guides\/([a-z0-9-]+)$/.exec(p))) return hindiGuideSlugs().has(m[1]!) ? `/hi${p}` : null;
  if (p === '/tools' || p.startsWith('/tools/')) return hindiToolPath(p);
  if (hasStaticHiPage(p)) return p === '/' ? '/hi' : `/hi${p}`;
  return null;
}

/**
 * The href to use on a page in `lang` for an English site path. On Hindi pages: the /hi/
 * counterpart when it exists, else the English path. On English pages: unchanged.
 * Query strings and #hashes are kept.
 */
export function localHref(enPath: string, lang: Lang): string {
  if (lang !== 'hi') return enPath;
  const m = /^([^?#]*)(.*)$/.exec(enPath)!;
  const hi = hindiPathFor(m[1] || '/');
  return (hi ?? m[1]) + (m[2] ?? '');
}
