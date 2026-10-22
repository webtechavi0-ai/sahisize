# Security

SahiSize is a static site (Astro 5, `output: 'static'`) served by Cloudflare Pages. There
is no server code, no database, no accounts and no upload endpoint. This file covers the
threat model, the browser policies that enforce it, the tests that keep it true, and how
to report a problem.

## Reporting a vulnerability

Email **security@sahisize.in**. If that bounces before launch, use **support@sahisize.in**
(`CONTACT_EMAIL` in `src/config/site.ts`). Both addresses follow the production domain; if
the domain changes, so do they. Please include the URL, the browser and its version, and
steps to reproduce. Do not include personal photos or ID documents: a synthetic image that
reproduces the issue is enough.

We aim to acknowledge reports within 3 working days and to fix confirmed issues in the
static build within 14 days. There is no bug bounty. Please give us reasonable time before
you disclose publicly.

## Threat model

**Assets.** Users' photos, signatures, thumb impressions, declarations, certificates and
ID-document photos (PAN). These are personal data, so the design keeps them on the device.

**Guarantees.**

1. **On-device processing.** Decoding, cropping, resizing, JPEG/PNG/WebP/HEIC codecs (WASM)
   and PDF work run in the browser, in a module worker (`/_astro/workers/*`) or on the main
   thread (pdf.js, with its own worker). No file is ever sent anywhere.
2. **No uploads.** The site has no endpoint that accepts files. `connect-src 'self'` (plus
   only the analytics origin once one is configured) means a script could not send image
   bytes to a third party even if it tried.
3. **No PII collected.** No accounts, no forms that post, and no cookies. Analytics is off
   until the owner configures it (`src/config/analytics.ts`). When it is on, it is cookie-less
   and event-only, sent with `sendBeacon`, and the payload types forbid file names, image
   data and typed text. `/report` builds a `mailto:` link and sends nothing by itself.
   ID-document pages never ask for a PAN or Aadhaar number (Q30).
4. **Local storage stays local.** Kit progress lives in IndexedDB (`src/lib/kit-store.ts`)
   with a 30-day expiry. ID-document tools persist nothing.

**Out of scope or accepted.**

- A compromised device or browser extension can read anything on the page.
- Build-time dependencies run only on the build machine against repository content.
- Users of Chrome 90–96 may not be able to compile WASM (Q10); the app shows "Please update
  Chrome" instead of failing silently.

**Main risks and their mitigations.**

| Risk | Mitigation |
|---|---|
| XSS on our origin (would expose kit data in IndexedDB) | Hash-based `script-src` with no `'unsafe-inline'` and no `'unsafe-eval'` on pages; no user-controlled HTML is rendered; Preact escapes text by default. |
| A malicious file exploiting a decoder (HEIC, PDF, JPEG) | Decoders run in workers. The engine worker has no DOM, and the pdf.js worker gets a no-eval header CSP. Inputs are capped at 25 MB and 4000 px. |
| Clickjacking (for example, a fake "upload your PAN photo" frame) | `frame-ancestors 'none'` header and `X-Frame-Options: DENY`. |
| Exfiltration through a third-party script | There are no third-party scripts, styles or fonts. Everything is self-hosted, and the CSP limits `default-src` and `connect-src` to `'self'`. |
| Leaking URLs (exam or document choices) to other sites | `Referrer-Policy: strict-origin-when-cross-origin`. |
| Downgrade or SSL stripping | HSTS for one year with `includeSubDomains`. Add `preload` only once every subdomain is HTTPS (LAUNCH_CHECKLIST.md). |

## Content Security Policy

The CSP has two parts that browsers enforce **together**: a resource must pass both. The
source of truth is `src/config/csp.ts`.

**1. Document policy in a `<meta>` tag.** Astro `experimental.csp` hashes every inline script
it renders (the island hydration runtime and the other small inline scripts), so no
`'unsafe-inline'` is needed for scripts:

```
default-src 'self'; worker-src 'self' blob:; img-src 'self' data: blob:;
connect-src 'self' [analytics origin]; font-src 'self'; manifest-src 'self';
object-src 'none'; base-uri 'self'; form-action 'self';
style-src-attr 'unsafe-inline';
script-src 'self' 'wasm-unsafe-eval' 'sha256-…';
style-src 'self' 'unsafe-inline' 'sha256-…'
```

- `'wasm-unsafe-eval'` allows `WebAssembly.compile` without allowing JS `eval`.
- **`style-src-attr 'unsafe-inline'` (Phase 4 fix).** Astro always adds hashes to `style-src`
  for its island `<style>` tag, and a hash makes browsers ignore `'unsafe-inline'`. That
  blocked every `style=""` attribute: the Q10 SSR limitation, and in WebKit the `<select>`
  controls on `/report` (found by `csp.spec.ts`). `style-src-attr` covers attributes only, so
  `<style>` elements stay hash-locked. Astro's directive allow-list does not know
  `style-src-attr`, so it is appended to the `form-action` entry, and `csp.spec.ts` asserts
  that it reaches the meta tag. On browsers without `style-src-attr` (before Chrome 75 or
  Safari 15.4) style attributes stay blocked, as before.
- JSON-LD blocks are data, not script, and are not affected.

**2. Header policies in `public/_headers`.** A `<meta>` CSP cannot set `frame-ancestors`, and
a worker's CSP comes from the worker's own response:

| Path | Header CSP |
|---|---|
| `/*` | `frame-ancestors 'none'` (only this, so it cannot narrow the meta policy) |
| `/_astro/workers/*` (engine worker) | also `script-src 'self' 'wasm-unsafe-eval' 'unsafe-eval'; object-src 'none'; base-uri 'none'` (`'unsafe-eval'` is the Chrome 90–96 WASM fallback, Q10) |
| `/_astro/pdf.worker*` | also `script-src 'self'; object-src 'none'; base-uri 'none'` (no eval of any kind while parsing untrusted PDFs) |

Pages joins two `Content-Security-Policy` values with `", "`, which browsers read as two
policies, each enforced on its own.

**Adding analytics.** Put the provider origin in `ANALYTICS_ORIGINS` in `src/config/csp.ts`.
It is added to `script-src` and `connect-src`. Rebuild, then run `npm run test:csp`.

## Response headers

All are set in `public/_headers` (wildcard rules only; Pages allows at most 100):

| Header | Value | Where |
|---|---|---|
| Strict-Transport-Security | `max-age=31536000; includeSubDomains` | all |
| X-Content-Type-Options | `nosniff` | all |
| X-Frame-Options | `DENY` | all |
| Content-Security-Policy | see above | all; extra policies for the workers |
| Referrer-Policy | `strict-origin-when-cross-origin` | all |
| Cross-Origin-Opener-Policy | `same-origin` | all |
| Permissions-Policy | `camera=(self)` (for "Take photo"), `fullscreen=(self)` (result preview); `microphone`, `geolocation`, `payment`, `usb`, `serial`, `hid`, `bluetooth`, `midi`, sensors, `display-capture`, `screen-wake-lock`, `xr-spatial-tracking`, `publickey-credentials-get` and `browsing-topics` all `()` | all |
| Cache-Control | `public, max-age=0, must-revalidate` | HTML and everything else by default |
| Cache-Control | `public, max-age=31536000, immutable` | `/_astro/*` (content-hashed), `/workbox-*.js` |
| Cache-Control | `no-cache` | `/sw.js` |
| Cache-Control | 7 days for `/fonts/*`; 1 day plus stale-while-revalidate for `/og/*` | |
| Content-Type | `application/wasm` | `/_astro/*.wasm` |
| Content-Type | `application/manifest+json` | `/manifest.webmanifest` |
| X-Robots-Tag | `noindex, nofollow` | `/dev/*`, `*.pages.dev` and preview deployments |

When a rule replaces a header set by `/*` (for example `Cache-Control`), it first detaches it
with `! Cache-Control`, because Pages would otherwise join the two values.

`public/_redirects` sends `/*.html` to the clean URL and `/path/` to `/path`, both with 301
(no loops; tested). The `www` to apex redirect is a Cloudflare Redirect Rule
(LAUNCH_CHECKLIST.md).

## Subresource Integrity

SRI is not used because there is nothing to protect with it. The site loads **no external
assets**: no CDN scripts, no Google Fonts and no third-party widgets. Fonts (Inter, Noto Sans
Devanagari) are self-hosted under `/fonts/`, and all JS, CSS and WASM are same-origin build
output under `/_astro/` with content-hashed names. `default-src 'self'` would block any
external asset that crept in. If a third-party script is ever added, it must get an
`integrity` attribute and an exact origin in `csp.ts`.

## Tests that enforce this

| Guarantee | Test |
|---|---|
| Zero CSP violations on every route type (home, exam, document, hub, kit with a real auto-fit that compiles WASM and starts the engine worker, tools including HEIC via libheif and PDF via pdf.js, guide, id-documents with the PAN tool, Hindi pages, offline, 404, SW registration), in Chromium and WebKit, with `_headers` replayed on every response | `tests/security/csp.spec.ts` (`npm run test:csp`, after `npm run build`) |
| The violation detector really fires (self-check with an injected script and an external image) | `tests/security/csp.spec.ts` |
| `_headers`: required headers on every route, under 100 rules, no conflicting or doubled values, the header CSP is `frame-ancestors` only, worker CSPs, caching, WASM type, noindex on preview hosts; `_redirects`: 301s, no loops, every built page reachable by its clean URL | `tests/security/headers.test.ts` (part of `npm test`; `npm run test:security`) |
| No request ever carries image bytes; only first-party and analytics hosts are contacted | `tests/e2e/privacy-network.spec.ts` |
| Analytics payloads carry no file names, image data or typed text | `tests/contracts/analytics.test.ts` |
| ID-document tools persist nothing and ask for no ID numbers | `tests/unit/id-documents/`, `tests/e2e/id-documents.spec.ts` |
| Works offline (nothing needs the network after the first visit) | `tests/e2e/offline.spec.ts` |

## Dependency audit (`npm audit --omit=dev`, 23 Oct 2026)

**3 vulnerabilities: 1 critical, 1 high, 0 moderate, 1 low.** None of them reaches users, and
none can be fixed without the Astro 7 upgrade. The full tree, including dev dependencies, has
32 findings (1 critical, 17 high, 9 moderate, 5 low). The high and critical ones are in build
and CI tools (`@lhci/cli`/puppeteer, `tailwindcss` 3 via chokidar/braces) and never reach users.

**Fixed (23 Oct 2026):** `pdfjs-dist` 5.7.284 had GHSA-hq66-cqwq-w95j (high: arbitrary JS
execution when opening a malicious PDF), which reached users through the compress-pdf tools and
the kit certificate step. It is now `~6.4.299` (fixed from 6.2.108). The pdfjs 6 legacy build
no longer bundles `Promise.withResolvers` and `ArrayBuffer#transferToFixedLength` polyfills, so
`src/engine/pdf-polyfills.ts` adds them on the main thread and in the pdf.js worker (now built
from `src/engine/pdf-worker.ts` as `/_astro/pdf.worker-[hash].js`, still under the no-eval
worker CSP). pdfjs 6 has no `isEvalSupported` option and contains no `eval`/`new Function`.

| Package | Severity | Reaches users? | Assessment and proposed fix |
|---|---|---|---|
| `astro` 5.18.2 | **critical**: RCE via AVIF image optimisation. Also high: host-header SSRF in prerendered error pages, reflected XSS via slot name. Moderate and low: spread attributes, `define:vars`, view transitions, server islands. | **No.** Static output, no SSR adapter, no `astro:assets`/AVIF processing, no `define:vars`, view transitions or server islands. The vulnerable paths are server or runtime features we do not ship; at build time all input is our own repository. | Fixed only in Astro 7.2.8+ (no 5.x backport). Astro stays pinned at 5.18 (Q11). Plan the Astro 7 upgrade after launch (R8). |
| `sharp` 0.34.5 (optional, via astro) | **high**: libvips, libheif and librsvg CVEs | **No.** Used only by Astro's image service at build time, and the site does not use `astro:assets`. User HEIC files are decoded in the browser by `libheif-js`, not sharp. | Comes with the Astro 7 upgrade. |
| `esbuild` 0.27.x | low: dev-server file read on Windows | No (dev server only). | Comes with the Astro 7 upgrade. |

Re-run before every release: `npm audit --omit=dev`. The target is zero high or critical
findings that reach users. The remaining findings are build-only and are accepted above.
