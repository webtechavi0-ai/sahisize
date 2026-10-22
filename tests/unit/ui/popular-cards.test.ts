import { describe, expect, it } from 'vitest';
import { getPreset, getSeasonOrder } from '@/content/presets';
import {
  cycleYear,
  isOfficialSourceUrl,
  isVerifiedPreset,
  pickPopular,
} from '@/content/presets/verified';
import { cardDocLabels, cardName } from '@/components/site/exam-card';

describe('popular exams selection', () => {
  it('parses cycle years', () => {
    expect(cycleYear('2026')).toBe(2026);
    expect(cycleYear('December 2026')).toBe(2026);
    expect(cycleYear('02/2027')).toBe(2027);
    expect(cycleYear('Phase 4')).toBeNull();
  });

  it('official domains', () => {
    for (const u of [
      'https://ssc.gov.in/x.pdf',
      'https://cdnbbsr.s3waas.gov.in/a.pdf',
      'https://www.rrbcdg.gov.in/a.pdf',
      'https://sbi.bank.in/a.pdf',
      'https://joinindianarmy.nic.in/',
      'https://www.ibps.in/x',
      'https://www.nabard.org/x',
    ])
      expect(isOfficialSourceUrl(u), u).toBe(true);
    for (const u of ['https://edutap.in/x', 'https://sarkaridoc.com/x', 'https://notgov.in.example.com/', 'nope'])
      expect(isOfficialSourceUrl(u), u).toBe(false);
  });

  it('unverified checkedBy is excluded even on an official domain', () => {
    expect(isVerifiedPreset({ sourceUrl: 'https://ssc.gov.in/a', checkedBy: 'SahiSize research (unverified)' })).toBe(false);
    expect(isVerifiedPreset({ sourceUrl: 'https://ssc.gov.in/a', checkedBy: 'SahiSize research (official notice)' })).toBe(true);
  });

  it('drops past cycles and unverified sources, backfills from season order, max 12', () => {
    const list = pickPopular(getSeasonOrder(), { year: 2026, limit: 12 });
    const slugs = list.map((p) => p.slug);
    expect(slugs).not.toContain('nabard-grade-a'); // 2025 and unverified
    expect(slugs.length).toBeLessThanOrEqual(12);
    for (const p of list) {
      expect(isVerifiedPreset(p)).toBe(true);
      expect(cycleYear(p.cycle) ?? 9999).toBeGreaterThanOrEqual(2026);
    }
    // Order follows season.json.
    const order = getSeasonOrder().map((p) => p.slug);
    expect([...slugs].sort((a, b) => order.indexOf(a) - order.indexOf(b))).toEqual(slugs);
  });

  it('year comes from the caller (build date), not hard-coded', () => {
    const ordered = [
      { slug: 'a', cycle: '2025', sourceUrl: 'https://ssc.gov.in/', checkedBy: 'x' },
      { slug: 'b', cycle: '2026', sourceUrl: 'https://ssc.gov.in/', checkedBy: 'x' },
    ];
    expect(pickPopular(ordered, { year: 2025 }).map((p) => p.slug)).toEqual(['a', 'b']);
    expect(pickPopular(ordered, { year: 2026 }).map((p) => p.slug)).toEqual(['b']);
  });
});

describe('exam card text', () => {
  it('short names', () => {
    expect(cardName(getPreset('sbi-clerk')!, 'en')).toBe('SBI Clerk');
    expect(cardName(getPreset('ibps-rrb-clerk')!, 'en')).toBe('IBPS RRB Clerk');
    expect(cardName(getPreset('sbi-clerk')!, 'hi')).toBe('एसबीआई क्लर्क');
  });

  it('at most 3 short labels then +N more', () => {
    const neet = cardDocLabels(getPreset('neet-ug')!, 'en');
    expect(neet.labels).toEqual(['Photo', 'Signature', 'Thumb']);
    expect(neet.more).toBe(1); // Certificate ×4
    const ibps = cardDocLabels(getPreset('ibps-po')!, 'en');
    expect(ibps.labels).toEqual(['Photo', 'Signature', 'Thumb']);
    expect(ibps.more).toBe(2);
  });

  it('live-photo exams list "Photo (live)" first', () => {
    const ssc = cardDocLabels(getPreset('ssc-cgl')!, 'en');
    expect(ssc.labels[0]).toBe('Photo (live)');
    expect(cardDocLabels(getPreset('ssc-cgl')!, 'hi').labels[0]).toBe('फोटो (लाइव)');
  });
});
