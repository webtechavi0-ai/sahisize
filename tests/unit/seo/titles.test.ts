/**
 * Search-snippet limits for the pages this repo's SEO templates own: exam pages (en + hi),
 * exam document pages, exam-family hubs and the home pages. Titles <= 60 characters
 * (Google truncates beyond that), descriptions 120–155. Tool, guide and kit pages are
 * out of scope here.
 *
 * Two layers:
 *  1. Templates, for every published preset (always runs).
 *  2. The built HTML in dist/ (runs when a build exists; CI builds after unit tests).
 * Also checks that the keyword-map primary keyword reaches the title, H1 and intro.
 */
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { getKitDocuments, getPublishedPresets } from '@/content/presets';
import { hasHindiExam } from '@/seo/hreflang';
import {
  DESC_MAX,
  DESC_MIN,
  TITLE_MAX,
  examDocMeta,
  examH1,
  examMeta,
  textLength,
} from '@/seo/meta';
import { examSeo, examSeoSlugs } from '@/seo/exam-seo';
import { FAMILIES, hubFamilies } from '@/seo/families';

const ROOT = fileURLToPath(new URL('../../../', import.meta.url));
const DIST = join(ROOT, 'dist');

/** Minimal frontmatter reader for the hub copy (single-quoted YAML scalars). */
function frontmatter(file: string): Record<string, string> {
  const src = readFileSync(file, 'utf8');
  const fm = src.match(/^---\n([\s\S]*?)\n---/)?.[1] ?? '';
  const out: Record<string, string> = {};
  for (const m of fm.matchAll(/^(\w+): '((?:[^']|'')*)'$/gm))
    out[m[1]!] = m[2]!.replace(/''/g, "'");
  return out;
}

function siteStrings(lang: 'en' | 'hi'): { title: string; description: string } {
  const j = JSON.parse(readFileSync(join(ROOT, `src/i18n/ns/site.${lang}.json`), 'utf8'));
  return j.site.home;
}

const presets = getPublishedPresets();
const fail = (list: string[]) => expect(list).toEqual([]);

describe('title and description templates', () => {
  it(`exam titles <= ${TITLE_MAX} and descriptions ${DESC_MIN}–${DESC_MAX} (en)`, () => {
    const bad: string[] = [];
    for (const p of presets) {
      const m = examMeta(p, 'en');
      if (textLength(m.title) > TITLE_MAX)
        bad.push(`${p.slug} title ${textLength(m.title)}: ${m.title}`);
      const n = textLength(m.description);
      if (n < DESC_MIN || n > DESC_MAX) bad.push(`${p.slug} description ${n}: ${m.description}`);
    }
    fail(bad);
  });

  it(`Hindi exam titles <= ${TITLE_MAX} and descriptions <= ${DESC_MAX}`, () => {
    const bad: string[] = [];
    for (const p of presets.filter((x) => hasHindiExam(x.slug))) {
      const m = examMeta(p, 'hi');
      if (textLength(m.title) > TITLE_MAX)
        bad.push(`${p.slug} title ${textLength(m.title)}: ${m.title}`);
      if (textLength(m.description) > DESC_MAX) bad.push(`${p.slug} description: ${m.description}`);
    }
    fail(bad);
  });

  it(`document titles <= ${TITLE_MAX} and descriptions ${DESC_MIN}–${DESC_MAX}`, () => {
    const bad: string[] = [];
    let count = 0;
    for (const p of presets) {
      for (const d of getKitDocuments(p)) {
        count++;
        const m = examDocMeta(p, d, 'en');
        if (textLength(m.title) > TITLE_MAX) bad.push(`${p.slug}/${d.doc} title: ${m.title}`);
        const n = textLength(m.description);
        if (n < DESC_MIN || n > DESC_MAX)
          bad.push(`${p.slug}/${d.doc} description ${n}: ${m.description}`);
      }
    }
    expect(count).toBeGreaterThan(100);
    fail(bad);
  });

  it('document titles are unique', () => {
    const seen = new Map<string, string>();
    const dup: string[] = [];
    for (const p of presets)
      for (const d of getKitDocuments(p)) {
        const t = examDocMeta(p, d).title;
        if (seen.has(t)) dup.push(`${t} (${seen.get(t)} and ${p.slug})`);
        seen.set(t, p.slug);
      }
    fail(dup);
  });

  it('hub and home titles and descriptions fit', () => {
    const bad: string[] = [];
    const check = (where: string, title: string, desc: string, minDesc = DESC_MIN) => {
      const full =
        title.endsWith('SahiSize') || textLength(`${title} | SahiSize`) > TITLE_MAX
          ? title
          : `${title} | SahiSize`;
      if (textLength(full) > TITLE_MAX) bad.push(`${where} title: ${full}`);
      const n = textLength(desc);
      if (n < minDesc || n > DESC_MAX) bad.push(`${where} description ${n}: ${desc}`);
    };
    for (const f of hubFamilies()) {
      const fm = frontmatter(join(ROOT, `src/content/hub-copy/en/${f.slug}.md`));
      check(`/exams/${f.slug}`, fm.title!, fm.description!);
    }
    check('/', siteStrings('en').title, siteStrings('en').description);
    check('/hi', siteStrings('hi').title, siteStrings('hi').description, 0);
    fail(bad);
  });
});

describe('keyword map: primary keyword in title, H1 and intro', () => {
  const has = (s: string | undefined, kw: string) =>
    (s ?? '').toLowerCase().replace(/×/g, 'x').includes(kw.toLowerCase());

  it('exam pages', () => {
    const bad: string[] = [];
    for (const slug of examSeoSlugs()) {
      const p = presets.find((x) => x.slug === slug);
      const seo = examSeo(slug)!;
      expect(p, `${slug} is published`).toBeTruthy();
      const words = seo.keyword.split(' ');
      // The title and H1 carry the keyword's words in order (a year or exam name may sit between them).
      const inOrder = (s: string) =>
        new RegExp(
          words.map((w) => w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('.{0,24}'),
          'i',
        ).test(s);
      if (!inOrder(examMeta(p!).title)) bad.push(`${slug} title: ${examMeta(p!).title}`);
      if (!inOrder(examH1(p!))) bad.push(`${slug} h1: ${examH1(p!)}`);
      if (!has(seo.intro, seo.keyword)) bad.push(`${slug} intro`);
      if (!has(seo.description, seo.keyword)) bad.push(`${slug} description`);
    }
    fail(bad);
  });

  it('hubs', () => {
    const bad: string[] = [];
    for (const f of FAMILIES) {
      const fm = frontmatter(join(ROOT, `src/content/hub-copy/en/${f.slug}.md`));
      for (const k of ['title', 'h1', 'intro', 'description'])
        if (!has(fm[k], f.keyword)) bad.push(`${f.slug} ${k}: ${fm[k]}`);
    }
    fail(bad);
  });

  it('home', () => {
    const en = JSON.parse(readFileSync(join(ROOT, 'src/i18n/ns/site.en.json'), 'utf8')).site.home;
    for (const k of ['title', 'description', 'hero'])
      expect(has(en[k], 'photo and signature resize')).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Built pages
// ---------------------------------------------------------------------------

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
    .replace(/&#(\d+);/g, (_, n: string) => String.fromCharCode(Number(n)))
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&#39;/g, "'")
    .replace(/&quot;/g, '"');

/** Pages these templates own: exam, document, hub and home pages (en and hi). */
const OWNED = /^\/(index|hi|exam\/.+|hi\/exam\/.+|exams\/[^/]+)\.html$/;

describe.skipIf(!existsSync(join(DIST, 'index.html')))('built pages (dist/)', () => {
  const pages = existsSync(DIST)
    ? htmlFiles(DIST)
        .map((f) => ({ path: f.slice(DIST.length), html: readFileSync(f, 'utf8') }))
        .filter((x) => OWNED.test(x.path))
    : [];

  it('covers every exam, document, hub and home page', () => {
    expect(pages.length).toBeGreaterThan(presets.length * 2);
    expect(pages.some((x) => x.path === '/exams/ssc.html')).toBe(true);
  });

  it(`every title is <= ${TITLE_MAX} characters`, () => {
    const bad = pages
      .map((x) => ({
        path: x.path,
        title: decode(x.html.match(/<title>([^<]*)<\/title>/)?.[1] ?? ''),
      }))
      .filter((x) => !x.title || textLength(x.title) > TITLE_MAX)
      .map((x) => `${x.path} (${textLength(x.title)}): ${x.title}`);
    fail(bad);
  });

  it(`every English description is ${DESC_MIN}–${DESC_MAX} characters`, () => {
    const bad = pages
      .filter((x) => !x.path.startsWith('/hi'))
      .map((x) => ({
        path: x.path,
        d: decode(x.html.match(/<meta name="description" content="([^"]*)"/)?.[1] ?? ''),
      }))
      .filter((x) => textLength(x.d) < DESC_MIN || textLength(x.d) > DESC_MAX)
      .map((x) => `${x.path} (${textLength(x.d)}): ${x.d}`);
    fail(bad);
  });
});
