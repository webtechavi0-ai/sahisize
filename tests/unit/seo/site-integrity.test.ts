/**
 * Whole-site SEO integrity.
 *
 * Templates (always run): guide frontmatter, tool copy and the site strings that become
 * <title>/<meta description> on indexable pages.
 *
 * Built HTML in dist/ (runs when a build exists; CI builds before e2e):
 *  - every indexable page (no robots noindex) has a <title> <= 60 characters and a
 *    description of 70–160 characters; titles and descriptions are unique
 *  - every indexable page has a self-referencing absolute canonical
 *  - hreflang pairs are reciprocal, point at built indexable pages and carry x-default
 *  - the sitemap URLs equal the indexable pages exactly (no noindex page listed,
 *    no indexable page missing), and sitemap hreflang matches the page head
 * Kit pages, /report, /404, /offline and /tools/custom-preset are noindex and excluded.
 */
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { SITE_URL } from '@/config/site';
import {
  COMPRESS_KB_RANGES,
  COMPRESS_KB_TARGETS,
  JPG_PDF_KB_TARGETS,
  PDF_KB_TARGETS,
} from '@/config/tools';
import { compressImageCopy, compressKbCopy } from '@/components/tools/copy/compress';
import { increaseCopy } from '@/components/tools/copy/increase';
import { declarationCopy, signatureCopy, thumbCopy } from '@/components/tools/copy/ink';
import { compressRangeCopy, hasRangeCopy, mbToKbCopy } from '@/components/tools/copy/kb-ranges';
import { KB_SIZES_HI } from '@/components/tools/copy/kb-sizes-hi';
import { batchCopy, photoSheetCopy } from '@/components/tools/copy/more';
import { nameDateCopy } from '@/components/tools/copy/name-date';
import { PDF_KB_HINDI, compressPdfKbCopy, jpgToPdfKbCopy } from '@/components/tools/copy/pdf-kb';
import { compressPdfCopy, imagesToPdfCopy } from '@/components/tools/copy/pdf';
import { convertCopy, resizeCopy } from '@/components/tools/copy/resize-convert';
import { sizePageCopy } from '@/components/tools/copy/sizes';
import type { SizePresetPage } from '@/components/tools/size-presets';
import type { ToolCopy } from '@/components/tools/copy/types';

const ROOT = fileURLToPath(new URL('../../../', import.meta.url));
const DIST = join(ROOT, 'dist');
const TITLE_MAX = 60;
const DESC_MIN = 70;
const DESC_MAX = 160;
const BRAND = ' | SahiSize';

/** Length as a reader sees it (code points). */
const len = (s: string) => [...s].length;

function checkMeta(where: string, title: string, desc: string, bad: string[]): void {
  if (len(title) > TITLE_MAX) bad.push(`${where} title ${len(title)}: ${title}`);
  const n = len(desc);
  if (n < DESC_MIN || n > DESC_MAX) bad.push(`${where} description ${n}: ${desc}`);
}

// ---------------------------------------------------------------------------
// Templates
// ---------------------------------------------------------------------------

/** Frontmatter scalars of a guide (plain, single- or double-quoted YAML). */
function guideFrontmatter(file: string): Record<string, string> {
  const fm = readFileSync(file, 'utf8').match(/^---\n([\s\S]*?)\n---/)?.[1] ?? '';
  const out: Record<string, string> = {};
  for (const m of fm.matchAll(/^(\w+):[ \t]*(.+)$/gm)) {
    let v = m[2]!.trim();
    if (v.startsWith('"') && v.endsWith('"')) v = JSON.parse(v) as string;
    else if (v.startsWith("'") && v.endsWith("'")) v = v.slice(1, -1).replace(/''/g, "'");
    out[m[1]!] = v;
  }
  return out;
}

describe('templates: titles <= 60, descriptions 70–160', () => {
  it('guides (seoTitle, else "<title> | SahiSize")', () => {
    const bad: string[] = [];
    let n = 0;
    for (const lang of ['en', 'hi']) {
      const dir = join(ROOT, 'src/content/guides', lang);
      for (const f of readdirSync(dir).filter((x) => x.endsWith('.mdx'))) {
        const fm = guideFrontmatter(join(dir, f));
        if (fm.draft === 'true') continue;
        n++;
        checkMeta(`${lang}/${f}`, fm.seoTitle ?? `${fm.title}${BRAND}`, fm.description ?? '', bad);
      }
    }
    expect(n).toBeGreaterThanOrEqual(20);
    expect(bad).toEqual([]);
  });

  it('tool pages (en and hi copy)', () => {
    const copies: [string, ToolCopy][] = [
      ['compress-image', compressImageCopy('en')],
      ['hi compress-image', compressImageCopy('hi')],
      ['increase', increaseCopy('en')],
      ['hi increase', increaseCopy('hi')],
      ['signature', signatureCopy('en')],
      ['hi signature', signatureCopy('hi')],
      ['thumb', thumbCopy()],
      ['declaration', declarationCopy()],
      ['mb-to-kb', mbToKbCopy()],
      ['photo-sheet', photoSheetCopy()],
      ['batch', batchCopy()],
      ['name-date', nameDateCopy('en')],
      ['hi name-date', nameDateCopy('hi')],
      ['images-to-pdf', imagesToPdfCopy('en')],
      ['hi images-to-pdf', imagesToPdfCopy('hi')],
      ['compress-pdf', compressPdfCopy()],
      ['resize', resizeCopy('en')],
      ['hi resize', resizeCopy('hi')],
      ['convert', convertCopy()],
    ];
    const sizePages: SizePresetPage[] = [
      'photo-3-5x4-5-cm',
      'resize-image-in-cm',
      'resize-image-in-mm',
      'passport-size-photo',
      'postcard-size-photo',
      'stamp-size-photo',
    ];
    for (const p of sizePages) copies.push([p, sizePageCopy(p, 'en')]);
    for (const p of ['photo-3-5x4-5-cm', 'passport-size-photo'] as const)
      copies.push([`hi ${p}`, sizePageCopy(p, 'hi')]);
    for (const n of COMPRESS_KB_TARGETS) copies.push([`${n}kb`, compressKbCopy(n, 'en')]);
    for (const n of Object.keys(KB_SIZES_HI).map(Number))
      copies.push([`hi ${n}kb`, compressKbCopy(n, 'hi')]);
    for (const [a, b] of COMPRESS_KB_RANGES) {
      copies.push([`${a}-${b}kb`, compressRangeCopy(a, b, 'en')]);
      if (hasRangeCopy(a, b, 'hi')) copies.push([`hi ${a}-${b}kb`, compressRangeCopy(a, b, 'hi')]);
    }
    for (const n of PDF_KB_TARGETS) copies.push([`pdf ${n}kb`, compressPdfKbCopy(n, 'en')]);
    for (const n of PDF_KB_HINDI.compress) copies.push([`hi pdf ${n}kb`, compressPdfKbCopy(n, 'hi')]);
    for (const n of JPG_PDF_KB_TARGETS) copies.push([`jpg-pdf ${n}kb`, jpgToPdfKbCopy(n, 'en')]);
    for (const n of PDF_KB_HINDI.jpg) copies.push([`hi jpg-pdf ${n}kb`, jpgToPdfKbCopy(n, 'hi')]);

    const bad: string[] = [];
    for (const [where, c] of copies) checkMeta(where, c.title, c.description, bad);
    expect(bad).toEqual([]);
  });

  /** site.* sections whose pages are noindex: kit pages, /report, /404. */
  const NOINDEX_SECTIONS = new Set(['kit', 'report', 'notFound']);

  it('site strings used as page titles', () => {
    const bad: string[] = [];
    for (const lang of ['en', 'hi'] as const) {
      const site = JSON.parse(readFileSync(join(ROOT, `src/i18n/ns/site.${lang}.json`), 'utf8'))
        .site as Record<string, { title?: string; description?: string }>;
      for (const [k, v] of Object.entries(site)) {
        if (typeof v?.title !== 'string' || typeof v.description !== 'string') continue;
        if (NOINDEX_SECTIONS.has(k)) continue;
        // {count} is the number of published exams (two digits).
        const fill = (x: string) => x.replace(/\{count\}/g, '35');
        checkMeta(`${lang} site.${k}`, fill(v.title), fill(v.description), bad);
      }
    }
    expect(bad).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// Built pages
// ---------------------------------------------------------------------------

interface Page {
  /** URL path, e.g. "/exam/ibps-po", "/" or "/hi". */
  path: string;
  title: string | null;
  description: string | null;
  noindex: boolean;
  canonical: string | null;
  /** hreflang -> absolute href */
  alternates: Map<string, string>;
}

function htmlFiles(dir: string, out: string[] = []): string[] {
  for (const f of readdirSync(dir)) {
    const p = join(dir, f);
    if (statSync(p).isDirectory()) htmlFiles(p, out);
    else if (f.endsWith('.html')) out.push(p);
  }
  return out;
}

const decode = (s: string) =>
  s
    .replace(/&#x([0-9a-f]+);/gi, (_, h: string) => String.fromCodePoint(parseInt(h, 16)))
    .replace(/&#(\d+);/g, (_, n: string) => String.fromCodePoint(Number(n)))
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&');

/** "dist/exam/ibps-po.html" -> "/exam/ibps-po"; "index.html" -> "/"; "x/index.html" -> "/x". */
function urlPath(file: string): string {
  let p = relative(DIST, file).split(sep).join('/').replace(/\.html$/, '');
  if (p === 'index') return '/';
  p = p.replace(/\/index$/, '');
  return `/${p}`;
}

function attr(tag: string, name: string): string | null {
  const m = new RegExp(`\\s${name}="([^"]*)"`).exec(tag);
  return m ? decode(m[1]!) : null;
}

function parsePage(file: string): Page {
  const html = readFileSync(file, 'utf8');
  const head = html.slice(0, html.indexOf('</head>') + 1 || undefined);
  const tags = head.match(/<(?:meta|link)\b[^>]*>/g) ?? [];
  const title = /<title>([\s\S]*?)<\/title>/.exec(head)?.[1];
  let description: string | null = null;
  let noindex = false;
  let canonical: string | null = null;
  const alternates = new Map<string, string>();
  for (const t of tags) {
    if (t.startsWith('<meta')) {
      const name = attr(t, 'name');
      if (name === 'description') description = attr(t, 'content');
      if (name === 'robots' && /noindex/i.test(attr(t, 'content') ?? '')) noindex = true;
    } else {
      const rel = attr(t, 'rel');
      if (rel === 'canonical') canonical = attr(t, 'href');
      const hl = attr(t, 'hreflang');
      if (rel === 'alternate' && hl) alternates.set(hl, attr(t, 'href') ?? '');
    }
  }
  return {
    path: urlPath(file),
    title: title === undefined ? null : decode(title.trim()),
    description,
    noindex,
    canonical,
    alternates,
  };
}

const abs = (path: string) => `${SITE_URL}${path === '/' ? '/' : path}`;

function sitemapEntries(): { loc: string; alternates: Map<string, string> }[] {
  const index = readFileSync(join(DIST, 'sitemap-index.xml'), 'utf8');
  const out: { loc: string; alternates: Map<string, string> }[] = [];
  for (const m of index.matchAll(/<loc>([^<]+)<\/loc>/g)) {
    const file = join(DIST, new URL(decode(m[1]!)).pathname);
    const xml = readFileSync(file, 'utf8');
    for (const u of xml.matchAll(/<url>([\s\S]*?)<\/url>/g)) {
      const loc = decode(/<loc>([^<]+)<\/loc>/.exec(u[1]!)![1]!);
      const alternates = new Map<string, string>();
      for (const l of u[1]!.matchAll(/<xhtml:link\b[^>]*>/g))
        alternates.set(attr(l[0], 'hreflang')!, attr(l[0], 'href')!);
      out.push({ loc, alternates });
    }
  }
  return out;
}

const hasBuild = existsSync(join(DIST, 'index.html')) && existsSync(join(DIST, 'sitemap-index.xml'));

describe.skipIf(!hasBuild)('built site (dist/)', () => {
  const pages = hasBuild ? htmlFiles(DIST).map(parsePage) : [];
  const byUrl = new Map(pages.map((p) => [abs(p.path), p]));
  const indexable = pages.filter((p) => !p.noindex);
  const fail = (list: string[]) => expect(list).toEqual([]);

  it('finds the pages', () => {
    expect(indexable.length).toBeGreaterThan(250);
    // Kit pages are tool UI and must stay out of the index.
    for (const p of pages.filter((x) => /^\/(hi\/)?kit\//.test(x.path)))
      expect(p.noindex, p.path).toBe(true);
  });

  it(`indexable titles <= ${TITLE_MAX} and descriptions ${DESC_MIN}–${DESC_MAX}`, () => {
    const bad: string[] = [];
    for (const p of indexable) {
      if (!p.title) bad.push(`${p.path}: no <title>`);
      if (p.description === null) bad.push(`${p.path}: no description`);
      checkMeta(p.path, p.title ?? '', p.description ?? '', bad);
    }
    fail(bad);
  });

  it('no duplicate titles or descriptions across indexable pages', () => {
    const dups: string[] = [];
    for (const key of ['title', 'description'] as const) {
      const seen = new Map<string, string[]>();
      for (const p of indexable) {
        const v = p[key] ?? '';
        seen.set(v, [...(seen.get(v) ?? []), p.path]);
      }
      for (const [v, paths] of seen) if (paths.length > 1) dups.push(`${key} "${v}": ${paths.join(', ')}`);
    }
    fail(dups);
  });

  it('every indexable page has a self-referencing absolute canonical', () => {
    const bad: string[] = [];
    for (const p of indexable)
      if (p.canonical !== abs(p.path)) bad.push(`${p.path}: canonical ${p.canonical ?? '(none)'}`);
    fail(bad);
  });

  it('hreflang pairs are reciprocal, resolve to indexable pages and carry x-default', () => {
    const bad: string[] = [];
    for (const p of indexable) {
      if (p.alternates.size === 0) continue;
      const self = abs(p.path);
      if (![...p.alternates.values()].includes(self)) bad.push(`${p.path}: hreflang set omits itself`);
      if (!p.alternates.has('x-default')) bad.push(`${p.path}: no x-default`);
      for (const [lang, href] of p.alternates) {
        if (lang === 'x-default') continue;
        const target = byUrl.get(href);
        if (!target) {
          bad.push(`${p.path}: ${lang} -> ${href} is not a built page`);
          continue;
        }
        if (target.noindex) bad.push(`${p.path}: ${lang} -> ${href} is noindex`);
        if (target.alternates.get(lang) !== href)
          bad.push(`${p.path}: ${lang} -> ${href}, which does not list itself as ${lang}`);
        for (const [l2, h2] of p.alternates)
          if (target.alternates.get(l2) !== h2)
            bad.push(`${p.path}: ${href} does not return ${l2} -> ${h2}`);
      }
    }
    fail(bad);
  });

  it('sitemaps list exactly the indexable pages, with the page hreflang', () => {
    const entries = sitemapEntries();
    const locs = entries.map((e) => e.loc);
    const dupLocs = locs.filter((l, i) => locs.indexOf(l) !== i);
    const inSitemap = new Set(locs);
    const shouldBe = new Set(indexable.map((p) => abs(p.path)));
    const bad: string[] = dupLocs.map((l) => `listed twice: ${l}`);
    for (const l of inSitemap) {
      const p = byUrl.get(l);
      if (!p) bad.push(`sitemap URL is not a built page: ${l}`);
      else if (p.noindex) bad.push(`noindex page in sitemap: ${l}`);
    }
    for (const u of shouldBe) if (!inSitemap.has(u)) bad.push(`indexable page missing from sitemap: ${u}`);
    for (const e of entries) {
      const p = byUrl.get(e.loc);
      if (!p || p.noindex) continue;
      const a = [...e.alternates].sort().join(' ');
      const b = [...p.alternates].sort().join(' ');
      if (a !== b) bad.push(`${e.loc}: sitemap hreflang [${a}] != page [${b}]`);
    }
    fail(bad);
  });
});
