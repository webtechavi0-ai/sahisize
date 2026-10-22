// @vitest-environment node
/**
 * KB-size cluster (docs/seo/keyword-map.md "Tools: KB size"): the hub, every
 * compress-image-to-[n]kb page, the range pages and MB to KB.
 *  - 400–700 words, titles <= 60 chars, descriptions 120–155 chars
 *  - the primary keyword exactly once in the title, H1, first paragraph and description
 *  - sibling pages are not spun copies: pairwise 5-word-shingle Jaccard <= 0.45
 *  - every URL is in the tools sitemap; Hindi twins are paired both ways
 */
import { describe, expect, it } from 'vitest';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { COMPRESS_KB_RANGES, COMPRESS_KB_TARGETS, MB_TO_KB_PATH, compressRangePath, compressToKbPath } from '@/config/tools';
import { compressImageCopy, compressKbCopy } from '@/components/tools/copy/compress';
import { compressRangeCopy, hasRangeCopy, mbToKbCopy } from '@/components/tools/copy/kb-ranges';
import { KB_SIZES_HI } from '@/components/tools/copy/kb-sizes-hi';
import { wordCount, type ToolCopy } from '@/components/tools/copy/types';
import { toolUrls } from '@/seo/sitemap';
import { hindiToolPath } from '@/seo/hreflang';

interface Page {
  name: string;
  path: string;
  copy: ToolCopy;
  /** Primary keyword (EN pages). */
  primary?: string;
}

const en: Page[] = [
  { name: 'hub', path: '/tools/compress-image', copy: compressImageCopy('en'), primary: 'photo resizer in kb' },
  ...COMPRESS_KB_TARGETS.map((n) => ({
    name: `${n} KB`,
    path: compressToKbPath(n),
    copy: compressKbCopy(n, 'en'),
    primary: `${n} kb photo size`,
  })),
  ...COMPRESS_KB_RANGES.map(([a, b]) => ({
    name: `${a}–${b} KB`,
    path: compressRangePath(a, b),
    copy: compressRangeCopy(a, b, 'en'),
    primary: (
      {
        '10-20': '10 kb to 20 kb photo size',
        '20-50': 'photo convert into 20 kb to 50 kb jpg',
        '50-100': 'photo compress 50 to 100 kb',
      } as Record<string, string>
    )[`${a}-${b}`],
  })),
  { name: 'MB to KB', path: MB_TO_KB_PATH, copy: mbToKbCopy(), primary: 'photo mb to kb' },
];

const hi: Page[] = [
  { name: 'hi hub', path: '/tools/compress-image', copy: compressImageCopy('hi') },
  ...Object.keys(KB_SIZES_HI).map(Number).map((n) => ({
    name: `hi ${n} KB`,
    path: compressToKbPath(n),
    copy: compressKbCopy(n, 'hi'),
  })),
  ...COMPRESS_KB_RANGES.filter(([a, b]) => hasRangeCopy(a, b, 'hi')).map(([a, b]) => ({
    name: `hi ${a}–${b} KB`,
    path: compressRangePath(a, b),
    copy: compressRangeCopy(a, b, 'hi'),
  })),
];

function text(c: ToolCopy): string {
  return [
    c.h1,
    c.intro,
    ...c.steps.flatMap((s) => [s.name, s.text]),
    ...c.faq.flatMap((f) => [f.q, f.a]),
    ...c.sections.flatMap((s) => [s.h2, ...s.paras, ...(s.list ?? [])]),
  ].join(' ');
}

export function shingles(s: string, k = 5): Set<string> {
  const w = s.toLowerCase().match(/[\p{L}\p{M}\p{N}]+/gu) ?? [];
  const out = new Set<string>();
  for (let i = 0; i + k <= w.length; i++) out.add(w.slice(i, i + k).join(' '));
  return out;
}

export function jaccard(a: Set<string>, b: Set<string>): number {
  let inter = 0;
  for (const x of a) if (b.has(x)) inter++;
  return inter / (a.size + b.size - inter);
}

function maxPair(pages: Page[]): { score: number; pair: string } {
  const sh = pages.map((p) => shingles(text(p.copy)));
  let best = { score: 0, pair: '' };
  for (let i = 0; i < pages.length; i++)
    for (let j = i + 1; j < pages.length; j++) {
      const s = jaccard(sh[i]!, sh[j]!);
      if (s > best.score) best = { score: s, pair: `${pages[i]!.name} / ${pages[j]!.name}` };
    }
  return best;
}

/** Occurrences of a keyword, case-insensitive, "20 KB" == "20kb", not inside "120 KB". */
function count(hay: string, kw: string): number {
  const re = new RegExp(
    `(?<![\\p{L}\\p{N}])${kw
      .split(/\s+/)
      .map((w) => w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
      .join('\\s*')
      .replace(/(\d)\\s\*kb/g, '$1\\s?kb')}(?![\\p{L}\\p{N}])`,
    'giu',
  );
  return hay.match(re)?.length ?? 0;
}

describe('KB cluster copy', () => {
  it.each([...en, ...hi].map((p) => [p.name, p] as const))('%s: 400–700 words, title and description length', (_n, p) => {
    const words = wordCount(p.copy);
    expect(words).toBeGreaterThanOrEqual(400);
    expect(words).toBeLessThanOrEqual(700);
    expect(p.copy.title.length).toBeLessThanOrEqual(60);
    expect(p.copy.description.length).toBeGreaterThanOrEqual(120);
    expect(p.copy.description.length).toBeLessThanOrEqual(155);
    expect(p.copy.faq.length).toBeGreaterThanOrEqual(3);
  });

  it.each(en.map((p) => [p.name, p] as const))('%s: primary keyword once in title, H1, intro and description', (_n, p) => {
    for (const key of ['title', 'h1', 'intro', 'description'] as const) {
      expect(count(p.copy[key], p.primary!), `${key}: "${p.copy[key]}"`).toBe(1);
    }
  });

  it('keyword counter treats "50kb" and "50 KB" alike and ignores "150 KB"', () => {
    expect(count('The 50kb photo size and 50 KB photo size', '50 kb photo size')).toBe(2);
    expect(count('A 150 KB photo size', '50 kb photo size')).toBe(0);
  });

  it('titles, descriptions and H1s are unique across the cluster', () => {
    for (const key of ['title', 'description', 'h1'] as const) {
      const all = [...en, ...hi].map((p) => p.copy[key]);
      expect(new Set(all).size).toBe(all.length);
    }
  });

  it('sibling pages share at most 0.45 of their 5-word shingles (EN)', () => {
    const { score, pair } = maxPair(en);
    expect(score, pair).toBeLessThanOrEqual(0.45);
  });

  it('sibling pages share at most 0.45 of their 5-word shingles (HI)', () => {
    const { score, pair } = maxPair(hi);
    expect(score, pair).toBeLessThanOrEqual(0.45);
  });

  it('the hub links to every KB page, range page and MB to KB', () => {
    const links = new Set(compressImageCopy('en').sections.flatMap((s) => s.links ?? []).map((l) => l.href));
    for (const p of en.slice(1)) expect(links, p.path).toContain(p.path);
  });
});

describe('KB cluster URLs', () => {
  const sitemap = toolUrls();
  const paths = new Set(sitemap.map((u) => u.path));

  it('every page is in the tools sitemap', () => {
    for (const p of en) expect(paths, p.path).toContain(p.path);
  });

  it('Hindi twins exist on disk and are paired both ways', () => {
    for (const p of hi) {
      const hiPath = hindiToolPath(p.path);
      expect(hiPath, p.path).toBe(`/hi${p.path}`);
      expect(existsSync(join(process.cwd(), `src/pages${hiPath}.astro`)), hiPath!).toBe(true);
      const enRow = sitemap.find((u) => u.path === p.path);
      const hiRow = sitemap.find((u) => u.path === hiPath);
      expect(enRow?.alternates).toEqual({ en: p.path, hi: hiPath });
      expect(hiRow?.alternates).toEqual({ en: p.path, hi: hiPath });
    }
  });

  it('pages without Hindi copy have no Hindi twin', () => {
    const withHi = new Set(hi.map((p) => p.path));
    for (const p of en) if (!withHi.has(p.path)) expect(hindiToolPath(p.path), p.path).toBeNull();
  });
});
