/**
 * Govt ID Documents spec page (/id-documents/*). Like the Tool layout, but with its own breadcrumb,
 * compact disclaimer near the top and full disclaimer at the foot, the official spec table after the
 * tool, no exam links, no sponsored promo and no header exam search.
 * JSON-LD: BreadcrumbList, WebApplication, HowTo, FAQPage (no government types).
 * children -> the tool; `content` -> prose after the spec table.
 */
import type { ReactNode } from 'react';
import type { Metadata } from 'next';
import MainLayout from '@/components/layout/MainLayout';
import Breadcrumbs from '@/components/site/Breadcrumbs';
import FaqList from '@/components/site/FaqList';
import IdDisclaimer from '@/components/id-documents/IdDisclaimer';
import IdSpecTable from '@/components/id-documents/IdSpecTable';
import { t, localizePath } from '@/i18n';
import type { Lang } from '@/config/site';
import { ID_HUB, ID_PAGES, type IdDocPage } from '@/config/id-documents';
import type { IdCopy } from '@/components/id-documents/copy';
import { breadcrumbList, faqPage, howTo, webApplication } from '@/seo/jsonld';
import { buildMetadata } from '@/seo/metadata';

export interface IdDocumentLayoutProps {
  lang?: Lang;
  page: IdDocPage;
  copy: IdCopy;
  content?: ReactNode;
  children?: ReactNode;
}

export function idDocumentMetadata({ lang = 'en', page, copy: c }: IdDocumentLayoutProps): Metadata {
  const path = lang === 'hi' && page.hiPath ? page.hiPath : page.path;
  return buildMetadata({
    title: c.title,
    description: c.description,
    lang,
    canonicalPath: path,
    alternates: { en: page.path, hi: page.hiPath },
    ogImage: '/og/default.png',
  });
}

export default function IdDocumentLayout({ lang = 'en', page, copy: c, content, children }: IdDocumentLayoutProps) {
  const tr = (k: string) => t(lang, k);
  const path = lang === 'hi' && page.hiPath ? page.hiPath : page.path;
  const hubPath = ID_HUB[lang];
  const crumbs = [
    { name: tr('site.breadcrumb.home'), path: localizePath('/', lang) },
    { name: tr('site.footer.idDocuments'), path: hubPath },
    { name: page.spec.label[lang], path },
  ];
  const others = ID_PAGES.filter((p) => p.slug !== page.slug);
  const chip =
    'inline-flex min-h-tap items-center rounded-xl border border-rule bg-card px-4 no-underline hover:border-saffron';

  return (
    <MainLayout
      lang={lang}
      alternates={{ en: page.path, hi: page.hiPath }}
      hideSearch
      jsonLd={[
        breadcrumbList(crumbs),
        webApplication({ name: c.h1, description: c.description, path, lang }),
        c.steps.length ? howTo({ name: c.h1, description: c.description, steps: c.steps }) : null,
        faqPage(c.faq),
      ]}
    >
      <div className="min-w-0" data-id-page={page.slug}>
        <Breadcrumbs lang={lang} crumbs={crumbs} />
        <h1 className="text-2xl font-bold leading-tight sm:text-3xl lg:text-4xl">{c.h1}</h1>
        <p className="mt-2 max-w-3xl">{c.intro}</p>
        <IdDisclaimer lang={lang} place="top" page={page} />

        <section className="mt-4" data-tool-slot={page.slug}>
          {children}
        </section>

        <div className="max-w-4xl">
          <IdSpecTable lang={lang} page={page} />
          {content}

          {c.steps.length > 0 && (
            <section aria-labelledby="how-h" className="mt-10">
              <h2 id="how-h" className="text-xl font-bold">
                {tr('site.tool.howTitle')}
              </h2>
              <ol className="mt-3 list-decimal space-y-2 pl-6">
                {c.steps.map((s) => (
                  <li key={s.name}>
                    <strong>{s.name}.</strong> {s.text}
                  </li>
                ))}
              </ol>
            </section>
          )}

          <FaqList title={tr('site.tool.faqTitle')} items={c.faq} />

          <nav aria-labelledby="id-more-h" className="mt-10">
            <h2 id="id-more-h" className="text-xl font-bold">
              {tr('site.footer.idDocuments')}
            </h2>
            <ul className="mt-3 flex flex-wrap gap-2">
              {others.map((p) => (
                <li key={p.slug}>
                  <a href={lang === 'hi' && p.hiPath ? p.hiPath : p.path} className={chip}>
                    {p.spec.label[lang]}
                  </a>
                </li>
              ))}
              <li>
                <a href={hubPath} className={chip}>
                  {lang === 'hi' ? 'सभी साइज़ और सोर्स' : 'All sizes and sources'}
                </a>
              </li>
            </ul>
          </nav>

          <IdDisclaimer lang={lang} place="bottom" />
        </div>
      </div>
    </MainLayout>
  );
}
