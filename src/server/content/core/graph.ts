/**
 * Cross-file integrity of src/content: every reference points at something that exists,
 * every tool page has copy, Hindi lists agree with Hindi content. Framework-free.
 *
 * `loadContentGraph()` loads EVERYTHING and throws one ContentValidationError listing all
 * problems; the server registry calls it once, so invalid data fails `next build`.
 */
import { TOOL_SLUGS } from '@/config/tools';
import { LOCALES, type Lang } from '@/i18n/config';
import { allToolPageSlugs, parseToolSlug } from '@/lib/tool-pages';
import type { ExamPreset, Season } from '@/lib/presets/types';
import { kitDocuments } from '@/lib/presets/helpers';
import type { ExamCopy, Guide, HubCopy } from '../schemas/pages';
import type { ExamSeo, FamiliesFile, IdSection } from '../schemas/site-data';
import type { IdCopyFile, ToolCopyData, ToolSectionTemplates } from '../schemas/tool-copy';
import {
  loadDocTitleLabels,
  loadExamCopies,
  loadExamSeo,
  loadExamTitleNames,
  loadFamilies,
  loadGuides,
  loadHindiExams,
  loadHubCopies,
  loadIdCopies,
  loadIdSection,
  loadOtherDocs,
  loadToolCopies,
  loadToolSectionTemplates,
} from './content';
import { loadPresetsFromDir, loadSeasonFromDir } from './presets';
import { ContentValidationError } from './read';

/** Ids of the "Other documents" entries; other-docs.json must alias exactly these. */
export const OTHER_DOC_IDS = ['pan-photo', 'pan-signature', 'passport', 'stamp', 'postcard', 'custom', 'aadhaar'] as const;
export type OtherDocId = (typeof OTHER_DOC_IDS)[number];

export interface ContentGraph {
  presets: ExamPreset[];
  season: Season;
  guides: Record<Lang, Guide[]>;
  examCopy: Record<Lang, Map<string, ExamCopy>>;
  hubCopy: Record<Lang, Map<string, HubCopy>>;
  toolCopy: Record<Lang, Map<string, ToolCopyData>>;
  toolSections: ToolSectionTemplates;
  idSection: IdSection;
  idCopy: Record<Lang, IdCopyFile | null>;
  examSeo: Record<string, ExamSeo>;
  docTitleLabels: Record<string, { full: string; short: string }>;
  examTitleNames: Record<string, string>;
  families: FamiliesFile;
  hindiExams: string[];
  otherDocAliases: Record<OtherDocId, string[]>;
}

function perLang<T>(fn: (lang: Lang) => T): Record<Lang, T> {
  return Object.fromEntries(LOCALES.map((l) => [l, fn(l)])) as Record<Lang, T>;
}

/** Problems with references between loaded content (empty array = consistent). */
export function graphProblems(g: ContentGraph): string[] {
  const p: string[] = [];
  const all = new Set(g.presets.map((x) => x.slug));
  const published = new Set(g.presets.filter((x) => x.published).map((x) => x.slug));
  const tools = new Set<string>(TOOL_SLUGS);

  for (const lang of LOCALES) {
    for (const guide of g.guides[lang]) {
      for (const e of guide.relatedExams)
        if (!published.has(e)) p.push(`guides/${lang}/${guide.slug}.json: relatedExams "${e}" is not a published exam`);
      for (const t of guide.relatedTools)
        if (!tools.has(t)) p.push(`guides/${lang}/${guide.slug}.json: relatedTools "${t}" is not a tool`);
    }
    for (const slug of g.examCopy[lang].keys())
      if (!all.has(slug)) p.push(`exam-copy/${lang}/${slug}.json: no preset "${slug}"`);
    const familySlugs = new Set(g.families.families.map((f) => f.slug));
    for (const slug of g.hubCopy[lang].keys())
      if (!familySlugs.has(slug)) p.push(`hub-copy/${lang}/${slug}.json: no exam family "${slug}"`);
    for (const [slug, copy] of g.toolCopy[lang]) {
      if (!parseToolSlug(slug)) p.push(`tools/${lang}/${slug}.json: no tool page "/tools/${slug}"`);
      for (const s of copy.sections) {
        if (!('h2' in s) || !s.dynamicLinks || s.dynamicLinks.source !== 'exams') continue;
        for (const e of s.dynamicLinks.slugs) {
          const preset = g.presets.find((x) => x.slug === e);
          if (!preset || !preset.published) p.push(`tools/${lang}/${slug}.json: links to unpublished exam "${e}"`);
          else if (
            s.dynamicLinks.requireVerifiedPdf &&
            !kitDocuments(preset).some((d) => d.format === 'pdf' && !d.toVerify)
          )
            p.push(`tools/${lang}/${slug}.json: "${e}" has no verified PDF document`);
        }
      }
    }
  }

  // Every English tool page has copy; Hindi copy only for pages that exist in English.
  const en = g.toolCopy.en;
  for (const slug of allToolPageSlugs()) if (!en.has(slug)) p.push(`tools/en/${slug}.json: missing (page /tools/${slug})`);
  for (const slug of g.toolCopy.hi.keys()) if (!en.has(slug)) p.push(`tools/hi/${slug}.json: no English page`);

  // Hindi exam list <-> Hindi exam copy.
  const hiCopy = new Set(g.examCopy.hi.keys());
  for (const s of g.hindiExams) {
    if (!published.has(s)) p.push(`hindi-exams.json: "${s}" is not a published exam`);
    if (!hiCopy.has(s)) p.push(`hindi-exams.json: "${s}" has no exam-copy/hi/${s}.json`);
  }
  for (const s of hiCopy) if (!g.hindiExams.includes(s)) p.push(`exam-copy/hi/${s}.json: "${s}" is not listed in hindi-exams.json`);

  // Every family that gets a hub page needs English hub copy.
  for (const f of g.families.families) {
    const members = g.presets.filter(
      (x) => x.published && (f.match.group === undefined || f.match.group === x.group) && (f.match.body === undefined || f.match.body === x.body),
    );
    if (members.length >= g.families.minFamilySize && !g.hubCopy.en.has(f.slug))
      p.push(`hub-copy/en/${f.slug}.json: missing (family "${f.slug}" has ${members.length} published exams)`);
  }

  for (const s of Object.keys(g.examSeo)) if (!all.has(s)) p.push(`seo/exam-seo.json: no preset "${s}"`);
  for (const s of Object.keys(g.examTitleNames)) if (!all.has(s)) p.push(`seo/exam-title-names.json: no preset "${s}"`);

  // Govt ID section.
  const idSlugs = new Set(g.idSection.pages.map((x) => x.slug));
  for (const page of g.idSection.pages)
    for (const src of page.sources)
      if (!g.idSection.sources[src]) p.push(`id-documents/section.json: ${page.slug} cites unknown source "${src}"`);
  for (const src of Object.values(g.idSection.sources)) {
    const host = new URL(src.url).hostname;
    if (!src.url.startsWith('https://') || !g.idSection.officialDomains.some((d) => host === d || host.endsWith(`.${d}`)))
      p.push(`id-documents/section.json: source ${src.url} is not https on an official domain`);
  }
  for (const lang of LOCALES) {
    const copy = g.idCopy[lang];
    if (!copy) continue;
    for (const s of Object.keys(copy.pages)) if (!idSlugs.has(s)) p.push(`id-documents/copy/${lang}.json: unknown page "${s}"`);
  }
  for (const s of idSlugs) if (!g.idCopy.en?.pages[s]) p.push(`id-documents/copy/en.json: missing page "${s}"`);

  const aliasIds = Object.keys(g.otherDocAliases);
  for (const id of OTHER_DOC_IDS) if (!aliasIds.includes(id)) p.push(`other-docs.json: missing aliases for "${id}"`);
  for (const id of aliasIds)
    if (!(OTHER_DOC_IDS as readonly string[]).includes(id)) p.push(`other-docs.json: unknown entry "${id}"`);

  return p;
}

/** Load and validate all content. Throws ContentValidationError on the first broken file or any cross-file problem. */
export function loadContentGraph(): ContentGraph {
  const presets = loadPresetsFromDir();
  const g: ContentGraph = {
    presets,
    season: loadSeasonFromDir(),
    guides: perLang(loadGuides),
    examCopy: perLang(loadExamCopies),
    hubCopy: perLang(loadHubCopies),
    toolCopy: perLang(loadToolCopies),
    toolSections: loadToolSectionTemplates(),
    idSection: loadIdSection(),
    idCopy: loadIdCopies(),
    examSeo: loadExamSeo(),
    docTitleLabels: loadDocTitleLabels(),
    examTitleNames: loadExamTitleNames(),
    families: loadFamilies(),
    hindiExams: loadHindiExams().exams,
    otherDocAliases: loadOtherDocs().aliases as Record<OtherDocId, string[]>,
  };
  const problems = graphProblems(g);
  if (problems.length) throw new ContentValidationError('content references', problems);
  return g;
}
