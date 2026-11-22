import 'server-only';
/**
 * Builds everything an exam-document page shows (title, H1, description, lead, answer box,
 * FAQs, links, next document) from the preset plus the doc-seo.json overrides. Every number
 * comes from the preset through `DocFacts`; overrides are templates filled from it.
 */
import type { Lang } from '@/i18n/config';
import { docSlug, kitDocuments, type ExamPreset, type PresetDocument } from '@/lib/presets';
import { formatDate, kbText, lowerLabel, physicalText, pxText } from '@/seo/spec-text';
import { fitTitle } from '@/seo/text';
import { getGuide, hasHindiExam, latinTitleName, titleLabels } from '@/server/content';
import {
  DOC_DESC_MAX,
  DOC_DESC_MIN,
  DOC_TITLE_MAX,
  answerRows,
  containsPhrase,
  docDescription,
  docH1,
  docTitleCandidates,
  factVars,
  fillTemplate,
  firstWords,
  generatedFaqs,
  introSentence,
  len,
  mergeFaqs,
  nextDocument,
  type AnswerRow,
  type DocFacts,
  type Faq,
} from './logic';
import { docSeo, docSeoPage, hindiDocKeys } from './seo-data';
import { docCopy } from './copy';

export function docFacts(p: ExamPreset, d: PresetDocument, lang: Lang): DocFacts {
  const [full] = titleLabels(d);
  return {
    exam: lang === 'hi' ? p.name.hi : p.name.en,
    short: latinTitleName(p),
    cycle: p.cycle,
    doc: lang === 'hi' ? d.label.hi : lowerLabel(d.label.en),
    docTitle: lang === 'hi' ? d.label.hi : full,
    format: d.format.toUpperCase(),
    kb: d.toVerify ? null : kbText(d, lang),
    min: d.toVerify ? null : d.minKB || null,
    max: d.toVerify ? null : d.maxKB,
    px: d.toVerify ? null : pxText(d, lang),
    physical: physicalText(d),
    toVerify: !!d.toVerify,
    rules: d.rules.map((r) => r[lang]),
    appliesTo: d.appliesTo?.[lang] ?? null,
    optional: !!d.optional,
    sizeNote: d.sizeNote?.[lang] ?? null,
    notification: p.notification,
    page: p.sourcePage,
    checked: formatDate(p.lastChecked, lang),
  };
}

export interface DocPageModel {
  title: string;
  h1: string;
  description: string;
  /** First paragraph: the override lead, or the template intro sentence plus the tail. */
  lead: string;
  freshness: string | null;
  answer: AnswerRow[];
  faqs: Faq[];
  links: { href: string; text: string }[];
  guides: string[];
  next: PresetDocument | null;
  others: PresetDocument[];
}

/** /hi/exam/{slug}/{doc} pages: doc-seo Hindi copy and a Hindi exam hub. */
export function hindiDocParams(): { slug: string; doc: string }[] {
  return [...hindiDocKeys()]
    .map((k) => {
      const [slug, doc] = k.split('/') as [string, string];
      return { slug, doc };
    })
    .filter(({ slug }) => hasHindiExam(slug));
}

export function hasHindiDocPage(slug: string, doc: string): boolean {
  return hasHindiExam(slug) && hindiDocKeys().has(`${slug}/${doc}`);
}

function check(key: string, lang: Lang, primary: string, m: { title: string; h1: string; description: string; lead: string }) {
  const errs: string[] = [];
  if (len(m.title) > DOC_TITLE_MAX) errs.push(`title ${len(m.title)} > ${DOC_TITLE_MAX}`);
  const dl = len(m.description);
  if (dl < DOC_DESC_MIN || dl > DOC_DESC_MAX) errs.push(`description ${dl} not in ${DOC_DESC_MIN}–${DOC_DESC_MAX}`);
  for (const [k, v] of Object.entries({ title: m.title, h1: m.h1, description: m.description, lead: firstWords(`${m.h1} ${m.lead}`) })) {
    if (!containsPhrase(v, primary)) errs.push(`primary "${primary}" missing from ${k}`);
  }
  if (errs.length) throw new Error(`doc-seo.json ${key} (${lang}): ${errs.join('; ')}`);
}

/**
 * @param presetFaqs the exam's own FAQs about this document (English pages only; from
 *   getDocInsights). Hindi pages use overrides and generated FAQs only.
 */
export function buildDocPage(p: ExamPreset, d: PresetDocument, lang: Lang, presetFaqs: readonly Faq[] = []): DocPageModel {
  const key = docSlug(d);
  const facts = docFacts(p, d, lang);
  const vars = factVars(facts);
  const fill = (s: string) => fillTemplate(s, vars);
  const page = docSeoPage(p.slug, key);
  const copy = page ? (lang === 'hi' ? page.hi : page.en) : undefined;
  const c = docCopy(lang);
  const [full, short] = titleLabels(d);
  const labels = lang === 'hi' ? { full: d.label.hi, short: d.label.hi } : { full, short };

  let title: string, h1: string, description: string, lead: string;
  if (copy) {
    title = fitTitle([fill(copy.title)]);
    h1 = fill(copy.h1);
    description = fill(copy.description);
    lead = `${fill(copy.lead)} ${d.toVerify ? c.introTailToVerify : c.introTail}`;
    check(`${p.slug}/${key}`, lang, copy.primary, { title, h1, description, lead });
  } else {
    title = fitTitle(docTitleCandidates(facts, labels, lang));
    h1 = docH1(facts, labels.full, lang);
    description = docDescription(facts, lang);
    lead = `${introSentence(facts, lang)} ${d.toVerify ? c.introTailToVerify : c.introTail}`;
  }

  const set = page?.faqSet ? docSeo.faqSets[page.faqSet] : undefined;
  const setFaqs = (lang === 'hi' ? set?.hi : set?.en) ?? [];
  const overrides = [...(copy?.faqs ?? []), ...setFaqs].map((f) => ({ q: fill(f.q), a: fill(f.a) }));
  const wanted = new Set(page?.presetFaqs ?? []);
  const ownFaqs = lang === 'en' ? p.faq.filter((f) => wanted.has(f.q.en)).map((f) => ({ q: f.q.en, a: f.a.en })) : [];
  const faqs = mergeFaqs({
    overrides: [...overrides, ...ownFaqs],
    preset: presetFaqs,
    generated: generatedFaqs(facts, lang),
    replaces: page?.replaces,
  });

  const links = (page?.links ?? [])
    .filter((l) => lang === 'en' || l.text.hi)
    .map((l) => ({ href: fill(l.href), text: fill(lang === 'hi' ? l.text.hi! : l.text.en) }));
  const guides = (docSeo.guides[d.doc as keyof typeof docSeo.guides] ?? []).filter((g) => getGuide(g, lang));
  const docs = kitDocuments(p);
  const withKey = docs.map((x) => ({ key: docSlug(x), d: x }));

  return {
    title,
    h1,
    description,
    lead,
    freshness: copy?.freshness ? fill(copy.freshness) : null,
    answer: answerRows(facts, lang),
    faqs,
    links,
    guides,
    next: nextDocument(withKey, key)?.d ?? null,
    others: docs.filter((x) => docSlug(x) !== key),
  };
}
