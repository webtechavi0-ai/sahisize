import 'server-only';
/**
 * Tool page copy (src/content/tools/{lang}/{slug}.json), resolved for rendering:
 * links localized for the page language, preset-driven links and sections computed from the
 * current presets, name-and-date placeholders filled.
 *
 *   const copy = getToolCopy('compress-image-to-20kb', 'hi');  // ToolCopy | null
 */
import { examPath } from '@/config/routes';
import { interpolate } from '@/i18n/core';
import type { Lang } from '@/i18n/config';
import { localHref } from './hindi';
import { examsWithMaxKB, examsWithRange, getPublishedPreset, nameDateExams } from './presets';
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

/** Resolved copy for a tool page in `lang`, or null when that page has no copy in that language. */
export function getToolCopy(slug: string, lang: Lang): ToolCopy | null {
  let data = content().toolCopy[lang].get(slug);
  if (!data) return null;
  if (data.withoutExams) data = fillNameDate(data, lang);
  return {
    title: data.title,
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
