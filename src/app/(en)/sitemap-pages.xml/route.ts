/** /sitemap-pages.xml (SPEC 9.1). */

import { pagesUrls, renderUrlset } from '@/seo/sitemap';

export const dynamic = 'force-static';

export function GET() {
  return new Response(renderUrlset(pagesUrls()), {
    headers: { 'Content-Type': 'application/xml; charset=utf-8' },
  });
}
