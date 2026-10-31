/**
 * Plain-text descriptions of preset document sizes, shared by titles, spec tables,
 * JSON-LD and OG images. Pure.
 */
import type { Lang } from '@/i18n/config';
import { formatDate as formatDateText, num } from '@/lib/format';
import type { PresetDocument } from '@/lib/presets/types';

export { num } from '@/lib/format';

type DocDims = Pick<PresetDocument, 'widthPx' | 'heightPx' | 'minWidthPx' | 'maxWidthPx' | 'minHeightPx' | 'maxHeightPx'>;

/** "200×230 px", "350–500 × 350–500 px", "min 140×60 px", or null when KB-only. */
export function pxText(d: DocDims, lang: Lang = 'en'): string | null {
  if (d.widthPx !== null && d.heightPx !== null) return `${d.widthPx}×${d.heightPx} px`;
  const { minWidthPx: minW, maxWidthPx: maxW, minHeightPx: minH, maxHeightPx: maxH } = d;
  if (minW === undefined && maxW === undefined && minH === undefined && maxH === undefined) return null;
  const range = (a?: number, b?: number) =>
    a !== undefined && b !== undefined ? (a === b ? `${a}` : `${a}–${b}`) : `${a ?? b}`;
  if (maxW === undefined && maxH === undefined)
    return lang === 'hi' ? `कम से कम ${minW}×${minH} px` : `min ${minW}×${minH} px`;
  if (minW === undefined && minH === undefined)
    return lang === 'hi' ? `अधिकतम ${maxW}×${maxH} px` : `max ${maxW}×${maxH} px`;
  return `${range(minW, maxW)} × ${range(minH, maxH)} px`;
}

/** "3.5×4.5 cm" from `physical`, or null. */
export function physicalText(d: Pick<PresetDocument, 'physical'>): string | null {
  if (!d.physical) return null;
  return `${num(d.physical.width)}×${num(d.physical.height)} ${d.physical.unit}`;
}

/** "20–50 KB", "up to 40 KB", or null when the size is to verify. */
export function kbText(d: Pick<PresetDocument, 'minKB' | 'maxKB'>, lang: Lang = 'en'): string | null {
  if (d.maxKB === null) return null;
  if (d.minKB === null || d.minKB === 0) return lang === 'hi' ? `अधिकतम ${num(d.maxKB)} KB` : `up to ${num(d.maxKB)} KB`;
  return `${num(d.minKB)}–${num(d.maxKB)} KB`;
}

const TO_VERIFY: Record<Lang, string> = { en: 'size to verify', hi: 'साइज़ जाँच में' };

/** "200×230 px · 20–50 KB · JPG". */
export function docSummary(d: PresetDocument, lang: Lang = 'en'): string {
  return [pxText(d, lang) ?? physicalText(d), kbText(d, lang) ?? TO_VERIFY[lang], d.format.toUpperCase()]
    .filter(Boolean)
    .join(' · ');
}

/** Like docSummary, but a toVerify document never shows numbers: "size to verify · JPG". */
export function verifiedSummary(d: PresetDocument, lang: Lang = 'en'): string {
  if (!d.toVerify) return docSummary(d, lang);
  return [TO_VERIFY[lang], d.format.toUpperCase()].join(' · ');
}

/** Label for use mid-sentence: lower case, keeping acronyms ("SC/ST certificate", "PwD"). */
export function lowerLabel(label: string): string {
  return label
    .split(' ')
    .map((w) => (/[A-Z].*[A-Z]|\d|English|Hindi|Aadhaar/.test(w.replace(/^\(/, '')) ? w : w.toLowerCase()))
    .join(' ');
}

const DOC_PHRASE_ORDER = ['photo', 'signature', 'thumb'] as const;
const DOC_PHRASE: Record<Lang, Record<(typeof DOC_PHRASE_ORDER)[number], string>> = {
  en: { photo: 'Photo', signature: 'Signature', thumb: 'Thumb' },
  hi: { photo: 'फोटो', signature: 'सिग्नेचर', thumb: 'अंगूठा' },
};

/** "Photo, Signature & Thumb" from the documents actually present. */
export function docPhrase(docs: readonly Pick<PresetDocument, 'doc'>[], lang: Lang = 'en'): string {
  const map = DOC_PHRASE[lang];
  const have = DOC_PHRASE_ORDER.filter((k) => docs.some((d) => d.doc === k)).map((k) => map[k]);
  if (have.length === 0) return lang === 'hi' ? 'डॉक्यूमेंट' : 'Document';
  if (have.length === 1) return have[0]!;
  const joiner = lang === 'hi' ? ' और ' : ' & ';
  return `${have.slice(0, -1).join(', ')}${joiner}${have[have.length - 1]}`;
}

/** "12 Oct 2026" / "12 अक्टूबर 2026". */
export function formatDate(iso: string, lang: Lang = 'en'): string {
  return formatDateText(iso, lang);
}
