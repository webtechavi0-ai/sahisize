/**
 * Liveness probe for Docker HEALTHCHECK, docker-compose and the Jenkins health-gated deploy.
 * Dynamic on purpose: it must answer from the running process, never from a prerendered file.
 */
export const dynamic = 'force-dynamic';

export function GET(): Response {
  return Response.json(
    { ok: true },
    {
      headers: {
        'Cache-Control': 'no-store',
        'X-Robots-Tag': 'noindex, nofollow',
      },
    },
  );
}

export function HEAD(): Response {
  return new Response(null, { status: 200, headers: { 'Cache-Control': 'no-store' } });
}
