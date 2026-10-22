// @ts-check
import { defineConfig } from 'astro/config';
import preact from '@astrojs/preact';
import mdx from '@astrojs/mdx';
import AstroPWA from '@vite-pwa/astro';
import { SITE_URL } from './src/config/site.ts';
import { CSP_DIRECTIVES, SCRIPT_RESOURCES, STYLE_RESOURCES } from './src/config/csp.ts';
import { manifest } from './src/config/pwa.ts';

const WASM_AND_HEAVY_DEPS = [
  '@jsquash/jpeg',
  '@jsquash/png',
  '@jsquash/webp',
  '@jsquash/resize',
  'libheif-js',
  'pdfjs-dist',
];

export default defineConfig({
  output: 'static',
  site: SITE_URL,
  // Cloudflare Pages: serve /tools/resize-image as-is, no 308 to a trailing slash (PLAN 1.6 #9).
  trailingSlash: 'never',
  build: { format: 'file', inlineStylesheets: 'never' },
  i18n: {
    defaultLocale: 'en',
    locales: ['en', 'hi'],
    routing: { prefixDefaultLocale: false },
  },
  integrations: [
    preact(),
    mdx(),
    AstroPWA({
      registerType: 'autoUpdate',
      injectRegister: false, // registered from Base.astro via virtual:pwa-register
      includeAssets: ['favicon.ico', 'apple-touch-icon.png', 'icon.svg', 'logo.svg'],
      manifest: { ...manifest, icons: [...manifest.icons], categories: [...manifest.categories] },
      workbox: {
        // Precache app shell (PLAN 3.15): assets, WASM, and the HTML for home, exams,
        // offline, 404, every tool and every kit page (EN + HI). Other pages are
        // runtime-cached (NetworkFirst) as they are visited.
        globPatterns: [
          '**/*.{js,css,woff2,svg,ico,webmanifest,wasm}',
          'pwa-*.png',
          'apple-touch-icon.png',
          'index.html',
          'hi.html',
          'exams.html',
          'hi/exams.html',
          'offline.html',
          '404.html',
          'tools.html',
          'tools/*.html',
          'kit/*.html',
          'hi/tools/*.html',
          'hi/kit/*.html',
        ],
        // libheif / pdfjs chunks (~1.5 MB each) and OG images are runtime-cached instead.
        globIgnores: [
          '**/og/**',
          '**/*libheif*',
          '**/*heif*',
          '**/pdf.worker*',
          '**/pdf-*.mjs',
          '**/pdfjs*',
          'dev/**',
        ],
        maximumFileSizeToCacheInBytes: 4 * 1024 * 1024,
        cleanupOutdatedCaches: true,
        // build.format 'file' emits /exams.html, served at /exams (no trailing slash).
        // Precache HTML under its clean URL so navigations hit the precache directly.
        manifestTransforms: [
          async (entries) => ({
            manifest: entries.map((e) => {
              if (!e.url.endsWith('.html')) return e;
              const clean = e.url === 'index.html' ? '/' : e.url.replace(/\.html$/, '');
              return { ...e, url: clean };
            }),
            warnings: [],
          }),
        ],
        // Offline fallback for an MPA: Workbox's `navigateFallback` answers EVERY
        // uncached navigation with the fallback (SPA semantics), even when online. So
        // navigations use NetworkFirst (below) and fall back to the precached '/offline'
        // page only when both network and cache fail (handlerDidError).
        navigateFallback: null,
        runtimeCaching: [
          {
            urlPattern: ({ url, sameOrigin }) => sameOrigin && url.pathname.startsWith('/_astro/'),
            handler: 'CacheFirst',
            options: {
              cacheName: 'astro-assets',
              expiration: { maxEntries: 200, maxAgeSeconds: 60 * 60 * 24 * 365 },
            },
          },
          {
            urlPattern: ({ request, sameOrigin }) => sameOrigin && request.mode === 'navigate',
            handler: 'NetworkFirst',
            options: {
              cacheName: 'pages',
              networkTimeoutSeconds: 3,
              expiration: { maxEntries: 100 },
              plugins: [
                {
                  handlerDidError: async () =>
                    (await caches.match('/offline', { ignoreSearch: true })) ?? Response.error(),
                },
              ],
            },
          },
        ],
      },
      devOptions: { enabled: false },
    }),
  ],
  experimental: {
    csp: {
      algorithm: 'SHA-256',
      directives: [...CSP_DIRECTIVES],
      scriptDirective: { resources: SCRIPT_RESOURCES },
      styleDirective: { resources: STYLE_RESOURCES },
    },
  },
  vite: {
    optimizeDeps: { exclude: WASM_AND_HEAVY_DEPS },
    worker: {
      format: 'es',
      rollupOptions: {
        // The pdf.js worker (src/engine/pdf-worker.ts) is emitted as /_astro/pdf.worker-[hash].js
        // so it gets the no-eval worker CSP and stays out of the precache (pdf.worker* rules).
        output: {
          entryFileNames: (chunk) =>
            chunk.name === 'pdf-worker' ? '_astro/pdf.worker-[hash].js' : '_astro/workers/[name]-[hash].js',
        },
      },
    },
    build: { assetsInlineLimit: 0 },
  },
});
