/**
 * /exam/[slug]/postcard-photo: the exam-day postcard (4×6 inch) photo, for exams whose notice
 * asks for one to be printed and carried, never uploaded (NEET UG: pasted on the admit card
 * proforma). Specs from the preset's `printPhotos`, copy from seo/exam-seo.json. The static
 * segment wins over [document]; a preset document cannot use this slug (schema check).
 * Order: answer box, print tool (both full width, like a tool page), then the rules, steps, FAQ
 * and related links beside the side rail (4×6 drawing, source, other documents, illustration).
 * English only.
 */
import type { Metadata } from 'next';
import MainLayout from '@/components/layout/MainLayout';
import RailLayout from '@/components/layouts/RailLayout';
import BlockShell from '@/components/rail/BlockShell';
import { buildRail } from '@/components/rail/Rail';
import { ShapeSvg } from '@/components/rail/ShapeSvg';
import { artBlock, customBlock, linksBlock, sourceBlock } from '@/components/rail/blocks';
import { kbAndFormat } from '@/components/rail/rail-data';
import { railHeights } from '@/components/rail/rail-fit';
import Breadcrumbs from '@/components/site/Breadcrumbs';
import FaqList from '@/components/site/FaqList';
import Icon from '@/components/site/Icon';
import NoticeBadge from '@/components/site/NoticeBadge';
import ToolResize from '@/components/tools/widgets/ToolResize';
import { toolDict } from '@/components/tools/dict';
import { sizePreset } from '@/components/tools/size-presets';
import type { PrintPhotoSlug } from '@/config/exams';
import { examDocPath, examPath as examPathOf } from '@/config/routes';
import { t } from '@/i18n/server';
import { docSlug, kitDocuments, type PhysicalSize } from '@/lib/presets';
import { breadcrumbList, faqPage, howTo } from '@/seo/jsonld';
import { buildMetadata } from '@/seo/metadata';
import { formatDate, lowerLabel } from '@/seo/spec-text';
import { clampDescription, fitTitle } from '@/seo/text';
import { ogImagePath } from '@/seo/urls';
import { examShortName, familyOf, getPrintPhotoPage, printPhotoPages } from '@/server/content';

const PRINT: PrintPhotoSlug = 'postcard-photo';
const PRINT_DPI = 300;

export const dynamicParams = false;

export function generateStaticParams() {
  return printPhotoPages(PRINT).map((x) => ({ slug: x.preset.slug }));
}

type Params = Promise<{ slug: string }>;

/** "4×6 inch (10.2×15.2 cm)" */
function sizeText(s: PhysicalSize): string {
  const unit = s.unit === 'in' ? 'inch' : s.unit;
  if (s.unit !== 'in') return `${s.width}×${s.height} ${unit}`;
  const cm = (n: number) => Math.round(n * 25.4) / 10;
  return `${s.width}×${s.height} ${unit} (${cm(s.width)}×${cm(s.height)} cm)`;
}

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { slug } = await params;
  const { preset: p, copy, path } = getPrintPhotoPage(slug, PRINT)!;
  return buildMetadata({
    title: fitTitle([copy.title]),
    description: clampDescription(copy.description),
    lang: 'en',
    path,
    alternates: { en: path, hi: null },
    ogImage: ogImagePath(examPathOf(p.slug)),
  });
}

export default async function Page({ params }: { params: Params }) {
  const { slug } = await params;
  const { preset, photo, copy, path } = getPrintPhotoPage(slug, PRINT)!;
  // The print photo is cited on its own page of the notice; the source card and badge must
  // show that page, not the exam-level page of the upload documents.
  const p = { ...preset, sourcePage: photo.sourcePage ?? preset.sourcePage };
  const lang = 'en' as const;
  const tr = (k: string, v?: Record<string, string | number>) => t(lang, k, v);
  const examPath = examPathOf(p.slug);
  const short = examShortName(p);
  const photoName = lowerLabel(photo.label.en);
  const size = sizeText(photo.physical);
  const family = familyOf(p);
  const uploadPhoto = kitDocuments(p).find((d) => d.doc === 'photo');
  const crumbs = [
    { name: tr('site.breadcrumb.home'), path: '/' },
    { name: tr('site.breadcrumb.exams'), path: '/exams' },
    ...(family
      ? [
          {
            name: tr('site.hub.crumb', { family: family.name }),
            path: family.path,
          },
        ]
      : []),
    { name: p.name.en, path: examPath },
    { name: photo.label.en, path },
  ];
  const tool = sizePreset('postcard-size-photo', lang);
  const page = photo.sourcePage ? `, ${tr('site.exam.sourcePage', { page: photo.sourcePage })}` : '';
  const related = [
    ...(uploadPhoto
      ? [
          {
            href: examDocPath(p.slug, docSlug(uploadPhoto)),
            text: tr('site.print.uploadPhotoLink', {
              exam: short,
              doc: lowerLabel(uploadPhoto.label.en),
            }),
          },
        ]
      : []),
    { href: examPath, text: tr('site.print.examLink', { exam: short }) },
    { href: '/tools/postcard-size-photo', text: tr('site.print.postcardTool') },
    { href: '/tools/passport-photo-sheet', text: tr('site.print.sheetTool') },
    ...(family
      ? [
          {
            href: family.path,
            text: tr('site.hub.allFamily', { family: family.name }),
          },
        ]
      : []),
  ];
  const physUnit = photo.physical.unit === 'in' ? 'in' : photo.physical.unit;
  const otherDocs = kitDocuments(p).map((d) => ({
    href: examDocPath(p.slug, docSlug(d)),
    label: `${d.label.en} · ${kbAndFormat(d, lang)}`,
  }));
  const { rail, fit } = buildRail(
    [
      customBlock('doc-shape', true, railHeights.shape(false), (span) => (
        <BlockShell
          block="doc-shape"
          headingId="rail-shape-h"
          title={tr('site.rail.shapeTitle', { doc: photoName })}
          icon="crop"
          className={span}
        >
          <ShapeSvg
            shape={{
              kind: 'fixed',
              px: { w: photo.physical.width, h: photo.physical.height },
            }}
            doc="photo"
            format="jpg"
            labels={{
              w: `${photo.physical.width} ${physUnit}`,
              h: `${photo.physical.height} ${physUnit}`,
            }}
          />
          <p className="num mt-2 text-center text-[15px] font-semibold text-ink">{size}</p>
          <p className="text-center text-[13px] text-muted">{tr('site.print.rowUploadValue')}</p>
        </BlockShell>
      )),
      sourceBlock(p, lang),
      linksBlock(tr('site.doc.otherDocs', { exam: short }), otherDocs),
      artBlock({ routes: [examPath], group: p.group, fallbackRoutes: [family?.path] }, lang, true),
    ],
    lang,
  );
  const jsonLd = [
    breadcrumbList(crumbs),
    howTo({
      name: copy.h1,
      description: copy.description,
      totalTimeIso: 'PT5M',
      steps: copy.steps,
    }),
    faqPage(copy.faq),
  ];

  return (
    <MainLayout lang={lang} alternates={{ en: path, hi: null }} jsonLd={jsonLd}>
      <RailLayout
        topFull
        railLabel={tr('site.rail.docLabel', { exam: short, doc: photoName })}
        rail={rail}
        fit={fit}
        head={
          <>
            <Breadcrumbs lang={lang} crumbs={crumbs} />
            <h1 className="text-h1">{copy.h1}</h1>
            <p className="mt-2 text-lg">{copy.lead}</p>
          </>
        }
        top={
          <>
            {/* Answer box: the size and the one thing people get wrong (it is not uploaded). */}
            <section
              className="max-w-xl rounded-card border border-border bg-surface p-3 lg:max-w-3xl lg:p-4"
              aria-labelledby="answer-h"
              data-answer-box
            >
              <h2 id="answer-h" className="text-base font-bold">
                {tr('site.print.answerTitle', {
                  exam: short,
                  photo: photoName,
                })}
              </h2>
              <dl className="mt-2 grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-sm">
                <dt className="font-semibold">{tr('site.print.rowSize')}</dt>
                <dd>{size}</dd>
                <dt className="font-semibold">{tr('site.print.rowUpload')}</dt>
                <dd>{tr('site.print.rowUploadValue')}</dd>
                <dt className="font-semibold">{tr('site.print.rowUse')}</dt>
                <dd>{photo.use.en}</dd>
                {photo.count && (
                  <>
                    <dt className="font-semibold">{tr('site.print.rowCount')}</dt>
                    <dd>{photo.count.en}</dd>
                  </>
                )}
                <dt className="font-semibold">{tr('site.print.rowSource')}</dt>
                <dd>
                  {tr('site.print.source', {
                    notification: p.notification,
                    page,
                    date: formatDate(p.lastChecked),
                  })}
                  {' · '}
                  <a href={p.sourceUrl} rel="noopener nofollow" target="_blank">
                    {tr('site.print.sourceLink')}
                  </a>
                </dd>
              </dl>
            </section>

            <section className="mt-6" aria-labelledby="tool-h" data-doc-tool>
              <h2 id="tool-h" className="mb-3 text-xl font-bold">
                {tr('site.print.toolTitle', { size: size.split(' (')[0]! })}
              </h2>
              <ToolResize
                lang={lang}
                dict={toolDict(lang)}
                initial={{ ...tool.initial, dpi: PRINT_DPI }}
                sizes={tool.sizes}
                sizesLabel={tool.sizesLabel}
              />
            </section>
          </>
        }
      >
        <NoticeBadge lang={lang} preset={p} />

        <section className="mt-8" aria-labelledby="rules-h">
          <h2 id="rules-h" className="text-xl font-bold">
            {tr('site.print.rulesTitle', { photo: photoName })}
          </h2>
          <ul className="mt-3 space-y-2">
            {photo.rules.map((r) => (
              <li key={r.en} className="flex gap-2">
                <Icon name="check" size={20} className="mt-0.5 shrink-0 text-primary" />
                <span>{r.en}</span>
              </li>
            ))}
          </ul>
        </section>

        <section className="mt-10" aria-labelledby="steps-h">
          <h2 id="steps-h" className="text-xl font-bold">
            {tr('site.print.stepsTitle', { photo: photoName })}
          </h2>
          <ol className="mt-3 list-decimal space-y-2 pl-5">
            {copy.steps.map((s) => (
              <li key={s.name}>
                <strong>{s.name}.</strong> {s.text}
              </li>
            ))}
          </ol>
        </section>

        <FaqList title={tr('site.print.faqTitle', { exam: short, photo: photoName })} items={copy.faq} />

        <section className="mt-10" aria-labelledby="related-h">
          <h2 id="related-h" className="text-xl font-bold">
            {tr('site.print.relatedTitle', { exam: short })}
          </h2>
          <ul className="mt-3 list-disc space-y-1 pl-5">
            {related.map((l) => (
              <li key={l.href}>
                <a href={l.href}>{l.text}</a>
              </li>
            ))}
          </ul>
        </section>
      </RailLayout>
    </MainLayout>
  );
}
