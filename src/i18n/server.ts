/**
 * Translations for server components, metadata and route handlers. Holds every string,
 * so it is server-only; client components get a minimal subset via `getMessages()` and
 * `<I18nProvider>` (./client.tsx).
 *
 *   const t = getT(lang, 'site');           t('home.panPhoto')
 *   const t = getT(lang);                   t('site.home.panPhoto')
 *   t('kbRange', { min: 20, max: 50 })      // {var} interpolation
 *
 * Hindi falls back to English per key. A missing key returns the key itself.
 */
import 'server-only';
import { DEFAULT_LANG, type Lang } from './config';
import { createT, lookup, mergeDicts, scopeT, type Dict, type TFunction, type Vars } from './core';
import { NAMESPACES, RAW_MESSAGES, type Namespace } from './messages';

export { NAMESPACES, type Namespace } from './messages';
export type { Dict, TFunction, Vars } from './core';

/** Messages handed to a client provider: `{ [namespace]: dict }`, Hindi merged over English. */
export type Messages = Partial<Record<Namespace, Dict>>;

function build(lang: Lang): Dict {
  const out: Dict = {};
  for (const ns of NAMESPACES) {
    const en = RAW_MESSAGES.en[ns];
    out[ns] = lang === DEFAULT_LANG ? en : mergeDicts(en, RAW_MESSAGES[lang][ns]);
  }
  return out;
}

const DICTS: Record<Lang, Dict> = { en: build('en'), hi: build('hi') };
const TRANSLATORS: Record<Lang, TFunction> = { en: createT(DICTS.en), hi: createT(DICTS.hi) };

/** Translate a full key ("common.actions.next") for `lang`. */
export function t(lang: Lang, key: string, vars?: Vars): string {
  const out = TRANSLATORS[lang](key, vars);
  if (out === key && process.env.NODE_ENV === 'development') console.warn(`[i18n] missing key: ${key}`);
  return out;
}

/** Bound translator. With `ns`, keys are relative to that namespace. */
export function getT(lang: Lang, ns?: Namespace): TFunction {
  const base: TFunction = (key, vars) => t(lang, key, vars);
  return scopeT(base, ns);
}

export function hasKey(lang: Lang, key: string): boolean {
  return lookup(DICTS[lang], key) !== undefined;
}

/**
 * The namespaces a client subtree needs, for `<I18nProvider messages={...}>`. Pass only
 * what the widget uses: everything passed is serialized into the page.
 */
export function getMessages(lang: Lang, namespaces: readonly Namespace[]): Messages {
  const out: Messages = {};
  for (const ns of namespaces) out[ns] = DICTS[lang][ns] as Dict;
  return out;
}
