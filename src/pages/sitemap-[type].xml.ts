/** /sitemap-{pages,exams,documents,tools,guides}.xml (SPEC 9.1). */
import type { APIRoute, GetStaticPaths } from 'astro';
import { getCollection } from 'astro:content';
import {
  SITEMAP_TYPES,
  documentUrls,
  examUrls,
  guideUrls,
  idDocumentsUrls,
  pagesUrls,
  renderUrlset,
  toolUrls,
  type GuideEntryLike,
} from '@/seo/sitemap';

export const getStaticPaths: GetStaticPaths = () =>
  SITEMAP_TYPES.map((type) => ({ params: { type } }));

async function guideEntries(): Promise<GuideEntryLike[]> {
  const all = await getCollection('guides', (g) => !g.data.draft);
  return all.map((g) => ({
    slug: g.data.slug,
    lang: g.data.lang,
    publishedAt: g.data.publishedAt,
    updatedAt: g.data.updatedAt,
    filePath: g.filePath,
  }));
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
              : guideUrls(await guideEntries());
  return new Response(renderUrlset(urls), {
    headers: { 'Content-Type': 'application/xml; charset=utf-8' },
  });
};
