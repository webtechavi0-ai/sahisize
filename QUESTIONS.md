# Open questions and decisions

Each entry: the question, the decision taken (safest option), and what would change it.

## Q1. Spec was truncated (Appendix A.9 onward)
The spec pasted into chat was cut at 50,000 characters. Missing: the end of A.9, **A.10 (35-exam launch list)**, **A.11 (schema additions)**.

**Decision — launch list (A.10 substitute):** build presets for all 47 exams in A.2–A.9.
`published: true` for H, M and H/M confidence; `published: false` for L, M/L-with-disputed-core-sizes, and exams with no sizes.
That yields exactly 35 published:

- Banking (10): sbi-clerk, sbi-po, ibps-po, ibps-clerk, ibps-rrb-po, ibps-rrb-clerk, ibps-so, rbi-assistant, rbi-grade-b (thumb + declaration marked disputed), nabard-grade-a
- SSC/RRB (8): ssc-cgl, ssc-gd, ssc-cpo, ssc-chsl, ssc-mts, rrb-alp, rrb-group-d, rrb-ntpc
- NTA (5): neet-ug, jee-main, cuet-ug, ugc-net, csir-net
- UPSC (3): upsc-cse, nda, cds
- Teaching (3): ctet, htet, reet
- Police (1): bihar-police-constable
- State PSC (2): uppsc-pcs, mppsc
- Defence/postal/Delhi (3): iaf-agniveervayu, india-post-gds, dsssb

Hidden (12): uptet, kvs-teacher, bpsc-tre, haryana-police (sizes missing), up-police, mp-police, rajasthan-police, bpsc-cce (M/L, dims disputed), hpsc-hcs, ukpsc, rpsc-ras, indian-army-agniveer.

**Decision — schema additions (A.11 substitute):** added to the preset schema based on A.1:
- `published: boolean`, `confidence: 'H'|'M'|'L'|'H/M'|'M/L'`
- per-document `sizeNote?: {en,hi}` (e.g. "derived from 6.0×2.0 cm at 200 DPI", "Notice says X, portal accepts Y — we target the safe overlap")
- per-document `disputed?: boolean`, `toVerify?: boolean`
- per-document `variant?: 'dual-language' | 'triple' | null` (Bihar/BPSC two signatures; UPSC three signatures)
- per-document `captureTip?: {en,hi}` (e.g. IAF slate)
- exam-level `liveCaptureTips?: {en,hi}[]`

Change if: the user pastes the real A.10/A.11.

## Q2. Indian Army Agniveer source URL
Truncated in the paste. Preset is hidden (L) with sourceUrl left as the joinindianarmy.nic.in homepage until verified.

## Q3. Deployment
`gh` and `wrangler` are not installed and no GitHub remote / Cloudflare account / production domain is configured. CI workflow and Cloudflare Pages config are committed; actual deploy + Search Console submission are left for the owner (see LAUNCH_CHECKLIST.md).

## Q4. cm/mm sizes: per-document `physical` and `pxDerived`
Several notices give only a physical size (SSC 6.0×2.0 cm signature, CTET 3.5×4.5 cm, UPPSC 5×6 cm) while the engine works in pixels.
**Decision:** Workstream D converts at authoring time and stores the engine input (`widthPx`/`heightPx`) together with `physical: {width, height, unit}`, `dpi` and `pxDerived: true` (default 200 DPI when the notice gives none) plus a `sizeNote` such as "≈472×157 px, derived from 6.0×2.0 cm at 200 DPI". A schema refinement re-derives the pixels (±1 px) so arithmetic mistakes fail the build, and the engine never sees a cm value; it only uses `physical` to decide to write 200 DPI into JFIF (SPEC 7.5).
Change if: an official notice publishes pixel sizes, or a portal is shown to reject the derived size.

## Q5. Engine API passes `EngineImage` handles, not `ImageBitmap`
SPEC 7.8 returns `ImageBitmap` from `decode/crop/cleanup`. Transferring 12 MP bitmaps back and forth wastes memory on 3 GB phones, `ImageBitmap` does not exist in Node tests, and iOS 15 workers lack OffscreenCanvas to read them.
**Decision:** names, argument order, `DocSpec` and `FitResult` follow SPEC 7.8, but images are opaque `EngineImage {id, width, height}` handles whose pixels stay in the worker; `release(img)` frees them. Additive functions: `prewarm`, `release`, `convert`, `photoSheet`, `preview`. Errors are `EngineError` with a closed `code` union kept intact across comlink. The UI previews the original via `URL.createObjectURL(file)` and processed images via `preview()`.
Change if: never; this is the contract for Phase 2+ (src/engine/types.ts).

## Q6. i18n strings split into namespace files
SPEC 12.3 has B and C both editing `en.json`/`hi.json`, which races when agents run in parallel.
**Decision:** `src/i18n/{en,hi}.json` hold only `common.*` and are frozen after Phase 1. Each workstream owns `src/i18n/ns/<ns>.<lang>.json` (`ui`, `kit` → B; `site` incl. `site.seo` → C; `tool` → F; `guide` → E; every Hindi value → G in Phase 3). `t()` merges them; islands receive only their namespace via `getNamespace()`. Conventions live in `src/i18n/KEYS.md` and `npm run i18n:check` enforces them in CI.
Change if: a single translation workflow (e.g. a TMS) is adopted later.

## Q7. Per-document `slug`
Bihar CSBC/BPSC need two signatures (Hindi + English) and DSSSB two thumbs, so `doc` type alone cannot key routes (`/exam/[slug]/[document]`), kit state or file names.
**Decision:** optional `slug` on each preset document; the key is `docSlug(doc) = doc.slug ?? doc.doc`, and the schema rejects duplicate keys within an exam (e.g. `signature-hindi`, `thumb-right`).
Change if: never needed for single-document types.

## Q8. Tailwind CSS 3.4, not 4
Tailwind 4 relies on cascade layers, `@property` and `color-mix()` (Safari 16.4+/Chrome 111+). SPEC 13 requires Chrome Android 90+ and iOS Safari 15+, where unsupported `@layer` blocks are dropped and the site would render unstyled.
**Decision:** Tailwind 3.4.19 via plain PostCSS (`tailwind.config.cjs`, `postcss.config.cjs`), no Astro integration. SPEC 3.2 tokens are CSS variables in `src/styles/global.css` (light, `prefers-color-scheme` dark, and `[data-theme]` manual override), exposed as Tailwind colours. Added AA-checked helper tokens: `success-text` (SPEC green #16A34A is only 3.3:1 on white, fine for ticks, not text), `error-text`, `on-primary`, `border-strong`, `action-hover`; `npm run contrast` checks every pair.
Change if: the browser floor moves to Safari 16.4+/Chrome 111+.

## Q9. OG images in English only
Satori cannot shape Devanagari (no complex-script shaping) and needs TTF/OTF input.
**Decision:** all generated OG images (`/og/...png`, 1200×630) are English, including for `/hi/` pages, which reuse their English counterpart's image. Inter TTF for satori lives in `src/assets/og-fonts/` (Workstream C).
Change if: satori gains HarfBuzz shaping, or OG images are pre-rendered with a browser.

## Q10. CSP split between `<meta>` and `_headers`; old-Chrome WASM caveat
Astro inlines its island hydration script, so a header-only strict CSP is impossible; `frame-ancestors` is ignored in `<meta>`.
**Decision:** Astro `experimental.csp` emits the document CSP as a `<meta>` tag with sha256 hashes of inline scripts; directives come from `src/config/csp.ts` (`script-src 'self' 'wasm-unsafe-eval' <hashes>`, `worker-src 'self' blob:`, etc.). `public/_headers` adds `frame-ancestors 'none'` as a header-only CSP **without** `script-src`, plus nosniff, Referrer-Policy, Permissions-Policy, COOP and caching. `'wasm-unsafe-eval'` exists only in Chrome 97+/Safari 16+, so `/_astro/workers/*` gets its own header CSP allowing `'unsafe-eval'`; if Chrome 90–96 still blocks WASM, the engine throws `WASM_UNSUPPORTED` and the UI asks the user to update Chrome.
Phase 1 finding: Astro also adds sha256 hashes to `style-src`, which makes browsers ignore `'unsafe-inline'`, so server-rendered `style="..."` attributes are blocked (styles set from JS via `el.style`, as Preact does after hydration, are allowed). Until Security resolves it in Phase 4, components must not rely on SSR `style` attributes; use classes.
Change if: Astro's CSP support adds header output or a way to disable style hashing.

## Q11. Astro 5.18 pinned although Astro 7 is current
On 21 Oct 2026 Astro 7.4 is current, but `@vite-pwa/astro` 1.2 supports only Astro ≤5, and the Astro 7 toolchain (Vite 8, `@astrojs/preact` 6) is new.
**Decision:** pin `astro ~5.18.2` (Vite 6, Node ≥22), `@astrojs/preact ~4.1.3` with Preact 10, zod `~3.25.76` (the instance Astro 5 bundles), TypeScript `~5.9.3`, Vitest `~4.1.12` (Vitest 5 excludes Node 25). Lockfile committed. Upgrading to Astro 7 is a post-launch task.
Change if: `@vite-pwa/astro` ships Astro 7 support and the launch is done.

## Q12. `eslint-plugin-jsx-a11y-x` instead of `eslint-plugin-jsx-a11y` (Phase 1)
`eslint-plugin-jsx-a11y` 6.10.2 (latest) declares `eslint ^3–^9` and does not install next to ESLint 10, which `eslint-plugin-astro` 3.x requires.
**Decision:** use the maintained fork `eslint-plugin-jsx-a11y-x@^0.2.0` (same rules, ESLint 9/10), whose `configs.recommended` applies to `*.tsx`/`*.jsx`.
Change if: upstream jsx-a11y releases ESLint 10 support.

## Q13. Crop aspect: `DocSpec.aspect` and `cropAspect(spec)` (Phase 1 review)
The cropper (B) and `dims.ts` (A) must agree on the crop-box aspect, and KB-only/range presets had no way to express one.
**Decision:** optional `aspect` (w/h) on `DocSpec` and in the schema, plus a pure `cropAspect(spec)` in `src/engine/types.ts` that both import. Rules, first match wins: fixed px → w/h; explicit `aspect`; pixel range whose min and max boxes share an aspect (UPSC 350–500 square → 1) or a min-only box (RRB 140×60 → 7:3); KB-only photo → 3.5:4.5, signature → 7:3 (the dominant banking 140×60 and CTET 3.5×1.5 cm shape; 3:1 SSC is fixed px anyway), thumb → 1:1; otherwise null (free crop: declaration, certificate, other, mixed ranges). Unit-tested in `tests/contracts/engine-contract-2.test.ts`.
Change if: a notice family needs a different default; set `aspect` on that preset rather than changing the defaults.

## Q14. Aspect mismatch inside `fit()` and cleanup padding
If the image reaching `fit()` does not match the output aspect (>1%): signature, thumb, declaration and certificate are **letterboxed** (scaled to fit, centred, pure white #FFFFFF padding, warning `LETTERBOXED`); photo and other are **centre cover-cropped** (warning `COVER_CROPPED`). `CleanupOptions.targetAspect` lets cleanup white-pad the ink box to the crop aspect so ink still fills ≥ 80% of the width. Helper: `letterboxesOnMismatch(doc)`. The mock follows the same rule.

## Q15. Documents whose size is not known yet
IBPS PO/RRB list a 10th certificate whose size was not found (A.2).
**Decision:** `maxKB` may be `null` only when the document has `toVerify: true` (schema refinement; the engine `DocSpecSchema` never allows it). Such documents appear in the spec table as "size to verify" (`common.status.toVerify`), are skipped by the kit (`getKitDocuments()` / `isFittable()` in `src/content/presets/index.ts`), and `fit()` throws `SPEC_INCOMPLETE`.

## Q16. Engine API additions (Phase 1 review)
Added to `EngineApi`: `resize(img, w, h)` (exact, aspect locking is the UI's job; T2 = resize → convert), `decodePdfPages(file, {dpi?, pages?})` (pdfjs on the main thread, pixels adopted by the worker), `convert(img, format, {quality?, background?})` (background default #FFFFFF for transparent → JPG; replaces the positional `quality`), `photoSheet` per-copy `widthMm`/`heightMm` (default 35×45 mm). New error codes: `PDF_ENCRYPTED`, `SPEC_INCOMPLETE`, `OUT_OF_MEMORY`, `CANCELLED` (reserved), `INTERNAL`, each with a `common.errors.*` message. No engine cancel: batch flows process files one at a time and stop by not starting the next call. K13 trace sheet: main-thread canvas → PNG Blob → `imagesToPdf([blob], {page:'a4', maxKB:null})`.

## Q17. Wordmark colour: "Sahi" is dark saffron in light mode
SPEC 3.4 asks for "Sahi" in saffron, but #F59E0B on the light background is 2.05:1, below AA for text.
**Decision:** a text-safe brand token `--color-saffron-text` (Tailwind `text-saffron-text`): **#B45309** (amber-700, 4.8:1 on #F8FAFC, 5.0:1 on white) in light mode and #FBBF24 (11:1) in dark mode. The header wordmark and `public/logo.svg` use it; the saffron #F59E0B tick in the icon is unchanged (graphic, not text). `public/logo.svg` now has the wordmark as Inter Bold outlines (paths generated with satori), so it no longer depends on installed fonts; it switches to the dark colours with `prefers-color-scheme`.

## Q18. Ownership of `astro.config.mjs` and the engine smoke page
**Decision:** C owns `astro.config.mjs` from Phase 2. A, B and F do not edit it; they list required changes (vite options, precache globs, integrations) in their final report and the orchestrator applies them. A may create `src/pages/dev/engine-smoke.astro` for the in-browser engine check: `noindex`, not linked, excluded from sitemaps and precache.

## Q19. Hindi in presets stays required
**Decision:** every bilingual preset field keeps `hi` required. Workstream D writes provisional, natural Hindi in Phase 2 (no empty strings, no copies of the English); G polishes it in Phase 3, editing only `hi` fields.

## Q20. Workstream B (UI/Kit) deviations (Phase 2)
- Kit `DocState` adds `sources[]` (certificate pages) and `stale` (set when a preset's hash changes; the doc is re-fitted).
- Crop state is stored normalised to the rotated image's bounding box, plus the cropper view state.
- `feedback:pending` (K15) stores the exam display name and document labels alongside slugs — never user data.
- A document counts as "done" only when every `required` check passes.
- KitFlow has `showHeader` and `only` props so the exam page can embed it (C's KitSlot).
- Known gaps: free-aspect crops have no resize handles; certificate pages can't be reordered; trace sheet uses English declaration text only.

## Q21. Workstream C (Site/SEO) deviations (Phase 2)
- **Offline fallback:** no Workbox `navigateFallback` (it would serve /offline for any un-cached page even online). Navigations are network-first with the precached `/offline` used only on network failure.
- Exam page titles name only the documents the exam has (e.g. SSC CGL → "Signature Size").
- `/kit/*` pages are `noindex` (tool UI, little text); exam and document pages carry SEO content. Exam page links to the kit (SPEC 6.3 button); document pages embed KitFlow for that one document.
- Legal pages, `/sources`, `/report` are English-only.
- OG images use Inter WOFF (satori reads WOFF).
- Link check: linkinator misresolves `X.html` next to folder `X/`; Workstream H must configure it for Cloudflare Pages clean URLs.

## Q22. Workstream D (Presets) findings (Phase 2)
- Values differ from Appendix A where an official PDF was re-read: SSC GD signature is 300 DPI → 709×236 px; RRB NTPC is CEN 06/2026; IBPS PO 10th certificate = PDF ≤500 KB (official p.41); IBPS RRB copies it as toVerify.
- Non-overlapping sources (UP Police signature) → `maxKB: null` + toVerify (exam hidden anyway).
- DSSSB signature orientation disputed → 140×110 chosen, ≤20 KB (safe overlap).
- IBPS Clerk/RRB/SO, RBI, NABARD declaration text reuses the IBPS official text, marked toVerify.
- K16 rejection-error strings are realistic paraphrases unless quoted from a notice — verify on live portals.
- RRB ALP / Group D PDFs could not be downloaded → `sourcePage: null`; CSBC values from Appendix A (PDF uses a legacy Hindi font).
- Some seasonMonths (RBI, HTET, NABARD, UPPSC, MPPSC) are estimates.

## Q23. Workstream A (Engine) deviations (Phase 2)
- Resize runs in sRGB (not linear light; ~7× faster on 12 MP), with integer block-averaging before Lanczos for big reductions; premultiplied only when alpha is present.
- Cleanup works on a 2000 px cap.
- KB-only/range specs probe the quality floor first, then shrink by an estimated step (≥10%/5%, ≤50% per step).
- Grain tries ±4 first and goes straight to padding if still under min; padding uses the grain-free q100 encode.
- pdfjs 5.7 has no `isEvalSupported` option; not passed.
- `zip()` README supports a `{{files}}` placeholder.
- Open risk: KB-only "other" specs at 12 MP noise take ~1.5 s in Node unthrottled — may exceed 2 s at 4× throttle; PLAN R4 fallback (6 iterations / ±3 q) if Playwright perf test fails.

## Q24. Workstream E (Guides) findings (Phase 3)
- **Contract fix (approved after the fact):** `src/content.config.ts` guides loader now uses a path-based `generateId`, so ids are `en/<slug>` and `hi/<slug>`, as the file comment already said. The default id came from the `slug` frontmatter, so each Hindi guide overwrote its English twin and no `/guides/*` pages were built (44e2970).
- 10 EN + 10 HI guides, 1,000–1,400 words each; `sample.mdx` deleted; the `guide.*` namespace stays empty (the layout uses only `site.*`).
- Hindi guides link to the English `/tools/*` pages. Switch them to `/hi/tools/*` once F ships those routes (G or H).
- To check: the checklist guide gives the IBPS PO 10th certificate as a PDF up to 500 KB while IBPS RRB still has it as toVerify (Q22). The 20 KB guide's HEIC→JPG claim needs an end-to-end check (H).

## Q25. Workstream F (Tools) deviations (Phase 3)
- T1 retries at 0.6× when "allow downscale" is on, because the engine's own shrink stops at 50%. T1 outputs JPG only.
- T3 also accepts page 1 of a PDF as input. T8 offers 35×45 mm, 2×2 in and stamp size; copy counts that don't fit the paper are disabled.
- T7 can't narrow the file picker to PDFs (B's `Uploader` has no accept override), so it rejects non-PDFs after the pick. Fix: add an `accept` prop to Uploader (fixer).
- Hindi tool pages exist for 6 tools; there is no `/hi/tools` index yet, so the Hindi breadcrumb links to `/tools` (G/C later). `custom-preset` has no top-exams links (noindex, acceptable).
- Every tool page loads 36–46 KB gzipped of JS+CSS before use (budget 120 KB).

## Q26. KB targeting: pass both readings, keep a margin (Phase 2 review)
Outputs landed at the edge of the range (a 20.5 KB photo for 20–50 KB; a 96.1 KB declaration that is 98.4 KB if a portal counts 1 KB = 1000 B). SPEC 7.3 says "aim for the middle", but its own search steps pick the edge.
**Decision:** `targetWindow` in `src/engine/kb.ts`. The hard limits are minKB×1024 and maxKB×1000. The margin is the larger of 1 KB and 3% of the range, capped at a quarter of the range. The target is [lo + margin (only when there is a minimum), hi − margin]. The quality search takes the highest quality at or under the window top; padding aims at the window midpoint. If no size can pass both readings (e.g. 49–50 KB), it falls back to the 1024 reading and the 1000-byte row stays a warning; otherwise `size1000` is a required check (`types.ts` comment updated). PDFs use the same window. Example: 20–50 KB → 21,504–48,976 B. Corpus file 1: 1880/1880 pass both readings.
Other Phase 2 review fixes: PDF image placement (`pdf.ts` passed `w/h` instead of `width/height`), late PDF progress stuck the ZIP button, private-mode persistence banner, 48 px links, success-text #166534, ZIP README source, RRB size note (engine grows to ≤600 px: ~600×257), `plural()` helper with `<key>One` keys, `Uploader` `accept` prop.
Change if: portal evidence shows a stricter or looser byte reading.
