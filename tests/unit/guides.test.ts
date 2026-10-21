/**
 * Workstream E: launch guides (SPEC 9.5). 10 English + 10 Hindi published guides,
 * 700-1400 words each, and every internal link resolves to a real route.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { parse } from 'yaml';
import { TOOLS, COMPRESS_KB_TARGETS } from '@/config/tools';
import hiTopExams from '@/i18n/hi-top-exams.json';

const ROOT = join(__dirname, '../..');
const GUIDES = join(ROOT, 'src/content/guides');
const PRESETS = join(ROOT, 'src/content/presets');

const SLUGS = [
  'photo-rejected-how-to-fix',
  'scan-signature-with-phone',
  'photo-size-kb-vs-pixels',
  'thumb-impression-for-exam-forms',
  'handwritten-declaration-format',
  'reduce-photo-size-to-20kb-on-mobile',
  'combine-certificates-into-pdf-under-300kb',
  'live-photo-capture-ssc-rrb',
  'jpg-vs-png-vs-pdf',
  'exam-form-checklist',
];

interface Guide {
  file: string;
  lang: 'en' | 'hi';
  data: Record<string, unknown>;
  body: string;
}

function load(lang: 'en' | 'hi'): Guide[] {
  const dir = join(GUIDES, lang);
  return readdirSync(dir)
    .filter((f) => f.endsWith('.mdx'))
    .map((f) => {
      const src = readFileSync(join(dir, f), 'utf8');
      const m = /^---\n([\s\S]*?)\n---\n([\s\S]*)$/.exec(src);
      if (!m) throw new Error(`${lang}/${f}: no frontmatter`);
      return { file: `${lang}/${f}`, lang, data: parse(m[1]) as Record<string, unknown>, body: m[2] };
    });
}

const all = [...load('en'), ...load('hi')];
const published = all.filter((g) => g.data.draft !== true);

const publishedExams = new Set(
  readdirSync(PRESETS)
    .filter((f) => f.endsWith('.json') && f !== 'season.json')
    .map((f) => JSON.parse(readFileSync(join(PRESETS, f), 'utf8')) as { slug: string; published: boolean })
    .filter((p) => p.published)
    .map((p) => p.slug),
);
const hiExams = new Set((hiTopExams as string[]).filter((s) => publishedExams.has(s)));
const toolPaths = new Set<string>([
  '/tools',
  ...TOOLS.map((t) => t.path),
  ...COMPRESS_KB_TARGETS.map((n) => `/tools/compress-image-to-${n}kb`),
]);
const enGuides = new Set(published.filter((g) => g.lang === 'en').map((g) => g.data.slug as string));
const hiGuides = new Set(published.filter((g) => g.lang === 'hi').map((g) => g.data.slug as string));
const staticRoutes = new Set(['/', '/exams', '/guides', '/sources', '/report', '/hi', '/hi/exams', '/hi/guides']);

function resolves(href: string): boolean {
  const path = href.split('#')[0].replace(/\/$/, '') || '/';
  if (staticRoutes.has(path) || toolPaths.has(path)) return true;
  let m: RegExpExecArray | null;
  if ((m = /^\/exam\/([a-z0-9-]+)$/.exec(path))) return publishedExams.has(m[1]);
  if ((m = /^\/hi\/exam\/([a-z0-9-]+)$/.exec(path))) return hiExams.has(m[1]);
  if ((m = /^\/guides\/([a-z0-9-]+)$/.exec(path))) return enGuides.has(m[1]);
  if ((m = /^\/hi\/guides\/([a-z0-9-]+)$/.exec(path))) return hiGuides.has(m[1]);
  return false;
}

const words = (s: string) =>
  s
    .replace(/\]\([^)]*\)/g, ']')
    .split(/\s+/)
    .filter((w) => /[\p{L}\p{N}]/u.test(w)).length;

describe('launch guides', () => {
  it('has exactly the 10 SPEC 9.5 guides published in English and in Hindi', () => {
    for (const lang of ['en', 'hi'] as const) {
      const slugs = published.filter((g) => g.lang === lang).map((g) => g.data.slug);
      expect(slugs.sort()).toEqual([...SLUGS].sort());
    }
  });

  it('removes the sample guide', () => {
    expect(all.some((g) => g.data.slug === 'sample')).toBe(false);
  });

  it.each(published.map((g) => [g.file, g] as const))('%s: frontmatter matches its folder and file name', (file, g) => {
    expect(g.data.lang).toBe(g.lang);
    expect(file).toBe(`${g.lang}/${g.data.slug}.mdx`);
    const d = g.data.description as string;
    expect(d.length).toBeGreaterThanOrEqual(50);
    expect(d.length).toBeLessThanOrEqual(160);
    expect(SLUGS.indexOf(g.data.slug as string) + 1).toBe(g.data.order);
  });

  it.each(published.map((g) => [g.file, g] as const))('%s: body is 700-1400 words', (_f, g) => {
    const n = words(g.body);
    expect(n).toBeGreaterThanOrEqual(700);
    expect(n).toBeLessThanOrEqual(1400);
  });

  it.each(published.map((g) => [g.file, g] as const))('%s: has an FAQ, a no-affiliation line and a check-the-notice line', (_f, g) => {
    expect(g.body).toMatch(/^## .*(FAQ|सवाल)/m);
    expect(g.body).toMatch(/not affiliated|not linked|independent|जुड.{0,2}ा नहीं|संबंध नहीं/u);
    expect(g.body).toMatch(/official notice|ऑफिशियल नोटिस|आधिकारिक नोटिस/i);
    expect(g.body).not.toMatch(/(?<!not |n't )\baffiliated with (IBPS|SSC|RRB|NTA|UPSC)/i);
  });

  it.each(published.map((g) => [g.file, g] as const))('%s: every internal link resolves', (_f, g) => {
    const links = [...g.body.matchAll(/\]\((\/[^)\s]*)\)/g)].map((m) => m[1]);
    expect(links.length).toBeGreaterThan(2);
    const broken = links.filter((l) => !resolves(l));
    expect(broken).toEqual([]);
  });

  it.each(published.map((g) => [g.file, g] as const))('%s: Hindi guides link Hindi routes where they exist', (_f, g) => {
    if (g.lang !== 'hi') return;
    const links = [...g.body.matchAll(/\]\((\/[^)\s]*)\)/g)].map((m) => m[1]);
    for (const l of links) {
      const exam = /^\/exam\/([a-z0-9-]+)/.exec(l);
      if (exam) expect(hiExams.has(exam[1]), `${l} has a /hi/ page`).toBe(false);
      const guide = /^\/guides\/([a-z0-9-]+)/.exec(l);
      if (guide) expect(hiGuides.has(guide[1]), `${l} has a /hi/ page`).toBe(false);
    }
  });

  it.each(published.map((g) => [g.file, g] as const))('%s: related exams and tools exist', (_f, g) => {
    for (const s of (g.data.relatedExams as string[]) ?? []) expect(publishedExams.has(s), s).toBe(true);
    const toolSlugs = new Set(TOOLS.map((t) => t.slug as string));
    for (const s of (g.data.relatedTools as string[]) ?? []) expect(toolSlugs.has(s), s).toBe(true);
  });
});
