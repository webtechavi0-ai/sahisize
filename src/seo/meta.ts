/**
 * Title and description templates (SPEC 9.2, revised for search length limits). Pure
 * functions, unit-tested in tests/unit/seo/meta.test.ts and tests/unit/seo/titles.test.ts.
 * Every page builds its <title>/<meta description> through these (or passes literal
 * strings for one-off pages).
 *
 * Titles are spec-first and at most TITLE_MAX characters (Google truncates beyond ~60).
 * When a title is too long, `fitTitle` drops the brand first, then tries shorter
 * variants (shorter document label, exam name without its bracketed part).
 * Descriptions are DESC_MIN–DESC_MAX characters.
 */
import { SITE_NAME } from '@/config/site';
import type { ExamPreset, PresetDocument } from '@/content/presets/schema';
import { examSeo } from './exam-seo';
import { docPhrase, formatDate, kbText, lowerLabel, pxText, physicalText } from './spec-text';

type Lang = 'en' | 'hi';

export interface PageMeta {
  title: string;
  description: string;
}

export const TITLE_MAX = 60;
export const DESC_MIN = 120;
export const DESC_MAX = 155;

/** Length as a reader sees it (code points, so Devanagari is not double-counted). */
export function textLength(s: string): number {
  return [...s].length;
}

/** Descriptions are cut at a word boundary to <= DESC_MAX chars. */
export function clampDescription(s: string, max = DESC_MAX): string {
  const clean = s.replace(/\s+/g, ' ').trim();
  if (textLength(clean) <= max) return clean;
  const cut = [...clean].slice(0, max - 1).join('');
  const sp = cut.lastIndexOf(' ');
  return `${(sp > 80 ? cut.slice(0, sp) : cut).replace(/[\s,;:–—-]+$/, '')}…`;
}

/**
 * Build a description from a required lead and optional extra sentences: extras are
 * added in order while the text stays <= max, so short leads reach the minimum.
 */
export function fitDescription(lead: string, extras: readonly string[], max = DESC_MAX): string {
  let out = lead.replace(/\s+/g, ' ').trim();
  if (textLength(out) > max) return clampDescription(out, max);
  for (const e of extras) {
    const next = `${out} ${e}`.trim();
    if (textLength(next) <= max) out = next;
  }
  return out;
}

/**
 * First candidate that fits: candidates[0] with the brand, then each candidate without it.
 * Falls back to a word-boundary cut of the last candidate (never expected in practice).
 */
export function fitTitle(candidates: readonly string[], max = TITLE_MAX): string {
  const list = candidates.map((c) => c.replace(/\s+/g, ' ').trim()).filter(Boolean);
  const branded = `${list[0]} | ${SITE_NAME}`;
  if (textLength(branded) <= max) return branded;
  for (const c of list) if (textLength(c) <= max) return c;
  const last = [...list[list.length - 1]!].slice(0, max).join('');
  return last.slice(0, last.lastIndexOf(' ')).replace(/[\s,;:–—|-]+$/, '');
}

/** Exam name without its bracketed part: "IBPS RRB PO (Officer Scale I)" -> "IBPS RRB PO". */
export function shortExamName(name: string): string {
  return name.replace(/\s*\([^)]*\)\s*/g, ' ').replace(/\s+/g, ' ').trim();
}

/** Title-style document labels (full, short), by English preset label. */
const TITLE_LABELS: Record<string, [string, string]> = {
  Photograph: ['Photo', 'Photo'],
  'Photograph (postcard size)': ['Postcard Photo', 'Photo'],
  'Photograph with name and date': ['Photo with Name & Date', 'Photo'],
  'Photograph with signature below (composite)': ['Photo with Signature', 'Photo'],
  Signature: ['Signature', 'Signature'],
  'Signature (English)': ['English Signature', 'English Sign'],
  'Signature (Hindi)': ['Hindi Signature', 'Hindi Sign'],
  'Signature (three times)': ['Signature (3 Times)', 'Signature'],
  "Parent's / guardian's signature": ['Parent Signature', 'Parent Sign'],
  'Left thumb impression': ['Left Thumb Impression', 'Left Thumb'],
  'Right thumb impression': ['Right Thumb Impression', 'Right Thumb'],
  'Thumb impression': ['Thumb Impression', 'Thumb'],
  'Finger and thumb impressions (both hands)': ['Finger & Thumb Impressions', 'Fingerprints'],
  'Handwritten declaration': ['Handwritten Declaration', 'Declaration'],
  'Class 10 (SSC/SSLC) certificate': ['10th Certificate', '10th Certificate'],
  'Class 10 certificate': ['10th Certificate', '10th Certificate'],
  'Class 10 certificate / marksheet': ['10th Certificate', '10th Certificate'],
  'Class 10 marksheet': ['10th Marksheet', '10th Marksheet'],
  'Disability / UDID certificate': ['PwD Certificate', 'PwD Certificate'],
  'Category certificate': ['Category Certificate', 'Category Certificate'],
  'Result-awaited attestation form': ['Result-Awaited Form', 'Result Form'],
  'SC/ST certificate (free travel pass)': ['SC/ST Certificate', 'SC/ST Certificate'],
  'Photo ID card': ['Photo ID', 'Photo ID'],
  'Identity proof': ['ID Proof', 'ID Proof'],
  'Address proof': ['Address Proof', 'Address'],
  'Address proof (present and permanent)': ['Address Proof', 'Address'],
  'Aadhaar card': ['Aadhaar Card', 'Aadhaar'],
};

/** [full, short] English title label for a document. */
export function titleLabels(d: Pick<PresetDocument, 'label'>): [string, string] {
  const known = TITLE_LABELS[d.label.en];
  if (known) return known;
  const full = d.label.en.replace(/^Photograph\b/, 'Photo');
  return [full, shortExamName(full)];
}

type ExamLike = Pick<ExamPreset, 'name' | 'cycle' | 'documents' | 'photoUploadReplacedByLive'> &
  Partial<Pick<ExamPreset, 'slug' | 'body' | 'lastChecked'>>;

/** Documents named in an exam title. Live-photo exams (SSC/RRB) still get "Photo": the page covers it. */
function titleDocs(p: ExamLike): Pick<PresetDocument, 'doc'>[] {
  return p.photoUploadReplacedByLive ? [{ doc: 'photo' }, ...p.documents] : p.documents;
}

/**
 * Exam: `{Exam} {Photo, Signature & Thumb} Size {Cycle} | SahiSize`, spec-first.
 * Per-exam keyword titles (src/seo/exam-seo.ts) win for English.
 * Hindi: `{Exam} {फोटो, सिग्नेचर और अंगूठा} साइज़ {Cycle} | SahiSize`.
 */
export function examTitle(p: ExamLike, lang: Lang = 'en'): string {
  const docs = titleDocs(p);
  const noThumb = docs.filter((d) => d.doc !== 'thumb');
  const names = [p.name[lang], shortExamName(p.name[lang])];
  const size = lang === 'hi' ? 'साइज़' : 'Size';
  const seo = lang === 'en' && p.slug ? examSeo(p.slug) : undefined;
  const generic = names.flatMap((n) => [
    `${n} ${docPhrase(docs, lang)} ${size} ${p.cycle}`,
    `${n} ${docPhrase(noThumb, lang)} ${size} ${p.cycle}`,
    `${n} ${docPhrase(noThumb, lang)} ${size}`,
  ]);
  return fitTitle(seo?.title ? [seo.title, ...generic] : generic);
}

/** H1 (SPEC 6.3): "IBPS PO 2026 Photo, Signature & Thumb Size — Resize Free". */
export function examH1(p: ExamLike, lang: Lang = 'en'): string {
  if (lang === 'hi') return `${p.name.hi} ${p.cycle} ${docPhrase(p.documents, 'hi')} साइज़ — फ्री में सही करें`;
  const seo = p.slug ? examSeo(p.slug) : undefined;
  if (seo?.h1) return seo.h1;
  return `${p.name.en} ${p.cycle} ${docPhrase(p.documents)} Size — Resize Free`;
}

function firstDoc(p: ExamLike, type: PresetDocument['doc']) {
  return p.documents.find((d) => d.doc === type && d.maxKB !== null && !d.toVerify);
}

export function examDescription(p: ExamLike, lang: Lang = 'en'): string {
  const photo = firstDoc(p, 'photo');
  const sign = firstDoc(p, 'signature');
  const thumb = firstDoc(p, 'thumb');
  const bits: string[] = [];
  const checked = p.lastChecked ? formatDate(p.lastChecked, lang) : null;
  if (lang === 'hi') {
    if (photo) bits.push(`फोटो ${[pxText(photo, 'hi'), kbText(photo, 'hi')].filter(Boolean).join(', ')}`);
    if (sign) bits.push(`सिग्नेचर ${[pxText(sign, 'hi'), kbText(sign, 'hi')].filter(Boolean).join(', ')}`);
    const extras = [
      p.photoUploadReplacedByLive ? 'फोटो फॉर्म में लाइव ली जाती है।' : '',
      'फ्री में सही साइज़ करें, फाइल आपके फोन में ही रहती है।',
      checked ? `नोटिस ${checked} को जाँचा गया।` : '',
    ].filter(Boolean);
    return fitDescription(`${p.name.hi} ${p.cycle}: ${bits.join('; ')}।`, extras);
  }
  if (photo) bits.push(`photo ${[pxText(photo), kbText(photo)].filter(Boolean).join(', ')}`);
  if (sign) bits.push(`signature ${[pxText(sign), kbText(sign)].filter(Boolean).join(', ')}`);
  const seo = p.slug ? examSeo(p.slug) : undefined;
  if (seo?.description) return clampDescription(seo.description);
  const extras = [
    p.photoUploadReplacedByLive ? 'Photo is captured live in the form.' : '',
    'Resize free to the exact size.',
    'Nothing is uploaded.',
    thumb ? `Thumb ${kbText(thumb)}.` : '',
    checked ? `Checked ${checked}.` : '',
    'Works on your phone.',
  ].filter(Boolean);
  return fitDescription(`${p.name.en} ${p.cycle} sizes: ${bits.join('; ')}.`, extras);
}

export function examMeta(p: ExamLike, lang: Lang = 'en'): PageMeta {
  return { title: examTitle(p, lang), description: examDescription(p, lang) };
}

/** "140×60 px" / "3.5×4.5 cm" / null, and the KB text, for a document; null for toVerify sizes. */
function docSpecParts(d: PresetDocument, lang: Lang): { dims: string | null; kb: string | null } {
  if (d.toVerify) return { dims: null, kb: null };
  return { dims: pxText(d, lang) ?? physicalText(d), kb: kbText(d, lang) };
}

/**
 * Exam document: `{Exam} {Document} Size: {px}, {min}–{max} KB`, e.g.
 * "IBPS PO Signature Size: 140×60 px, 10–20 KB". Brand only when it fits; then the
 * label is shortened, the pixels dropped, and the exam name shortened.
 * toVerify documents never state a size in the title (Q28 content rule).
 */
export function examDocTitle(p: ExamLike, d: PresetDocument, lang: Lang = 'en'): string {
  const { dims, kb } = docSpecParts(d, lang);
  const spec = [dims, kb].filter(Boolean).join(', ');
  if (lang === 'hi') {
    const names = [p.name.hi, shortExamName(p.name.hi)];
    return fitTitle(
      names.flatMap((n) => [
        `${n} ${d.label.hi} साइज़${spec ? `: ${spec}` : ''}`,
        `${n} ${d.label.hi} साइज़${kb ? `: ${kb}` : ''}`,
        `${n} ${d.label.hi} साइज़`,
      ]),
    );
  }
  const [full, short] = titleLabels(d);
  const tail = (x: string | null) => (x ? `: ${x}` : d.toVerify ? ' (to verify)' : '');
  const names = [p.name.en, shortExamName(p.name.en)];
  // Keep the pixels as long as possible: shorter label, then the bracketed part of the
  // exam name goes, and only then the pixels.
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
  ].filter(Boolean));
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
      160,
    );
  return clampDescription(
    `Reduce a photo or signature to under ${n} KB. The result lands between ${Math.round(n * 0.9)} and ${n} KB, processed on your device, never uploaded.`,
    160,
  );
}

export function compressMeta(n: number, lang: Lang = 'en'): PageMeta {
  return { title: compressTitle(n, lang), description: compressDescription(n, lang) };
}

/** Generic "X | SahiSize" title, unless it already ends with the site name. */
export function withSiteName(title: string): string {
  return title.endsWith(SITE_NAME) ? title : `${title} | ${SITE_NAME}`;
}
