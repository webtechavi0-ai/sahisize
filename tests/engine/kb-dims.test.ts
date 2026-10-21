import { describe, expect, it } from 'vitest';
import { chooseDims, dimsPass, requiredDimsLabel } from '@/engine/dims';
import { checkSize, targetWindow } from '@/engine/kb';
import type { DocSpec } from '@/engine/types';

const spec = (o: Partial<DocSpec>): DocSpec => ({
  doc: 'photo',
  label: { en: 'x', hi: 'x' },
  widthPx: null,
  heightPx: null,
  minKB: 20,
  maxKB: 50,
  format: 'jpg',
  dpi: null,
  fileName: 'x.jpg',
  rules: [],
  ...o,
});

describe('kb (SPEC 7.3 size unit)', () => {
  it('targets the window safe under both readings', () => {
    // hard limits min×1024 / max×1000, margin max(1 KB, 3% of range) from each end
    expect(targetWindow(20, 50)).toEqual({ hardLo: 20480, hardHi: 50000, margin: 1024, lo: 21504, hi: 48976, mid: 35240, dual: true });
    expect(targetWindow(10, 20)).toMatchObject({ dual: true, lo: 10240 + 1024, hi: 20000 - 1024 });
    // wide range: 3% wins
    expect(targetWindow(100, 500)).toMatchObject({ hardLo: 102400, hardHi: 500000, margin: Math.round((500000 - 102400) * 0.03) });
    // no minimum: no low margin
    expect(targetWindow(null, 100)).toMatchObject({ lo: 0, hi: 100000 - 3000 });
    // narrow range: margin shrinks to a quarter of the range
    expect(targetWindow(19, 21)).toMatchObject({ hardLo: 19456, hardHi: 21000, margin: 386, lo: 19842, hi: 20614 });
    // overlap impossible -> 1024 window
    expect(targetWindow(49, 50)).toMatchObject({ dual: false, hardLo: 50176, hardHi: 51200, margin: 256 });
    for (const [mn, mx] of [[20, 50], [10, 20], [4, 12], [null, 30], [19, 21], [50, 100]] as const) {
      const w = targetWindow(mn, mx);
      expect(checkSize(w.lo, mn, mx)).toEqual({ pass1024: true, pass1000: true });
      expect(checkSize(w.hi, mn, mx)).toEqual({ pass1024: true, pass1000: true });
    }
  });
  it('checks 1000 vs 1024', () => {
    expect(checkSize(50 * 1024, 20, 50)).toEqual({ pass1024: true, pass1000: false });
    expect(checkSize(20 * 1000, 20, 50)).toEqual({ pass1024: false, pass1000: true });
    expect(checkSize(30000, 20, 50)).toEqual({ pass1024: true, pass1000: true });
  });
});

describe('chooseDims (PLAN 3.4)', () => {
  it('fixed', () => {
    const d = chooseDims(spec({ widthPx: 200, heightPx: 230 }), 1.5, { w: 3000, h: 2000 });
    expect(d).toMatchObject({ w: 200, h: 230, mode: 'fixed', flex: { canShrink: false, canGrow: false } });
  });
  it('UPSC 350–500 square starts at the max', () => {
    const s = spec({ doc: 'signature', minWidthPx: 350, maxWidthPx: 500, minHeightPx: 350, maxHeightPx: 500 });
    const d = chooseDims(s, 1, { w: 1000, h: 1000 });
    expect(d).toMatchObject({ w: 500, h: 500, mode: 'range' });
    expect(d.flex).toMatchObject({ canShrink: true, canGrow: false, minW: 350, maxW: 500 });
    expect(requiredDimsLabel(s)).toBe('350–500 × 350–500 px');
  });
  it('RRB min 140×60 starts at 350×150 and may grow to the 600 cap', () => {
    const s = spec({ doc: 'signature', minWidthPx: 140, minHeightPx: 60 });
    const d = chooseDims(s, 7 / 3, { w: 1400, h: 600 });
    expect(d).toMatchObject({ w: 350, h: 150 });
    expect(d.flex).toMatchObject({ canGrow: true, canShrink: true, maxW: 600, minW: 140, minH: 60 });
    expect(dimsPass(s, 350, 150)).toBe(true);
    expect(dimsPass(s, 139, 150)).toBe(false);
  });
  it('range output always satisfies the range even with a mismatched crop aspect', () => {
    const s = spec({ doc: 'signature', minWidthPx: 350, maxWidthPx: 500, minHeightPx: 350, maxHeightPx: 500 });
    for (const a of [0.3, 0.8, 1, 1.4, 3]) {
      const d = chooseDims(s, a, { w: 1000, h: 1000 });
      expect(dimsPass(s, d.w, d.h)).toBe(true);
    }
  });
  it('KB-only photo -> 413×531; signature keeps crop aspect, long side 600', () => {
    expect(chooseDims(spec({}), 0.7, { w: 2000, h: 2800 })).toMatchObject({ w: 413, h: 531, mode: 'kb-only' });
    const sig = chooseDims(spec({ doc: 'signature' }), 3, { w: 1500, h: 500 });
    expect(sig).toMatchObject({ w: 600, h: 200 });
    expect(sig.flex).toMatchObject({ canShrink: true, minW: 300 });
    expect(chooseDims(spec({ doc: 'signature' }), 3, { w: 300, h: 100 })).toMatchObject({ w: 300, h: 100 });
    expect(chooseDims(spec({ doc: 'declaration' }), 0.5, { w: 3000, h: 6000 })).toMatchObject({ w: 600, h: 1200 });
    expect(chooseDims(spec({ doc: 'other' }), 1, { w: 900, h: 900 }, { keepSourceDims: true })).toMatchObject({ w: 900, h: 900 });
    expect(chooseDims(spec({}), 1, { w: 900, h: 900 }, { allowDownscale: false }).flex.canShrink).toBe(false);
  });
});
