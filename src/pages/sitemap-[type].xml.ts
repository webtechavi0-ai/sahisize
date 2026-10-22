/** /sitemap-{pages,exams,documents,tools,guides}.xml (SPEC 9.1). */
import type { APIRoute, GetStaticPaths } from 'astro';
import { getCollection } from 'astro:content';
import {
  SITEMAP_TYPES,
  documentUrls,
  examUrls,
  idDocumentsUrls,
  pagesUrls,
  renderUrlset,
  toolUrls,
  type SitemapUrl,
} from '@/seo/sitemap';

export const getStaticPaths: GetStaticPaths = () => SITEMAP_TYPES.map((type) => ({ params: { type } }));

async function guideUrls(): Promise<SitemapUrl[]> {
  const all = await getCollection('guides', (g) => !g.data.draft);
  const en = new Map(all.filter((g) => g.data.lang === 'en').map((g) => [g.data.slug, g]));
  const hi = new Map(all.filter((g) => g.data.lang === 'hi').map((g) => [g.data.slug, g]));
  const out: SitemapUrl[] = [];
  const iso = (d?: Date) => d?.toISOString().slice(0, 10);
  for (const [slug, g] of en) {
    const pair = hi.has(slug);
    const alternates = { en: `/guides/${slug}`, hi: pair ? `/hi/guides/${slug}` : null };
    out.push({ path: `/guides/${slug}`, alternates, lastmod: iso(g.data.updatedAt ?? g.data.publishedAt) });
  }
  for (const [slug, g] of hi) {
    const pair = en.has(slug);
    out.push({
      path: `/hi/guides/${slug}`,
      alternates: pair ? { en: `/guides/${slug}`, hi: `/hi/guides/${slug}` } : undefined,
      lastmod: iso(g.data.updatedAt ?? g.data.publishedAt),
    });
  }
  return out;
}

export const GET: APIRoute = async ({ params }) => {
  const type = params.type as (typeof SITEMAP_TYPES)[number];
  const urls =
    type === 'pages'
      ? pagesUrls()
      : type === 'exams'
        ? examUrls()
        : type === 'documents'
          ? documentUrls()
          : type === 'tools'
            ? toolUrls()
            : type === 'id-documents'
              ? idDocumentsUrls()
              : await guideUrls();
  return new Response(renderUrlset(urls), { headers: { 'Content-Type': 'application/xml; charset=utf-8' } });
};
