/** Hindi internal links: /hi/ counterpart when the route exists, else English. */
import { describe, expect, it } from 'vitest';
import { getPublishedPresets } from '@/content/presets';
import { hindiExamSlugs } from '@/seo/hreflang';
import { hindiGuideSlugs, hindiPathFor, isMissedHindiLink, localHref } from '@/seo/localize-href';
import { latinTitleName } from '@/seo/exam-names';

describe('localHref', () => {
  it('leaves English pages alone', () => {
    expect(localHref('/exam/ibps-po', 'en')).toBe('/exam/ibps-po');
    expect(localHref('/', 'en')).toBe('/');
  });

  it('maps static routes that have a Hindi page', () => {
    expect(localHref('/', 'hi')).toBe('/hi');
    expect(localHref('/exams', 'hi')).toBe('/hi/exams');
    expect(localHref('/guides', 'hi')).toBe('/hi/guides');
    expect(localHref('/tools', 'hi')).toBe('/hi/tools');
    expect(localHref('/editorial-policy', 'hi')).toBe('/hi/editorial-policy');
  });

  it('keeps English-only routes in English', () => {
    for (const p of ['/report', '/about', '/sources', '/privacy', '/contact', '/tools/thumb-impression'])
      expect(localHref(p, 'hi'), p).toBe(p);
  });

  it('maps exams and kits only when the Hindi page exists', () => {
    const hi = new Set(hindiExamSlugs());
    for (const p of getPublishedPresets()) {
      const want = hi.has(p.slug) ? `/hi/exam/${p.slug}` : `/exam/${p.slug}`;
      expect(localHref(`/exam/${p.slug}`, 'hi')).toBe(want);
    }
    expect(localHref('/exam/ibps-so', 'hi')).toBe('/exam/ibps-so');
    expect(localHref('/kit/ibps-po', 'hi')).toBe('/hi/kit/ibps-po');
    // Exam document pages are English only.
    expect(hindiPathFor('/exam/ibps-po/photo')).toBeNull();
  });

  it('maps tools and guides that have Hindi pages, keeping hashes and queries', () => {
    expect(localHref('/tools/resize-image#how', 'hi')).toBe('/hi/tools/resize-image#how');
    expect(localHref('/tools/compress-image-to-20kb', 'hi')).toBe('/hi/tools/compress-image-to-20kb');
    expect(localHref('/exams?q=ssc', 'hi')).toBe('/hi/exams?q=ssc');
    const guides = hindiGuideSlugs();
    expect(guides.has('photo-rejected-how-to-fix')).toBe(true);
    expect(localHref('/guides/photo-rejected-how-to-fix', 'hi')).toBe('/hi/guides/photo-rejected-how-to-fix');
    expect(localHref('/guides/how-to-upload-photo-signature', 'hi')).toBe('/guides/how-to-upload-photo-signature');
  });

  it('flags English links that should be Hindi', () => {
    expect(isMissedHindiLink('/exam/ibps-po')).toBe(true);
    expect(isMissedHindiLink('/hi/exam/ibps-po')).toBe(false);
    expect(isMissedHindiLink('/report')).toBe(false);
    expect(isMissedHindiLink('https://ibps.in/')).toBe(false);
  });
});

describe('latinTitleName (Hindi titles use Latin exam names)', () => {
  const bySlug = new Map(getPublishedPresets().map((p) => [p.slug, p]));
  it('uses short Latin names', () => {
    expect(latinTitleName(bySlug.get('ibps-po')!)).toBe('IBPS PO');
    expect(latinTitleName(bySlug.get('sbi-clerk')!)).toBe('SBI Clerk');
    expect(latinTitleName(bySlug.get('upsc-cse')!)).toBe('UPSC CSE');
    expect(latinTitleName(bySlug.get('rrb-ntpc')!)).toBe('RRB NTPC');
  });
  it('is Latin script for every Hindi exam and fits a 60-char Hindi title', () => {
    for (const slug of hindiExamSlugs()) {
      const p = bySlug.get(slug)!;
      const name = latinTitleName(p);
      expect(name, slug).toMatch(/^[A-Za-z0-9 .&/-]+$/);
      // Proposed SPEC 9.2 Hindi template: "{Latin} फोटो और सिग्नेचर साइज {cycle}".
      expect(`${name} फोटो, सिग्नेचर और अंगूठा साइज ${p.cycle}`.length, slug).toBeLessThanOrEqual(60);
    }
  });
});
