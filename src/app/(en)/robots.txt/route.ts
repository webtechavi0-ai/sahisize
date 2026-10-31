import { SITE_URL } from '@/config/site';

export const dynamic = 'force-static';

/** robots.txt (SPEC 9.1). noindex pages carry their own meta robots tag. */
export function GET() {
  return new Response(
    ['User-agent: *', 'Allow: /', 'Disallow: /dev/', '', `Sitemap: ${SITE_URL}/sitemap-index.xml`, ''].join('\n'),
    { headers: { 'Content-Type': 'text/plain; charset=utf-8' } },
  );
}
