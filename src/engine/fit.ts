/**
 * Auto-fit to a KB range (SPEC 7.3, PLAN 3.5). Pure and injectable: encoders, resize, decode
 * and the clock come from `deps`, so tests can drive every branch with a fake encoder.
 */
import { gaussianBlur } from './blur';
import { chooseDims } from './dims';
import { addGrain } from './grain';
import { padWithCom, setDpi, stripMetadata } from './jpeg-markers';
import { targetWindow, type TargetWindow } from './kb';
import { padPng, setPngDpi } from './png-chunks';
import { blit, createRaster, flattenAlpha, hasAlpha } from './raster';
import { coverCrop, letterbox, type ResizeFn } from './resize';
import { composeWithStrip, stripHeight, stripLines, type TextRasterFn } from './strip';
import {
  EngineError,
  letterboxesOnMismatch,
  type ChosenDims,
  type DocSpec,
  type FitOptions,
  type FitResult,
  type FitStage,
  type FitWarning,
  type RasterImage,
} from './types';
import { allRequiredPass, targetDpi, verifyOutput, type VerifyDecodeFn } from './verify';

export interface FitDeps {
  encodeJpeg(r: RasterImage, q: number): Promise<Uint8Array>;
  encodePng?(r: RasterImage): Promise<Uint8Array>;
  resize: ResizeFn;
  /** Decode for verification. Absent: header-only verification. */
  decode?: VerifyDecodeFn;
  textRaster?: TextRasterFn;
  now(): number;
}

export interface FitRasterOptions extends FitOptions {
  /** Pre-rendered strip (main-thread fallback when the worker has no OffscreenCanvas). */
  stripRaster?: RasterImage;
}

/** Encoder quality bounds and stages (SPEC 7.3). */
export const Q_START = 90;
export const Q_MIN = 5;
export const Q_MAX = 100;
export const Q_GRAIN_MIN = 95;
export const KB_ONLY_Q_FLOOR = 50;
export const MAX_SEARCH_ITER = 8;
export const BLUR_SIGMAS = [0.5, 1.0, 1.5];
export const GRAIN_AMPS = [1, 2, 3, 4];

interface Candidate {
  bytes: Uint8Array;
  q: number;
  size: number;
}

/** Per-raster encode cache. */
export class Encoder {
  private cache = new Map<number, Candidate>();
  count = 0;
  constructor(
    private readonly raster: RasterImage,
    private readonly enc: FitDeps['encodeJpeg'],
  ) {}
  async at(q: number): Promise<Candidate> {
    const hit = this.cache.get(q);
    if (hit) return hit;
    const bytes = await this.enc(this.raster, q);
    this.count++;
    const c = { bytes, q, size: bytes.length };
    this.cache.set(q, c);
    return c;
  }
  /** Largest cached candidate with size < lo (pad source). */
  bestBelow(lo: number): Candidate | null {
    let best: Candidate | null = null;
    for (const c of this.cache.values()) if (c.size < lo && (!best || c.size > best.size)) best = c;
    return best;
  }
}

/** Typical log-size slope of MozJPEG over q (size roughly ×8 from q=5 to q=90). */
const LOG_SLOPE = Math.log(8) / 85;

/**
 * Highest q in [qMin, qBad) with size <= hi, given size(qBad) > hi. Interpolation search in
 * log(size), bisection fallback, at most MAX_SEARCH_ITER encodes (plus one q=qMin probe).
 * Returns null when even qMin is too big.
 */
export async function searchDown(
  enc: Encoder,
  win: TargetWindow,
  qBadStart: number,
  sBadStart: number,
  qMin = Q_MIN,
): Promise<Candidate | null> {
  let qBad = qBadStart;
  let sBad = sBadStart;
  let good: Candidate | null = null;
  const target = win.hi * 0.97;
  for (let it = 0; it < MAX_SEARCH_ITER; it++) {
    const qLo = good ? good.q : qMin - 1;
    if (qBad - qLo <= 1) break;
    let q: number;
    if (!good) {
      q = Math.floor(qBad - Math.log(sBad / target) / LOG_SLOPE);
    } else {
      const t = (Math.log(target) - Math.log(good.size)) / (Math.log(sBad) - Math.log(good.size));
      q = Math.floor(good.q + (qBad - good.q) * Math.max(0, Math.min(1, t)));
      const span = qBad - good.q;
      if (span > 4 && (q <= good.q + 1 || q >= qBad - 1)) q = Math.floor((good.q + qBad) / 2);
    }
    q = Math.max(qLo + 1, Math.min(qBad - 1, q));
    const c = await enc.at(q);
    if (c.size <= win.hi) {
      good = c;
    } else {
      qBad = q;
      sBad = c.size;
    }
  }
  if (!good && qBad > qMin) {
    const c = await enc.at(qMin);
    if (c.size <= win.hi) good = c;
  }
  return good;
}

/** Lowest q in (qBelow, qMaxTry] with size >= lo, bisection. null when qMaxTry is still < lo. */
async function searchUp(enc: Encoder, win: TargetWindow, qBelow: number, qMaxTry: number): Promise<Candidate | null> {
  const top = await enc.at(qMaxTry);
  if (top.size < win.lo) return null;
  let lo = qBelow; // size < lo
  let hiQ = qMaxTry; // size >= lo
  let best = top;
  while (hiQ - lo > 1) {
    const mid = (lo + hiQ) >> 1;
    const c = await enc.at(mid);
    if (c.size >= win.lo) {
      hiQ = mid;
      best = c;
    } else lo = mid;
  }
  return best;
}

function inWindow(size: number, win: TargetWindow): boolean {
  return size >= win.lo && size <= win.hi;
}

function aspectMismatch(a: number, b: number): boolean {
  return Math.abs(a / b - 1) > 0.01;
}

/** Fit `src` to `spec`. Never mutates `src`. */
export async function fitRaster(
  src: RasterImage,
  spec: DocSpec,
  deps: FitDeps,
  opts: FitRasterOptions = {},
): Promise<FitResult> {
  const t0 = deps.now();
  if (spec.maxKB === null || spec.maxKB === undefined) {
    throw new EngineError('SPEC_INCOMPLETE', 'Document size is not known yet', { doc: spec.doc });
  }
  if (spec.format === 'pdf') {
    throw new EngineError('UNSUPPORTED_TYPE', 'fit() does not produce PDF; use imagesToPdf', { format: 'pdf' });
  }
  if (spec.minKB !== null && spec.minKB > spec.maxKB) {
    throw new EngineError('SPEC_INCOMPLETE', 'minKB is larger than maxKB', { minKB: spec.minKB, maxKB: spec.maxKB });
  }
  const format: 'jpg' | 'png' = spec.format === 'png' ? 'png' : 'jpg';
  const stages: FitStage[] = [];
  const stage = (s: FitStage) => {
    if (!stages.includes(s)) stages.push(s);
  };
  const warnings = new Set<FitWarning>();
  const win = targetWindow(spec.minKB, spec.maxKB);

  const chosen = chooseDims(spec, src.width / src.height, { w: src.width, h: src.height }, {
    keepSourceDims: opts.keepSourceDims,
    allowDownscale: opts.allowDownscale,
  });
  const flex = chosen.flex;
  const step = (cur: { w: number; h: number }, k: number) => {
    const clampW = (v: number) => Math.max(flex.minW, Math.min(flex.maxW, Math.round(v)));
    const clampH = (v: number) => Math.max(flex.minH, Math.min(flex.maxH, Math.round(v)));
    return { w: clampW(cur.w * k), h: clampH(cur.h * k) };
  };

  // ---- strip (K11)
  const lines = opts.nameDate ? stripLines(opts.nameDate) : [];
  const wantStrip = !!opts.stripRaster || lines.length > 0;
  const cache = new Map<string, RasterImage>();
  const prepare = async (w: number, h: number): Promise<RasterImage> => {
    const key = `${w}x${h}`;
    const hit = cache.get(key);
    if (hit) return hit;
    let out: RasterImage;
    const box = { w, h };
    if (wantStrip) {
      const sh = opts.stripRaster && opts.stripRaster.width === w ? opts.stripRaster.height : stripHeight(h);
      box.h = Math.max(1, h - sh);
    }
    const srcA = src.width / src.height;
    const boxA = box.w / box.h;
    let content: RasterImage;
    if (!aspectMismatch(srcA, boxA)) content = await deps.resize(src, box.w, box.h);
    else if (letterboxesOnMismatch(spec.doc)) {
      content = await letterbox(src, box.w, box.h, deps.resize);
      warnings.add('LETTERBOXED');
    } else {
      content = await coverCrop(src, box.w, box.h, deps.resize);
      warnings.add('COVER_CROPPED');
    }
    if (hasAlpha(content)) content = flattenAlpha(content);
    if (wantStrip) {
      let strip = opts.stripRaster;
      if (!strip || strip.width !== w || strip.height !== h - box.h) {
        if (!deps.textRaster) throw new EngineError('INTERNAL', 'No text rasteriser for the name/date strip');
        strip = await deps.textRaster(lines, w, h - box.h);
      }
      out = composeWithStrip(content, strip, w, h);
      stage('strip');
    } else if (content.width !== w || content.height !== h) {
      out = createRaster(w, h);
      blit(out, content, 0, 0);
    } else out = content;
    cache.clear(); // keep memory bounded: only the current size is cached
    cache.set(key, out);
    return out;
  };

  let cur = { w: chosen.w, h: chosen.h };
  let final: { bytes: Uint8Array; q: number; w: number; h: number; needsPad: boolean } | null = null;

  if (format === 'png') {
    if (!deps.encodePng) throw new EngineError('INTERNAL', 'PNG encoder not available');
    for (let attempt = 0; attempt < 30 && !final; attempt++) {
      const r = await prepare(cur.w, cur.h);
      const bytes = await deps.encodePng(r);
      stage('encode');
      if (bytes.length <= win.hi) {
        final = { bytes, q: 0, w: cur.w, h: cur.h, needsPad: bytes.length < win.lo };
        break;
      }
      const next = step(cur, chosen.mode === 'kb-only' ? 0.9 : 0.95);
      if (!flex.canShrink || (next.w === cur.w && next.h === cur.h)) {
        throw new EngineError('TOO_DETAILED', 'PNG cannot reach the maximum size', {
          minKBReached: Math.round((bytes.length / 1024) * 10) / 10,
          maxKB: spec.maxKB,
        });
      }
      stage('shrink');
      if (chosen.mode === 'kb-only') warnings.add('DOWNSCALED');
      cur = next;
    }
  } else {
    outer: for (let attempt = 0; attempt < 40; attempt++) {
      const base = await prepare(cur.w, cur.h);
      const enc = new Encoder(base, deps.encodeJpeg);
      const c90 = await enc.at(Q_START);
      stage('encode');
      if (inWindow(c90.size, win)) {
        final = { bytes: c90.bytes, q: c90.q, w: cur.w, h: cur.h, needsPad: false };
        break;
      }
      if (c90.size > win.hi) {
        stage('search');
        const found = await searchDown(enc, win, Q_START, c90.size);
        // KB-only: shrink (10%) rather than drop below q=50 (PLAN 3.4).
        if (chosen.mode === 'kb-only' && flex.canShrink && (!found || found.q < KB_ONLY_Q_FLOOR)) {
          const next = step(cur, 0.9);
          if (next.w !== cur.w || next.h !== cur.h) {
            stage('shrink');
            warnings.add('DOWNSCALED');
            cur = next;
            continue;
          }
        }
        if (!found && chosen.mode === 'range' && flex.canShrink) {
          const next = step(cur, 0.95);
          if (next.w !== cur.w || next.h !== cur.h) {
            stage('shrink');
            cur = next;
            continue;
          }
        }
        if (found) {
          final = { bytes: found.bytes, q: found.q, w: cur.w, h: cur.h, needsPad: found.size < win.lo };
          break;
        }
        // Fixed pixels: blur σ 0.5 → 1.5 and retry (SPEC 7.3 step 2).
        stage('blur');
        let s5 = (await enc.at(Q_MIN)).size;
        for (const sigma of BLUR_SIGMAS) {
          const benc = new Encoder(gaussianBlur(base, sigma), deps.encodeJpeg);
          const b5 = await benc.at(Q_MIN);
          s5 = Math.min(s5, b5.size);
          if (b5.size > win.hi) continue;
          const b90 = await benc.at(Q_START);
          const bf = b90.size <= win.hi ? b90 : await searchDown(benc, win, Q_START, b90.size);
          const pick = bf ?? b5;
          warnings.add('BLURRED');
          final = { bytes: pick.bytes, q: pick.q, w: cur.w, h: cur.h, needsPad: pick.size < win.lo };
          break outer;
        }
        throw new EngineError('TOO_DETAILED', 'Image is too detailed to reach the maximum size', {
          minKBReached: Math.round((s5 / 1024) * 10) / 10,
          maxKB: spec.maxKB,
        });
      }
      // size < lo
      stage('search');
      const up = await searchUp(enc, win, Q_START, Q_MAX);
      if (up && up.size <= win.hi) {
        final = { bytes: up.bytes, q: up.q, w: cur.w, h: cur.h, needsPad: false };
        break;
      }
      if (up) {
        // Size jumped over the whole window between two q steps: pad the one just below.
        const below = enc.bestBelow(win.lo) ?? c90;
        final = { bytes: below.bytes, q: below.q, w: cur.w, h: cur.h, needsPad: true };
        break;
      }
      // still < lo at q=100: grow within the pixel range first (PLAN 3.4, R5)
      if (chosen.mode === 'range' && flex.canGrow) {
        const next = step(cur, 1.1);
        if (next.w !== cur.w || next.h !== cur.h) {
          stage('grow');
          cur = next;
          continue;
        }
      }
      stage('grain');
      for (const amp of GRAIN_AMPS) {
        const genc = new Encoder(addGrain(base, amp, opts.seed), deps.encodeJpeg);
        const g = await searchUp(genc, win, Q_GRAIN_MIN - 1, Q_MAX);
        if (g && g.size <= win.hi) {
          warnings.add('GRAIN');
          final = { bytes: g.bytes, q: g.q, w: cur.w, h: cur.h, needsPad: false };
          break outer;
        }
        if (g) break; // overshoots: more grain only makes it worse
      }
      // pad the clean (grain-free) q=100 encode
      const best = enc.bestBelow(win.lo) ?? (await enc.at(Q_MAX));
      final = { bytes: best.bytes, q: best.q, w: cur.w, h: cur.h, needsPad: true };
      break;
    }
  }
  if (!final) throw new EngineError('INTERNAL', 'fit did not converge');

  // ---- DPI + metadata (SPEC 7.5)
  let bytes: Uint8Array = final.bytes;
  const dpi = targetDpi(spec);
  if (format === 'jpg') {
    bytes = stripMetadata(bytes);
    if (dpi) {
      bytes = setDpi(bytes, dpi);
      stage('dpi');
    }
  } else if (dpi) {
    bytes = setPngDpi(bytes, dpi);
    stage('dpi');
  }

  // ---- padding (SPEC 7.3 step 4b)
  if (bytes.length < win.lo) {
    const target = Math.min(win.mid, win.hi);
    bytes = format === 'jpg' ? padWithCom(bytes, target) : padPng(bytes, target);
    stage('pad');
    warnings.add('PADDED');
  }
  if (bytes.length > win.hi && bytes.length > spec.maxKB * 1024) {
    throw new EngineError('INTERNAL', 'fit produced an oversize file', { size: bytes.length });
  }

  // ---- verify (SPEC 7.3 step 6)
  const v = await verifyOutput({ bytes, spec, format, expected: { w: final.w, h: final.h }, decode: deps.decode });
  for (const w of v.warnings) warnings.add(w);
  if (!allRequiredPass(v.checks)) {
    const failed = v.checks.filter((c) => !c.pass && (c.level ?? 'required') === 'required').map((c) => c.rule);
    // Should never happen; surface it as a failing check list rather than throwing.
    if (typeof console !== 'undefined') console.warn('[engine] verification failed', failed);
  }

  const out = new Uint8Array(bytes.length);
  out.set(bytes);
  const dims: ChosenDims = { ...chosen, w: final.w, h: final.h };
  return {
    bytes: out,
    widthPx: final.w,
    heightPx: final.h,
    sizeBytes: out.length,
    quality: final.q,
    stages,
    checks: v.checks,
    format,
    durationMs: Math.round(deps.now() - t0),
    warnings: [...warnings],
    dims,
  };
}
