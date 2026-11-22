/**
 * Tool page template (SPEC 6.5).
 *  - children -> the tool client component (upload -> settings -> result, PassCheck)
 *  - `content` -> spec explanation / how-to prose below the tool (SEO)
 * The layout adds: H1 + intro, how-to steps, FAQ, links to the top exams that use the tool,
 * and JSON-LD (WebApplication + HowTo + FAQPage + BreadcrumbList).
 */
import type { ReactNode } from 'react';
import type { Metadata } from 'next';
import MainLayout from '@/components/layout/MainLayout';
import Breadcrumbs from '@/components/site/Breadcrumbs';
import FaqList from '@/components/site/FaqList';
import RailLayout from './RailLayout';
import { buildRail } from '@/components/rail/Rail';
import { artBlock, howBlock, linksBlock, type ChipLink } from '@/components/rail/blocks';
import type { ToolSlug } from '@/config/tools';
import type { DocType } from '@/engine/types';
import { breadcrumbList, faqPage, howTo, webApplication } from '@/seo/jsonld';
import {
  docTypeExamLinks,
  hindiPathFor,
  localHref,
  type ToolExamLinks,
  type ToolLink,
} from '@/server/content';
import { buildMetadata } from '@/seo/metadata';
import { t } from '@/i18n/server';
import { localizePath, type Lang } from '@/i18n/config';
import { ogImagePath } from '@/seo/urls';

export interface ToolLayoutProps {
  lang?: Lang;
  tool: ToolSlug;
  /** English path of this page, e.g. "/tools/compress-image-to-20kb". */
  path: string;
  title: string;
  description: string;
  h1: string;
  intro: string;
  steps?: { name: string; text: string }[];
  faq?: { q: string; a: string }[];
  /** custom-preset pages are noindex (SPEC 9.1). */
  noindex?: boolean;
  /** Prose below the tool (old "content" slot). */
  content?: ReactNode;
  /** The tool component. */
  children?: ReactNode;
  /**
   * Exam links under the FAQ. Omitted: exams that ask for the tool's document type, under
   * "Exams that use this". null: no block (the page copy already lists its exams).
   */
  examLinks?: ToolExamLinks | null;
  /** Related guides, shown after the exam links. */
  guides?: ToolLink[];
  /** Side-rail chips: nearby KB sizes or other tools (tools-registry relatedToolLinks). */
  related?: { title: string; links: ChipLink[] } | null;
}

const DOCS_FOR_TOOL: Partial<Record<ToolSlug, DocType[]>> = {
  'compress-image': ['photo', 'signature', 'thumb'],
  'resize-image': ['photo'],
  'convert-image': ['photo'],
  'signature-resize': ['signature'],
  'thumb-impression': ['thumb'],
  'handwritten-declaration': ['declaration'],
  'images-to-pdf': ['certificate'],
  'compress-pdf': ['certificate'],
  'passport-photo-sheet': ['photo'],
  'batch-compress': ['photo'],
  'photo-3-5x4-5-cm': ['photo'],
  'resize-image-in-cm': ['photo'],
  'resize-image-in-mm': ['photo'],
  'passport-size-photo': ['photo'],
  'postcard-size-photo': ['photo'],
  'stamp-size-photo': ['photo'],
  'increase-image-size-in-kb': ['photo', 'signature'],
  'photo-size-converter-in-kb': ['photo', 'signature'],
  // name-date-on-photo: no generic exam list (most photo exams do not want a strip);
  // its copy links the published exams that do.
};

const CHIP =
  'inline-flex min-h-tap items-center rounded-xl border border-rule bg-card px-4 no-underline transition-colors duration-150 hover:border-ink hover:bg-ink-soft';

function resolvePath(enPath: string, lang: Lang) {
  const hiPath = hindiPathFor(enPath);
  return { hiPath, path: lang === 'hi' && hiPath ? hiPath : enPath };
}

export function toolMetadata({
  lang = 'en',
  path: enPath,
  title,
  description,
  noindex = false,
}: ToolLayoutProps): Metadata {
  const { hiPath, path } = resolvePath(enPath, lang);
  return buildMetadata({
    title,
    description,
    lang,
    path: path,
    alternates: { en: enPath, hi: hiPath },
    ogImage: ogImagePath(enPath),
    noindex,
  });
}

export default function ToolLayout({
  lang = 'en',
  tool,
  path: enPath,
  description,
  h1,
  intro,
  steps = [],
  faq = [],
  content,
  children,
  examLinks,
  guides = [],
  related = null,
}: ToolLayoutProps) {
  const tr = (k: string, v?: Record<string, string | number>) => t(lang, k, v);
  const { hiPath, path } = resolvePath(enPath, lang);
  const exams: ToolExamLinks | null =
    examLinks === undefined
      ? { heading: tr('site.tool.topExams'), links: docTypeExamLinks(DOCS_FOR_TOOL[tool] ?? [], lang) }
      : examLinks;
  const crumbs = [
    { name: tr('site.breadcrumb.home'), path: localizePath('/', lang) },
    { name: tr('site.breadcrumb.tools'), path: localizePath('/tools', lang) },
    { name: h1, path },
  ];

  const { rail, fit } = buildRail(
    [
      howBlock(steps, lang),
      related ? linksBlock(related.title, related.links) : null,
      artBlock({ routes: [enPath] }, lang, true),
    ],
    lang,
  );

  return (
    <MainLayout
      lang={lang}
      alternates={{ en: enPath, hi: hiPath }}
      jsonLd={[
        breadcrumbList(crumbs),
        webApplication({ name: h1, description, path, lang }),
        steps.length ? howTo({ name: h1, description, steps }) : null,
        faqPage(faq),
      ]}
    >
      <RailLayout
        topFull
        railLabel={tr('site.rail.toolLabel')}
        rail={rail}
        fit={fit}
        head={
          <>
            <Breadcrumbs lang={lang} crumbs={crumbs} />
            <h1 className="text-h1">{h1}</h1>
            <p className="mt-2 max-w-3xl text-base sm:text-lg">{intro}</p>
          </>
        }
        top={
          /* The "Processed on your device" line lives in the tool's uploader / file card
             (Uploader, SourceBar), so the layout does not repeat it under the title. */
          <section className="mt-2 sm:mt-1" data-tool-slot={tool}>
            {children ?? <div className="card p-6 text-center text-muted">{tr('site.tool.placeholder')}</div>}
          </section>
        }
      >
        {/* SEO prose below the tool; "How to use it" and the illustration sit in the side rail. */}
        <div className="max-w-4xl lg:max-w-none">
          {content}

          <FaqList title={tr('site.tool.faqTitle')} items={faq} />

          {exams && exams.links.length > 0 && (
            <section aria-labelledby="tex-h" className="mt-10">
              <h2 id="tex-h" className="text-xl font-bold">
                {exams.heading}
              </h2>
              <ul className="mt-3 flex flex-wrap gap-2">
                {exams.links.map((l) => (
                  <li key={l.href}>
                    <a href={l.href} className={CHIP}>
                      {l.label}
                    </a>
                  </li>
                ))}
              </ul>
            </section>
          )}
          {guides.length > 0 && (
            <section aria-labelledby="tgd-h" className="mt-10">
              <h2 id="tgd-h" className="text-xl font-bold">
                {tr('ui.search.guides')}
              </h2>
              <ul className="mt-3 list-disc space-y-2 pl-6">
                {guides.map((g) => (
                  <li key={g.href}>
                    <a href={g.href}>{g.label}</a>
                  </li>
                ))}
              </ul>
            </section>
          )}
          <p className="mt-8">
            <a href={localHref('/tools', lang)} className="font-semibold">
              {tr('site.tool.allTools')}
            </a>
          </p>
        </div>
      </RailLayout>
    </MainLayout>
  );
}
