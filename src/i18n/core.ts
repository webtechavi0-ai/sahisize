/**
 * Dependency-free translation core shared by server.ts and client.tsx. Holds NO strings.
 */

export type Dict = { [key: string]: string | Dict };
export type Vars = Record<string, string | number>;
export type TFunction = (key: string, vars?: Vars) => string;

/** Look up a dot path ("actions.next") in a nested dictionary. */
export function lookup(dict: Dict, key: string): string | undefined {
  let cur: string | Dict | undefined = dict;
  for (const part of key.split('.')) {
    if (cur === undefined || typeof cur === 'string') return undefined;
    cur = cur[part];
  }
  return typeof cur === 'string' ? cur : undefined;
}

/** Replace {var} placeholders. Unknown placeholders are left as they are. */
export function interpolate(template: string, vars?: Vars): string {
  if (!vars) return template;
  return template.replace(/\{(\w+)\}/g, (m, name: string) =>
    Object.prototype.hasOwnProperty.call(vars, name) ? String(vars[name]) : m,
  );
}

/**
 * Translator over one or more dictionaries (first match wins). A missing key returns the
 * key itself so gaps are visible on the page.
 */
export function createT(...dicts: Dict[]): TFunction {
  return (key, vars) => {
    for (const d of dicts) {
      const v = lookup(d, key);
      if (v !== undefined) return interpolate(v, vars);
    }
    return key;
  };
}

/** Translator scoped to a namespace prefix: scopeT(t, 'kit')('upload.title') === t('kit.upload.title'). */
export function scopeT(t: TFunction, prefix: string | undefined): TFunction {
  if (!prefix) return t;
  return (key, vars) => {
    const full = `${prefix}.${key}`;
    const out = t(full, vars);
    return out === full ? key : out;
  };
}

/** Deep merge `b` into a copy of `a` (`b` wins). */
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
 * exists, else `<key>`. `n` is passed as a variable.
 */
export function plural(t: TFunction, key: string, n: number, vars?: Vars): string {
  const all = { n, ...vars };
  if (n === 1) {
    const one = `${key}One`;
    const v = t(one, all);
    if (v !== one) return v;
  }
  return t(key, all);
}
