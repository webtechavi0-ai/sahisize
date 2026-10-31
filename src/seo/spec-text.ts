/**
 * Plain-text descriptions of preset document sizes, shared by meta templates,
 * the spec table, JSON-LD and OG images. Pure functions (unit-tested).
 */
import type { PresetDocument } from '@/content/presets/schema';

type Lang = 'en' | 'hi';

type DocDims = Pick<
  PresetDocument,
  'widthPx' | 'heightPx' | 'minWidthPx' | 'maxWidthPx' | 'minHeightPx' | 'maxHeightPx'
>;

/** Format a number without trailing ".0" (3.5 -> "3.5", 6 -> "6"). */
export function num(n: number): string {
  return Number.isInteger(n) ? String(n) : String(Math.round(n * 100) / 100);
}

/** "200×230 px", "350–500 × 350–500 px", "min 140×60 px", or null when KB-only. */
export function pxText(d: DocDims, lang: Lang = 'en'): string | null {
  if (d.widthPx !== null && d.heightPx !== null) return `${d.widthPx}×${d.heightPx} px`;
  const { minWidthPx: minW, maxWidthPx: maxW, minHeightPx: minH, maxHeightPx: maxH } = d;
  if (minW === undefined && maxW === undefined && minH === undefined && maxH === undefined)
    return null;
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
  if (d.minKB === null || d.minKB === 0)
    return lang === 'hi' ? `अधिकतम ${num(d.maxKB)} KB` : `up to ${num(d.maxKB)} KB`;
  return `${num(d.minKB)}–${num(d.maxKB)} KB`;
}

/** Compact one-line rule summary: "200×230 px · 20–50 KB · JPG". */
export function docSummary(d: PresetDocument, lang: Lang = 'en'): string {
  const parts = [
    pxText(d, lang) ?? physicalText(d),
    kbText(d, lang) ?? (lang === 'hi' ? 'साइज़ जाँच में' : 'size to verify'),
    d.format.toUpperCase(),
  ].filter(Boolean);
  return parts.join(' · ');
}

/**
 * Like docSummary, but a toVerify document never shows its numbers (Q28 content rule):
 * "size to verify · JPG". For copy that compares exams.
 */
export function verifiedSummary(
  d: PresetDocument & { toVerify?: boolean },
  lang: Lang = 'en',
): string {
  if (!d.toVerify) return docSummary(d, lang);
  return [lang === 'hi' ? 'साइज़ जाँच में' : 'size to verify', d.format.toUpperCase()].join(' · ');
}

/** Label for use mid-sentence: lower case, keeping acronyms ("SC/ST certificate", "PwD"). */
export function lowerLabel(label: string): string {
  return label
    .split(' ')
    .map((w) =>
      /[A-Z].*[A-Z]|\d|English|Hindi|Aadhaar/.test(w.replace(/^\(/, '')) ? w : w.toLowerCase(),
    )
    .join(' ');
}

const DOC_PHRASE_ORDER = ['photo', 'signature', 'thumb'] as const;
const DOC_PHRASE_EN: Record<(typeof DOC_PHRASE_ORDER)[number], string> = {
  photo: 'Photo',
  signature: 'Signature',
  thumb: 'Thumb',
};
const DOC_PHRASE_HI: Record<(typeof DOC_PHRASE_ORDER)[number], string> = {
  photo: 'फोटो',
  signature: 'सिग्नेचर',
  thumb: 'अंगूठा',
};

/**
 * "Photo, Signature & Thumb" from the documents actually present (SPEC 9.2 uses the
 * full phrase; exams without an uploaded photo, like SSC, get an honest shorter one).
 */
export function docPhrase(docs: readonly Pick<PresetDocument, 'doc'>[], lang: Lang = 'en'): string {
  const map = lang === 'hi' ? DOC_PHRASE_HI : DOC_PHRASE_EN;
  const have = DOC_PHRASE_ORDER.filter((k) => docs.some((d) => d.doc === k)).map((k) => map[k]);
  if (have.length === 0) return lang === 'hi' ? 'डॉक्यूमेंट' : 'Document';
  if (have.length === 1) return have[0]!;
  const joiner = lang === 'hi' ? ' और ' : ' & ';
  return `${have.slice(0, -1).join(', ')}${joiner}${have[have.length - 1]}`;
}

/** Format an ISO date "2026-10-12" as "12 Oct 2026" (en) or "12 अक्टूबर 2026" (hi). */
export function formatDate(iso: string, lang: Lang = 'en'): string {
  const [y, m, d] = iso.split('-').map(Number) as [number, number, number];
  const en = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const hi = [
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
  return `${d} ${(lang === 'hi' ? hi : en)[m - 1]} ${y}`;
}
