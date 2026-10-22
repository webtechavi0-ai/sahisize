import { describe, expect, it } from 'vitest';
import {
  clampDescription,
  compressMeta,
  compressTitle,
  examDocMeta,
  examDocTitle,
  examH1,
  examMeta,
  examTitle,
  withSiteName,
} from '@/seo/meta';
import { docPhrase, docSummary, formatDate, kbText, pxText } from '@/seo/spec-text';
import { hreflangLinks } from '@/seo/hreflang';
import type { ExamPreset, PresetDocument } from '@/content/presets/schema';

const doc = (o: Partial<PresetDocument>): PresetDocument =>
  ({
    doc: 'photo',
    label: { en: 'Photograph', hi: 'फोटो' },
    widthPx: 200,
    heightPx: 230,
    minKB: 20,
    maxKB: 50,
    format: 'jpg',
    dpi: 200,
    fileName: 'photo.jpg',
    rules: [{ en: 'White background', hi: 'सफेद बैकग्राउंड' }],
    ...o,
  }) as PresetDocument;

const ibps = {
  name: { en: 'IBPS PO', hi: 'आईबीपीएस पीओ' },
  cycle: '2026',
  photoUploadReplacedByLive: false,
  documents: [
    doc({}),
    doc({ doc: 'signature', label: { en: 'Signature', hi: 'हस्ताक्षर' }, widthPx: 140, heightPx: 60, minKB: 10, maxKB: 20, fileName: 'sign.jpg' }),
    doc({ doc: 'thumb', label: { en: 'Left thumb impression', hi: 'अंगूठा' }, widthPx: 240, heightPx: 240, fileName: 'thumb.jpg' }),
  ],
} as unknown as ExamPreset;

const ssc = {
  name: { en: 'SSC CGL', hi: 'एसएससी सीजीएल' },
  cycle: '2026',
  photoUploadReplacedByLive: true,
  documents: [
    doc({ doc: 'signature', label: { en: 'Signature', hi: 'हस्ताक्षर' }, widthPx: 472, heightPx: 157, minKB: 10, maxKB: 20, fileName: 'sign.jpg', physical: { width: 6, height: 2, unit: 'cm' }, pxDerived: true }),
  ],
} as unknown as ExamPreset;

describe('exam title (spec-first, <= 60 characters)', () => {
  it('matches the template for a full kit', () => {
    expect(examTitle(ibps)).toBe('IBPS PO Photo, Signature & Thumb Size 2026 | SahiSize');
  });
  it('live-photo exams still name the photo the page covers (SSC)', () => {
    expect(examTitle(ssc)).toBe('SSC CGL Photo & Signature Size 2026 | SahiSize');
  });
  it('drops the brand first, then the thumb, then the bracketed name', () => {
    const long = { ...ibps, name: { en: 'IBPS RRB PO (Officer Scale I)', hi: 'x' } } as ExamPreset;
    expect(examTitle(long)).toBe('IBPS RRB PO (Officer Scale I) Photo & Signature Size 2026');
    const longer = { ...ibps, name: { en: 'IBPS RRB Clerk (Office Assistant) Extra', hi: 'x' } } as ExamPreset;
    expect(examTitle(longer)).toBe('IBPS RRB Clerk Extra Photo, Signature & Thumb Size 2026');
  });
  it('Hindi template', () => {
    expect(examTitle(ibps, 'hi')).toBe('आईबीपीएस पीओ फोटो, सिग्नेचर और अंगूठा साइज़ 2026 | SahiSize');
  });
  it('keyword titles from exam-seo win for English', () => {
    expect(examTitle({ ...ssc, slug: 'ctet' } as ExamPreset)).toBe(
      'CTET Photo Size 2026 and Signature Size | SahiSize',
    );
  });
  it('H1 per SPEC 6.3', () => {
    expect(examH1(ibps)).toBe('IBPS PO 2026 Photo, Signature & Thumb Size — Resize Free');
  });
  it('description is unique per exam, 120–155 chars and names the numbers', () => {
    const a = examMeta(ibps).description;
    const b = examMeta(ssc).description;
    expect(a).not.toBe(b);
    expect(a.length).toBeLessThanOrEqual(155);
    expect(a.length).toBeGreaterThanOrEqual(120);
    expect(a).toContain('200×230 px');
    expect(a).toContain('20–50 KB');
    expect(b).toContain('live');
  });
});

describe('exam document title', () => {
  it('fixed px', () => {
    expect(examDocTitle(ibps, ibps.documents[1]!)).toBe(
      'IBPS PO Signature Size: 140×60 px, 10–20 KB | SahiSize',
    );
  });
  it('KB-only falls back to physical size, then omits', () => {
    const kbOnly = doc({ widthPx: null, heightPx: null, minKB: 10, maxKB: 200 });
    expect(examDocTitle(ibps, kbOnly)).toBe('IBPS PO Photo Size: 10–200 KB | SahiSize');
    const phys = doc({ widthPx: null, heightPx: null, physical: { width: 3.5, height: 4.5, unit: 'cm' }, minKB: null, maxKB: 100 });
    expect(examDocTitle(ibps, phys)).toBe('IBPS PO Photo Size: 3.5×4.5 cm, up to 100 KB | SahiSize');
  });
  it('drops the brand, then shortens the document label', () => {
    const name = { en: 'IBPS RRB PO (Officer Scale I)', hi: 'x' };
    const p = { ...ibps, name } as ExamPreset;
    expect(examDocTitle({ ...ibps, name: { en: 'IBPS RRB PO (Scale I)', hi: 'x' } } as ExamPreset, ibps.documents[2]!)).toBe(
      'IBPS RRB PO (Scale I) Left Thumb Size: 240×240 px, 20–50 KB',
    );
    // Then the bracketed part of the exam name, before the pixels.
    expect(examDocTitle(p, ibps.documents[1]!)).toBe(
      'IBPS RRB PO Signature Size: 140×60 px, 10–20 KB',
    );
  });
  it('a toVerify document never states its size', () => {
    const tv = doc({ doc: 'certificate', label: { en: 'Class 10 (SSC/SSLC) certificate', hi: 'x' }, widthPx: null, heightPx: null, minKB: null, maxKB: 500, format: 'pdf', fileName: 'c.pdf', toVerify: true });
    const m = examDocMeta(ibps, tv);
    expect(m.title).toBe('IBPS PO 10th Certificate Size (to verify) | SahiSize');
    expect(m.title + m.description).not.toMatch(/500/);
  });
  it('description 120–155', () => {
    const d = examDocMeta(ibps, ibps.documents[0]!).description;
    expect(d.length).toBeLessThanOrEqual(155);
    expect(d.length).toBeGreaterThanOrEqual(120);
  });
});

describe('SPEC 9.2 compress', () => {
  it('matches the template', () => {
    expect(compressTitle(20)).toBe('20 KB Photo Size: Compress Image to 20 KB | SahiSize');
    expect(compressTitle(500, 'en', 'Compress Photo to').length).toBeLessThanOrEqual(60);
    expect(compressMeta(50).description).toContain('45');
  });
});

describe('spec-text helpers', () => {
  it('px ranges', () => {
    expect(pxText(doc({ widthPx: null, heightPx: null, minWidthPx: 140, minHeightPx: 60 }))).toBe('min 140×60 px');
    expect(
      pxText(doc({ widthPx: null, heightPx: null, minWidthPx: 350, maxWidthPx: 500, minHeightPx: 350, maxHeightPx: 500 })),
    ).toBe('350–500 × 350–500 px');
    expect(pxText(doc({ widthPx: null, heightPx: null }))).toBeNull();
  });
  it('kb text', () => {
    expect(kbText({ minKB: null, maxKB: 40 })).toBe('up to 40 KB');
    expect(kbText({ minKB: 30, maxKB: 49 })).toBe('30–49 KB');
    expect(kbText({ minKB: null, maxKB: null })).toBeNull();
  });
  it('summary marks size to verify', () => {
    expect(docSummary(doc({ format: 'pdf', widthPx: null, heightPx: null, maxKB: null, minKB: null, doc: 'certificate' }))).toBe(
      'size to verify · PDF',
    );
  });
  it('doc phrase', () => {
    expect(docPhrase([{ doc: 'photo' }, { doc: 'signature' }])).toBe('Photo & Signature');
  });
  it('dates', () => {
    expect(formatDate('2026-10-12')).toBe('12 Oct 2026');
    expect(formatDate('2026-10-12', 'hi')).toBe('12 अक्टूबर 2026');
  });
  it('clamps long descriptions at a word boundary', () => {
    const s = clampDescription('word '.repeat(60));
    expect(s.length).toBeLessThanOrEqual(155);
    expect(s.endsWith('…')).toBe(true);
  });
  it('withSiteName', () => {
    expect(withSiteName('About')).toBe('About | SahiSize');
    expect(withSiteName('X | SahiSize')).toBe('X | SahiSize');
  });
});

describe('hreflang', () => {
  it('only emits pairs when a Hindi page exists', () => {
    expect(hreflangLinks({ en: '/about', hi: null })).toEqual([]);
    const l = hreflangLinks({ en: '/exam/ibps-po', hi: '/hi/exam/ibps-po' });
    expect(l.map((x) => x.hreflang)).toEqual(['en-IN', 'hi-IN', 'x-default']);
    expect(l[1]!.href.endsWith('/hi/exam/ibps-po')).toBe(true);
  });
});
