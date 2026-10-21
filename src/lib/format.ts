/**
 * Display helpers for KB, px and cm (Workstream B). Pure, no strings except
 * language-neutral units. 1 KB = 1024 bytes (SPEC 7.3).
 */
import { KB, pixelMode, type DocSpec, type LocalizedText } from '@/engine/types';
import type { Lang } from '@/config/site';

export type T = (key: string, vars?: Record<string, string | number>) => string;

/** Pick the language of a bilingual preset field. */
export function loc(
  text: LocalizedText | { en: string; hi?: string } | undefined,
  lang: Lang,
): string {
  if (!text) return '';
  return lang === 'hi' && text.hi ? text.hi : text.en;
}

/** 1 decimal under 100 KB, whole numbers above: "34.2", "250". */
export function kbNumber(bytes: number): string {
  const kb = bytes / KB;
  if (kb < 100) return (Math.round(kb * 10) / 10).toFixed(1).replace(/\.0$/, '');
  return String(Math.round(kb));
}

/** "34.2 KB" (or MB above 1024 KB). */
export function formatKB(bytes: number): string {
  if (bytes >= 1024 * KB) return `${(bytes / (1024 * KB)).toFixed(1)} MB`;
  return `${kbNumber(bytes)} KB`;
}

export function formatMB(bytes: number): string {
  return (bytes / (1024 * 1024)).toFixed(1);
}

/** "20–50 KB", "up to 50 KB". */
export function kbRangeText(t: T, minKB: number | null, maxKB: number | null): string {
  if (maxKB === null) return t('common.status.toVerify');
  if (minKB !== null && minKB > 0) return t('common.units.kbRange', { min: minKB, max: maxKB });
  return t('common.units.kbMax', { max: maxKB });
}

export function pxText(t: T, w: number, h: number): string {
  return t('common.units.px', { w, h });
}

/** Pixel rule in plain words: "200×230 px", "140–… px", or empty for KB-only. */
export function dimsRuleText(t: T, spec: DocSpec): string {
  const mode = pixelMode(spec);
  if (mode === 'fixed') return pxText(t, spec.widthPx!, spec.heightPx!);
  if (mode === 'range') {
    const w = rangePart(spec.minWidthPx, spec.maxWidthPx);
    const h = rangePart(spec.minHeightPx, spec.maxHeightPx);
    return `${w}×${h} px`;
  }
  return '';
}

function rangePart(min?: number, max?: number): string {
  if (min !== undefined && max !== undefined) return min === max ? `${min}` : `${min}–${max}`;
  if (min !== undefined) return `≥${min}`;
  if (max !== undefined) return `≤${max}`;
  return 'any';
}

/** One-line rule summary for a document card: "200×230 px · 20–50 KB · JPG". */
export function ruleSummary(t: T, spec: DocSpec): string {
  const parts = [
    dimsRuleText(t, spec),
    kbRangeText(t, spec.minKB, spec.maxKB),
    spec.format.toUpperCase(),
  ];
  return parts.filter(Boolean).join(' · ');
}

/** Round to 2 decimals for cm display. */
export function cm(n: number): string {
  return String(Math.round(n * 100) / 100);
}
