import type { Metadata } from 'next';
import KitLayout, { kitMetadata } from '@/components/layouts/KitLayout';
import { getKitDocuments, getPreset, getPublishedPresets } from '@/content/presets';

export const dynamicParams = false;

/** Published presets with at least one fittable document. */
export function generateStaticParams() {
  return getPublishedPresets()
    .filter((p) => getKitDocuments(p).length > 0)
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
