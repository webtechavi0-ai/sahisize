/**
 * Static checks for public/_headers and public/_redirects (PLAN 3.12, R15, QUESTIONS Q10/Q21).
 * Runs in the vitest "node" project. Uses dist/ (when built) to check every real route.
 */
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join, relative } from 'node:path';
import { describe, expect, it } from 'vitest';
import { HEADER_CSP, PDF_WORKER_CSP, WORKER_CSP } from '../../src/config/csp';
import {
  HEADERS_FILE,
  REDIRECTS_FILE,
  ROOT,
  headersFor,
  matches,
  readHeaders,
  readRedirects,
  redirectFor,
} from './cf-pages';

const ORIGIN = 'https://sahisize.in';
const u = (path: string, origin = ORIGIN) => new URL(path, origin);
const rules = readHeaders();
const redirects = readRedirects();
const h = (path: string, origin?: string) => headersFor(rules, u(path, origin));

/** Headers whose value Pages may legitimately join from two rules (a second CSP policy). */
const MULTI_VALUE_OK = new Set(['content-security-policy']);

const DIST = join(ROOT, 'dist');
function distFiles(dir = DIST): string[] {
  if (!existsSync(dir)) return [];
  return readdirSync(dir, { withFileTypes: true }).flatMap((e) =>
    e.isDirectory() ? distFiles(join(dir, e.name)) : [join(dir, e.name)],
  );
}
const built = distFiles().map((f) => '/' + relative(DIST, f).split('\\').join('/'));
const htmlFiles = built.filter((p) => p.endsWith('.html'));
const cleanUrl = (file: string) =>
  file === '/index.html' ? '/' : file.replace(/\/index\.html$/, '').replace(/\.html$/, '');

/** Representative URLs: one of each route type plus asset types. */
const SAMPLE_PATHS = [
  '/',
  '/hi',
  '/exams',
  '/exam/ibps-po',
  '/exam/ibps-po/photo',
  '/kit/ibps-po',
  '/tools/compress-image-to-20kb',
  '/guides/exam-form-checklist',
  '/exams/ibps',
  '/id-documents/pan-card-photo-size',
  '/hi/kit/ibps-po',
  '/offline',
  '/404',
  '/sitemap-index.xml',
  '/robots.txt',
  '/_astro/Button.abc123.js',
  '/_astro/index.abc123.css',
  '/_astro/mozjpeg_enc-abc.wasm',
  '/_astro/workers/worker-abc.js',
  '/_astro/pdf.worker.min.abc.mjs',
  '/sw.js',
  '/workbox-9778d006.js',
  '/manifest.webmanifest',
  '/fonts/inter-latin-400.woff2',
  '/og/default.png',
  '/favicon.ico',
];

describe('_headers file', () => {
  it('stays well under the Cloudflare Pages 100-rule limit and parses cleanly', () => {
    expect(rules.length).toBeGreaterThan(0);
    expect(rules.length).toBeLessThan(100);
    for (const line of readFileSync(HEADERS_FILE, 'utf8').split('\n'))
      expect(line.length, 'Pages caps a _headers line at 2000 chars').toBeLessThanOrEqual(2000);
  });

  it('has no duplicate patterns and no header set twice within one rule', () => {
    const patterns = rules.map((r) => r.pattern);
    expect(new Set(patterns).size, 'duplicate URL pattern').toBe(patterns.length);
    for (const r of rules) {
      const names = r.set.map(([n]) => n.toLowerCase());
      expect(new Set(names).size, `${r.pattern} sets a header twice`).toBe(names.length);
      for (const n of [...names, ...r.detach])
        expect(n, `invalid header name in ${r.pattern}`).toMatch(/^[A-Za-z0-9-]+$/);
    }
  });

  it('uses wildcard rules only (no per-page rules, R15)', () => {
    for (const r of rules) {
      const path = r.pattern.replace(/^https?:\/\/[^/]+/, '');
      expect(
        path.includes('*') || path === '/sw.js' || path === '/manifest.webmanifest',
        `${r.pattern} is a per-page rule`,
      ).toBe(true);
    }
  });

  it('sends the security headers on every route type', () => {
    for (const p of SAMPLE_PATHS) {
      const x = h(p);
      expect(x.get('strict-transport-security'), p).toBe('max-age=31536000; includeSubDomains');
      expect(x.get('x-content-type-options'), p).toBe('nosniff');
      expect(x.get('referrer-policy'), p).toBe('strict-origin-when-cross-origin');
      expect(x.get('cross-origin-opener-policy'), p).toBe('same-origin');
      expect(x.get('x-frame-options'), p).toBe('DENY');
      expect(x.get('content-security-policy'), p).toMatch(/^frame-ancestors 'none'(, |$)/);
      const pp = x.get('permissions-policy') ?? '';
      expect(pp, p).toContain('camera=(self)'); // "Take photo"
      for (const off of ['microphone', 'geolocation', 'payment', 'usb'])
        expect(pp, `${p} ${off}`).toContain(`${off}=()`);
    }
  });

  it('header CSP is frame-ancestors only, so it cannot narrow the <meta> policy', () => {
    const csp = h('/').get('content-security-policy')!;
    expect(csp).toBe(HEADER_CSP);
    expect(HEADER_CSP).not.toMatch(/(default|script|style|connect|img|font|worker)-src/);
  });

  it('engine workers get their own WASM-capable CSP (Q10)', () => {
    const csp = h('/_astro/workers/worker-abc.js').get('content-security-policy');
    expect(csp).toBe(`${HEADER_CSP}, ${WORKER_CSP}`);
    expect(WORKER_CSP).toContain("'wasm-unsafe-eval'");
    // The pdf.js worker parses untrusted PDFs: no eval of any kind.
    expect(h('/_astro/pdf.worker.min.abc.mjs').get('content-security-policy')).toBe(
      `${HEADER_CSP}, ${PDF_WORKER_CSP}`,
    );
    expect(PDF_WORKER_CSP).not.toMatch(/eval/);
    // Normal chunks keep the plain header policy.
    expect(h('/_astro/Button.abc.js').get('content-security-policy')).toBe(HEADER_CSP);
  });

  it('caches HTML briefly and hashed assets for a year', () => {
    for (const p of ['/', '/exam/ibps-po', '/kit/ibps-po', '/hi', '/offline', '/robots.txt'])
      expect(h(p).get('cache-control'), p).toBe('public, max-age=0, must-revalidate');
    for (const p of [
      '/_astro/Button.abc123.js',
      '/_astro/index.abc123.css',
      '/_astro/mozjpeg_enc-abc.wasm',
      '/_astro/workers/worker-abc.js',
      '/workbox-9778d006.js',
    ])
      expect(h(p).get('cache-control'), p).toBe('public, max-age=31536000, immutable');
    expect(h('/sw.js').get('cache-control')).toBe('no-cache');
  });

  it('serves WASM and the manifest with the right content type', () => {
    expect(h('/_astro/mozjpeg_enc-abc.wasm').get('content-type')).toBe('application/wasm');
    expect(h('/manifest.webmanifest').get('content-type')).toBe('application/manifest+json');
    expect(h('/_astro/Button.abc.js').has('content-type')).toBe(false);
  });

  it('keeps dev pages and *.pages.dev hosts out of the index, never production', () => {
    expect(h('/dev/engine-smoke').get('x-robots-tag')).toMatch(/noindex/);
    expect(h('/', 'https://sahisize.pages.dev').get('x-robots-tag')).toMatch(/noindex/);
    expect(h('/exam/ibps-po', 'https://3f2a1b.sahisize.pages.dev').get('x-robots-tag')).toMatch(
      /noindex/,
    );
    expect(h('/').has('x-robots-tag')).toBe(false);
    expect(h('/exam/ibps-po', 'https://www.sahisize.in').has('x-robots-tag')).toBe(false);
  });

  it('no conflicting rules: no header ends up with two joined values (except CSP)', () => {
    const paths = new Set([...SAMPLE_PATHS, ...built, ...htmlFiles.map(cleanUrl)]);
    for (const p of paths) {
      const setBy = new Map<string, string[]>();
      for (const r of rules) {
        if (!matches(r.pattern, u(p))) continue;
        for (const d of r.detach) setBy.delete(d.toLowerCase());
        for (const [n] of r.set)
          setBy.set(n.toLowerCase(), [...(setBy.get(n.toLowerCase()) ?? []), r.pattern]);
      }
      for (const [n, by] of setBy)
        if (!MULTI_VALUE_OK.has(n)) expect(by, `${p}: ${n} set by several rules`).toHaveLength(1);
    }
  });

  it('every built .wasm and worker file is covered by its rule', () => {
    for (const p of built.filter((f) => f.endsWith('.wasm')))
      expect(h(p).get('content-type'), p).toBe('application/wasm');
    for (const p of built.filter((f) => f.startsWith('/_astro/workers/')))
      expect(h(p).get('content-security-policy'), p).toContain(WORKER_CSP);
    for (const p of built.filter((f) => f.startsWith('/_astro/pdf.worker')))
      expect(h(p).get('content-security-policy'), p).toContain(PDF_WORKER_CSP);
  });
});

describe('_redirects file', () => {
  it('parses, all rules are 301 to same-origin paths, within Pages limits', () => {
    expect(redirects.length).toBeGreaterThan(0);
    const dynamic = redirects.filter((r) => /[*:]/.test(r.from));
    expect(dynamic.length).toBeLessThanOrEqual(100);
    expect(redirects.length).toBeLessThanOrEqual(2100);
    for (const r of redirects) {
      expect(r.status, `line ${r.line}`).toBe(301);
      expect(r.to, `line ${r.line}`).toMatch(/^\/(?!\/)/);
    }
    expect(readFileSync(REDIRECTS_FILE, 'utf8')).not.toMatch(/^https?:\/\//m);
  });

  it.each([
    ['/index.html', '/'],
    ['/hi/index.html', '/hi'],
    ['/about.html', '/about'],
    ['/exam/ibps-po.html', '/exam/ibps-po'],
    ['/exam/ibps-po/photo.html', '/exam/ibps-po/photo'],
    ['/hi/kit/ibps-po.html', '/hi/kit/ibps-po'],
    ['/tools/', '/tools'],
    ['/exam/ibps-po/', '/exam/ibps-po'],
    ['/hi/', '/hi'],
  ])('%s → %s (301)', (from, to) => {
    expect(redirectFor(redirects, u(from))).toMatchObject({ to, status: 301 });
  });

  it.each(['/', '/hi', '/exams', '/exam/ibps-po/photo', '/_astro/x.js', '/sw.js', '/og/a.png'])(
    'leaves %s alone',
    (p) => {
      expect(redirectFor(redirects, u(p))).toBeNull();
    },
  );

  it('never loops: no destination is redirected again', () => {
    const probes = [
      ...htmlFiles,
      ...htmlFiles
        .map(cleanUrl)
        .filter((c) => c !== '/')
        .map((c) => c + '/'),
      '/index.html',
      '/a/b/c.html',
      '/a/b/',
    ];
    for (const p of probes) {
      const r = redirectFor(redirects, u(p));
      if (!r) continue;
      expect(redirectFor(redirects, u(r.to)), `${p} → ${r.to} redirects again`).toBeNull();
    }
  });

  it('every built page: .html form redirects to the clean URL, which is served directly', () => {
    for (const f of htmlFiles) {
      const clean = cleanUrl(f);
      expect(redirectFor(redirects, u(clean)), clean).toBeNull();
      expect(redirectFor(redirects, u(f))?.to, f).toBe(clean);
    }
  });
});
