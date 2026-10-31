/** /sitemap-id-documents.xml (SPEC 9.1). */

import { idDocumentsUrls, renderUrlset } from '@/seo/sitemap';

export const dynamic = 'force-static';

export function GET() {
  return new Response(renderUrlset(idDocumentsUrls()), {
    headers: { 'Content-Type': 'application/xml; charset=utf-8' },
  });
}
