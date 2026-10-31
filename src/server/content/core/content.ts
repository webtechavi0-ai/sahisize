/**
 * Loaders for every non-preset content file, with per-file checks (slug = file name,
 * lang = directory). Framework-free and uncached: the server-only modules in ../ memoize.
 * Cross-file checks (links to exams/tools that must exist) live in ./graph.ts.
 */
import { join } from 'node:path';
import { LOCALES, type Lang } from '@/i18n/config';
import { ExamCopySchema, GuideSchema, HubCopySchema, type ExamCopy, type Guide, type HubCopy } from '../schemas/pages';
import {
  DocTitleLabelsSchema,
  ExamSeoFileSchema,
  ExamTitleNamesSchema,
  FamiliesFileSchema,
  HindiExamsSchema,
  IdSectionSchema,
  OtherDocsSchema,
} from '../schemas/site-data';
import {
  IdCopyFileSchema,
  ToolCopyDataSchema,
  ToolSectionTemplatesSchema,
  type IdCopyFile,
  type ToolCopyData,
} from '../schemas/tool-copy';
import { ContentValidationError, contentPath, displayPath, listJsonFiles, loadFile, parseOrThrow, readJson } from './read';

const slugOf = (file: string) => file.replace(/\.json$/, '');

/** Every file in `dir/{lang}` parsed with `schema`, keyed by slug (file name). */
function loadLangDir<T>(dir: string, lang: Lang, parse: (data: unknown, label: string) => T): Map<string, T> {
  const abs = contentPath(dir, lang);
  const out = new Map<string, T>();
  for (const f of listJsonFiles(abs)) {
    const file = join(abs, f);
    out.set(slugOf(f), parse(readJson(file), displayPath(file)));
  }
  return out;
}

/** All guides of a language, drafts included, sorted by `order` then slug. */
export function loadGuides(lang: Lang): Guide[] {
  const problems: string[] = [];
  const map = loadLangDir('guides', lang, (d, label) => {
    const g = parseOrThrow(GuideSchema, d, label);
    if (g.lang !== lang) problems.push(`${label}: lang "${g.lang}" must be "${lang}" (its directory)`);
    if (`${g.slug}.json` !== label.split(/[\\/]/).pop()) problems.push(`${label}: slug "${g.slug}" must match the file name`);
    return g;
  });
  if (problems.length) throw new ContentValidationError(`guides/${lang}`, problems);
  return [...map.values()].sort((a, b) => a.order - b.order || a.slug.localeCompare(b.slug));
}

export function loadExamCopies(lang: Lang): Map<string, ExamCopy> {
  return loadLangDir('exam-copy', lang, (d, label) => parseOrThrow(ExamCopySchema, d, label));
}

export function loadHubCopies(lang: Lang): Map<string, HubCopy> {
  return loadLangDir('hub-copy', lang, (d, label) => parseOrThrow(HubCopySchema, d, label));
}

/** Tool page copy keyed by page slug ("compress-image-to-20kb"). */
export function loadToolCopies(lang: Lang): Map<string, ToolCopyData> {
  return loadLangDir('tools', lang, (d, label) => parseOrThrow(ToolCopyDataSchema, d, label));
}

export const loadToolSectionTemplates = () => loadFile(ToolSectionTemplatesSchema, 'tools', 'sections.json');

export function loadIdSection() {
  return loadFile(IdSectionSchema, 'id-documents', 'section.json');
}

export function loadIdCopies(): Record<Lang, IdCopyFile | null> {
  const out = {} as Record<Lang, IdCopyFile | null>;
  for (const lang of LOCALES) {
    const file = contentPath('id-documents', 'copy', `${lang}.json`);
    out[lang] = listJsonFiles(contentPath('id-documents', 'copy')).includes(`${lang}.json`)
      ? parseOrThrow(IdCopyFileSchema, readJson(file), displayPath(file))
      : null;
  }
  if (!out.en) throw new ContentValidationError('id-documents/copy', ['en.json is required']);
  return out;
}

export const loadExamSeo = () => loadFile(ExamSeoFileSchema, 'seo', 'exam-seo.json');
export const loadDocTitleLabels = () => loadFile(DocTitleLabelsSchema, 'seo', 'doc-title-labels.json');
export const loadExamTitleNames = () => loadFile(ExamTitleNamesSchema, 'seo', 'exam-title-names.json');
export const loadFamilies = () => loadFile(FamiliesFileSchema, 'families.json');
export const loadHindiExams = () => loadFile(HindiExamsSchema, 'hindi-exams.json');
export const loadOtherDocs = () => loadFile(OtherDocsSchema, 'other-docs.json');
