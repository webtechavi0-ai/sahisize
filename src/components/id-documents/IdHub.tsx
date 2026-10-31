/**
 * /id-documents and /hi/id-documents: intro, a table of each official spec with its source
 * and checked date, links to each page, a "Not covered" list, FAQ, disclaimer top and foot.
 * Page metadata (title/description/og) comes from the route's generateMetadata.
 */
import MainLayout from '@/components/layout/MainLayout';
import Breadcrumbs from '@/components/site/Breadcrumbs';
import FaqList from '@/components/site/FaqList';
import ToolContent from '@/components/tools/ToolContent';
import IdDisclaimer from './IdDisclaimer';
import { t, localizePath } from '@/i18n';
import type { Lang } from '@/config/site';
import { ID_CHECKED_LABEL, ID_CHECKED_ON, ID_HUB, ID_NOT_COVERED, ID_PAGES } from '@/config/id-documents';
import { hubCopy } from './copy';
import { NOT_COVERED_ANCHOR } from '@/config/other-docs';
import { breadcrumbList, faqPage } from '@/seo/jsonld';

export default function IdHub({ lang }: { lang: Lang }) {
  const c = hubCopy(lang);
  const L = c.labels;
  const path = ID_HUB[lang];
  const crumbs = [
    { name: t(lang, 'site.breadcrumb.home'), path: localizePath('/', lang) },
    { name: t(lang, 'site.footer.idDocuments'), path },
  ];
  const href = (p: (typeof ID_PAGES)[number]) => (lang === 'hi' && p.hiPath ? p.hiPath : p.path);

  return (
    <MainLayout
      lang={lang}
      alternates={{ en: ID_HUB.en, hi: ID_HUB.hi }}
      hideSearch
      jsonLd={[breadcrumbList(crumbs), faqPage(c.faq)]}
    >
      <div className="max-w-4xl" data-id-page="hub">
        <Breadcrumbs lang={lang} crumbs={crumbs} />
        <h1 className="text-2xl font-bold leading-tight sm:text-3xl lg:text-4xl">{c.h1}</h1>
        <p className="mt-2 text-lg">{c.intro}</p>
        <IdDisclaimer lang={lang} place="top" />

        <section aria-labelledby="id-hub-spec-h" className="mt-8" data-id-spec>
          <h2 id="id-hub-spec-h" className="text-xl font-bold">{L.specTitle}</h2>
          <div className="mt-3 overflow-x-auto rounded-card border border-border bg-surface">
            <table className="w-full min-w-[560px] border-collapse text-left text-sm">
              <caption className="sr-only">{L.specTitle}</caption>
              <thead className="bg-bg text-muted">
                <tr>
                  <th scope="col" className="px-3 py-2 font-semibold">{L.colDocument}</th>
                  <th scope="col" className="px-3 py-2 font-semibold">{L.colSize}</th>
                  <th scope="col" className="px-3 py-2 font-semibold">{L.colKb}</th>
                  <th scope="col" className="px-3 py-2 font-semibold">{L.colFormat}</th>
                  <th scope="col" className="px-3 py-2 font-semibold">{L.colSource}</th>
                </tr>
              </thead>
              <tbody>
                {ID_PAGES.map((p) => (
                  <tr key={p.path} className="border-t border-border align-top">
                    <th scope="row" className="px-3 py-2 font-semibold">
                      <a href={href(p)}>{p.spec.label[lang]}</a>
                    </th>
                    <td className="px-3 py-2">
                      <span lang="en">{p.official.dimension}</span> ({p.spec.widthPx}×{p.spec.heightPx} px)
                    </td>
                    <td className="px-3 py-2">{p.official.maxKB} KB</td>
                    <td className="px-3 py-2">
                      {p.official.fileType}, {p.official.dpi} DPI
                    </td>
                    <td className="px-3 py-2">
                      <a href={p.sources[0]!.url} rel="noopener" target="_blank" lang="en" data-id-source>
                        Protean: {p.sources[0]!.title}
                      </a>
                      <br />
                      <time dateTime={ID_CHECKED_ON} data-id-checked>{ID_CHECKED_LABEL[lang]}</time>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {lang === 'hi' && (
            <p className="mt-2 text-sm text-muted" lang="en">
              Checked on 22 Oct 2026
            </p>
          )}
        </section>

        <section aria-labelledby="id-hub-pages-h" className="mt-10">
          <h2 id="id-hub-pages-h" className="text-xl font-bold">{L.pagesTitle}</h2>
          <ul className="mt-3 grid gap-3 sm:grid-cols-2">
            {ID_PAGES.map((p) => (
              <li key={p.path}>
                <a
                  href={href(p)}
                  className="card flex min-h-tap flex-col gap-1 p-4 no-underline transition-colors duration-150 hover:border-saffron"
                >
                  <span className="font-bold text-text">{p.spec.label[lang]}</span>
                  <span className="text-sm text-muted">
                    {p.spec.widthPx}×{p.spec.heightPx} px · {p.official.maxKB} KB · JPEG · {p.official.dpi} DPI
                  </span>
                </a>
              </li>
            ))}
          </ul>
        </section>

        <ToolContent lang={lang} sections={c.sections} collapsible={false} />

        <section id={NOT_COVERED_ANCHOR} aria-labelledby="id-hub-nc-h" className="mt-10 scroll-mt-4" data-id-not-covered>
          <h2 id="id-hub-nc-h" className="text-xl font-bold">{L.notCoveredTitle}</h2>
          <p className="mt-3">{L.notCoveredIntro}</p>
          <ul className="mt-3 list-disc space-y-2 pl-6">
            {ID_NOT_COVERED.map((n) => (
              <li key={n.url}>
                <strong>{n.name[lang]}.</strong> {n.reason[lang]}{' '}
                <a href={n.url} rel="noopener" target="_blank" lang="en">
                  {new URL(n.url).hostname}
                </a>
              </li>
            ))}
          </ul>
        </section>

        <FaqList title={t(lang, 'site.tool.faqTitle')} items={c.faq} />
        <IdDisclaimer lang={lang} place="bottom" />
      </div>
    </MainLayout>
  );
}
