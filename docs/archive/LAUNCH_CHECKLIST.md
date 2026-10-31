# Launch checklist

Steps only the owner can do: accounts, DNS, credentials, human review and real devices
(QUESTIONS Q3, R16, R17). Everything automated is listed under "What's verified" at the
end. Tick each item as you go.

The examples use `sahisize.in` (`DEFAULT_SITE_URL`). If the final domain differs, use it
everywhere below, including `PUBLIC_SITE_URL`.

## 1. Domain and DNS

- [ ] Register or confirm the production domain (placeholder: `sahisize.in`).
- [ ] Add the domain to Cloudflare (nameservers at the registrar) and wait until the zone is active.
- [ ] Attach the apex domain as a **Custom domain** of the Pages project (section 2). Cloudflare creates the CNAME-flattened record.
- [ ] Also attach `www.<domain>` as a custom domain so that it gets a certificate.
- [ ] **www → apex redirect.** `_redirects` cannot match on host, so create a Cloudflare **Redirect Rule** (or Bulk Redirect): hostname equals `www.<domain>` → `https://<domain>${uri.path}` (keep the query string), 301.
- [ ] SSL/TLS: Full (strict), "Always Use HTTPS" on, minimum TLS 1.2.
- [ ] After a week with no HTTPS problems on any subdomain, consider adding `preload` to HSTS in `public/_headers` and submitting at hstspreload.org. This is hard to undo, so skip it if unsure.

## 2. Cloudflare Pages project

- [ ] Create the Pages project and connect it to the GitHub repo (section 3).
- [ ] Framework preset: Astro (or None). **Build command:** `npm run build`. **Build output directory:** `dist`. Root directory: repo root.
- [ ] **Node version:** `.nvmrc` says `24`. Pages reads it, but also set the env var `NODE_VERSION=24` to be explicit.
- [ ] **Env var `PUBLIC_SITE_URL`** = `https://<final domain>` with no trailing slash, for Production **and** Preview. It **must equal the final domain**: canonical URLs, the sitemap, hreflang, OG URLs and `robots.txt` are built from it, and a wrong value silently de-indexes the site.
- [ ] Production branch: `main`. Preview deployments for other branches are fine; `_headers` sends `X-Robots-Tag: noindex` on `*.pages.dev`.
- [ ] Zone settings: keep **Rocket Loader off** (it rewrites scripts and breaks the CSP hashes) and **Email Address Obfuscation off** (it rewrites the support@ mailto links and injects a script).
- [ ] Leave Cloudflare Web Analytics' automatic injection **off**. Its beacon from `static.cloudflareinsights.com` is blocked by the CSP. Use the analytics in section 5 instead.

## 3. GitHub remote and CI

- [ ] Create the GitHub repo, add it as `origin`, and push `main`.
- [ ] Actions enabled; `.github/workflows/ci.yml` runs on push, PR, nightly and manual dispatch.
- [ ] Branch protection on `main`: require the CI jobs (verify, e2e matrix, Lighthouse) before merging.
- [ ] Add the security suite to CI (the QA owner owns `ci.yml`): after the build in the e2e job, `npx playwright install --with-deps chromium webkit` and `npm run test:csp` with `E2E_BASE_URL` pointing at the preview server, or let the config start its own server. `tests/security/headers.test.ts` already runs inside `npm test`.
- [ ] Optional: Dependabot or Renovate for security updates only (R8: no unplanned majors).

## 4. Search engines

- [ ] Google Search Console: add a **Domain** property (DNS TXT verification in Cloudflare).
- [ ] Submit `https://<domain>/sitemap-index.xml`.
- [ ] Bing Webmaster Tools: import from Search Console (or verify by DNS) and submit the same sitemap.
- [ ] Check that `https://<domain>/robots.txt` lists the sitemap with the production host, not a `pages.dev` host.
- [ ] URL-inspect `/`, `/exam/ibps-po`, `/hi` and `/tools/compress-image-to-20kb`: indexable, and the canonical is the clean URL.

## 5. Analytics domain

- [ ] Choose the provider (Plausible or Umami, cookie-less) and create the site.
- [ ] Set `ANALYTICS` in `src/config/analytics.ts` (`provider`, `host`, `siteId`).
- [ ] Add the provider origin to `ANALYTICS_ORIGINS` in `src/config/csp.ts`, rebuild, then run `npm run test:csp` and `npm run test:e2e -- privacy-network`.
- [ ] Update `/privacy` if the provider or its data location changes.

## 6. Site constants (`src/config/site.ts`)

- [ ] `SOCIAL_LINKS`: real profile URLs only, or leave the list empty.
- [ ] `SPEC_REVIEWER`: a real, consenting named reviewer, or leave it `null`.
- [ ] `DEFAULT_SITE_URL` and `CONTACT_EMAIL` match the final domain.

## 7. Mailboxes

- [ ] Create **support@<domain>** (used by `/contact`, `/report` and the footer) and test it end to end, including a `/report` mailto.
- [ ] Create **security@<domain>** (or an alias to support@) as published in `SECURITY.md`.
- [ ] Set up SPF, DKIM and DMARC for the domain so that replies don't land in spam.

## 8. Native-speaker Hindi review (Q27, Q29)

- [ ] हस्ताक्षर in labels vs साइन/सिग्नेचर in prose: pick one style and apply it consistently.
- [ ] डिक्लेरेशन vs घोषणा.
- [ ] Hinglish choices: सेफ, खड़ी शेप, उल्टा नियम.
- [ ] RPSC: "लिखावट का नमूना".
- [ ] ExamPilot sponsored promo Hindi copy (`src/config/monetization.ts`, card, inline and banner variants).
- [ ] `CORE_PROMISE.hi` / `TAGLINE.hi` are Latin-script Hinglish (SPEC 3.1). Decide whether to keep them or switch to Devanagari.
- [ ] Preset `cycle` strings show in English on Hindi pages: accept, or add Hindi.
- [ ] Date-bound copy ("form open until …", UGC NET hi) is current at launch.

## 9. Hindi font weight decision (Q29)

- [ ] Decide whether to keep `noto-devanagari-600.woff2`. Dropping it improves `/hi` LCP from 2.26 s to 1.96 s, but Hindi semibold text then uses synthetic bold. If dropped, remove the 600 `@font-face` in `src/styles/fonts.css` and the file in `public/fonts/`, then re-run Lighthouse on `/hi`.

## 10. Real fixture photos (R16, SPEC 14.2)

- [ ] Collect **20 real sample photos** (team members, written consent): a mix of phone cameras, lighting and backgrounds, plus a few signatures on paper. Include HEIC from an iPhone.
- [ ] Add them under `tests/fixtures/` and wire a test that runs the presets over them (no test reads a real-photo folder yet). Don't commit anything without consent. Strip GPS EXIF.

## 11. Pre-launch dependency fix

- [ ] Upgrade `pdfjs-dist` to `^6.2.108` (high-severity advisory GHSA-hq66-cqwq-w95j; see `SECURITY.md`), then re-run the compress-pdf e2e tests and `npm run test:csp`.
- [ ] `npm audit --omit=dev` shows no high or critical finding that reaches users (the Astro and sharp findings are build-only and accepted until the Astro 7 upgrade).

## 12. Post-deploy smoke checks (production URL)

Headers:

- [ ] `curl -sI https://<domain>/` shows `strict-transport-security`, `x-content-type-options: nosniff`, `x-frame-options: DENY`, `content-security-policy: frame-ancestors 'none'`, `referrer-policy`, `permissions-policy` (with `camera=(self)`), `cross-origin-opener-policy: same-origin`, and `cache-control: public, max-age=0, must-revalidate`.
- [ ] `curl -sI https://<domain>/sw.js` shows `cache-control: no-cache`.
- [ ] `curl -sI https://<domain>/_astro/<any .js>` shows `cache-control: public, max-age=31536000, immutable` (a single value, not two joined).
- [ ] `curl -sI https://<domain>/_astro/<any .wasm>` shows `content-type: application/wasm`.
- [ ] `curl -sI https://<domain>/_astro/workers/<worker .js>` shows two CSP policies (frame-ancestors, then `script-src 'self' 'wasm-unsafe-eval' 'unsafe-eval' …`).
- [ ] `curl -sI https://<project>.pages.dev/` shows `x-robots-tag: noindex, nofollow`, and production does **not**.

Redirects:

- [ ] `curl -sI https://<domain>/exams.html` gives 301 with `location: /exams`.
- [ ] `/index.html` gives 301 to `/`.
- [ ] `/tools/` gives 301 to `/tools`.
- [ ] `/exam/ibps-po/` gives 301 to `/exam/ibps-po`.
- [ ] `https://www.<domain>/exams` gives 301 to `https://<domain>/exams`.
- [ ] `curl -sIL` on each of these ends in one 200, with no chain longer than 2 hops and no loop. If Pages ignores the `/*.html` or `/*/` splat rules, delete them: Pages' own 308 normalisation then applies, which is also fine.

Browser:

- [ ] Open DevTools on `/`, `/kit/ibps-po` and `/hi`: no CSP errors in the console.
- [ ] Offline: visit `/` once, wait about 10 s, turn on airplane mode, open `/tools/compress-image-to-20kb` and compress a photo. Then open an unvisited page and confirm it shows `/offline`.
- [ ] **Real Android phone** (Chrome, mid-range): full IBPS PO kit with "Take photo" (camera opens), a gallery image and a HEIC file; the ZIP downloads and the files open.
- [ ] **Real iPhone** (Safari): the same kit with "Take photo" and a HEIC photo, the ZIP downloads, and Add to Home Screen works.
- [ ] Upload one kit result to a real exam portal's test or registration flow if one is available.

## 13. Monitoring (first month, then monthly)

- [ ] Search Console **Pages (coverage)**: no unexpected "Excluded by noindex", "Duplicate without user-selected canonical" or soft 404s. `/kit/*` and custom-preset pages are noindex by design.
- [ ] Search Console **Core Web Vitals** (mobile): LCP, INP and CLS are "Good". Watch `/hi` LCP (section 9).
- [ ] Cloudflare analytics: 4xx and 5xx rates, top 404 paths (add redirects for real ones).
- [ ] Analytics events: watch the `fit_stage` mix (padding or grain frequency, R5) and the feedback reports.
- [ ] support@ inbox: rejection reports feed preset fixes.

## 14. Preset re-check cadence

- [ ] Run `npm run presets:check` at least monthly. It flags presets whose `lastChecked` is older than **120 days** and presets whose notification season starts within 30 days.
- [ ] Before each major notification (IBPS, SSC, RRB, NTA, UPSC …), re-verify that exam's official PDF and update `sourceUrl`, `sourcePage`, `lastChecked` and `checkedBy`.
- [ ] Re-check the ID-document pages (NSDL/Protean, UTIITSL) on the same 120-day cycle, with their source link and checked date (Q30).

---

## What's verified (automated)

Run locally with `npm run check && npm run lint && npm test && npm run build`, then the
browser suites. CI (`.github/workflows/ci.yml`) runs the same on every push and PR.

| Area | Command or test |
|---|---|
| Types, Astro check | `npm run check` |
| Lint | `npm run lint` |
| Engine, contracts, presets, UI, SEO and security unit tests | `npm test` (Vitest projects `engine`, `node`, `ui`) |
| `_headers` / `_redirects` rules (required headers, < 100 rules, no conflicts, 301s, no loops) | `tests/security/headers.test.ts`, `npm run test:security` |
| Zero CSP violations on every route type, WASM and worker start, pdf.js, libheif, SW (Chromium and WebKit) | `tests/security/csp.spec.ts`, `npm run test:csp` (after `npm run build`) |
| No image bytes leave the device | `tests/e2e/privacy-network.spec.ts` |
| Full kit (IBPS PO) output matches the preset: px, KB, baseline JPEG, DPI, A4 PDF | `tests/e2e/kit-ibps.spec.ts` |
| Tools, HEIC, ID documents, Hindi, offline, a11y, design | `tests/e2e/*.spec.ts` (`npm run test:e2e`) |
| Fit time under 2 s with 4× CPU and Fast 4G | `tests/e2e/perf-fit.spec.ts` (`--project perf`) |
| Lighthouse ≥ 95 on key pages | `npm run lhci` |
| JS+CSS budgets per page | `npm run budgets` |
| Broken links (clean URLs) | linkinator against `astro preview` (CI) |
| i18n keys, contrast | `npm run i18n:check`, `npm run contrast` |
| Preset freshness | `npm run presets:check` |
| Dependency audit | `npm audit --omit=dev` (report in `SECURITY.md`) |

Not verifiable in CI: Cloudflare actually applying `_headers` and `_redirects` (section 12
curl checks), real-device camera, HEIC and ZIP handling, portal acceptance, and the human
Hindi review.
