/**
 * Auto-fit a raster to a DocSpec's KB range: choose dims, prepare pixels (resize, letterbox or
 * cover-crop, optional name/date strip), then search encoder quality, shrink/grow the pixels,
 * blur, grain and finally pad, write DPI and verify.
 *
 * Pure and injectable: encoders, resize, decode and the clock come from `deps`, so tests can
 * drive every branch with a fake encoder.
 */
import { gaussianBlur } from './blur';
import { chooseDims } from './dims';
import { boxDownscale, blit, createRaster, flattenAlpha, hasAlpha } from './raster';
import { coverCrop, letterbox, type ResizeFn } from './geometry';
import { addGrain } from './grain';
import { padWithCom, setDpi, stripMetadata } from './jpeg-markers';
import { targetWindow, type TargetWindow } from './kb';
import { padPng, setPngDpi } from './png-chunks';
import { composeWithStrip, stripHeight, stripLines, type TextRasterFn } from './strip';
import { allRequiredPass, targetDpi, verifyOutput, type VerifyDecodeFn } from './verify';
import {
  EngineError,
  letterboxesOnMismatch,
  pixelMode,
  type Bytes,
  type ChosenDims,
  type DocSpec,
  type FitOptions,
  type FitResult,
  type FitStage,
  type FitWarning,
  type RasterImage,
} from '../types';

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

/** Encoder quality bounds. */
export const Q_START = 90;
export const Q_MIN = 5;
export const Q_MAX = 100;
export const Q_GRAIN_MIN = 95;
export const KB_ONLY_Q_FLOOR = 50;
/**
 * KB-only specs: the working image is capped at this long side before the search, unless the
 * caller keeps the source pixels and forbids downscaling ("keep dimensions").
 */
export const KB_ONLY_WORK_CAP = 2000;
/** At most 6 search encodes per bracket. */
export const MAX_SEARCH_ITER = 6;
/**
 * Search tolerance in q steps. Down: stop once the log-size interpolation predicts the window top
 * within this many q of the passing candidate. Up: stop once the bracket is this narrow and the
 * candidate is inside the window.
 */
export const Q_TOLERANCE = 3;
export const BLUR_SIGMAS = [0.5, 1.0, 1.5] as const;
export const GRAIN_AMPS = [1, 2, 3, 4] as const;

/** Typical log-size slope of MozJPEG over q (size roughly ×8 from q=5 to q=90). */
const LOG_SLOPE = Math.log(8) / 85;

export interface Candidate {
  bytes: Uint8Array;
  q: number;
  size: number;
}

/** Per-raster encode cache. */
export class Encoder {
  private readonly cache = new Map<number, Candidate>();
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
    const c: Candidate = { bytes, q, size: bytes.length };
    this.cache.set(q, c);
    return c;
  }

  /** Largest cached candidate with size < lo (the padding source). */
  bestBelow(lo: number): Candidate | null {
    let best: Candidate | null = null;
    for (const c of this.cache.values()) if (c.size < lo && (!best || c.size > best.size)) best = c;
    return best;
  }
}

/**
 * Highest q in [qMin, qBad) with size <= hi, given size(qBad) > hi. Interpolation search in
 * log(size) with a bisection fallback, at most MAX_SEARCH_ITER encodes (plus one q=qMin probe).
 * Returns null when even qMin is too big.
 */
export async function searchDown(
  enc: Encoder,
  win: TargetWindow,
  qBadStart: number,
  sBadStart: number,
  qMin: number = Q_MIN,
  knownGood: Candidate | null = null,
): Promise<Candidate | null> {
  let qBad = qBadStart;
  let sBad = sBadStart;
  let good: Candidate | null = knownGood && knownGood.size <= win.hi ? knownGood : null;
  const target = win.hi;
  let lastSide = 0; // +1 = moved good up, -1 = moved bad down
  let sameSide = 0;
  for (let it = 0; it < MAX_SEARCH_ITER; it++) {
    const qLo = good ? good.q : qMin - 1;
    if (qBad - qLo <= 1) break;
    let q: number;
    if (!good) {
      q = Math.round(qBad - Math.log(sBad / target) / LOG_SLOPE);
    } else {
      const t = (Math.log(target) - Math.log(good.size)) / (Math.log(sBad) - Math.log(good.size));
      const qStar = good.q + (qBad - good.q) * Math.max(0, Math.min(1, t));
      if (good.size >= win.lo && qStar - good.q <= Q_TOLERANCE) break;
      // stuck on one side twice: bisect (Illinois-style)
      q = sameSide >= 2 ? Math.floor((good.q + qBad) / 2) : Math.round(qStar);
    }
    q = Math.max(qLo + 1, Math.min(qBad - 1, q));
    const c = await enc.at(q);
    const side = c.size <= win.hi ? 1 : -1;
    sameSide = side === lastSide ? sameSide + 1 : 1;
    lastSide = side;
    if (side === 1) good = c;
    else {
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

/** Lowest q in (qBelow, qMaxTry] with size >= lo (bisection). null when qMaxTry is still < lo. */
export async function searchUp(enc: Encoder, win: TargetWindow, qBelow: number, qMaxTry: number): Promise<Candidate | null> {
  const top = await enc.at(qMaxTry);
  if (top.size < win.lo) return null;
  let lo = qBelow; // size < lo
  let hiQ = qMaxTry; // size >= lo
  let best = top;
  while (hiQ - lo > 1 && !(hiQ - lo <= Q_TOLERANCE && best.size <= win.hi)) {
    const mid = (lo + hiQ) >> 1;
    const c = await enc.at(mid);
    if (c.size >= win.lo) {
      hiQ = mid;
      best = c;
    } else lo = mid;
  }
  return best;
}

const inWindow = (size: number, win: TargetWindow) => size >= win.lo && size <= win.hi;
const aspectMismatch = (a: number, b: number) => Math.abs(a / b - 1) > 0.01;
const roundKB = (bytes: number) => Math.round((bytes / 1024) * 10) / 10;

/** Integer box average down to <= ~2× the cap, then one resample to the cap. */
async function capWorking(src: RasterImage, resize: ResizeFn): Promise<RasterImage> {
  const f = Math.floor(Math.max(src.width, src.height) / KB_ONLY_WORK_CAP);
  let r = f >= 2 ? boxDownscale(src, f) : src;
  const long = Math.max(r.width, r.height);
  if (long > KB_ONLY_WORK_CAP) {
    const k = KB_ONLY_WORK_CAP / long;
    r = await resize(r, Math.max(1, Math.round(r.width * k)), Math.max(1, Math.round(r.height * k)));
  }
  return r;
}

interface Final {
  bytes: Uint8Array;
  q: number;
  w: number;
  h: number;
}

/** Fit `src` to `spec`. Never mutates `src`. */
export async function fitRaster(
  source: RasterImage,
  spec: DocSpec,
  deps: FitDeps,
  opts: FitRasterOptions = {},
): Promise<FitResult> {
  const t0 = deps.now();
  const specMaxKB = spec.maxKB;
  if (specMaxKB === null || specMaxKB === undefined) {
    throw new EngineError('SPEC_INCOMPLETE', 'Document size is not known yet', { doc: spec.doc });
  }
  const maxKB: number = specMaxKB;
  if (spec.format === 'pdf') {
    throw new EngineError('UNSUPPORTED_TYPE', 'fit() does not produce PDF; use imagesToPdf', { format: 'pdf' });
  }
  if (spec.minKB !== null && spec.minKB > maxKB) {
    throw new EngineError('SPEC_INCOMPLETE', 'minKB is larger than maxKB', { minKB: spec.minKB, maxKB });
  }
  const format: 'jpg' | 'png' = spec.format === 'png' ? 'png' : 'jpg';
  const stages: FitStage[] = [];
  const stage = (s: FitStage) => {
    if (!stages.includes(s)) stages.push(s);
  };
  const warnings = new Set<FitWarning>();
  const win = targetWindow(spec.minKB, maxKB);

  let src = source;
  if (
    pixelMode(spec) === 'kb-only' &&
    !(opts.keepSourceDims && opts.allowDownscale === false) &&
    Math.max(src.width, src.height) > KB_ONLY_WORK_CAP
  ) {
    src = await capWorking(src, deps.resize);
  }

  const chosen = chooseDims(spec, src.width / src.height, { w: src.width, h: src.height }, {
    keepSourceDims: opts.keepSourceDims,
    allowDownscale: opts.allowDownscale,
  });
  const flex = chosen.flex;
  const step = (cur: { w: number; h: number }, k: number) => ({
    w: Math.max(flex.minW, Math.min(flex.maxW, Math.round(cur.w * k))),
    h: Math.max(flex.minH, Math.min(flex.maxH, Math.round(cur.h * k))),
  });

  // ---- pixel preparation (with the optional name/date strip)
  const lines = opts.nameDate ? stripLines(opts.nameDate) : [];
  const wantStrip = !!opts.stripRaster || lines.length > 0;
  let cached: { key: string; raster: RasterImage } | null = null; // only the current size is kept
  let firstContent: RasterImage | null = null;

  const prepare = async (w: number, h: number): Promise<RasterImage> => {
    const key = `${w}x${h}`;
    if (cached?.key === key) return cached.raster;
    const box = { w, h };
    if (wantStrip) {
      const sh = opts.stripRaster && opts.stripRaster.width === w ? opts.stripRaster.height : stripHeight(h);
      box.h = Math.max(1, h - sh);
    }
    const srcA = src.width / src.height;
    const boxA = box.w / box.h;
    let content: RasterImage;
    if (
      firstContent &&
      box.w <= firstContent.width &&
      box.h <= firstContent.height &&
      !aspectMismatch(firstContent.width / firstContent.height, boxA)
    ) {
      // shrink steps resample the first prepared size, not the (up to 12 MP) source
      content = await deps.resize(firstContent, box.w, box.h);
    } else if (!aspectMismatch(srcA, boxA)) {
      content = await deps.resize(src, box.w, box.h);
    } else if (letterboxesOnMismatch(spec.doc)) {
      content = await letterbox(src, box.w, box.h, deps.resize);
      warnings.add('LETTERBOXED');
    } else {
      content = await coverCrop(src, box.w, box.h, deps.resize);
      warnings.add('COVER_CROPPED');
    }
    if (hasAlpha(content)) content = flattenAlpha(content);
    firstContent ??= content;
    let out: RasterImage;
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
    } else {
      out = content;
    }
    cached = { key, raster: out };
    return out;
  };

  let cur = { w: chosen.w, h: chosen.h };
  let final: Final | null = null;

  if (format === 'png') {
    const encodePng = deps.encodePng;
    if (!encodePng) throw new EngineError('INTERNAL', 'PNG encoder not available');
    for (let attempt = 0; attempt < 30 && !final; attempt++) {
      const bytes = await encodePng(await prepare(cur.w, cur.h));
      stage('encode');
      if (bytes.length <= win.hi) {
        final = { bytes, q: 0, w: cur.w, h: cur.h };
        break;
      }
      const next = step(cur, chosen.mode === 'kb-only' ? 0.9 : 0.95);
      if (!flex.canShrink || (next.w === cur.w && next.h === cur.h)) {
        throw new EngineError('TOO_DETAILED', 'PNG cannot reach the maximum size', {
          minKBReached: roundKB(bytes.length),
          maxKB,
        });
      }
      stage('shrink');
      if (chosen.mode === 'kb-only') warnings.add('DOWNSCALED');
      cur = next;
    }
  } else {
    final = await fitJpeg();
  }
  if (!final) throw new EngineError('INTERNAL', 'fit did not converge');

  async function fitJpeg(): Promise<Final | null> {
    for (let attempt = 0; attempt < 40; attempt++) {
      const base = await prepare(cur.w, cur.h);
      const enc = new Encoder(base, deps.encodeJpeg);
      const c90 = await enc.at(Q_START);
      stage('encode');
      const done = (c: Candidate): Final => ({ bytes: c.bytes, q: c.q, w: cur.w, h: cur.h });
      if (inWindow(c90.size, win)) return done(c90);

      if (c90.size > win.hi) {
        stage('search');
        // Shrink before search: probe the quality floor; while it is still over max, step the
        // pixels down. The step is estimated from size ∝ pixels (never less than the 10% / 5%
        // step, never below the floor) so large KB-only images converge in a couple of encodes.
        const floorQ = chosen.mode === 'kb-only' ? KB_ONLY_Q_FLOOR : chosen.mode === 'range' ? Q_MIN : 0;
        if (floorQ && flex.canShrink) {
          const cf = await enc.at(floorQ);
          if (cf.size > win.hi) {
            const maxStep = chosen.mode === 'kb-only' ? 0.9 : 0.95;
            const k = Math.max(0.5, Math.min(maxStep, Math.sqrt((win.hi * 0.95) / cf.size)));
            const next = step(cur, k);
            if (next.w !== cur.w || next.h !== cur.h) {
              stage('shrink');
              if (chosen.mode === 'kb-only') warnings.add('DOWNSCALED');
              cur = next;
              continue;
            }
          }
        }
        const floorC = floorQ ? await enc.at(floorQ) : null;
        const found = await searchDown(enc, win, Q_START, c90.size, Q_MIN, floorC);
        if (found) return done(found);

        // Fixed pixels: blur σ 0.5 -> 1.5 and retry.
        stage('blur');
        let s5 = (await enc.at(Q_MIN)).size;
        for (const sigma of BLUR_SIGMAS) {
          const benc = new Encoder(gaussianBlur(base, sigma), deps.encodeJpeg);
          const b5 = await benc.at(Q_MIN);
          s5 = Math.min(s5, b5.size);
          if (b5.size > win.hi) continue;
          const b90 = await benc.at(Q_START);
          const bf = b90.size <= win.hi ? b90 : await searchDown(benc, win, Q_START, b90.size);
          warnings.add('BLURRED');
          return done(bf ?? b5);
        }
        throw new EngineError('TOO_DETAILED', 'Image is too detailed to reach the maximum size', {
          minKBReached: roundKB(s5),
          maxKB,
        });
      }

      // size < lo
      stage('search');
      const up = await searchUp(enc, win, Q_START, Q_MAX);
      if (up && up.size <= win.hi) return done(up);
      if (up) {
        // Size jumped over the whole window between two q steps: pad the one just below.
        return done(enc.bestBelow(win.lo) ?? c90);
      }
      // still < lo at q=100: grow within the pixel range first
      if (chosen.mode === 'range' && flex.canGrow) {
        const next = step(cur, 1.1);
        if (next.w !== cur.w || next.h !== cur.h) {
          stage('grow');
          cur = next;
          continue;
        }
      }
      stage('grain');
      // Probe the strongest grain first: if even ±4 at q=100 stays under min, skip to padding.
      const strongest = GRAIN_AMPS[GRAIN_AMPS.length - 1]!;
      const probe = await new Encoder(addGrain(base, strongest, opts.seed), deps.encodeJpeg).at(Q_MAX);
      if (probe.size >= win.lo) {
        for (const amp of GRAIN_AMPS) {
          const genc = new Encoder(addGrain(base, amp, opts.seed), deps.encodeJpeg);
          const g = await searchUp(genc, win, Q_GRAIN_MIN - 1, Q_MAX);
          if (g && g.size <= win.hi) {
            warnings.add('GRAIN');
            return done(g);
          }
          if (g) break; // overshoots: more grain only makes it worse
        }
      }
      // pad the clean (grain-free) q=100 encode
      return done(enc.bestBelow(win.lo) ?? (await enc.at(Q_MAX)));
    }
    return null;
  }

  // ---- metadata + DPI
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

  // ---- padding up to the window middle (never past hi)
  if (bytes.length < win.lo) {
    const target = Math.min(win.mid, win.hi);
    bytes = format === 'jpg' ? padWithCom(bytes, target) : padPng(bytes, target);
    stage('pad');
    warnings.add('PADDED');
  }
  if (bytes.length > win.hardHi) {
    throw new EngineError('INTERNAL', 'fit produced an oversize file', { size: bytes.length });
  }

  // ---- verify
  const v = await verifyOutput({ bytes, spec, format, expected: { w: final.w, h: final.h }, decode: deps.decode });
  for (const w of v.warnings) warnings.add(w);
  if (!allRequiredPass(v.checks) && typeof console !== 'undefined') {
    // Should never happen; the failing rows are surfaced in `checks` instead of throwing.
    const failed = v.checks.filter((c) => !c.pass && (c.level ?? 'required') === 'required').map((c) => c.rule);
    console.warn('[engine] verification failed', failed);
  }

  const out: Bytes = new Uint8Array(bytes.length);
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
