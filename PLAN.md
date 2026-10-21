# PLAN.md: SahiSize build plan

Version 1.0 · 21 Oct 2026 · Source documents: `SPEC.md` (truncated at A.9) and `QUESTIONS.md` (Q1–Q3).
This plan adds deviations Q4–Q11 (section 3.13). The orchestrator copies them into `QUESTIONS.md` during Phase 1.

---

## 1. Dependencies

### 1.1 Why Astro 5 and not the current Astro 7

I checked the npm registry on 21 Oct 2026. Astro 7.4.1 is current. **We still pin Astro 5.18.x**, for three reasons:
- `@vite-pwa/astro` 1.2.0 only declares support for `astro ≤5`.
- `@astrojs/preact` 6.x and the Astro 7 toolchain (Vite 8, Node ≥22.22) are new and less proven.
- Astro 5.18 is the last 5.x line. It runs Vite 6 and declares support for Node ≥22, so Node 25 works.

Upgrading to Astro 7 after launch is a separate task.

### 1.2 `dependencies` (runtime)

| Package | Version | Notes |
|---|---|---|
| astro | `~5.18.2` | `output: 'static'` |
| @astrojs/preact | `~4.1.3` | peer `preact ^10` (5.x and 6.x target Astro 6/7) |
| preact | `^10.29.8` | not Preact 11 (the 4.x integration does not support it) |
| @preact/signals | `^2.11.3` | island state |
| @jsquash/jpeg | `^1.6.0` | MozJPEG encode and decode |
| @jsquash/png | `^3.1.1` | PNG encode and decode (T3) |
| @jsquash/webp | `^1.5.0` | WebP encode and decode (T3) |
| @jsquash/resize | `^2.1.1` | Lanczos3 |
| comlink | `^4.4.2` | |
| fflate | `^0.8.3` | ZIP |
| pdf-lib | `^1.17.1` | stable for years; no new release needed |
| pdfjs-dist | `~5.7.284` | **use the `legacy/build` entry** because we support Chrome 90 and iOS 15. 6.x exists, but we avoid a brand-new major. |
| libheif-js | `^1.23.5` | HEIC fallback. Chosen over `heic2any` (section 1.4). |
| idb-keyval | `^6.3.0` | |
| zod | `~3.25.76` | **must be 3.25.x.** Astro 5 bundles zod 3.25, so one instance and one API is shared with `astro:content`. Zod 4.6 is current but must not be used. |
| lucide-preact | `^1.61.0` | peer `preact ^10.27.2`. Import per icon (`lucide-preact/icons/check`) to keep tree-shaking reliable. |

### 1.3 `devDependencies`

| Package | Version | Notes |
|---|---|---|
| typescript | `~5.9.3` | **not 7.x.** `@astrojs/check` only declares support for TS ^5 and ^6. |
| @astrojs/check | `^0.9.11` | |
| @astrojs/mdx | `~4.3.14` | guides |
| tailwindcss | `~3.4.19` | see section 1.5 |
| postcss | `^8.5.31` | |
| autoprefixer | `^10.4` | |
| @tailwindcss/typography | `^0.5.20` | guide prose |
| @vite-pwa/astro | `~1.2.0` | |
| vite-plugin-pwa | `~1.3.0` | `@vite-pwa/astro` requires `^1.2.0`; 2.0.0 does not satisfy it |
| workbox-window | `^7.4.1` | peer of vite-plugin-pwa |
| @vite-pwa/assets-generator | `~1.0.4` | run once to produce favicon.ico and PWA PNGs. Commit the output. |
| satori | `^0.63.2` | build-time OG images |
| @resvg/resvg-js | `^2.6.2` | SVG to PNG |
| @fontsource/inter, @fontsource/noto-sans-devanagari | `^5.3.0` | **source only.** Copy the woff2 subsets into `public/fonts/`. Satori needs TTF/OTF, so a separate TTF goes in `src/assets/og-fonts/`. |
| vitest | `~4.1.12` | **not 5.x.** Vitest 5 declares Node `^22.12 ‖ ^24 ‖ >=26` and excludes Node 25. |
| happy-dom | `^21.0.4` | UI unit tests |
| fake-indexeddb | `^6.2.6` | kit-store tests |
| @playwright/test | `^1.64.1` | |
| @axe-core/playwright | `^4.14.0` | |
| @lhci/cli | `^0.15.1` | |
| linkinator | `^8.1.0` | broken-link check on `dist/` |
| tsx | `^4.23` | scripts |
| eslint | `^10` | |
| typescript-eslint | `^8.72` | |
| eslint-plugin-astro | `^3.2.1` | peer eslint ≥10 |
| eslint-plugin-jsx-a11y | `^6.10.2` | |
| prettier | `^3.9`, prettier-plugin-astro `^0.14` | |
| @types/node | `^24` | |

**Not used:**
- `@astrojs/sitemap`. Version 3.7 pulls in zod 4 and is maintained for Astro 6/7. We need sitemaps split by type plus hreflang, so we write about 60 lines of custom endpoints instead.
- `sharp`. Nothing at runtime needs it. `assets-generator` brings its own copy for the one-off icon run.
- `fuse.js`. A custom matcher under 2 KB covers about 47 exams (section 3.10).
- `cropperjs`. We build a custom Preact canvas cropper.

### 1.4 HEIC decoder: `libheif-js`, not `heic2any`

`heic2any` (0.0.4):
- has not been updated since 2023;
- needs the main thread and DOM;
- spawns its own blob worker;
- ships about 2.7 MB of asm.js.

`libheif-js` (`libheif-js/wasm-bundle`):
- is maintained (Oct 2026);
- runs inside our engine worker;
- matches spec 12.1.

It loads only after the native `createImageBitmap` attempt fails. It is **excluded from precache** and runtime-cached on first use instead.

### 1.5 Tailwind: v3.4 through plain PostCSS, not v4

- **v4 breaks on our oldest browsers.** It targets Safari 16.4+ and Chrome 111+ because it relies on `@layer`, `@property` and `color-mix()`. Spec 13 requires **Chrome Android 90+ and iOS Safari 15+**. Browsers without cascade-layer support (Chrome < 99, Safari < 15.4) drop entire `@layer` blocks, so a v4 site would render unstyled on part of our audience.
- **We skip the integration.** `@astrojs/tailwind` is deprecated (peer `astro ≤5`, `tailwindcss ^3`). It would work, but Astro's Vite already runs PostCSS natively. So we use `tailwind.config.cjs` plus `postcss.config.cjs` and nothing else.
- **Tokens:** section 3.2 tokens become CSS variables in `src/styles/global.css`. `tailwind.config.cjs` maps them to `colors.primary = 'rgb(var(--color-primary) / <alpha-value>)'`. Dark mode uses `darkMode: ['class', '[data-theme="dark"]']`, and a `prefers-color-scheme` fallback lives in CSS.

### 1.6 Known pitfalls to brief every agent on

1. **jsquash WASM in Node.**
   - Problem: jsquash finds its `.wasm` with `new URL(..., import.meta.url)` plus `fetch`, and Node's fetch rejects `file:` URLs.
   - Fix: always initialise explicitly. `import encode, { init } from '@jsquash/jpeg/encode'`, then `init(await WebAssembly.compile(bytes))`.
   - Browser: the bytes come from `import url from '@jsquash/jpeg/codec/enc/mozjpeg_enc.wasm?url'`.
   - Node: the bytes come from `fs.readFileSync(require.resolve(...))`.
   - Put this in `src/engine/codecs.ts` behind a `WasmSource` adapter. `tests/engine/setup.ts` injects the Node adapter.
2. **Vite dev pre-bundling breaks the WASM URLs.** Set `vite.optimizeDeps.exclude: ['@jsquash/jpeg','@jsquash/png','@jsquash/webp','@jsquash/resize','libheif-js','pdfjs-dist']`.
3. **Worker build format.** Set `vite.worker.format: 'es'`. The default `iife` fails as soon as the worker uses dynamic `import()` ("IIFE not supported for code-splitting builds").
   - Create the worker with `new Worker(new URL('./worker.ts', import.meta.url), { type: 'module' })`, not `?worker`. It is the same pattern in dev, build and Playwright.
   - Module workers work in Chrome 80+ and Safari 15+.
   - Set `worker.rollupOptions.output.entryFileNames: '_astro/workers/[name]-[hash].js'` so CSP and caching can target the path.
4. **MozJPEG option names are misleading.** `baseline: true` in jsquash means "baseline-compatible quant tables". It does **not** mean non-progressive. Set all of:
   - `progressive: false`
   - `baseline: true`
   - `auto_subsample: false`, `chroma_subsample: 2` (4:2:0)
   - `optimize_coding: true`
   - `trellis_multipass: false` (speed)

   Verify by checking for an SOF0 (`FFC0`) marker and no SOF2.
5. **pdfjs worker.** Nested workers are unreliable on iOS 15, and pdfjs needs canvas and font APIs. So **pdfjs runs on the main thread** with its own worker, lazy-loaded:
   - `GlobalWorkerOptions.workerSrc = new URL('pdfjs-dist/legacy/build/pdf.worker.min.mjs', import.meta.url)`
   - `isEvalSupported: false` (CSP)

   Pages are rasterised to `ImageData` and transferred to the engine worker, which handles encoding and pdf-lib.
6. **OffscreenCanvas is missing in Node and in iOS < 16.4 workers.** The engine core works only on `RasterImage {data: Uint8ClampedArray, width, height}`. Canvas appears only at the edges: decode, the name strip text, and the fallback resize.
7. **Satori cannot shape Devanagari.** OG images are English for every page (Q9). Satori needs TTF, not WOFF2.
8. **WASM and CSP.** `'wasm-unsafe-eval'` exists only in Chrome 97+ and Safari 16+. Chrome 90–96 would need `'unsafe-eval'`. Mitigation in section 3.12.
9. **Cloudflare Pages URLs.** Use `build.format: 'file'` plus `trailingSlash: 'never'` so `/tools/resize-image` is served as-is, without a 308 redirect to a trailing slash. Workbox `cleanURLs` maps the URLs to `.html`.
10. **Node 25** is an odd-numbered release. CI uses Node 24 LTS and 25 locally. `.npmrc` keeps `engine-strict=false`.

---

## 2. File-level plan and ownership

Rules:
- Ownership is per phase and disjoint.
- **Frozen contract files**, marked ★, are created in Phase 1. Later workstreams only import them. Changes require orchestrator approval and a note in `QUESTIONS.md`.
- Ownership of a file passes forward only between phases, never within a phase.

### Phase 1: Foundation (agent P1, sequential)

Root:
- `package.json` with these scripts: `dev`, `build`, `preview`, `check` (astro check + tsc), `lint`, `format`, `test` (vitest run), `test:corpus`, `corpus:make`, `test:e2e`, `lhci`, `presets:check`, `budgets`, `links`, `icons`
- `package-lock.json`, `.npmrc`, `.nvmrc` (24), `.gitignore` (dist, `tests/fixtures/corpus/`, `.lighthouseci`), `.editorconfig`, `.prettierrc`, `eslint.config.js`
- `tsconfig.json`: extends `astro/tsconfigs/strict`, `jsxImportSource: preact`, paths `@/*` → `src/*`
- `astro.config.mjs`: static, `site` from `src/config/site.ts`, i18n, preact, mdx, PWA integration, vite options from section 1.6, `experimental.csp` (reads `src/config/csp.ts`)
- `tailwind.config.cjs`, `postcss.config.cjs`
- `vitest.config.ts`: projects `engine` (node env, setup `tests/engine/setup.ts`) and `ui` (happy-dom)
- `playwright.config.ts`, `lighthouserc.cjs`, `.github/workflows/ci.yml`: skeletons; H takes ownership in Phase 3

Contracts (★):
- ★ `src/engine/types.ts`
- ★ `src/engine/api.ts`: signatures plus comlink wiring. A owns the function bodies in Phase 2.
- `src/engine/worker.ts`: stub that throws `NotImplemented`. A owns it later.
- `src/engine/mock.ts`: canned `FitResult`s for B and F. B owns it later.
- ★ `src/content/presets/schema.ts`
- ★ `src/content/presets/index.ts`: loader and helpers (section 3.1)
- `src/content/presets/ibps-po.json`, `src/content/presets/ssc-cgl.json`, `src/content/presets/season.json`: seeds. D owns them later.
- ★ `src/content.config.ts`: `guides` collection with glob loader and the `astro:content` zod schema
- `src/content/guides/en/sample.mdx`: deleted by E
- ★ `src/i18n/index.ts`: `t(lang, key, vars)`, `getLangFromUrl`, `localizePath`
- ★ `src/i18n/KEYS.md`
- `src/i18n/en.json`, `src/i18n/hi.json`: the `common.*` namespace only; frozen after Phase 1
- `src/i18n/ns/{ui,kit,site,tool,guide}.{en,hi}.json`: empty `{}` files
- `src/i18n/hi-top-exams.json`: list of 30 slugs. G owns it later.
- ★ `src/config/site.ts`
- `src/config/csp.ts`: Security owns it in Phase 4
- `src/config/tools.ts`: tool registry `{slug, nameKey, path, kbPresets}`. F owns it later.
- ★ `src/lib/analytics.ts`: `track(event: AnalyticsEvent, props)`, a typed union of the section 11.1 events. No-op until configured.
- `src/styles/global.css` (tokens light/dark, base), `src/styles/fonts.css`
- `public/fonts/inter-latin-{400,600,700}.woff2`, `public/fonts/noto-devanagari-{400,600}.woff2`
- `public/icon.svg`, `public/logo.svg`, `public/favicon.ico`, `public/pwa-192.png`, `public/pwa-512.png`, `public/pwa-maskable-512.png`, `public/apple-touch-icon.png`
- `src/layouts/Base.astro`, `src/pages/index.astro`: minimal placeholders. C owns them later.
- `scripts/i18n-check.ts`: every key exists in `en`; `hi` missing a key → warning, extra key → error

### Workstream A: Engine (Phase 2)

Owns `src/engine/**` except the ★ files. `api.ts` bodies may change, signatures may not. A also owns `tests/engine/**`, `scripts/make-test-corpus.ts` and `tests/fixtures/README.md`.

| File | Contents |
|---|---|
| `src/engine/api.ts` | lazy worker, `prewarm()`, main-thread decode fallback, pdfjs orchestration |
| `src/engine/worker.ts` | `Comlink.expose(impl)`, image handle registry `Map<id, RasterImage>` |
| `src/engine/codecs.ts` | lazy jsquash loaders plus `WasmSource` adapter |
| `src/engine/decode.ts` | createImageBitmap → OffscreenCanvas → RasterImage; fallback jsquash decode + `exif.ts`; HEIC; 4000 px cap |
| `src/engine/exif.ts` | minimal orientation parser (APP1 tag 0x0112) |
| `src/engine/heic.ts` | native-first, then libheif-js |
| `src/engine/raster.ts` | crop, rotate90, fine rotate (bilinear), flip, grayscale, pixel hash |
| `src/engine/resize.ts` | jsquash Lanczos3; fallback stepwise halving (OffscreenCanvas) or pure-JS box/bilinear |
| `src/engine/dims.ts` | `chooseDims(spec, cropAspect, srcDims)` (section 3.4) |
| `src/engine/kb.ts` | `targetWindow(minKB, maxKB)`, `checkSize(bytes, spec)`, 1000/1024 dual check |
| `src/engine/fit.ts` | pure `fitRaster(raster, spec, deps)`, where `deps = {encodeJpeg, resize, now}` |
| `src/engine/jpeg-markers.ts` | marker walker, `setDpi`, `padWithCom`, `stripMetadata`, `inspectJpeg` (SOF type, JFIF density, dims) |
| `src/engine/grain.ts` | seeded mulberry32 noise ±1…±4 |
| `src/engine/blur.ts` | separable Gaussian (σ 0.5–1.5) |
| `src/engine/cleanup.ts` | illumination correction, Sauvola/Otsu, crop-to-ink, whiten, despeckle, blue-ink path |
| `src/engine/strip.ts` | name/date strip compose; text rasteriser injected |
| `src/engine/verify.ts` | final decode and checks → `FitResult.checks` |
| `src/engine/convert.ts` | T3 encode to jpg/png/webp |
| `src/engine/pdf.ts` | `imagesToPdf`, `assemblePdfFromJpegs` (pdf-lib) |
| `src/engine/pdf-raster.ts` | **main-thread** pdfjs rasteriser (legacy build) |
| `src/engine/compress-pdf.ts` | 150 → 100 → 72 DPI loop, text-only detection |
| `src/engine/sheet.ts` | T8 passport sheet (A4 / 4×6 in at 300 DPI, cut lines) |
| `src/engine/zip.ts` | fflate `zipSync` with level 0 for JPEGs, plus README.txt builder |

Tests (Vitest, Node):
- `tests/engine/setup.ts`: Node WASM init
- `tests/engine/{jpeg-markers,dpi,pad,kb,dims,fit,fit-presets,cleanup,raster,exif,pdf,zip,strip,verify}.test.ts`
- `tests/engine/helpers/{synth.ts,decode.ts}`

Corpus:
- `scripts/make-test-corpus.ts` writes to `tests/fixtures/corpus/` (gitignored, deterministic seed, cached in CI)
- `tests/fixtures/real/` holds the 20 consented photos. The owner adds these later; tests skip if the folder is empty.

### Workstream B: UI components and Kit (Phase 2)

Owns:
- `src/components/ui/**`, `src/components/kit/**`
- `src/islands/KitFlow.tsx`, `src/islands/ExamSearch.tsx`, `src/islands/FeedbackPrompt.tsx`
- `src/lib/{kit-store,search,format,download}.ts`
- `src/engine/mock.ts` (from Phase 2)
- `src/i18n/ns/{ui,kit}.{en,hi}.json`
- `tests/unit/ui/**`

| Path | Contents |
|---|---|
| `src/components/ui/` | `Button.tsx`, `Toggle.tsx`, `Slider.tsx`, `Skeleton.tsx`, `ProgressBar.tsx`, `LiveRegion.tsx`, `ConfirmDialog.tsx`, `Icon.tsx` (Lucide re-exports) |
| `src/components/kit/` | `Uploader.tsx` (camera `capture`, gallery, drag-drop, 25 MB/type guard), `TrustLine.tsx`, `Cropper.tsx` (pointer events: pinch/drag/zoom slider/rotate/fine-rotate/flip), `CropGuides.tsx` (face oval + eye line; 80% ink box), `PassCheck.tsx`, `KbMeter.tsx`, `StepProgress.tsx`, `DocCard.tsx`, `ResultPreview.tsx` (real size + zoom), `NameDateStripForm.tsx`, `SummaryGrid.tsx`, `ShareButton.tsx`, `DeclarationTraceSheet.tsx` (K13: calls `imagesToPdf` with a text page, or pdf-lib through the engine) |
| `src/islands/KitFlow.tsx` | state machine: checklist → upload → crop → result → summary |
| `src/islands/ExamSearch.tsx` | header and home search (K1) |
| `src/islands/FeedbackPrompt.tsx` | K15 |
| `src/lib/kit-store.ts` | IndexedDB (section 3.9) |
| `src/lib/search.ts` | normalise, match, group (section 3.10) |
| `src/lib/format.ts` | KB/px/cm display |
| `src/lib/download.ts` | blob download, Web Share |
| `tests/unit/ui/` | `kit-store.test.ts`, `search.test.ts`, `passcheck.test.tsx`, `kitflow.test.tsx` (runs against `mock.ts`) |

B exposes reusable pieces for F's tool islands: `Uploader`, `Cropper`, `PassCheck`, `KbMeter`, `ResultPreview`.

### Workstream C: Site, pages, SEO (Phase 2)

Owns:
- `src/layouts/**`
- `src/pages/**` **except** `src/pages/tools/**` and `src/pages/hi/tools/**`
- `src/components/site/**`, `src/seo/**`
- `src/config/{monetization,analytics}.ts`
- `src/assets/og-fonts/**`, `src/scripts/theme.ts`
- `src/i18n/ns/site.{en,hi}.json`
- `tests/unit/seo/**`

| Path | Contents |
|---|---|
| `src/layouts/` | `Base.astro` (head, fonts preload, theme pre-paint script, header/footer, SW register), `Exam.astro`, `Tool.astro` (template F fills via slots), `Guide.astro`, `Kit.astro` (minimal chrome), `Legal.astro` |
| `src/components/site/` | `SeoHead.astro`, `Header.astro`, `Footer.astro`, `LangToggle.astro`, `ThemeToggle.astro`, `Breadcrumbs.astro`, `SpecTable.astro`, `NoticeBadge.astro`, `RejectionTips.astro`, `DeclarationText.astro`, `LiveCaptureTips.astro`, `FaqList.astro`, `RelatedExams.astro`, `ExamCard.astro`, `PromoSlot.astro`, `AffiliateSlot.astro`, `HowItWorks.astro`, `TrustStrip.astro` |
| `src/seo/meta.ts` | section 9.2 title/description templates |
| `src/seo/jsonld.ts` | WebApplication, HowTo, FAQPage, BreadcrumbList, Article, Organization |
| `src/seo/og-image.ts` | satori + resvg |
| `src/seo/hreflang.ts` | |
| `src/pages/` (EN) | `index.astro`, `exams.astro`, `exam/[slug].astro`, `exam/[slug]/[document].astro`, `kit/[slug].astro`, `guides/index.astro`, `guides/[slug].astro`, `sources.astro`, `about.astro`, `privacy.astro`, `terms.astro`, `disclaimer.astro`, `contact.astro`, `report.astro`, `404.astro`, `offline.astro` |
| `src/pages/hi/` | `index.astro`, `exams.astro`, `exam/[slug].astro` (30 slugs from `hi-top-exams.json`), `guides/index.astro`, `guides/[slug].astro`, `kit/[slug].astro` (same 30) |
| `src/pages/og/[...path].png.ts` | static OG PNGs |
| `src/pages/robots.txt.ts`, `src/pages/sitemap-index.xml.ts`, `src/pages/sitemap-[type].xml.ts` | `type` ∈ pages, exams, documents, tools, guides; each carries `xhtml:link` hreflang |
| `src/config/monetization.ts` | section 10; promo per group, UTM builder |
| `src/config/analytics.ts` | provider: `'plausible' \| 'umami' \| 'none'`, default `none` until the domain is set |
| `src/assets/og-fonts/` | `Inter-Bold.ttf`, `Inter-Regular.ttf` |
| `tests/unit/seo/` | `meta.test.ts`, `jsonld.test.ts` |

The page bodies use the shared section components. Hindi pages are thin wrappers that pass `lang="hi"`.

### Workstream D: Presets (Phase 2)

Owns:
- `src/content/presets/*.json`: 47 exams per QUESTIONS Q1 (35 `published: true`)
- `src/content/presets/season.json`
- `src/content/exam-copy/en/[slug].md`: 400–900 words per published exam
- `scripts/presets-check.ts`
- `tests/presets/presets.test.ts`

### Workstream E: Guides (Phase 3)

Owns:
- `src/content/guides/en/*.mdx` and `src/content/guides/hi/*.mdx`: 10 + 10 guides, deleting `sample.mdx`
- `src/assets/guides/*.svg`
- `src/i18n/ns/guide.{en,hi}.json`

### Workstream F: Standalone tools (Phase 3)

Owns:
- `src/islands/tools/{ToolCompress,ToolResize,ToolConvert,ToolSignature,ToolThumb,ToolDeclaration,ToolImagesToPdf,ToolCompressPdf,ToolPhotoSheet,ToolBatch,ToolCustomPreset}.tsx`
- `src/components/tools/**`: `SettingsPanel`, `UnitInput`, `ImageList` (drag reorder), `TargetKbPicker`
- `src/pages/tools/{index,compress-image,compress-image-to-[n]kb,resize-image,convert-image,signature-resize,thumb-impression,handwritten-declaration,images-to-pdf,compress-pdf,passport-photo-sheet,batch-compress,custom-preset}.astro`
- `src/pages/hi/tools/*.astro`: top 6 tools
- `src/config/tools.ts`
- `src/i18n/ns/tool.{en,hi}.json`
- `tests/unit/tools/**`

### Workstream G: Hindi (Phase 3)

Owns:
- every `*.hi.json` under `src/i18n/ns/`, plus `src/i18n/hi.json` values (key set frozen)
- `src/i18n/hi-top-exams.json`
- `src/content/exam-copy/hi/[slug].md` (30 files)
- **edits to the `hi` string fields only** in `src/content/presets/*.json`. D is finished by then; G changes no other fields.

### Workstream H: QA (Phase 3)

Owns:
- `tests/e2e/**`: `kit-ibps.spec.ts`, `tools.spec.ts`, `hindi.spec.ts`, `offline.spec.ts`, `privacy-network.spec.ts`, `a11y.spec.ts`, `perf-fit.spec.ts`, `helpers/`
- `playwright.config.ts`, `lighthouserc.cjs`, `.github/workflows/ci.yml`
- `scripts/check-budgets.ts`: gzip sum of JS+CSS referenced per HTML page in `dist/`
- `tests/fixtures/e2e/*`: a few small committed images and PDFs

### Security (Phase 4)

Owns:
- `public/_headers`, `src/config/csp.ts`
- `tests/security/{csp.spec.ts,headers.test.ts}`
- `SECURITY.md`
- the `npm audit` report in the PR description

### Final review (Phase 4)

Owns `LAUNCH_CHECKLIST.md`. The orchestrator owns `QUESTIONS.md` and `PLAN.md`.

---

## 3. Key design decisions

### 3.1 Loading presets: `import.meta.glob` plus Zod at build

- `src/content/presets/index.ts` reads all preset files with `import.meta.glob('./*.json', { eager: true, import: 'default' })` and runs `ExamPresetSchema.parse()` on each at module load.
  - Any invalid file throws, so `astro build` and vitest fail. This meets spec 8.1.
- **Why not a content collection:**
  - The same module must work in Vitest (engine `fit-presets` test, D's tests) and in `scripts/presets-check.ts`.
  - It must also give B/C/F plain typed objects without `astro:content`, which is unavailable in Node scripts and awkward in islands.
  - `import.meta.glob` works in both Astro and Vitest.
  - `scripts/presets-check.ts` (tsx) uses an `fs` fallback, `loadPresetsFromFs()`, from the same module.
- **Exports:** `getAllPresets()`, `getPublishedPresets()` (honours `SHOW_UNPUBLISHED=1` for preview builds), `getPreset(slug)`, `docSlug(doc, siblings)`, `getSources()`, `getSeasonOrder()`, `presetHash(preset)`.
- Islands never import the module. Pages pass the single preset (or a slim search index) as props, so other exams' data stays out of the client bundle.
- **Guides** do use the `astro:content` collection (MDX benefits from it). Its schema uses `z` from `astro:content`, which is the same zod 3.25 instance.

### 3.2 Schema (`schema.ts`, ★)

Exports: `DocSpecSchema`, `PresetDocumentSchema` (DocSpec plus the additions below), `ExamPresetSchema`, and the inferred `ExamPreset` and `PresetDocument` types.
- `types.ts` re-exports `DocSpec` as the interface from spec 7.8.
- A compile-time test asserts `z.infer<DocSpecSchema>` is assignable to it.

Additions (the A.11 substitute from Q1, plus Q4 and Q7):
- **Exam level:**
  - `published: boolean`, `confidence: 'H'|'M'|'L'|'H/M'|'M/L'`
  - `liveCaptureTips?: {en,hi}[]`
  - `group` enum from spec 8.2
  - `lastChecked`: ISO date string
  - `seasonMonths`: numbers 1–12
- **Document level:**
  - `sizeNote?`, `disputed?`, `toVerify?`, `variant?: 'dual-language'|'triple'|null`, `captureTip?`
  - **Q4:** `physical?: {width:number; height:number; unit:'cm'|'mm'|'in'}` and `pxDerived?: boolean`
  - **Q7:** `slug?: string`, needed when an exam has two documents of the same type, e.g. `signature-hindi`
- **Refinements:**
  - `fileName` is unique within an exam.
  - If `pxDerived`, then `widthPx === round(width_in_inches × dpi) ± 1`.
  - `minKB < maxKB`.
  - Either both or neither of `widthPx`/`heightPx` is null.
  - `fileName.length <= maxFileNameChars` when that is set.
  - `format === 'pdf'` ⇒ `doc === 'certificate'`.
  - `related` slugs exist. This is a cross-file check in `index.ts`.

### 3.3 Converting cm to px

- D does the conversion **at authoring time**. The preset stores `widthPx`/`heightPx` (the engine input) plus `physical`, `dpi` and `pxDerived: true`. Default DPI is 200 when the notice gives none.
- The `sizeNote` field says so, for example "≈472×157 px, derived from 6.0×2.0 cm at 200 DPI".
- The spec table shows both px and cm.
- The schema refinement catches arithmetic mistakes.
- The engine never sees a cm value.

### 3.4 Choosing output dimensions: `dims.ts`, pure

`chooseDims(spec, cropAspect, srcDims) → { w, h, flex: { canShrink, canGrow, minW, minH, maxW, maxH } }`
- **Fixed** (`widthPx`/`heightPx` set): exact size, nothing flexible.
- **Pixel range** (any `min*/max*Px`): aspect follows the crop. The crop box is constrained to the range's aspect bounds.
  - If both min and max exist (UPSC 350–500 square), start at the max.
  - If only a minimum exists (RRB 140×60, no max), start at `min × 2.5`, capped at 600 px on the long side. For RRB that gives 350×150, which also matches the 35×20 mm box at ~250 DPI.
  - The fit loop may shrink in 5% steps toward the minimum when too large, and may grow in 10% steps toward the max/cap when too small. It tries growing **before** grain or padding.
- **KB-only** (`widthPx` null, no ranges):
  - Photo: 413×531 (3.5×4.5 cm at 300 DPI) per A.4, with the crop locked to 7:9.
  - Signature, thumb, declaration and other: keep the user's crop aspect, long side = `min(src, defaults[doc])`. Defaults: signature 600, thumb 400, declaration 1200, other 1600.
  - Shrink only if the size is still above max at `qFloor = 50`. Steps are 10%, down to a floor of 50% of the start size.
- The resulting `{w, h}` is recorded in `FitResult`. The pass check shows "Width × Height" as an exact rule, a range, or "any (KB-only)".

### 3.5 Fit algorithm: `fit.ts`, pure and injectable

```
fitRaster(raster, spec, deps, opts) → FitResult
  deps: { encodeJpeg(r, q) → Uint8Array, resize(r, w, h) → RasterImage, now() }
```

1. Get dims from `chooseDims`, resize to them, and compose the name/date strip if requested.
2. Get the target window from `kb.ts`:
   - `lo = minKB × 1024`, `hi = maxKB × 1000` when `lo < hi`. This is the window that is safe under **both** KB definitions.
   - Otherwise `[minKB×1024, maxKB×1024]`.
   - `mid = (lo + hi) / 2`.
3. Encode at q=90 and record the `encode` stage.
4. Over the max: binary search q in [5, 90], at most 8 iterations, highest q ≤ hi, and record `search`. The first probe uses a secant estimate from (90, size) to save iterations.
   - At q=5 and still too big: if `flex.canShrink`, step dims down 5% and repeat; otherwise try blur σ 0.5 → 1.0 → 1.5 and record `blur`.
   - If it still fails: `FitError{code:'TOO_DETAILED'}`.
5. Under the min: binary search q in [90, 100] for the lowest q ≥ lo.
   - If it is still under at q=100: if `flex.canGrow`, step up; then run `grain` with seeded noise ±1, ±2, ±3, ±4 at q=95–100.
   - If it is still under, `pad`: insert COM segments after APP0 to reach `mid`.
6. `dpi`: run `setDpi(bytes, spec.dpi ?? (spec.physical ? 200 : null))` and `stripMetadata` (keep JFIF only).
7. `verify.ts` decodes the final bytes and builds the checks: dims, size (1024), size (1000 → warning only), format magic `FFD8FF`, baseline SOF0, DPI density, and background (white-ratio heuristic for signature, thumb and photo; result is "n/a" when not checkable).
8. Return a `FitResult` with `stages` and `durationMs`, plus optional `warnings` and `dims`.

PNG format: encode with `@jsquash/png`. If over max and `canShrink`, step down; otherwise fail with a clear error. No quality search.

### 3.6 DPI patch and COM padding (`jpeg-markers.ts`)

- `walkMarkers(bytes)` yields `{marker, offset, length}` from SOI up to SOS. It handles `FFxx` fill bytes and stops at SOS.
- **`setDpi`:**
  - If the first segment is APP0 with `JFIF\0`, write units=1 at segment offset+11 and X/Y density as big-endian u16 at +12 and +14.
  - Otherwise insert a 18-byte JFIF APP0 (`FFE0 0010 'JFIF\0' 01 01 01 XX XX YY YY 00 00`) immediately after SOI.
  - Any existing EXIF APP1 is removed by `stripMetadata`.
- **`padWithCom(bytes, targetSize)`:**
  - Insert `FFFE` segments right after APP0. Each has length field ≤ 65535, so payload ≤ 65533.
  - The payload is ASCII spaces.
  - Overhead is accounted for exactly: 4 bytes per segment.
  - It never touches the scan data.
- **Tests:** JPEGs with and without APP0, EXIF first, existing COM segments. After padding, the decoded pixel hash is identical (spec 14.1).

### 3.7 Engine API (`api.ts` ★) and handles (Q5)

- Spec 7.8 names, argument order and the `DocSpec`/`FitResult` shapes are kept.
- **Deviation:** images are passed as an opaque `EngineImage {id, width, height}` handle that lives in the worker, not as `ImageBitmap`. This avoids copying 12 MP buffers across the boundary and works in Node tests and on iOS 15 workers without OffscreenCanvas.
- `release(img)` frees memory. The UI previews from `URL.createObjectURL(file)`; the browser applies EXIF orientation itself.

```ts
decode(file: File, opts?: { maxSide?: number }): Promise<EngineImage>
crop(img, rect: {x,y,w,h}, rotationDeg: number, flip: {h:boolean; v:boolean}): Promise<EngineImage>
cleanup(img, kind: 'signature'|'thumb', opts: { strength: number; ink: 'black'|'blue' }): Promise<EngineImage>
fit(img, spec: DocSpec, opts?: { nameDate?: {name: string; date: string} }): Promise<FitResult>
imagesToPdf(files: (File|EngineImage)[], opts: { page: 'a4'|'original'; maxKB: number|null; minKB?: number|null }): Promise<Uint8Array>
compressPdf(file: File, maxKB: number): Promise<Uint8Array>   // throws {code:'ALREADY_SMALL'}
zip(files: {name: string; bytes: Uint8Array}[], readme?: string): Promise<Uint8Array>
// additive:
prewarm(kinds?: ('jpeg'|'resize'|'png'|'webp')[]): void
release(img: EngineImage): void
convert(img, format: 'jpg'|'png'|'webp', quality?: number): Promise<Uint8Array>
photoSheet(img, opts: { copies: 4|8|12|16; paper: 'a4'|'4x6' }): Promise<Uint8Array>
```

- The worker is created lazily on the first call. `prewarm()` is called on the Uploader's `pointerenter` and `focus` to start WASM fetch and compile.
- Byte arrays returned from the worker go through `Comlink.transfer`.
- `FitError` codes form a closed union in `types.ts`: `TOO_DETAILED`, `TOO_PLAIN`, `DECODE_FAILED`, `TOO_LARGE_INPUT`, `UNSUPPORTED_TYPE`, `PDF_IMPOSSIBLE`, `ALREADY_SMALL`. The UI maps each code to an i18n message with numbers.
- **Decode chain** (worker first, main thread second):
  1. `createImageBitmap(blob, {imageOrientation:'from-image'})` plus OffscreenCanvas `getImageData`.
  2. Otherwise jsquash decode (jpeg/png/webp) plus the `exif.ts` orientation.
  3. If the type is HEIC: try native first, then libheif.
  4. If the worker lacks OffscreenCanvas, `api.ts` decodes on the main thread with `<canvas>` and transfers the RGBA.
  5. Cap the long side at 4000 px immediately and `close()` the bitmaps.
- **Text rasteriser** for the name strip: in the worker it uses OffscreenCanvas `fillText` with system sans-serif. Without OffscreenCanvas, `api.ts` renders the strip on the main thread and passes the raster in. Tests inject a stub.

### 3.8 Testing the engine in Node

- `tests/engine/setup.ts` calls `setWasmSource(nodeSource)` from `codecs.ts`.
- Tests decode with jsquash. createImageBitmap is never used in Node.
- `fit.test.ts` uses a **fake encoder**, `size = f(q, entropy)`, to test the search, grain, pad and shrink branches deterministically and fast.
- `fit-presets.test.ts` runs real MozJPEG:
  - Each **distinct** DocSpec (deduped by hash; about 40) against a 30-image stratified corpus sample runs in default CI, within about 60 s using threads.
  - `npm run test:corpus` runs the full ≥300 × all specs matrix and asserts:
    - 100% correct pixels and format;
    - ≥ 99.5% within the KB range under the 1024 definition;
    - a p95 timing report.
- The 4×-throttle timing check is done in Playwright (`perf-fit.spec.ts`).

### 3.9 Kit state in IndexedDB (`kit-store.ts`)

- Store: `createStore('sahisize', 'kv')`.
- **Keys:**
  - `kit:v1:{slug}` → `{ v:1, slug, presetHash, cycle, updatedAt, current: {docKey, screen}|null, docs: Record<docKey, DocState> }`
    - `docKey = docSlug(doc)`
    - `DocState = { status: 'todo'|'in-progress'|'done', source?: Blob (the original File, or a JPEG re-encode if > 8 MB), crop?: {rect, rot90, fineDeg, flip}, cleanup?: {on, strength, ink}, nameDate?, output?: {blob: Blob, sizeBytes, w, h, quality, stages, checks} }`
  - `feedback:pending` → `{slug, docs[], downloadedAt}`. Written on the ZIP or last download. On a visit at least 1 hour later, `FeedbackPrompt` shows (K15), then the key is deleted.
- **Writes:** debounced 300 ms; blobs are stored as Blob, which Safari 15 supports.
- **On load:**
  - If `presetHash` differs, keep the sources and crops but mark outputs stale, then re-run fit. Show a notice.
  - Entries older than 30 days are purged.
- **"Start over"** shows the confirm dialog, then calls `del(key)`.
- **Private mode or no IndexedDB:** use an in-memory fallback and a banner saying progress won't be saved.

### 3.10 Search (K1)

- At build time C emits a slim index into the props of the Header search and the home page: `{slug, en, hi, aliases[], body, group}` for published exams.
- `search.ts`:
  - normalises (lowercase, strip punctuation and spaces, Devanagari nukta and chandrabindu folding);
  - scores prefix match > token match > trigram Jaccard > Damerau-Levenshtein ≤ 2 on tokens;
  - groups results by body.
- Size: under 2 KB gz plus an index under 4 KB.
- Tests cover "ibps po", "ibsp po", "आईबीपीएस", "up police" (hidden → no result but a "coming soon" hint), "sbi clrk".

### 3.11 i18n routing and keys (Q6)

- Astro i18n: `{ defaultLocale: 'en', locales: ['en','hi'], routing: { prefixDefaultLocale: false } }`.
- Hindi routes are physical files under `src/pages/hi/`. They reuse layouts and sections with `lang` as a prop.
- `<html lang="hi-IN">` on Hindi pages. `hreflang` pairs come from `src/seo/hreflang.ts`, only when a counterpart exists.
- **Key files (deviation Q6):** `en.json`/`hi.json` hold `common.*` and are frozen after Phase 1. Every workstream writes only its own namespace files `src/i18n/ns/{ns}.{lang}.json`, which avoids write races between parallel agents. `t()` merges them.
- **Namespaces:**

  | Prefix | Owner |
  |---|---|
  | `common.*` | P1 |
  | `ui.*`, `kit.*` | B |
  | `site.*`, `seo.*` | C (`seo` keys live inside `site.json` under `site.seo.*`) |
  | `tool.*` | F |
  | `guide.*` | E |

- `KEYS.md` documents: dot paths in lowerCamel, `{var}` interpolation, no HTML in values, Hindi values may be Hinglish where natural, and that new keys must exist in `en` first.
- `scripts/i18n-check.ts` runs in CI.
- Hindi strings in islands: the page passes only that island's namespace dictionary as a prop, so client bundles don't carry every string.
- The language toggle maps to the counterpart URL, or to `/hi/` if there is none.

### 3.12 Security: CSP and headers (Q10)

- **The CSP lives in a `<meta>` tag.** Astro 5 inlines the island hydration runtime and small scripts, so a strict header-only CSP is impossible.
  - Use Astro `experimental.csp` (available since 5.9). It emits a `<meta http-equiv="Content-Security-Policy">` containing sha256 hashes of every inline script.
  - Directives come from `src/config/csp.ts`:
    - `default-src 'self'`
    - `script-src 'self' 'wasm-unsafe-eval' <hashes> <analytics origin>`
    - `worker-src 'self' blob:`
    - `img-src 'self' data: blob:`
    - `connect-src 'self' <analytics origin>`
    - `font-src 'self'`
    - `style-src 'self' 'unsafe-inline'` (no inline scripts; the inline-style allowance keeps Preact and Astro style attributes safe). Use `build.inlineStylesheets: 'never'`.
    - `object-src 'none'`, `base-uri 'self'`, `form-action 'self'`
  - JSON-LD is a non-executed data block, so it is not affected.
- **`public/_headers`** holds what a meta tag cannot:
  - `frame-ancestors 'none'` as a header CSP **without** `default-src` or `script-src`. Two policies intersect, and a header `script-src` would block the hashed inline scripts.
  - `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`
  - `Permissions-Policy: camera=(self), geolocation=(), microphone=()`
  - `Cross-Origin-Opener-Policy: same-origin`
  - `Cache-Control: immutable` for `/_astro/*`
  - `Content-Type: application/wasm` for `*.wasm`
- **Old Chrome (90–96):** `/_astro/workers/*` gets its own header CSP with `script-src 'self' 'unsafe-eval'`, because a worker's CSP comes from its own response. That lets WASM compile there.
  - If testing shows the document policy still blocks it, accept it and document it: on those browsers `api.ts` catches the `CompileError` and shows "Please update Chrome".
- **Fallback** if `experimental.csp` cannot express `'wasm-unsafe-eval'`: run `scripts/csp-hashes.ts` after build to inject the meta tag. Owned by Security.

### 3.13 Deviations to record in QUESTIONS.md

- **Q4:** per-document `physical` and `pxDerived` fields.
- **Q5:** `EngineImage` handles instead of `ImageBitmap`.
- **Q6:** i18n namespace files.
- **Q7:** per-document `slug`.
- **Q8:** Tailwind v3.4 because of the browser floor.
- **Q9:** OG images in English only, because satori can't shape Devanagari.
- **Q10:** CSP split between meta and header, and the old-Chrome WASM caveat.
- **Q11:** Astro 5.18 pinned although 7.x is current.

### 3.14 OG images at build

- `src/pages/og/[...path].png.ts` uses `getStaticPaths` over: home, the exams index, every published exam (`og/exam/{slug}.png`), tools, and guides.
- Document pages and Hindi pages reuse their exam's image, which keeps the count to about 70.
- Each image is a satori JSX-like object: navy background, logo mark, "{Exam} Photo & Signature Size", cycle, "sahisize". Size 1200×630, rendered to PNG with resvg using the Inter TTF.
- `og-default.png` is generated the same way at `og/default.png`.
- Expected to add about 10 s to the build.

### 3.15 PWA (`@vite-pwa/astro`, generateSW)

- `registerType: 'autoUpdate'`. The manifest is in the integration config: name, short_name, theme `#1E3A8A`, background `#F8FAFC`, the icons from Phase 1, `display: standalone`, `start_url: /`.
- **Precache** (`globPatterns`), about 3 MB:
  - `**/*.{js,css,woff2,svg,ico,webmanifest}`
  - the jsquash `*.wasm` files (jpeg enc/dec, resize, png, webp)
  - HTML for `index`, `exams`, `offline`, `404`, all `tools/*`, all `kit/*` for published exams, and the `/hi/` equivalents of the top tools and kits
  - `maximumFileSizeToCacheInBytes: 4 MB`
- **Excluded from precache:** libheif and pdfjs chunks (about 1.5 MB each) and OG images.
- **Runtime caching:**
  - `/_astro/*` and those chunks: CacheFirst.
  - Other HTML: NetworkFirst with a 3 s timeout, falling back to the cache.
  - `navigateFallback: '/offline'` with a denylist for `/og/`.
- Workbox `cleanURLs` matches the `.html` files from `build.format: 'file'`.
- `offline.spec.ts`: the first visit waits for `navigator.serviceWorker.ready`, then goes offline and completes a compress task (spec 13 and 14.3).

### 3.16 Performance

- Islands hydrate with `client:visible`; the search uses `client:idle`.
- Static HTML has no framework JS.
- The engine and WASM load only after a file is picked or the prewarm hover fires.
- Fonts:
  - Preload Inter 400 latin only.
  - The Devanagari face uses `unicode-range`, so it downloads only when Devanagari glyphs render.
- `scripts/check-budgets.ts` fails CI when a page's JS+CSS exceeds 120 KB gz or total weight before tool use exceeds 300 KB.
- Lighthouse CI asserts ≥ 0.95 in all four categories on: `/`, `/exam/ibps-po`, `/tools/compress-image-to-20kb`, `/hi/`.

---

## 4. Ordered tasks and acceptance checks

Every task ends with a commit. A phase ends with a fresh review agent that runs `npm run check && npm run lint && npm test && npm run build` plus the phase's acceptance checks.

### Phase 1: Foundation (one agent, in order)

1. Scaffold the root files and dependencies from section 1. **Check:** `npm ci` passes; `astro build` passes on an empty site.
2. Tailwind tokens, `global.css` (light/dark), fonts, logo, icons, favicon via `npm run icons`. **Check:** contrast of every token pair ≥ 4.5:1, verified with a script or hand table in the review (spec 3.2).
3. Write `site.ts`, `csp.ts` (stub), `tools.ts` (stub), `analytics.ts`.
4. Write `types.ts`, `api.ts` (comlink, lazy worker, stub worker, `mock.ts`). **Check:** a vitest smoke test imports `api.ts` types and `mock.fit` returns a valid `FitResult`.
5. Write `schema.ts` and `index.ts`, with 2 seed presets and `season.json`. **Check:** a broken seed fails `astro build` (8.1).
6. Set up `content.config.ts`, the sample guide, the i18n files, `KEYS.md` and `i18n-check`.
7. Write a skeleton `Base.astro` and `index.astro`, plus the PWA integration. **Check:** the manifest validates.
8. Write the skeleton `ci.yml`: typecheck, lint, unit, build, schema validation, links (the e2e and LHCI jobs are placeholders). **Check:** Lighthouse runs on the placeholder pages and they score ≥ 95.

### Phase 2: Core (A, B, C, D in parallel)

**A: Engine**
1. `codecs.ts` with the WASM adapter, plus `setup.ts`. **Check:** jpeg encode and decode run in Node.
2. `jpeg-markers.ts`, `kb.ts`. **Checks:** 7.5; 14.1 (DPI patch variants, pad pixel-hash identical).
3. `raster.ts`, `exif.ts`, `decode.ts`, `heic.ts`. **Checks:** 7.1, EXIF-rotated corpus decodes upright, 4000 px cap.
4. `resize.ts`, `dims.ts`. **Checks:** 7.2, exact pixels, range and KB-only behaviour per section 3.4.
5. `fit.ts`, `grain.ts`, `blur.ts`, `verify.ts`. **Checks:** 7.3 (all stages reachable under the fake encoder), K5, K7 checks content, `stages` reported.
6. `cleanup.ts`. **Checks:** 7.4 and 14.1 (ink ≥ 80% of box, background ≥ 98% pure white), < 400 ms for a 4000×3000 input in Node as a proxy. Covers K6.
7. `strip.ts`. **Check:** K11 (the strip fits inside the final px and the face area is reduced, not overflowed).
8. `pdf.ts`, `pdf-raster.ts`, `compress-pdf.ts`, `zip.ts` with README. **Checks:** 7.6, 7.7, 14.1 PDF (under max KB, page count correct), K14.
9. `worker.ts` and the real `api.ts`. **Check:** in-browser smoke test (Playwright, `/dev/engine-smoke` page; dev-only, excluded from the build): decode → fit IBPS photo passes.
10. `make-test-corpus.ts` (≥ 300 images, 14.2) and `fit-presets.test.ts`. **Check:** 7.3 acceptance (100% px and format; ≥ 99.5% KB on the full corpus).

**B: UI**
1. `ui/*` primitives with 48 px targets and focus rings. **Check:** 6.1.
2. `Uploader` and `TrustLine`. **Checks:** K3 (types, 25 MB guard with the numbers in the message), 5.3 trust line.
3. `Cropper` and `CropGuides`. **Check:** K4 (aspect lock from `dims`, pinch, drag, zoom, rotate 90, fine ±10, flip, overlays). Keyboard: arrow keys nudge, +/- zoom.
4. `PassCheck`, `KbMeter`, `ResultPreview`. **Check:** K7 (download disabled while any rule fails; `aria-live` announcement).
5. `kit-store.ts` with tests. **Check:** K9 (reload restores state; "Start over" clears it).
6. `KitFlow`: checklist, step screens, summary, ZIP, Share, file names. **Checks:** K2, K8, K9, K10, K13 trace sheet, K14 step. Live-capture exams show the live tips instead of the photo step (A.3). Dual and triple signature variants show their guidance screens (A.1).
7. `ExamSearch` and `search.ts`. **Check:** K1 test cases.
8. `FeedbackPrompt`. **Check:** K15 (the "No" path opens `/report?exam=&doc=` and tracks only the event).
9. Analytics calls: `doc_uploaded` (KB bucket only), `fit_done` (stages, ms), downloads. **Check:** 11.1 (no file names or user names in the payload; unit test on the `track` args).

**C: Site**
1. `Base.astro`, `Header`, `Footer` (not-affiliated line, entity name), theme toggle with a pre-paint script, language toggle. **Check:** 6.1 and 3.2 dark mode.
2. `SeoHead`, `meta.ts`, `jsonld.ts`, `hreflang.ts`. **Check:** 9.1 and 9.2 templates, unit-tested.
3. Home (6.2), exams index (grouped and filterable), exam page (6.3, all 9 sections), exam document page, kit page (`Kit.astro` plus `KitFlow` island), sources page (5.3).
4. Legal pages, contact, report (mailto builder, no attachments), 404 (with search), offline page. **Check:** 11.2.
5. Guides index and `[slug]` routes from the collection (Article JSON-LD).
6. `/hi/` route wrappers.
7. OG endpoint, sitemaps split by type, `robots.txt`; custom-preset pages are `noindex`. **Check:** 9.1.
8. `monetization.ts` and `PromoSlot` with UTM; the slot appears after the tool, never inside it. **Check:** 10.

**D: Presets**
1. Convert A.2–A.9 into 47 JSON files. Apply overlap ranges with `sizeNote` (NEET thumb 50–200, MPPSC 25–100, SSC CPO 6.0×2.0 default plus a note), derived px with `physical`, variants, live-capture flags, `published` per Q1. **Check:** schema passes; exactly 35 published; 12 hidden.
2. Declaration texts (full SBI JA text from the PDF where reachable; otherwise marked `toVerify`), rejection tips with real portal messages (K16), 5–8 FAQs, related exams, `seasonMonths`, `season.json` order. **Checks:** K16, 6.3.
3. `exam-copy/en/*.md` (400–900 words, unique per exam). **Check:** 9.4 word-count test.
4. `presets-check.ts`. **Check:** 8.4 (lists presets older than 120 days or with a season starting within 30 days).

**Phase 2 review:** every K-item P0 works end to end with the real engine, using `npm run preview` and a manual walkthrough at 360 px; all unit tests pass.

### Phase 3: Tools and content (E, F, G, H in parallel)

**F: Tools.** Each page includes: the island, a SettingsPanel above the result, the PassCheck, how-to, FAQ, links to top exams, and JSON-LD (WebApplication, HowTo, FAQ).
1. T1 compress (custom, plus the 7 `compress-image-to-[n]kb` pages). **Check:** output within [target − 10%, target]; optional min; keep-dims vs downscale.
2. T2 resize (px, cm, mm, in with DPI; aspect lock). T3 convert (incl. HEIC input).
3. T4 signature and T5 thumb (cropper plus cleanup plus any KB range). Handwritten declaration tool (K13 flow standalone).
4. T6 images to PDF (20 max, drag reorder, A4 or original, max KB). T7 compress PDF ("already small" path).
5. T8 photo sheet. T9 batch (20 files, ZIP). T10 custom preset (URL params `w,h,min,max,dpi,fmt`, `noindex`, shareable).
6. Every tool emits `tool_used`.

**E: Guides.** 10 EN plus 10 HI MDX files (9.5), with internal links to tools and exams. **Check:** builds, Article JSON-LD, no broken links.

**G: Hindi**
1. All `hi` namespace files. **Check:** `i18n-check` shows no missing keys.
2. `hi-top-exams.json` (top 30 by season and size).
3. `exam-copy/hi/*.md` for the 30.
4. Review the `hi` fields in presets. **Check:** 14.3 Hindi rendering. Natural Hinglish-aware tone per 3.1.

**H: QA**
1. `kit-ibps.spec.ts`: Pixel 5, CPU ×4 via CDP `Emulation.setCPUThrottlingRate`, Fast 4G. Full IBPS PO kit, then unzip with fflate in the test and check every file against the preset (px, KB, SOF0, DPI). **Checks:** 5.1 acceptance (each fit < 2 s, measured through a `performance.mark` emitted by `KitFlow`), 14.3.
2. `tools.spec.ts`: each tool, fixture upload, pass, download.
3. `hindi.spec.ts`, `offline.spec.ts`.
4. `privacy-network.spec.ts`: intercept every request. It fails if any request body exceeds 1 KB or contains `FFD8FF`/`89504E47`/`%PDF`, or if the host is not first-party or analytics. **Check:** 5.3 and the 16 definition of done.
5. `a11y.spec.ts`: axe on every route type, EN and HI, light and dark. **Check:** 13 (WCAG AA).
6. `check-budgets.ts`, LHCI config and budgets, linkinator, the full `ci.yml` (the corpus matrix runs nightly). **Check:** 14.4.
7. A WebKit (iPhone 12) smoke project for the kit and one tool. **Check:** 13 browsers.

**Phase 3 review:** all suites green in CI; LHCI ≥ 95; budgets pass.

### Phase 4: Launch prep (parallel)

1. **Preset verification agents**, one per group (banking, ssc-rrb, nta, upsc, teaching, police, state-psc, defence-postal-delhi), each against the official PDFs (8.4). They update `sourceUrl`, `sourcePage`, `lastChecked` and `checkedBy`, and flip `published` only with evidence. Each runs `npm test` before committing.
2. **Security:** `_headers`, finalise `csp.ts`, `tests/security/csp.spec.ts` (listen for `securitypolicyviolation`: zero violations on every route type, including WASM compile and worker start), `npm audit --omit=dev` (zero high), SRI (no external assets; documented). **Check:** 11.3.
3. **Final review:** walk every route at 360 px and desktop, compare against the spec, and write `LAUNCH_CHECKLIST.md`. It includes the owner-only steps from Q3: domain, Cloudflare Pages project, GitHub remote, Search Console, analytics domain, and the 20 real fixture photos.

---

## 5. Risks and mitigations

| # | Risk | Mitigation |
|---|---|---|
| R1 | jsquash WASM fails to load in dev, build or Node | Explicit `init()` with the `?url` import and the `WasmSource` adapter; `optimizeDeps.exclude`. A's task 1 proves all three environments first. |
| R2 | Worker build breaks on dynamic imports | `worker.format: 'es'`, `new URL` worker pattern, smoke page in Phase 2. |
| R3 | iOS 15 has no OffscreenCanvas in workers | Core works on RasterImage; main-thread decode and strip fallbacks; WebKit smoke test. |
| R4 | Auto-fit over 2 s at 4× throttle (declaration 800×400; KB-only large images) | Secant first probe; at most 8 iterations; size-only encode options (no trellis multipass); prewarm WASM on hover; measured in `perf-fit.spec`. If still slow, cap search at 6 iterations with a ±3 q tolerance. |
| R5 | Grain or padding judged dishonest, or a portal rejects COM segments | Pixels unchanged (tested). `fit_stage` analytics measure frequency. Grow within the pixel range **before** grain or pad. A "padding used" note appears in the result. K15 feedback watches the RRB rejection rate. |
| R6 | Spec data errors, the biggest product risk | Zod refinements, `sizeNote` for conflicts, overlap targeting, the Phase 4 per-group verification agents, `presets:check`, `/report`. |
| R7 | CSP blocks the island runtime or WASM | Meta CSP with Astro-generated hashes; `csp.spec.ts` zero-violation check; post-build hash script fallback; old-Chrome caveat documented (Q10). |
| R8 | Tailwind or Preact version drift (v4, Preact 11, TS 7, Vitest 5, zod 4 all current) | Exact `~` pins in section 1; Renovate or a manual upgrade only after launch; a lockfile is committed. |
| R9 | Parallel agents collide on shared files | Disjoint ownership (section 2), i18n namespace files, frozen ★ contracts, per-phase handover only. |
| R10 | Memory crash on 3 GB phones with 12 MP or HEIC input | 4000 px cap at decode; `close()` bitmaps; `release()` handles; libheif runs in the worker with its output downscaled immediately; at most one decoded source held per doc; batch tool (T9) processes files sequentially. |
| R11 | pdfjs on old browsers or in workers | Legacy build on the main thread, lazy-loaded; `isEvalSupported: false`; compress-pdf reports `PDF_IMPOSSIBLE` cleanly. |
| R12 | PWA precache too heavy for slow 4G on first visit | Precache installs in the background after load; HEIC and pdfjs are runtime-cached; about 3 MB budget enforced by a test on `sw.js` manifest size. |
| R13 | Hindi typography (satori shaping, font weight on budget) | English OG images (Q9); `unicode-range` Devanagari subset ~30 KB loads only when needed. |
| R14 | SEO thin or duplicate content across 35 exams × documents | Unique per-exam copy (D and G) with a word-count test; document pages carry document-specific rules, tips and FAQ; hreflang only where a counterpart exists; `noindex` on custom-preset pages. |
| R15 | Cloudflare `_headers` 100-rule limit, trailing-slash redirects | Wildcard rules only; `build.format: 'file'` plus `trailingSlash: 'never'`; header test parses `_headers`. |
| R16 | Real-photo fixtures (14.2) not available | Tests skip the real set when the folder is empty; the item is tracked in `LAUNCH_CHECKLIST.md`. |
| R17 | Deployment needs tools that aren't installed (Q3) | CI and Pages config are committed; owner steps are listed in `LAUNCH_CHECKLIST.md`. |

### Critical Files for Implementation
- /Users/adityakumar/sahisize/src/engine/types.ts
- /Users/adityakumar/sahisize/src/engine/api.ts
- /Users/adityakumar/sahisize/src/engine/fit.ts
- /Users/adityakumar/sahisize/src/content/presets/schema.ts
- /Users/adityakumar/sahisize/astro.config.mjs