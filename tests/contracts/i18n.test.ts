import { describe, expect, it } from 'vitest';
import { getLangFromUrl, getNamespace, localizePath, stripLang, t } from '@/i18n';
import { createT } from '@/i18n/core';

describe('i18n', () => {
  it('translates with interpolation and Hindi fallback to English', () => {
    expect(t('en', 'common.actions.next')).toBe('Next');
    expect(t('hi', 'common.actions.next')).toBe('आगे');
    expect(t('en', 'common.errors.TOO_LARGE_INPUT', { sizeMB: 31.2, maxMB: 25 })).toBe(
      'File is 31.2 MB. The limit is 25 MB.',
    );
    expect(t('en', 'no.such.key')).toBe('no.such.key');
  });

  it('getNamespace gives islands a single merged dict', () => {
    const tr = createT(getNamespace('hi', 'common'));
    expect(tr('common.docTypes.signature')).toBe('हस्ताक्षर');
  });

  it('routes', () => {
    expect(getLangFromUrl(new URL('https://x.in/hi/exam/ibps-po'))).toBe('hi');
    expect(getLangFromUrl('/hi')).toBe('hi');
    expect(getLangFromUrl('/history')).toBe('en');
    expect(getLangFromUrl('/')).toBe('en');
    expect(stripLang('/hi')).toBe('/');
    expect(localizePath('/', 'hi')).toBe('/hi');
    expect(localizePath('/exam/ibps-po', 'hi')).toBe('/hi/exam/ibps-po');
    expect(localizePath('/hi/exams?q=1', 'en')).toBe('/exams?q=1');
    expect(localizePath('/hi/exams', 'hi')).toBe('/hi/exams');
  });
});
