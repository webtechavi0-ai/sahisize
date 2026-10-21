import { describe, expect, it } from 'vitest';
import type { DocSpec } from '@/engine/types';
import {
  docSlug,
  getAllPresets,
  getPreset,
  getPublishedPresets,
  getSearchIndex,
  getSeasonOrder,
  getSources,
  presetHash,
  PresetValidationError,
  toDocSpec,
  validatePresets,
} from '@/content/presets';
import {
  derivePx,
  DocSpecSchema,
  type DocSpecParsed,
  type PresetDocument,
} from '@/content/presets/schema';

// Compile-time: schema output types are assignable to the engine DocSpec (PLAN 3.2).
const _a: DocSpec = {} as DocSpecParsed;
const _b: DocSpec = {} as PresetDocument;
void _a;
void _b;

const clone = <T>(v: T): T => JSON.parse(JSON.stringify(v)) as T;

describe('preset registry', () => {
  it('loads and validates the seed presets', () => {
    const slugs = getAllPresets().map((p) => p.slug);
    expect(slugs).toEqual(expect.arrayContaining(['ibps-po', 'sbi-clerk', 'ssc-cgl']));
    expect(getPublishedPresets().every((p) => p.published)).toBe(true);
    expect(getPreset('ibps-po')?.documents.map((d) => docSlug(d))).toEqual([
      'photo',
      'signature',
      'thumb',
      'declaration',
    ]);
    expect(getSeasonOrder()[0]?.slug).toBe('ibps-po');
    expect(getSources().length).toBe(getPublishedPresets().length);
    expect(getSearchIndex().find((e) => e.slug === 'ssc-cgl')).toMatchObject({
      body: 'SSC',
      group: 'ssc',
      published: true,
    });
  });

  it('toDocSpec yields a valid engine DocSpec without UI-only fields', () => {
    const doc = getPreset('ssc-cgl')!.documents[0]!;
    const spec = toDocSpec(doc);
    expect(DocSpecSchema.safeParse(spec).success).toBe(true);
    expect('sizeNote' in spec).toBe(false);
    expect(spec.physical).toEqual({ width: 6, height: 2, unit: 'cm' });
  });

  it('presetHash is stable and changes with engine-relevant fields only', () => {
    const p = getPreset('ibps-po')!;
    expect(presetHash(p)).toBe(presetHash(clone(p)));
    const relabeled = clone(p);
    relabeled.documents[0]!.label.en = 'Photo';
    expect(presetHash(relabeled)).toBe(presetHash(p));
    const changed = clone(p);
    changed.documents[0]!.maxKB = 60;
    expect(presetHash(changed)).not.toBe(presetHash(p));
  });

  it('derives px from cm at 200 DPI', () => {
    expect(derivePx(6, 'cm', 200)).toBe(472);
    expect(derivePx(2, 'cm', 200)).toBe(157);
  });
});

describe('preset validation rejects broken data (SPEC 8.1)', () => {
  const base = () =>
    clone(getPreset('ibps-po')!) as unknown as Record<string, unknown> & {
      documents: Record<string, unknown>[];
      related: string[];
    };
  const others = () =>
    Object.fromEntries(
      getAllPresets()
        .filter((p) => p.slug !== 'ibps-po')
        .map((p) => [`${p.slug}.json`, p]),
    );
  const expectInvalid = (mutate: (p: ReturnType<typeof base>) => void, msg: RegExp) => {
    const p = base();
    mutate(p);
    expect(() => validatePresets({ ...others(), 'ibps-po.json': p })).toThrow(
      PresetValidationError,
    );
    expect(() => validatePresets({ ...others(), 'ibps-po.json': p })).toThrow(msg);
  };

  it('accepts the unmodified seeds', () => {
    expect(() => validatePresets({ ...others(), 'ibps-po.json': base() })).not.toThrow();
  });
  it('minKB >= maxKB', () =>
    expectInvalid((p) => (p.documents[0]!.minKB = 60), /minKB must be < maxKB/));
  it('only one of widthPx/heightPx', () =>
    expectInvalid((p) => (p.documents[0]!.heightPx = null), /both be set/));
  it('duplicate fileName', () =>
    expectInvalid((p) => (p.documents[1]!.fileName = 'photo.jpg'), /duplicate fileName/));
  it('fileName too long', () =>
    expectInvalid((p) => (p.documents[0]!.maxFileNameChars = 5), /maxFileNameChars/));
  it('pdf for a non-certificate', () =>
    expectInvalid((p) => {
      p.documents[0]!.format = 'pdf';
      p.documents[0]!.fileName = 'photo.pdf';
    }, /only allowed for doc 'certificate'/));
  it('pxDerived arithmetic', () =>
    expectInvalid((p) => {
      p.documents[1]!.physical = { width: 6, height: 2, unit: 'cm' };
      p.documents[1]!.pxDerived = true;
    }, /derived at 200 DPI/));
  it('related slug missing', () =>
    expectInvalid((p) => p.related.push('no-such-exam'), /does not exist/));
  it('slug must match file name', () =>
    expectInvalid((p) => (p.slug = 'ibps-po-x'), /must match file name/));
  it('L confidence cannot be published', () =>
    expectInvalid((p) => (p.confidence = 'L'), /confidence 'L'/));
  it('unknown keys are rejected', () => expectInvalid((p) => (p.extra = 1), /Unrecognized key/));
  it('duplicate doc slug needs explicit slug (Q7)', () =>
    expectInvalid((p) => {
      p.documents.push({ ...clone(p.documents[1]!), fileName: 'sign2.jpg' });
    }, /duplicate document slug/));
});

describe('maxKB null only with toVerify (Q15)', () => {
  const others = () =>
    Object.fromEntries(
      getAllPresets()
        .filter((p) => p.slug !== 'ibps-po')
        .map((p) => [`${p.slug}.json`, p]),
    );
  const withCert = (toVerify: boolean | undefined) => {
    const p = clone(getPreset('ibps-po')!) as unknown as { documents: Record<string, unknown>[] };
    p.documents.push({
      doc: 'certificate',
      label: { en: '10th certificate', hi: '10वीं का सर्टिफिकेट' },
      widthPx: null,
      heightPx: null,
      minKB: null,
      maxKB: null,
      format: 'pdf',
      dpi: null,
      fileName: 'cert10.pdf',
      rules: [],
      ...(toVerify === undefined ? {} : { toVerify }),
    });
    return p;
  };

  it('accepts maxKB null with toVerify and excludes it from the kit', async () => {
    const list = validatePresets({ ...others(), 'ibps-po.json': withCert(true) });
    const p = list.find((x) => x.slug === 'ibps-po')!;
    const { getKitDocuments, isFittable } = await import('@/content/presets');
    expect(p.documents).toHaveLength(5);
    expect(getKitDocuments(p).map((d) => d.doc)).not.toContain('certificate');
    expect(isFittable(p.documents[4]!)).toBe(false);
  });

  it('rejects maxKB null without toVerify', () => {
    expect(() => validatePresets({ ...others(), 'ibps-po.json': withCert(undefined) })).toThrow(
      /toVerify/,
    );
    expect(() => validatePresets({ ...others(), 'ibps-po.json': withCert(false) })).toThrow(
      /toVerify/,
    );
  });

  it('DocSpecSchema (engine input) never accepts maxKB null', () => {
    const spec = toDocSpec(getPreset('ibps-po')!.documents[0]!);
    expect(DocSpecSchema.safeParse({ ...spec, maxKB: null }).success).toBe(false);
    expect(DocSpecSchema.safeParse({ ...spec, aspect: 0.8 }).success).toBe(true);
  });
});
