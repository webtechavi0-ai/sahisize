/**
 * Pure crop geometry shared by the Cropper and the kit flow (unit-tested).
 *
 * Engine contract (src/engine/types.ts `crop`): flip (h then v) -> rotate `rotationDeg`
 * clockwise about the centre, canvas grows to the rotated bounding box -> crop `rect`
 * in that transformed image's pixels.
 *
 * Cropper model: the frame (locked to `aspect`) is fixed on screen; the user moves the
 * image under it. In image units, the frame at zoom 1 is the largest rect of `aspect`
 * that fits inside the rotated image (so no white corners at zoom 1), shrinking by
 * 1/zoom. `pan` is the offset of the frame centre from the image centre, in image px
 * of the transformed (bounding-box) space.
 */
import type { CropRect, Flip } from '@/engine/types';
import type { CropState } from '@/lib/kit-store';

export const MIN_ZOOM = 1;
export const MAX_ZOOM = 8;
export const FINE_LIMIT = 10;

export interface View {
  rot90: 0 | 1 | 2 | 3;
  fineDeg: number;
  flip: Flip;
  zoom: number;
  panX: number;
  panY: number;
}

export const INITIAL_VIEW: View = {
  rot90: 0,
  fineDeg: 0,
  flip: { h: false, v: false },
  zoom: 1,
  panX: 0,
  panY: 0,
};

const rad = (d: number) => (d * Math.PI) / 180;

export function rotationDeg(v: Pick<View, 'rot90' | 'fineDeg'>): number {
  return v.rot90 * 90 + v.fineDeg;
}

/** Image size after the quarter turns (before fine rotation). */
export function quarterDims(W: number, H: number, rot90: number): { w: number; h: number } {
  return rot90 % 2 === 1 ? { w: H, h: W } : { w: W, h: H };
}

/** Bounding box of the image rotated by `deg`. */
export function bbox(W: number, H: number, deg: number): { w: number; h: number } {
  const c = Math.abs(Math.cos(rad(deg)));
  const s = Math.abs(Math.sin(rad(deg)));
  return { w: W * c + H * s, h: W * s + H * c };
}

/** Effective frame aspect: the locked one, or the (quarter-turned) image aspect for free crops. */
export function frameAspect(W: number, H: number, v: View, aspect: number | null): number {
  if (aspect && aspect > 0) return aspect;
  const q = quarterDims(W, H, v.rot90);
  return q.w / q.h;
}

/** Frame size in image px at the current zoom. */
export function frameSize(
  W: number,
  H: number,
  v: View,
  aspect: number | null,
): { w: number; h: number } {
  const A = frameAspect(W, H, v, aspect);
  const q = quarterDims(W, H, v.rot90);
  const c = Math.abs(Math.cos(rad(v.fineDeg)));
  const s = Math.abs(Math.sin(rad(v.fineDeg)));
  // largest centred axis-aligned a×(a/A) inside the q.w×q.h rect rotated by fineDeg
  const a = Math.min(q.w / (c + s / A), q.h / (s + c / A));
  const z = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, v.zoom));
  return { w: a / z, h: a / A / z };
}

/** Are all four frame corners inside the rotated image? */
function frameInside(
  W: number,
  H: number,
  v: View,
  fw: number,
  fh: number,
  px: number,
  py: number,
): boolean {
  const q = quarterDims(W, H, v.rot90);
  const c = Math.cos(rad(-v.fineDeg));
  const s = Math.sin(rad(-v.fineDeg));
  const eps = 1e-6;
  for (const [dx, dy] of [
    [-1, -1],
    [1, -1],
    [1, 1],
    [-1, 1],
  ] as const) {
    const x = px + (dx * fw) / 2;
    const y = py + (dy * fh) / 2;
    const u = x * c - y * s;
    const w = x * s + y * c;
    if (Math.abs(u) > q.w / 2 + eps || Math.abs(w) > q.h / 2 + eps) return false;
  }
  return true;
}

function search(lo: number, hi: number, ok: (t: number) => boolean): number {
  for (let i = 0; i < 24; i++) {
    const mid = (lo + hi) / 2;
    if (ok(mid)) lo = mid;
    else hi = mid;
  }
  return lo;
}

/** Keep the frame inside the image; slides along edges. Returns a new view. */
export function clampView(W: number, H: number, v: View, aspect: number | null): View {
  const zoom = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, v.zoom));
  const fineDeg = Math.max(-FINE_LIMIT, Math.min(FINE_LIMIT, v.fineDeg));
  const base = { ...v, zoom, fineDeg };
  const { w: fw, h: fh } = frameSize(W, H, base, aspect);
  const inside = (x: number, y: number) => frameInside(W, H, base, fw, fh, x, y);
  if (inside(v.panX, v.panY)) return base;
  const t = search(0, 1, (k) => inside(v.panX * k, v.panY * k));
  let x = v.panX * t;
  let y = v.panY * t;
  const tx = search(0, 1, (k) => inside(x + (v.panX - x) * k, y));
  x = x + (v.panX - x) * tx;
  const ty = search(0, 1, (k) => inside(x, y + (v.panY - y) * k));
  y = y + (v.panY - y) * ty;
  return { ...base, panX: x, panY: y };
}

/** Crop rect in engine pixels of the transformed image (see module comment). */
export function cropRect(W: number, H: number, v: View, aspect: number | null): CropRect {
  const b = bbox(W, H, rotationDeg(v));
  const f = frameSize(W, H, v, aspect);
  return { x: b.w / 2 + v.panX - f.w / 2, y: b.h / 2 + v.panY - f.h / 2, w: f.w, h: f.h };
}

/** Persistable crop: rect normalised to the bounding box (PLAN 3.9). */
export function toCropState(W: number, H: number, v: View, aspect: number | null): CropState {
  const b = bbox(W, H, rotationDeg(v));
  const r = cropRect(W, H, v, aspect);
  return {
    rect: { x: r.x / b.w, y: r.y / b.h, w: r.w / b.w, h: r.h / b.h },
    rot90: v.rot90,
    fineDeg: v.fineDeg,
    flip: { ...v.flip },
    zoom: v.zoom,
    panX: v.panX,
    panY: v.panY,
  };
}

export function viewFromState(s: CropState | undefined): View {
  if (!s) return { ...INITIAL_VIEW, flip: { h: false, v: false } };
  return {
    rot90: s.rot90,
    fineDeg: s.fineDeg,
    flip: { ...s.flip },
    zoom: s.zoom,
    panX: s.panX,
    panY: s.panY,
  };
}

/** Engine `crop()` arguments for an image of W×H (re-scales the normalised rect). */
export function engineCropArgs(
  s: CropState,
  W: number,
  H: number,
): { rect: CropRect; rotationDeg: number; flip: Flip } {
  const deg = rotationDeg(s);
  const b = bbox(W, H, deg);
  return {
    rect: { x: s.rect.x * b.w, y: s.rect.y * b.h, w: s.rect.w * b.w, h: s.rect.h * b.h },
    rotationDeg: deg,
    flip: { ...s.flip },
  };
}

/** Default crop for an image when the user skips the crop screen: centred, zoom 1. */
export function defaultCropState(W: number, H: number, aspect: number | null): CropState {
  return toCropState(W, H, INITIAL_VIEW, aspect);
}
