import 'server-only';
/**
 * Titles, H1s and descriptions for exam, exam-document and compress pages. Spec-first,
 * <= 60-char titles (brand dropped first, then shorter variants); DESC_MIN–DESC_MAX descriptions.
 * Exam-hub wording follows docs/seo/keyword-map.md §4 (templates in ./exam-template.ts).
 * Per-exam keyword copy (src/content/seo/exam-seo.json) wins for English.
 * toVerify documents never state a size.
 */
import { SITE_NAME } from '@/config/site';
import type { Lang } from '@/i18n/config';
import type { ExamPreset, PresetDocument } from '@/lib/presets';
import { lookup } from '@/i18n/core';
import { RAW_MESSAGES, type Namespace } from '@/i18n/messages';
import { t } from '@/i18n/server';
import { docPhrase, formatDate, kbText, lowerLabel, physicalText, pxText, verifiedSummary } from '@/seo/spec-text';
import { DESC_MAX, clampDescription, fitDescription, fitTitle, shortExamName, textLength } from '@/seo/text';
import {
  type ExamHeadingInput,
  type WindowStatus,
  examH1Text,
  examSpecH2,
  examTitleCandidates,
  hindiCycle,
  monthList,
  windowStatus,
} from './exam-template';
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
/** Exam-hub builders also name the conducting body. */
type HubLike = ExamLike & Pick<ExamPreset, 'body'>;

function titleNames(p: Pick<ExamPreset, 'slug' | 'name'>, lang: Lang): string[] {
  if (lang === 'hi') return [latinTitleName(p)];
  return [p.name.en, shortExamName(p.name.en)];
}

/** Documents named in an exam title. Live-photo exams still get "Photo": the page covers it. */
function titleDocs(p: Pick<ExamPreset, 'documents' | 'photoUploadReplacedByLive'>): Pick<PresetDocument, 'doc'>[] {
  return p.photoUploadReplacedByLive ? [{ doc: 'photo' }, ...p.documents] : p.documents;
}

/** Short Latin exam name for English and Hindi titles/H1s ("RRB NTPC", "SSC MTS", "CSIR NET"). */
export function examShortName(p: Pick<ExamPreset, 'slug' | 'name'>): string {
  return latinTitleName(p);
}

function headingInput(p: ExamLike, lang: Lang): ExamHeadingInput {
  const docs = titleDocs(p);
  return {
    short: examShortName(p),
    cycle: p.cycle,
    live: p.photoUploadReplacedByLive,
    hasPhoto: docs.some((d) => d.doc === 'photo'),
    hasSignature: docs.some((d) => d.doc === 'signature'),
    hasThumb: docs.some((d) => d.doc === 'thumb'),
    docsPhrase: docPhrase(docs, lang),
  };
}

/** "SSC CGL Photo Size 2026 & Signature Size | SahiSize" (keyword-map §4; Hindi §9). */
export function examTitle(p: ExamLike, lang: Lang = 'en'): string {
  const seo = lang === 'en' ? examSeo(p.slug) : undefined;
  const generic = examTitleCandidates(headingInput(p, lang), lang);
  return fitTitle(seo?.title ? [seo.title, ...generic] : generic);
}

/** H1: "SSC CGL Photo Size 2026: Live Photo and Signature Size"; exam-seo.json h1 wins (English). */
export function examH1(p: ExamLike, lang: Lang = 'en'): string {
  const seo = lang === 'en' ? examSeo(p.slug) : undefined;
  return seo?.h1 ?? examH1Text(headingInput(p, lang), lang);
}

/** H2 over the spec table: exam-seo.json specH2, else "SSC CGL photo and signature size 2026". */
export function examSpecTitle(p: ExamLike, lang: Lang = 'en'): string | null {
  if (lang !== 'en') return null;
  return examSeo(p.slug)?.specH2 ?? examSpecH2({ short: examShortName(p), cycle: p.cycle });
}

function firstDoc(p: Pick<ExamPreset, 'documents'>, type: PresetDocument['doc']) {
  return p.documents.find((d) => d.doc === type && d.maxKB !== null && !d.toVerify);
}

/** "472×157 px, 10–20 KB JPG" (px or physical size when known). */
function specText(d: PresetDocument, lang: Lang): string {
  const dims = pxText(d, lang) ?? physicalText(d);
  return `${[dims, kbText(d, lang)].filter(Boolean).join(', ')} ${d.format.toUpperCase()}`;
}

/** Lead sentence with as many document specs as fit, dropping from the end. */
function leadWithSpecs(head: string, parts: string[], tail: string, max = DESC_MAX): string {
  for (let n = parts.length; n > 0; n--) {
    const lead = `${head}${parts.slice(0, n).join('; ')}${tail}`;
    if (textLength(lead) <= max) return lead;
  }
  return `${head.replace(/[:\s]+$/, '')}${tail}`;
}

export function examDescription(p: HubLike, lang: Lang = 'en'): string {
  const photo = firstDoc(p, 'photo');
  const sign = firstDoc(p, 'signature');
  const thumb = firstDoc(p, 'thumb');
  const others = kitDocs(p).filter((d) => d !== photo && d !== sign && d !== thumb);
  const checked = p.lastChecked ? formatDate(p.lastChecked, lang) : null;
  const short = examShortName(p);
  if (lang === 'hi') {
    const c = hindiCycle(p.cycle);
    const parts = [
      ...(photo ? [`फोटो ${specText(photo, 'hi')}`] : []),
      ...(sign ? [`सिग्नेचर ${specText(sign, 'hi')}`] : []),
      ...(thumb ? [`अंगूठा ${specText(thumb, 'hi')}`] : []),
    ];
    const head = p.photoUploadReplacedByLive
      ? `${short} फोटो साइज़ ${c}: फोटो फॉर्म में लाइव ली जाती है, फाइल नहीं। `
      : `${short} फोटो साइज़ ${c}: `;
    return fitDescription(leadWithSpecs(head, parts, '।'), [
      'फ्री में सही साइज़ करें, फाइल आपके फोन में ही रहती है।',
      checked ? `नोटिस ${checked} को जाँचा गया।` : '',
      'मोबाइल पर भी चलता है।',
      'कोई अपलोड नहीं।',
    ]);
  }
  const seo = examSeo(p.slug);
  if (seo?.description) return clampDescription(seo.description);
  const extras = [
    checked ? `Checked ${checked}.` : '',
    `Specs from the ${p.body} notice.`,
    'Works on any phone.',
  ];
  if (p.photoUploadReplacedByLive) {
    const parts = [
      ...(sign ? [`Signature ${specText(sign, 'en')}`] : []),
      ...(thumb ? [`thumb ${specText(thumb, 'en')}`] : []),
      ...others.map((d) => `${lowerLabel(d.label.en)} ${specText(d, 'en')}`),
    ];
    const lead = leadWithSpecs(`${short} photo size ${p.cycle}: no photo file, the form takes a live photo. `, parts, '.');
    return fitDescription(lead, ['Resize the signature free on your phone, no upload.', ...extras]);
  }
  const parts = [
    ...(photo ? [specText(photo, 'en')] : []),
    ...(sign ? [`signature ${specText(sign, 'en')}`] : []),
    ...(thumb ? [`thumb ${specText(thumb, 'en')}`] : []),
  ];
  const lead = leadWithSpecs(`${short} photo size ${p.cycle}: `, parts, '.');
  return fitDescription(lead, ['Resize free on your phone, nothing is uploaded.', ...extras]);
}

export function examMeta(p: HubLike, lang: Lang = 'en'): PageMeta {
  return { title: examTitle(p, lang), description: examDescription(p, lang) };
}

function kitDocs(p: Pick<ExamPreset, 'documents'>): PresetDocument[] {
  return p.documents.filter((d) => d.maxKB !== null && !d.toVerify);
}

/** "the signature (472×157 px, 10–20 KB, JPG) and the SC/ST certificate (up to 399 KB, PDF)". */
function docListText(docs: PresetDocument[]): string {
  const items = docs.map((d) => {
    const label = lowerLabel(d.label.en);
    const spec = verifiedSummary(d).replace(/ · /g, ', ');
    // "the signature (three times) at 350–500 px, …" instead of a double bracket.
    return label.includes('(') ? `the ${label} at ${spec}` : `the ${label} (${spec})`;
  });
  if (items.length <= 1) return items.join('');
  return `${items.slice(0, -1).join(', ')} and ${items[items.length - 1]}`;
}

/**
 * First-paragraph intro for English exam hubs without an exam-seo.json intro: the primary
 * phrase, every document size (from the preset) and the notice name, in the first 100 words.
 */
export function examIntro(p: ExamPreset, lang: Lang = 'en'): string | null {
  if (lang !== 'en' || examSeo(p.slug)?.intro) return null;
  const short = examShortName(p);
  const photo = firstDoc(p, 'photo');
  const rest = kitDocs(p).filter((d) => d !== photo);
  const notice = `${noticeName(p)}${p.sourcePage ? `, page ${p.sourcePage}` : ''}`;
  const name = p.name.en;
  if (p.photoUploadReplacedByLive)
    return t('en', 'site.exam.introLive', { exam: short, name, cycle: p.cycle, docs: docListText(rest), notice });
  if (!photo) return null;
  return t('en', 'site.exam.introUpload', {
    exam: short,
    name,
    cycle: p.cycle,
    photo: verifiedSummary(photo).replace(/ · /g, ', '),
    docs: docListText(rest),
    notice,
  });
}

/**
 * One-line intro for the first screen of an exam page (inner-pages spec §4.2), from preset data
 * only: "IBPS PO photo: 200×230 px, 20–50 KB, JPG. All 5 uploads below." The full intro sentence
 * (examIntro / exam-seo intro) still renders lower on the page. null when nothing is uploadable.
 */
export function examIntroShort(p: ExamPreset, lang: Lang = 'en'): string | null {
  const docs = kitDocs(p);
  if (docs.length === 0) return null;
  const exam = examShortName(p);
  const stop = lang === 'hi' ? '।' : '.';
  const summary = (d: PresetDocument) => verifiedSummary(d, lang).replace(/ · /g, ', ');
  if (p.photoUploadReplacedByLive) {
    const first = docs[0]!;
    return `${t(lang, 'site.exam.introShortLive', { exam })} ${first.label[lang]}: ${summary(first)}${stop}`;
  }
  const lead = firstDoc(p, 'photo') ?? docs[0]!;
  const docWord =
    lead.doc === 'photo' ? (lang === 'hi' ? 'फोटो' : 'photo') : lang === 'hi' ? lead.label.hi : lowerLabel(lead.label.en);
  const line = t(lang, 'site.exam.introShort', { exam, doc: docWord, summary: summary(lead) });
  if (docs.length === 1) return line;
  const all = docs.length === 2 ? t(lang, 'site.exam.introShortBoth') : t(lang, 'site.exam.introShortAll', { n: docs.length });
  return `${line} ${all}`;
}

/** Notice title for running text: "Notice: Combined Higher …" -> "Combined Higher …". */
function noticeName(p: Pick<ExamPreset, 'notification'>): string {
  return p.notification.replace(/^Notice:\s*/i, '');
}

/** `t()` only when `lang` has its own string (Hindi pages never show an English fallback). */
function ownT(lang: Lang, key: string, vars?: Record<string, string | number>): string | null {
  const [ns, ...rest] = key.split('.');
  const dict = RAW_MESSAGES[lang][ns as Namespace];
  if (!dict || lookup(dict, rest.join('.')) === undefined) return null;
  return t(lang, key, vars);
}

/** Today in India (YYYY-MM-DD). Pages are prerendered, so this is the build date. */
export function todayIst(now: number = Date.now()): string {
  return new Date(now + 330 * 60_000).toISOString().slice(0, 10);
}

/** Status pill text for the application window, or null (no window, or no translation). */
export function applyWindowLabel(p: ExamPreset, lang: Lang, today = todayIst()): { kind: WindowStatus['kind']; text: string } | null {
  if (!p.applyWindow) return null;
  const st = windowStatus(p.applyWindow, p.seasonMonths, today);
  const d = (iso: string) => formatDate(iso, lang);
  let text: string | null;
  switch (st.kind) {
    case 'upcoming':
      text = ownT(lang, 'site.exam.window.upcoming', { opens: d(st.opens) });
      break;
    case 'open':
      text = ownT(lang, 'site.exam.window.open', { closes: d(st.closes) });
      break;
    case 'late':
      text = ownT(lang, 'site.exam.window.late', { closes: d(st.closes), until: d(st.until) });
      break;
    case 'correction':
      text = ownT(lang, 'site.exam.window.correction', { closes: d(st.closes), until: d(st.until) });
      break;
    case 'closed':
      text = st.nextMonths.length
        ? ownT(lang, 'site.exam.window.closedNext', { closes: d(st.closes), months: monthList(st.nextMonths, lang) })
        : ownT(lang, 'site.exam.window.closed', { closes: d(st.closes) });
      break;
  }
  return text ? { kind: st.kind, text } : null;
}

/** "Sizes are from the 2026 notice; a new one may be out" line, during the season after a closed window. */
export function nextCycleNote(p: ExamPreset, lang: Lang, today = todayIst()): string | null {
  if (!p.applyWindow) return null;
  const st = windowStatus(p.applyWindow, p.seasonMonths, today);
  if (st.kind !== 'closed' || !st.seasonNow) return null;
  return ownT(lang, 'site.exam.window.seasonNow', {
    exam: lang === 'hi' ? p.name.hi : examShortName(p),
    cycle: p.cycle,
    date: formatDate(p.lastChecked, lang),
  });
}

/** Last-date FAQ built from applyWindow (never hand-written, so it cannot go stale silently). */
export function deadlineFaq(p: ExamPreset, lang: Lang, today = todayIst()): { q: string; a: string } | null {
  const w = p.applyWindow;
  if (!w) return null;
  const exam = lang === 'hi' ? latinTitleName(p) : examShortName(p);
  const d = (iso: string) => formatDate(iso, lang);
  const q = ownT(lang, 'site.exam.window.faqQ', { exam, cycle: p.cycle });
  const base = ownT(lang, 'site.exam.window.faqA', { notification: noticeName(p), opens: d(w.opens), closes: d(w.closes) });
  if (!q || !base) return null;
  const st = windowStatus(w, p.seasonMonths, today);
  const bits = [
    base,
    w.lateUntil ? ownT(lang, 'site.exam.window.faqLate', { until: d(w.lateUntil) }) : null,
    w.correctionUntil ? ownT(lang, 'site.exam.window.faqCorrection', { until: d(w.correctionUntil) }) : null,
    st.kind === 'open' || st.kind === 'upcoming'
      ? ownT(lang, 'site.exam.window.faqOpen')
      : st.kind === 'closed' && st.nextMonths.length
        ? ownT(lang, 'site.exam.window.faqClosedNext', { exam, months: monthList(st.nextMonths, lang) })
        : ownT(lang, 'site.exam.window.faqClosed'),
  ];
  return { q, a: bits.filter(Boolean).join(' ') };
}

/** Matches an existing "photo size" question, so the generated one is not added twice. */
const PHOTO_Q = /photo (?:and signature )?size|upload a photo|photo upload/i;

/**
 * FAQs every English exam hub needs (keyword-map §4), generated from the preset:
 * "What is the <short> photo size?" (unless already asked) and, for live-photo exams,
 * "Other sites say a 20–50 KB photo. Is that wrong?". Plus the last-date FAQ.
 */
export function generatedExamFaqs(p: ExamPreset, lang: Lang, existing: readonly { q: string }[]): { q: string; a: string }[] {
  const out: { q: string; a: string }[] = [];
  const exam = examShortName(p);
  const photo = firstDoc(p, 'photo');
  const rest = kitDocs(p).filter((d) => d !== photo);
  if (!existing.some((f) => PHOTO_Q.test(f.q))) {
    const q = ownT(lang, 'site.exam.faqPhotoQ', { exam });
    const a = p.photoUploadReplacedByLive
      ? ownT(lang, 'site.exam.faqPhotoLiveA', { exam, cycle: p.cycle, docs: docListText(rest) })
      : photo
        ? ownT(lang, 'site.exam.faqPhotoA', {
            spec: verifiedSummary(photo).replace(/ · /g, ', '),
            notification: noticeName(p),
            rule: photo.rules[0]?.en ?? '',
          })
        : null;
    if (q && a) out.push({ q, a: a.replace(/\s+\./g, '.').replace(/\.\.$/, '.').trim() });
  }
  if (p.photoUploadReplacedByLive) {
    const q = ownT(lang, 'site.exam.faqOldPhotoQ', { exam });
    const a = ownT(lang, 'site.exam.faqOldPhotoA', { exam, cycle: p.cycle, notification: noticeName(p) });
    if (q && a) out.push({ q, a });
  }
  const dl = deadlineFaq(p, lang);
  if (dl) out.push(dl);
  return out;
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
