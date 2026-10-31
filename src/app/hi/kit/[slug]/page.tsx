import type { Metadata } from 'next';
import KitLayout, { kitMetadata } from '@/components/layouts/KitLayout';
import { getKitDocuments, getPreset } from '@/content/presets';
import { hindiExamSlugs } from '@/seo/hreflang';

export const dynamicParams = false;

/** Same exams as /hi/exam/[slug], with at least one fittable document. */
export function generateStaticParams() {
  return hindiExamSlugs()
    .filter((slug) => getKitDocuments(getPreset(slug)!).length > 0)
    .map((slug) => ({ slug }));
}

type Params = Promise<{ slug: string }>;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { slug } = await params;
  return kitMetadata({ lang: 'hi', preset: getPreset(slug)! });
}

export default async function Page({ params }: { params: Params }) {
  const { slug } = await params;
  return <KitLayout lang="hi" preset={getPreset(slug)!} />;
}
