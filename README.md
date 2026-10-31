# SahiSize

**Right size, first time.** SahiSize resizes photos, signatures and documents to the exact
specification of Indian exam application forms (SSC, IBPS, RRB, UPSC, NEET, state police and
more). It also has general image/PDF tools and ID-document photo tools.

All processing happens **in the browser**: decoding, cropping, resizing, JPEG/PNG/WebP/HEIC
codecs (WebAssembly) and PDF work run on the user's device. No file is ever uploaded.

Every page is available in English (`/...`) and Hindi (`/hi/...`).

## Stack

| Area          | Choice                                                                                                              |
| ------------- | ------------------------------------------------------------------------------------------------------------------- |
| Framework     | Next.js 15 (App Router), React 19, TypeScript (strict)                                                              |
| Styling       | Tailwind CSS 3.4 + `@tailwindcss/typography`, self-hosted Inter and Noto Sans Devanagari                            |
| Content       | JSON in `src/content/**`, validated with zod at build time                                                          |
| Engine        | Web Worker + WASM (`@jsquash/*`, `libheif-js`), `pdf-lib`, `pdfjs-dist`, `comlink`                                  |
| OG images     | `satori` + `@resvg/resvg-js`, rendered at build time                                                                |
| Runtime       | `output: 'standalone'` Node server in Docker, port 3003, behind nginx                                               |
| Quality gates | ESLint (typescript-eslint, Next, react-hooks, jsx-a11y), `tsc`, Vitest, route/budget/contrast checks, Lighthouse CI |

All pages are statically prerendered at build time (`generateStaticParams` with
`dynamicParams = false`, `force-static` handlers). The Node server only serves those files,
the security headers and `/healthz`.

## Project structure

```
src/
  app/          thin route files: (en) and (hi)/hi route groups, sitemaps, robots, OG, healthz
  features/     domain modules (home, exam, exam-document, kit, tools, id-documents, guides,
                pages, search, platform): pages/, components/, client/, server/, lib/
  components/   shared UI: ui/ primitives, shell/, landing/ template, content/, seo/
  engine/       in-browser image/PDF processing (UI imports only @/engine/api and @/engine/types)
  i18n/         locale config, dictionaries, server/client translators
  seo/          metadata, hreflang, JSON-LD, sitemap helpers
  server/       zod-validated content loaders (server-only)
  content/      data only (JSON)
  config/       constants
  lib/          client-safe utilities
  styles/       globals.css (design tokens), fonts.css
scripts/        build and CI scripts
docs/           architecture.md, routes.txt (public URL inventory), SEO notes
```

The layering rules, module APIs and conventions are documented in
[`docs/architecture.md`](docs/architecture.md).

## Getting started

Requirements: Node.js 24 (see `.nvmrc`; `>=22.12` works), npm.

```bash
npm ci                 # also copies the codec .wasm files into public/wasm
npm run dev            # http://localhost:3003
```

Set `PUBLIC_SITE_URL` (for example `https://sahisize.in`) to change the canonical origin used
in canonical links, hreflang, sitemaps and OG tags.

## Scripts

| Script                            | What it does                                                                 |
| --------------------------------- | ---------------------------------------------------------------------------- |
| `npm run dev`                     | Copy WASM codecs, start the dev server on port 3003                          |
| `npm run build`                   | Copy WASM codecs, `next build`, then make `.next/standalone` self-contained  |
| `npm start`                       | Run the built standalone server (`PORT`, default 3003)                       |
| `npm run lint` / `lint:fix`       | ESLint                                                                       |
| `npm run typecheck`               | `tsc --noEmit`                                                               |
| `npm test`                        | Vitest unit tests                                                            |
| `npm run format` / `format:check` | Prettier                                                                     |
| `npm run presets:check`           | Validate exam presets                                                        |
| `npm run i18n:check`              | English/Hindi dictionaries have the same keys                                |
| `npm run check:contrast`          | WCAG AA contrast of the design tokens                                        |
| `npm run check:budgets`           | Per-page JS/CSS/total gzip budgets over every prerendered page (after build) |
| `npm run check:routes`            | Every URL in `docs/routes.txt` answers 200 with the right type (after build) |
| `npm run lhci`                    | Lighthouse CI against the built server (needs Chrome)                        |
| `npm run verify`                  | All static checks, build, budgets and routes                                 |

`next build` runs ESLint and the type checker itself. CI runs them as separate stages and sets
`SKIP_BUILD_CHECKS=1` so the build does not repeat them (it doubled peak memory).

## Deployment

The `Jenkinsfile` pipeline: install, lint, typecheck, test, content checks, **one**
`npm run build`, budgets and route checks against that build, then a Docker image that packages
the same `.next/standalone` (`--target runtime-prebuilt`). On `main` only it deploys:

1. Runs the new image as a canary on `127.0.0.1:3013` and waits for its health check.
2. Tags the live image as `:previous` for rollback.
3. Replaces the live container on `127.0.0.1:3003`, waits for it to be healthy, and rolls back
   to `:previous` if it is not.

The host nginx terminates TLS, redirects `www` to the apex and proxies to `127.0.0.1:3003`.

Standalone Docker build and run without Jenkins:

```bash
docker build --build-arg PUBLIC_SITE_URL=https://sahisize.in -t sahisize .
docker compose up -d        # binds 127.0.0.1:3003, read-only root filesystem, health check
curl -fsS http://127.0.0.1:3003/healthz
```

## Security

See [SECURITY.md](SECURITY.md) for the threat model, response headers and how to report a
vulnerability.
