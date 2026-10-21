/**
 * Workstream D: preset data checks (SPEC 8, Appendix A, QUESTIONS Q1/Q4/Q7/Q15).
 * Schema validity itself is enforced when '@/content/presets' loads; these tests
 * pin the launch-set shape and the A.1 rules on top of it.
 */
import { readdirSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  getAllPresets,
  getPublishedPresets,
  getSeason,
  getSeasonOrder,
  getSources,
  docSlug,
  validatePresets,
} from '@/content/presets';
import { derivePx, ExamPresetSchema, DEFAULT_DERIVE_DPI } from '@/content/presets/schema';
import { seasonStatus, monthRuns } from '../../scripts/presets-check';

const DIR = fileURLToPath(new URL('../../src/content/presets/', import.meta.url));
const files = readdirSync(DIR).filter((f) => f.endsWith('.json') && f !== 'season.json');
const raw = Object.fromEntries(
  files.map((f) => [f, JSON.parse(readFileSync(join(DIR, f), 'utf8'))]),
);

/** QUESTIONS Q1: the 47-exam list and the 35 published at launch. */
const PUBLISHED = [
  'sbi-clerk',
  'sbi-po',
  'ibps-po',
  'ibps-clerk',
  'ibps-rrb-po',
  'ibps-rrb-clerk',
  'ibps-so',
  'rbi-assistant',
  'rbi-grade-b',
  'nabard-grade-a',
  'ssc-cgl',
  'ssc-gd',
  'ssc-cpo',
  'ssc-chsl',
  'ssc-mts',
  'rrb-alp',
  'rrb-group-d',
  'rrb-ntpc',
  'neet-ug',
  'jee-main',
  'cuet-ug',
  'ugc-net',
  'csir-net',
  'upsc-cse',
  'nda',
  'cds',
  'ctet',
  'htet',
  'reet',
  'bihar-police-constable',
  'uppsc-pcs',
  'mppsc',
  'iaf-agniveervayu',
  'india-post-gds',
  'dsssb',
];
const HIDDEN = [
  'uptet',
  'kvs-teacher',
  'bpsc-tre',
  'haryana-police',
  'up-police',
  'mp-police',
  'rajasthan-police',
  'bpsc-cce',
  'hpsc-hcs',
  'ukpsc',
  'rpsc-ras',
  'indian-army-agniveer',
];

const all = getAllPresets();
const bySlug = new Map(all.map((p) => [p.slug, p]));
const words = (s?: string) => (s ? s.split(/\s+/).filter(Boolean).length : 0);

describe('preset files', () => {
  it('every file validates against the schema', () => {
    for (const [f, data] of Object.entries(raw)) {
      const res = ExamPresetSchema.safeParse(data);
      expect(res.success, `${f}: ${res.success ? '' : JSON.stringify(res.error.issues)}`).toBe(
        true,
      );
    }
    expect(() => validatePresets(raw)).not.toThrow();
  });

  it('has exactly the 47 exams of QUESTIONS Q1', () => {
    expect(all.map((p) => p.slug).sort()).toEqual([...PUBLISHED, ...HIDDEN].sort());
    expect(files).toHaveLength(47);
  });

  it('publishes exactly 35 (Q1) and hides the other 12', () => {
    expect(
      getPublishedPresets()
        .map((p) => p.slug)
        .sort(),
    ).toEqual([...PUBLISHED].sort());
    for (const s of HIDDEN) expect(bySlug.get(s)?.published, s).toBe(false);
  });

  it('slugs are unique and match file names', () => {
    const slugs = all.map((p) => p.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
    for (const f of files) expect(raw[f].slug).toBe(f.replace(/\.json$/, ''));
  });

  it('related slugs exist, are unique and not self', () => {
    for (const p of all) {
      for (const r of p.related) expect(bySlug.has(r), `${p.slug} → ${r}`).toBe(true);
      expect(p.related).not.toContain(p.slug);
    }
  });

  it('published exams link only to published related exams', () => {
    for (const p of getPublishedPresets())
      for (const r of p.related) expect(bySlug.get(r)?.published, `${p.slug} → ${r}`).toBe(true);
  });

  it('document keys (docSlug) and file names are unique per exam', () => {
    for (const p of all) {
      const keys = p.documents.map((d) => docSlug(d));
      expect(new Set(keys).size, p.slug).toBe(keys.length);
      const names = p.documents.map((d) => d.fileName.toLowerCase());
      expect(new Set(names).size, p.slug).toBe(names.length);
    }
  });
});

describe('sizes (A.1 rules)', () => {
  it('derived px are within ±1 of physical × DPI', () => {
    let n = 0;
    for (const p of all)
      for (const d of p.documents) {
        if (!d.pxDerived) continue;
        n++;
        const dpi = d.dpi ?? DEFAULT_DERIVE_DPI;
        expect(d.physical, `${p.slug}/${docSlug(d)}`).toBeDefined();
        expect(
          Math.abs(d.widthPx! - derivePx(d.physical!.width, d.physical!.unit, dpi)),
        ).toBeLessThanOrEqual(1);
        expect(
          Math.abs(d.heightPx! - derivePx(d.physical!.height, d.physical!.unit, dpi)),
        ).toBeLessThanOrEqual(1);
        expect(d.sizeNote?.en, `${p.slug}/${docSlug(d)} sizeNote`).toMatch(/derived|DPI/);
      }
    expect(n).toBeGreaterThan(10);
  });

  it('no published exam has a document with maxKB null', () => {
    for (const p of getPublishedPresets())
      for (const d of p.documents) expect(d.maxKB, `${p.slug}/${docSlug(d)}`).not.toBeNull();
  });

  it('maxKB null only on toVerify documents (Q15)', () => {
    for (const p of all)
      for (const d of p.documents)
        if (d.maxKB === null) expect(d.toVerify, `${p.slug}/${docSlug(d)}`).toBe(true);
  });

  it('every published exam needs a signature', () => {
    for (const p of getPublishedPresets())
      expect(
        p.documents.some((d) => d.doc === 'signature'),
        p.slug,
      ).toBe(true);
  });

  it('SSC/RRB lead with signature and carry live-capture tips', () => {
    for (const p of all.filter((x) => x.body === 'SSC' || x.body === 'RRB')) {
      expect(p.photoUploadReplacedByLive, p.slug).toBe(true);
      expect(p.documents[0]?.doc, p.slug).toBe('signature');
      expect(p.liveCaptureTips?.length ?? 0, p.slug).toBeGreaterThanOrEqual(4);
    }
  });

  it('conflict overlaps from A.1 are applied with a note', () => {
    const doc = (s: string, k: string) => bySlug.get(s)!.documents.find((d) => docSlug(d) === k)!;
    const neet = bySlug.get('neet-ug')!.documents.find((d) => d.doc === 'thumb')!;
    expect([neet.minKB, neet.maxKB]).toEqual([50, 200]);
    expect(neet.sizeNote?.en).toMatch(/overlap/);
    const mp = doc('mppsc', 'photo');
    expect([mp.minKB, mp.maxKB]).toEqual([25, 100]);
    expect(mp.sizeNote?.en).toMatch(/Notice says .* portal accepts .* safe overlap/);
    const cpo = doc('ssc-cpo', 'signature');
    expect(cpo.physical).toEqual({ width: 6, height: 2, unit: 'cm' });
    expect(cpo.sizeNote?.en).toMatch(/4\.0×2\.0/);
    const dsssb = doc('dsssb', 'signature');
    expect(dsssb.maxKB).toBe(20);
  });

  it('special formats: UPSC triple, dual-language, two thumbs, name strip, slate', () => {
    for (const s of ['upsc-cse', 'nda', 'cds']) {
      const sig = bySlug.get(s)!.documents.find((d) => d.doc === 'signature')!;
      expect(sig.variant).toBe('triple');
      expect([sig.minWidthPx, sig.maxWidthPx, sig.minHeightPx, sig.maxHeightPx]).toEqual([
        350, 500, 350, 500,
      ]);
    }
    for (const s of ['bihar-police-constable', 'bpsc-cce', 'bpsc-tre']) {
      const keys = bySlug
        .get(s)!
        .documents.filter((d) => d.variant === 'dual-language')
        .map((d) => docSlug(d));
      expect(keys.sort(), s).toEqual(['signature-english', 'signature-hindi']);
    }
    expect(
      bySlug
        .get('dsssb')!
        .documents.filter((d) => d.doc === 'thumb')
        .map((d) => docSlug(d))
        .sort(),
    ).toEqual(['thumb-left', 'thumb-right']);
    for (const s of ['mppsc', 'ukpsc', 'hpsc-hcs', 'haryana-police'])
      expect(bySlug.get(s)!.documents.find((d) => d.doc === 'photo')?.needsNameDateStrip, s).toBe(
        true,
      );
    const iaf = bySlug.get('iaf-agniveervayu')!.documents.find((d) => d.doc === 'photo')!;
    expect(iaf.needsNameDateStrip).toBeFalsy();
    expect(iaf.captureTip?.en).toMatch(/slate/i);
  });

  it('RRB signature is a minimum-only range with 30–49 KB', () => {
    for (const s of ['rrb-alp', 'rrb-group-d', 'rrb-ntpc']) {
      const d = bySlug.get(s)!.documents[0]!;
      expect([d.minWidthPx, d.minHeightPx, d.maxWidthPx, d.minKB, d.maxKB], s).toEqual([
        140,
        60,
        undefined,
        30,
        49,
      ]);
    }
  });
});

describe('content (SPEC 9.4, K16, K1)', () => {
  it('published exams have 5–8 FAQs, rejection tips and enough words', () => {
    for (const p of getPublishedPresets()) {
      expect(p.faq.length, p.slug).toBeGreaterThanOrEqual(5);
      expect(p.faq.length, p.slug).toBeLessThanOrEqual(8);
      expect(p.rejectionTips.length, p.slug).toBeGreaterThanOrEqual(3);
      let w = 0;
      for (const d of p.documents) {
        for (const r of d.rules) w += words(r.en);
        w += words(d.sizeNote?.en) + words(d.captureTip?.en) + words(d.appliesTo?.en);
      }
      for (const t of p.rejectionTips) w += words(t.error) + words(t.fix.en);
      for (const f of p.faq) w += words(f.q.en) + words(f.a.en);
      for (const t of p.liveCaptureTips ?? []) w += words(t.en);
      w += words(p.declarationText?.en);
      expect(w, p.slug).toBeGreaterThanOrEqual(400);
      expect(w, p.slug).toBeLessThanOrEqual(900);
    }
  });

  it('FAQ answers are written per exam (no identical FAQ sets)', () => {
    const sigs = getPublishedPresets().map((p) => p.faq.map((f) => f.a.en).join('|'));
    expect(new Set(sigs).size).toBe(sigs.length);
  });

  it('Hindi is present and not a copy of the English', () => {
    for (const p of all) {
      expect(p.name.hi).not.toBe(p.name.en);
      for (const f of p.faq) {
        expect(f.q.hi, p.slug).not.toBe(f.q.en);
        expect(f.a.hi, p.slug).not.toBe(f.a.en);
      }
    }
  });

  it('aliases include a Hindi (Devanagari) name for search', () => {
    for (const p of all)
      expect(
        p.aliases.some((a) => /[ऀ-ॿ]/.test(a)),
        p.slug,
      ).toBe(true);
  });

  it('banking exams carry a declaration text; SBI uses its official DOB version', () => {
    for (const p of all.filter((x) => x.group === 'banking')) {
      expect(p.declarationText?.en, p.slug).toMatch(/hereby declare/);
      expect(
        p.documents.some((d) => d.doc === 'declaration'),
        p.slug,
      ).toBe(true);
    }
    for (const s of ['sbi-clerk', 'sbi-po']) {
      expect(bySlug.get(s)!.declarationText?.en).toMatch(/Date of Birth/);
      expect(bySlug.get(s)!.declarationText?.toVerify).toBeFalsy();
    }
  });

  it('source metadata is complete', () => {
    for (const p of all) {
      expect(p.sourceUrl).toMatch(/^https:\/\//);
      expect(p.lastChecked).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      if (p.confidence === 'L' || p.confidence === 'M/L') expect(p.checkedBy).toMatch(/unverified/);
    }
    expect(getSources()).toHaveLength(35);
  });
});

describe('season.json and presets:check', () => {
  it('season order lists only published, unique slugs', () => {
    const order = getSeason().order;
    expect(new Set(order).size).toBe(order.length);
    for (const s of order) expect(bySlug.get(s)?.published, s).toBe(true);
    expect(getSeasonOrder()).toHaveLength(35);
  });

  it('monthRuns groups consecutive months, wrapping December → January', () => {
    expect(monthRuns([7, 8])).toEqual([[7, 8]]);
    expect(monthRuns([12, 1])).toEqual([[12, 1]]);
    expect(monthRuns([1, 7])).toEqual([[1], [7]]);
    expect(monthRuns([])).toEqual([]);
  });

  it('seasonStatus reports a season starting within 30 days', () => {
    const today = new Date('2026-10-21T00:00:00Z');
    expect(seasonStatus([11, 12], today)).toMatchObject({ kind: 'soon', days: 11 });
    expect(seasonStatus([10, 11], today)).toMatchObject({ kind: 'now' });
    expect(seasonStatus([2, 3], today)).toBeNull();
    expect(seasonStatus([12, 1], new Date('2026-12-15T00:00:00Z'))).toMatchObject({ kind: 'now' });
  });
});
