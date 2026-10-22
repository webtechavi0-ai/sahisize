/**
 * Verified-source helper (src/content/presets/verified.ts) and the current split of
 * published presets. When a preset gets an official source (or loses one), update
 * VERIFIED_NOW below: the diff is the review record of what changed.
 */
import { describe, expect, it } from 'vitest';
import { getPublishedPresets } from '@/content/presets';
import { isOfficialSourceUrl, isVerifiedPreset } from '@/content/presets/verified';

describe('isOfficialSourceUrl', () => {
  it.each([
    'https://ssc.gov.in/api/attachment/uploads/x.pdf',
    'https://upsc.gov.in/sites/default/files/Notif.pdf',
    'https://www.rrbcdg.gov.in/uploads/2026/01-ALP/012026ALP-CEN.pdf',
    'https://csbc.bihar.gov.in/Advt/Advt-01-2025-Constables.pdf',
    'https://cdnbbsr.s3waas.gov.in/s3x/uploads/2026/10/a.pdf',
    'https://joinindianarmy.nic.in/',
    'https://exams.nta.ac.in/NEET/',
    'https://nta.ac.in/',
    'https://www.ibps.in/wp-content/uploads/a.pdf',
    'https://sbi.co.in/web/careers',
    'https://sbi.bank.in/webfiles/uploads/a.pdf',
    'https://rbi.org.in/',
    'https://opportunities.rbi.org.in/Scripts/Vacancies.aspx',
    'https://www.nabard.org/careers',
    'https://indiapostgdsonline.gov.in/',
    'https://agnipathvayu.cdac.in/',
    'https://bseh.org.in/',
  ])('official: %s', (url) => {
    expect(isOfficialSourceUrl(url)).toBe(true);
  });

  it.each([
    'http://ssc.gov.in/notice.pdf', // not https
    'https://sarkaridoc.com/exams/upsc-cds/',
    'https://www.careerpower.in/blog/ibps-clerk-image-resizer',
    'https://www.pw.live/ssc/exams/ssc-chsl-photo-and-signature-size',
    'https://www.adda247.com/jobs/wp-content/uploads/a.pdf', // re-hosted copy of a notice
    'https://www.resultbharat.com/NOTICE/IAF.pdf',
    'https://htet.eapplynow.com/HTET25_InfoBulletin.pdf', // vendor platform, not the board's domain
    'https://reet-bucket.blr1.cdn.digitaloceanspaces.com/a.pdf',
    'https://gov.in.example.com/a.pdf', // suffix trick
    'https://notgov.in/a.pdf',
    'https://fakeibps.in/a.pdf',
    'https://ibps.in.evil.com/a.pdf',
    'not a url',
  ])('not official: %s', (url) => {
    expect(isOfficialSourceUrl(url)).toBe(false);
  });
});

describe('isVerifiedPreset', () => {
  const official = 'https://ssc.gov.in/a.pdf';
  it('needs an official source and no "unverified" marker', () => {
    expect(isVerifiedPreset({ sourceUrl: official, checkedBy: 'SahiSize research (official notice)' })).toBe(true);
    expect(isVerifiedPreset({ sourceUrl: official, checkedBy: 'SahiSize research (unverified)' })).toBe(false);
    expect(isVerifiedPreset({ sourceUrl: official, checkedBy: 'Unverified copy' })).toBe(false);
    expect(
      isVerifiedPreset({ sourceUrl: 'https://sarkaridoc.com/x', checkedBy: 'SahiSize research (official notice)' }),
    ).toBe(false);
  });
});

/** Published presets verified today (official source + checkedBy not "unverified"). */
const VERIFIED_NOW = [
  'bihar-police-constable',
  'csir-net',
  'ctet',
  'cuet-ug',
  'jee-main',
  'neet-ug',
  'rrb-alp',
  'rrb-group-d',
  'sbi-clerk',
  'sbi-po',
  'ssc-cgl',
  'ssc-gd',
  'ugc-net',
];

/** Published presets still on secondary sources (coaching sites, re-hosted notice copies). */
const UNVERIFIED_NOW = [
  'cds',
  'dsssb',
  'htet', // official bulletin, but hosted on a vendor platform (htet.eapplynow.com)
  'iaf-agniveervayu',
  'ibps-clerk',
  'ibps-po',
  'ibps-rrb-clerk',
  'ibps-rrb-po',
  'ibps-so',
  'india-post-gds',
  'mppsc',
  'nabard-grade-a',
  'nda',
  'rbi-assistant',
  'rbi-grade-b',
  'reet',
  'rrb-ntpc',
  'ssc-chsl',
  'ssc-cpo',
  'ssc-mts',
  'uppsc-pcs',
  'upsc-cse',
];

describe('published presets: verified vs unverified', () => {
  const published = getPublishedPresets();
  const verified = published.filter(isVerifiedPreset).map((p) => p.slug).sort();
  const unverified = published.filter((p) => !isVerifiedPreset(p)).map((p) => p.slug).sort();

  it('lists exactly these verified presets', () => {
    expect(verified).toEqual(VERIFIED_NOW);
  });

  it('lists exactly these unverified presets', () => {
    expect(unverified).toEqual(UNVERIFIED_NOW);
    expect(unverified.length + verified.length).toBe(published.length);
  });
});
