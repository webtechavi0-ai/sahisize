import type { Metadata } from 'next';
import KitLayout, { kitMetadata } from '@/components/layouts/KitLayout';
import { getPreset, hindiKitSlugs } from '@/server/content';

export const dynamicParams = false;

/** Hindi exams with at least one fittable document. */
export function generateStaticParams() {
  return hindiKitSlugs().map((slug) => ({ slug }));
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
