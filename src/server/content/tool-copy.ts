import 'server-only';
/**
 * Tool page copy (src/content/tools/{lang}/{slug}.json), resolved for rendering:
 * links localized for the page language, preset-driven links and sections computed from the
 * current presets, name-and-date placeholders filled.
 *
 *   const copy = getToolCopy('compress-image-to-20kb', 'hi');  // ToolCopy | null
 */
import { examDocPath, examPath, guidePath } from '@/config/routes';
import { SITE_NAME } from '@/config/site';
import type { DocType } from '@/engine/types';
import { interpolate } from '@/i18n/core';
import type { Lang } from '@/i18n/config';
import { kitDocuments } from '@/lib/presets';
import { fitTitle, shortExamName } from '@/seo/text';
import { limitMatchesTarget } from '@/components/tools/kb-limit';
import { getGuide } from './guides';
import { hindiPathFor, localHref } from './hindi';
import { examsWithMaxKB, examsWithRange, getPublishedPreset, nameDateExams, seasonOrder } from './presets';
import { content } from './registry';
import type { DynamicLinks, SectionData, ToolCopyData } from './schemas/tool-copy';

export interface ToolLink {
  href: string;
  label: string;
}

export interface ToolSection {
  h2: string;
  paras: string[];
  list?: string[];
  links?: ToolLink[];
}

export interface ToolCopy {
  /** Full <title>. */
  title: string;
  description: string;
  h1: string;
  intro: string;
  steps: { name: string; text: string }[];
  faq: { q: string; a: string }[];
  sections: ToolSection[];
}

const uniqBySlug = <T extends { slug: string }>(xs: readonly T[]): T[] => {
  const seen = new Set<string>();
  return xs.filter((x) => (seen.has(x.slug) ? false : (seen.add(x.slug), true)));
};

function examLink(slug: string, label: string, lang: Lang): ToolLink {
  return { href: localHref(examPath(slug), lang), label };
}

function resolveDynamicLinks(d: DynamicLinks, lang: Lang): ToolLink[] {
  switch (d.source) {
    case 'exams':
      return d.slugs.map((s) => examLink(s, getPublishedPreset(s)!.name[lang], lang));
    case 'exams-with-range':
      return uniqBySlug(examsWithRange(d.min, d.max, lang))
        .slice(0, d.limit)
        .map((r) => examLink(r.slug, r.exam, lang));
    case 'name-date-exams':
      return nameDateExams(lang).map((e) => examLink(e.slug, e.name, lang));
  }
}

function examsWithMaxKbSection(n: number, lang: Lang): ToolSection | null {
  const refs = examsWithMaxKB(n, lang);
  if (!refs.length) return null;
  const tpl = content().toolSections.examsWithMaxKB[lang];
  const list = refs
    .slice(0, tpl.listLimit)
    .map((r) => interpolate(tpl.item, { exam: r.exam, doc: tpl.lowercaseDoc ? r.doc.toLowerCase() : r.doc, range: r.range }))
    .join('; ');
  return {
    h2: interpolate(tpl.h2, { n }),
    paras: [interpolate(tpl.para, { n, list })],
    links: uniqBySlug(refs)
      .slice(0, tpl.linkLimit)
      .map((r) => examLink(r.slug, r.exam, lang)),
  };
}

function resolveSection(s: SectionData, lang: Lang): ToolSection | null {
  if ('dynamic' in s) return examsWithMaxKbSection(s.n, lang);
  const links = [
    ...(s.links ?? []).map((l) => ({ href: localHref(l.href, lang), label: l.label })),
    ...(s.dynamicLinks ? resolveDynamicLinks(s.dynamicLinks, lang) : []),
  ];
  return {
    h2: s.h2,
    paras: s.paras,
    ...(s.list ? { list: s.list } : {}),
    ...(links.length ? { links } : {}),
  };
}

/** Apply `withoutExams` overrides ("steps.2.text") or fill {names}/{first}/{rule}. */
function fillNameDate(copy: ToolCopyData, lang: Lang): ToolCopyData {
  const exams = nameDateExams(lang);
  const clone = structuredClone(copy);
  if (!exams.length) {
    for (const [path, text] of Object.entries(copy.withoutExams ?? {})) {
      const keys = path.split('.');
      let obj: Record<string, unknown> = clone as unknown as Record<string, unknown>;
      for (const k of keys.slice(0, -1)) obj = obj[k] as Record<string, unknown>;
      obj[keys[keys.length - 1]!] = text;
    }
    return clone;
  }
  const first = exams[0]!;
  const s = first.option.spec;
  const px = s.widthPx !== null ? `${s.widthPx}×${s.heightPx} px` : '';
  const kb = s.minKB ? `${s.minKB}–${s.maxKB} KB` : `${s.maxKB} KB`;
  const vars = { names: exams.map((e) => e.name).join(', '), first: first.name, rule: [px, kb].filter(Boolean).join(', ') };
  const fill = (t: string) => interpolate(t, vars);
  clone.steps = clone.steps.map((st) => ({ name: fill(st.name), text: fill(st.text) }));
  clone.sections = clone.sections.map((sec) => ('h2' in sec ? { ...sec, paras: sec.paras.map(fill) } : sec));
  return clone;
}

const BRAND_SUFFIX = new RegExp(`\\s*\\|\\s*${SITE_NAME}$`);

/** Copy titles are cores; " | SahiSize" is added when it still fits in 60 characters. */
export function brandedTitle(core: string): string {
  return fitTitle([core.replace(BRAND_SUFFIX, '')]);
}

/** Resolved copy for a tool page in `lang`, or null when that page has no copy in that language. */
export function getToolCopy(slug: string, lang: Lang): ToolCopy | null {
  let data = content().toolCopy[lang].get(slug);
  if (!data) return null;
  if (data.withoutExams) data = fillNameDate(data, lang);
  return {
    title: brandedTitle(data.title),
    description: data.description,
    h1: data.h1,
    intro: data.intro,
    steps: data.steps,
    faq: data.faq,
    sections: data.sections.map((s) => resolveSection(s, lang)).filter((s): s is ToolSection => s !== null),
  };
}

export function hasToolCopy(slug: string, lang: Lang): boolean {
  return content().toolCopy[lang].has(slug);
}

/** English tool page slugs that have copy (every page in lib/tool-pages, validated). */
export function toolCopySlugs(lang: Lang): string[] {
  return [...content().toolCopy[lang].keys()];
}

// ---------------------------------------------------------------------------
// "Exams" block under a tool page and related guides
// ---------------------------------------------------------------------------

export interface ToolExamLinks {
  heading: string;
  links: ToolLink[];
}

/** Hindi doc page when it exists, else the Hindi exam hub, else the English doc page. */
function docHref(slug: string, docSlug: string, lang: Lang): string {
  const en = examDocPath(slug, docSlug);
  if (lang !== 'hi') return en;
  return hindiPathFor(en) ?? hindiPathFor(examPath(slug)) ?? en;
}

/**
 * Exam documents whose KB limit suits a "<kb> KB" page (see kb-limit.ts), linked to their
 * document pages, in season order. `pdf` picks PDF documents, otherwise image documents.
 */
export function kbLimitExamLinks(kb: number, pdf: boolean, lang: Lang): ToolExamLinks {
  const tpl = content().toolSections.examsWithMaxKB[lang];
  const links: ToolLink[] = [];
  for (const p of seasonOrder()) {
    for (const d of kitDocuments(p)) {
      if ((d.format === 'pdf') !== pdf || !limitMatchesTarget(kb, d)) continue;
      links.push({
        href: docHref(p.slug, d.slug ?? d.doc, lang),
        label: `${shortExamName(p.name[lang])} ${shortExamName(d.label[lang])}`,
      });
    }
  }
  return { heading: interpolate(tpl.h2, { n: kb }), links: links.slice(0, tpl.linkLimit) };
}

/**
 * Exams that ask for the document a generic tool makes. A single-document tool (signature,
 * thumb, declaration) links each exam's document page; others link the exam page.
 */
export function docTypeExamLinks(docTypes: readonly DocType[], lang: Lang, limit = 8): ToolLink[] {
  const out: ToolLink[] = [];
  for (const p of seasonOrder()) {
    const d = kitDocuments(p).find((x) => docTypes.includes(x.doc));
    if (!d) continue;
    const href =
      docTypes.length === 1
        ? docHref(p.slug, d.slug ?? d.doc, lang)
        : localHref(examPath(p.slug), lang);
    out.push({ href, label: p.name[lang] });
    if (out.length >= limit) break;
  }
  return out;
}

/** Guides linked from tool pages, per language: [slug test, guide slug]. */
const TOOL_GUIDES: Record<Lang, readonly [(slug: string) => boolean, string][]> = {
  en: [
    [(s) => s === 'signature-resize' || s === 'thumb-impression', 'how-to-upload-photo-signature'],
    [(s) => s.startsWith('compress-image') || s === 'resize-image', 'how-to-upload-photo-signature'],
    [(s) => s.startsWith('compress-image') || s === 'mb-to-kb-photo', 'reduce-photo-size-to-20kb-on-mobile'],
    [(s) => s === 'photo-size-converter-in-kb' || s === 'increase-image-size-in-kb', 'photo-size-kb-vs-pixels'],
    [(s) => s === 'photo-size-converter-in-kb', 'reduce-photo-size-to-20kb-on-mobile'],
    [(s) => s.startsWith('jpg-to-pdf-under-') || s === 'images-to-pdf', 'combine-certificates-into-pdf-under-300kb'],
  ],
  hi: [
    [(s) => s.startsWith('compress-image') || s === 'resize-image', 'photo-ko-kb-me-kaise-kare'],
    [(s) => s.startsWith('jpg-to-pdf-under-') || s === 'images-to-pdf', 'combine-certificates-into-pdf-under-300kb'],
  ],
};

/** Published guides related to a tool page, in the page language (missing guides are skipped). */
export function toolGuideLinks(slug: string, lang: Lang): ToolLink[] {
  const seen = new Set<string>();
  const out: ToolLink[] = [];
  for (const [test, g] of TOOL_GUIDES[lang]) {
    if (!test(slug) || seen.has(g)) continue;
    seen.add(g);
    const guide = getGuide(g, lang);
    if (guide) out.push({ href: lang === 'hi' ? `/hi${guidePath(g)}` : guidePath(g), label: guide.title });
  }
  return out;
}
