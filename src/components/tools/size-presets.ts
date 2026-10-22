/**
 * Preset sizes for the T2 resize SEO pages (keyword map: photo-3-5x4-5-cm, passport-size-photo,
 * postcard-size-photo, stamp-size-photo, resize-image-in-cm/mm). Build-time data passed to
 * ToolResize as `initial` + `sizes`. Pixel counts come from toPx(), so labels and output agree.
 */
import type { Lang } from '@/config/site';
import { toPx, type SizeUnit } from './logic';
import type { ResizeSizeOption } from '@/islands/tools/ToolResize';

export type SizePresetPage =
  | 'photo-3-5x4-5-cm'
  | 'resize-image-in-cm'
  | 'resize-image-in-mm'
  | 'passport-size-photo'
  | 'postcard-size-photo'
  | 'stamp-size-photo';

export interface SizePreset {
  initial: { unit: SizeUnit; w?: number; h?: number; dpi?: number; maxKB?: number | null };
  sizes?: ResizeSizeOption[];
  sizesLabel?: string;
}

const UNIT_TEXT: Record<Lang, Record<Exclude<SizeUnit, 'px'>, string>> = {
  en: { cm: 'cm', mm: 'mm', in: 'in' },
  hi: { cm: 'cm', mm: 'mm', in: 'इंच' },
};

/** "276×354 px" for a physical size at `dpi`. */
export function pxLabel(w: number, h: number, unit: SizeUnit, dpi: number): string {
  return `${toPx(w, unit, dpi)}×${toPx(h, unit, dpi)} px`;
}

function opt(
  lang: Lang,
  id: string,
  w: number,
  h: number,
  unit: Exclude<SizeUnit, 'px'>,
  dpi: number,
  withSize: boolean,
): ResizeSizeOption {
  const size = `${w}×${h} ${UNIT_TEXT[lang][unit]}, `;
  return { id, w, h, unit, dpi, label: `${withSize ? size : ''}${dpi} DPI (${pxLabel(w, h, unit, dpi)})` };
}

export function sizePreset(page: SizePresetPage, lang: Lang = 'en'): SizePreset {
  const hi = lang === 'hi';
  switch (page) {
    case 'photo-3-5x4-5-cm':
      return {
        initial: { unit: 'cm', w: 3.5, h: 4.5, dpi: 200 },
        sizesLabel: hi ? 'प्रिंट रेज़ोल्यूशन' : 'Print resolution',
        sizes: [opt(lang, 'd200', 3.5, 4.5, 'cm', 200, false), opt(lang, 'd300', 3.5, 4.5, 'cm', 300, false)],
      };
    case 'passport-size-photo':
      return {
        initial: { unit: 'cm', w: 3.5, h: 4.5, dpi: 200 },
        sizesLabel: hi ? 'फोटो साइज़' : 'Photo size',
        sizes: [
          opt(lang, 'f200', 3.5, 4.5, 'cm', 200, true),
          opt(lang, 'f300', 3.5, 4.5, 'cm', 300, true),
          opt(lang, 's200', 51, 51, 'mm', 200, true),
          opt(lang, 's300', 51, 51, 'mm', 300, true),
        ],
      };
    case 'postcard-size-photo':
      return {
        initial: { unit: 'in', w: 4, h: 6, dpi: 200 },
        sizesLabel: 'Postcard size',
        sizes: [opt(lang, 'p200', 4, 6, 'in', 200, true), opt(lang, 'p300', 4, 6, 'in', 300, true)],
      };
    case 'stamp-size-photo':
      return {
        initial: { unit: 'cm', w: 2, h: 2.5, dpi: 200 },
        sizesLabel: 'Stamp size',
        sizes: [opt(lang, 't200', 2, 2.5, 'cm', 200, true), opt(lang, 't300', 2, 2.5, 'cm', 300, true)],
      };
    case 'resize-image-in-cm':
      return { initial: { unit: 'cm' } };
    case 'resize-image-in-mm':
      return { initial: { unit: 'mm' } };
  }
}
