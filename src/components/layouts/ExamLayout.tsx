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
import { RouteImages } from '@/components/media/RouteImages';
import RailLayout from './RailLayout';
import { buildRail } from '@/components/rail/Rail';
import { artBlock, relatedBlock, sizesBlock, sourceBlock, tipsBlock } from '@/components/rail/blocks';
import RelatedExams from '@/components/site/RelatedExams';
import Icon from '@/components/site/Icon';
import Feedback from '@/components/site/Feedback';
import { ExamSelectTracker } from './ExamSelectTracker';
import { plural } from '@/i18n/core';
import { familyOf, hasHindiExam } from '@/server/content';
import { familyPath } from '@/config/routes';
import { breadcrumbList, faqPage, howTo } from '@/seo/jsonld';
import { toolNameKey } from '@/components/site/util';
import { docSummary, kbText, lowerLabel } from '@/seo/spec-text';
import { buildMetadata } from '@/seo/metadata';
import { t } from '@/i18n/server';
import { localizePath, type Lang } from '@/i18n/config';
import { type ExamPreset, docSlug, kitDocuments } from '@/lib/presets';
import {
  examH1,
  examIntro,
  examIntroShort,
  examMeta,
  examSeo,
  examShortName,
  examSpecTitle,
  generatedExamFaqs,
  nextCycleNote,
  toolsForExam,
  localHref,
} from '@/server/content';
import KitSlot from '@/components/site/KitSlot';
import { verifiedSummary } from '@/seo/spec-text';
import { ogImagePath } from '@/seo/urls';

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
    path: path,
    alternates,
    ogImage: ogImagePath(enPath),
  });
}

export default function ExamLayout({ lang, preset: p }: ExamLayoutProps) {
  const tr = (k: string, v?: Record<string, string | number>) => t(lang, k, v);
  const { enPath, hasHi, alternates, path } = paths(p, lang);
  const kitHref = lang === 'hi' && hasHi ? `/hi/kit/${p.slug}` : `/kit/${p.slug}`;
  const kitDocs = kitDocuments(p);
  const meta = examMeta(p, lang);
  const h1 = examH1(p, lang);
  // Keyword copy (src/seo/exam-seo.ts) is English-only.
  const seo = lang === 'en' ? examSeo(p.slug) : undefined;
  const baseFaq = [...p.faq.map((f) => ({ q: f.q[lang], a: f.a[lang] })), ...(seo?.faq ?? [])];
  // Generated from the preset (photo-size question, live-photo note, last date from applyWindow).
  const faqItems = [...baseFaq, ...generatedExamFaqs(p, lang, baseFaq)];
  const intro = examIntro(p, lang);
  const seasonNote = nextCycleNote(p, lang);
  // One uploadable document (SSC CGL, CHSL, CPO, MTS): the tool sits on the hub itself.
  const embedOnly = kitDocs.length === 1 ? docSlug(kitDocs[0]!) : null;
  // Exam-family hub (English only): breadcrumb level and "All SSC exams" link.
  const family = familyOf(p);
  const crumbs = [
    { name: tr('site.breadcrumb.home'), path: localizePath('/', lang) },
    { name: tr('site.breadcrumb.exams'), path: localizePath('/exams', lang) },
    ...(family && lang === 'en' ? [{ name: tr('site.hub.crumb', { family: family.name }), path: familyPath(family.slug) }] : []),
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

  const introShort = examIntroShort(p, lang);
  const fullIntro = intro ?? seo?.intro ?? null;
  const { rail, fit } = buildRail(
    [
      sizesBlock(p, lang),
      tipsBlock(p, p.rejectionTips, lang, true),
      sourceBlock(p, lang),
      relatedBlock(p, lang),
      artBlock({ routes: [enPath], group: p.group, fallbackRoutes: [family?.path] }, lang),
    ],
    lang,
  );

  const head = (
    <>
      <Feedback lang={lang} />
      <Breadcrumbs lang={lang} crumbs={crumbs} />
      <h1 className="text-h1">{h1}</h1>
      {introShort && (
        <p data-intro-short className="mt-2 max-w-[72ch] text-lead text-text">
          {introShort}
        </p>
      )}
    </>
  );

  const top = (
    <>
      {embedOnly && (
        <div className="max-w-xl lg:max-w-none" data-exam-select={p.slug}>
          <KitSlot lang={lang} preset={p} only={embedOnly} />
        </div>
      )}

      {kitDocs.length > 0 && !embedOnly && (
        <section className="card max-w-xl p-4 shadow-e1 lg:max-w-none lg:p-5" aria-labelledby="need-h" data-exam-start>
          <div className="lg:flex lg:items-center lg:gap-4">
            <a
              href={`${kitHref}#start`}
              className="btn-action min-h-[56px] w-full text-lg lg:w-auto lg:min-w-[320px] lg:px-8"
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
            <p className="mt-2 text-center text-sm text-muted lg:mt-0 lg:text-left">
              {tr('site.exam.ctaNote', { min: Math.max(1, kitDocs.length) })}
            </p>
          </div>
          <h2 id="need-h" className="mt-4 font-bold">
            {tr('site.exam.needTitle')}
          </h2>
          <ul className="mt-1 divide-y divide-border xl:grid xl:grid-cols-2 xl:gap-x-6 xl:divide-y-0">
            {kitDocs.map((d, i) => (
              <li key={docSlug(d)} className="xl:border-b xl:border-rule">
                <a
                  href={`${enPath}/${docSlug(d)}`}
                  className="flex min-h-tap items-center gap-3 py-2 text-text no-underline hover:text-primary"
                >
                  <span
                    className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-ink-soft text-sm font-bold text-ink"
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
              <li className="flex items-start gap-3 py-3 text-sm xl:border-b xl:border-rule">
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
          {kitDocs.length > 1 && <p className="mt-2 text-sm text-muted">{tr('site.exam.needOnly')}</p>}
        </section>
      )}
      {/* Answer box for live-photo exams: after the action, so the CTA stays on the first phone screen. */}
      {p.photoUploadReplacedByLive && kitDocs.length > 0 && (
        <dl
          className="card mt-4 grid max-w-xl grid-cols-1 gap-x-4 p-4 text-sm sm:grid-cols-[minmax(0,40%)_1fr] sm:gap-y-2 lg:max-w-none lg:grid-cols-[minmax(0,18rem)_1fr]"
          aria-label={tr('site.exam.answerLabel', { exam: lang === 'en' ? examShortName(p) : p.name[lang], cycle: p.cycle })}
          data-answer-box
        >
          <dt className="font-semibold">{tr('site.exams.docShort.photo')}</dt>
          <dd className="mb-2 sm:mb-0">{lang === 'en' ? tr('site.exam.answerLive') : tr('site.exam.liveShort')}</dd>
          {kitDocs.map((d) => (
            <div key={docSlug(d)} className="contents">
              <dt className="font-semibold">{d.label[lang]}</dt>
              <dd className="mb-2 sm:mb-0">{verifiedSummary(d, lang)}</dd>
            </div>
          ))}
        </dl>
      )}
    </>
  );

  return (
    <MainLayout lang={lang} alternates={alternates} jsonLd={jsonLd}>
      <RailLayout
        head={head}
        top={top}
        rail={rail}
        fit={fit}
        railLabel={tr('site.rail.examLabel', { exam: examShortName(p) })}
      >
        {fullIntro && (
          <p data-exam-intro className="max-w-[72ch] text-lead">
            {fullIntro}
          </p>
        )}
        <div className={fullIntro ? 'mt-3' : ''}>
          <NoticeBadge lang={lang} preset={p} part="window" />
        </div>
        {seasonNote && <p className="mt-2 max-w-[72ch] text-sm text-muted" data-season-note>{seasonNote}</p>}

        <LiveCaptureTips lang={lang} preset={p} />

        <section aria-labelledby="spec-h" className="mt-6">
          <h2 id="spec-h" className="mb-3 text-xl font-bold">
            {examSpecTitle(p, lang) ?? tr('site.exam.specTitle')}
          </h2>
          <SpecTable lang={lang} preset={p} docBase={enPath} />
          <RouteImages route={enPath} lang={lang} placements={['example-correct', 'example-rejected', 'step']} />
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
            <a href={familyPath(family.slug)} className="inline-flex min-h-tap items-center gap-1 font-semibold">
              {tr('site.hub.allFamily', { family: family.name })}
              <Icon name="arrowRight" size={18} />
            </a>
          </p>
        )}
        <RelatedExams lang={lang} preset={p} />
      </RailLayout>
      <ExamSelectTracker />
    </MainLayout>
  );
}
