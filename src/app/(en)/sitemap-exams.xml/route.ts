/** /sitemap-exams.xml (SPEC 9.1). */

import { examUrls, renderUrlset } from '@/seo/sitemap';

export const dynamic = 'force-static';

export function GET() {
  return new Response(renderUrlset(examUrls()), {
    headers: { 'Content-Type': 'application/xml; charset=utf-8' },
  });
}
