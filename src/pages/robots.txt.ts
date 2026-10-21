import type { APIRoute } from 'astro';
import { SITE_URL } from '@/config/site';

/** robots.txt (SPEC 9.1). noindex pages carry their own meta robots tag. */
export const GET: APIRoute = () =>
  new Response(
    [
      'User-agent: *',
      'Allow: /',
      'Disallow: /dev/',
      '',
      `Sitemap: ${SITE_URL}/sitemap-index.xml`,
      '',
    ].join('\n'),
    { headers: { 'Content-Type': 'text/plain; charset=utf-8' } },
  );
