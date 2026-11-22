import { describe, expect, it } from 'vitest';
import {
  examH1Text,
  examSpecH2,
  examTitleCandidates,
  hindiCycle,
  monthList,
  titleCycle,
  windowStatus,
  type ExamHeadingInput,
} from '../exam-template';

const live: ExamHeadingInput = {
  short: 'SSC CGL',
  cycle: '2026',
  live: true,
  hasPhoto: true,
  hasSignature: true,
  hasThumb: false,
  docsPhrase: 'Photo & Signature',
};
const upload: ExamHeadingInput = { ...live, short: 'IBPS PO', live: false, hasThumb: true };

describe('exam headings (keyword-map §4)', () => {
  it('builds the live-photo title and H1 with the primary keyword first', () => {
    expect(examTitleCandidates(live, 'en')[0]).toBe('SSC CGL Photo Size 2026 & Signature Size');
    expect(examH1Text(live, 'en')).toBe('SSC CGL Photo Size 2026: Live Photo and Signature Size');
    expect(examH1Text({ ...live, short: 'SSC GD', hasThumb: true }, 'en')).toBe(
      'SSC GD Photo Size 2026: Live Photo, Signature and Thumb',
    );
  });

  it('builds the photo-upload title and H1, with thumb', () => {
    expect(examTitleCandidates(upload, 'en')[0]).toBe('IBPS PO Photo Size 2026, Signature & Thumb');
    expect(examH1Text(upload, 'en')).toBe('IBPS PO Photo Size 2026, Signature and Thumb Size');
    expect(examH1Text({ ...upload, hasThumb: false }, 'en')).toBe('IBPS PO Photo Size 2026 and Signature Size');
  });

  it('never ends an H1 with "— Resize Free" and never leads with "Signature Size"', () => {
    for (const x of [live, upload]) {
      expect(examH1Text(x, 'en')).not.toMatch(/Resize Free/);
      expect(examH1Text(x, 'en')).toMatch(new RegExp(`^${x.short} Photo Size`));
    }
  });

  it('shortens months in titles but not in H1s', () => {
    const net = { ...upload, short: 'UGC NET', cycle: 'December 2026', hasThumb: false };
    expect(titleCycle('December 2026')).toBe('Dec 2026');
    expect(titleCycle('02/2027')).toBe('02/2027');
    expect(examTitleCandidates(net, 'en')[0]).toBe('UGC NET Photo Size Dec 2026 & Signature Size');
    expect(examH1Text(net, 'en')).toBe('UGC NET Photo Size December 2026 and Signature Size');
  });

  it('builds Hindi headings with Latin exam names (keyword-map §9)', () => {
    expect(hindiCycle('December 2026')).toBe('दिसंबर 2026');
    expect(examTitleCandidates({ ...upload, hasThumb: false }, 'hi')[0]).toBe('IBPS PO फोटो साइज़ 2026 और सिग्नेचर साइज़');
    expect(examH1Text(live, 'hi')).toBe('SSC CGL फोटो साइज़ 2026: लाइव फोटो और सिग्नेचर साइज़');
  });

  it('falls back to the document phrase without a photo/signature pair', () => {
    const x = { ...upload, hasPhoto: false, docsPhrase: 'Signature' };
    expect(examH1Text(x, 'en')).toBe('IBPS PO Signature Size 2026');
  });

  it('builds the spec H2', () => {
    expect(examSpecH2(live)).toBe('SSC CGL photo and signature size 2026');
  });
});

describe('windowStatus', () => {
  const w = { opens: '2026-10-07', closes: '2026-11-05', lateUntil: '2026-11-09', source: 'bulletin' };

  it('is upcoming before the window and open through the last day', () => {
    expect(windowStatus(w, [], '2026-10-01').kind).toBe('upcoming');
    expect(windowStatus(w, [], '2026-10-07').kind).toBe('open');
    expect(windowStatus(w, [], '2026-11-05').kind).toBe('open');
  });

  it('reports late submission, then closed with the next season months in order', () => {
    expect(windowStatus(w, [10, 11, 3], '2026-11-09')).toEqual({ kind: 'late', closes: '2026-11-05', until: '2026-11-09' });
    // Closed this season: no "new notice may be out" yet; next months start after November.
    expect(windowStatus(w, [10, 11, 3], '2026-11-14')).toEqual({
      kind: 'closed',
      closes: '2026-11-05',
      nextMonths: [3, 10, 11],
      seasonNow: false,
    });
    expect(windowStatus(w, [5, 6], '2026-12-01')).toMatchObject({ nextMonths: [5, 6], seasonNow: false });
  });

  it('flags a new season a year after the last window', () => {
    const jee = { opens: '2025-10-31', closes: '2025-11-27', source: 'bulletin' };
    expect(windowStatus(jee, [11, 2], '2026-11-14')).toMatchObject({ kind: 'closed', nextMonths: [2, 11], seasonNow: true });
  });

  it('reports a correction window after close', () => {
    const c = { opens: '2026-01-01', closes: '2026-01-10', correctionUntil: '2026-01-20', source: 'x' };
    expect(windowStatus(c, [], '2026-01-15').kind).toBe('correction');
    expect(windowStatus(c, [], '2026-01-21').kind).toBe('closed');
  });
});

describe('monthList', () => {
  it('joins month names', () => {
    expect(monthList([11, 2], 'en')).toBe('November and February');
    expect(monthList([5, 6, 7], 'en')).toBe('May, June and July');
    expect(monthList([12], 'hi')).toBe('दिसंबर');
  });
});
