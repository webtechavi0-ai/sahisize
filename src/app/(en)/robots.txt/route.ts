import { ROBOTS_HEADERS, renderRobots } from '@/seo/sitemap';

export const dynamic = 'force-static';

export function GET() {
  return new Response(renderRobots(), { headers: ROBOTS_HEADERS });
}
