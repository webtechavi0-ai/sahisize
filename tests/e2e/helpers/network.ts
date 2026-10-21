/**
 * SPEC 5.3 / 16 "no request ever carries image bytes": watches every request in a browser
 * context (pages, dedicated workers, service worker where the engine supports it).
 *
 * A request is a violation when:
 *   - its body is over 1 KB, or
 *   - its body contains JPEG/PNG/PDF magic bytes (FFD8FF, 89504E47, %PDF), raw or as
 *     hex / base64 text, or
 *   - its host is neither first-party nor the configured analytics host.
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import type { BrowserContext, Request } from '@playwright/test';
import { ROOT } from './app';

export const MAX_BODY = 1024;

const MAGIC: { name: string; bytes: number[] }[] = [
  { name: 'JPEG', bytes: [0xff, 0xd8, 0xff] },
  { name: 'PNG', bytes: [0x89, 0x50, 0x4e, 0x47] },
  { name: 'PDF', bytes: [0x25, 0x50, 0x44, 0x46] },
];
const TEXT_MAGIC: { name: string; re: RegExp }[] = [
  { name: 'JPEG hex', re: /ffd8ff/i },
  { name: 'PNG hex', re: /89504e47/i },
  { name: 'JPEG base64', re: /\/9j\// },
  { name: 'PNG base64', re: /iVBORw0KGgo/ },
  { name: 'PDF base64', re: /JVBERi0/ },
];

function indexOf(hay: Uint8Array, needle: number[]): number {
  outer: for (let i = 0; i + needle.length <= hay.length; i++) {
    for (let j = 0; j < needle.length; j++) if (hay[i + j] !== needle[j]) continue outer;
    return i;
  }
  return -1;
}

/** Analytics host from src/config/analytics.ts (`host: 'https://…'`), or null when off. */
export function analyticsHost(): string | null {
  const src = readFileSync(join(ROOT, 'src/config/analytics.ts'), 'utf8');
  const m = /ANALYTICS[^=]*=\s*{[^}]*host:\s*'([^']*)'/s.exec(src);
  if (!m || !m[1]) return null;
  try {
    return new URL(m[1]).host;
  } catch {
    return null;
  }
}

export interface Violation {
  url: string;
  method: string;
  reason: string;
}

export function bodyViolations(body: Uint8Array | null): string[] {
  if (!body || body.length === 0) return [];
  const out: string[] = [];
  if (body.length > MAX_BODY) out.push(`body ${body.length} B > ${MAX_BODY} B`);
  for (const m of MAGIC) if (indexOf(body, m.bytes) >= 0) out.push(`body contains ${m.name} magic`);
  const text = Buffer.from(body).toString('latin1');
  for (const m of TEXT_MAGIC) if (m.re.test(text)) out.push(`body contains ${m.name} signature`);
  return out;
}

export class NetworkGuard {
  readonly violations: Violation[] = [];
  readonly seen: { url: string; method: string; bytes: number }[] = [];
  private readonly allowedHosts: Set<string>;

  constructor(ctx: BrowserContext, baseURL: string) {
    const first = new URL(baseURL).host;
    const hosts = [first];
    const a = analyticsHost();
    if (a) hosts.push(a);
    this.allowedHosts = new Set(hosts);
    ctx.on('request', (r) => this.check(r));
  }

  private check(r: Request) {
    const url = r.url();
    if (url.startsWith('data:') || url.startsWith('blob:') || url.startsWith('chrome-extension:')) return;
    const body = r.postDataBuffer();
    this.seen.push({ url, method: r.method(), bytes: body?.length ?? 0 });
    let host = '';
    try {
      host = new URL(url).host;
    } catch {
      this.violations.push({ url, method: r.method(), reason: 'unparseable URL' });
      return;
    }
    if (!this.allowedHosts.has(host)) {
      this.violations.push({ url, method: r.method(), reason: `third-party host ${host}` });
    }
    for (const reason of bodyViolations(body ? new Uint8Array(body) : null)) {
      this.violations.push({ url, method: r.method(), reason });
    }
  }
}
