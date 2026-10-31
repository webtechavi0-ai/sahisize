/** /sitemap-documents.xml (SPEC 9.1). */

import { documentUrls, renderUrlset } from '@/seo/sitemap';

export const dynamic = 'force-static';

export function GET() {
  return new Response(renderUrlset(documentUrls()), {
    headers: { 'Content-Type': 'application/xml; charset=utf-8' },
  });
}
