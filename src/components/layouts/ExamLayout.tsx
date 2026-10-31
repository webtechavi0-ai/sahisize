/**
 * Exam page template (SPEC 6.3), used by /exam/[slug] and /hi/exam/[slug].
 * Action first: H1, then one big "Make my files" button with a compact "What you'll need" list;
 * the reference content follows, still crawlable. All content comes from the preset.
 */
import type { Metadata } from 'next';
import MainLayout from '@/components/layout/MainLayout';
import Breadcrumbs from '@/components/site/Breadcrumbs';
import NoticeBadge from '@/components/site/NoticeBadge';
import SpecTable from '@/components/site/SpecTable';
import LiveCaptureTips from '@/components/site/LiveCaptureTips';
import RejectionTips from '@/components/site/RejectionTips';
import DeclarationText from '@/components/site/DeclarationText';
import ExamCopy from '@/components/site/ExamCopy';
import FaqList from '@/components/site/FaqList';
import RelatedExams from '@/components/site/RelatedExams';
import PromoSlot from '@/components/site/PromoSlot';
import AffiliateSlot from '@/components/site/AffiliateSlot';
import Icon from '@/components/site/Icon';
import Feedback from '@/components/site/Feedback';
import { ExamSelectTracker } from './ExamSelectTracker';
import { t, localizePath } from '@/i18n';
import { plural } from '@/i18n/core';
import type { Lang } from '@/config/site';
import type { ExamPreset } from '@/content/presets/schema';
import { docSlug, getKitDocuments } from '@/content/presets';
import { examH1, examMeta } from '@/seo/meta';
import { examSeo } from '@/seo/exam-seo';
import { familyOf, hubPath } from '@/seo/families';
import { breadcrumbList, faqPage, howTo } from '@/seo/jsonld';
import { hasHindiExam } from '@/seo/hreflang';
import { ogPathFor } from '@/seo/og-image';
import { toolsForExam } from '@/seo/exam-links';
import { localHref } from '@/seo/localize-href';
import { toolNameKey } from '@/components/site/util';
import { docSummary, kbText, lowerLabel } from '@/seo/spec-text';
import { buildMetadata } from '@/seo/metadata';

export interface ExamLayoutProps {
  lang: Lang;
  preset: ExamPreset;
}

function paths(p: ExamPreset, lang: Lang) {
  const enPath = `/exam/${p.slug}`;
  const hasHi = hasHindiExam(p.slug);
  return {
    enPath,
    hasHi,
    alternates: { en: enPath, hi: hasHi ? `/hi${enPath}` : null },
    path: lang === 'hi' ? `/hi${enPath}` : enPath,
  };
}

export function examMetadata({ lang, preset: p }: ExamLayoutProps): Metadata {
  const { enPath, alternates, path } = paths(p, lang);
  const meta = examMeta(p, lang);
  return buildMetadata({
    title: meta.title,
    description: meta.description,
    lang,
    canonicalPath: path,
    alternates,
    ogImage: ogPathFor(enPath),
  });
}

export default function ExamLayout({ lang, preset: p }: ExamLayoutProps) {
  const tr = (k: string, v?: Record<string, string | number>) => t(lang, k, v);
  const { enPath, hasHi, alternates, path } = paths(p, lang);
  const kitHref = lang === 'hi' && hasHi ? `/hi/kit/${p.slug}` : `/kit/${p.slug}`;
  const kitDocs = getKitDocuments(p);
  const meta = examMeta(p, lang);
  const h1 = examH1(p, lang);
  // Keyword copy (src/seo/exam-seo.ts) is English-only.
  const seo = lang === 'en' ? examSeo(p.slug) : undefined;
  const faqItems = [...p.faq.map((f) => ({ q: f.q[lang], a: f.a[lang] })), ...(seo?.faq ?? [])];
  // Exam-family hub (English only): breadcrumb level and "All SSC exams" link.
  const family = familyOf(p);
  const crumbs = [
    { name: tr('site.breadcrumb.home'), path: localizePath('/', lang) },
    { name: tr('site.breadcrumb.exams'), path: localizePath('/exams', lang) },
    ...(family && lang === 'en' ? [{ name: tr('site.hub.crumb', { family: family.name }), path: hubPath(family) }] : []),
    { name: p.name[lang], path },
  ];
  const tools = toolsForExam(p);
  const jsonLd = [
    breadcrumbList(crumbs),
    howTo({
      name: h1,
      description: meta.description,
      totalTimeIso: 'PT3M',
      steps: [
        {
          name: lang === 'hi' ? 'किट खोलें' : 'Open the kit',
          text: plural(tr, 'site.exam.startKit', kitDocs.length),
          path: kitHref,
        },
        ...kitDocs.map((d) => ({
          name: d.label[lang],
          text: `${d.label[lang]}: ${docSummary(d, lang)}. ${d.rules[0]?.[lang] ?? ''}`.trim(),
        })),
        {
          name: lang === 'hi' ? 'ZIP डाउनलोड करें' : 'Download all as ZIP',
          text:
            lang === 'hi'
              ? 'हर नियम पर टिक दिखने के बाद सभी फाइल एक ZIP में डाउनलोड करें।'
              : 'When every rule shows a tick, download all files as one ZIP.',
        },
      ],
    }),
    faqPage(faqItems),
  ];

  return (
    <MainLayout lang={lang} alternates={alternates} jsonLd={jsonLd}>
      <Feedback lang={lang} />
      <Breadcrumbs lang={lang} crumbs={crumbs} />
      <h1 className="text-2xl font-bold leading-tight text-text sm:text-3xl">{h1}</h1>

      {kitDocs.length > 0 && (
        <section className="card mt-4 max-w-xl p-4" aria-labelledby="need-h" data-exam-start>
          <a
            href={`${kitHref}#start`}
            className="btn-action min-h-[56px] w-full text-lg"
            data-exam-select={p.slug}
          >
            {kitDocs.length === 1
              ? tr('site.exam.ctaOne', {
                  exam: p.name[lang],
                  doc: lang === 'en' ? lowerLabel(kitDocs[0]!.label.en) : kitDocs[0]!.label[lang],
                })
              : tr('site.exam.cta', { exam: p.name[lang] })}
            <Icon name="arrowRight" size={20} />
          </a>
          <p className="mt-2 text-center text-sm text-muted">
            {tr('site.exam.ctaNote', { min: Math.max(1, kitDocs.length) })}
          </p>
          <h2 id="need-h" className="mt-4 font-bold">
            {tr('site.exam.needTitle')}
          </h2>
          <ul className="mt-1 divide-y divide-border">
            {kitDocs.map((d, i) => (
              <li key={docSlug(d)}>
                <a
                  href={`${enPath}/${docSlug(d)}`}
                  className="flex min-h-tap items-center gap-3 py-2 text-text no-underline hover:text-primary"
                >
                  <span
                    className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-saffron-soft text-sm font-bold text-ink"
                    aria-hidden="true"
                  >
                    {i + 1}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block font-semibold">{d.label[lang]}</span>
                    <span className="block text-sm text-muted">
                      {[kbText(d, lang), d.format.toUpperCase()].filter(Boolean).join(' · ')}
                    </span>
                  </span>
                  <Icon name="arrowRight" size={18} className="shrink-0 text-muted" />
                </a>
              </li>
            ))}
            {p.photoUploadReplacedByLive && (
              <li className="flex items-start gap-3 py-3 text-sm">
                <Icon name="camera" size={20} className="mt-0.5 shrink-0 text-primary" />
                <span>
                  {tr('site.exam.liveShort')}{' '}
                  <a href="#live-h" className="font-semibold">
                    {tr('site.exam.liveShortLink')}
                  </a>
                </span>
              </li>
            )}
          </ul>
          {kitDocs.length > 1 && <p className="mt-1 text-sm text-muted">{tr('site.exam.needOnly')}</p>}
        </section>
      )}

      {seo?.intro && <p className="mt-6 max-w-3xl text-lg">{seo.intro}</p>}
      <div className="mt-3">
        <NoticeBadge lang={lang} preset={p} />
      </div>

      <LiveCaptureTips lang={lang} preset={p} />

      <section aria-labelledby="spec-h" className="mt-6">
        <h2 id="spec-h" className="mb-3 text-xl font-bold">
          {seo?.specH2 ?? tr('site.exam.specTitle')}
        </h2>
        <SpecTable lang={lang} preset={p} docBase={enPath} />
      </section>

      <RejectionTips lang={lang} preset={p} />
      <DeclarationText lang={lang} preset={p} />
      <ExamCopy lang={lang} slug={p.slug} title={seo?.aboutH2 ?? tr('site.exam.aboutTitle', { exam: p.name[lang] })} />
      <FaqList title={seo?.faqH2 ?? tr('site.exam.faqTitle', { exam: p.name[lang] })} items={faqItems} />

      <section aria-labelledby="tools-h" className="mt-10">
        <h2 id="tools-h" className="text-xl font-bold">
          {tr('site.exam.toolsTitle')}
        </h2>
        <ul className="mt-3 flex flex-wrap gap-2">
          {tools.map((x) => (
            <li key={x.path}>
              <a
                href={localHref(x.path, lang)}
                className="inline-flex min-h-tap items-center rounded-card border border-border bg-surface px-4 no-underline hover:border-primary"
              >
                {x.kb ? tr('site.home.compressTo', { n: x.kb }) : tr(toolNameKey(x.slug))}
              </a>
            </li>
          ))}
        </ul>
      </section>

      {family && (
        <p className="mt-10">
          <a href={hubPath(family)} className="inline-flex min-h-tap items-center gap-1 font-semibold">
            {tr('site.hub.allFamily', { family: family.name })}
            <Icon name="arrowRight" size={18} />
          </a>
        </p>
      )}
      <RelatedExams lang={lang} preset={p} />
      <PromoSlot lang={lang} placement="exam" exam={p.slug} group={p.group} />
      <AffiliateSlot lang={lang} placement="exam" exam={p.slug} group={p.group} />
      <ExamSelectTracker />
    </MainLayout>
  );
}
