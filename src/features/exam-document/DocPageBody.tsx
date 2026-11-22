/**
 * Body of the exam-document pages (/exam/[slug]/[document] and the Hindi twin), shared by both
 * routes (inner-pages spec §5). Action first (answer box + the tool), then the side rail (shape,
 * tips, source, other documents, illustration), then the rules, notes, FAQ and links.
 * English-only insight text (season, copy excerpts, sister-exam comparisons, route examples)
 * renders only on English pages, as before.
 */
import { Fragment } from 'react';
import MainLayout from '@/components/layout/MainLayout';
import RailLayout from '@/components/layouts/RailLayout';
import Breadcrumbs from '@/components/site/Breadcrumbs';
import NoticeBadge from '@/components/site/NoticeBadge';
import SpecTable from '@/components/site/SpecTable';
import RejectionTips from '@/components/site/RejectionTips';
import FaqList from '@/components/site/FaqList';
import Icon from '@/components/site/Icon';
import KitSlot from '@/components/site/KitSlot';
import GuideLink from '@/components/site/GuideLink';
import { guideForDocument } from '@/components/site/guide-links';
import { toolNameKey } from '@/components/site/util';
import { RouteImages } from '@/components/media/RouteImages';
import { RichInline } from '@/components/content/RichText';
import { buildRail } from '@/components/rail/Rail';
import { artBlock, docShapeBlock, tipsBlock } from '@/components/rail/blocks';
import { examDocPath, examPath as examPathOf } from '@/config/routes';
import { t } from '@/i18n/server';
import { plural } from '@/i18n/core';
import type { Lang } from '@/i18n/config';
import { docSlug, isVerifiedPreset, kitDocuments } from '@/lib/presets';
import type { JsonLdObject } from '@/seo/jsonld';
import type { Alternates } from '@/seo/hreflang';
import { formatDate, lowerLabel } from '@/seo/spec-text';
import { familyOf, latinTitleName, localHref, toolsForDoc, type DocInsights } from '@/server/content';
import { DocAnswerBox, DocOtherChips, DocRelated } from './DocAnswer';
import type { DocPageModel } from './page-model';

export interface DocPageBodyProps {
  lang: Lang;
  insights: DocInsights;
  meta: DocPageModel;
  crumbs: { name: string; path: string }[];
  jsonLd: (JsonLdObject | null | undefined)[];
  alternates: Alternates;
}

export default function DocPageBody({ lang, insights, meta, crumbs, jsonLd, alternates }: DocPageBodyProps) {
  const { preset: p, doc: d } = insights;
  const tr = (k: string, v?: Record<string, string | number>) => t(lang, k, v);
  const en = lang === 'en';
  const key = docSlug(d);
  const enExamPath = examPathOf(p.slug);
  const enPath = examDocPath(p.slug, key);
  const examPath = en ? enExamPath : `/hi${enExamPath}`;
  const kitDocs = kitDocuments(p);
  const family = familyOf(p);
  const examName = p.name[lang];
  const docText = en ? lowerLabel(d.label.en) : d.label.hi;
  const pageNote = p.sourcePage ? `, ${tr('site.exam.sourcePage', { page: p.sourcePage })}` : '';
  const noticeVars = {
    exam: examName,
    cycle: p.cycle,
    body: p.body,
    notification: p.notification,
    page: pageNote,
    date: formatDate(p.lastChecked, lang),
  };
  const { comparisons, excerpts, tips, season } = insights;
  const otherTitle = tr('site.doc.otherDocs', { exam: examName });

  // Kept short (shape + source in one card, 2 tips, a cropped illustration) so the rail fits a
  // laptop screen and stays in view while the rules scroll (inner-pages spec §2, item 12).
  const { rail, fit } = buildRail(
    [
      docShapeBlock(d, lang, p),
      tipsBlock(p, tips, lang, true, 2),
      artBlock({ routes: [enPath, enExamPath], group: p.group, fallbackRoutes: [family?.path] }, lang, true),
    ],
    lang,
  );

  const head = (
    <>
      <Breadcrumbs lang={lang} crumbs={crumbs} />
      <h1 className="text-h1">{meta.h1}</h1>
      <p className="mt-2 max-w-[72ch] text-lg">{meta.lead}</p>
    </>
  );

  const top = (
    <>
      <DocAnswerBox lang={lang} preset={p} doc={d} short={latinTitleName(p)} model={meta} />
      {/* Action first: the tool sits right under the answer; the rules and notes follow. */}
      <section className="mt-4 max-w-xl lg:max-w-none" aria-label={tr('site.doc.startDoc', { doc: docText })} data-doc-tool>
        <KitSlot lang={lang} preset={p} only={key} />
        <GuideLink lang={lang} slug={guideForDocument(d.doc)} className="mt-3" />
      </section>
    </>
  );

  return (
    <MainLayout lang={lang} alternates={alternates} jsonLd={jsonLd}>
      <RailLayout
        head={head}
        top={top}
        rail={rail}
        fit={fit}
        railLabel={tr('site.rail.docLabel', { exam: latinTitleName(p), doc: docText })}
      >
        <DocOtherChips lang={lang} preset={p} model={meta} title={otherTitle} className="mb-6" />
        <NoticeBadge lang={lang} preset={p} part="window" />
        {p.photoUploadReplacedByLive && (
          <p className="mt-4 flex max-w-[72ch] gap-2 rounded-card border border-border bg-surface p-3">
            <Icon name="camera" size={20} className="mt-0.5 shrink-0 text-primary" />
            <span>
              {tr('site.doc.liveNote', { exam: examName, doc: docText })}{' '}
              <a href={`${examPath}#live-h`}>{tr('site.doc.liveLink')}</a>
            </span>
          </p>
        )}

        <section className="mt-6" aria-labelledby="spec-h">
          <h2 id="spec-h" className="mb-3 text-xl font-bold">
            {tr('site.doc.rulesTitle', { doc: docText })}
          </h2>
          <SpecTable lang={lang} preset={p} only={[key]} />
          {en && <RouteImages route={enPath} lang={lang} placements={['example-correct', 'example-rejected', 'step']} />}
          {d.captureTip && (
            <p className="mt-3 flex max-w-[72ch] gap-2 rounded-card border border-border bg-surface p-3">
              <Icon name="info" size={20} className="mt-0.5 shrink-0 text-primary" />
              <span>
                <strong>{tr('site.doc.tipTitle')}:</strong> {d.captureTip[lang]}
              </span>
            </p>
          )}
        </section>

        <section className="mt-10 max-w-[72ch]" aria-labelledby="about-h">
          <h2 id="about-h" className="text-xl font-bold">
            {tr('site.doc.aboutTitle', { exam: examName, doc: docText })}
          </h2>
          <p className="mt-2">
            {isVerifiedPreset(p) ? tr('site.doc.noticeLine', noticeVars) : tr('site.doc.noticeLineUnverified', noticeVars)}
            {en && season && ` ${tr('site.doc.seasonLine', { exam: examName, months: season })}`}
          </p>
          {en && excerpts.length > 0 && (
            <>
              <p className="mt-3 font-semibold">{tr('site.doc.fromCopy', { exam: examName })}</p>
              <ul className="mt-1 list-disc space-y-1 pl-5">
                {excerpts.map((x, i) => (
                  <li key={i}>
                    <RichInline content={x} />
                  </li>
                ))}
              </ul>
            </>
          )}
          {en && comparisons.length > 0 && (
            <>
              <h3 className="mt-5 font-bold">{tr('site.doc.compareTitle', { exam: examName, doc: docText })}</h3>
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
        <FaqList title={tr('site.doc.faqTitle', { exam: examName, doc: docText })} items={meta.faqs} />

        <DocRelated lang={lang} model={meta} />

        <section className="mt-10 flex flex-wrap gap-3">
          <a href={localHref(`/kit/${p.slug}`, lang)} className="btn-action">
            {plural(tr, 'site.doc.startFullKit', kitDocs.length)}
            <Icon name="arrowRight" size={20} />
          </a>
          <a href={examPath} className="inline-flex min-h-tap items-center px-2 font-semibold">
            {tr('site.doc.backToExam', { exam: examName })}
          </a>
          {en && family && (
            <a href={family.path} className="inline-flex min-h-tap items-center px-2 font-semibold">
              {tr('site.hub.allFamily', { family: family.name })}
            </a>
          )}
          {toolsForDoc(d).map((x) => (
            <a key={x.path} href={localHref(x.path, lang)} className="inline-flex min-h-tap items-center px-2">
              {x.kb ? tr('site.home.compressTo', { n: x.kb }) : tr(toolNameKey(x.slug))}
            </a>
          ))}
        </section>
      </RailLayout>
    </MainLayout>
  );
}
