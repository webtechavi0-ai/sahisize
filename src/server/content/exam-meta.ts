import 'server-only';
/**
 * Titles, H1s and descriptions for exam, exam-document and compress pages. Spec-first,
 * <= 60-char titles (brand dropped first, then shorter variants); 120–155-char descriptions.
 * Per-exam keyword copy (src/content/seo/exam-seo.json) wins for English.
 * toVerify documents never state a size.
 */
import { SITE_NAME } from '@/config/site';
import type { Lang } from '@/i18n/config';
import type { ExamPreset, PresetDocument } from '@/lib/presets';
import { docPhrase, formatDate, kbText, lowerLabel, physicalText, pxText } from '@/seo/spec-text';
import { clampDescription, fitDescription, fitTitle, shortExamName } from '@/seo/text';
import { content } from './registry';
import type { ExamSeo } from './schemas/site-data';

export type { ExamSeo } from './schemas/site-data';

export interface PageMeta {
  title: string;
  description: string;
}

/** Per-exam English keyword copy (title/h1/intro/H2s/extra FAQs), if any. */
export function examSeo(slug: string): ExamSeo | undefined {
  return content().examSeo[slug];
}

/** Short Latin-script exam name for Hindi titles ("IBPS PO", "UPSC CSE"). */
export function latinTitleName(p: Pick<ExamPreset, 'slug' | 'name'>): string {
  return content().examTitleNames[p.slug] ?? shortExamName(p.name.en);
}

/** [full, short] English title label for a document ("Signature (Hindi)" -> "Hindi Signature"). */
export function titleLabels(d: Pick<PresetDocument, 'label'>): [string, string] {
  const known = content().docTitleLabels[d.label.en];
  if (known) return [known.full, known.short];
  const full = d.label.en.replace(/^Photograph\b/, 'Photo');
  return [full, shortExamName(full)];
}

type ExamLike = Pick<ExamPreset, 'slug' | 'name' | 'cycle' | 'documents' | 'photoUploadReplacedByLive' | 'lastChecked'>;

function titleNames(p: ExamLike, lang: Lang): string[] {
  if (lang === 'hi') return [latinTitleName(p)];
  return [p.name.en, shortExamName(p.name.en)];
}

/** Documents named in an exam title. Live-photo exams still get "Photo": the page covers it. */
function titleDocs(p: ExamLike): Pick<PresetDocument, 'doc'>[] {
  return p.photoUploadReplacedByLive ? [{ doc: 'photo' }, ...p.documents] : p.documents;
}

/** "{Exam} {Photo, Signature & Thumb} Size {Cycle} | SahiSize" (Hindi: "… साइज़ …"). */
export function examTitle(p: ExamLike, lang: Lang = 'en'): string {
  const docs = titleDocs(p);
  const noThumb = docs.filter((d) => d.doc !== 'thumb');
  const size = lang === 'hi' ? 'साइज़' : 'Size';
  const seo = lang === 'en' ? examSeo(p.slug) : undefined;
  const generic = titleNames(p, lang).flatMap((n) => [
    `${n} ${docPhrase(docs, lang)} ${size} ${p.cycle}`,
    `${n} ${docPhrase(noThumb, lang)} ${size} ${p.cycle}`,
    `${n} ${docPhrase(noThumb, lang)} ${size}`,
  ]);
  return fitTitle(seo?.title ? [seo.title, ...generic] : generic);
}

/** H1: "IBPS PO 2026 Photo, Signature & Thumb Size — Resize Free". */
export function examH1(p: ExamLike, lang: Lang = 'en'): string {
  if (lang === 'hi') return `${p.name.hi} ${p.cycle} ${docPhrase(p.documents, 'hi')} साइज़ — फ्री में सही करें`;
  return examSeo(p.slug)?.h1 ?? `${p.name.en} ${p.cycle} ${docPhrase(p.documents)} Size — Resize Free`;
}

function firstDoc(p: ExamLike, type: PresetDocument['doc']) {
  return p.documents.find((d) => d.doc === type && d.maxKB !== null && !d.toVerify);
}

export function examDescription(p: ExamLike, lang: Lang = 'en'): string {
  const photo = firstDoc(p, 'photo');
  const sign = firstDoc(p, 'signature');
  const thumb = firstDoc(p, 'thumb');
  const checked = p.lastChecked ? formatDate(p.lastChecked, lang) : null;
  const bits: string[] = [];
  if (lang === 'hi') {
    if (photo) bits.push(`फोटो ${[pxText(photo, 'hi'), kbText(photo, 'hi')].filter(Boolean).join(', ')}`);
    if (sign) bits.push(`सिग्नेचर ${[pxText(sign, 'hi'), kbText(sign, 'hi')].filter(Boolean).join(', ')}`);
    return fitDescription(`${p.name.hi} ${p.cycle}: ${bits.join('; ')}।`, [
      p.photoUploadReplacedByLive ? 'फोटो फॉर्म में लाइव ली जाती है।' : '',
      'फ्री में सही साइज़ करें, फाइल आपके फोन में ही रहती है।',
      checked ? `नोटिस ${checked} को जाँचा गया।` : '',
    ]);
  }
  const seo = examSeo(p.slug);
  if (seo?.description) return clampDescription(seo.description);
  if (photo) bits.push(`photo ${[pxText(photo), kbText(photo)].filter(Boolean).join(', ')}`);
  if (sign) bits.push(`signature ${[pxText(sign), kbText(sign)].filter(Boolean).join(', ')}`);
  return fitDescription(`${p.name.en} ${p.cycle} sizes: ${bits.join('; ')}.`, [
    p.photoUploadReplacedByLive ? 'Photo is captured live in the form.' : '',
    'Resize free to the exact size.',
    'Nothing is uploaded.',
    thumb ? `Thumb ${kbText(thumb)}.` : '',
    checked ? `Checked ${checked}.` : '',
    'Works on your phone.',
  ]);
}

export function examMeta(p: ExamLike, lang: Lang = 'en'): PageMeta {
  return { title: examTitle(p, lang), description: examDescription(p, lang) };
}

/** "140×60 px" / "3.5×4.5 cm" / null, plus the KB text; both null for toVerify sizes. */
function docSpecParts(d: PresetDocument, lang: Lang): { dims: string | null; kb: string | null } {
  if (d.toVerify) return { dims: null, kb: null };
  return { dims: pxText(d, lang) ?? physicalText(d), kb: kbText(d, lang) };
}

/** "{Exam} {Document} Size: {px}, {min}–{max} KB", e.g. "IBPS PO Signature Size: 140×60 px, 10–20 KB". */
export function examDocTitle(p: ExamLike, d: PresetDocument, lang: Lang = 'en'): string {
  const { dims, kb } = docSpecParts(d, lang);
  const spec = [dims, kb].filter(Boolean).join(', ');
  if (lang === 'hi') {
    return fitTitle(
      titleNames(p, 'hi').flatMap((n) => [
        `${n} ${d.label.hi} साइज़${spec ? `: ${spec}` : ''}`,
        `${n} ${d.label.hi} साइज़${kb ? `: ${kb}` : ''}`,
        `${n} ${d.label.hi} साइज़`,
      ]),
    );
  }
  const [full, short] = titleLabels(d);
  const tail = (x: string | null) => (x ? `: ${x}` : d.toVerify ? ' (to verify)' : '');
  const names = [p.name.en, shortExamName(p.name.en)];
  return fitTitle([
    ...names.flatMap((n) => [`${n} ${full} Size${tail(spec)}`, `${n} ${short} Size${tail(spec)}`]),
    ...names.flatMap((n) => [`${n} ${short} Size${tail(kb)}`, `${n} ${short} Size ${p.cycle}`]),
  ]);
}

export function examDocDescription(p: ExamLike, d: PresetDocument, lang: Lang = 'en'): string {
  const { dims, kb } = docSpecParts(d, lang);
  const rule = d.rules[0]?.[lang];
  const spec = [dims, kb, d.format.toUpperCase()].filter(Boolean).join(', ');
  if (lang === 'hi') {
    return fitDescription(`${p.name.hi} ${d.label.hi}: ${spec}।`, [
      rule ? `${rule}।` : '',
      'एक क्लिक में सही साइज़, कोई अपलोड नहीं।',
    ]);
  }
  const label = lowerLabel(d.label.en);
  if (d.toVerify) {
    return fitDescription(
      `${p.name.en} ${p.cycle} ${label}: the official size is not confirmed yet, so check the notice before you upload.`,
      [`Format: ${d.format.toUpperCase()}.`, 'Resize free on your phone. Nothing is uploaded.'],
    );
  }
  return fitDescription(`${p.name.en} ${p.cycle} ${label} size: ${spec}.`, [
    rule ? `${rule}.` : '',
    'Resize free in one click.',
    'Nothing is uploaded.',
    'Works on your phone.',
    p.lastChecked ? `Checked ${formatDate(p.lastChecked)}.` : '',
  ]);
}

export function examDocMeta(p: ExamLike, d: PresetDocument, lang: Lang = 'en'): PageMeta {
  return { title: examDocTitle(p, d, lang), description: examDocDescription(p, d, lang) };
}

/** "20 KB Photo Size: Compress Image to 20 KB | SahiSize" (Hindi: "20 KB फोटो साइज़: फोटो को 20 KB में करें | SahiSize"). */
export function compressTitle(n: number, lang: Lang = 'en', verb = 'Compress Image to'): string {
  if (lang === 'hi') return `${n} KB फोटो साइज़: फोटो को ${n} KB में करें | ${SITE_NAME}`;
  return `${n} KB Photo Size: ${verb} ${n} KB | ${SITE_NAME}`;
}
