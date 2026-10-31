/** Guide article from the JSON content (src/content/guides/hi/*.json). */
import { notFound } from 'next/navigation';
import GuideLayout, { guideMetadata } from '@/components/layouts/GuideLayout';
import { getGuide, getGuides, hasGuideCounterpart, type Guide } from '@/content/loaders';

const lang = 'hi' as const;

export const dynamicParams = false;

export function generateStaticParams() {
  return getGuides(lang).map((g) => ({ slug: g.slug }));
}

function layoutProps(g: Guide) {
  return {
    lang,
    title: g.title,
    seoTitle: g.seoTitle,
    description: g.description,
    slug: g.slug,
    publishedAt: new Date(g.publishedAt),
    updatedAt: g.updatedAt ? new Date(g.updatedAt) : undefined,
    relatedExams: g.relatedExams,
    relatedTools: g.relatedTools,
    hasCounterpart: hasGuideCounterpart(lang, g.slug),
  };
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const g = getGuide(lang, slug);
  if (!g) notFound();
  return guideMetadata(layoutProps(g));
}

export default async function Page({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const g = getGuide(lang, slug);
  if (!g) notFound();
  return (
    <GuideLayout {...layoutProps(g)}>
      <div dangerouslySetInnerHTML={{ __html: g.html }} />
    </GuideLayout>
  );
}
