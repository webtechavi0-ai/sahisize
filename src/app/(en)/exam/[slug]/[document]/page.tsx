/**
 * /exam/[slug]/[document] (SPEC 4): long-tail page per exam + document, with the
 * tool pre-set to that document. Only fittable documents (Q15) get a page.
 * Per-exam content (getDocInsights) keeps sister exams' pages distinct:
 * notice line, the exam's own notes, comparison with sister exams, the exam's tips
 * and FAQs about this document.
 */
import type { Metadata } from 'next';
import { t } from '@/i18n/server';
import { examDocPath, examPath as examPathOf } from '@/config/routes';
import { docSlug } from '@/lib/presets';
import { breadcrumbList, faqPage, howTo } from '@/seo/jsonld';
import { lowerLabel, verifiedSummary } from '@/seo/spec-text';
import { buildMetadata } from '@/seo/metadata';
import { ogImagePath } from '@/seo/urls';
import { examDocParams, familyOf, getDocInsights } from '@/server/content';
import { buildDocPage, hasHindiDocPage } from '@/features/exam-document/page-model';
import DocPageBody from '@/features/exam-document/DocPageBody';

export const dynamicParams = false;

export function generateStaticParams() {
  return examDocParams().map(({ slug, doc }) => ({ slug, document: doc }));
}

type Params = Promise<{ slug: string; document: string }>;

function resolve(slug: string, document: string) {
  const insights = getDocInsights(slug, document)!;
  return { preset: insights.preset, doc: insights.doc, insights };
}

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { slug, document } = await params;
  const { preset: p, doc: d, insights } = resolve(slug, document);
  const examPath = examPathOf(p.slug);
  const path = examDocPath(p.slug, docSlug(d));
  const meta = buildDocPage(p, d, 'en', insights.faqs);
  return buildMetadata({
    title: meta.title,
    description: meta.description,
    lang: 'en',
    path,
    alternates: { en: path, hi: hasHindiDocPage(p.slug, docSlug(d)) ? `/hi${path}` : null },
    ogImage: ogImagePath(examPath),
  });
}

export default async function Page({ params }: { params: Params }) {
  const { slug, document } = await params;
  const { preset: p, doc: d, insights } = resolve(slug, document);
  const lang = 'en' as const;
  const tr = (k: string, v?: Record<string, string | number>) => t(lang, k, v);
  const key = docSlug(d);
  const examPath = examPathOf(p.slug);
  const path = examDocPath(p.slug, key);
  const meta = buildDocPage(p, d, lang, insights.faqs);
  const alternates = { en: path, hi: hasHindiDocPage(p.slug, key) ? `/hi${path}` : null };
  const summary = verifiedSummary(d, lang);
  const family = familyOf(p);
  const crumbs = [
    { name: tr('site.breadcrumb.home'), path: '/' },
    { name: tr('site.breadcrumb.exams'), path: '/exams' },
    ...(family ? [{ name: tr('site.hub.crumb', { family: family.name }), path: family.path }] : []),
    { name: p.name.en, path: examPath },
    { name: d.label.en, path },
  ];
  const h1 = meta.h1;

  const faqItems = meta.faqs;
  const docLower = lowerLabel(d.label.en);

  const jsonLd = [
    breadcrumbList(crumbs),
    howTo({
      name: h1,
      description: meta.description,
      totalTimeIso: 'PT1M',
      steps: [
        {
          name: 'Upload',
          text:
            d.captureTip?.en ?? `Take a photo of your ${docLower} or choose one from the gallery.`,
        },
        { name: 'Crop', text: 'Crop inside the guide box. The box is locked to the right shape.' },
        { name: 'Auto-fit', text: `Auto-fit makes it ${summary}.` },
        { name: 'Download', text: `Download ${d.fileName} when every rule shows a tick.` },
      ],
    }),
    faqPage(faqItems),
  ];
  return <DocPageBody lang={lang} insights={insights} meta={meta} crumbs={crumbs} jsonLd={jsonLd} alternates={alternates} />;
}
