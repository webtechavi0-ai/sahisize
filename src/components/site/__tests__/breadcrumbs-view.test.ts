import { describe, expect, it } from 'vitest';
import { phoneCrumbs } from '../breadcrumbs-view';

describe('phoneCrumbs', () => {
  it('hides Home and the current page when there is a closer parent', () => {
    const r = phoneCrumbs([{ path: '/' }, { path: '/exams' }, { path: '/exams/rrb' }, { path: '/exam/rrb-ntpc' }]);
    expect(r.onPhone).toEqual([false, true, true, false]);
    expect(r.firstOnPhone).toBe(1);
  });
  it('keeps Home when it is the only ancestor', () => {
    const r = phoneCrumbs([{ path: '/' }, { path: '/guides' }]);
    expect(r.onPhone).toEqual([true, false]);
    expect(r.firstOnPhone).toBe(0);
  });
  it('skips ancestors without a link', () => {
    const r = phoneCrumbs([{ path: '/' }, { path: null }, { path: '/exams' }, {}]);
    expect(r.onPhone).toEqual([false, false, true, false]);
  });
  it('shows nothing for a single crumb', () => {
    expect(phoneCrumbs([{ path: '/' }])).toEqual({ onPhone: [false], firstOnPhone: -1 });
  });
});
