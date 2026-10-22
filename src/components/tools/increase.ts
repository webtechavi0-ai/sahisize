/**
 * Pure logic for /tools/increase-image-size-in-kb: raise a file to a minimum KB without
 * changing how it looks. No engine logic here: the engine's own fit() does the work
 * (SPEC 7.3 steps 3–4: higher quality first, then invisible grain, then COM padding; Q26
 * window minKB×1024 … maxKB×1000). This file only builds the spec and options.
 */
import { KB, type DocSpec, type FitOptions } from '@/engine/types';
import { MAX_TARGET_KB, MIN_TARGET_KB, kbLabel } from './logic';

/** Minimum-size chips (plus custom). */
export const INCREASE_MIN_PRESETS = [10, 20, 30, 50, 100] as const;

/**
 * Starting maximum for each chip: a range that published presets use with that minimum
 * (signature 10–20, banking photo 20–50, RRB signature 30–49, declaration 50–100,
 * IAF photo 100–200). The user can always change it.
 */
export const DEFAULT_MAX_FOR_MIN: Readonly<Record<number, number>> = {
  10: 20,
  20: 50,
  30: 49,
  50: 100,
  100: 200,
};

/** Same bounds as the custom KB field (TargetKbPicker hint: 5–5000 KB). */
export const MIN_INCREASE_KB = MIN_TARGET_KB;

/** Default maximum for a minimum: the table above, else twice the minimum. */
export function defaultMaxKB(minKB: number): number {
  return DEFAULT_MAX_FOR_MIN[minKB] ?? Math.min(MAX_TARGET_KB, Math.round(minKB * 2 * 10) / 10);
}

export type IncreaseError = 'minInvalid' | 'maxInvalid' | 'maxBelowMin';

/** Validate the user's range. Null when fine. */
export function validateIncrease(minKB: number | null, maxKB: number | null): IncreaseError | null {
  if (minKB === null || !Number.isFinite(minKB) || minKB < MIN_INCREASE_KB || minKB > MAX_TARGET_KB) {
    return 'minInvalid';
  }
  if (maxKB === null || !Number.isFinite(maxKB) || maxKB < MIN_INCREASE_KB || maxKB > MAX_TARGET_KB) {
    return 'maxInvalid';
  }
  if (maxKB <= minKB) return 'maxBelowMin';
  return null;
}

/**
 * KB-only spec with a minimum. `doc: 'other'` so the engine keeps the picture's own shape
 * (no passport default) and never letterboxes.
 */
export function increaseSpec(minKB: number, maxKB: number): DocSpec {
  return {
    doc: 'other',
    label: { en: 'Image', hi: 'इमेज' },
    widthPx: null,
    heightPx: null,
    minKB,
    maxKB,
    format: 'jpg',
    dpi: null,
    fileName: `image-${kbLabel(minKB)}kb.jpg`,
    rules: [],
  };
}

/**
 * Keep pixel size (default): exact source pixels, never shrunk. Off: the engine may cap the
 * working image (2000 px long side) and shrink it to get under the maximum.
 */
export function increaseFitOptions(keepPixels: boolean): FitOptions {
  return keepPixels
    ? { keepSourceDims: true, allowDownscale: false }
    : { keepSourceDims: true, allowDownscale: true };
}

/** The input already meets the minimum (bytes ≥ minKB×1024). */
export function alreadyAboveMin(fileBytes: number, minKB: number): boolean {
  return fileBytes >= minKB * KB;
}

/** Analytics target "20-50" (numbers only, no user data). */
export function increaseTarget(minKB: number, maxKB: number): string {
  return `${kbLabel(minKB)}-${kbLabel(maxKB)}`;
}
