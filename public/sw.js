/* SahiSize service worker: offline app shell.
 * - /_next/static, /wasm, /fonts: cache-first (content-hashed or stable).
 * - Navigations: network-first (3 s), fall back to cache, then /offline. */
const VERSION = 'v1';
const ASSETS = `sahisize-assets-${VERSION}`;
const PAGES = `sahisize-pages-${VERSION}`;
const PRECACHE = ['/', '/exams', '/tools', '/offline', '/icon.svg', '/manifest.webmanifest'];

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches
      .open(PAGES)
      .then((c) => Promise.allSettled(PRECACHE.map((u) => c.add(u))))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => ![ASSETS, PAGES].includes(k)).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

function timeout(ms) {
  return new Promise((_, rej) => setTimeout(() => rej(new Error('timeout')), ms));
}

self.addEventListener('fetch', (e) => {
  const { request } = e;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  if (/^\/(_next\/static|wasm|fonts)\//.test(url.pathname)) {
    e.respondWith(
      caches.open(ASSETS).then(async (c) => {
        const hit = await c.match(request);
        if (hit) return hit;
        const res = await fetch(request);
        if (res.ok) c.put(request, res.clone());
        return res;
      }),
    );
    return;
  }

  if (request.mode === 'navigate') {
    e.respondWith(
      (async () => {
        const c = await caches.open(PAGES);
        try {
          const res = await Promise.race([fetch(request), timeout(3000)]);
          if (res.ok) c.put(request, res.clone());
          return res;
        } catch {
          return (await c.match(request)) || (await c.match('/offline')) || Response.error();
        }
      })(),
    );
  }
});
