/**
 * Pure text logic for /exam/{slug}/{doc} and /hi/exam/{slug}/{doc} pages: template filling,
 * spec phrases, meta descriptions in the 140–160 band, the answer box, generated FAQs from
 * preset facts, FAQ merging and the next-document pick.
 *
 * No runtime imports (types only), so it runs in vitest without the app's path aliases.
 * Every number comes in through `DocFacts`, which the server builds from the preset.
 */
import type { Lang } from '@/i18n/config';

export const DOC_DESC_MIN = 140;
export const DOC_DESC_MAX = 160;
export const DOC_TITLE_MAX = 60;

/** Length as a reader sees it (code points, so Devanagari is not double-counted). */
export function len(s: string): number {
  return [...s].length;
}

/** Everything a document page states about the size, all derived from the preset. */
export interface DocFacts {
  /** Exam name in the page language ("RRB NTPC (Graduate)", "जेईई मेन"). */
  exam: string;
  /** Latin short exam name for titles/H1s ("RRB NTPC"). */
  short: string;
  cycle: string;
  /** Document label mid-sentence in the page language ("SC/ST certificate (free travel pass)"). */
  doc: string;
  /** Title-case document label for titles/H1s ("SC/ST Certificate"; Hindi: label.hi). */
  docTitle: string;
  /** "PDF", "JPG". */
  format: string;
  /** "20–50 KB" / "up to 399 KB" (or Hindi equivalent); null when the size is to verify. */
  kb: string | null;
  min: number | null;
  max: number | null;
  /** "200×230 px", "min 140×60 px"; null when KB-only. */
  px: string | null;
  /** "6×2 cm"; null when the preset gives none. */
  physical: string | null;
  toVerify: boolean;
  /** Preset rules in the page language. */
  rules: string[];
  appliesTo: string | null;
  optional: boolean;
  sizeNote: string | null;
  notification: string;
  page: number | null;
  /** Formatted lastChecked date. */
  checked: string;
}

export type TemplateVars = Record<string, string | number | null | undefined>;

/** Template variables available to doc-seo.json strings. */
export function factVars(f: DocFacts): TemplateVars {
  const year = /^\D*((?:19|20)\d{2})\D*$/.exec(f.cycle)?.[1];
  return {
    exam: f.exam,
    short: f.short,
    cycle: f.cycle,
    nextCycle: year ? String(Number(year) + 1) : null,
    doc: f.doc,
    format: f.format,
    kb: f.kb,
    min: f.min,
    max: f.max,
    px: f.px,
    physical: f.physical,
    notification: f.notification,
    page: f.page,
    checked: f.checked,
    appliesTo: f.appliesTo,
  };
}

/** "{a} and {b}" -> values; throws on an unknown or empty variable so bad data fails the build. */
export function fillTemplate(tpl: string, vars: TemplateVars): string {
  return tpl.replace(/\{(\w+)\}/g, (_, name: string) => {
    const v = vars[name];
    if (v === null || v === undefined || v === '') throw new Error(`template variable {${name}} is empty in "${tpl}"`);
    return String(v);
  });
}

/** Placeholder names used in a template. */
export function templateNames(tpl: string): string[] {
  return [...tpl.matchAll(/\{(\w+)\}/g)].map((m) => m[1]!);
}

const cap = (s: string) => (s ? s[0]!.toUpperCase() + s.slice(1) : s);

/** "a PDF file of 50–300 KB", "a JPG file of 200×230 px and 20–50 KB"; null when to verify. */
export function specPhrase(f: DocFacts, lang: Lang): string | null {
  if (f.toVerify || !f.kb) return null;
  const parts = [f.px ?? f.physical, f.kb].filter((x): x is string => !!x);
  if (lang === 'hi') return `${parts.join(', ')} की ${f.format} फाइल`;
  return `a ${f.format} file of ${parts.join(' and ')}`;
}

/** "{Exam} asks for the {doc} as a PDF file of 50–300 KB." with the toVerify variant. */
export function introSentence(f: DocFacts, lang: Lang): string {
  const spec = specPhrase(f, lang);
  if (lang === 'hi') {
    if (!spec) return `${f.exam} में ${f.doc} माँगा जाता है, लेकिन इसका साइज़ अभी नोटिस से पक्का नहीं है।`;
    return `${f.exam} में ${f.doc} ${spec} के रूप में चाहिए।`;
  }
  if (!spec) return `${f.exam} asks for the ${f.doc}, but its size is not confirmed from the notice yet.`;
  return `${f.exam} asks for the ${f.doc} as ${spec}.`;
}

/** "200×230 px, 20–50 KB, JPG" (never numbers for a toVerify document). */
export function specWords(f: DocFacts): string {
  if (f.toVerify || !f.kb) return f.format;
  return [f.px ?? f.physical, f.kb, f.format].filter(Boolean).join(', ');
}

/**
 * lead + as many `middle` sentences as fit + tail, then `fillers` until the text reaches
 * `min`. Never longer than `max` (lead alone is cut at a word boundary if it must be).
 */
export function composeDescription(
  lead: string,
  middle: readonly string[],
  tail: string,
  fillers: readonly string[] = [],
  min = DOC_DESC_MIN,
  max = DOC_DESC_MAX,
): string {
  const join = (xs: string[]) => xs.filter(Boolean).join(' ').replace(/\s+/g, ' ').trim();
  const body = [lead];
  const fits = (xs: string[]) => len(join([...xs, tail])) <= max;
  if (!fits(body)) return clampText(join(body), max);
  for (const m of middle) if (m && fits([...body, m])) body.push(m);
  for (const x of fillers) {
    if (len(join([...body, tail])) >= min) break;
    if (x && fits([...body, x])) body.push(x);
  }
  return join([...body, tail]);
}

/** Cut at a word boundary to <= max code points, ending with "…". */
export function clampText(s: string, max: number): string {
  if (len(s) <= max) return s;
  const cut = [...s].slice(0, max - 1).join('');
  const sp = cut.lastIndexOf(' ');
  return `${(sp > 80 ? cut.slice(0, sp) : cut).replace(/[\s,;:–—-]+$/, '')}…`;
}

const end = (s: string, lang: Lang) => {
  const t = s.trim();
  if (!t) return '';
  if (lang === 'hi') return /[।.?!]$/.test(t) ? t : `${t}।`;
  return /[.?!]$/.test(t) ? t : `${t}.`;
};

/** Template meta description: "{short} {doc} size {cycle}: {spec}. {rule}. Resize free…". */
export function docDescription(f: DocFacts, lang: Lang): string {
  const rules = f.rules.map((r) => end(r, lang));
  if (lang === 'hi') {
    const lead = f.toVerify
      ? `${f.short} ${f.docTitle} साइज़ ${f.cycle}: साइज़ अभी नोटिस से पक्का नहीं है, अपलोड से पहले फॉर्म देखें।`
      : `${f.short} ${f.docTitle} साइज़ ${f.cycle}: ${specWords(f)}।`;
    return composeDescription(lead, rules.slice(0, 2), 'फोन पर फ्री में सही साइज़ करें; कोई अपलोड नहीं।', [
      ...rules.slice(2),
      `नोटिस ${f.checked} को जाँचा गया।`,
    ]);
  }
  const lead = f.toVerify
    ? `${f.short} ${f.doc} ${f.cycle}: the size is not yet confirmed in the notice, so check the form first.`
    : `${f.short} ${f.doc} size ${f.cycle}: ${specWords(f)}.`;
  return composeDescription(lead, rules.slice(0, 2), 'Resize free on your phone; nothing is uploaded.', [
    ...rules.slice(2),
    f.appliesTo ? `For ${lowerFirst(f.appliesTo)}.` : '',
    `Checked ${f.checked}.`,
    `Rules from the ${f.notification}.`,
  ]);
}

/** Title candidates, best first; the caller picks the first that fits (fitTitle). */
export function docTitleCandidates(f: DocFacts, labels: { full: string; short: string }, lang: Lang): string[] {
  if (lang === 'hi') {
    const spec = specWords(f).replace(`, ${f.format}`, '');
    return [
      `${f.short} ${f.docTitle} साइज़${f.kb ? `: ${spec}` : ''}`,
      `${f.short} ${f.docTitle} साइज़${f.kb ? `: ${f.kb}` : ''}`,
      `${f.short} ${f.docTitle} साइज़ ${f.cycle}`,
    ];
  }
  const dims = f.toVerify ? null : (f.px ?? f.physical);
  const spec = [dims, f.toVerify ? null : f.kb].filter(Boolean).join(', ');
  const tail = (x: string | null) => (x ? `: ${x}` : f.toVerify ? ' (to verify)' : '');
  return [
    `${f.short} ${labels.full} Size${tail(spec)}`,
    `${f.short} ${labels.short} Size${tail(spec)}`,
    `${f.short} ${labels.full} Size${tail(f.toVerify ? null : f.kb)}`,
    `${f.short} ${labels.short} Size${tail(f.toVerify ? null : f.kb)}`,
    `${f.short} ${labels.short} Size ${f.cycle}`,
  ];
}

/** "RRB ALP SC/ST Certificate Size 2026" / "JEE Main 10वीं सर्टिफिकेट साइज़ 2026". */
export function docH1(f: DocFacts, fullLabel: string, lang: Lang): string {
  return lang === 'hi' ? `${f.short} ${f.docTitle} साइज़ ${f.cycle}` : `${f.short} ${fullLabel} Size ${f.cycle}`;
}

function lowerFirst(s: string): string {
  // Keep acronyms and proper nouns ("SC/ST …", "PwD/PwBD …").
  return /^[A-Z][a-z]/.test(s) ? s[0]!.toLowerCase() + s.slice(1) : s;
}

// ---------------------------------------------------------------------------
// Answer box
// ---------------------------------------------------------------------------

export type AnswerKey = 'size' | 'format' | 'pixels' | 'pages' | 'who';
export interface AnswerRow {
  key: AnswerKey;
  value: string;
}

const PAGE_RULE = /\bpages?\b|\bA4\b|पेज/i;

/** Size | Format | Pixels or Pages | Who uploads (source is rendered by the caller with a link). */
export function answerRows(f: DocFacts, lang: Lang): AnswerRow[] {
  const L = lang === 'hi' ? HI : EN;
  const rows: AnswerRow[] = [];
  rows.push({ key: 'size', value: f.toVerify || !f.kb ? L.notConfirmed : f.kb });
  rows.push({ key: 'format', value: f.format });
  const dims = f.toVerify ? null : [f.px, f.physical].filter(Boolean).join(' · ');
  if (dims) rows.push({ key: 'pixels', value: dims });
  const pages = f.rules.filter((r) => PAGE_RULE.test(r));
  if (pages.length) rows.push({ key: 'pages', value: pages.map((p) => cap(p.replace(/^PDF file only,\s*/i, ''))).join('; ') });
  rows.push({ key: 'who', value: f.appliesTo ?? (f.optional ? L.onlyIfApplies : L.everyone) });
  return rows;
}

const EN = { notConfirmed: 'Not confirmed from the notice yet', everyone: 'Every candidate', onlyIfApplies: 'Only if it applies to you' };
const HI = { notConfirmed: 'नोटिस से अभी पक्का नहीं', everyone: 'हर उम्मीदवार', onlyIfApplies: 'सिर्फ जिन पर लागू हो' };

// ---------------------------------------------------------------------------
// FAQs
// ---------------------------------------------------------------------------

/** Topics of generated FAQs; a data override can `replace` them. */
export const FAQ_TOPICS = ['size', 'format', 'pages', 'min', 'who', 'pixels', 'rules'] as const;
export type FaqTopic = (typeof FAQ_TOPICS)[number];
export interface Faq {
  q: string;
  a: string;
}
export interface TopicFaq extends Faq {
  topic: FaqTopic;
}

const ONLY_RULE = /\bonly\b|सिर्फ/i;
const SIZE_OR_FORMAT_RULE = /\bKB\b|file only|फाइल|\bpages?\b|पेज/i;

/** Document-specific FAQs answered only from the facts (size, format, pages, minimum, who, pixels, rules). */
export function generatedFaqs(f: DocFacts, lang: Lang): TopicFaq[] {
  return lang === 'hi' ? generatedFaqsHi(f) : generatedFaqsEn(f);
}

function generatedFaqsEn(f: DocFacts): TopicFaq[] {
  const out: TopicFaq[] = [];
  const subject = `the ${f.short} ${f.doc}`;
  const alt = f.format === 'PDF' ? 'JPG' : 'PDF';
  const formatRule = f.rules.find((r) => ONLY_RULE.test(r) && r.toUpperCase().includes(f.format));
  const source = `the ${f.notification}${f.page ? `, page ${f.page}` : ''}`;
  if (!f.toVerify && f.kb) {
    out.push({
      topic: 'size',
      q: `What is the ${f.short} ${f.doc} size?`,
      a: `${cap(specPhrase(f, 'en')!)}, as per ${source}.${f.sizeNote ? ` ${f.sizeNote}` : ''}`,
    });
  }
  out.push(
    formatRule
      ? { topic: 'format', q: `Can ${subject} be a ${alt}?`, a: `No. ${end(formatRule, 'en')} Whatever you add here, SahiSize saves the result as ${f.format}.` }
      : { topic: 'format', q: `Which file format is ${subject}?`, a: `${f.format}, as the notice asks. Whatever you add here, SahiSize saves the result as ${f.format}.` },
  );
  if (f.format === 'PDF' && f.rules.some((r) => /all pages/i.test(r))) {
    out.push({
      topic: 'pages',
      q: `Can I put every page of the ${f.doc} in one PDF?`,
      a: `Yes, and you must: ${f.short} wants all pages in one file. Add each page (a photo, scan or PDF) in the tool above in order, and SahiSize joins them into one PDF${f.kb && !f.toVerify ? ` of ${f.kb}` : ''}.`,
    });
  }
  if (!f.toVerify && f.min && f.max) {
    out.push({
      topic: 'min',
      q: `What if my ${f.doc} file is under ${f.min} KB?`,
      a: `${f.short} wants at least ${f.min} KB, so a smaller file can be rejected. Auto-fit raises the quality, not the content, until the file is between ${f.min} and ${f.max} KB.`,
    });
  }
  if (f.optional || f.appliesTo) {
    const who = f.appliesTo;
    out.push({
      topic: 'who',
      q: `Does every ${f.short} candidate upload the ${f.doc}?`,
      a: who
        ? /^only\b/i.test(who)
          ? `No. ${end(who, 'en')} Everyone else skips this upload.`
          : `No. Only ${lowerFirst(who)} upload it. Everyone else skips this upload.`
        : 'No. It is optional: upload it only if it applies to you, as the form says.',
    });
  }
  if (!f.toVerify && f.px) {
    out.push({
      topic: 'pixels',
      q: `What pixel size should the ${f.short} ${f.doc} be?`,
      a: `${cap(f.px)}${f.physical ? ` (${f.physical})` : ''}, ${f.kb}, ${f.format}. SahiSize checks the pixels and the KB size before you download.`,
    });
  }
  const other = f.rules.filter((r) => !SIZE_OR_FORMAT_RULE.test(r));
  if (other.length) {
    out.push({
      topic: 'rules',
      q: `What else does ${f.short} check on the ${f.doc}?`,
      a: `${other.map((r) => end(r, 'en')).join(' ')} Files that break these rules can be rejected even at the right size.`,
    });
  }
  return out;
}

function generatedFaqsHi(f: DocFacts): TopicFaq[] {
  const out: TopicFaq[] = [];
  const subject = `${f.short} ${f.doc}`;
  const alt = f.format === 'PDF' ? 'JPG' : 'PDF';
  const formatRule = f.rules.find((r) => ONLY_RULE.test(r) && r.toUpperCase().includes(f.format));
  if (!f.toVerify && f.kb) {
    out.push({
      topic: 'size',
      q: `${f.short} ${f.docTitle} साइज़ क्या है?`,
      a: `${specPhrase(f, 'hi')}, ${f.notification}${f.page ? ` (पेज ${f.page})` : ''} के अनुसार।${f.sizeNote ? ` ${f.sizeNote}` : ''}`,
    });
  }
  out.push(
    formatRule
      ? { topic: 'format', q: `क्या ${subject} ${alt} में दे सकते हैं?`, a: `नहीं। ${end(formatRule, 'hi')} आप जो भी फाइल जोड़ें, SahiSize नतीजा ${f.format} में ही सेव करता है।` }
      : { topic: 'format', q: `${subject} किस फॉर्मेट में चाहिए?`, a: `${f.format}, जैसा नोटिस में लिखा है। SahiSize नतीजा ${f.format} में ही सेव करता है।` },
  );
  if (f.format === 'PDF' && f.rules.some((r) => /सारे पेज/.test(r))) {
    out.push({
      topic: 'pages',
      q: `क्या ${f.doc} के सारे पेज एक PDF में जोड़ सकते हैं?`,
      a: `हाँ, और यही ज़रूरी है: सारे पेज एक ही फाइल में चाहिए। ऊपर के टूल में हर पेज (फोटो, स्कैन या PDF) क्रम से जोड़ें, SahiSize उन्हें${f.kb && !f.toVerify ? ` ${f.kb} की` : ''} एक PDF बना देता है।`,
    });
  }
  if (!f.toVerify && f.min && f.max) {
    out.push({
      topic: 'min',
      q: `अगर ${f.doc} की फाइल ${f.min} KB से छोटी हो तो?`,
      a: `${f.short} में कम से कम ${f.min} KB चाहिए, इससे छोटी फाइल रिजेक्ट हो सकती है। Auto-fit कंटेंट बदले बिना क्वालिटी बढ़ाकर फाइल को ${f.min}–${f.max} KB के बीच ले आता है।`,
    });
  }
  if (f.optional || f.appliesTo) {
    out.push({
      topic: 'who',
      q: `क्या हर उम्मीदवार को ${f.doc} अपलोड करना है?`,
      a: f.appliesTo
        ? /^सिर्फ/.test(f.appliesTo)
          ? `नहीं। ${end(f.appliesTo, 'hi')} बाकी उम्मीदवार यह अपलोड छोड़ दें।`
          : `नहीं। सिर्फ ${f.appliesTo} इसे अपलोड करें। बाकी उम्मीदवार यह अपलोड छोड़ दें।`
        : 'नहीं। यह वैकल्पिक है: सिर्फ तब अपलोड करें जब आप पर लागू हो।',
    });
  }
  const other = f.rules.filter((r) => !SIZE_OR_FORMAT_RULE.test(r));
  if (other.length) {
    out.push({
      topic: 'rules',
      q: `${f.short} ${f.doc} में और क्या जाँचा जाता है?`,
      a: `${other.map((r) => end(r, 'hi')).join(' ')} सही साइज़ होने पर भी इन नियमों के बिना फाइल रिजेक्ट हो सकती है।`,
    });
  }
  return out;
}

/** Questions about form dates go stale; they come only from a structured apply window. */
export const DEADLINE_Q = /last date|deadline|closing date of the form|अंतिम तिथि|आखिरी तारीख|लास्ट डेट/i;
/** A question that already covers the document's size (so the generated size FAQ is redundant). */
export const SIZE_Q = /\bsize\b|\bhow (?:big|many kb)\b|साइज़/i;

function qTokens(q: string): Set<string> {
  return new Set(q.toLowerCase().match(/[\p{L}\p{N}]+/gu) ?? []);
}

function similar(a: string, b: string): boolean {
  const x = qTokens(a);
  const y = qTokens(b);
  let inter = 0;
  for (const t of x) if (y.has(t)) inter++;
  const union = x.size + y.size - inter;
  return union > 0 && inter / union >= 0.7;
}

/**
 * Overrides first, then the exam's own FAQs about the document, then generated ones whose
 * topic is not replaced or already covered. Deadline questions and near-duplicate questions
 * are dropped; at most `max` items.
 */
export function mergeFaqs(
  input: { overrides: readonly Faq[]; preset: readonly Faq[]; generated: readonly TopicFaq[]; replaces?: readonly FaqTopic[] },
  max = 8,
): Faq[] {
  const replaced = new Set<FaqTopic>(input.replaces ?? []);
  if ([...input.overrides, ...input.preset].some((f) => SIZE_Q.test(f.q))) replaced.add('size');
  const out: Faq[] = [];
  const add = (f: Faq) => {
    if (out.length >= max || DEADLINE_Q.test(f.q) || DEADLINE_Q.test(f.a)) return;
    if (out.some((o) => o.q === f.q || similar(o.q, f.q))) return;
    out.push({ q: f.q, a: f.a });
  };
  input.overrides.forEach(add);
  input.preset.forEach(add);
  input.generated.filter((g) => !replaced.has(g.topic)).forEach(add);
  return out;
}

// ---------------------------------------------------------------------------
// Next step
// ---------------------------------------------------------------------------

/** The document after `current` in kit order (wrapping), or null when there is no other. */
export function nextDocument<T extends { key: string }>(docs: readonly T[], current: string): T | null {
  const i = docs.findIndex((d) => d.key === current);
  if (docs.length < 2 || i < 0) return null;
  return docs[(i + 1) % docs.length]!;
}

// ---------------------------------------------------------------------------
// Keyword placement check (used by the data validation and tests)
// ---------------------------------------------------------------------------

/** Lower case, "&" -> "and", "/", "-" and punctuation -> spaces. */
export function normalizePhrase(s: string): string {
  return s
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[^\p{L}\p{N}\p{M}]+/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function containsPhrase(text: string, phrase: string): boolean {
  return ` ${normalizePhrase(text)} `.includes(` ${normalizePhrase(phrase)} `);
}

/** First `n` words of a text. */
export function firstWords(text: string, n = 100): string {
  return (text.match(/\S+/g) ?? []).slice(0, n).join(' ');
}
