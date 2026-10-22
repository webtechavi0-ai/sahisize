/**
 * Minimal model of Cloudflare Pages' `_headers` and `_redirects` (R15), shared by
 * headers.test.ts (static checks) and csp.spec.ts (which replays the headers on top of
 * `astro preview` responses, so the header CSP and the <meta> CSP are tested together).
 *
 * Semantics follow https://developers.cloudflare.com/pages/configuration/headers/ and
 * /redirects/: a rule line starts at column 0, header lines are indented; `*` is a greedy
 * splat, `:name` a placeholder for one segment (or one host label); every matching header
 * rule applies in file order; `! Name` detaches a header set earlier; a header set twice is
 * joined with ", "; the first matching redirect wins.
 */
import { readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

export const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
export const HEADERS_FILE = join(ROOT, 'public/_headers');
export const REDIRECTS_FILE = join(ROOT, 'public/_redirects');

export interface HeaderRule {
  pattern: string;
  line: number;
  set: [name: string, value: string][];
  detach: string[];
}

export interface RedirectRule {
  from: string;
  to: string;
  status: number;
  line: number;
}

export function parseHeaders(text: string): HeaderRule[] {
  const rules: HeaderRule[] = [];
  let cur: HeaderRule | null = null;
  text.split(/\r?\n/).forEach((raw, i) => {
    if (!raw.trim() || raw.trim().startsWith('#')) return;
    if (!/^\s/.test(raw)) {
      cur = { pattern: raw.trim(), line: i + 1, set: [], detach: [] };
      rules.push(cur);
      return;
    }
    if (!cur) throw new Error(`_headers:${i + 1}: header line before any URL pattern`);
    const l = raw.trim();
    if (l.startsWith('!')) {
      cur.detach.push(l.slice(1).trim());
      return;
    }
    const c = l.indexOf(':');
    if (c <= 0) throw new Error(`_headers:${i + 1}: expected "Name: value", got "${l}"`);
    cur.set.push([l.slice(0, c).trim(), l.slice(c + 1).trim()]);
  });
  return rules;
}

export function parseRedirects(text: string): RedirectRule[] {
  const out: RedirectRule[] = [];
  text.split(/\r?\n/).forEach((raw, i) => {
    const l = raw.trim();
    if (!l || l.startsWith('#')) return;
    const parts = l.split(/\s+/);
    if (parts.length < 2 || parts.length > 3)
      throw new Error(`_redirects:${i + 1}: expected "from to [status]", got "${l}"`);
    out.push({ from: parts[0]!, to: parts[1]!, status: Number(parts[2] ?? 302), line: i + 1 });
  });
  return out;
}

export const readHeaders = () => parseHeaders(readFileSync(HEADERS_FILE, 'utf8'));
export const readRedirects = () => parseRedirects(readFileSync(REDIRECTS_FILE, 'utf8'));

/** Compile a Pages pattern (path, or absolute URL with host) to a regex with named groups. */
export function patternRegex(pattern: string): RegExp {
  const esc = (s: string) => s.replace(/[.+?^${}()|[\]\\]/g, '\\$&');
  const toRe = (s: string, seg: string) =>
    esc(s)
      .replace(/\*/g, '(?<splat>.*)')
      .replace(/:([A-Za-z]\w*)/g, (_m, n: string) => `(?<${n}>${seg})`);
  const abs = /^https?:\/\/([^/]+)(\/.*)?$/.exec(pattern);
  if (abs) return new RegExp(`^${toRe(abs[1]!, '[^./]+')}${toRe(abs[2] ?? '/', '[^/]+')}$`);
  return new RegExp(`^${toRe(pattern, '[^/]+')}$`);
}

/** The subject a pattern is matched against: host+path for absolute patterns, else path. */
function subject(pattern: string, url: URL): string {
  return /^https?:\/\//.test(pattern) ? `${url.host}${url.pathname}` : url.pathname;
}

export function matches(pattern: string, url: URL): RegExpExecArray | null {
  return patternRegex(pattern).exec(subject(pattern, url));
}

/** Headers Pages adds to a response for `url` (lower-case names). */
export function headersFor(rules: HeaderRule[], url: URL): Map<string, string> {
  const out = new Map<string, string>();
  const seen = new Set<string>();
  for (const r of rules) {
    if (!matches(r.pattern, url)) continue;
    for (const d of r.detach) out.delete(d.toLowerCase());
    for (const [n, v] of r.set) {
      const k = n.toLowerCase();
      if (seen.has(k) && out.has(k)) out.set(k, `${out.get(k)}, ${v}`);
      else out.set(k, v);
      seen.add(k);
    }
  }
  return out;
}

/** First redirect for `url`, with the destination expanded; null when none applies. */
export function redirectFor(
  rules: RedirectRule[],
  url: URL,
): { to: string; status: number; rule: RedirectRule } | null {
  for (const r of rules) {
    const m = matches(r.from, url);
    if (!m) continue;
    const g = m.groups ?? {};
    const to = r.to.replace(/:([A-Za-z]\w*)/g, (_x, n: string) => g[n] ?? `:${n}`);
    return { to, status: r.status, rule: r };
  }
  return null;
}
