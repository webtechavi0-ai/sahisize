import { describe, expect, it } from 'vitest';
import { search, searchOther } from '@/lib/search';
import { getSearchIndex } from '@/content/presets';
import {
  OTHER_DOC_ALIASES,
  getOtherDocsSearchIndex,
  notExamChips,
  otherDocCards,
  type OtherDocId,
} from '@/config/other-docs';
import { ID_NOT_COVERED, PAN_PHOTO_SPEC, PAN_SIGNATURE_SPEC } from '@/config/id-documents';

const DOCS = getOtherDocsSearchIndex();
const top = (q: string) => searchOther(q, DOCS)[0]?.entry;

const EXPECT: [string, OtherDocId, string][] = [
  ['pan', 'pan-photo', '/id-documents/pan-card-photo-size'],
  ['pan card', 'pan-photo', '/id-documents/pan-card-photo-size'],
  ['nsdl', 'pan-photo', '/id-documents/pan-card-photo-size'],
  ['protean', 'pan-photo', '/id-documents/pan-card-photo-size'],
  ['uti', 'pan-photo', '/id-documents/pan-card-photo-size'],
  ['pan signature', 'pan-signature', '/id-documents/pan-card-signature-size'],
  ['passport', 'passport', '/tools/passport-size-photo'],
  ['passport size', 'passport', '/tools/passport-size-photo'],
  ['stamp', 'stamp', '/tools/stamp-size-photo'],
  ['postcard', 'postcard', '/tools/postcard-size-photo'],
  ['custom', 'custom', '/tools/custom-preset'],
  ['own size', 'custom', '/tools/custom-preset'],
  ['my exam is not listed', 'custom', '/tools/custom-preset'],
  ['aadhar', 'aadhaar', '/id-documents#not-covered'],
  ['adhar', 'aadhaar', '/id-documents#not-covered'],
  ['aadhaar', 'aadhaar', '/id-documents#not-covered'],
  ['aadhar card', 'aadhaar', '/id-documents#not-covered'],
  ['uidai', 'aadhaar', '/id-documents#not-covered'],
];

describe('Other documents search group', () => {
  it.each(EXPECT)('"%s" -> %s (%s)', (q, id, href) => {
    const e = top(q);
    expect(e?.id).toBe(id);
    expect(e?.href.en).toBe(href);
  });

  it('every alias in the table resolves to its own entry', () => {
    for (const [id, aliases] of Object.entries(OTHER_DOC_ALIASES)) {
      for (const a of aliases) expect(top(a)?.id, a).toBe(id);
    }
  });

  it('typo tolerance still works', () => {
    expect(top('pasport')?.id).toBe('passport');
    expect(top('postcrd')?.id).toBe('postcard');
    expect(top('aadhr')?.id).toBe('aadhaar');
    expect(top('protien')?.id).toBe('pan-photo');
  });

  it('Aadhaar result carries the enrolment-centre note and links to the hub anchor (en + hi)', () => {
    const a = DOCS.find((d) => d.id === 'aadhaar')!;
    expect(a.note).toEqual(ID_NOT_COVERED[0]!.reason);
    expect(a.note!.en).toMatch(/enrolment centre/);
    expect(a.href).toEqual({ en: '/id-documents#not-covered', hi: '/hi/id-documents#not-covered' });
  });

  it('never mixes into exam results: exam index has no doc entries, exam queries hit no docs', () => {
    const exams = getSearchIndex();
    for (const q of ['aadhar', 'pan card', 'passport', 'uidai']) {
      expect(search(q, exams).map((h) => h.entry.slug)).not.toContain('pan-card-photo-size');
    }
    for (const q of ['ibps po', 'ssc cgl', 'neet', 'rrb ntpc', 'ctet', 'sbi clerk', 'up police', 'upsc']) {
      expect(searchOther(q, DOCS), q).toEqual([]);
    }
  });

  it('Hindi links go to /hi routes where they exist', () => {
    const byId = new Map(DOCS.map((d) => [d.id, d]));
    expect(byId.get('pan-photo')!.href.hi).toBe('/hi/id-documents/pan-card-photo-size');
    expect(byId.get('pan-signature')!.href.hi).toBe('/id-documents/pan-card-signature-size');
    expect(byId.get('passport')!.href.hi).toBe('/hi/tools/passport-size-photo');
    expect(byId.get('custom')!.href.hi).toBe('/tools/custom-preset');
  });
});

describe('Other documents cards and chips', () => {
  it('PAN spec text comes from the id-documents config', () => {
    const [photo, sig] = otherDocCards('en');
    expect(photo!.spec).toBe(
      `Protean (NSDL) · ${PAN_PHOTO_SPEC.physical!.height}×${PAN_PHOTO_SPEC.physical!.width} cm · ≤ ${PAN_PHOTO_SPEC.maxKB} KB`,
    );
    expect(photo!.spec).toBe('Protean (NSDL) · 3.5×2.5 cm · ≤ 20 KB');
    expect(sig!.spec).toBe(`Protean (NSDL) · 2×4.5 cm · ≤ ${PAN_SIGNATURE_SPEC.maxKB} KB`);
    expect(photo!.note).toBe('Not affiliated with NSDL/UTIITSL');
  });

  it('size tool cards use the tool presets', () => {
    const cards = otherDocCards('en');
    expect(cards.map((c) => c.id)).toEqual(['pan-photo', 'pan-signature', 'passport', 'stamp', 'postcard', 'custom']);
    expect(cards.find((c) => c.id === 'passport')!.spec).toBe('3.5×4.5 cm · 276×354 px');
    expect(cards.find((c) => c.id === 'stamp')!.spec).toBe('2×2.5 cm · 157×197 px');
    expect(cards.find((c) => c.id === 'postcard')!.spec).toBe('4×6 in · 800×1200 px');
  });

  it('chips link to PAN, passport size and custom size (Hindi routes on /hi)', () => {
    expect(notExamChips('en').map((c) => c.href)).toEqual([
      '/id-documents/pan-card-photo-size',
      '/tools/passport-size-photo',
      '/tools/custom-preset',
    ]);
    expect(notExamChips('hi').map((c) => c.href)).toEqual([
      '/hi/id-documents/pan-card-photo-size',
      '/hi/tools/passport-size-photo',
      '/tools/custom-preset',
    ]);
  });
});
