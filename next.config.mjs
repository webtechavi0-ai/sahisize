// @ts-check
/**
 * Next.js configuration for SahiSize.
 *
 * Runtime: `output: 'standalone'` (a self-contained Node server, see Dockerfile). Every page is
 * still prerendered at build time; the server only serves those files plus a few dynamic
 * handlers (/healthz). Response headers that Cloudflare Pages used to read from
 * public/_headers and public/_redirects now live in `headers()` and `redirects()` below.
 */
import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const isDev = process.env.NODE_ENV !== 'production';
const projectRoot = dirname(fileURLToPath(import.meta.url));

/**
 * `next build` runs ESLint and the TypeScript checker by default. CI (Jenkinsfile) already runs
 * `npm run lint` and `npm run typecheck` as separate stages, and repeating them inside the build
 * doubled peak memory on the CI agent. CI sets SKIP_BUILD_CHECKS=1 to skip the duplicate run;
 * every other build (local, Docker) keeps both checks on.
 */
const skipBuildChecks = process.env.SKIP_BUILD_CHECKS === '1';

/** Google Analytics 4 (gtag.js), loaded by the root layouts. */
const GA_SCRIPT = 'https://www.googletagmanager.com';
const GA_CONNECT = [
  'https://www.googletagmanager.com',
  'https://*.google-analytics.com',
  'https://*.analytics.google.com',
];

/**
 * Document Content-Security-Policy.
 *
 * - script-src keeps 'unsafe-inline' because pages are prerendered once at build time: Next's
 *   RSC payload scripts, JSON-LD and the theme bootstrap are inline, and nonces need per-request
 *   rendering. No user-controlled HTML is ever rendered, which is the real XSS defence.
 * - 'wasm-unsafe-eval' lets the engine compile WebAssembly without allowing JS eval.
 * - worker-src 'self' blob: covers the engine worker and pdf.js worker.
 * - 'unsafe-eval' is added in development only (React Refresh / webpack eval source maps).
 */
const csp = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline' 'wasm-unsafe-eval'${isDev ? " 'unsafe-eval'" : ''} ${GA_SCRIPT}`,
  "style-src 'self' 'unsafe-inline'",
  `img-src 'self' data: blob: ${GA_CONNECT.join(' ')}`,
  "font-src 'self'",
  `connect-src 'self' blob: data: ${GA_CONNECT.join(' ')}${isDev ? ' ws: wss:' : ''}`,
  "media-src 'self' blob:",
  "worker-src 'self' blob:",
  "manifest-src 'self'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
  ...(isDev ? [] : ['upgrade-insecure-requests']),
].join('; ');

/**
 * A worker's CSP comes from its own response, not from the page. The engine worker needs
 * 'unsafe-eval' in addition to 'wasm-unsafe-eval' so WASM compiles on Chrome 90-96. The pdf.js
 * worker parses untrusted PDFs, so it gets no eval at all. Later rules override earlier ones
 * for the same header key, so these must stay after the catch-all rule.
 */
const ENGINE_WORKER_CSP =
  "script-src 'self' 'wasm-unsafe-eval' 'unsafe-eval'; object-src 'none'; base-uri 'none'";
const PDF_WORKER_CSP = "script-src 'self'; object-src 'none'; base-uri 'none'";

const permissionsPolicy = [
  'camera=(self)',
  'microphone=()',
  'geolocation=()',
  'payment=()',
  'usb=()',
  'serial=()',
  'hid=()',
  'bluetooth=()',
  'midi=()',
  'accelerometer=()',
  'gyroscope=()',
  'magnetometer=()',
  'display-capture=()',
  'screen-wake-lock=()',
  'xr-spatial-tracking=()',
  'publickey-credentials-get=()',
  'browsing-topics=()',
  'fullscreen=(self)',
].join(', ');

/** @type {import('next').NextConfig['headers']} */
async function headers() {
  return [
    {
      source: '/:path*',
      headers: [
        { key: 'Strict-Transport-Security', value: 'max-age=31536000; includeSubDomains' },
        { key: 'Content-Security-Policy', value: csp },
        { key: 'X-Content-Type-Options', value: 'nosniff' },
        { key: 'X-Frame-Options', value: 'DENY' },
        { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
        { key: 'Cross-Origin-Opener-Policy', value: 'same-origin' },
        { key: 'Permissions-Policy', value: permissionsPolicy },
      ],
    },
    // Worker scripts emitted by webpack for `new Worker(new URL(...))`.
    ...['media', 'chunks'].flatMap((dir) => [
      {
        source: `/_next/static/${dir}/:file(.*worker.*)`,
        headers: [{ key: 'Content-Security-Policy', value: ENGINE_WORKER_CSP }],
      },
      {
        source: `/_next/static/${dir}/:file(.*pdf.*worker.*)`,
        headers: [{ key: 'Content-Security-Policy', value: PDF_WORKER_CSP }],
      },
    ]),
    // /_next/static/* already gets `public, max-age=31536000, immutable` from Next itself, and
    // Next overwrites Cache-Control on pages, so neither is set here.
    //
    // Codec binaries are content-hashed by scripts/copy-wasm.mjs (jpeg-enc.<sha8>.wasm), so they
    // are immutable. Self-hosted fonts are versioned by file name: rename a font file whenever
    // its contents change.
    {
      source: '/wasm/:file*',
      headers: [
        { key: 'Content-Type', value: 'application/wasm' },
        { key: 'Cache-Control', value: 'public, max-age=31536000, immutable' },
      ],
    },
    {
      source: '/fonts/:file*',
      headers: [{ key: 'Cache-Control', value: 'public, max-age=31536000, immutable' }],
    },
    // The service worker must always revalidate so updates reach users.
    {
      source: '/sw.js',
      headers: [
        { key: 'Cache-Control', value: 'no-cache' },
        { key: 'Service-Worker-Allowed', value: '/' },
      ],
    },
    // Health endpoint and any accidental dev route must never be indexed.
    {
      source: '/healthz',
      headers: [
        { key: 'X-Robots-Tag', value: 'noindex, nofollow' },
        { key: 'Cache-Control', value: 'no-store' },
      ],
    },
  ];
}

/**
 * Legacy .html URLs -> clean URLs (one 301 hop, no loops: no destination ends in .html).
 * Trailing slashes are handled by Next itself (`trailingSlash: false` -> 308 to the bare path).
 * www -> apex is handled by the nginx in front of the container.
 *
 * @type {import('next').NextConfig['redirects']}
 */
async function redirects() {
  return [
    { source: '/index\\.html', destination: '/', statusCode: 301 },
    { source: '/:path(.+)/index\\.html', destination: '/:path', statusCode: 301 },
    { source: '/:path(.+)\\.html', destination: '/:path', statusCode: 301 },
  ];
}

/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  outputFileTracingRoot: projectRoot,
  trailingSlash: false,
  reactStrictMode: true,
  poweredByHeader: false,
  compress: true,
  // OG images are rendered with satori + resvg at build time; both ship native/wasm code that
  // must not be bundled.
  serverExternalPackages: ['@resvg/resvg-js', 'satori'],
  // There is no image CDN and the standalone image has no `sharp`. All images are small static
  // SVG/PNG assets (users' photos never leave the browser), so next/image serves them as is.
  images: { unoptimized: true },
  experimental: {
    globalNotFound: true,
    webpackMemoryOptimizations: true,
  },
  typescript: { ignoreBuildErrors: skipBuildChecks },
  eslint: { ignoreDuringBuilds: skipBuildChecks, dirs: ['src', 'scripts'] },
  headers,
  redirects,
};

export default nextConfig;
