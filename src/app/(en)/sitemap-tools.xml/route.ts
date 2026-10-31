/** /sitemap-tools.xml (SPEC 9.1). */

import { toolUrls, renderUrlset } from '@/seo/sitemap';

export const dynamic = 'force-static';

export function GET() {
  return new Response(renderUrlset(toolUrls()), {
    headers: { 'Content-Type': 'application/xml; charset=utf-8' },
  });
}
