/**
 * KB window maths. 1 KB = 1024 B by default, but portals disagree, so we target the window that
 * is safe under BOTH readings: bytes >= minKB×1024 and bytes <= maxKB×1000.
 */

export interface TargetWindow {
  /** Lowest byte size we aim for (hardLo + margin when there is a minimum). */
  lo: number;
  /** Highest byte size we aim for (hardHi - margin). */
  hi: number;
  /** round((lo + hi) / 2). */
  mid: number;
  /** True when hardLo/hardHi satisfy both the 1000 and the 1024 readings. */
  dual: boolean;
  /** Hard limits: minKB×1024 and maxKB×1000 (or maxKB×1024 when the readings cannot overlap). */
  hardLo: number;
  hardHi: number;
  /** Safety margin kept from each hard limit, in bytes. */
  margin: number;
}

/** 1 KB, the smallest margin kept from each limit. */
export const KB_MARGIN_MIN = 1024;
/** Margin as a share of the range. */
export const KB_MARGIN_FRAC = 0.03;

/**
 * Aim inside [minKB×1024, maxKB×1000] with a margin of max(1 KB, 3% of the range) from each end;
 * when the range is too narrow the margin shrinks to a quarter of the range so half of it stays
 * usable. No minimum -> no low margin. When no size passes both readings, fall back to the 1024
 * reading (most portals).
 */
export function targetWindow(minKB: number | null, maxKB: number): TargetWindow {
  const min = minKB ?? 0;
  const hardLo = Math.ceil(min * 1024);
  let hardHi = Math.floor(maxKB * 1000);
  const dual = hardLo < hardHi;
  if (!dual) hardHi = Math.floor(maxKB * 1024);
  const range = Math.max(0, hardHi - hardLo);
  const margin = Math.min(Math.max(KB_MARGIN_MIN, Math.round(range * KB_MARGIN_FRAC)), Math.floor(range / 4));
  const lo = hardLo + (min > 0 ? margin : 0);
  const hi = hardHi - margin;
  return { lo, hi, mid: Math.round((lo + hi) / 2), dual, hardLo, hardHi, margin };
}

export interface SizeCheck {
  pass1024: boolean;
  pass1000: boolean;
}

export function checkSize(sizeBytes: number, minKB: number | null, maxKB: number): SizeCheck {
  const min = minKB ?? 0;
  return {
    pass1024: sizeBytes >= min * 1024 && sizeBytes <= maxKB * 1024,
    pass1000: sizeBytes >= min * 1000 && sizeBytes <= maxKB * 1000,
  };
}

/** "34.2 KB" (1024-based by default). */
export function formatKB(bytes: number, base = 1024): string {
  const kb = bytes / base;
  return `${kb >= 100 ? kb.toFixed(0) : kb.toFixed(1)} KB`;
}

/** "20–50 KB", "≤ 50 KB". */
export function formatRange(minKB: number | null, maxKB: number): string {
  return minKB ? `${minKB}–${maxKB} KB` : `≤ ${maxKB} KB`;
}
