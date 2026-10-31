import 'server-only';
/**
 * Govt ID Documents section (/id-documents). Only specs that the issuing agency itself
 * publishes are used (src/content/id-documents/section.json, with source + checked date).
 * Pixel sizes are derived from the official cm size at the official DPI.
 */
import { ROUTES, idDocumentPath } from '@/config/routes';
import type { Lang } from '@/i18n/config';
import { derivePx, type DocSpecData, type LocalizedText } from '@/lib/presets';
import { once } from './core/read';
import { localHref } from './hindi';
import { content } from './registry';
import type { IdSection } from './schemas/site-data';
import type { ToolCopy, ToolSection } from './tool-copy';

export interface OfficialSource {
  id: string;
  /** Agency, as named on its own site. */
  body: string;
  title: string;
  url: string;
  /** Exact text from the page (table cells joined with " · "). */
  quote: string;
}

export interface IdDocPage {
  slug: string;
  path: string;
  /** Hindi path when a Hindi page exists. */
  hiPath: string | null;
  doc: 'photo' | 'signature';
  /** Official values as published (spec table). */
  official: IdSection['pages'][number]['official'];
  /** The spec the tool fits to (px derived at the official DPI). */
  spec: DocSpecData;
  sources: OfficialSource[];
}

export interface NotCovered {
  id: string;
  name: LocalizedText;
  reason: LocalizedText;
  url: string;
}

/** Anchor of the "Not covered" list on the hub (same id on /hi). */
export const NOT_COVERED_ANCHOR = 'not-covered';

export const ID_HUB_PATHS = { en: ROUTES.idDocuments, hi: `/hi${ROUTES.idDocuments}` } as const;

export function idSection(): Pick<IdSection, 'checkedOn' | 'checkedLabel' | 'disclaimer' | 'privacy' | 'officialDomains'> {
  const s = content().idSection;
  return { checkedOn: s.checkedOn, checkedLabel: s.checkedLabel, disclaimer: s.disclaimer, privacy: s.privacy, officialDomains: s.officialDomains };
}

export const idPages = once((): IdDocPage[] => {
  const s = content().idSection;
  const hi = content().idCopy.hi?.pages ?? {};
  return s.pages.map((p) => {
    const ph = p.spec.physical;
    const spec: DocSpecData = {
      ...p.spec,
      widthPx: derivePx(ph.width, ph.unit, p.spec.dpi),
      heightPx: derivePx(ph.height, ph.unit, p.spec.dpi),
      pxDerived: true,
    };
    return {
      slug: p.slug,
      path: idDocumentPath(p.slug),
      hiPath: hi[p.slug] ? `/hi${idDocumentPath(p.slug)}` : null,
      doc: p.doc,
      official: p.official,
      spec,
      sources: p.sources.map((id) => ({ id, ...s.sources[id]! })),
    };
  });
});

export function getIdPage(slug: string): IdDocPage | undefined {
  return idPages().find((p) => p.slug === slug);
}

export function notCovered(): NotCovered[] {
  return content().idSection.notCovered;
}

function localizeSections(sections: readonly ToolSection[], lang: Lang): ToolSection[] {
  return sections.map((s) => (s.links ? { ...s, links: s.links.map((l) => ({ ...l, href: localHref(l.href, lang) })) } : s));
}

export interface IdHubCopy {
  title: string;
  description: string;
  h1: string;
  intro: string;
  sections: ToolSection[];
  faq: { q: string; a: string }[];
  labels: Record<
    'specTitle' | 'colDocument' | 'colSize' | 'colKb' | 'colFormat' | 'colSource' | 'pagesTitle' | 'notCoveredTitle' | 'notCoveredIntro' | 'open',
    string
  >;
}

/** Hub copy in `lang` (falls back to null when that language has no copy). */
export function getIdHubCopy(lang: Lang): IdHubCopy | null {
  const c = content().idCopy[lang];
  if (!c) return null;
  return { ...c.hub, sections: localizeSections(c.hub.sections, lang) };
}

/** Page copy for an ID page in `lang`, or null when that page has no copy in that language. */
export function getIdPageCopy(slug: string, lang: Lang): ToolCopy | null {
  const c = content().idCopy[lang]?.pages[slug];
  if (!c) return null;
  return {
    title: c.title,
    description: c.description,
    h1: c.h1,
    intro: c.intro,
    steps: c.steps,
    faq: c.faq,
    sections: localizeSections(
      c.sections.filter((s): s is Extract<typeof s, { h2: string }> => 'h2' in s),
      lang,
    ),
  };
}

/** All indexable URLs of the section (hub first). */
export function idDocumentUrls(): { en: string; hi: string | null }[] {
  return [{ en: ID_HUB_PATHS.en, hi: ID_HUB_PATHS.hi }, ...idPages().map((p) => ({ en: p.path, hi: p.hiPath }))];
}
