/**
 * Pure logic for /tools/name-date-on-photo (SPEC K11 strip, drawn by the engine).
 * The name and date the user types stay on the device: they go only into
 * engine.fit({ nameDate }), never into analytics, file names or URLs.
 */
import type { DocSpec, FitOptions, NameDate } from '@/engine/types';
import { MAX_TARGET_KB, validPx } from './logic';

export const NAME_MAX_CHARS = 40;
export const DATE_MAX_CHARS = 12;

export type NameDateError = 'nameMissing' | 'dateMissing';

/** Trim and collapse spaces; cut to the field limits. */
export function cleanNameDate(nd: NameDate): NameDate {
  const tidy = (s: string, max: number) => s.replace(/\s+/g, ' ').trim().slice(0, max);
  return { name: tidy(nd.name, NAME_MAX_CHARS), date: tidy(nd.date, DATE_MAX_CHARS) };
}

export function nameDateError(nd: NameDate): NameDateError | null {
  const c = cleanNameDate(nd);
  if (!c.name) return 'nameMissing';
  if (!c.date) return 'dateMissing';
  return null;
}

export interface NameDateCustom {
  w: number | null;
  h: number | null;
  minKB: number | null;
  maxKB: number | null;
}

export const NAME_DATE_CUSTOM_DEFAULT: NameDateCustom = { w: null, h: null, minKB: null, maxKB: 50 };

/**
 * Custom size: fixed pixels when both sides are given, else a KB-only photo (the engine's
 * passport default, 3.5×4.5 cm = 413×531 px). Null when the numbers are not usable.
 */
export function nameDateCustomSpec(c: NameDateCustom): DocSpec | null {
  if (c.maxKB === null || !Number.isFinite(c.maxKB) || c.maxKB < 5 || c.maxKB > MAX_TARGET_KB) return null;
  if (c.minKB !== null && (!Number.isFinite(c.minKB) || c.minKB < 0 || c.minKB >= c.maxKB)) return null;
  if ((c.w === null) !== (c.h === null)) return null;
  if (c.w !== null && c.h !== null && !validPx(c.w, c.h)) return null;
  return {
    doc: 'photo',
    label: { en: 'Photograph with name and date', hi: 'नाम और तारीख वाली फोटो' },
    widthPx: c.w,
    heightPx: c.h,
    minKB: c.minKB && c.minKB > 0 ? c.minKB : null,
    maxKB: c.maxKB,
    format: 'jpg',
    dpi: null,
    fileName: 'photo-name-date.jpg',
    rules: [],
    needsNameDateStrip: true,
  };
}

export function nameDateFitOptions(nd: NameDate): FitOptions {
  return { nameDate: cleanNameDate(nd) };
}
