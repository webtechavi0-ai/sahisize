/**
 * /exams/<family> exam-family hubs (docs/seo/keyword-map.md "Exams"): a comparison table
 * of every published exam in the family (from presets, with source and checked date),
 * written copy on what differs and the live photo, links down to each exam and document
 * page and to the tools, and an FAQ. Breadcrumb, FAQPage and ItemList JSON-LD.
 */
import type { Metadata } from 'next';
import MainLayout from '@/components/layout/MainLayout';
import Breadcrumbs from '@/components/site/Breadcrumbs';
import FaqList from '@/components/site/FaqList';
import Icon from '@/components/site/Icon';
import { t } from '@/i18n';
import { docSlug, getKitDocuments } from '@/content/presets';
import { familyMembers, hubFamilies, hubPath, type FamilySlug } from '@/seo/families';
import { hubCopy } from '@/seo/hub-copy';
import { fitTitle, clampDescription } from '@/seo/meta';
import { breadcrumbList, faqPage, itemList } from '@/seo/jsonld';
import { formatDate, verifiedSummary } from '@/seo/spec-text';
import { buildMetadata } from '@/seo/metadata';
import { toolNameKey } from '@/components/site/util';

export const dynamicParams = false;

export function generateStaticParams() {
  return hubFamilies().map((family) => ({ family: family.slug }));
}

type Params = Promise<{ family: string }>;

function familyOfSlug(slug: string) {
  return hubFamilies().find((f) => f.slug === (slug as FamilySlug))!;
}

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { family } = await params;
  const f = familyOfSlug(family);
  const copy = hubCopy(f.slug);
  const path = hubPath(f);
  return buildMetadata({
    title: fitTitle([copy.title]),
    description: clampDescription(copy.description),
    lang: 'en',
    canonicalPath: path,
    alternates: { en: path, hi: null },
    ogImage: '/og/exams.png',
  });
}

export default async function Page({ params }: { params: Params }) {
  const { family } = await params;
  const f = familyOfSlug(family);
  const lang = 'en' as const;
  const tr = (k: string, v?: Record<string, string | number>) => t(lang, k, v);
  const copy = hubCopy(f.slug);
  const members = familyMembers(f);
  const path = hubPath(f);
  const crumbs = [
    { name: tr('site.breadcrumb.home'), path: '/' },
    { name: tr('site.breadcrumb.exams'), path: '/exams' },
    { name: tr('site.hub.crumb', { family: f.name }), path },
  ];
  const anyLive = members.some((p) => p.photoUploadReplacedByLive);
  const docsOf = (p: (typeof members)[number]) => p.documents.filter((d) => d.doc !== 'photo');
  const photoOf = (p: (typeof members)[number]) => p.documents.find((d) => d.doc === 'photo');
  const toolSlugs = [
    'signature-resize',
    'thumb-impression',
    'compress-image',
    ...(members.some((p) => p.documents.some((d) => d.doc === 'declaration'))
      ? ['handwritten-declaration']
      : []),
    ...(members.some((p) => p.documents.some((d) => d.format === 'pdf')) ? ['compress-pdf'] : []),
  ];
  const jsonLd = [
    breadcrumbList(crumbs),
    itemList(
      copy.tableH2,
      members.map((p) => ({ name: p.name.en, path: `/exam/${p.slug}` })),
    ),
    faqPage(copy.faq),
  ];

  return (
    <MainLayout lang={lang} alternates={{ en: path, hi: null }} jsonLd={jsonLd}>
      <Breadcrumbs lang={lang} crumbs={crumbs} />
      <h1 className="text-2xl font-bold leading-tight sm:text-3xl">{copy.h1}</h1>
      <p className="mt-3 max-w-3xl text-lg">{copy.intro}</p>
      {anyLive && (
        <p className="mt-4 flex max-w-3xl gap-2 rounded-card border border-border bg-surface p-3">
          <Icon name="info" size={20} className="mt-0.5 shrink-0 text-primary" />
          <span>{tr('site.hub.liveNote', { family: f.name })}</span>
        </p>
      )}

      <section className="mt-8" aria-labelledby="cmp-h">
        <h2 id="cmp-h" className="mb-3 text-xl font-bold">
          {copy.tableH2}
        </h2>
        <div
          className="overflow-x-auto rounded-card border border-border bg-surface"
          role="region"
          aria-labelledby="cmp-h"
          // Keyboard-scrollable table region (WCAG 2.1.1).
          // eslint-disable-next-line jsx-a11y-x/no-noninteractive-tabindex
          tabIndex={0}
        >
          <table className="w-full min-w-[640px] border-collapse text-left text-sm" aria-labelledby="cmp-h">
            <thead className="bg-bg text-muted">
              <tr>
                <th scope="col" className="px-3 py-2 font-semibold">{tr('site.hub.colExam')}</th>
                <th scope="col" className="px-3 py-2 font-semibold">{tr('site.hub.colPhoto')}</th>
                <th scope="col" className="px-3 py-2 font-semibold">{tr('site.hub.colUploads')}</th>
                <th scope="col" className="px-3 py-2 font-semibold">{tr('site.hub.colSource')}</th>
              </tr>
            </thead>
            <tbody>
              {members.map((p) => {
                const photo = photoOf(p);
                return (
                  <tr key={p.slug} className="border-t border-border align-top">
                    <th scope="row" className="px-3 py-3 font-semibold text-text">
                      <a href={`/exam/${p.slug}`}>{p.name.en}</a>
                      <span className="block text-xs font-normal text-muted">{p.cycle}</span>
                    </th>
                    <td className="px-3 py-3">
                      {photo
                        ? verifiedSummary(photo)
                        : p.photoUploadReplacedByLive
                          ? tr('site.hub.livePhoto')
                          : '—'}
                    </td>
                    <td className="px-3 py-3">
                      <ul className="space-y-1">
                        {docsOf(p).map((d) => (
                          <li key={docSlug(d)}>
                            <span className="font-semibold">{d.label.en}:</span> {verifiedSummary(d)}
                            {d.optional && (
                              <span className="text-muted"> ({tr('site.exam.optional').toLowerCase()})</span>
                            )}
                          </li>
                        ))}
                      </ul>
                    </td>
                    <td className="px-3 py-3">
                      {`${p.notification}${p.sourcePage ? `, ${tr('site.exam.sourcePage', { page: p.sourcePage })}` : ''}`}
                      <span className="block text-muted">
                        {tr('site.hub.checked', { date: formatDate(p.lastChecked) })} ·{' '}
                        <a href={p.sourceUrl} rel="noopener nofollow external" target="_blank">
                          {tr('site.exam.source')}
                        </a>
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      <div
        className="prose mt-8 max-w-none dark:prose-invert prose-a:text-primary"
        dangerouslySetInnerHTML={{ __html: copy.html }}
      />

      <section className="mt-10" aria-labelledby="links-h">
        <h2 id="links-h" className="text-xl font-bold">{copy.linksH2}</h2>
        <ul className="mt-3 grid gap-3 sm:grid-cols-2">
          {members.map((p) => (
            <li key={p.slug} className="card p-4">
              <a href={`/exam/${p.slug}`} className="font-semibold">
                {tr('site.hub.examLink', { exam: p.name.en })}
              </a>
              <ul className="mt-1 flex flex-wrap gap-x-3 text-sm">
                {getKitDocuments(p).map((d) => (
                  <li key={docSlug(d)}>
                    <a href={`/exam/${p.slug}/${docSlug(d)}`} className="inline-flex min-h-tap items-center">
                      {d.label.en}
                    </a>
                  </li>
                ))}
              </ul>
            </li>
          ))}
        </ul>
        <h3 className="mt-6 font-bold">{tr('site.hub.toolsTitle', { family: f.name })}</h3>
        <ul className="mt-2 flex flex-wrap gap-2">
          {toolSlugs.map((s) => (
            <li key={s}>
              <a
                href={`/tools/${s}`}
                className="inline-flex min-h-tap items-center rounded-card border border-border bg-surface px-4 no-underline hover:border-primary"
              >
                {tr(toolNameKey(s))}
              </a>
            </li>
          ))}
        </ul>
      </section>

      <FaqList title={copy.faqH2} items={copy.faq} />

      <p className="mt-8">
        <a href="/exams" className="inline-flex min-h-tap items-center font-semibold">
          {tr('site.hub.allExams')}
        </a>
      </p>
    </MainLayout>
  );
}
