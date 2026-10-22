// @vitest-environment node
/**
 * Copy rules for /tools/increase-image-size-in-kb and /tools/name-date-on-photo (EN + HI):
 * 450–700 words, title ≤ 60 chars, description 120–155, unique against the other tool pages,
 * and exam claims only from published presets.
 */
import { describe, expect, it } from 'vitest';
import { increaseCopy } from '@/components/tools/copy/increase';
import { nameDateCopy } from '@/components/tools/copy/name-date';
import { compressImageCopy } from '@/components/tools/copy/compress';
import { signatureCopy } from '@/components/tools/copy/ink';
import { resizeCopy } from '@/components/tools/copy/resize-convert';
import { wordCount, type ToolCopy } from '@/components/tools/copy/types';
import { nameDateExams } from '@/components/tools/name-date-server';
import { DEFAULT_MAX_FOR_MIN } from '@/components/tools/increase';
import { getKitDocuments, getPublishedPresets, getSeasonOrder } from '@/content/presets';

const pages: [string, ToolCopy][] = [
  ['increase en', increaseCopy('en')],
  ['increase hi', increaseCopy('hi')],
  ['name-date en', nameDateCopy('en', nameDateExams('en'))],
  ['name-date hi', nameDateCopy('hi', nameDateExams('hi'))],
];

const allText = (c: ToolCopy) =>
  [
    c.title,
    c.description,
    c.intro,
    ...c.steps.flatMap((s) => [s.name, s.text]),
    ...c.faq.flatMap((f) => [f.q, f.a]),
    ...c.sections.flatMap((s) => [s.h2, ...s.paras, ...(s.list ?? [])]),
  ].join(' ');

describe('increase / name-date copy', () => {
  it.each(pages)('%s: 450–700 words, title ≤ 60, description 120–155, steps and FAQ', (_n, c) => {
    const n = wordCount(c);
    expect(n).toBeGreaterThanOrEqual(450);
    expect(n).toBeLessThanOrEqual(700);
    expect(c.title.length).toBeLessThanOrEqual(60);
    expect(c.description.length).toBeGreaterThanOrEqual(120);
    expect(c.description.length).toBeLessThanOrEqual(155);
    expect(c.steps.length).toBeGreaterThanOrEqual(3);
    expect(c.faq.length).toBeGreaterThanOrEqual(3);
  });

  it('Hindi pages are in Devanagari', () => {
    expect(increaseCopy('hi').h1).toMatch(/[ऀ-ॿ]/);
    expect(nameDateCopy('hi').h1).toMatch(/[ऀ-ॿ]/);
  });

  it('titles, descriptions and H1s are unique among tool pages', () => {
    const others = [compressImageCopy('en'), compressImageCopy('hi'), signatureCopy('en'), signatureCopy('hi'), resizeCopy('en'), resizeCopy('hi')];
    for (const key of ['title', 'description', 'h1'] as const) {
      const all = [...pages.map(([, c]) => c[key]), ...others.map((c) => c[key])];
      expect(new Set(all).size).toBe(all.length);
    }
  });

  it('uses the primary keyword in title, H1, intro and description (EN)', () => {
    const inc = increaseCopy('en');
    for (const s of [inc.title, inc.h1, inc.intro, inc.description]) expect(s.toLowerCase()).toContain('increase');
    expect(allText(inc).toLowerCase()).toContain('signature kb increase');
    const nd = nameDateCopy('en', nameDateExams('en'));
    for (const s of [nd.title, nd.h1, nd.intro, nd.description]) expect(s.toLowerCase()).toMatch(/name and date/);
  });

  it('is honest that pixels stay and the picture looks the same', () => {
    const t = allText(increaseCopy('en'));
    expect(t).toMatch(/higher quality/);
    expect(t).toMatch(/noise/);
    expect(t).toMatch(/comment block/);
  });
});

describe('name-date exams come only from published, verified presets', () => {
  it('lists MPPSC with its published rule and nothing toVerify', () => {
    const ex = nameDateExams('en');
    expect(ex.map((e) => e.slug)).toContain('mppsc');
    const published = new Set(getPublishedPresets().map((p) => p.slug));
    for (const e of ex) {
      expect(published.has(e.slug)).toBe(true);
      expect(e.option.spec.needsNameDateStrip).toBe(true);
      const doc = getKitDocuments(getPublishedPresets().find((p) => p.slug === e.slug)!).find((d) => d.needsNameDateStrip)!;
      expect(doc.toVerify ?? false).toBe(false);
    }
    expect(ex.find((e) => e.slug === 'mppsc')!.option.label).toMatch(/^MPPSC.*: 350×450 px, 25–100 KB$/);
  });

  it('every published strip document appears in the page copy', () => {
    const strip = getSeasonOrder().filter((p) => getKitDocuments(p).some((d) => d.needsNameDateStrip && !d.toVerify));
    const text = allText(nameDateCopy('en', nameDateExams('en')));
    for (const p of strip) expect(text).toContain(p.name.en);
  });

  it('JEE Main, NEET, TNPSC and SSC get "check your notice", with no KB claim', () => {
    for (const lang of ['en', 'hi'] as const) {
      const c = nameDateCopy(lang, nameDateExams(lang));
      const para = c.sections[0]!.paras[1]!;
      expect(para).toMatch(/JEE Main/);
      expect(para).toMatch(/TNPSC/);
      expect(para).toMatch(lang === 'en' ? /check your notice/ : /अपना नोटिस देखें/);
      expect(para).not.toMatch(/\d+\s*KB/);
    }
  });
});

describe('increase defaults match published ranges', () => {
  it('each chip’s starting maximum is a verified min–max pair in some published preset', () => {
    const pairs = new Set(
      getPublishedPresets().flatMap((p) =>
        getKitDocuments(p)
          .filter((d) => !d.toVerify && d.format !== 'pdf')
          .map((d) => `${d.minKB}-${d.maxKB}`),
      ),
    );
    for (const [min, max] of Object.entries(DEFAULT_MAX_FOR_MIN)) expect(pairs.has(`${min}-${max}`), `${min}-${max}`).toBe(true);
  });
});
