import { describe, expect, it } from 'vitest';
import { damerau, groupByBody, normalize, search, type SearchEntry } from '@/lib/search';

const e = (
  slug: string,
  en: string,
  hi: string,
  body: string,
  aliases: string[] = [],
  published = true,
): SearchEntry => ({
  slug,
  en,
  hi,
  body,
  aliases,
  group: 'banking',
  published,
});

const INDEX: SearchEntry[] = [
  e('ibps-po', 'IBPS PO', 'आईबीपीएस पीओ', 'IBPS', ['ibps probationary officer']),
  e('ibps-clerk', 'IBPS Clerk', 'आईबीपीएस क्लर्क', 'IBPS'),
  e('ibps-rrb-po', 'IBPS RRB PO', 'आईबीपीएस आरआरबी पीओ', 'IBPS'),
  e('sbi-clerk', 'SBI Clerk', 'एसबीआई क्लर्क', 'SBI', ['sbi junior associate', 'sbi ja']),
  e('sbi-po', 'SBI PO', 'एसबीआई पीओ', 'SBI'),
  e('ssc-cgl', 'SSC CGL', 'एसएससी सीजीएल', 'SSC', ['combined graduate level']),
  e('ctet', 'CTET', 'सीटेट', 'CBSE'),
  e('up-police', 'UP Police Constable', 'यूपी पुलिस कांस्टेबल', 'UPPRPB', ['up police'], false),
];

describe('search (K1)', () => {
  it('"ibps po" ranks IBPS PO first', () => {
    expect(search('ibps po', INDEX)[0]!.entry.slug).toBe('ibps-po');
  });

  it('"ibsp po" (transposition typo) still finds IBPS PO first', () => {
    expect(search('ibsp po', INDEX)[0]!.entry.slug).toBe('ibps-po');
  });

  it('Hindi "आईबीपीएस" finds IBPS exams', () => {
    const hits = search('आईबीपीएस', INDEX).map((h) => h.entry.slug);
    expect(hits).toContain('ibps-po');
    expect(hits.every((s) => s.startsWith('ibps'))).toBe(true);
  });

  it('"up police" finds the hidden exam as coming soon (published:false)', () => {
    const hits = search('up police', INDEX);
    expect(hits[0]!.entry.slug).toBe('up-police');
    expect(hits[0]!.entry.published).toBe(false);
  });

  it('"sbi clrk" finds SBI Clerk', () => {
    expect(search('sbi clrk', INDEX)[0]!.entry.slug).toBe('sbi-clerk');
  });

  it('aliases and partial typing work', () => {
    expect(search('combined grad', INDEX)[0]!.entry.slug).toBe('ssc-cgl');
    expect(search('ibps p', INDEX)[0]!.entry.slug).toBe('ibps-po');
  });

  it('no match for nonsense and empty query', () => {
    expect(search('zzzzqqq', INDEX)).toEqual([]);
    expect(search('   ', INDEX)).toEqual([]);
  });

  it('groups by body in rank order', () => {
    const groups = groupByBody(search('clerk', INDEX));
    expect(groups.map((g) => g.body).sort()).toEqual(['IBPS', 'SBI']);
  });

  it('normalises punctuation and Devanagari nukta/chandrabindu', () => {
    expect(normalize('IBPS-PO/MT')).toBe('ibps po mt');
    expect(normalize('ज़')).toBe(normalize('ज'));
    expect(normalize('हँ')).toBe(normalize('हं'));
  });

  it('damerau counts a transposition as 1', () => {
    expect(damerau('ibsp', 'ibps')).toBe(1);
    expect(damerau('clrk', 'clerk')).toBe(1);
    expect(damerau('abc', 'xyz', 1)).toBeGreaterThan(1);
  });
});
