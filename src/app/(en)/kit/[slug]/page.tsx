import type { Metadata } from 'next';
import KitLayout, { kitMetadata } from '@/components/layouts/KitLayout';
import { kitDocuments } from '@/lib/presets';
import { getPreset, publishedPresets } from '@/server/content';

export const dynamicParams = false;

/** Published presets with at least one fittable document. */
export function generateStaticParams() {
  return publishedPresets()
    .filter((p) => kitDocuments(p).length > 0)
    .map((p) => ({ slug: p.slug }));
}

type Params = Promise<{ slug: string }>;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { slug } = await params;
  return kitMetadata({ lang: 'en', preset: getPreset(slug)! });
}

export default async function Page({ params }: { params: Params }) {
  const { slug } = await params;
  return <KitLayout lang="en" preset={getPreset(slug)!} />;
}
