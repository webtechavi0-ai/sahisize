/**
 * Display helpers for KB, px and cm. Pure and client-safe. 1 KB = 1024 bytes.
 * Functions that produce words take a translator (`T`) with the `common` namespace
 * available under full keys ("common.units.kbRange").
 */
import { KB } from '@/config/exams';
import type { Lang } from '@/i18n/config';
import type { DocSpecData, LocalizedText } from './presets/types';

export type T = (key: string, vars?: Record<string, string | number>) => string;

/** Pick the language of a bilingual field; falls back to English. */
export function loc(text: LocalizedText | { en: string; hi?: string } | undefined, lang: Lang): string {
  if (!text) return '';
  return lang === 'hi' && text.hi ? text.hi : text.en;
}

/** "3.5" / "6": number without trailing ".0", at most 2 decimals. */
export function num(n: number): string {
  return Number.isInteger(n) ? String(n) : String(Math.round(n * 100) / 100);
}

/** 1 decimal under 100 KB, whole numbers above: "34.2", "250". */
export function kbNumber(bytes: number): string {
  const kb = bytes / KB;
  if (kb < 100) return (Math.round(kb * 10) / 10).toFixed(1).replace(/\.0$/, '');
  return String(Math.round(kb));
}

/** "34.2 KB", or MB at 1024 KB and above ("1.4 MB"). */
export function formatKB(bytes: number): string {
  if (bytes >= 1024 * KB) return `${(bytes / (1024 * KB)).toFixed(1)} MB`;
  return `${kbNumber(bytes)} KB`;
}

/** "1.4" (MB, 1 decimal). */
export function formatMB(bytes: number): string {
  return (bytes / (1024 * 1024)).toFixed(1);
}

/** "20–50 KB", "up to 50 KB", or "Size to verify". */
export function kbRangeText(t: T, minKB: number | null, maxKB: number | null): string {
  if (maxKB === null) return t('common.status.toVerify');
  if (minKB !== null && minKB > 0) return t('common.units.kbRange', { min: minKB, max: maxKB });
  return t('common.units.kbMax', { max: maxKB });
}

export function pxText(t: T, w: number, h: number): string {
  return t('common.units.px', { w, h });
}

export type PixelMode = 'fixed' | 'range' | 'kb-only';

/** Fixed pixels, a min/max range, or KB-only. */
export function pixelMode(spec: Pick<DocSpecData, 'widthPx' | 'heightPx' | 'minWidthPx' | 'maxWidthPx' | 'minHeightPx' | 'maxHeightPx'>): PixelMode {
  if (spec.widthPx !== null && spec.heightPx !== null) return 'fixed';
  const ranged =
    spec.minWidthPx !== undefined ||
    spec.maxWidthPx !== undefined ||
    spec.minHeightPx !== undefined ||
    spec.maxHeightPx !== undefined;
  return ranged ? 'range' : 'kb-only';
}

function rangePart(min?: number, max?: number): string {
  if (min !== undefined && max !== undefined) return min === max ? `${min}` : `${min}–${max}`;
  if (min !== undefined) return `≥${min}`;
  if (max !== undefined) return `≤${max}`;
  return 'any';
}

/** Pixel rule: "200×230 px", "140–200×60–90 px", or '' for KB-only. */
export function dimsRuleText(t: T, spec: DocSpecData): string {
  const mode = pixelMode(spec);
  if (mode === 'fixed') return pxText(t, spec.widthPx!, spec.heightPx!);
  if (mode === 'range')
    return `${rangePart(spec.minWidthPx, spec.maxWidthPx)}×${rangePart(spec.minHeightPx, spec.maxHeightPx)} px`;
  return '';
}

/** One-line rule summary for a document card: "200×230 px · 20–50 KB · JPG". */
export function ruleSummary(t: T, spec: DocSpecData): string {
  return [dimsRuleText(t, spec), kbRangeText(t, spec.minKB, spec.maxKB), spec.format.toUpperCase()]
    .filter(Boolean)
    .join(' · ');
}

/** Round to 2 decimals for cm display. */
export function cm(n: number): string {
  return String(Math.round(n * 100) / 100);
}

const PER_INCH = { cm: 2.54, mm: 25.4, in: 1 } as const;

/** Physical length (or px) -> px at `dpi`, at least 1; 0 for invalid input. */
export function toPx(value: number, unit: 'px' | 'cm' | 'mm' | 'in', dpi: number): number {
  if (!Number.isFinite(value) || value <= 0) return 0;
  const px = unit === 'px' ? value : (value / PER_INCH[unit]) * dpi;
  return Math.max(1, Math.round(px));
}

/** "276×354 px" for a physical size at `dpi`. */
export function pxLabel(w: number, h: number, unit: 'px' | 'cm' | 'mm' | 'in', dpi: number): string {
  return `${toPx(w, unit, dpi)}×${toPx(h, unit, dpi)} px`;
}

const MONTHS_EN = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const MONTHS_HI = [
  'जनवरी',
  'फ़रवरी',
  'मार्च',
  'अप्रैल',
  'मई',
  'जून',
  'जुलाई',
  'अगस्त',
  'सितंबर',
  'अक्टूबर',
  'नवंबर',
  'दिसंबर',
];

/** ISO date "2026-10-12" (or full ISO timestamp) -> "12 Oct 2026" / "12 अक्टूबर 2026". */
export function formatDate(iso: string, lang: Lang = 'en'): string {
  const [y, m, d] = iso.slice(0, 10).split('-').map(Number) as [number, number, number];
  return `${d} ${(lang === 'hi' ? MONTHS_HI : MONTHS_EN)[m - 1]} ${y}`;
}
