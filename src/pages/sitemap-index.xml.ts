import type { APIRoute } from 'astro';
import { SITEMAP_TYPES, renderIndex } from '@/seo/sitemap';

export const GET: APIRoute = () =>
  new Response(renderIndex(SITEMAP_TYPES), { headers: { 'Content-Type': 'application/xml; charset=utf-8' } });
