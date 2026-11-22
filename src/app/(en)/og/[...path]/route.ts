/**
 * Static OG images, 1200×630 PNG, English. The list lives in src/seo/og-entries.ts:
 * /og/default.png, /og/home.png, /og/exams.png, /og/guides.png,
 * /og/exam/{slug}.png (document and Hindi pages reuse it), /og/tools/{slug}.png,
 * /og/guides/{slug}.png (every guide, including Hindi-only ones).
 */
import { ogEntries, ogEntry } from '@/seo/og-entries';
import { renderOgPng } from '@/seo/og-render';

export const dynamic = 'force-static';
export const dynamicParams = false;

/** Segments such as ['default.png'] or ['exam', 'ssc-cgl.png']. */
export function generateStaticParams() {
  return ogEntries().map((e) => ({ path: `${e.path}.png`.split('/') }));
}

export async function GET(_req: Request, ctx: { params: Promise<{ path: string[] }> }) {
  const { path } = await ctx.params;
  const entry = ogEntry(path.join('/').replace(/\.png$/, ''));
  if (!entry) return new Response('Not found', { status: 404 });
  const png = await renderOgPng(entry.props);
  return new Response(png as unknown as BodyInit, {
    headers: { 'Content-Type': 'image/png' },
  });
}
