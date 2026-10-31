/**
 * Page-weight budgets (SPEC 13, PLAN 3.16). For every HTML page in out/:
 *
 *   JS+CSS  = gzip size of every script and stylesheet the page loads before tool use:
 *             <script src>, <link rel=stylesheet|modulepreload>, plus their
 *             static `import` graph. Dynamic `import()` chunks
 *             (engine, WASM, pdfjs, libheif) load only when a file is picked and are excluded.
 *   total   = gzip(HTML) + JS+CSS + fonts the page will render with (Inter 400/600/700; the
 *             Noto Devanagari faces when the page has Devanagari text) + local <img> files.
 *
 * Budgets: JS+CSS ≤ 120 KB gz on exam, tool and kit pages; total ≤ 300 KB. Content pages get
 * the same numbers (stricter than SPEC, which only names exam/tool pages).
 *
 *   npm run budgets            # out/
 *   tsx scripts/check-budgets.ts path/to/out [--json]
 */
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative, resolve, dirname, posix } from 'node:path';
import { gzipSync } from 'node:zlib';

const KB = 1024;
const args = process.argv.slice(2);
const DIST = resolve(args.find((a) => !a.startsWith('--')) ?? 'out');
const JSON_OUT = args.includes('--json');

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
  | 'content';

const BUDGETS: Record<PageType, { jsCss: number; total: number }> = {
  home: { jsCss: 120 * KB, total: 300 * KB },
  'exams-index': { jsCss: 120 * KB, total: 300 * KB },
  exam: { jsCss: 120 * KB, total: 300 * KB },
  'exam-document': { jsCss: 120 * KB, total: 300 * KB },
  kit: { jsCss: 120 * KB, total: 300 * KB },
  tool: { jsCss: 120 * KB, total: 300 * KB },
  'tools-index': { jsCss: 120 * KB, total: 300 * KB },
  guide: { jsCss: 120 * KB, total: 300 * KB },
  'guides-index': { jsCss: 120 * KB, total: 300 * KB },
  content: { jsCss: 120 * KB, total: 300 * KB },
};

function pageType(route: string): PageType {
  const r = route.replace(/^\/hi(?=\/|$)/, '') || '/';
  if (r === '/') return 'home';
  if (r === '/exams') return 'exams-index';
  if (/^\/exam\/[^/]+$/.test(r)) return 'exam';
  if (/^\/exam\/[^/]+\/[^/]+$/.test(r)) return 'exam-document';
  if (r.startsWith('/kit/')) return 'kit';
  if (r === '/tools') return 'tools-index';
  if (r.startsWith('/tools/')) return 'tool';
  if (r === '/guides') return 'guides-index';
  if (r.startsWith('/guides/')) return 'guide';
  return 'content';
}

function walk(dir: string, out: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) {
      if (name === '_next' || name === 'og' || name === 'fonts' || name === 'dev') continue;
      walk(p, out);
    } else if (name.endsWith('.html')) out.push(p);
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

function local(url: string, fromFile?: string): string | null {
  if (/^(https?:)?\/\//.test(url) || url.startsWith('data:')) return null;
  const clean = url.split(/[?#]/)[0]!;
  const p = clean.startsWith('/') ? join(DIST, clean) : join(dirname(fromFile ?? DIST), clean);
  return existsSync(p) ? p : null;
}

/** Static import graph of an ES module (minified Vite output). */
function staticImports(file: string, seen: Set<string>) {
  if (seen.has(file)) return;
  seen.add(file);
  if (!file.endsWith('.js') && !file.endsWith('.mjs')) return;
  const src = readFileSync(file, 'utf8');
  // `import x from"./a.js"`, `import"./b.js"`, `export*from"./c.js"`; not `import("./d.js")`.
  const re = /(?:\bimport|\bexport)\s*(?:[\w${},*\s]+?\s*from\s*)?["']([^"']+\.m?js)["']/g;
  for (const m of src.matchAll(re)) {
    const idx = m.index ?? 0;
    if (src.slice(idx, idx + 7) === 'import(') continue;
    const dep = m[1]!.startsWith('.')
      ? posix.join(posix.dirname('/' + relative(DIST, file)), m[1]!)
      : m[1]!;
    const p = local(dep);
    if (p) staticImports(p, seen);
  }
}

const attr = (tag: string, name: string) =>
  new RegExp(`\\b${name}\\s*=\\s*"([^"]*)"`, 'i').exec(tag)?.[1] ?? null;

interface Row {
  route: string;
  type: PageType;
  jsCss: number;
  total: number;
  files: number;
  fail: string[];
}

const FONT = (n: string) => join(DIST, 'fonts', n);
const INTER = ['inter-latin-400.woff2', 'inter-latin-600.woff2', 'inter-latin-700.woff2']
  .map(FONT)
  .filter(existsSync);
const NOTO = ['noto-devanagari-400.woff2', 'noto-devanagari-600.woff2']
  .map(FONT)
  .filter(existsSync);
const size = (f: string) => statSync(f).size;

function measure(htmlFile: string): Row {
  const html = readFileSync(htmlFile, 'utf8');
  const rel = '/' + relative(DIST, htmlFile).replace(/\\/g, '/');
  const route =
    rel === '/index.html' ? '/' : rel.replace(/\/index\.html$/, '').replace(/\.html$/, '');
  const assets = new Set<string>();
  for (const tag of html.match(/<script\b[^>]*>/gi) ?? []) {
    const s = attr(tag, 'src');
    const p = s && local(s, htmlFile);
    if (p) staticImports(p, assets);
  }
  for (const tag of html.match(/<link\b[^>]*>/gi) ?? []) {
    const relv = (attr(tag, 'rel') ?? '').toLowerCase();
    if (relv !== 'stylesheet' && relv !== 'modulepreload') continue;
    const p = local(attr(tag, 'href') ?? '', htmlFile);
    if (p) staticImports(p, assets);
  }
  const jsCss = [...assets].filter((f) => /\.(m?js|css)$/.test(f)).reduce((a, f) => a + gz(f), 0);
  const text = html.replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>|<[^>]+>/g, ' ');
  const fonts = [...INTER, ...(/[ऀ-ॿ]/.test(text) ? NOTO : [])];
  const imgs = new Set<string>();
  for (const tag of html.match(/<img\b[^>]*>/gi) ?? []) {
    if (/loading\s*=\s*"lazy"/i.test(tag)) continue;
    const p = local(attr(tag, 'src') ?? '', htmlFile);
    if (p) imgs.add(p);
  }
  const total =
    gz(htmlFile) +
    jsCss +
    fonts.reduce((a, f) => a + size(f), 0) +
    [...imgs].reduce((a, f) => a + size(f), 0);
  const type = pageType(route);
  const b = BUDGETS[type];
  const fail: string[] = [];
  if (jsCss > b.jsCss) fail.push(`JS+CSS ${(jsCss / KB).toFixed(1)} KB > ${b.jsCss / KB} KB`);
  if (total > b.total) fail.push(`total ${(total / KB).toFixed(1)} KB > ${b.total / KB} KB`);
  return { route, type, jsCss, total, files: assets.size, fail };
}

if (!existsSync(join(DIST, 'index.html'))) {
  console.error(`check-budgets: no build at ${DIST} (run npm run build first)`);
  process.exit(2);
}

const rows = walk(DIST).map(measure);
const byType = new Map<PageType, Row[]>();
for (const r of rows) byType.set(r.type, [...(byType.get(r.type) ?? []), r]);

if (JSON_OUT) {
  console.log(JSON.stringify(rows, null, 1));
} else {
  const f = (n: number) => (n / KB).toFixed(1).padStart(6);
  console.log(
    `Budgets for ${rows.length} pages in ${relative(process.cwd(), DIST) || '.'} (KB gzip; total incl. fonts/images)\n`,
  );
  console.log('page type        pages  max JS+CSS (budget)   max total (budget)   heaviest page');
  for (const [type, rs] of [...byType].sort()) {
    const mj = rs.reduce((a, r) => (r.jsCss > a.jsCss ? r : a));
    const mt = rs.reduce((a, r) => (r.total > a.total ? r : a));
    const b = BUDGETS[type];
    console.log(
      `${type.padEnd(16)} ${String(rs.length).padStart(5)}  ${f(mj.jsCss)} (${b.jsCss / KB})        ${f(mt.total)} (${b.total / KB})        ${mt.route}`,
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
