/**
 * Signature and thumb cleanup (SPEC 7.4) on typed arrays, no OpenCV:
 *  1. grayscale (ink colour is re-applied at the end, so blue thumbs keep a colour path)
 *  2. illumination correction: background = blurred block-max (a cheap closing), divide by it
 *  3. Otsu threshold on the corrected image, shifted by the strength slider
 *  4. despeckle (drop tiny connected components)
 *  5. crop to ink + 8% padding, white-pad to `targetAspect`, centred
 *  6. background pure white, ink dark (black or blue)
 */
import { boxBlurPlane } from './blur';
import { createRaster, toGray } from './raster';
import { resizeRaster, type ResizeFn } from './resize';
import type { CleanupOptions, RasterImage } from './types';

/** Working resolution cap: signatures/thumbs end at <= 600 px, so 2000 px is plenty. */
export const CLEANUP_MAX_SIDE = 2000;
export const INK_PADDING = 0.08;

export function otsu(hist: Uint32Array, total: number): number {
  let sum = 0;
  for (let i = 0; i < 256; i++) sum += i * hist[i]!;
  let sumB = 0;
  let wB = 0;
  let best = 0;
  let t = 127;
  for (let i = 0; i < 256; i++) {
    wB += hist[i]!;
    if (!wB) continue;
    const wF = total - wB;
    if (!wF) break;
    sumB += i * hist[i]!;
    const mB = sumB / wB;
    const mF = (sum - sumB) / wF;
    const between = wB * wF * (mB - mF) * (mB - mF);
    if (between > best) {
      best = between;
      t = i;
    }
  }
  return t;
}

/** Background estimate: block max (removes thin ink), 3×3 max, box blur, bilinear upsample. */
export function estimateBackground(gray: Uint8Array, w: number, h: number): Float32Array {
  const f = Math.max(4, Math.round(Math.max(w, h) / 48));
  const gw = Math.ceil(w / f);
  const gh = Math.ceil(h / f);
  const blk = new Float32Array(gw * gh);
  for (let y = 0; y < h; y++) {
    const gy = (y / f) | 0;
    for (let x = 0; x < w; x++) {
      const v = gray[y * w + x]!;
      const gi = gy * gw + ((x / f) | 0);
      if (v > blk[gi]!) blk[gi] = v;
    }
  }
  // 3×3 max (covers strokes up to ~2 blocks thick)
  const dil = new Float32Array(gw * gh);
  for (let y = 0; y < gh; y++)
    for (let x = 0; x < gw; x++) {
      let m = 0;
      for (let dy = -1; dy <= 1; dy++)
        for (let dx = -1; dx <= 1; dx++) {
          const xx = x + dx;
          const yy = y + dy;
          if (xx >= 0 && yy >= 0 && xx < gw && yy < gh) m = Math.max(m, blk[yy * gw + xx]!);
        }
      dil[y * gw + x] = m;
    }
  const sm = boxBlurPlane(dil, gw, gh, 1);
  const out = new Float32Array(w * h);
  for (let y = 0; y < h; y++) {
    const fy = Math.min(gh - 1, Math.max(0, (y + 0.5) / f - 0.5));
    const y0 = Math.floor(fy);
    const y1 = Math.min(gh - 1, y0 + 1);
    const ty = fy - y0;
    for (let x = 0; x < w; x++) {
      const fx = Math.min(gw - 1, Math.max(0, (x + 0.5) / f - 0.5));
      const x0 = Math.floor(fx);
      const x1 = Math.min(gw - 1, x0 + 1);
      const tx = fx - x0;
      const a = sm[y0 * gw + x0]! * (1 - tx) + sm[y0 * gw + x1]! * tx;
      const b = sm[y1 * gw + x0]! * (1 - tx) + sm[y1 * gw + x1]! * tx;
      out[y * w + x] = Math.max(1, a * (1 - ty) + b * ty);
    }
  }
  return out;
}

/** Remove 8-connected components smaller than minArea. Returns the number removed. */
export function despeckle(mask: Uint8Array, w: number, h: number, minArea: number): number {
  const labels = new Int32Array(w * h).fill(-1);
  const stack = new Int32Array(w * h);
  const members: number[] = [];
  let removed = 0;
  for (let i = 0; i < w * h; i++) {
    if (!mask[i] || labels[i] !== -1) continue;
    let sp = 0;
    stack[sp++] = i;
    labels[i] = i;
    members.length = 0;
    while (sp) {
      const p = stack[--sp]!;
      members.push(p);
      const px = p % w;
      const py = (p / w) | 0;
      for (let dy = -1; dy <= 1; dy++) {
        const yy = py + dy;
        if (yy < 0 || yy >= h) continue;
        for (let dx = -1; dx <= 1; dx++) {
          const xx = px + dx;
          if (xx < 0 || xx >= w) continue;
          const q = yy * w + xx;
          if (mask[q] && labels[q] === -1) {
            labels[q] = i;
            stack[sp++] = q;
          }
        }
      }
    }
    if (members.length < minArea) {
      for (const p of members) mask[p] = 0;
      removed++;
    }
  }
  return removed;
}

export interface CleanupStats {
  threshold: number;
  inkPixels: number;
  speckles: number;
  bbox: { x: number; y: number; w: number; h: number } | null;
}

export async function cleanupRaster(
  src: RasterImage,
  kind: 'signature' | 'thumb',
  opts: CleanupOptions,
  resize: ResizeFn = resizeRaster,
  stats?: CleanupStats,
): Promise<RasterImage> {
  let r = src;
  const long = Math.max(r.width, r.height);
  if (long > CLEANUP_MAX_SIDE) {
    const k = CLEANUP_MAX_SIDE / long;
    r = await resize(r, Math.max(1, Math.round(r.width * k)), Math.max(1, Math.round(r.height * k)));
  }
  const { width: w, height: h } = r;
  const n = w * h;
  const gray = toGray(r);
  const bg = estimateBackground(gray, w, h);
  const corr = new Uint8Array(n);
  const hist = new Uint32Array(256);
  for (let i = 0; i < n; i++) {
    const v = Math.min(255, Math.round((gray[i]! / bg[i]!) * 255));
    corr[i] = v;
    hist[v]!++;
  }
  // Otsu, clamped so paper texture is never ink and real ink is never paper.
  let t = otsu(hist, n);
  t = Math.max(90, Math.min(215, t));
  const strength = Number.isFinite(opts.strength) ? Math.max(0, Math.min(100, opts.strength)) : 50;
  t = Math.max(30, Math.min(235, Math.round(t - (strength - 50) * 1.2)));
  const mask = new Uint8Array(n);
  let ink = 0;
  for (let i = 0; i < n; i++)
    if (corr[i]! < t) {
      mask[i] = 1;
      ink++;
    }
  const minArea = Math.max(3, Math.min(Math.round(n * 0.00001), Math.round(ink * 0.002)));
  const speckles = ink ? despeckle(mask, w, h, kind === 'thumb' ? Math.max(3, minArea >> 1) : minArea) : 0;

  let x0 = w, y0 = h, x1 = -1, y1 = -1;
  ink = 0;
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++)
      if (mask[y * w + x]) {
        ink++;
        if (x < x0) x0 = x;
        if (x > x1) x1 = x;
        if (y < y0) y0 = y;
        if (y > y1) y1 = y;
      }
  if (stats) Object.assign(stats, { threshold: t, inkPixels: ink, speckles, bbox: ink ? { x: x0, y: y0, w: x1 - x0 + 1, h: y1 - y0 + 1 } : null });
  if (!ink) return createRaster(w, h); // nothing found: plain white

  const bw = x1 - x0 + 1;
  const bh = y1 - y0 + 1;
  let bx = x0 - Math.max(1, Math.round(bw * INK_PADDING));
  let by = y0 - Math.max(1, Math.round(bh * INK_PADDING));
  let ow = bw + 2 * (x0 - bx);
  let oh = bh + 2 * (y0 - by);
  const ta = opts.targetAspect;
  if (ta && ta > 0 && Number.isFinite(ta)) {
    if (ow / oh < ta) {
      const nw = Math.round(oh * ta);
      bx -= Math.floor((nw - ow) / 2);
      ow = nw;
    } else if (ow / oh > ta) {
      const nh = Math.round(ow / ta);
      by -= Math.floor((nh - oh) / 2);
      oh = nh;
    }
  }
  const out = createRaster(ow, oh);
  const od = out.data;
  const blue = opts.ink === 'blue';
  for (let y = 0; y < oh; y++) {
    const sy = y + by;
    if (sy < 0 || sy >= h) continue;
    for (let x = 0; x < ow; x++) {
      const sx = x + bx;
      if (sx < 0 || sx >= w) continue;
      const i = sy * w + sx;
      if (!mask[i]) continue;
      const v = Math.min(corr[i]!, t) * 0.45; // keep some stroke tone, always dark
      const p = (y * ow + x) * 4;
      if (blue) {
        od[p] = 15 + v * 0.25;
        od[p + 1] = 35 + v * 0.3;
        od[p + 2] = 120 + v * 0.4;
      } else {
        od[p] = od[p + 1] = od[p + 2] = v;
      }
    }
  }
  return out;
}
