/** /sitemap-guides.xml (SPEC 9.1). */
import { getGuides } from '@/content/loaders';
import { guideUrls, renderUrlset } from '@/seo/sitemap';

export const dynamic = 'force-static';

export function GET() {
  return new Response(renderUrlset(guideUrls([...getGuides('en'), ...getGuides('hi')])), {
    headers: { 'Content-Type': 'application/xml; charset=utf-8' },
  });
}
