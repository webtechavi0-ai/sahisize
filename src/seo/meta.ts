/**
 * Title and description templates (SPEC 9.2). Pure functions, unit-tested in
 * tests/unit/seo/meta.test.ts. Every page builds its <title>/<meta description>
 * through these (or passes literal strings for one-off pages).
 */
import { SITE_NAME } from '@/config/site';
import type { ExamPreset, PresetDocument } from '@/content/presets/schema';
import { docPhrase, kbText, pxText, physicalText } from './spec-text';

type Lang = 'en' | 'hi';

export interface PageMeta {
  title: string;
  description: string;
}

/** Descriptions are cut at a word boundary to <= 160 chars. */
export function clampDescription(s: string, max = 160): string {
  const clean = s.replace(/\s+/g, ' ').trim();
  if (clean.length <= max) return clean;
  const cut = clean.slice(0, max - 1);
  const sp = cut.lastIndexOf(' ');
  return `${(sp > 80 ? cut.slice(0, sp) : cut).replace(/[\s,;:–—-]+$/, '')}…`;
}

type ExamLike = Pick<ExamPreset, 'name' | 'cycle' | 'documents' | 'photoUploadReplacedByLive'>;

/**
 * Exam: `{Exam} {Cycle} Photo, Signature & Thumb Size — Resize Free in 1 Click | SahiSize`
 * Hindi: `{Exam} फोटो और सिग्नेचर साइज़ {Cycle} — फ्री में सही साइज़ करें`
 * The document phrase lists only the documents the exam actually has.
 */
export function examTitle(p: ExamLike, lang: Lang = 'en'): string {
  if (lang === 'hi') {
    return `${p.name.hi} ${docPhrase(p.documents, 'hi')} साइज़ ${p.cycle} — फ्री में सही साइज़ करें`;
  }
  return `${p.name.en} ${p.cycle} ${docPhrase(p.documents)} Size — Resize Free in 1 Click | ${SITE_NAME}`;
}

/** H1 (SPEC 6.3): "IBPS PO 2026 Photo, Signature & Thumb Size — Resize Free". */
export function examH1(p: ExamLike, lang: Lang = 'en'): string {
  if (lang === 'hi') return `${p.name.hi} ${p.cycle} ${docPhrase(p.documents, 'hi')} साइज़ — फ्री में सही करें`;
  return `${p.name.en} ${p.cycle} ${docPhrase(p.documents)} Size — Resize Free`;
}

function firstDoc(p: ExamLike, type: PresetDocument['doc']) {
  return p.documents.find((d) => d.doc === type && d.maxKB !== null);
}

export function examDescription(p: ExamLike, lang: Lang = 'en'): string {
  const photo = firstDoc(p, 'photo');
  const sign = firstDoc(p, 'signature');
  const bits: string[] = [];
  if (lang === 'hi') {
    if (photo) bits.push(`फोटो ${[pxText(photo, 'hi'), kbText(photo, 'hi')].filter(Boolean).join(', ')}`);
    if (sign) bits.push(`सिग्नेचर ${[pxText(sign, 'hi'), kbText(sign, 'hi')].filter(Boolean).join(', ')}`);
    const live = p.photoUploadReplacedByLive ? ' फोटो फॉर्म में लाइव ली जाती है।' : '';
    return clampDescription(
      `${p.name.hi} ${p.cycle}: ${bits.join('; ')}.${live} फ्री में सही साइज़ करें, फाइल आपके फोन में ही रहती है।`,
    );
  }
  if (photo) bits.push(`photo ${[pxText(photo), kbText(photo)].filter(Boolean).join(', ')}`);
  if (sign) bits.push(`signature ${[pxText(sign), kbText(sign)].filter(Boolean).join(', ')}`);
  const live = p.photoUploadReplacedByLive ? ' Photo is captured live in the form.' : '';
  return clampDescription(
    `${p.name.en} ${p.cycle} sizes: ${bits.join('; ')}.${live} Resize free to the exact size. Nothing is uploaded.`,
  );
}

export function examMeta(p: ExamLike, lang: Lang = 'en'): PageMeta {
  return { title: examTitle(p, lang), description: examDescription(p, lang) };
}

/**
 * Exam document: `{Exam} {Document} Size {Cycle}: {px}, {min}–{max} KB — Resize Free`
 * Without pixels the px part falls back to the physical size, then is omitted.
 */
export function examDocTitle(p: ExamLike, d: PresetDocument, lang: Lang = 'en'): string {
  const dims = pxText(d, lang) ?? physicalText(d);
  const kb = kbText(d, lang);
  const spec = [dims, kb].filter(Boolean).join(', ');
  if (lang === 'hi') {
    return `${p.name.hi} ${d.label.hi} साइज़ ${p.cycle}${spec ? `: ${spec}` : ''} — फ्री में सही साइज़ करें`;
  }
  return `${p.name.en} ${d.label.en} Size ${p.cycle}${spec ? `: ${spec}` : ''} — Resize Free`;
}

export function examDocDescription(p: ExamLike, d: PresetDocument, lang: Lang = 'en'): string {
  const dims = pxText(d, lang) ?? physicalText(d);
  const kb = kbText(d, lang);
  const rule = d.rules[0]?.[lang];
  if (lang === 'hi') {
    return clampDescription(
      `${p.name.hi} ${d.label.hi}: ${[dims, kb, d.format.toUpperCase()].filter(Boolean).join(', ')}.${rule ? ` ${rule}।` : ''} एक क्लिक में सही साइज़, कोई अपलोड नहीं।`,
    );
  }
  return clampDescription(
    `${p.name.en} ${p.cycle} ${d.label.en.toLowerCase()} size: ${[dims, kb, d.format.toUpperCase()].filter(Boolean).join(', ')}.${rule ? ` ${rule}.` : ''} Resize free in one click. Nothing is uploaded.`,
  );
}

export function examDocMeta(p: ExamLike, d: PresetDocument, lang: Lang = 'en'): PageMeta {
  return { title: examDocTitle(p, d, lang), description: examDocDescription(p, d, lang) };
}

/** Compress: `Compress Photo to {n} KB Online Free — Exact Size, No Upload` */
export function compressTitle(n: number, lang: Lang = 'en'): string {
  if (lang === 'hi') return `फोटो को ${n} KB में कम करें — फ्री, सही साइज़, कोई अपलोड नहीं`;
  return `Compress Photo to ${n} KB Online Free — Exact Size, No Upload`;
}

export function compressDescription(n: number, lang: Lang = 'en'): string {
  if (lang === 'hi')
    return clampDescription(
      `फोटो या सिग्नेचर को ${n} KB से कम करें। रिज़ल्ट ${Math.round(n * 0.9)}–${n} KB के बीच, फाइल आपके फोन में ही रहती है।`,
    );
  return clampDescription(
    `Reduce a photo or signature to under ${n} KB. The result lands between ${Math.round(n * 0.9)} and ${n} KB, processed on your device, never uploaded.`,
  );
}

export function compressMeta(n: number, lang: Lang = 'en'): PageMeta {
  return { title: compressTitle(n, lang), description: compressDescription(n, lang) };
}

/** Generic "X | SahiSize" title, unless it already ends with the site name. */
export function withSiteName(title: string): string {
  return title.endsWith(SITE_NAME) ? title : `${title} | ${SITE_NAME}`;
}
