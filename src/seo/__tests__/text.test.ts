import { describe, expect, it } from 'vitest';
import {
  DESC_MAX,
  DESC_MIN,
  TITLE_MAX,
  clampDescription,
  fitDescription,
  fitTitle,
  latinLead,
  metaLengthIssues,
  textLength,
} from '@/seo/text';

describe('length rules (keyword map §0)', () => {
  it('uses title <= 60 and description 140–160', () => {
    expect(TITLE_MAX).toBe(60);
    expect(DESC_MIN).toBe(140);
    expect(DESC_MAX).toBe(160);
  });

  it('keeps a 160-character description intact', () => {
    const d = `${'a'.repeat(79)} ${'b'.repeat(80)}`;
    expect(textLength(d)).toBe(160);
    expect(clampDescription(d)).toBe(d);
    expect(fitDescription(d, ['extra'])).toBe(d);
  });

  it('cuts a 161-character description at a word boundary', () => {
    const d = `${'word '.repeat(32)}x`;
    const out = clampDescription(d);
    expect(textLength(out)).toBeLessThanOrEqual(DESC_MAX);
    expect(out.endsWith('…')).toBe(true);
  });

  it('counts Devanagari by code point', () => {
    expect(textLength('फोटो')).toBe(4);
  });

  it('adds the brand only when it fits', () => {
    expect(fitTitle(['SSC CGL Photo and Signature Size 2026'])).toBe('SSC CGL Photo and Signature Size 2026 | SahiSize');
    const long = 'CSIR NET Result Awaited Form Size: 50–300 KB PDF here';
    expect(textLength(fitTitle([long]))).toBeLessThanOrEqual(TITLE_MAX);
  });
});

describe('metaLengthIssues', () => {
  const desc = (n: number) => 'x'.repeat(n);
  it('accepts the boundaries', () => {
    expect(metaLengthIssues({ title: 't'.repeat(60), description: desc(140) })).toEqual([]);
    expect(metaLengthIssues({ title: 't', description: desc(160) })).toEqual([]);
  });
  it('flags each rule', () => {
    expect(metaLengthIssues({ title: 't'.repeat(61), description: desc(139) })).toEqual([
      'title-too-long',
      'description-too-short',
    ]);
    expect(metaLengthIssues({ title: 't', description: desc(161) })).toEqual(['description-too-long']);
  });
});

describe('latinLead', () => {
  it('returns the Latin-script lead of a mixed title', () => {
    expect(latinLead('Photo ko KB me kaise kare — फोटो का KB सही करें')).toBe('Photo ko KB me kaise kare');
    expect(latinLead('फोटो का KB: Photo to 20 KB')).toBe('Photo to 20 KB');
  });
  it('returns undefined when no segment is Latin', () => {
    expect(latinLead('फोटो का साइज़ — हिंदी गाइड')).toBeUndefined();
    expect(latinLead('')).toBeUndefined();
  });
});
