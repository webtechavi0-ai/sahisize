import { describe, expect, it } from 'vitest';
import type { DocSpec } from '../types';
import { cropAspect } from '../types';
import { chooseDims, dimsPass, KB_ONLY_PHOTO, requiredDimsLabel } from './dims';

const base: DocSpec = {
  doc: 'photo',
  label: { en: 'Photo', hi: 'फोटो' },
  widthPx: null,
  heightPx: null,
  minKB: 20,
  maxKB: 50,
  format: 'jpg',
  dpi: null,
  fileName: 'photo.jpg',
  rules: [],
};

describe('chooseDims', () => {
  it('fixed pixels are exact and inflexible', () => {
    const d = chooseDims({ ...base, widthPx: 200, heightPx: 230 }, 1, { w: 1000, h: 1000 });
    expect(d).toMatchObject({ w: 200, h: 230, mode: 'fixed', flex: { canShrink: false, canGrow: false } });
  });

  it('range with min and max starts at the max box for the crop aspect', () => {
    const spec = { ...base, minWidthPx: 350, maxWidthPx: 500, minHeightPx: 350, maxHeightPx: 500 };
    const d = chooseDims(spec, 1, { w: 2000, h: 2000 });
    expect(d).toMatchObject({ w: 500, h: 500, mode: 'range' });
    expect(d.flex.canShrink).toBe(true);
    expect(d.flex.canGrow).toBe(false);
    expect(d.flex.minW).toBe(350);
    expect(dimsPass(spec, d.w, d.h)).toBe(true);
  });

  it('min-only range starts at min × 2.5 capped at 600 long side', () => {
    const spec = { ...base, doc: 'signature' as const, minWidthPx: 140, minHeightPx: 60 };
    const d = chooseDims(spec, 140 / 60, { w: 2000, h: 1000 });
    expect(d.w).toBe(350);
    expect(d.h).toBe(150);
    expect(d.flex.canGrow).toBe(true);
  });

  it('KB-only photo uses 413×531, others cap the long side', () => {
    expect(chooseDims(base, 0.8, { w: 3000, h: 4000 })).toMatchObject({ w: KB_ONLY_PHOTO.w, h: KB_ONLY_PHOTO.h, mode: 'kb-only' });
    const sig = chooseDims({ ...base, doc: 'signature' }, 2, { w: 3000, h: 1500 });
    expect([sig.w, sig.h]).toEqual([600, 300]);
    expect(sig.flex.minW).toBe(300);
    const keep = chooseDims({ ...base, doc: 'other' }, 1.5, { w: 900, h: 600 }, { keepSourceDims: true, allowDownscale: false });
    expect([keep.w, keep.h, keep.flex.canShrink]).toEqual([900, 600, false]);
  });

  it('labels', () => {
    expect(requiredDimsLabel({ ...base, widthPx: 200, heightPx: 230 })).toBe('200×230 px');
    expect(requiredDimsLabel(base)).toBe('any (KB-only)');
    expect(requiredDimsLabel({ ...base, minWidthPx: 350, maxWidthPx: 500 })).toBe('350–500 × any px');
  });
});

describe('cropAspect', () => {
  it('follows the documented rules', () => {
    expect(cropAspect({ ...base, widthPx: 200, heightPx: 100 })).toBe(2);
    expect(cropAspect({ ...base, aspect: 1.5 })).toBe(1.5);
    expect(cropAspect({ ...base, minWidthPx: 350, maxWidthPx: 500, minHeightPx: 350, maxHeightPx: 500 })).toBe(1);
    expect(cropAspect({ ...base, doc: 'signature' })).toBeCloseTo(7 / 3);
    expect(cropAspect({ ...base, doc: 'declaration' })).toBeNull();
  });
});
