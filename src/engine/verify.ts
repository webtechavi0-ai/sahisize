/**
 * Final verification (SPEC 7.3 step 6, K7): decode the final bytes, check exact dims, size under
 * both KB readings, magic bytes, baseline SOF0, JFIF density and a background heuristic.
 */
import { dimsPass, requiredDimsLabel } from './dims';
import { inspectJpeg, isJpeg } from './jpeg-markers';
import { checkSize, formatKB, formatRange } from './kb';
import { isPng, pngDims, readPngDpi } from './png-chunks';
import type { DocSpec, FitCheck, FitWarning, RasterImage } from './types';

export type VerifyDecodeFn = (bytes: Uint8Array, format: 'jpg' | 'png') => Promise<RasterImage>;

/** DPI to write (SPEC 7.5): preset DPI, else 200 when the size came from cm/mm, else none. */
export function targetDpi(spec: DocSpec): number | null {
  if (spec.dpi) return spec.dpi;
  return spec.physical ? 200 : null;
}

/**
 * Fraction of "background-like" pixels: near-white for signature/thumb (whole image), light and
 * low-saturation along the top and side borders for photos. null when not applicable.
 */
export function backgroundRatio(r: RasterImage, doc: DocSpec['doc']): number | null {
  const { width: w, height: h, data: d } = r;
  if (doc === 'signature' || doc === 'thumb') {
    let white = 0;
    for (let p = 0; p < d.length; p += 4) {
      const l = (d[p]! * 77 + d[p + 1]! * 150 + d[p + 2]! * 29) >> 8;
      if (l >= 200) white++;
    }
    return white / (w * h);
  }
  if (doc === 'photo') {
    const band = Math.max(1, Math.round(Math.min(w, h) * 0.06));
    let n = 0;
    let light = 0;
    const consider = (x: number, y: number) => {
      const p = (y * w + x) * 4;
      const r0 = d[p]!, g0 = d[p + 1]!, b0 = d[p + 2]!;
      const mx = Math.max(r0, g0, b0);
      const mn = Math.min(r0, g0, b0);
      n++;
      if (mx >= 170 && mx - mn <= 60) light++;
    };
    const lowerLimit = Math.round(h * 0.6); // shoulders are below this
    for (let y = 0; y < band; y++) for (let x = 0; x < w; x++) consider(x, y);
    for (let y = band; y < lowerLimit; y++) {
      for (let x = 0; x < band; x++) consider(x, y);
      for (let x = w - band; x < w; x++) consider(x, y);
    }
    return n ? light / n : null;
  }
  return null;
}

export interface VerifyInput {
  bytes: Uint8Array;
  spec: DocSpec;
  format: 'jpg' | 'png';
  expected: { w: number; h: number };
  decode?: VerifyDecodeFn;
}

export interface VerifyOutput {
  checks: FitCheck[];
  warnings: FitWarning[];
  decoded: RasterImage | null;
}

export async function verifyOutput({ bytes, spec, format, expected, decode }: VerifyInput): Promise<VerifyOutput> {
  const checks: FitCheck[] = [];
  const warnings: FitWarning[] = [];
  const maxKB = spec.maxKB!;
  let decoded: RasterImage | null = null;
  let dw = 0;
  let dh = 0;
  let decodeOk = false;
  try {
    if (decode) {
      decoded = await decode(bytes, format);
      dw = decoded.width;
      dh = decoded.height;
      decodeOk = true;
    } else if (format === 'jpg' && isJpeg(bytes)) {
      const info = inspectJpeg(bytes);
      dw = info.width;
      dh = info.height;
      decodeOk = dw > 0;
    } else if (format === 'png' && isPng(bytes)) {
      ({ width: dw, height: dh } = pngDims(bytes));
      decodeOk = true;
    }
  } catch {
    decodeOk = false;
  }

  checks.push({
    rule: 'dims',
    pass: decodeOk && dw === expected.w && dh === expected.h && dimsPass(spec, dw, dh),
    actual: decodeOk ? `${dw}×${dh} px` : 'unreadable',
    required: requiredDimsLabel(spec),
    level: 'required',
  });

  const size = bytes.length;
  const sc = checkSize(size, spec.minKB, maxKB);
  checks.push({ rule: 'size', pass: sc.pass1024, actual: formatKB(size), required: formatRange(spec.minKB, maxKB), level: 'required' });
  checks.push({
    rule: 'size1000',
    pass: sc.pass1000,
    actual: formatKB(size, 1000),
    required: `${formatRange(spec.minKB, maxKB)} (1 KB = 1000 B)`,
    level: 'warning',
  });
  if (sc.pass1024 && !sc.pass1000) warnings.push('PASSES_ONLY_1024');
  if (!sc.pass1024 && sc.pass1000) warnings.push('PASSES_ONLY_1000');

  const magicOk = format === 'jpg' ? isJpeg(bytes) : isPng(bytes);
  checks.push({
    rule: 'format',
    pass: magicOk && decodeOk,
    actual: isJpeg(bytes) ? 'JPG' : isPng(bytes) ? 'PNG' : 'unknown',
    required: format.toUpperCase(),
    level: 'required',
  });

  const dpi = targetDpi(spec);
  if (format === 'jpg' && magicOk) {
    let info;
    try {
      info = inspectJpeg(bytes);
    } catch {
      info = null;
    }
    checks.push({
      rule: 'baseline',
      pass: !!info && info.baseline,
      actual: info ? (info.baseline ? 'Baseline' : info.progressive ? 'Progressive' : `SOF${info.sof - 0xc0}`) : 'unreadable',
      required: 'Baseline',
      level: 'required',
    });
    const j = info?.jfif;
    const actualDpi = j && j.units === 1 ? `${j.xDensity} DPI` : j && j.units === 2 ? `${Math.round(j.xDensity * 2.54)} DPI` : 'not set';
    if (dpi) {
      checks.push({
        rule: 'dpi',
        pass: !!j && j.units === 1 && j.xDensity === dpi && j.yDensity === dpi,
        actual: actualDpi,
        required: `${dpi} DPI`,
        level: 'required',
      });
    } else {
      checks.push({ rule: 'dpi', pass: true, actual: actualDpi, required: 'any', level: 'info' });
    }
  } else if (format === 'png' && magicOk) {
    const d = readPngDpi(bytes);
    if (dpi) {
      checks.push({ rule: 'dpi', pass: d === dpi, actual: d ? `${d} DPI` : 'not set', required: `${dpi} DPI`, level: 'required' });
    } else {
      checks.push({ rule: 'dpi', pass: true, actual: d ? `${d} DPI` : 'not set', required: 'any', level: 'info' });
    }
  }

  const ratio = decoded ? backgroundRatio(decoded, spec.doc) : null;
  if (ratio === null) {
    checks.push({ rule: 'background', pass: true, actual: 'n/a', required: 'n/a', level: 'info' });
  } else {
    const need = spec.doc === 'photo' ? 0.6 : 0.7;
    checks.push({
      rule: 'background',
      pass: ratio >= need,
      actual: `${Math.round(ratio * 100)}% light`,
      required: `≥ ${Math.round(need * 100)}% light`,
      level: 'warning',
    });
  }
  return { checks, warnings, decoded };
}

/** True when every 'required' row passes (K7: download enabled). */
export function allRequiredPass(checks: FitCheck[]): boolean {
  return checks.every((c) => c.pass || (c.level !== undefined && c.level !== 'required'));
}
