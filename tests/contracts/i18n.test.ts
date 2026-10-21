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

import type { EngineErrorCode } from '@/engine/types';
import { hasKey } from '@/i18n';

// Exhaustive at compile time: adding a code without listing it here fails `npm run check`.
const ALL_CODES: Record<EngineErrorCode, true> = {
  TOO_DETAILED: true,
  TOO_PLAIN: true,
  DECODE_FAILED: true,
  TOO_LARGE_INPUT: true,
  UNSUPPORTED_TYPE: true,
  PDF_IMPOSSIBLE: true,
  ALREADY_SMALL: true,
  PDF_TEXT_ONLY: true,
  WASM_UNSUPPORTED: true,
  PDF_ENCRYPTED: true,
  SPEC_INCOMPLETE: true,
  OUT_OF_MEMORY: true,
  CANCELLED: true,
  INTERNAL: true,
  NOT_IMPLEMENTED: true,
};

describe('every engine error code has a message', () => {
  it.each(Object.keys(ALL_CODES))('%s', (code) => {
    expect(hasKey('en', `common.errors.${code}`)).toBe(true);
    expect(hasKey('hi', `common.errors.${code}`)).toBe(true);
  });
});
