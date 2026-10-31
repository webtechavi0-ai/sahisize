import type { Metadata } from 'next';
import ExamLayout, { examMetadata } from '@/components/layouts/ExamLayout';
import { getPreset } from '@/content/presets';
import { hindiExamSlugs } from '@/seo/hreflang';

export const dynamicParams = false;

/** Top 30 exams (hi-top-exams.json ∩ published presets). */
export function generateStaticParams() {
  return hindiExamSlugs().map((slug) => ({ slug }));
}

type Params = Promise<{ slug: string }>;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { slug } = await params;
  return examMetadata({ lang: 'hi', preset: getPreset(slug)! });
}

export default async function Page({ params }: { params: Params }) {
  const { slug } = await params;
  return <ExamLayout lang="hi" preset={getPreset(slug)!} />;
}
