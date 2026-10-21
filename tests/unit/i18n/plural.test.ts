import { describe, expect, it } from 'vitest';
import { t } from '@/i18n';
import { plural } from '@/i18n/core';

describe('plural (one/other via <key>One)', () => {
  const keys = ['site.exam.startKit', 'site.kit.steps', 'site.doc.startFullKit', 'ui.search.resultsCount', 'kit.certificate.pages'];
  for (const lang of ['en', 'hi'] as const) {
    const tr = (k: string, v?: Record<string, string | number>) => t(lang, k, v);
    it(`${lang}: n = 1 uses the singular key, n > 1 the plural`, () => {
      for (const k of keys) {
        expect(plural(tr, k, 1)).toBe(tr(`${k}One`));
        expect(plural(tr, k, 3)).toContain('3');
      }
    });
  }
  it('en wording', () => {
    const tr = (k: string, v?: Record<string, string | number>) => t('en', k, v);
    expect(plural(tr, 'site.exam.startKit', 1)).toBe('Start kit (1 document)');
    expect(plural(tr, 'site.exam.startKit', 4)).toBe('Start kit (4 documents)');
    expect(plural(tr, 'site.kit.steps', 1)).toBe('1 document');
    expect(plural(tr, 'ui.search.resultsCount', 1)).toBe('1 exam found');
  });
  it('falls back to the plain key when there is no One key', () => {
    const tr = (k: string) => (k === 'x.y' ? 'many' : k);
    expect(plural(tr, 'x.y', 1)).toBe('many');
  });
});
