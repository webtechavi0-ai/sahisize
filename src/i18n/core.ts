/**
 * Tiny, dependency-free i18n core. Safe to import from islands: it contains NO
 * strings. Pages pass an island only its namespace dictionary (getNamespace) and
 * the island builds a translator with createT(dict) (PLAN 3.11).
 */

export type Dict = { [key: string]: string | Dict };
export type Vars = Record<string, string | number>;

/** Look up a dot path ("ui.button.next") in a nested dictionary. */
export function lookup(dict: Dict, key: string): string | undefined {
  let cur: string | Dict | undefined = dict;
  for (const part of key.split('.')) {
    if (cur === undefined || typeof cur === 'string') return undefined;
    cur = cur[part];
  }
  return typeof cur === 'string' ? cur : undefined;
}

/** Replace {var} placeholders. Unknown placeholders are left as-is. */
export function interpolate(template: string, vars?: Vars): string {
  if (!vars) return template;
  return template.replace(/\{(\w+)\}/g, (m, name: string) =>
    Object.prototype.hasOwnProperty.call(vars, name) ? String(vars[name]) : m,
  );
}

/**
 * Translator over one or more dictionaries (first match wins), e.g.
 * createT(hiDict, enDict) for Hindi with English fallback.
 * A missing key returns the key itself so gaps are visible.
 */
export function createT(...dicts: Dict[]): (key: string, vars?: Vars) => string {
  return (key, vars) => {
    for (const d of dicts) {
      const v = lookup(d, key);
      if (v !== undefined) return interpolate(v, vars);
    }
    return key;
  };
}

/** Deep merge b into a copy of a (b wins). */
export function mergeDicts(a: Dict, b: Dict): Dict {
  const out: Dict = { ...a };
  for (const [k, v] of Object.entries(b)) {
    const prev = out[k];
    out[k] = typeof v === 'object' && typeof prev === 'object' ? mergeDicts(prev, v) : v;
  }
  return out;
}

/** Flatten to { "a.b.c": "value" }. */
export function flatten(dict: Dict, prefix = ''): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(dict)) {
    const key = prefix ? `${prefix}.${k}` : k;
    if (typeof v === 'string') out[key] = v;
    else Object.assign(out, flatten(v, key));
  }
  return out;
}

/**
 * Plural pick (en/hi need only one/other): n === 1 uses the sibling key `<key>One` when it
 * exists, else `<key>`. `n` is passed as a variable. Example keys: `steps` / `stepsOne`.
 */
export function plural(
  t: (key: string, vars?: Vars) => string,
  key: string,
  n: number,
  vars?: Vars,
): string {
  const all = { n, ...vars };
  if (n === 1) {
    const one = `${key}One`;
    const v = t(one, all);
    if (v !== one) return v;
  }
  return t(key, all);
}
