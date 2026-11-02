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
import type { ToolSlug } from '@/config/tools';
import type { DocType } from '@/engine/types';
import { breadcrumbList, faqPage, howTo, webApplication } from '@/seo/jsonld';
import { hindiExamSlugs, hindiPathFor } from '@/server/content';
import { buildMetadata } from '@/seo/metadata';
import { t } from '@/i18n/server';
import { localizePath, type Lang } from '@/i18n/config';
import { kitDocuments } from '@/lib/presets';
import { seasonOrder, localHref } from '@/server/content';
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
  // name-date-on-photo: no generic exam list (most photo exams do not want a strip);
  // its copy links the published exams that do.
};

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
}: ToolLayoutProps) {
  const tr = (k: string, v?: Record<string, string | number>) => t(lang, k, v);
  const { hiPath, path } = resolvePath(enPath, lang);
  const docTypes = DOCS_FOR_TOOL[tool] ?? [];
  const hiExams = new Set(hindiExamSlugs());
  const exams = seasonOrder()
    .filter((p) => kitDocuments(p).some((d) => docTypes.includes(d.doc)))
    .slice(0, 8);
  const crumbs = [
    { name: tr('site.breadcrumb.home'), path: localizePath('/', lang) },
    { name: tr('site.breadcrumb.tools'), path: localizePath('/tools', lang) },
    { name: h1, path },
  ];

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
      <div>
        <div className="min-w-0">
          <Breadcrumbs lang={lang} crumbs={crumbs} />
          <h1 className="text-2xl font-bold leading-tight sm:text-3xl lg:text-4xl">{h1}</h1>
          <p className="mt-2 max-w-3xl text-base sm:text-lg">{intro}</p>

          {/* The "Processed on your device" line lives in the tool's uploader / file card
              (Uploader, SourceBar), so the layout does not repeat it under the title. */}
          <section className="mt-6" data-tool-slot={tool}>
            {children ?? <div className="card p-6 text-center text-muted">{tr('site.tool.placeholder')}</div>}
          </section>

          {/* SEO prose below the tool: readable line length on wide screens. */}
          <div className="max-w-4xl">
            {content}

            {steps.length > 0 && (
              <section aria-labelledby="how-h" className="mt-10">
                <h2 id="how-h" className="text-xl font-bold">
                  {tr('site.tool.howTitle')}
                </h2>
                <ol className="mt-3 list-decimal space-y-2 pl-6">
                  {steps.map((s) => (
                    <li key={s.name}>
                      <strong>{s.name}.</strong> {s.text}
                    </li>
                  ))}
                </ol>
              </section>
            )}

            <FaqList title={tr('site.tool.faqTitle')} items={faq} />

            {exams.length > 0 && (
              <section aria-labelledby="tex-h" className="mt-10">
                <h2 id="tex-h" className="text-xl font-bold">
                  {tr('site.tool.topExams')}
                </h2>
                <ul className="mt-3 flex flex-wrap gap-2">
                  {exams.map((p) => (
                    <li key={p.slug}>
                      <a
                        href={lang === 'hi' && hiExams.has(p.slug) ? `/hi/exam/${p.slug}` : `/exam/${p.slug}`}
                        className="inline-flex min-h-tap items-center rounded-xl border border-rule bg-card px-4 no-underline transition-colors duration-150 hover:border-saffron hover:bg-saffron-soft"
                      >
                        {p.name[lang]}
                      </a>
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
        </div>
      </div>
    </MainLayout>
  );
}
