/**
 * Page-weight budgets. Reads every prerendered page in .next/server/app/**\/*.html after
 * `npm run build` and measures, per page:
 *
 *   JS   = gzip size of every script the page loads up front: <script src> (except nomodule
 *          polyfills), <link rel=preload as=script>, <link rel=modulepreload>. Next lists every initial chunk in the HTML, so no
 *          import-graph walk is needed. Lazy chunks (engine worker, WASM, pdf.js, libheif) load
 *          only after a file is picked and are not counted.
 *   CSS  = gzip size of every <link rel=stylesheet>.
 *   total = gzip(HTML incl. inline RSC payload) + JS + CSS + fonts the page renders with
 *          (Inter 400/600/700, plus Noto Devanagari when the page has Devanagari text) + eager
 *          local <img> files.
 *
 * Budgets (KB gzip), re-baselined for Next.js 15 + React 19. The framework floor (react-dom,
 * Next client runtime, webpack runtime) is ~103 KB gz before any app code. Measured on the
 * previous Next build of this site (Oct 2026): content pages 146-150 KB JS, tool/document/kit
 * pages 169-185 KB JS, CSS 11 KB; Hindi pages add ~102 KB of Devanagari fonts to the total.
 * The budgets sit just above that baseline so the rewrite cannot regress past it:
 *
 *   type                                  JS    CSS   total
 *   content, index, guide, exam, home     165   30    400
 *   tool, exam-document, kit, id-document 200   30    440
 *
 * Raise a budget only with a written reason in the PR; never raise it to make a build pass.
 *
 *   npm run check:budgets
 *   tsx scripts/check-budgets.ts [--next-dir=.next] [--json]
 */
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';
import { gzipSync } from 'node:zlib';
import { parse } from 'node-html-parser';

const KB = 1024;
const ROOT = resolve(import.meta.dirname, '..');
const arg = (name: string) =>
  process.argv.find((a) => a.startsWith(`--${name}=`))?.slice(name.length + 3);
const NEXT_DIR = resolve(arg('next-dir') ?? join(ROOT, '.next'));
const APP_DIR = join(NEXT_DIR, 'server', 'app');
const STATIC_DIR = join(NEXT_DIR, 'static');
const PUBLIC_DIR = join(ROOT, 'public');
const JSON_OUT = process.argv.includes('--json');

type PageType =
  | 'home'
  | 'exams-index'
  | 'exam'
  | 'exam-document'
  | 'kit'
  | 'tool'
  | 'tools-index'
  | 'guide'
  | 'guides-index'
  | 'id-document'
  | 'content';

interface Budget {
  js: number;
  css: number;
  total: number;
}

const LIGHT: Budget = { js: 165 * KB, css: 30 * KB, total: 400 * KB };
const INTERACTIVE: Budget = { js: 200 * KB, css: 30 * KB, total: 440 * KB };

export const BUDGETS: Record<PageType, Budget> = {
  home: LIGHT,
  'exams-index': LIGHT,
  exam: LIGHT,
  'tools-index': LIGHT,
  'guides-index': LIGHT,
  guide: LIGHT,
  content: LIGHT,
  'exam-document': INTERACTIVE,
  kit: INTERACTIVE,
  tool: INTERACTIVE,
  'id-document': INTERACTIVE,
};

export function pageType(route: string): PageType {
  const r = route.replace(/^\/hi(?=\/|$)/, '') || '/';
  if (r === '/') return 'home';
  if (r === '/exams' || r.startsWith('/exams/')) return 'exams-index';
  if (/^\/exam\/[^/]+$/.test(r)) return 'exam';
  if (/^\/exam\/[^/]+\/[^/]+$/.test(r)) return 'exam-document';
  if (r.startsWith('/kit/')) return 'kit';
  if (r === '/tools') return 'tools-index';
  if (r.startsWith('/tools/')) return 'tool';
  if (r === '/guides') return 'guides-index';
  if (r.startsWith('/guides/')) return 'guide';
  if (r.startsWith('/id-documents/')) return 'id-document';
  return 'content';
}

/** .next/server/app/hi/exams.html -> /hi/exams ; index.html -> / ; route groups dropped. */
function routeOf(file: string): string {
  const rel = relative(APP_DIR, file)
    .replace(/\\/g, '/')
    .replace(/\.html$/, '');
  const segs = rel.split('/').filter((s) => !/^\(.*\)$/.test(s));
  const path = '/' + segs.join('/');
  return path === '/index' ? '/' : path;
}

function walk(dir: string, out: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    if (name.startsWith('_')) continue; // _not-found, _global-error
    const p = join(dir, name);
    if (statSync(p).isDirectory()) walk(p, out);
    else if (name.endsWith('.html')) out.push(p);
  }
  return out;
}

const gzCache = new Map<string, number>();
function gz(file: string): number {
  let v = gzCache.get(file);
  if (v === undefined) {
    v = gzipSync(readFileSync(file), { level: 9 }).length;
    gzCache.set(file, v);
  }
  return v;
}

/** Same-origin URL -> file on disk (/_next/static/* from .next/static, the rest from public). */
function localFile(url: string | undefined): string | null {
  if (!url || /^(https?:)?\/\//.test(url) || url.startsWith('data:')) return null;
  const clean = decodeURI(url.split(/[?#]/)[0]!);
  const file = clean.startsWith('/_next/static/')
    ? join(STATIC_DIR, clean.slice('/_next/static/'.length))
    : join(PUBLIC_DIR, clean);
  return existsSync(file) ? file : null;
}

const FONT = (n: string) => join(PUBLIC_DIR, 'fonts', n);
const INTER = ['inter-latin-400.woff2', 'inter-latin-600.woff2', 'inter-latin-700.woff2']
  .map(FONT)
  .filter((f) => existsSync(f));
const NOTO = ['noto-devanagari-400.woff2', 'noto-devanagari-600.woff2']
  .map(FONT)
  .filter((f) => existsSync(f));
const size = (f: string) => statSync(f).size;

interface Row {
  route: string;
  type: PageType;
  js: number;
  css: number;
  total: number;
  fail: string[];
}

function measure(htmlFile: string): Row {
  const html = readFileSync(htmlFile, 'utf8');
  const doc = parse(html);
  const scripts = new Set<string>();
  const styles = new Set<string>();
  const images = new Set<string>();

  for (const el of doc.querySelectorAll('script[src]')) {
    // Legacy-browser polyfills (<script nomodule>) are never fetched by modern browsers.
    if (el.hasAttribute('nomodule')) continue;
    const f = localFile(el.getAttribute('src'));
    if (f) scripts.add(f);
  }
  for (const el of doc.querySelectorAll('link[href]')) {
    const rel = (el.getAttribute('rel') ?? '').toLowerCase();
    const as = (el.getAttribute('as') ?? '').toLowerCase();
    const f = localFile(el.getAttribute('href'));
    if (!f) continue;
    if (rel === 'stylesheet' || (rel === 'preload' && as === 'style')) styles.add(f);
    else if (rel === 'modulepreload' || (rel === 'preload' && as === 'script')) scripts.add(f);
  }
  for (const el of doc.querySelectorAll('img[src]')) {
    if ((el.getAttribute('loading') ?? '') === 'lazy') continue;
    const f = localFile(el.getAttribute('src'));
    if (f) images.add(f);
  }

  const js = [...scripts].reduce((a, f) => a + gz(f), 0);
  const css = [...styles].reduce((a, f) => a + gz(f), 0);
  const fonts = [...INTER, ...(/[ऀ-ॿ]/.test(doc.querySelector('body')?.text ?? '') ? NOTO : [])];
  const total =
    gz(htmlFile) +
    js +
    css +
    fonts.reduce((a, f) => a + size(f), 0) +
    [...images].reduce((a, f) => a + size(f), 0);

  const route = routeOf(htmlFile);
  const type = pageType(route);
  const b = BUDGETS[type];
  const fail: string[] = [];
  const k = (n: number) => (n / KB).toFixed(1);
  if (js > b.js) fail.push(`JS ${k(js)} KB > ${b.js / KB} KB`);
  if (css > b.css) fail.push(`CSS ${k(css)} KB > ${b.css / KB} KB`);
  if (total > b.total) fail.push(`total ${k(total)} KB > ${b.total / KB} KB`);
  return { route, type, js, css, total, fail };
}

function main(): void {
  if (!existsSync(APP_DIR) || !existsSync(STATIC_DIR)) {
    console.error(`check-budgets: no build at ${NEXT_DIR} (run npm run build first)`);
    process.exit(2);
  }
  const rows = walk(APP_DIR).map(measure);
  if (!rows.length) {
    console.error(`check-budgets: no prerendered pages under ${APP_DIR}`);
    process.exit(2);
  }

  if (JSON_OUT) {
    console.log(JSON.stringify(rows, null, 1));
  } else {
    const byType = new Map<PageType, Row[]>();
    for (const r of rows) byType.set(r.type, [...(byType.get(r.type) ?? []), r]);
    const f = (n: number) => (n / KB).toFixed(1).padStart(6);
    console.log(`Budgets for ${rows.length} pages (KB gzip; total incl. HTML, fonts, images)\n`);
    console.log('page type        pages   max JS (bud)   max CSS (bud)  max total (bud)  heaviest');
    for (const [type, rs] of [...byType].sort(([a], [b]) => a.localeCompare(b))) {
      const max = (key: 'js' | 'css' | 'total') => rs.reduce((a, r) => (r[key] > a[key] ? r : a));
      const b = BUDGETS[type];
      console.log(
        `${type.padEnd(16)} ${String(rs.length).padStart(5)}  ${f(max('js').js)} (${b.js / KB})  ${f(max('css').css)} (${b.css / KB})  ${f(max('total').total)} (${b.total / KB})   ${max('total').route}`,
      );
    }
  }

  const failed = rows.filter((r) => r.fail.length);
  if (failed.length) {
    console.error(`\n${failed.length} page(s) over budget:`);
    for (const r of failed.slice(0, 50))
      console.error(`  ${r.route} [${r.type}]: ${r.fail.join('; ')}`);
    process.exit(1);
  }
  if (!JSON_OUT) console.log('\nAll pages within budget.');
}

main();
