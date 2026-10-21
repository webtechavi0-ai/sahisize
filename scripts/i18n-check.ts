/**
 * i18n key check (PLAN 2, 3.11). Runs in CI via `npm run i18n:check`.
 *  - Each file's root must be exactly its namespace key (en.json/hi.json -> "common").
 *  - Values must be strings, no HTML tags.
 *  - Every hi key must exist in en (extra hi key -> ERROR).
 *  - en key missing in hi -> WARNING (falls back to English).
 *  - {placeholders} in hi must be a subset of the en ones -> ERROR otherwise.
 */
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { flatten, type Dict } from '../src/i18n/core';

const dir = fileURLToPath(new URL('../src/i18n/', import.meta.url));
const errors: string[] = [];
const warnings: string[] = [];

function load(file: string, expectedNs: string): Record<string, string> {
  let json: unknown;
  try {
    json = JSON.parse(readFileSync(file, 'utf8'));
  } catch (e) {
    errors.push(`${file}: invalid JSON (${(e as Error).message})`);
    return {};
  }
  if (typeof json !== 'object' || json === null || Array.isArray(json)) {
    errors.push(`${file}: root must be an object`);
    return {};
  }
  const roots = Object.keys(json);
  if (roots.some((r) => r !== expectedNs))
    errors.push(`${file}: root keys must be only "${expectedNs}", found ${JSON.stringify(roots)}`);
  const check = (v: unknown, path: string) => {
    if (typeof v === 'string') {
      if (/<\/?[a-z][^>]*>/i.test(v))
        errors.push(`${file}: ${path}: HTML is not allowed in values`);
      return;
    }
    if (typeof v !== 'object' || v === null || Array.isArray(v)) {
      errors.push(`${file}: ${path}: values must be strings or objects`);
      return;
    }
    for (const [k, c] of Object.entries(v)) {
      if (!/^[a-z][A-Za-z0-9]*$|^[A-Z][A-Z0-9_]*$/.test(k))
        errors.push(`${file}: ${path}.${k}: key must be lowerCamel (or an UPPER_CASE error code)`);
      check(c, path ? `${path}.${k}` : k);
    }
  };
  check(json, '');
  return flatten(json as Dict);
}

const placeholders = (s: string) => new Set([...s.matchAll(/\{(\w+)\}/g)].map((m) => m[1]!));

const pairs: { ns: string; en: string; hi: string }[] = [
  { ns: 'common', en: join(dir, 'en.json'), hi: join(dir, 'hi.json') },
];
const nsDir = join(dir, 'ns');
for (const f of readdirSync(nsDir)) {
  const m = f.match(/^([a-z]+)\.en\.json$/);
  if (m) pairs.push({ ns: m[1]!, en: join(nsDir, f), hi: join(nsDir, `${m[1]}.hi.json`) });
  else if (!/^[a-z]+\.hi\.json$/.test(f))
    errors.push(`ns/${f}: unexpected file name (use <ns>.<en|hi>.json)`);
}

let total = 0;
for (const { ns, en, hi } of pairs) {
  const e = load(en, ns);
  const h = load(hi, ns);
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
