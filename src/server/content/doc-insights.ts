import 'server-only';
/**
 * Per-exam content for /exam/{slug}/{doc} pages, so sister exams with identical specs
 * (IBPS RRB PO / Clerk, RRB NTPC / Group D) do not get near-duplicate pages:
 *  - how this exam's document compares with its sister exams,
 *  - the rejection tips and FAQs of this exam about this document,
 *  - excerpts from the exam's written copy about it.
 * toVerify sizes are never stated (verifiedSummary).
 *
 *   const insights = getDocInsights('ibps-po', 'signature');
 */
import type { Block, Inline } from '@/lib/blocks';
import { inlineText } from '@/lib/blocks';
import { getDocument, type ExamPreset, type PresetDocument } from '@/lib/presets';
import { lowerLabel, verifiedSummary } from '@/seo/spec-text';
import { getExamCopy } from './exam-copy';
import { familyMembers, familyOf } from './families';
import { getPublishedPreset, publishedPresets } from './presets';

type Doc = PresetDocument;

/** Words that show a piece of copy is about this document. */
export function docMatcher(d: Pick<Doc, 'doc' | 'label'>): RegExp {
  const l = d.label.en.toLowerCase();
  // The photo itself, not "photograph it" / "a phone photo of the paper".
  if (d.doc === 'photo')
    return /\bphoto(?!graph\s+(?:it|them|the|your|each|both|a|from|that)\b)(?:graph)?s?\b(?!\s+of\s+(?:the|your|a)\s+(?:paper|certificate|sheet|card|page))/i;
  if (d.doc === 'signature') return /parent|guardian/.test(l) ? /parent|guardian/i : /\bsign(atures?|ed|ing|s)?\b/i;
  if (d.doc === 'thumb') return /thumb|finger/i;
  if (d.doc === 'declaration') return /declaration/i;
  if (/class 10/.test(l)) return /10th|class 10|sslc|certificate/i;
  if (/disab|udid/.test(l)) return /disab|pwd|pwbd|udid/i;
  if (/category/.test(l)) return /category|caste/i;
  if (/result/.test(l)) return /result/i;
  if (/sc\/st/.test(l)) return /sc\/st|travel pass|certificate/i;
  if (/address/.test(l)) return /address/i;
  if (/aadhaar/.test(l)) return /aadhaar/i;
  if (/identity|photo id/.test(l)) return /\bid\b|identity/i;
  if (d.doc === 'certificate') return /certificate|\bpdf\b/i;
  return new RegExp(l.split(/\W+/)[0] ?? '(?!)', 'i');
}

function specKey(d: Doc): string {
  if (d.toVerify) return 'tv';
  return [d.widthPx, d.heightPx, d.minWidthPx, d.maxWidthPx, d.minHeightPx, d.maxHeightPx, d.minKB, d.maxKB, d.format].join('|');
}

/** The sister exam's document of the same kind (same slug first, then same type). */
function counterpart(sister: ExamPreset, d: Doc): Doc | undefined {
  const slug = d.slug ?? d.doc;
  return (
    sister.documents.find((x) => (x.slug ?? x.doc) === slug) ??
    sister.documents.find((x) => x.doc === d.doc && (d.doc !== 'certificate' || x.label.en === d.label.en))
  );
}

export interface Comparison {
  kind: 'same' | 'differs' | 'absent' | 'unknown' | 'wording';
  text: string;
  /** Sister exams named in the sentence, for links. */
  exams: { name: string; slug: string }[];
}

/** "A", "A and B", "A, B and C". */
export function listText(xs: readonly string[]): string {
  if (xs.length <= 1) return xs[0] ?? '';
  return `${xs.slice(0, -1).join(', ')} and ${xs[xs.length - 1]}`;
}

const ref = (s: ExamPreset) => ({ name: s.name.en, slug: s.slug });

/**
 * Sentences comparing this document with up to `max` sister exams. Sisters with the same
 * size share one sentence; each difference gets its own. Declarations also compare wording.
 */
export function compareWithSisters(p: ExamPreset, d: Doc, sisters: readonly ExamPreset[], max = 5): Comparison[] {
  const label = lowerLabel(d.label.en);
  const mine = verifiedSummary(d);
  const out: Comparison[] = [];
  const same: ExamPreset[] = [];
  const absent: ExamPreset[] = [];
  const live: ExamPreset[] = [];
  const unknown: ExamPreset[] = [];
  const list = sisters.filter((x) => x.slug !== p.slug).slice(0, max);
  for (const s of list) {
    const other = counterpart(s, d);
    if (!other) (d.doc === 'photo' && s.photoUploadReplacedByLive ? live : absent).push(s);
    else if (d.toVerify || other.toVerify) unknown.push(s);
    else if (specKey(other) === specKey(d)) same.push(s);
    else
      out.push({
        kind: 'differs',
        exams: [ref(s)],
        text: `Unlike ${s.name.en}, which wants ${verifiedSummary(other)}, ${p.name.en} wants ${mine}. Make a separate file for each form.`,
      });
  }
  if (same.length) {
    const one = same.length === 1;
    out.unshift({
      kind: 'same',
      exams: same.map(ref),
      text: `${listText(same.map((s) => s.name.en))} ${one ? 'uses' : 'use'} the same ${label} size as ${p.name.en} (${mine}), so one file passes ${one ? 'both forms' : 'all these forms'}${d.doc === 'photo' ? ' while the photo is still recent' : ''}.`,
    });
  }
  const names = (xs: ExamPreset[]) => listText(xs.map((s) => s.name.en));
  if (unknown.length)
    out.push({
      kind: 'unknown',
      exams: unknown.map(ref),
      text: `${names(unknown)} also ${unknown.length === 1 ? 'lists' : 'list'} a ${label}, but the sizes are not all confirmed from a notice yet, so make a separate file for each form.`,
    });
  if (live.length)
    out.push({
      kind: 'absent',
      exams: live.map(ref),
      text: `Unlike ${names(live)}, where the photo is taken live in the form, ${p.name.en} wants an uploaded photo: ${mine}.`,
    });
  if (absent.length)
    out.push({
      kind: 'absent',
      exams: absent.map(ref),
      text: `${names(absent)} ${absent.length === 1 ? 'does' : 'do'} not ask for a ${label} at all; ${p.name.en} does (${mine}).`,
    });
  if (d.doc === 'declaration' && p.declarationText) out.push(...compareDeclarations(p, list));
  return out;
}

function compareDeclarations(p: ExamPreset, sisters: readonly ExamPreset[]): Comparison[] {
  const mine = p.declarationText!;
  const flat = (s: string) => s.replace(/_+/g, '_').replace(/\s+/g, ' ').trim().toLowerCase();
  const dob = (s: string) => /date of birth/i.test(s);
  const out: Comparison[] = [];
  const same: ExamPreset[] = [];
  for (const s of sisters) {
    const theirs = s.declarationText;
    if (!theirs || !s.documents.some((x) => x.doc === 'declaration')) continue;
    if (flat(theirs.en) === flat(mine.en)) {
      same.push(s);
      continue;
    }
    const hint =
      dob(theirs.en) && !dob(mine.en)
        ? ' (it adds your date of birth)'
        : !dob(theirs.en) && dob(mine.en)
          ? ' (it has no date-of-birth line)'
          : '';
    out.push({
      kind: 'wording',
      exams: [ref(s)],
      text: `${s.name.en} prescribes different declaration wording${hint}, so a sheet written for ${s.name.en} cannot be reused for ${p.name.en}.`,
    });
  }
  if (same.length) {
    const names = listText(same.map((s) => s.name.en));
    const unconfirmed = mine.toVerify || same.some((s) => s.declarationText?.toVerify);
    out.unshift({
      kind: 'wording',
      exams: same.map(ref),
      text: unconfirmed
        ? `The declaration text we show matches the one for ${names}, but it is not yet confirmed from every notice, so compare it with yours.`
        : `${names} ${same.length === 1 ? 'prescribes' : 'prescribe'} the same declaration wording as ${p.name.en}.`,
    });
  }
  return out;
}

/** Sister exams to compare with: `related` first, then the rest of the family. */
export function sistersOf(p: ExamPreset, published: readonly ExamPreset[], family: readonly ExamPreset[] = []): ExamPreset[] {
  const bySlug = new Map(published.map((x) => [x.slug, x]));
  const out: ExamPreset[] = [];
  const add = (x: ExamPreset | undefined) => {
    if (x && x.slug !== p.slug && !out.includes(x)) out.push(x);
  };
  for (const s of p.related) add(bySlug.get(s));
  for (const x of family) add(x);
  return out;
}

const normQ = (s: string, names: readonly string[]) => {
  let out = s.toLowerCase();
  for (const n of names) out = out.split(n.toLowerCase()).join('#');
  return out.replace(/[^a-z0-9#]+/g, ' ').trim();
};

/**
 * This exam's own FAQs for the document page: those about the document, topped up to `min`
 * with general ones. FAQs a sister exam repeats word for word stay on the exam page only.
 */
export function docFaqs(p: ExamPreset, d: Doc, sisters: readonly ExamPreset[], min = 3): { q: string; a: string }[] {
  const re = docMatcher(d);
  const names = [p, ...sisters]
    .flatMap((x) => [x.name.en, x.name.en.replace(/\s*\(.*?\)\s*/g, ' ').trim()])
    .sort((a, b) => b.length - a.length);
  const shared = new Set(sisters.flatMap((s) => s.faq.map((f) => normQ(f.q.en, names))));
  const own = p.faq.filter((f) => !shared.has(normQ(f.q.en, names)));
  const about = own.filter((f) => re.test(f.q.en));
  const docRes = p.documents.map(docMatcher);
  const general = own.filter((f) => !about.includes(f) && !docRes.some((r) => r.test(f.q.en)));
  return [...about, ...general.slice(0, Math.max(0, min - about.length))].map((f) => ({ q: f.q.en, a: f.a.en }));
}

/** Rejection tips of this exam about the document. */
export function docTips(p: ExamPreset, d: Doc): ExamPreset['rejectionTips'] {
  const re = docMatcher(d);
  return p.rejectionTips.filter((t) => re.test(t.error) || re.test(t.fix.en.split(/(?<=\.)\s/)[0] ?? ''));
}

// ---------------------------------------------------------------------------
// Exam-copy excerpts
// ---------------------------------------------------------------------------

interface Unit {
  content: Inline[];
  text: string;
  /** Text of the nearest heading above ('' before the first heading). */
  heading: string;
}

/** Paragraphs and list items of a body with their section heading (tables dropped). */
export function textUnits(blocks: readonly Block[]): Unit[] {
  const out: Unit[] = [];
  let heading = '';
  const walk = (bs: readonly Block[]) => {
    for (const b of bs) {
      switch (b.type) {
        case 'h2':
        case 'h3':
        case 'h4':
          heading = inlineText(b.content).trim();
          break;
        case 'p':
          out.push({ content: b.content, text: inlineText(b.content).trim(), heading });
          break;
        case 'ul':
        case 'ol':
          for (const i of b.items) out.push({ content: i.content, text: inlineText(i.content).trim(), heading });
          break;
        case 'quote':
          walk(b.blocks);
          break;
        case 'table':
          break;
      }
    }
  };
  walk(blocks);
  return out.filter((u) => u.text);
}

/** Lower-case word 3-shingles of a text (near-duplicate detection). */
export function shingles(text: string, k = 3): Set<string> {
  const w = text.toLowerCase().match(/[\p{L}\p{N}]+/gu) ?? [];
  const out = new Set<string>();
  for (let i = 0; i + k <= w.length; i++) out.add(w.slice(i, i + k).join(' '));
  if (w.length > 0 && w.length < k) out.add(w.join(' '));
  return out;
}

/** Jaccard similarity of two sets (0 when both are empty). */
export function jaccard(a: ReadonlySet<string>, b: ReadonlySet<string>): number {
  let inter = 0;
  for (const x of a) if (b.has(x)) inter++;
  const union = a.size + b.size - inter;
  return union === 0 ? 0 : inter / union;
}

/**
 * The copy's opening paragraph, then paragraphs/list items about the document (naming it, or
 * under a heading that names it), in order, `max` in all. Units a sister exam's copy repeats
 * nearly word for word, and very short spec fragments, are skipped.
 */
export function copyExcerpts(
  body: readonly Block[] | null | undefined,
  d: Doc,
  max = 5,
  sisterBodies: readonly (readonly Block[])[] = [],
): Inline[][] {
  if (!body) return [];
  const re = docMatcher(d);
  const units = textUnits(body);
  const theirs = sisterBodies.flatMap((s) => textUnits(s).map((u) => shingles(u.text)));
  const own = (u: Unit) => {
    const mine = shingles(u.text);
    return !theirs.some((t) => jaccard(mine, t) >= 0.5);
  };
  const lead = units[0] && units[0].heading === '' ? units[0] : undefined;
  const words = (u: Unit) => (u.text.match(/[\p{L}\p{N}]+/gu) ?? []).length;
  const about = units.filter((u) => u !== lead && words(u) >= 12 && (re.test(u.text) || re.test(u.heading)) && own(u));
  return [...(lead ? [lead] : []), ...about].slice(0, max).map((u) => u.content);
}

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

/** "July–August", "September", "February, March or June" from seasonMonths, or null. */
export function seasonText(p: Pick<ExamPreset, 'seasonMonths'>): string | null {
  const m = p.seasonMonths;
  if (!m.length) return null;
  const names = m.map((x) => MONTHS[x - 1]!);
  if (names.length === 1) return names[0]!;
  if (names.length === 2 && (m[1]! - m[0]! === 1 || (m[0] === 12 && m[1] === 1))) return `${names[0]}–${names[1]}`;
  return `${names.slice(0, -1).join(', ')} or ${names[names.length - 1]}`;
}

export interface DocInsights {
  preset: ExamPreset;
  doc: PresetDocument;
  sisters: ExamPreset[];
  comparisons: Comparison[];
  faqs: { q: string; a: string }[];
  tips: ExamPreset['rejectionTips'];
  /** Rich-text excerpts (render each with <RichInline content={…} />). */
  excerpts: Inline[][];
  season: string | null;
}

/** Everything an English exam-document page needs, or null for an unknown exam/document. */
export function getDocInsights(slug: string, docSlug: string): DocInsights | null {
  const preset = getPublishedPreset(slug);
  const doc = preset && getDocument(preset, docSlug);
  if (!preset || !doc) return null;
  const fam = familyOf(preset);
  const sisters = sistersOf(preset, publishedPresets(), fam ? familyMembers(fam.slug) : []);
  const sisterBodies = sisters
    .map((s) => getExamCopy(s.slug, 'en'))
    .filter((b): b is Block[] => b !== null);
  return {
    preset,
    doc,
    sisters,
    comparisons: compareWithSisters(preset, doc, sisters),
    faqs: docFaqs(preset, doc, sisters),
    tips: docTips(preset, doc),
    excerpts: copyExcerpts(getExamCopy(slug, 'en'), doc, 5, sisterBodies),
    season: seasonText(preset),
  };
}
