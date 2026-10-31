# Security

SahiSize is a Next.js 15 application served by its standalone Node server in a Docker
container, behind nginx. Every page is prerendered at build time. There is no database, no
accounts, no form that posts, and no endpoint that accepts files. This document covers the
threat model, the browser policies that enforce it, and how to report a problem.

## Reporting a vulnerability

Email **security@sahisize.in** (fallback: **support@sahisize.in**). Include the URL, the
browser and its version, and steps to reproduce. Do not send personal photos or ID documents:
a synthetic image that reproduces the issue is enough.

We aim to acknowledge reports within 3 working days and to fix confirmed issues within
14 days. There is no bug bounty. Please give us reasonable time before disclosing publicly.

## Threat model

**Assets.** Users' photos, signatures, thumb impressions, declarations, certificates and
ID-document photos. These are personal data, so the design keeps them on the device.

**Guarantees.**

1. **On-device processing.** Decoding, cropping, resizing, image codecs (WASM) and PDF work
   run in the browser, in a module worker or in the pdf.js worker. No file is ever sent
   anywhere; the server has no route that accepts a request body.
2. **No uploads.** `connect-src` allows only our own origin and the Google Analytics
   endpoints, so even a compromised script could not post image bytes to an arbitrary host.
3. **No PII collected.** No accounts and no forms that post. Analytics events never carry file
   names, image data or typed text. ID-document pages never ask for a PAN or Aadhaar number.
4. **Local storage stays local.** Kit progress lives in IndexedDB with an expiry; ID-document
   tools persist nothing.

**Out of scope or accepted.**

- A compromised device or browser extension can read anything on the page.
- Build-time dependencies run only on the build machine against repository content.
- Chrome 90-96 may be unable to compile WASM; the app tells the user to update.

**Main risks and mitigations.**

| Risk                                                            | Mitigation                                                                                                                                                                                                                                        |
| --------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| XSS on our origin (would expose kit data in IndexedDB)          | No user-controlled HTML is ever rendered; React escapes text; `dangerouslySetInnerHTML` is allowed only for JSON-LD (serialised by our own code) and the theme/analytics bootstrap. CSP limits script origins to `'self'` and Google Tag Manager. |
| A malicious file exploiting a decoder (HEIC, PDF, JPEG)         | Decoders run in workers without DOM access; the pdf.js worker gets a no-eval CSP. Input size and dimensions are capped.                                                                                                                           |
| Clickjacking (for example a fake "upload your PAN photo" frame) | `frame-ancestors 'none'` and `X-Frame-Options: DENY`.                                                                                                                                                                                             |
| Exfiltration through a third-party script                       | The only third party is gtag.js; `connect-src` and `img-src` allow only Google Analytics hosts besides `'self'`. Fonts, styles and all other scripts are self-hosted.                                                                             |
| Leaking URLs to other sites                                     | `Referrer-Policy: strict-origin-when-cross-origin`.                                                                                                                                                                                               |
| Downgrade or SSL stripping                                      | HSTS for one year with `includeSubDomains`; `upgrade-insecure-requests`.                                                                                                                                                                          |
| Container compromise                                            | Runs as the unprivileged `node` user, read-only root filesystem, all capabilities dropped, `no-new-privileges`, memory and PID limits, published on 127.0.0.1 only.                                                                               |

## Response headers

Set by the application in `headers()` in `next.config.mjs`, so they apply in every
environment (not only behind nginx).

| Header                       | Value / scope                                                                                                                              |
| ---------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------ |
| `Strict-Transport-Security`  | `max-age=31536000; includeSubDomains`                                                                                                      |
| `Content-Security-Policy`    | see below                                                                                                                                  |
| `X-Content-Type-Options`     | `nosniff`                                                                                                                                  |
| `X-Frame-Options`            | `DENY`                                                                                                                                     |
| `Referrer-Policy`            | `strict-origin-when-cross-origin`                                                                                                          |
| `Cross-Origin-Opener-Policy` | `same-origin`                                                                                                                              |
| `Permissions-Policy`         | `camera=(self)`, `fullscreen=(self)`, everything else denied                                                                               |
| `Cache-Control`              | `/_next/static/*` immutable (set by Next); `/wasm/*` (content-hashed) and `/fonts/*` immutable; `/sw.js` `no-cache`; `/healthz` `no-store` |
| `Content-Type`               | `application/wasm` for `/wasm/*`                                                                                                           |
| `X-Robots-Tag`               | `noindex, nofollow` on `/healthz`                                                                                                          |

`X-Powered-By` is disabled. Legacy `*.html` URLs get one 301 to the clean URL, and trailing
slashes are redirected by Next (`trailingSlash: false`).

## Content Security Policy

Document policy (production):

```
default-src 'self';
script-src 'self' 'unsafe-inline' 'wasm-unsafe-eval' https://www.googletagmanager.com;
style-src 'self' 'unsafe-inline';
img-src 'self' data: blob: <Google Analytics hosts>;
font-src 'self';
connect-src 'self' blob: data: <Google Analytics hosts>;
media-src 'self' blob:; worker-src 'self' blob:; manifest-src 'self';
object-src 'none'; base-uri 'self'; form-action 'self'; frame-ancestors 'none';
upgrade-insecure-requests
```

- **`'unsafe-inline'` in `script-src`.** Pages are prerendered once at build time, and Next.js
  streams its RSC payload in inline scripts. Nonces require per-request rendering, which would
  give up static prerendering. The mitigation is structural: no user-controlled markup is
  rendered anywhere. Revisit when Next supports hashes for prerendered inline scripts.
- **`'wasm-unsafe-eval'`** lets the engine compile WebAssembly without allowing JS `eval`.
- **Worker policies.** A worker's CSP comes from its own response. The engine worker
  (`/_next/static/**/*worker*`) gets `script-src 'self' 'wasm-unsafe-eval' 'unsafe-eval'`
  (`'unsafe-eval'` lets WASM compile on Chrome 90-96). The pdf.js worker (`*pdf*worker*`)
  parses untrusted PDFs and gets `script-src 'self'` with no eval at all.
- Development adds `'unsafe-eval'` and `ws:` for React Refresh; production never does.

## Subresource Integrity

Not used: gtag.js is served by Google with changing contents, so it cannot carry an
`integrity` hash, and every other asset is same-origin build output with content-hashed names.
Any new third-party script must be added to the CSP explicitly and, where its contents are
stable, carry an `integrity` attribute.

## Dependencies

Re-run before every release:

```bash
npm audit --omit=dev
```

The target is zero high or critical findings that reach users. Findings in build and CI tools
(`@lhci/cli`, Tailwind's file watcher) never reach users and are reviewed case by case.
`pdfjs-dist` is kept at `~6.4` or newer (GHSA-hq66-cqwq-w95j fixed in 6.2.108).
