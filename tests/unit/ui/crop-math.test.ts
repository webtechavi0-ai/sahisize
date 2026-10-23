import { describe, expect, it } from 'vitest';
import {
  INITIAL_VIEW,
  bbox,
  clampView,
  cropRect,
  defaultCropState,
  engineCropArgs,
  frameSize,
  toCropState,
  viewFromState,
  type View,
} from '@/components/kit/crop-math';

const v = (p: Partial<View> = {}): View => ({
  ...INITIAL_VIEW,
  flip: { h: false, v: false },
  ...p,
});
const close = (a: number, b: number, eps = 1e-6) => expect(Math.abs(a - b)).toBeLessThan(eps);

describe('crop math (K4)', () => {
  it('locks the frame to the preset aspect at zoom 1 (largest fitting box)', () => {
    // 1200×1600 image, IBPS photo 200×230
    const f = frameSize(1200, 1600, v(), 200 / 230);
    close(f.w / f.h, 200 / 230);
    close(f.w, 1200);
    const r = cropRect(1200, 1600, v(), 200 / 230);
    close(r.x, 0);
    close(r.y, (1600 - 1200 / (200 / 230)) / 2);
  });

  it('zoom shrinks the frame; pan moves it and is clamped inside the image', () => {
    const z = frameSize(1200, 1600, v({ zoom: 2 }), 1);
    close(z.w, 600);
    const clamped = clampView(1200, 1600, v({ zoom: 2, panX: 5000, panY: 0 }), 1);
    close(clamped.panX, 300, 1e-3); // 600 px wide frame can move 300 px right of centre
    const r = cropRect(1200, 1600, clamped, 1);
    close(r.x + r.w, 1200, 1e-3);
  });

  it('free crop (null aspect) uses the image aspect, swapped after a quarter turn', () => {
    const f0 = frameSize(1200, 1600, v(), null);
    close(f0.w / f0.h, 1200 / 1600);
    const f1 = frameSize(1200, 1600, v({ rot90: 1 }), null);
    close(f1.w / f1.h, 1600 / 1200);
  });

  it('fine rotation keeps the frame inside the rotated image (no white corners at zoom 1)', () => {
    const view = v({ fineDeg: 10 });
    const f = frameSize(1000, 1000, view, 1);
    expect(f.w).toBeLessThan(1000);
    const b = bbox(1000, 1000, 10);
    const r = cropRect(1000, 1000, view, 1);
    close(r.x + r.w / 2, b.w / 2);
    // clamp leaves a centred frame alone
    expect(clampView(1000, 1000, view, 1).panX).toBe(0);
  });

  it('normalised crop state round-trips to engine args for another image size', () => {
    const view = clampView(
      2000,
      1000,
      v({ zoom: 1.5, panX: 100, panY: 50, rot90: 1, flip: { h: true, v: false } }),
      7 / 3,
    );
    const s = toCropState(2000, 1000, view, 7 / 3);
    const full = engineCropArgs(s, 2000, 1000);
    const half = engineCropArgs(s, 1000, 500);
    expect(full.rotationDeg).toBe(90);
    expect(full.flip).toEqual({ h: true, v: false });
    close(half.rect.w * 2, full.rect.w, 1e-6);
    close(half.rect.x * 2, full.rect.x, 1e-6);
    close(full.rect.w / full.rect.h, 7 / 3, 1e-6);
  });
});

describe('auto-fit after upload uses the crop the Cropper starts with', () => {
  // KitFlow fits straight after upload with defaultCropState(); the Cropper's first report
  // is toCropState(clampView(viewFromState(undefined))). They must match, so skipping the
  // crop screen never changes the output.
  it.each([
    [4000, 3000, 200 / 230],
    [3000, 4000, 140 / 60],
    [1200, 1200, 1],
    [800, 2000, null],
  ] as const)('%i×%i aspect %s', (W, H, aspect) => {
    const cropper = toCropState(W, H, clampView(W, H, viewFromState(undefined), aspect), aspect);
    expect(defaultCropState(W, H, aspect)).toEqual(cropper);
  });
});
