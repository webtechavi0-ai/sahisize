import { SITEMAP_TYPES, renderIndex } from '@/seo/sitemap';

export const dynamic = 'force-static';

export function GET() {
  return new Response(renderIndex(SITEMAP_TYPES), {
    headers: { 'Content-Type': 'application/xml; charset=utf-8' },
  });
}
