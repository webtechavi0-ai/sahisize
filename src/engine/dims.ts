/**
 * Output dimensions (PLAN 3.4). Pure.
 */
import { pixelMode, type ChosenDims, type DocSpec, type DocType } from './types';

/** KB-only long-side defaults (PLAN 3.4). Photo uses KB_ONLY_PHOTO instead. */
export const KB_ONLY_LONG_SIDE: Record<DocType, number> = {
  photo: 531,
  signature: 600,
  thumb: 400,
  declaration: 1200,
  certificate: 1600,
  other: 1600,
};

/** 3.5×4.5 cm at 300 DPI (A.4). */
export const KB_ONLY_PHOTO = { w: 413, h: 531 };

/** Min-only ranges start at min × 2.5, capped at this long side (PLAN 3.4). */
export const RANGE_START_FACTOR = 2.5;
export const RANGE_CAP_LONG_SIDE = 600;

/** KB-only shrink floor: 50% of the start size. */
export const KB_ONLY_SHRINK_FLOOR = 0.5;

export interface ChooseDimsOptions {
  keepSourceDims?: boolean;
  allowDownscale?: boolean;
}

const r = Math.round;

/**
 * @param cropAspect aspect (w/h) of the image reaching fit(), i.e. the user's crop.
 * @param src pixel size of that image.
 */
export function chooseDims(
  spec: DocSpec,
  cropAspect: number,
  src: { w: number; h: number },
  opts: ChooseDimsOptions = {},
): ChosenDims {
  const mode = pixelMode(spec);
  const a = cropAspect > 0 && Number.isFinite(cropAspect) ? cropAspect : 1;

  if (mode === 'fixed') {
    const w = spec.widthPx!;
    const h = spec.heightPx!;
    return { w, h, mode, flex: { canShrink: false, canGrow: false, minW: w, minH: h, maxW: w, maxH: h } };
  }

  if (mode === 'range') {
    const { minWidthPx, maxWidthPx, minHeightPx, maxHeightPx } = spec;
    // Smallest box with aspect a satisfying the minimums.
    let minW = 1;
    if (minWidthPx !== undefined) minW = Math.max(minW, minWidthPx);
    if (minHeightPx !== undefined) minW = Math.max(minW, minHeightPx * a);
    // Largest box with aspect a inside the maximums (or the long-side cap when no max).
    let maxW: number;
    if (maxWidthPx !== undefined || maxHeightPx !== undefined) {
      maxW = Infinity;
      if (maxWidthPx !== undefined) maxW = Math.min(maxW, maxWidthPx);
      if (maxHeightPx !== undefined) maxW = Math.min(maxW, maxHeightPx * a);
    } else {
      maxW = a >= 1 ? RANGE_CAP_LONG_SIDE : RANGE_CAP_LONG_SIDE * a;
      maxW = Math.max(maxW, minW);
    }
    if (maxW < minW) maxW = minW; // aspect cannot satisfy both: fit() letterboxes/cover-crops
    const hasMin = minWidthPx !== undefined || minHeightPx !== undefined;
    const hasMax = maxWidthPx !== undefined || maxHeightPx !== undefined;
    let w: number;
    if (hasMax) w = maxW; // both or max-only: start at the max
    else w = Math.min(maxW, minW * RANGE_START_FACTOR);
    if (!hasMin) minW = Math.max(1, maxW * 0.25);
    w = Math.max(minW, Math.min(maxW, w));
    const out = {
      w: r(w),
      h: r(w / a),
      mode,
      flex: {
        canShrink: r(w) > Math.ceil(minW - 1e-6),
        canGrow: r(w) < Math.floor(maxW + 1e-6),
        minW: Math.ceil(minW - 1e-6),
        minH: Math.ceil(minW / a - 1e-6),
        maxW: Math.floor(maxW + 1e-6),
        maxH: Math.floor(maxW / a + 1e-6),
      },
    };
    // Rounding can push the height outside the range by 1 px: clamp it.
    if (minHeightPx !== undefined && out.h < minHeightPx) out.h = minHeightPx;
    if (maxHeightPx !== undefined && out.h > maxHeightPx) out.h = maxHeightPx;
    if (minWidthPx !== undefined && out.w < minWidthPx) out.w = minWidthPx;
    if (maxWidthPx !== undefined && out.w > maxWidthPx) out.w = maxWidthPx;
    out.flex.minH = Math.max(out.flex.minH, minHeightPx ?? 1);
    out.flex.minW = Math.max(out.flex.minW, minWidthPx ?? 1);
    if (maxHeightPx !== undefined) out.flex.maxH = Math.min(out.flex.maxH, maxHeightPx);
    if (maxWidthPx !== undefined) out.flex.maxW = Math.min(out.flex.maxW, maxWidthPx);
    return out;
  }

  // KB-only
  const allowDown = opts.allowDownscale !== false;
  let w: number;
  let h: number;
  if (opts.keepSourceDims) {
    w = src.w;
    h = src.h;
  } else if (spec.doc === 'photo') {
    if (spec.aspect !== undefined && spec.aspect > 0) {
      const long = KB_ONLY_PHOTO.h;
      if (spec.aspect >= 1) {
        w = long;
        h = r(long / spec.aspect);
      } else {
        h = long;
        w = r(long * spec.aspect);
      }
    } else {
      w = KB_ONLY_PHOTO.w;
      h = KB_ONLY_PHOTO.h;
    }
  } else {
    const long = Math.min(Math.max(src.w, src.h), KB_ONLY_LONG_SIDE[spec.doc]);
    if (a >= 1) {
      w = long;
      h = Math.max(1, r(long / a));
    } else {
      h = long;
      w = Math.max(1, r(long * a));
    }
  }
  return {
    w,
    h,
    mode,
    flex: {
      canShrink: allowDown,
      canGrow: false,
      minW: Math.max(1, r(w * KB_ONLY_SHRINK_FLOOR)),
      minH: Math.max(1, r(h * KB_ONLY_SHRINK_FLOOR)),
      maxW: w,
      maxH: h,
    },
  };
}

/** "200×230 px", "350–500 × 350–500 px", "any (KB-only)". */
export function requiredDimsLabel(spec: DocSpec): string {
  const mode = pixelMode(spec);
  if (mode === 'fixed') return `${spec.widthPx}×${spec.heightPx} px`;
  if (mode === 'kb-only') return 'any (KB-only)';
  const part = (min?: number, max?: number) =>
    min !== undefined && max !== undefined ? `${min}–${max}` : min !== undefined ? `≥${min}` : max !== undefined ? `≤${max}` : 'any';
  return `${part(spec.minWidthPx, spec.maxWidthPx)} × ${part(spec.minHeightPx, spec.maxHeightPx)} px`;
}

/** Does w×h satisfy the spec's pixel rule? */
export function dimsPass(spec: DocSpec, w: number, h: number): boolean {
  const mode = pixelMode(spec);
  if (mode === 'fixed') return w === spec.widthPx && h === spec.heightPx;
  if (mode === 'kb-only') return w > 0 && h > 0;
  if (spec.minWidthPx !== undefined && w < spec.minWidthPx) return false;
  if (spec.maxWidthPx !== undefined && w > spec.maxWidthPx) return false;
  if (spec.minHeightPx !== undefined && h < spec.minHeightPx) return false;
  if (spec.maxHeightPx !== undefined && h > spec.maxHeightPx) return false;
  return true;
}
