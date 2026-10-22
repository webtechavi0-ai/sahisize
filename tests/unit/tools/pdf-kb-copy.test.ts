// @vitest-environment node
/**
 * PDF size pages (keyword map "Tools: PDF"): /tools/compress-pdf-to-[n]kb and
 * /tools/jpg-to-pdf-under-[n]kb, their hubs and the three Hindi pages.
 * - 400–700 words, title ≤ 60 chars, description 120–155 chars
 * - sibling pages are not near-duplicates: Jaccard similarity of their 3-word shingles ≤ 0.45
 */
import { describe, expect, it } from 'vitest';
import { JPG_PDF_KB_TARGETS, PDF_KB_TARGETS } from '@/config/tools';
import { PDF_KB_HINDI, compressPdfKbCopy, jpgToPdfKbCopy } from '@/components/tools/copy/pdf-kb';
import { compressPdfCopy, imagesToPdfCopy } from '@/components/tools/copy/pdf';
import { wordCount, type ToolCopy } from '@/components/tools/copy/types';

/** Everything a reader sees for the page, as one string. */
export function pageText(c: ToolCopy): string {
  return [
    c.title,
    c.description,
    c.h1,
    c.intro,
    ...c.steps.flatMap((s) => [s.name, s.text]),
    ...c.faq.flatMap((f) => [f.q, f.a]),
    ...c.sections.flatMap((s) => [s.h2, ...s.paras, ...(s.list ?? [])]),
  ].join(' ');
}

function shingles(text: string, k = 3): Set<string> {
  const words = text
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\p{M}\s]+/gu, ' ')
    .split(/\s+/)
    .filter(Boolean);
  const out = new Set<string>();
  for (let i = 0; i + k <= words.length; i++) out.add(words.slice(i, i + k).join(' '));
  return out;
}

export function jaccard(a: string, b: string): number {
  const A = shingles(a);
  const B = shingles(b);
  let inter = 0;
  for (const x of A) if (B.has(x)) inter++;
  return inter / (A.size + B.size - inter);
}

type Page = readonly [string, ToolCopy];
const compress: Page[] = PDF_KB_TARGETS.map((n) => [`compress-pdf-to-${n}kb`, compressPdfKbCopy(n)] as const);
const jpg: Page[] = JPG_PDF_KB_TARGETS.map((n) => [`jpg-to-pdf-under-${n}kb`, jpgToPdfKbCopy(n)] as const);
const hubs: Page[] = [
  ['compress-pdf', compressPdfCopy()],
  ['images-to-pdf', imagesToPdfCopy('en')],
] as const;
const hindi: Page[] = [
  ...PDF_KB_HINDI.compress.map((n) => [`hi compress-pdf-to-${n}kb`, compressPdfKbCopy(n, 'hi')] as const),
  ...PDF_KB_HINDI.jpg.map((n) => [`hi jpg-to-pdf-under-${n}kb`, jpgToPdfKbCopy(n, 'hi')] as const),
];
const english = [...compress, ...jpg, ...hubs];

function pairs<T>(xs: readonly T[]): [T, T][] {
  return xs.flatMap((a, i) => xs.slice(i + 1).map((b) => [a, b] as [T, T]));
}

describe('PDF size page copy', () => {
  it.each(english)('%s: 400–700 words, title ≤ 60, description 120–155', (_name, c) => {
    const n = wordCount(c);
    expect(n).toBeGreaterThanOrEqual(400);
    expect(n).toBeLessThanOrEqual(700);
    expect(c.title.length).toBeLessThanOrEqual(60);
    expect(c.description.length).toBeGreaterThanOrEqual(120);
    expect(c.description.length).toBeLessThanOrEqual(155);
    expect(c.steps.length).toBeGreaterThanOrEqual(3);
    expect(c.faq.length).toBeGreaterThanOrEqual(3);
  });

  it.each(hindi)('%s: natural Hindi copy with its own title and description', (_name, c) => {
    expect(wordCount(c)).toBeGreaterThanOrEqual(400);
    expect(wordCount(c)).toBeLessThanOrEqual(700);
    expect(c.h1).toMatch(/[ऀ-ॿ]/);
    expect(c.title.length).toBeLessThanOrEqual(60);
    expect(c.description.length).toBeGreaterThanOrEqual(120);
    expect(c.description.length).toBeLessThanOrEqual(155);
    expect(c.faq.length).toBeGreaterThanOrEqual(3);
  });

  it('each size page names its size in the title, H1 and intro', () => {
    for (const [i, n] of PDF_KB_TARGETS.entries()) {
      const c = compress[i]![1];
      for (const s of [c.title, c.h1, c.intro]) expect(s).toContain(`${n} KB`);
    }
    for (const [i, n] of JPG_PDF_KB_TARGETS.entries()) {
      const c = jpg[i]![1];
      for (const s of [c.title, c.h1, c.intro]) expect(s).toContain(`${n} KB`);
    }
  });

  it('titles, descriptions and H1s are unique', () => {
    for (const key of ['title', 'description', 'h1'] as const) {
      const all = [...english, ...hindi].map(([, c]) => c[key]);
      expect(new Set(all).size).toBe(all.length);
    }
  });

  it('siblings are not near-duplicates (3-word shingle Jaccard ≤ 0.45)', () => {
    const groups: Page[][] = [compress, jpg, [...hubs, ...compress, ...jpg], hindi];
    let worst = 0;
    for (const g of groups) {
      for (const [[a, ca], [b, cb]] of pairs(g)) {
        const j = jaccard(pageText(ca), pageText(cb));
        worst = Math.max(worst, j);
        expect(j, `${a} vs ${b}`).toBeLessThanOrEqual(0.45);
      }
    }
    // Hand-written pages should sit far below the ceiling; flag template creep early.
    expect(worst).toBeLessThan(0.2);
  });

  it('the hubs link to every size page', () => {
    const hrefs = (c: ToolCopy) => c.sections.flatMap((s) => s.links ?? []).map((l) => l.href);
    const pdfHub = hrefs(compressPdfCopy());
    for (const n of PDF_KB_TARGETS) expect(pdfHub).toContain(`/tools/compress-pdf-to-${n}kb`);
    const jpgHub = hrefs(imagesToPdfCopy('en'));
    for (const n of JPG_PDF_KB_TARGETS) expect(jpgHub).toContain(`/tools/jpg-to-pdf-under-${n}kb`);
  });

  it('exam links point at published exam pages', () => {
    for (const [, c] of [...english, ...hindi]) {
      for (const l of c.sections.flatMap((s) => s.links ?? [])) {
        expect(l.href).toMatch(/^\/(hi\/)?(exam|tools)\//);
      }
    }
  });
});
