import { sitemapXml } from '@/server/content';
import { SITEMAP_HEADERS } from '@/seo/sitemap';

export const dynamic = 'force-static';

export function GET() {
  return new Response(sitemapXml('documents'), { headers: SITEMAP_HEADERS });
}
