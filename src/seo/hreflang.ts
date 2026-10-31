/**
 * hreflang: en-IN <-> hi-IN pairs, emitted ONLY when the counterpart page exists.
 * x-default always points at the English page. Pure: callers pass the counterpart they
 * know exists (server/content `alternatesFor()` derives it from data).
 */
import { HTML_LANG, type Lang } from '@/i18n/config';
import { canonicalUrl } from './urls';

/** English and Hindi paths of one page. `hi: null` = no Hindi page. */
export interface Alternates {
  en: string;
  hi: string | null;
}

export type Hreflang = 'en-IN' | 'hi-IN' | 'x-default';

export interface HreflangLink {
  hreflang: Hreflang;
  href: string;
}

/** The three alternate links, or [] when there is no Hindi counterpart. */
export function hreflangLinks(alt: Alternates | null | undefined): HreflangLink[] {
  if (!alt?.hi) return [];
  return [
    { hreflang: 'en-IN', href: canonicalUrl(alt.en) },
    { hreflang: 'hi-IN', href: canonicalUrl(alt.hi) },
    { hreflang: 'x-default', href: canonicalUrl(alt.en) },
  ];
}

/** Next.js `alternates.languages` map, or undefined when there is no pair. */
export function languageAlternates(alt: Alternates | null | undefined): Record<Hreflang, string> | undefined {
  const links = hreflangLinks(alt);
  if (!links.length) return undefined;
  return Object.fromEntries(links.map((l) => [l.hreflang, l.href])) as Record<Hreflang, string>;
}

/** The page path in `lang` for an Alternates pair (falls back to English). */
export function pathFor(alt: Alternates, lang: Lang): string {
  return lang === 'hi' && alt.hi ? alt.hi : alt.en;
}

/** hreflang value of a language. */
export function hreflangOf(lang: Lang): Hreflang {
  return HTML_LANG[lang];
}
