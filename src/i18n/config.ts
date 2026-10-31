/**
 * Locale constants and URL helpers. Pure and client-safe: no strings, no React.
 *
 * Routing: English is served at `/`, Hindi under `/hi/...`. No trailing slash, ever.
 */

export const LOCALES = ['en', 'hi'] as const;
export type Lang = (typeof LOCALES)[number];
export const DEFAULT_LANG: Lang = 'en';

/** `<html lang>` and hreflang values. */
export const HTML_LANG: Record<Lang, 'en-IN' | 'hi-IN'> = { en: 'en-IN', hi: 'hi-IN' };
/** Open Graph `og:locale` values. */
export const OG_LOCALE: Record<Lang, 'en_IN' | 'hi_IN'> = { en: 'en_IN', hi: 'hi_IN' };

export function isLang(v: unknown): v is Lang {
  return typeof v === 'string' && (LOCALES as readonly string[]).includes(v);
}

export function otherLang(lang: Lang): Lang {
  return lang === 'en' ? 'hi' : 'en';
}

/** Language of a pathname: "/hi" or "/hi/..." -> 'hi', everything else 'en'. */
export function getLangFromPath(pathname: string): Lang {
  return /^\/hi(?:[/?#]|$)/.test(pathname) ? 'hi' : 'en';
}

/** Path without the language prefix: "/hi/exam/ibps-po" -> "/exam/ibps-po", "/hi" -> "/". */
export function stripLocale(path: string): string {
  const m = /^\/hi(\/[^?#]*)?([?#].*)?$/.exec(path);
  if (!m) return path || '/';
  const base = m[1] && m[1] !== '/' ? m[1] : '/';
  return base + (m[2] ?? '');
}

/**
 * Prefix a site path for `lang` WITHOUT checking that the page exists:
 *   localizePath('/exam/ibps-po', 'hi') -> '/hi/exam/ibps-po'
 *   localizePath('/', 'hi')             -> '/hi'
 *   localizePath('/hi/exams', 'en')     -> '/exams'
 * Query strings and #hashes are kept; never adds a trailing slash. Absolute URLs and
 * non-path hrefs (mailto:, #x) are returned unchanged.
 *
 * For links in page content use `localHref` from '@/server/content' (it falls back to the
 * English URL when the Hindi page does not exist).
 */
export function localizePath(path: string, lang: Lang): string {
  if (!path.startsWith('/') || path.startsWith('//')) return path;
  const m = /^([^?#]*)(.*)$/.exec(path)!;
  const base = stripLocale(m[1] || '/');
  const suffix = m[2] ?? '';
  const clean = base.length > 1 ? base.replace(/\/+$/, '') : base;
  if (lang === DEFAULT_LANG) return clean + suffix;
  return (clean === '/' ? `/${lang}` : `/${lang}${clean}`) + suffix;
}
