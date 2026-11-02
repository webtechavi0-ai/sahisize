# Architecture

SahiSize is a Next.js 15 (App Router, React 19, strict TypeScript) app that resizes exam-form
photos, signatures and documents entirely in the browser. English at `/...`, Hindi at `/hi/...`
(497 public URLs, inventory in `docs/routes.txt`).

## Rendering model

- Every page is **prerendered at build time** (`generateStaticParams`, `dynamicParams = false`,
  `force-static` route handlers). `output: 'standalone'` produces a small Node server that serves
  those files, the security headers (`next.config.mjs`) and `/healthz` (dynamic on purpose).
- `output: 'export'` is forbidden: `npm run build` fails if `out/` appears
  (`check:no-export`).
- There is **no top-level `app/layout.tsx`**. Two root layouts, `src/app/(en)/layout.tsx` and
  `src/app/hi/layout.tsx`, each render `<html lang>` and `<body>` through
  `components/layout/RootShell.tsx`, so `lang` is correct without per-request work.
  `src/app/global-not-found.tsx` renders its own `<html>`/`<body>`.
- Processing runs client-side in a Web Worker (WASM codecs). No file is uploaded.

## Layers (dependencies point downwards)

```
app (routes)
  -> components/layouts, components/<domain>      UI
       -> server/content, i18n/server, seo        server-only data + translators
            -> content/*.json (data), config, lib, engine
```

| Directory            | Role                                                                                                                      |
| -------------------- | ------------------------------------------------------------------------------------------------------------------------- |
| `src/app`            | Thin route files. They load data, build metadata/JSON-LD and render a layout. No business logic.                          |
| `src/components`     | `layout/` html shell, `layouts/` page templates (Exam, Tool, Guide, Kit, ID, Legal), `site/`, `kit/`, `tools/`, `id-documents/`, `ui/`, `content/RichText`, `seo/JsonLd`. |
| `src/server/content` | zod-validated, cached loaders over `src/content/**` (presets, guides, exam copy, families, tool copy, ID docs, sitemap). `server-only`: never import from a client component (`import type` is fine). |
| `src/i18n`           | `config` (locales, path helpers), `server` (`getT`, `getMessages`), `core`, `messages/{en,hi}/*.json`. Hindi falls back to English per key. |
| `src/seo`            | `buildMetadata`, hreflang, JSON-LD builders, sitemap rendering, OG image rendering (satori + resvg), text length rules.   |
| `src/engine`         | Image/PDF engine. UI imports only `@/engine/api` and `@/engine/types`. Codec `.wasm` files are referenced via `new URL(..., import.meta.url)` and emitted by Next with content hashes. |
| `src/lib`, `config`  | Client-safe utilities and constants. They must not import routes, components or server modules (ESLint-enforced).        |
| `src/content`        | Data only: exam presets, Hindi copy, guides, tool copy, ID-document copy.                                                 |

Client components get only the translation namespaces they use
(`getMessages(lang, [...])` -> `dict` prop); everything passed is serialized into the page.

## Adding things

- **Exam**: add `src/content/presets/<slug>.json` (+ `exam-copy/{en,hi}/<slug>.json`), then
  `npm run presets:check && npm run i18n:check`. Routes, sitemaps and search pick it up.
- **Tool**: add slug in `src/config/tools.ts`, copy under `src/content/tools`, widget in
  `src/components/tools/widgets`, register in `tools/tools-registry.tsx`.
- **Translation key**: add to `messages/en/*.json` and `messages/hi/*.json` (`i18n:check`).

## Quality gates

`lint`, `typecheck`, `test` (Vitest, engine units), `presets:check`, `i18n:check`,
`check:contrast`, then after `build`: `check:budgets` (per-page JS/CSS gzip budgets) and
`check:routes` (every URL in `docs/routes.txt` answers 200 with the right type, legacy
redirects work). `npm run verify` runs all of them.

## Build and deploy

`Jenkinsfile`: install, static checks in parallel, **one** `npm run build`, budgets + routes
against it, Docker image from the same `.next/standalone` (`runtime-prebuilt` target), then on
`main` a health-gated canary, swap and rollback to `:previous`. `Dockerfile` can also build
everything itself (`runtime` target). Host nginx terminates TLS and proxies to
`127.0.0.1:3003`.
