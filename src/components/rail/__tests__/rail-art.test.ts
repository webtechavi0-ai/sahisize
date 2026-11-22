import { describe, expect, it } from 'vitest';
import { artImageFor } from '../rail-art';

describe('artImageFor (panel illustration)', () => {
  it("prefers the exam's own hero over its group image", () => {
    expect(artImageFor({ routes: ['/exam/neet-ug'], group: 'nta' }, 'en')?.slot.id).toBe('exam-neet-ug-hero');
  });
  it('falls back to the group illustration when the exam has no hero', () => {
    expect(artImageFor({ routes: ['/exam/ibps-po'], group: 'banking' }, 'en')?.slot.id).toBe('group-banking');
    expect(artImageFor({ routes: ['/exam/ibps-po/photo', '/exam/ibps-po'], group: 'banking' }, 'hi')?.slot.id).toBe(
      'group-banking',
    );
  });
  it('uses the group before the family hub hero, and the hub hero only as a last resort', () => {
    expect(
      artImageFor(
        {
          routes: ['/exam/ssc-cgl'],
          group: 'ssc',
          fallbackRoutes: ['/exams/ssc'],
        },
        'en',
      )?.slot.id,
    ).toBe('group-ssc');
    expect(
      artImageFor(
        {
          routes: ['/exam/x'],
          group: 'no-such-group',
          fallbackRoutes: ['/exams/ssc'],
        },
        'en',
      )?.slot.id,
    ).toBe('exams-ssc-hero');
  });
  it('renders no block at all when nothing is published', () => {
    expect(artImageFor({ routes: ['/exam/x'], group: 'no-such-group' }, 'en')).toBeNull();
    expect(artImageFor({ routes: [null, undefined] }, 'en')).toBeNull();
    expect(artImageFor({}, 'en')).toBeNull();
  });
  it('gives a hub its group image when it has no hero of its own', () => {
    expect(artImageFor({ routes: ['/exams/ibps'], group: 'banking' }, 'en')?.slot.id).toBe('group-banking');
    expect(artImageFor({ routes: ['/exams/net'], group: 'nta' }, 'en')?.slot.id).toBe('exams-net-hero');
  });
});
