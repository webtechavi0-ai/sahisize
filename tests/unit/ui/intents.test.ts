import { describe, expect, it } from 'vitest';
import { parseQuery } from '@/lib/intents';
import { pickKb, siteSearch, type SiteSearchData, type ToolEntry } from '@/lib/site-search';
import { getKitDocuments, getPreset, getSearchIndex, getSeasonOrder, docSlug } from '@/content/presets';
import { getOtherDocsSearchIndex } from '@/config/other-docs';
import { COMPRESS_KB_TARGETS, JPG_PDF_KB_TARGETS, PDF_KB_TARGETS } from '@/config/tools';
import { cardMatches } from '@/scripts/exams-filter';

const tool = (id: string, en: string, cat: ToolEntry['cat'], aliases: string[], docs?: ToolEntry['docs']): ToolEntry => ({
  id,
  en,
  hi: en,
  aliases,
  cat,
  href: { en: `/tools/${id}`, hi: null },
  ...(docs ? { docs } : {}),
});

// Mirrors src/lib/nav-data.ts TOOL_META (that module needs astro:content).
const TOOLS: ToolEntry[] = [
  tool('compress-image', 'Compress image', 'kb', ['photo', 'compress photo', 'reduce photo size'], ['photo']),
  tool('resize-image', 'Resize image', 'size', ['photo', 'resize photo', 'pixel'], ['photo']),
  tool('signature-resize', 'Signature resize', 'signature', ['signature', 'sign', 'हस्ताक्षर', 'सिग्नेचर'], ['signature']),
  tool('thumb-impression', 'Thumb impression', 'documents', ['thumb', 'angutha'], ['thumb']),
  tool('images-to-pdf', 'Images to PDF', 'pdf', ['jpg to pdf', 'image to pdf'], ['certificate']),
  tool('compress-pdf', 'Compress PDF', 'pdf', ['pdf', 'pdf compress', 'reduce pdf']),
  {
    ...tool('passport-size-photo', 'Passport size photo', 'documents', ['passport', 'passport photo']),
    href: { en: '/tools/passport-size-photo', hi: '/hi/tools/passport-size-photo' },
  },
];

const DATA: SiteSearchData = {
  exams: getSearchIndex().map((e) => {
    const p = getPreset(e.slug)!;
    return {
      ...e,
      docs: [...new Set(p.documents.map((d) => d.doc))],
      pages: e.published ? getKitDocuments(p).map((d) => docSlug(d)) : [],
    };
  }),
  tools: TOOLS,
  docs: getOtherDocsSearchIndex(),
  guides: [
    { id: 'reduce-photo-size-to-20kb-on-mobile', en: 'Reduce photo size to 20 KB on mobile', hi: '', aliases: [], href: '/guides/x' },
    { id: 'scan-signature-with-phone', en: 'Scan your signature with a phone', hi: '', aliases: [], href: '/guides/y' },
  ],
  kb: { img: [...COMPRESS_KB_TARGETS], pdf: [...PDF_KB_TARGETS], jpgPdf: [...JPG_PDF_KB_TARGETS], hi: [] },
  rank: getSeasonOrder().map((p) => p.slug),
};

const run = (q: string) => siteSearch(q, DATA);
const kinds = (q: string) => run(q).map((g) => g.kind);
const exams = (q: string) =>
  run(q)
    .find((g) => g.kind === 'exam')
    ?.hits.map((h) => (h.kind === 'exam' ? h.entry : null)!) ?? [];
const examSlugs = (q: string) => exams(q).map((e) => e.slug);
const groupsOf = (q: string) => new Set(exams(q).map((e) => e.group));
const first = (q: string) => run(q)[0]?.hits[0];

describe('intent words (parseQuery)', () => {
  it.each([
    ['bank', 'banking'],
    ['बैंक', 'banking'],
    ['railway', 'railway'],
    ['rail', 'railway'],
    ['रेलवे', 'railway'],
    ['railwy', 'railway'],
    ['police', 'police'],
    ['पुलिस', 'police'],
    ['polise', 'police'],
    ['teacher', 'teaching'],
    ['शिक्षक', 'teaching'],
    ['tet', 'teaching'],
    ['army', 'defence'],
  ])('"%s" -> group %s', (q, g) => {
    expect([...parseQuery(q).groups]).toContain(g);
  });

  it.each([
    ['photo', 'photo'],
    ['फोटो', 'photo'],
    ['signature', 'signature'],
    ['sign', 'signature'],
    ['सिग्नेचर', 'signature'],
    ['हस्ताक्षर', 'signature'],
    ['thumb', 'thumb'],
  ])('"%s" -> document %s', (q, d) => {
    expect(parseQuery(q).doc).toBe(d);
  });

  it('KB numbers and PDF', () => {
    expect(parseQuery('photo 20kb').kb).toBe(20);
    expect(parseQuery('photo 20 KB').kb).toBe(20);
    expect([...parseQuery('photo 20kb').tools]).toContain('kb');
    const pdf = parseQuery('pdf 200kb');
    expect(pdf.kb).toBe(200);
    expect(pdf.pdf).toBe(true);
    expect([...pdf.tools]).toContain('pdf');
    expect(parseQuery('jpg to pdf 300 kb').toPdf).toBe(true);
  });

  it('drops noise words and keeps the rest for name matching', () => {
    expect(parseQuery('bank po form').rest).toBe('po');
    expect(parseQuery('sbi clerk form 2026').rest).toBe('sbi clerk');
    expect(parseQuery('police bharti').rest).toBe('');
    expect(parseQuery('railway group d').rest).toBe('group d');
  });

  it('pickKb: exact, else the largest below, else the smallest', () => {
    expect(pickKb(20, [10, 20, 50])).toBe(20);
    expect(pickKb(12, [10, 20, 50])).toBe(10);
    expect(pickKb(5, [10, 20])).toBe(10);
  });
});

describe('site search (owner queries)', () => {
  it('"bank po" -> IBPS PO, SBI PO and IBPS RRB PO first, banking only', () => {
    const s = examSlugs('bank po');
    expect(s.slice(0, 3).sort()).toEqual(['ibps-po', 'ibps-rrb-po', 'sbi-po']);
    expect(groupsOf('bank po')).toEqual(new Set(['banking']));
  });

  it('"sbi clerk form" -> SBI Clerk first', () => {
    expect(examSlugs('sbi clerk form')[0]).toBe('sbi-clerk');
  });

  it('"bank clerk form" -> the bank clerk exams', () => {
    expect(examSlugs('bank clerk form')).toEqual(expect.arrayContaining(['ibps-clerk', 'sbi-clerk', 'ibps-rrb-clerk']));
    expect(groupsOf('bank clerk form')).toEqual(new Set(['banking']));
  });

  it('"railway form", "रेलवे", "railway group d" -> RRB', () => {
    expect(groupsOf('railway form')).toEqual(new Set(['railway']));
    expect(groupsOf('रेलवे')).toEqual(new Set(['railway']));
    expect(examSlugs('railway group d')[0]).toBe('rrb-group-d');
  });

  it('"police bharti" and "पुलिस" -> police exams (no India Post)', () => {
    for (const q of ['police bharti', 'पुलिस']) {
      const s = examSlugs(q);
      expect(s).toContain('bihar-police-constable');
      expect(s).not.toContain('india-post-gds');
    }
  });

  it('"teacher" / "शिक्षक" -> CTET, REET, HTET', () => {
    for (const q of ['teacher', 'शिक्षक']) {
      expect(examSlugs(q)).toEqual(expect.arrayContaining(['ctet', 'reet', 'htet']));
    }
  });

  it('"neet photo" / "neet form" -> NEET UG first; "neet photo" links its photo page', () => {
    const h = exams('neet photo');
    expect(h[0]!.slug).toBe('neet-ug');
    const hit = run('neet photo')[0]!.hits[0]!;
    expect(hit.kind === 'exam' && hit.doc).toBe('photo');
    expect(examSlugs('neet form')).toEqual(['neet-ug']);
  });

  it('"photo 20kb" -> the 20 KB page first, tools group first', () => {
    expect(kinds('photo 20kb')[0]).toBe('tool');
    const h = first('photo 20kb')!;
    expect(h.kind === 'kb' && h.path).toBe('/tools/compress-image-to-20kb');
  });

  it('"pdf 200kb" -> compress PDF to 200 KB', () => {
    const h = first('pdf 200kb')!;
    expect(h.kind === 'kb' && h.path).toBe('/tools/compress-pdf-to-200kb');
  });

  it('"compress pdf" and "pdf" -> the PDF tools', () => {
    const h = first('compress pdf')!;
    expect(h.kind === 'tool' && h.entry.id).toBe('compress-pdf');
    const ids = run('pdf')
      .find((g) => g.kind === 'tool')!
      .hits.map((x) => (x.kind === 'tool' ? x.entry.id : ''));
    expect(ids).toEqual(expect.arrayContaining(['compress-pdf', 'images-to-pdf']));
  });

  it('"signature" / "सिग्नेचर" -> signature tool first, then exam signature pages', () => {
    for (const q of ['signature', 'सिग्नेचर']) {
      const g = run(q);
      expect(g[0]!.kind).toBe('tool');
      const h = g[0]!.hits[0]!;
      expect(h.kind === 'tool' && h.entry.id).toBe('signature-resize');
      const ex = g.find((x) => x.kind === 'exam')!;
      expect(ex.hits.length).toBeGreaterThan(0);
      expect(ex.hits.every((x) => x.kind === 'exam' && x.doc === 'signature')).toBe(true);
    }
  });

  it('"20 kb", "passport", "signature" offer the tool pages under Tools', () => {
    const toolGroup = (q: string) => run(q).find((g) => g.kind === 'tool');
    const kb = toolGroup('20 kb')!.hits[0]!;
    expect(kb.kind === 'kb' && kb.path).toBe('/tools/compress-image-to-20kb');
    const pass = toolGroup('passport')!.hits[0]!;
    expect(pass.kind === 'tool' && pass.entry.id).toBe('passport-size-photo');
    // Listed once: not repeated under Other documents.
    const docs = run('passport').find((g) => g.kind === 'doc');
    expect(docs?.hits.some((h) => h.kind === 'doc' && h.entry.id === 'passport') ?? false).toBe(false);
    const sig = toolGroup('signature')!.hits[0]!;
    expect(sig.kind === 'tool' && sig.entry.id).toBe('signature-resize');
  });

  it('"pan" -> PAN pages in Other documents only', () => {
    expect(kinds('pan')).toEqual(['doc']);
  });

  it('"फोटो" -> photo tools and popular exam photo pages', () => {
    expect(kinds('फोटो')).toEqual(expect.arrayContaining(['tool', 'exam']));
  });

  it('nonsense -> no groups (the island shows the empty state)', () => {
    expect(run('zzqqxx')).toEqual([]);
  });

  it('exact names still win: "ibps po", "ssc cgl"', () => {
    expect(examSlugs('ibps po')[0]).toBe('ibps-po');
    expect(examSlugs('ssc cgl')[0]).toBe('ssc-cgl');
  });
});

describe('/exams filter with intents', () => {
  const card = (slug: string) => {
    const e = DATA.exams.find((x) => x.slug === slug)!;
    return { slug, group: e.group, search: [e.en, e.hi, e.body, ...e.aliases, e.slug].join(' ').toLowerCase() };
  };
  it('"bank po" keeps the banking POs only', () => {
    expect(cardMatches(card('ibps-po'), 'bank po')).toBe(true);
    expect(cardMatches(card('sbi-po'), 'bank po')).toBe(true);
    expect(cardMatches(card('ssc-cgl'), 'bank po')).toBe(false);
  });
  it('"police bharti" keeps police exams', () => {
    expect(cardMatches(card('bihar-police-constable'), 'police bharti')).toBe(true);
    expect(cardMatches(card('india-post-gds'), 'police bharti')).toBe(false);
  });
  it('"sbi clerk form" ignores "form"', () => {
    expect(cardMatches(card('sbi-clerk'), 'sbi clerk form')).toBe(true);
  });
});
