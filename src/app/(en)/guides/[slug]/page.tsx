import { notFound } from 'next/navigation';
import GuideLayout, { guideMetadata } from '@/components/layouts/GuideLayout';
import RichText from '@/components/content/RichText';
import { getGuide, guideSlugs, hasGuideCounterpart, type Guide } from '@/server/content';

const lang = 'en' as const;

export const dynamicParams = false;

export function generateStaticParams() {
  return guideSlugs(lang).map((slug) => ({ slug }));
}

function layoutProps(g: Guide) {
  return {
    lang,
    title: g.title,
    seoTitle: g.seoTitle,
    description: g.description,
    slug: g.slug,
    publishedAt: g.publishedAt,
    updatedAt: g.updatedAt,
    relatedExams: g.relatedExams,
    relatedTools: g.relatedTools,
    hasCounterpart: hasGuideCounterpart(g.slug, lang),
  };
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const g = getGuide(slug, lang);
  if (!g) notFound();
  return guideMetadata(layoutProps(g));
}

export default async function Page({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const g = getGuide(slug, lang);
  if (!g) notFound();
  return (
    <GuideLayout {...layoutProps(g)}>
      <RichText blocks={g.body} />
    </GuideLayout>
  );
}
