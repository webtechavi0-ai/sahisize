import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { ToolPage, toolPageMetadata, toolSlugs } from '@/components/tools/tools-registry';

export const dynamic = 'force-static';
export const dynamicParams = false;

export function generateStaticParams() {
  return toolSlugs('hi').map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  return toolPageMetadata('hi', slug);
}

export default async function Page({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  if (!toolSlugs('hi').includes(slug)) notFound();
  return <ToolPage lang="hi" slug={slug} />;
}
