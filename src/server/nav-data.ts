import 'server-only';
/**
 * Build-time data for navigation and site search: tool categories (the /tools sections and
 * the search "Tools" group), the exam index with the documents each exam asks for, guides,
 * KB pages and the popular order. Server components only; the search box gets the result as props.
 */
import {
  COMPRESS_KB_TARGETS,
  JPG_PDF_KB_TARGETS,
  MB_TO_KB_PATH,
  PDF_KB_TARGETS,
  TOOL_CATS,
  TOOL_META,
  type NavToolId,
  type ToolCat,
} from '@/config/tools';
import {
  ID_HUB_PATHS,
  examSearchIndex,
  hindiExamSlugs,
  hindiPathFor,
  idPages,
  listGuides,
  otherDocsSearchIndex,
  popularPresets,
  seasonOrder,
} from '@/server/content';
import { localizePath, type Lang } from '@/i18n/config';
import { getMessages, t } from '@/i18n/server';
import type { Dict } from '@/i18n/core';
import type { GuideEntry, KbPages, SiteSearchData, ToolEntry } from '@/lib/site-search';
import { camel, toolNameKey } from '@/components/site/util';

function toolPath(id: NavToolId): string {
  return id === 'mb-to-kb' ? MB_TO_KB_PATH : TOOL_META[id].path;
}

export function toolName(id: NavToolId, lang: Lang): string {
  return id === 'mb-to-kb' ? t(lang, 'ui.search.mbToKb') : t(lang, toolNameKey(id));
}

export function toolDesc(id: NavToolId | string, lang: Lang): string {
  return t(lang, `ui.search.toolDesc.${camel(id)}`);
}

export interface NavTool {
  id: NavToolId;
  name: string;
  desc: string;
  /** Link for this language: the Hindi page when it exists, else English. */
  href: string;
  /** True on Hindi pages when the link goes to an English page. */
  english: boolean;
}

export interface NavSection {
  cat: ToolCat;
  title: string;
  tools: NavTool[];
}

/** /tools and /hi/tools sections, in display order. Govt ID links go to the ID pages. */
export function toolSections(lang: Lang): NavSection[] {
  const ids = Object.keys(TOOL_META) as NavToolId[];
  const sections: NavSection[] = TOOL_CATS.filter((c) => c !== 'govtId').map((cat) => ({
    cat,
    title: t(lang, `ui.search.cat.${cat}`),
    tools: ids
      .filter((id) => TOOL_META[id].cat === cat)
      .map((id) => {
        const en = toolPath(id);
        const hi = lang === 'hi' ? hindiPathFor(en) : null;
        return {
          id,
          name: toolName(id, lang),
          desc: toolDesc(id, lang),
          href: hi ?? en,
          english: lang === 'hi' && !hi,
        };
      }),
  }));
  sections.push({
    cat: 'govtId',
    title: t(lang, 'ui.search.cat.govtId'),
    tools: [
      ...idPages().map((p) => ({
        id: p.slug as NavToolId,
        name: t(lang, `ui.search.govtId.${camel(p.slug)}`),
        desc: t(lang, `ui.search.govtId.${camel(p.slug)}Desc`),
        href: lang === 'hi' && p.hiPath ? p.hiPath : p.path,
        english: lang === 'hi' && !p.hiPath,
      })),
      {
        id: 'id-documents' as NavToolId,
        name: t(lang, 'ui.search.govtId.hub'),
        desc: t(lang, 'ui.search.govtId.hubDesc'),
        href: ID_HUB_PATHS[lang],
        english: false,
      },
    ],
  });
  return sections;
}

function toolEntries(): ToolEntry[] {
  // Passport, stamp, postcard and custom size are tools AND "Other documents" entries;
  // siteSearch shows them once, under Tools.
  return (Object.keys(TOOL_META) as NavToolId[]).map((id) => {
    const m = TOOL_META[id];
    const en = toolPath(id);
    return {
      id,
      en: toolName(id, 'en'),
      hi: toolName(id, 'hi'),
      aliases: m.aliases,
      cat: m.cat,
      href: { en, hi: hindiPathFor(en) },
      ...(m.docs ? { docs: m.docs } : {}),
    };
  });
}

function kbPages(): KbPages {
  const img = [...COMPRESS_KB_TARGETS];
  const pdf = [...PDF_KB_TARGETS];
  const jpgPdf = [...JPG_PDF_KB_TARGETS];
  const paths = [
    ...img.map((n) => `/tools/compress-image-to-${n}kb`),
    ...pdf.map((n) => `/tools/compress-pdf-to-${n}kb`),
    ...jpgPdf.map((n) => `/tools/jpg-to-pdf-under-${n}kb`),
  ];
  return { img, pdf, jpgPdf, hi: paths.filter((p) => hindiPathFor(p) !== null) };
}

function guideEntries(lang: Lang): GuideEntry[] {
  return listGuides(lang).map((g) => ({
    id: g.slug,
    en: g.title,
    hi: g.title,
    aliases: [g.slug.replace(/-/g, ' ')],
    href: localizePath(`/guides/${g.slug}`, lang),
  }));
}

export interface SearchIslandProps {
  data: SiteSearchData;
  lang: Lang;
  dict: Dict;
  hiSlugs: string[];
  /** Popular exam slugs for the empty, focused search. */
  popular: string[];
  examsHref: string;
  /** Custom size tool and /report, in this language. */
  customHref: string;
  reportHref: string;
}

const cache = new Map<Lang, SearchIslandProps>();

/** Everything the search box needs, cached per language for the build. */
export async function searchIslandProps(lang: Lang): Promise<SearchIslandProps> {
  let p = cache.get(lang);
  if (!p) {
    p = {
      data: {
        exams: examSearchIndex(),
        tools: toolEntries(),
        docs: otherDocsSearchIndex(),
        guides: guideEntries(lang),
        kb: kbPages(),
        rank: seasonOrder().map((x) => x.slug),
      },
      lang,
      dict: getMessages(lang, ['common', 'ui']) as Dict,
      hiSlugs: hindiExamSlugs(),
      popular: popularPresets(5).map((x) => x.slug),
      examsHref: localizePath('/exams', lang),
      customHref:
        (lang === 'hi' ? hindiPathFor('/tools/custom-preset') : null) ?? '/tools/custom-preset',
      reportHref: '/report',
    };
    cache.set(lang, p);
  }
  return p;
}
