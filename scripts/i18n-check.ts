/**
 * i18n key check. Runs in CI via `npm run i18n:check`.
 *  - Values must be strings, no HTML tags; keys lowerCamel (or an UPPER_CASE error code).
 *  - Every hi key must exist in en (extra hi key -> ERROR).
 *  - en key missing in hi -> WARNING (falls back to English).
 *  - {placeholders} in hi must be a subset of the en ones -> ERROR otherwise.
 */
import { flatten, type Dict } from '../src/i18n/core';
import { NAMESPACES, RAW_MESSAGES } from '../src/i18n/messages';

const errors: string[] = [];
const warnings: string[] = [];

function check(ns: string, lang: string, v: unknown, path: string): void {
  const where = `${lang}/${ns}.json: ${path}`;
  if (typeof v === 'string') {
    if (/<\/?[a-z][^>]*>/i.test(v)) errors.push(`${where}: HTML is not allowed in values`);
    return;
  }
  if (typeof v !== 'object' || v === null || Array.isArray(v)) {
    errors.push(`${where}: values must be strings or objects`);
    return;
  }
  for (const [k, c] of Object.entries(v)) {
    if (!/^[a-z][A-Za-z0-9]*$|^[A-Z][A-Z0-9_]*$/.test(k))
      errors.push(`${where}.${k}: key must be lowerCamel (or an UPPER_CASE error code)`);
    check(ns, lang, c, path ? `${path}.${k}` : k);
  }
}

const placeholders = (s: string) => new Set([...s.matchAll(/\{(\w+)\}/g)].map((m) => m[1]!));

let total = 0;
for (const ns of NAMESPACES) {
  const enDict: Dict = RAW_MESSAGES.en[ns];
  const hiDict: Dict = RAW_MESSAGES.hi[ns];
  check(ns, 'en', enDict, '');
  check(ns, 'hi', hiDict, '');
  const e = flatten(enDict);
  const h = flatten(hiDict);
  total += Object.keys(e).length;
  for (const k of Object.keys(h)) {
    if (!(k in e)) errors.push(`${ns}: "${k}" exists in hi but not en`);
    else {
      const extra = [...placeholders(h[k]!)].filter((p) => !placeholders(e[k]!).has(p));
      if (extra.length)
        errors.push(`${ns}: "${k}" hi uses unknown placeholder(s) ${extra.join(', ')}`);
    }
  }
  for (const k of Object.keys(e))
    if (!(k in h)) warnings.push(`${ns}: "${k}" missing in hi (falls back to en)`);
}

for (const w of warnings) console.warn(`warn  ${w}`);
for (const e of errors) console.error(`error ${e}`);
console.log(`i18n: ${total} en keys, ${warnings.length} warning(s), ${errors.length} error(s)`);
process.exit(errors.length ? 1 : 0);
