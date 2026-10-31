import type { Metadata } from 'next';
import ExamLayout, { examMetadata } from '@/components/layouts/ExamLayout';
import { getPreset, getPublishedPresets } from '@/content/presets';

export const dynamicParams = false;

export function generateStaticParams() {
  return getPublishedPresets().map((p) => ({ slug: p.slug }));
}

type Params = Promise<{ slug: string }>;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { slug } = await params;
  return examMetadata({ lang: 'en', preset: getPreset(slug)! });
}

export default async function Page({ params }: { params: Params }) {
  const { slug } = await params;
  return <ExamLayout lang="en" preset={getPreset(slug)!} />;
}
