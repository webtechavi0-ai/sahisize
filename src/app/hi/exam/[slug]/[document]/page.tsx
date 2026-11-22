/**
 * /hi/exam/[slug]/[document]: Hindi pair of the English document page, only for the
 * pages whose Hindi copy exists in features/exam-document/doc-seo.json (hindiDocParams).
 * English-only insight text (comparisons, copy excerpts) is left out; everything shown
 * comes from Hindi messages, Hindi doc-seo copy or the preset's Hindi fields.
 */
import type { Metadata } from 'next';
import { t } from '@/i18n/server';
import { examDocPath, examPath as examPathOf } from '@/config/routes';
import { docSlug } from '@/lib/presets';
import { breadcrumbList, faqPage, howTo } from '@/seo/jsonld';
import { buildMetadata } from '@/seo/metadata';
import { ogImagePath } from '@/seo/urls';
import { getDocInsights } from '@/server/content';
import { buildDocPage, hindiDocParams } from '@/features/exam-document/page-model';
import DocPageBody from '@/features/exam-document/DocPageBody';

export const dynamicParams = false;

export function generateStaticParams() {
  return hindiDocParams().map(({ slug, doc }) => ({ slug, document: doc }));
}

type Params = Promise<{ slug: string; document: string }>;

function resolve(slug: string, document: string) {
  const insights = getDocInsights(slug, document)!;
  return { preset: insights.preset, doc: insights.doc, insights };
}

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { slug, document } = await params;
  const { preset: p, doc: d } = resolve(slug, document);
  const path = examDocPath(p.slug, docSlug(d));
  const meta = buildDocPage(p, d, 'hi');
  return buildMetadata({
    title: meta.title,
    description: meta.description,
    lang: 'hi',
    path: `/hi${path}`,
    alternates: { en: path, hi: `/hi${path}` },
    ogImage: ogImagePath(examPathOf(p.slug)),
  });
}

export default async function Page({ params }: { params: Params }) {
  const { slug, document } = await params;
  const { preset: p, doc: d, insights } = resolve(slug, document);
  const lang = 'hi' as const;
  const tr = (k: string, v?: Record<string, string | number>) => t(lang, k, v);
  const key = docSlug(d);
  const enPath = examDocPath(p.slug, key);
  const path = `/hi${enPath}`;
  const examPath = `/hi${examPathOf(p.slug)}`;
  const meta = buildDocPage(p, d, lang);
  const alternates = { en: enPath, hi: path };
  const examName = p.name.hi;
  const docLabel = d.label.hi;
  const crumbs = [
    { name: tr('site.breadcrumb.home'), path: '/hi' },
    { name: tr('site.breadcrumb.exams'), path: '/hi/exams' },
    { name: examName, path: examPath },
    { name: docLabel, path },
  ];
  const h1 = meta.h1;

  const jsonLd = [
    breadcrumbList(crumbs),
    howTo({
      name: h1,
      description: meta.description,
      totalTimeIso: 'PT1M',
      steps: [
        { name: 'फाइल चुनें', text: d.captureTip?.hi ?? `अपने ${docLabel} की फोटो लें या गैलरी से चुनें।` },
        { name: 'क्रॉप', text: 'गाइड बॉक्स के अंदर क्रॉप करें। बॉक्स सही आकार पर लॉक रहता है।' },
        { name: 'Auto-fit', text: 'Auto-fit फाइल को फॉर्म के नियमों के हिसाब से साइज़ में लाता है।' },
        { name: 'डाउनलोड', text: `हर नियम पर सही का निशान दिखे, तब ${d.fileName} डाउनलोड करें।` },
      ],
    }),
    faqPage(meta.faqs),
  ];

  return <DocPageBody lang={lang} insights={insights} meta={meta} crumbs={crumbs} jsonLd={jsonLd} alternates={alternates} />;
}
