/**
 * Build-time data for navigation and site search: tool categories (the /tools sections and
 * the search "Tools" group), the exam index with the documents each exam asks for, guides,
 * KB pages and the popular order. Astro components only; islands get the result as props.
 */
import { getCollection } from 'astro:content';
import type { Lang } from '@/config/site';
import {
  COMPRESS_KB_TARGETS,
  JPG_PDF_KB_TARGETS,
  MB_TO_KB_PATH,
  PDF_KB_TARGETS,
  TOOLS,
  type ToolSlug,
} from '@/config/tools';
import { getKitDocuments, getPreset, getSearchIndex, getSeasonOrder, docSlug } from '@/content/presets';
import { pickPopular } from '@/content/presets/verified';
import { getOtherDocsSearchIndex } from '@/config/other-docs';
import { ID_HUB, ID_PAGES } from '@/config/id-documents';
import { hindiExamSlugs, hindiToolPath } from '@/seo/hreflang';
import { t, getNamespace, localizePath } from '@/i18n';
import type { Dict } from '@/i18n/core';
import type { DocWord, ToolCat } from '@/lib/intents';
import type { ExamEntry, GuideEntry, KbPages, SiteSearchData, ToolEntry } from '@/lib/site-search';
import { camel, toolNameKey } from '@/components/site/util';

export type NavToolId = ToolSlug | 'mb-to-kb';

interface ToolMeta {
  cat: ToolCat;
  aliases: string[];
  docs?: DocWord[];
}

/** Category, search words and documents per tool. Order inside a category = display order. */
export const TOOL_META: Record<NavToolId, ToolMeta> = {
  'compress-image': {
    cat: 'kb',
    aliases: ['photo', 'compress photo', 'reduce photo size', 'photo size kam', 'image compress', 'photo chota', 'फोटो छोटा', 'फोटो कम्प्रेस'],
    docs: ['photo'],
  },
  'increase-image-size-in-kb': {
    cat: 'kb',
    aliases: ['increase kb', 'increase photo size', 'size badhaye', 'kb badhaye', 'फोटो का साइज़ बढ़ाएं'],
  },
  'mb-to-kb': { cat: 'kb', aliases: ['mb to kb', 'mb', 'photo mb to kb'] },
  'batch-compress': { cat: 'kb', aliases: ['many photos', 'multiple photos', 'bulk compress'] },
  'resize-image': {
    cat: 'size',
    aliases: ['photo', 'resize photo', 'image resize', 'pixel', 'px', 'width height', 'फोटो रीसाइज़'],
    docs: ['photo'],
  },
  'photo-3-5x4-5-cm': { cat: 'size', aliases: ['3.5x4.5', '35x45', '3.5 x 4.5 cm', '4.5x3.5'] },
  'resize-image-in-cm': { cat: 'size', aliases: ['cm', 'centimeter', 'centimetre'] },
  'resize-image-in-mm': { cat: 'size', aliases: ['mm', 'millimeter', 'millimetre'] },
  'convert-image': { cat: 'size', aliases: ['heic', 'heic to jpg', 'png to jpg', 'jpg', 'jpeg', 'png', 'webp', 'format change'] },
  'custom-preset': { cat: 'size', aliases: ['custom', 'my size', 'exam not listed', 'own size'] },
  'signature-resize': {
    cat: 'signature',
    aliases: ['signature', 'sign', 'hastakshar', 'signature size', 'signature clean', 'हस्ताक्षर', 'सिग्नेचर'],
    docs: ['signature'],
  },
  'thumb-impression': { cat: 'documents', aliases: ['thumb', 'angutha', 'left thumb', 'अंगूठा'], docs: ['thumb'] },
  'handwritten-declaration': { cat: 'documents', aliases: ['declaration', 'ghoshna', 'घोषणा'], docs: ['declaration'] },
  'name-date-on-photo': { cat: 'documents', aliases: ['name date', 'name and date', 'date on photo', 'नाम तारीख'] },
  'passport-size-photo': { cat: 'documents', aliases: ['passport', 'passport photo'] },
  'passport-photo-sheet': { cat: 'documents', aliases: ['print', 'photo sheet', 'passport photo print', '4x6'] },
  'stamp-size-photo': { cat: 'documents', aliases: ['stamp'] },
  'postcard-size-photo': { cat: 'documents', aliases: ['postcard'] },
  'images-to-pdf': {
    cat: 'pdf',
    aliases: ['jpg to pdf', 'image to pdf', 'photo to pdf', 'merge', 'combine certificates', 'certificate pdf', 'pdf banaye'],
    docs: ['certificate'],
  },
  'compress-pdf': { cat: 'pdf', aliases: ['pdf', 'pdf compress', 'reduce pdf', 'pdf size', 'pdf chota', 'पीडीएफ छोटा'] },
};

export const TOOL_CATS: readonly ToolCat[] = ['kb', 'size', 'signature', 'documents', 'pdf', 'govtId'];

function toolPath(id: NavToolId): string {
  return id === 'mb-to-kb' ? MB_TO_KB_PATH : TOOLS.find((x) => x.slug === id)!.path;
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
        const hi = lang === 'hi' ? hindiToolPath(en) : null;
        return { id, name: toolName(id, lang), desc: toolDesc(id, lang), href: hi ?? en, english: lang === 'hi' && !hi };
      }),
  }));
  sections.push({
    cat: 'govtId',
    title: t(lang, 'ui.search.cat.govtId'),
    tools: [
      ...ID_PAGES.map((p) => ({
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
        href: lang === 'hi' ? ID_HUB.hi : ID_HUB.en,
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
        href: { en, hi: hindiToolPath(en) },
        ...(m.docs ? { docs: m.docs } : {}),
      };
  });
}

function examEntries(): ExamEntry[] {
  return getSearchIndex().map((e) => {
    const p = getPreset(e.slug)!;
    const docs = [...new Set(p.documents.map((d) => d.doc))];
    const pages = e.published ? getKitDocuments(p).map((d) => docSlug(d)) : [];
    return { ...e, docs, pages };
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
  return { img, pdf, jpgPdf, hi: paths.filter((p) => hindiToolPath(p) !== null) };
}

async function guideEntries(lang: Lang): Promise<GuideEntry[]> {
  const guides = await getCollection('guides', (g) => g.data.lang === lang && !g.data.draft);
  return guides
    .sort((a, b) => a.data.order - b.data.order)
    .map((g) => ({
      id: g.data.slug,
      en: g.data.title,
      hi: g.data.title,
      aliases: [g.data.slug.replace(/-/g, ' ')],
      href: localizePath(`/guides/${g.data.slug}`, lang),
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

const cache = new Map<Lang, Promise<SearchIslandProps>>();

/** Everything the search island needs, cached per language for the build. */
export function searchIslandProps(lang: Lang): Promise<SearchIslandProps> {
  let p = cache.get(lang);
  if (!p) {
    p = (async () => {
      const rank = getSeasonOrder().map((x) => x.slug);
      const popular = pickPopular(getSeasonOrder(), { year: new Date().getFullYear(), limit: 5 }).map((x) => x.slug);
      return {
        data: {
          exams: examEntries(),
          tools: toolEntries(),
          docs: getOtherDocsSearchIndex(),
          guides: await guideEntries(lang),
          kb: kbPages(),
          rank,
        },
        lang,
        dict: getNamespace(lang, 'common', 'ui'),
        hiSlugs: hindiExamSlugs(),
        popular,
        examsHref: localizePath('/exams', lang),
        customHref: (lang === 'hi' ? hindiToolPath('/tools/custom-preset') : null) ?? '/tools/custom-preset',
        reportHref: '/report',
      };
    })();
    cache.set(lang, p);
  }
  return p;
}
