/**
 * KB window maths (SPEC 7.3 "Size unit", PLAN 3.5 step 2).
 * 1 KB = 1024 B by default; we target the window that is safe under BOTH readings.
 */

export interface TargetWindow {
  /** Lowest acceptable byte size. */
  lo: number;
  /** Highest acceptable byte size. */
  hi: number;
  /** (lo + hi) / 2: padding target. */
  mid: number;
  /** True when lo/hi satisfy both 1000 and 1024 definitions. */
  dual: boolean;
}

export function targetWindow(minKB: number | null, maxKB: number): TargetWindow {
  const min = minKB ?? 0;
  const lo1024 = Math.ceil(min * 1024);
  const hi1000 = Math.floor(maxKB * 1000);
  if (lo1024 < hi1000) {
    return { lo: lo1024, hi: hi1000, mid: Math.round((lo1024 + hi1000) / 2), dual: true };
  }
  const lo = Math.ceil(min * 1024);
  const hi = Math.floor(maxKB * 1024);
  return { lo, hi, mid: Math.round((lo + hi) / 2), dual: false };
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

/** "34.2 KB" (1024-based). */
export function formatKB(bytes: number, base = 1024): string {
  const kb = bytes / base;
  return `${kb >= 100 ? kb.toFixed(0) : kb.toFixed(1)} KB`;
}

/** "20–50 KB", "≤ 50 KB". */
export function formatRange(minKB: number | null, maxKB: number): string {
  return minKB ? `${minKB}–${maxKB} KB` : `≤ ${maxKB} KB`;
}
