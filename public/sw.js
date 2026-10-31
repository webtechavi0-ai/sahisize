/* SahiSize service worker: offline app shell for an in-browser tool.
 *
 * Versioning: the build id comes from the registration URL, `/sw.js?v=<buildId>`. A new build
 * registers a new script URL, which installs a new worker with fresh cache names; old caches are
 * pruned on activate. Without `v` (local dev) the version is "dev".
 *
 * Strategies
 *  - Hashed, immutable assets: cache-first (/_next/static/*, /wasm/<name>.<hash>.wasm, /fonts/*).
 *  - Navigations: network-first (navigation preload when available, 4 s budget), then the cached
 *    page, then /offline.
 *  - Everything else (RSC payloads, API, OG images, sitemaps, cross-origin): network only.
 * Runtime caches are capped (oldest entries evicted first).
 */
const VERSION = new URL(self.location.href).searchParams.get('v') || 'dev';
const PREFIX = 'sahisize-';
const SHELL = `${PREFIX}shell-${VERSION}`;
const PAGES = `${PREFIX}pages-${VERSION}`;
const ASSETS = `${PREFIX}assets-${VERSION}`;
const CURRENT = new Set([SHELL, PAGES, ASSETS]);

const PRECACHE = ['/', '/exams', '/tools', '/offline', '/manifest.webmanifest', '/icon.svg'];
const OFFLINE_URL = '/offline';
const NAV_TIMEOUT_MS = 4000;
const MAX_PAGES = 60;
const MAX_ASSETS = 200;

const HASHED_ASSET = /^\/(?:_next\/static\/|fonts\/|wasm\/[a-z0-9-]+\.[0-9a-f]{8}\.wasm$)/;

self.addEventListener('install', (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(SHELL);
      // One missing page must not block the install; each URL is fetched fresh (no HTTP cache).
      await Promise.allSettled(
        PRECACHE.map(async (url) => {
          const res = await fetch(new Request(url, { cache: 'reload', credentials: 'same-origin' }));
          if (res.ok) await cache.put(url, res);
        }),
      );
      await self.skipWaiting();
    })(),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(keys.filter((k) => k.startsWith(PREFIX) && !CURRENT.has(k)).map((k) => caches.delete(k)));
      if (self.registration.navigationPreload) {
        try {
          await self.registration.navigationPreload.enable();
        } catch {
          // unsupported: plain fetch below
        }
      }
      await self.clients.claim();
    })(),
  );
});

self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') self.skipWaiting();
});

/** Evict the oldest entries (insertion order) beyond `max`. */
async function trim(cacheName, max) {
  const cache = await caches.open(cacheName);
  const keys = await cache.keys();
  const excess = keys.length - max;
  for (let i = 0; i < excess; i++) await cache.delete(keys[i]);
}

async function putAndTrim(cacheName, request, response, max) {
  const cache = await caches.open(cacheName);
  await cache.put(request, response);
  await trim(cacheName, max);
}

function cacheable(res) {
  return res && res.ok && res.status === 200 && res.type === 'basic';
}

async function assetResponse(event) {
  const { request } = event;
  const cache = await caches.open(ASSETS);
  const hit = await cache.match(request);
  if (hit) return hit;
  const res = await fetch(request);
  if (cacheable(res)) event.waitUntil(putAndTrim(ASSETS, request, res.clone(), MAX_ASSETS));
  return res;
}

function timeout(ms) {
  return new Promise((resolve) => setTimeout(() => resolve(null), ms));
}

async function cachedPage(request) {
  const url = new URL(request.url);
  const key = url.origin + url.pathname; // query strings do not change the page
  return (
    (await caches.match(key, { cacheName: PAGES })) ||
    (await caches.match(url.pathname, { cacheName: SHELL })) ||
    null
  );
}

async function navigationResponse(event) {
  const { request } = event;
  const url = new URL(request.url);
  const key = url.origin + url.pathname;
  const network = (async () => (await event.preloadResponse) || fetch(request))();
  // Registered synchronously (before any await) so the worker stays alive until the page is
  // stored; this handler runs before the page consumes the body, so clone() is safe.
  event.waitUntil(
    network
      .then((res) => (cacheable(res) ? putAndTrim(PAGES, key, res.clone(), MAX_PAGES) : undefined))
      .catch(() => {}),
  );

  try {
    const res = await Promise.race([network, timeout(NAV_TIMEOUT_MS)]);
    if (res) return res;
    // Slow network: serve the cached copy if there is one, otherwise keep waiting.
    const cached = await cachedPage(request);
    return cached || (await network);
  } catch {
    return (
      (await cachedPage(request)) ||
      (await caches.match(OFFLINE_URL, { cacheName: SHELL })) ||
      new Response('Offline', { status: 503, headers: { 'Content-Type': 'text/plain; charset=utf-8' } })
    );
  }
}

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET' || request.headers.has('range')) return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;
  if (url.pathname === '/sw.js') return;

  if (request.mode === 'navigate') {
    event.respondWith(navigationResponse(event));
    return;
  }
  // App Router RSC payloads are build-specific: always network.
  if (request.headers.get('RSC') === '1' || url.searchParams.has('_rsc')) return;
  if (HASHED_ASSET.test(url.pathname)) {
    event.respondWith(assetResponse(event));
  }
});
