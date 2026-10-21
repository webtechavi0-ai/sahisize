/**
 * ★ Frozen contract (Phase 1). i18n for Astro pages and build-time code (PLAN 3.11).
 *
 * Dictionaries: src/i18n/{en,hi}.json hold `common.*` (frozen after Phase 1);
 * every workstream writes only src/i18n/ns/<ns>.<lang>.json (QUESTIONS Q6).
 * Each file's root object holds exactly its namespace key, e.g. ui.en.json is
 * { "ui": { ... } }. Hindi falls back to English per key.
 *
 * Islands: do NOT import this module (it bundles every string). Pass
 * `getNamespace(lang, 'kit')` as a prop and use `createT` from './core'.
 * See src/i18n/KEYS.md.
 */
import { DEFAULT_LANG, LOCALES, type Lang } from '@/config/site';
import { createT, lookup, mergeDicts, type Dict, type Vars } from './core';
import enCommon from './en.json';
import hiCommon from './hi.json';
import uiEn from './ns/ui.en.json';
import uiHi from './ns/ui.hi.json';
import kitEn from './ns/kit.en.json';
import kitHi from './ns/kit.hi.json';
import siteEn from './ns/site.en.json';
import siteHi from './ns/site.hi.json';
import toolEn from './ns/tool.en.json';
import toolHi from './ns/tool.hi.json';
import guideEn from './ns/guide.en.json';
import guideHi from './ns/guide.hi.json';

export type { Lang } from '@/config/site';
export { createT, interpolate, type Dict, type Vars } from './core';

export const NAMESPACES = ['common', 'ui', 'kit', 'site', 'tool', 'guide'] as const;
export type Namespace = (typeof NAMESPACES)[number];

const SOURCES: Record<Lang, Dict[]> = {
  en: [enCommon, uiEn, kitEn, siteEn, toolEn, guideEn] as Dict[],
  hi: [hiCommon, uiHi, kitHi, siteHi, toolHi, guideHi] as Dict[],
};

const DICTS: Record<Lang, Dict> = {
  en: SOURCES.en.reduce(mergeDicts, {}),
  hi: SOURCES.hi.reduce(mergeDicts, {}),
};

const translators: Record<Lang, (key: string, vars?: Vars) => string> = {
  en: createT(DICTS.en),
  hi: createT(DICTS.hi, DICTS.en),
};

/** Translate `key` (dot path) for `lang`, with {var} interpolation and en fallback. */
export function t(lang: Lang, key: string, vars?: Vars): string {
  const out = translators[lang](key, vars);
  if (out === key && import.meta.env?.DEV) console.warn(`[i18n] missing key: ${key}`);
  return out;
}

/** Bound translator for a page: `const tr = useTranslations(lang); tr('common.actions.next')`. */
export function useTranslations(lang: Lang): (key: string, vars?: Vars) => string {
  return (key, vars) => t(lang, key, vars);
}

export function hasKey(lang: Lang, key: string): boolean {
  return lookup(DICTS[lang], key) !== undefined;
}

/**
 * One namespace's dictionary for an island prop, Hindi merged over English so
 * the island needs a single dict: `createT(dict)`. Returns `{ [ns]: {...} }`.
 */
export function getNamespace(lang: Lang, ...ns: Namespace[]): Dict {
  const out: Dict = {};
  for (const n of ns) {
    const en = DICTS.en[n];
    const local = DICTS[lang][n];
    const merged =
      typeof en === 'object'
        ? typeof local === 'object' && lang !== 'en'
          ? mergeDicts(en, local)
          : en
        : {};
    out[n] = merged;
  }
  return out;
}

// ---------------------------------------------------------------------------
// Routing helpers (`/` = English, `/hi/...` = Hindi, no trailing slash)
// ---------------------------------------------------------------------------

export function isLang(v: unknown): v is Lang {
  return typeof v === 'string' && (LOCALES as readonly string[]).includes(v);
}

/** Language of a URL or pathname: "/hi" or "/hi/..." -> 'hi', else 'en'. */
export function getLangFromUrl(url: URL | string): Lang {
  const path = typeof url === 'string' ? url : url.pathname;
  const first = path.split('/')[1];
  return first && first !== DEFAULT_LANG && isLang(first) ? first : DEFAULT_LANG;
}

/** Path without the language prefix: "/hi/exam/ibps-po" -> "/exam/ibps-po", "/hi" -> "/". */
export function stripLang(path: string): string {
  const m = path.match(/^\/(hi)(\/.*)?$/);
  if (!m) return path || '/';
  return m[2] && m[2] !== '/' ? m[2] : '/';
}

/**
 * Localise an English path: localizePath('/exam/ibps-po', 'hi') -> '/hi/exam/ibps-po';
 * localizePath('/', 'hi') -> '/hi'; localizePath('/hi/exams', 'en') -> '/exams'.
 * Query strings and hashes are preserved. Never adds a trailing slash.
 */
export function localizePath(path: string, lang: Lang): string {
  const m = path.match(/^([^?#]*)(.*)$/)!;
  const base = stripLang(m[1] || '/');
  const suffix = m[2] ?? '';
  if (lang === DEFAULT_LANG) return base + suffix;
  return (base === '/' ? `/${lang}` : `/${lang}${base}`) + suffix;
}
