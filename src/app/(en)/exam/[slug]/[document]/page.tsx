/**
 * /exam/[slug]/[document] (SPEC 4): long-tail page per exam + document, with the
 * tool pre-set to that document. Only fittable documents (Q15) get a page.
 * Per-exam content (src/seo/doc-insights.ts) keeps sister exams' pages distinct:
 * notice line, the exam's own notes, comparison with sister exams, the exam's tips
 * and FAQs about this document.
 */
import { Fragment } from 'react';
import type { Metadata } from 'next';
import MainLayout from '@/components/layout/MainLayout';
import Breadcrumbs from '@/components/site/Breadcrumbs';
import NoticeBadge from '@/components/site/NoticeBadge';
import SpecTable from '@/components/site/SpecTable';
import RejectionTips from '@/components/site/RejectionTips';
import FaqList from '@/components/site/FaqList';
import PromoSlot from '@/components/site/PromoSlot';
import Icon from '@/components/site/Icon';
import KitSlot from '@/components/site/KitSlot';
import { t } from '@/i18n';
import { plural } from '@/i18n/core';
import { docSlug, getKitDocuments, getPreset, getPublishedPresets } from '@/content/presets';
import { examDocMeta, titleLabels } from '@/seo/meta';
import { breadcrumbList, faqPage, howTo } from '@/seo/jsonld';
import { ogPathFor } from '@/seo/og-image';
import { formatDate, lowerLabel, verifiedSummary } from '@/seo/spec-text';
import { toolsForDoc } from '@/seo/exam-links';
import { familyMembers, familyOf, hubPath } from '@/seo/families';
import {
  compareWithSisters,
  copyExcerpts,
  docFaqs,
  docTips,
  inlineMarkdown,
  seasonText,
  sistersOf,
} from '@/seo/doc-insights';
import { buildMetadata } from '@/seo/metadata';
import { getExamCopyHtml } from '@/content/loaders';
import { toolNameKey } from '@/components/site/util';
import { isVerifiedPreset } from '@/content/presets/verified';

export const dynamicParams = false;

export function generateStaticParams() {
  return getPublishedPresets().flatMap((preset) =>
    getKitDocuments(preset).map((doc) => ({ slug: preset.slug, document: docSlug(doc) })),
  );
}

type Params = Promise<{ slug: string; document: string }>;

function resolve(slug: string, document: string) {
  const preset = getPreset(slug)!;
  const doc = getKitDocuments(preset).find((d) => docSlug(d) === document)!;
  return { preset, doc };
}

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { slug, document } = await params;
  const { preset: p, doc: d } = resolve(slug, document);
  const examPath = `/exam/${p.slug}`;
  const path = `${examPath}/${docSlug(d)}`;
  const meta = examDocMeta(p, d, 'en');
  return buildMetadata({
    title: meta.title,
    description: meta.description,
    lang: 'en',
    canonicalPath: path,
    alternates: { en: path, hi: null },
    ogImage: ogPathFor(examPath),
  });
}

export default async function Page({ params }: { params: Params }) {
  const { slug, document } = await params;
  const { preset: p, doc: d } = resolve(slug, document);
  const lang = 'en' as const;
  const tr = (k: string, v?: Record<string, string | number>) => t(lang, k, v);
  const key = docSlug(d);
  const examPath = `/exam/${p.slug}`;
  const path = `${examPath}/${key}`;
  const meta = examDocMeta(p, d, lang);
  const summary = verifiedSummary(d, lang);
  const kitDocs = getKitDocuments(p);
  const others = kitDocs.filter((x) => docSlug(x) !== key);
  const family = familyOf(p);
  const crumbs = [
    { name: tr('site.breadcrumb.home'), path: '/' },
    { name: tr('site.breadcrumb.exams'), path: '/exams' },
    ...(family ? [{ name: tr('site.hub.crumb', { family: family.name }), path: hubPath(family) }] : []),
    { name: p.name.en, path: examPath },
    { name: d.label.en, path },
  ];
  const label = titleLabels(d)[0];
  const h1 = tr('site.doc.h1', { exam: p.name.en, doc: label, cycle: p.cycle });

  // Per-exam content.
  const sisters = sistersOf(p, getPublishedPresets(), family ? familyMembers(family) : []);
  const comparisons = compareWithSisters(p, d, sisters);
  const excerpts = copyExcerpts(
    getExamCopyHtml('en', p.slug),
    d,
    5,
    sisters.map((s) => getExamCopyHtml('en', s.slug)).filter((x): x is string => !!x),
  );
  const tips = docTips(p, d);
  const faqItems = docFaqs(p, d, sisters);
  const season = seasonText(p);
  const pageNote = p.sourcePage ? `, ${tr('site.exam.sourcePage', { page: p.sourcePage })}` : '';
  const docLower = lowerLabel(d.label.en);

  const jsonLd = [
    breadcrumbList(crumbs),
    howTo({
      name: h1,
      description: meta.description,
      totalTimeIso: 'PT1M',
      steps: [
        { name: 'Upload', text: d.captureTip?.en ?? `Take a photo of your ${docLower} or choose one from the gallery.` },
        { name: 'Crop', text: 'Crop inside the guide box. The box is locked to the right shape.' },
        { name: 'Auto-fit', text: `Auto-fit makes it ${summary}.` },
        { name: 'Download', text: `Download ${d.fileName} when every rule shows a tick.` },
      ],
    }),
    faqPage(faqItems),
  ];
  const noticeVars = {
    exam: p.name.en,
    cycle: p.cycle,
    body: p.body,
    notification: p.notification,
    page: pageNote,
    date: formatDate(p.lastChecked),
  };

  return (
    <MainLayout lang={lang} alternates={{ en: path, hi: null }} jsonLd={jsonLd}>
      <Breadcrumbs lang={lang} crumbs={crumbs} />
      <h1 className="text-2xl font-bold leading-tight sm:text-3xl">{h1}</h1>
      <p className="mt-2 text-lg">
        {tr(d.toVerify ? 'site.doc.introToVerify' : 'site.doc.intro', { exam: p.name.en, doc: docLower, summary })}
      </p>

      {/* Action first: the tool sits right under the intro; the rules and notes follow. */}
      <section className="mt-4 max-w-xl" aria-label={tr('site.doc.startDoc', { doc: docLower })} data-doc-tool>
        <KitSlot lang={lang} preset={p} only={key} />
      </section>

      <div className="mt-6">
        <NoticeBadge lang={lang} preset={p} />
      </div>
      {p.photoUploadReplacedByLive && (
        <p className="mt-4 flex gap-2 rounded-card border border-border bg-surface p-3">
          <Icon name="camera" size={20} className="mt-0.5 shrink-0 text-primary" />
          <span>
            {tr('site.doc.liveNote', { exam: p.name.en, doc: docLower })}{' '}
            <a href={`${examPath}#live-h`}>{tr('site.doc.liveLink')}</a>
          </span>
        </p>
      )}

      <section className="mt-6" aria-labelledby="spec-h">
        <h2 id="spec-h" className="mb-3 text-xl font-bold">
          {tr('site.doc.rulesTitle', { doc: docLower })}
        </h2>
        <SpecTable lang={lang} preset={p} only={[key]} />
        {d.captureTip && (
          <p className="mt-3 flex gap-2 rounded-card border border-border bg-surface p-3">
            <Icon name="info" size={20} className="mt-0.5 shrink-0 text-primary" />
            <span>
              <strong>{tr('site.doc.tipTitle')}:</strong> {d.captureTip.en}
            </span>
          </p>
        )}
      </section>

      <section className="mt-10" aria-labelledby="about-h">
        <h2 id="about-h" className="text-xl font-bold">
          {tr('site.doc.aboutTitle', { exam: p.name.en, doc: docLower })}
        </h2>
        <p className="mt-2">
          {isVerifiedPreset(p)
            ? tr('site.doc.noticeLine', noticeVars)
            : tr('site.doc.noticeLineUnverified', noticeVars)}
          {season && ` ${tr('site.doc.seasonLine', { exam: p.name.en, months: season })}`}
        </p>
        {excerpts.length > 0 && (
          <>
            <p className="mt-3 font-semibold">{tr('site.doc.fromCopy', { exam: p.name.en })}</p>
            <ul className="mt-1 list-disc space-y-1 pl-5">
              {excerpts.map((x, i) => (
                <li key={i} dangerouslySetInnerHTML={{ __html: inlineMarkdown(x) }} />
              ))}
            </ul>
          </>
        )}
        {comparisons.length > 0 && (
          <>
            <h3 className="mt-5 font-bold">{tr('site.doc.compareTitle', { exam: p.name.en, doc: docLower })}</h3>
            <ul className="mt-1 list-disc space-y-1 pl-5">
              {comparisons.map((c, ci) => (
                <li key={ci}>
                  {c.text}{' '}
                  {c.exams.map((x, i) => (
                    <Fragment key={x.slug}>
                      {i > 0 && ' · '}
                      <a href={`/exam/${x.slug}`}>{tr('site.doc.compareLink', { exam: x.name })}</a>
                    </Fragment>
                  ))}
                </li>
              ))}
            </ul>
          </>
        )}
      </section>

      <RejectionTips lang={lang} preset={p} tips={tips} />
      {/* The kit above already shows the declaration text on its trace sheet. */}
      <FaqList title={tr('site.doc.faqTitle', { exam: p.name.en, doc: docLower })} items={faqItems} />

      {others.length > 0 && (
        <section className="mt-10" aria-labelledby="other-h">
          <h2 id="other-h" className="text-xl font-bold">
            {tr('site.doc.otherDocs', { exam: p.name.en })}
          </h2>
          <ul className="mt-3 flex flex-wrap gap-2">
            {others.map((o) => (
              <li key={docSlug(o)}>
                <a
                  href={`${examPath}/${docSlug(o)}`}
                  className="inline-flex min-h-tap items-center rounded-card border border-border bg-surface px-4 no-underline hover:border-primary"
                >
                  {tr('site.exam.seeDoc', { doc: o.label.en })}
                </a>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="mt-10 flex flex-wrap gap-3">
        <a href={`/kit/${p.slug}`} className="btn-action">
          {plural(tr, 'site.doc.startFullKit', kitDocs.length)}
          <Icon name="arrowRight" size={20} />
        </a>
        <a href={examPath} className="inline-flex min-h-tap items-center px-2 font-semibold">
          {tr('site.doc.backToExam', { exam: p.name.en })}
        </a>
        {family && (
          <a href={hubPath(family)} className="inline-flex min-h-tap items-center px-2 font-semibold">
            {tr('site.hub.allFamily', { family: family.name })}
          </a>
        )}
        {toolsForDoc(d).map((x) => (
          <a key={x.path} href={x.path} className="inline-flex min-h-tap items-center px-2">
            {x.kb ? tr('site.home.compressTo', { n: x.kb }) : tr(toolNameKey(x.slug))}
          </a>
        ))}
      </section>

      <PromoSlot lang={lang} placement="exam" exam={p.slug} group={p.group} />
    </MainLayout>
  );
}
