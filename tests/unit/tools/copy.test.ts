// @vitest-environment node
/** Tool page copy: 300–700 words per page (SPEC 9.4 / F brief), unique per page. */
import { describe, expect, it } from 'vitest';
import { COMPRESS_KB_TARGETS } from '@/config/tools';
import { compressImageCopy, compressKbCopy } from '@/components/tools/copy/compress';
import { convertCopy, resizeCopy } from '@/components/tools/copy/resize-convert';
import { declarationCopy, signatureCopy, thumbCopy } from '@/components/tools/copy/ink';
import { compressPdfCopy, imagesToPdfCopy } from '@/components/tools/copy/pdf';
import { batchCopy, customPresetCopy, photoSheetCopy } from '@/components/tools/copy/more';
import { wordCount, type ToolCopy } from '@/components/tools/copy/types';
import { examsWithMaxKB, sizeOptions } from '@/components/tools/presets-server';

const en: [string, ToolCopy][] = [
  ['compress-image', compressImageCopy('en')],
  ...COMPRESS_KB_TARGETS.map((n) => [`compress-${n}kb`, compressKbCopy(n, 'en')] as [string, ToolCopy]),
  ['resize', resizeCopy('en')],
  ['convert', convertCopy()],
  ['signature', signatureCopy('en')],
  ['thumb', thumbCopy()],
  ['declaration', declarationCopy()],
  ['images-to-pdf', imagesToPdfCopy('en')],
  ['compress-pdf', compressPdfCopy()],
  ['photo-sheet', photoSheetCopy()],
  ['batch', batchCopy()],
  ['custom', customPresetCopy()],
];

const hi: [string, ToolCopy][] = [
  ['hi compress-image', compressImageCopy('hi')],
  ['hi 20kb', compressKbCopy(20, 'hi')],
  ['hi 50kb', compressKbCopy(50, 'hi')],
  ['hi resize', resizeCopy('hi')],
  ['hi signature', signatureCopy('hi')],
  ['hi images-to-pdf', imagesToPdfCopy('hi')],
];

describe('tool page copy', () => {
  it.each(en)('%s has 300–700 words, steps and FAQ', (_name, c) => {
    const n = wordCount(c);
    expect(n).toBeGreaterThanOrEqual(300);
    expect(n).toBeLessThanOrEqual(700);
    expect(c.steps.length).toBeGreaterThanOrEqual(3);
    expect(c.faq.length).toBeGreaterThanOrEqual(3);
    expect(c.description.length).toBeLessThanOrEqual(170);
  });

  it.each(hi)('%s has substantial Hindi copy', (_name, c) => {
    expect(wordCount(c)).toBeGreaterThanOrEqual(200);
    expect(c.h1).toMatch(/[ऀ-ॿ]/);
  });

  it('every page has a unique title, description and H1', () => {
    for (const key of ['title', 'description', 'h1'] as const) {
      const all = [...en, ...hi].map(([, c]) => c[key]);
      expect(new Set(all).size).toBe(all.length);
    }
  });

  it('[n]kb pages differ in body text', () => {
    const bodies = COMPRESS_KB_TARGETS.map((n) => compressKbCopy(n).sections[0]!.paras[0]);
    expect(new Set(bodies).size).toBe(bodies.length);
  });
});

describe('preset lookups (published only)', () => {
  it('finds exams by max KB and groups size rules', () => {
    expect(examsWithMaxKB(20).some((r) => r.slug === 'ibps-po')).toBe(true);
    const sig = sizeOptions('signature');
    expect(sig[0]!.label).toBe('140×60 px, 10–20 KB');
    expect(sig[0]!.spec.doc).toBe('signature');
    expect(sizeOptions('declaration')[0]!.label).toContain('800×400');
  });
});
