// @vitest-environment node
/**
 * Keyword-map pages over T2 resize (3.5×4.5 cm, cm, mm, passport, postcard, stamp) and the
 * retargeted signature / thumb / declaration pages: preset pixel values, SEO lengths,
 * 400–700 words, and copy that is not spun (word-set Jaccard ≤ 0.45 between any two pages).
 */
import { describe, expect, it } from 'vitest';
import { toPx } from '@/components/tools/logic';
import { pxLabel, sizePreset, type SizePresetPage } from '@/components/tools/size-presets';
import { sizePageCopy } from '@/components/tools/copy/sizes';
import { declarationCopy, signatureCopy, thumbCopy } from '@/components/tools/copy/ink';
import { compressImageCopy } from '@/components/tools/copy/compress';
import { convertCopy, resizeCopy } from '@/components/tools/copy/resize-convert';
import { photoSheetCopy } from '@/components/tools/copy/more';
import { wordCount, type ToolCopy } from '@/components/tools/copy/types';
import { TOOLS } from '@/config/tools';

const PAGES: SizePresetPage[] = [
  'photo-3-5x4-5-cm',
  'resize-image-in-cm',
  'resize-image-in-mm',
  'passport-size-photo',
  'postcard-size-photo',
  'stamp-size-photo',
];

describe('physical size → pixels', () => {
  it.each([
    [3.5, 4.5, 'cm', 200, '276×354 px'],
    [3.5, 4.5, 'cm', 300, '413×531 px'],
    [6, 2, 'cm', 200, '472×157 px'],
    [6, 2, 'cm', 300, '709×236 px'],
    [2, 2.5, 'cm', 200, '157×197 px'],
    [2, 2.5, 'cm', 300, '236×295 px'],
    [35, 45, 'mm', 200, '276×354 px'],
    [51, 51, 'mm', 200, '402×402 px'],
    [51, 51, 'mm', 300, '602×602 px'],
    [4, 6, 'in', 200, '800×1200 px'],
    [4, 6, 'in', 300, '1200×1800 px'],
    [10.2, 15.2, 'cm', 200, '803×1197 px'],
  ] as const)('%s×%s %s at %s DPI = %s', (w, h, unit, dpi, px) => {
    expect(pxLabel(w, h, unit, dpi)).toBe(px);
  });

  it('presets start at the keyword sizes and units', () => {
    const p = sizePreset('photo-3-5x4-5-cm');
    expect(p.initial).toMatchObject({ unit: 'cm', w: 3.5, h: 4.5, dpi: 200 });
    expect(p.sizes!.map((s) => s.label)).toEqual(['200 DPI (276×354 px)', '300 DPI (413×531 px)']);
    expect(sizePreset('passport-size-photo').sizes!.map((s) => `${s.w}×${s.h} ${s.unit} @${s.dpi}`)).toEqual([
      '3.5×4.5 cm @200',
      '3.5×4.5 cm @300',
      '51×51 mm @200',
      '51×51 mm @300',
    ]);
    expect(sizePreset('postcard-size-photo').initial).toMatchObject({ unit: 'in', w: 4, h: 6 });
    expect(sizePreset('stamp-size-photo').initial).toMatchObject({ unit: 'cm', w: 2, h: 2.5 });
    expect(sizePreset('resize-image-in-cm').initial).toEqual({ unit: 'cm' });
    expect(sizePreset('resize-image-in-mm').initial).toEqual({ unit: 'mm' });
    expect(sizePreset('passport-size-photo', 'hi').sizes![2]!.label).toBe('51×51 mm, 200 DPI (402×402 px)');
  });

  it('every preset size is a valid pixel box', () => {
    for (const page of PAGES) {
      for (const s of sizePreset(page).sizes ?? []) {
        expect(toPx(s.w, s.unit, s.dpi!)).toBeGreaterThan(100);
        expect(toPx(s.h, s.unit, s.dpi!)).toBeGreaterThan(100);
      }
    }
  });

  it('every page is registered as a tool', () => {
    const paths = new Set(TOOLS.map((t) => t.path));
    for (const page of PAGES) expect(paths.has(`/tools/${page}`)).toBe(true);
  });
});

const mine: [string, ToolCopy][] = [
  ...PAGES.map((p) => [p, sizePageCopy(p)] as [string, ToolCopy]),
  ['signature-resize', signatureCopy('en')],
  ['thumb-impression', thumbCopy()],
  ['handwritten-declaration', declarationCopy()],
];
const mineHi: [string, ToolCopy][] = [
  ['hi photo-3-5x4-5-cm', sizePageCopy('photo-3-5x4-5-cm', 'hi')],
  ['hi passport-size-photo', sizePageCopy('passport-size-photo', 'hi')],
];

function text(c: ToolCopy): string {
  return [
    c.intro,
    ...c.steps.flatMap((s) => [s.name, s.text]),
    ...c.faq.flatMap((f) => [f.q, f.a]),
    ...c.sections.flatMap((s) => [s.h2, ...s.paras, ...(s.list ?? [])]),
  ].join(' ');
}
function words(c: ToolCopy): Set<string> {
  return new Set(text(c).toLowerCase().match(/[\p{L}\p{M}\p{N}]+/gu) ?? []);
}
function jaccard(a: Set<string>, b: Set<string>): number {
  let both = 0;
  for (const w of a) if (b.has(w)) both++;
  return both / (a.size + b.size - both);
}

describe('keyword-map page copy', () => {
  it.each(mine)('%s: 400–700 words, title ≤ 60, description 120–155', (_n, c) => {
    const n = wordCount(c);
    expect(n).toBeGreaterThanOrEqual(400);
    expect(n).toBeLessThanOrEqual(700);
    expect(c.title.length).toBeLessThanOrEqual(60);
    expect(c.description.length).toBeGreaterThanOrEqual(120);
    expect(c.description.length).toBeLessThanOrEqual(155);
    expect(c.steps.length).toBeGreaterThanOrEqual(3);
    expect(c.faq.length).toBeGreaterThanOrEqual(4);
  });

  it.each(mineHi)('%s: Hindi, substantial, title ≤ 60, description ≤ 155', (_n, c) => {
    expect(wordCount(c)).toBeGreaterThanOrEqual(300);
    expect(c.h1).toMatch(/[ऀ-ॿ]/);
    expect(c.title.length).toBeLessThanOrEqual(60);
    expect(c.description.length).toBeLessThanOrEqual(155);
  });

  it('pages are not spun copies of each other (Jaccard ≤ 0.45)', () => {
    for (const group of [mine, mineHi]) {
      const sets = group.map(([n, c]) => [n, words(c)] as const);
      for (let i = 0; i < sets.length; i++)
        for (let j = i + 1; j < sets.length; j++) {
          const v = jaccard(sets[i]![1], sets[j]![1]);
          expect(v, `${sets[i]![0]} vs ${sets[j]![0]}: ${v.toFixed(2)}`).toBeLessThanOrEqual(0.45);
        }
    }
  });

  it('titles, descriptions and H1s stay unique across tool pages', () => {
    const others = [compressImageCopy('en'), resizeCopy('en'), resizeCopy('hi'), convertCopy(), photoSheetCopy()];
    const all = [...mine, ...mineHi].map(([, c]) => c).concat(others);
    for (const key of ['title', 'description', 'h1'] as const) {
      const v = all.map((c) => c[key]);
      expect(new Set(v).size).toBe(v.length);
    }
  });

  it('states the physical facts correctly', () => {
    const all = mine.map(([, c]) => text(c)).join(' ');
    expect(all).toContain('276 × 354');
    expect(all).toContain('413 × 531');
    expect(all).toContain('472 × 157');
    expect(all).toContain('709 × 236');
    expect(all).toContain('10.2 × 15.2 cm');
    expect(text(sizePageCopy('stamp-size-photo'))).toMatch(/commonly 2\.0 cm wide/);
    // No claim that 51×51 mm is the official Indian passport spec (Passport Seva not fetched).
    expect(text(sizePageCopy('passport-size-photo'))).not.toMatch(/passport seva/i);
    // FCI has no published preset: the declaration page must defer to the notice.
    expect(text(declarationCopy())).toMatch(/FCI[^.]*cannot confirm|Check the FCI notice/);
  });
});
