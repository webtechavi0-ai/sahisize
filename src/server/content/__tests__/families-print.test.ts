import { describe, expect, it } from 'vitest';
import { kitDocuments } from '@/lib/presets';
import { FamiliesFileSchema, familyMatches, familyMinSize } from '../schemas/site-data';
import { ExamPresetSchema } from '../schemas/preset';
import { familyMembers, familyOf, hubFamilies } from '../families';
import { getPrintPhotoPage, printPhotoPages } from '../exam-print';
import { getPreset } from '../presets';

describe('exam families', () => {
  const p = { slug: 'ugc-net', group: 'nta', body: 'NTA' };

  it('matches by explicit slugs, group and body together', () => {
    expect(familyMatches({ match: { slugs: ['ugc-net', 'csir-net'] } }, p)).toBe(true);
    expect(familyMatches({ match: { slugs: ['csir-net'] } }, p)).toBe(false);
    expect(familyMatches({ match: { group: 'nta', slugs: ['ugc-net'] } }, p)).toBe(true);
    expect(familyMatches({ match: { body: 'IBPS' } }, p)).toBe(false);
  });

  it('uses the per-family minimum when set', () => {
    expect(familyMinSize({ minSize: 2 }, { minFamilySize: 3 })).toBe(2);
    expect(familyMinSize({}, { minFamilySize: 3 })).toBe(3);
  });

  it('rejects a family without any match rule', () => {
    const r = FamiliesFileSchema.safeParse({
      minFamilySize: 3,
      families: [{ slug: 'x', name: 'X', linkText: 'X', keyword: 'x', match: {} }],
    });
    expect(r.success).toBe(false);
  });

  it('builds the NET hub from UGC NET and CSIR NET', () => {
    expect(hubFamilies().map((f) => f.slug)).toContain('net');
    expect(familyMembers('net').map((x) => x.slug).sort()).toEqual(['csir-net', 'ugc-net']);
    expect(familyOf(getPreset('csir-net')!)?.slug).toBe('net');
    expect(familyOf(getPreset('neet-ug')!)).toBeUndefined();
  });
});

describe('print photo pages', () => {
  it('builds the NEET postcard page, outside the upload kit', () => {
    const page = getPrintPhotoPage('neet-ug', 'postcard-photo')!;
    expect(page.path).toBe('/exam/neet-ug/postcard-photo');
    expect(page.photo.physical).toEqual({ width: 4, height: 6, unit: 'in' });
    expect(kitDocuments(page.preset).some((d) => (d.slug ?? d.doc) === 'postcard-photo')).toBe(false);
    expect(printPhotoPages('postcard-photo').map((x) => x.preset.slug)).toEqual(['neet-ug']);
  });

  it('rejects a print photo whose slug clashes with a document', () => {
    const neet = getPreset('neet-ug')!;
    const clash = {
      ...neet,
      documents: [{ ...neet.documents[0]!, slug: 'postcard-photo' }],
    };
    expect(ExamPresetSchema.safeParse(clash).success).toBe(false);
  });
});
