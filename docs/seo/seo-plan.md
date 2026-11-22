# SahiSize SEO plan (production, branch `seo/production-seo`)

14 Nov 2026. Merges four audits (technical crawl of 497 URLs, keyword coverage, SERP research
for exams, engagement) with `docs/seo/keyword-map.md` (v2). **The keyword map is the source
of truth for every title, H1, meta, H2 and FAQ named below.**

## Where things really live

The owner list mentions `src/features/*` and `src/components/landing`; those folders do not
exist yet (`src/features/home/client` is empty). The real files are:

| Owner | Real paths (exclusive) |
|---|---|
| A technical | `src/seo/**`, `src/config/site.ts`, `src/config/analytics.ts`, `src/lib/analytics.ts`, `src/app/(en)/og/**`, `src/app/(en)/robots.txt/**`, `src/app/(en)/sitemap-*.xml/**`, `src/app/manifest.ts`, `src/app/global-not-found.tsx`, `src/components/seo/**`, `src/components/layout/RootShell.tsx` (head/meta/analytics only), `src/server/content/sitemap.ts`, `next.config.mjs` (headers/redirects only), `src/app/(en)/kit/**` + `src/app/hi/kit/**` (metadata only) |
| B tools | `src/content/tools/en/**`, `src/content/tools/sections.json`, `src/app/(en)/tools/**`, `src/app/hi/tools/**` (route code), `src/components/layouts/ToolLayout.tsx`, `src/components/tools/**`, `src/components/site/ToolsIndex.tsx`, `src/server/content/tool-copy.ts`, en message keys `site.tools.*` |
| C exams | `src/content/presets/**`, `src/server/content/schemas/preset.ts`, `src/server/content/exam-meta.ts`, `src/content/seo/exam-seo.json`, `src/content/seo/exam-title-names.json`, `src/content/exam-copy/en/**`, `src/content/hub-copy/**`, `src/components/layouts/ExamLayout.tsx`, `src/app/(en)/exam/[slug]/page.tsx`, `src/app/hi/exam/[slug]/page.tsx`, `src/app/(en)/exams/**`, `src/app/hi/exams/**`, `src/components/site/{ExamsIndex,ExamCard,exam-card.ts,SpecTable,NoticeBadge,RelatedExams}.tsx`, en keys `site.exams.*`, `site.exam.*` |
| D exam-documents | `src/app/(en)/exam/[slug]/[document]/**`, new `src/app/hi/exam/[slug]/[document]/**`, `src/server/content/doc-insights.ts`, `src/content/seo/doc-title-labels.json`, `src/components/kit/**` (result panel), `src/components/site/KitSlot.tsx`, en keys `site.doc.*` |
| E home + linking | `src/components/site/{HomePage,HomePaths,HomeTools,HeroSearch,HeroArt,HowItWorks,TrustStrip,Footer,Breadcrumbs,GuidesIndex,ExamSearch}.tsx` (search: labels only), `src/app/(en)/page.tsx`, `src/app/hi/page.tsx`, `src/components/layouts/GuideLayout.tsx`, `src/content/guides/en/**`, `src/app/(en)/guides/**`, `src/app/(en)/{contact,about,terms,privacy,disclaimer,report,sources}/**`, en keys `site.home.*`, `site.guides.*`, `site.contact.*`, legal keys |
| F Hindi + ID docs | `src/i18n/messages/hi/**`, `src/content/exam-copy/hi/**`, `src/content/tools/hi/**`, `src/content/guides/hi/**`, `src/content/hindi-exams.json`, `src/content/id-documents/**`, `src/components/id-documents/**`, `src/components/layouts/IdDocumentLayout.tsx`, `src/app/(en)/id-documents/**`, `src/app/hi/{guides,id-documents,editorial-policy}/**` |

Shared file rule: `src/i18n/messages/en/site.json` is edited key-by-key, only inside the
namespace each owner holds above. A Hindi key added by B/C/D/E is created by F (send F the key
and English text). New URLs must be added to `docs/routes.txt` by the owner who creates them,
and A checks the sitemap picks them up.

Global acceptance (every owner): `npx tsc --noEmit -p tsconfig.json` clean for touched paths,
`npx eslint <paths>`, `npx vitest run <paths>`, `npm run presets:check`, `npm run i18n:check`.
All URLs in `docs/routes.txt` still return 200. No `output: 'export'`, no `out/`, no HTML files.
No size typed by hand where a preset value exists.

---

## P0: do first (measurement, broken things, GA winners)

### A1. Hindi guide OG image 404 (high)
- `/hi/guides/photo-ko-kb-me-kaise-kare` points og:image, twitter:image and Article `image`
  at `/og/guides/photo-ko-kb-me-kaise-kare.png`, which is 404.
- Files: `src/app/(en)/og/[...path]/route.ts` (generateStaticParams must include Hindi-only
  guide slugs), fallback to `/og/default.png` in `src/seo/metadata.ts` / `src/seo/jsonld.ts`
  when no image exists.
- Accept: every og:image / JSON-LD image URL across the crawl returns 200 (112 of 112+).

### A2. Description length limits
- `src/seo/text.ts`: `DESC_MIN` 120 → 140, `DESC_MAX` 155 → 160 (map rule 4).
- Add `src/seo/__tests__/lengths.test.ts` (vitest): for every indexable page's metadata
  builder output (exam, doc, tool, guide, hub, home, both languages) assert title ≤ 60 code
  points and description 140–160. Start as a report; make it fail the build once B–F land.
- Accept: test exists, runs in `vitest run src/seo`, and passes after P1.

### A3. Send product events to GA4
- `src/lib/analytics.ts`, `src/config/analytics.ts`: when `window.gtag` exists, also call
  `gtag('event', name, flatProps)` (same privacy rules: enum/number/slug props only).
- Events: `doc_uploaded`, `fit_done`, `doc_downloaded`, `kit_zip_downloaded`, `tool_used`,
  `exam_selected`.
- Accept: in a local build with GA enabled, a download fires `doc_downloaded` in the gtag
  dataLayer; no file names or user text in props. Note for the owner (not code): mark
  `doc_downloaded` and `kit_zip_downloaded` as GA key events; re-baseline bounce after 7 days.

### A4. Default site URL
- `src/config/site.ts`: `DEFAULT_SITE_URL` is `https://sahisize.in`; production is
  `https://sahisize.online` (Jenkins sets `PUBLIC_SITE_URL`). Change the default to
  `https://sahisize.online` so a build without the env var cannot emit wrong canonicals.
- `CONTACT_EMAIL = support@sahisize.in`: **do not change**; flag to the owner to confirm the
  mailbox exists (Organization contactPoint and /contact use it).
- `SOCIAL_LINKS` is empty: `src/seo/jsonld.ts` must omit `sameAs` when empty.
- Accept: no `sahisize.in` in rendered canonical/hreflang/sitemap/OG; Organization JSON-LD
  has no empty `sameAs`.

### D1. GA-winner document pages (overrides in keyword-map §5)
- `/exam/jee-main/class10`, `/exam/csir-net/result-awaited`, `/exam/rrb-ntpc/certificate`,
  `/exam/rrb-group-d/certificate`, `/exam/rrb-alp/certificate`.
- Files: `src/app/(en)/exam/[slug]/[document]/page.tsx`, `src/server/content/doc-insights.ts`,
  `src/content/seo/doc-title-labels.json`; per-document FAQ/title overrides go in a new
  data file `src/content/seo/doc-seo.json` (D owns it; zod schema next to it) rather than
  in presets.
- Use the exact title, H1, meta, first sentence and FAQs from the map.
- FAQ answers only from preset rules/notes or the cited notice. The CSIR "older bulletins
  said 500 KB" FAQ and the RRB "old FAQs say 500 KB" FAQ ship only after re-reading the
  cited notice page (CSIR Dec 2026 bulletin p.7; CEN 06/2026 p.23); otherwise leave them out.
- Accept: each page has the primary phrase in title, H1, first 100 words and meta; ≥ 4
  visible FAQs in `FaqList` (FAQPage JSON-LD still valid); links listed in the map present.

### D2. Document-page template
- Intro template `site.doc.intro` → `{exam} asks for the {doc} as a {summary} file.` with
  correct "up to" / range wording (no "as up to 399 KB · PDF").
- Answer box between H1 and tool: Size | Format | Pixels/pages | Who uploads | Source,
  page, checked date. Reuse `verifiedSummary()` / `formatDate()`; no typed numbers.
- "Other documents for <exam>" chip row directly under the tool.
- KitFlow result state (only mode): primary button "Next: <next document> for <exam>", plus
  "Same file works for: <exams>" from `getDocInsights` comparisons.
- Short exam names in doc titles/H1s (`shortExamName`): "CSIR NET …", "RRB NTPC …",
  "RRB ALP SC/ST Certificate Size 2026".
- `/exam/jee-main/photo` and `/exam/neet-ug/photo` retitled to "resize/resizer" (map C3).
- `/declaration` pages: primary `<exam> handwritten declaration size` + FAQs from map §5.
- Accept: every `/exam/*/*` page has ≥ 3 document-specific FAQs, the answer box, the chip
  row; no two indexable pages share an H1; titles ≤ 60, metas 140–160 (A2 test).

### C1. Exam-hub H1/title template (cannibalisation C1–C3)
- `src/server/content/exam-meta.ts`: replace `"<name> <cycle> <docs> Size — Resize Free"`
  with the map §4 template; titles from short names (`exam-title-names.json`).
- `src/content/seo/exam-seo.json`: add/replace rows for ssc-cgl, ssc-chsl, ssc-cpo,
  ssc-mts, ssc-gd, rrb-ntpc, rrb-group-d, rrb-alp, jee-main (H1), cuet-ug (H1), nda, cds,
  ugc-net, csir-net, ibps-po, ibps-clerk, ibps-rrb-po, ibps-rrb-clerk, ibps-so, sbi-clerk
  (title) with the exact strings and metas from the map.
- Accept: no exam hub H1 contains "— Resize Free"; live-photo hubs' H1 contains
  "<short> Photo Size"; no hub H1 equals or contains "<exam> Signature Size" as its lead;
  all hub titles ≤ 60 with the primary at the front.

### C2. Live-photo hubs answer the photo question and carry the tool
- `src/components/layouts/ExamLayout.tsx`: two-row answer box ("Photo: live capture, no
  upload" / "Signature: <spec>") for `photoUploadReplacedByLive` presets; embed `KitSlot`
  (only = signature) when the exam has exactly one uploadable document (SSC CGL, CHSL, CPO,
  MTS) instead of linking out to /kit.
- FAQ "Other sites say a 20–50 KB photo. Is that wrong?" on these hubs (exam-copy/en).
- Accept: /exam/ssc-cgl renders the signature uploader above the fold on a 390 px viewport.

### C3. Application window / freshness
- `src/server/content/schemas/preset.ts`: optional `applyWindow { opens, closes,
  lateUntil?, correctionUntil?, source }`; fill only from the notice already cited
  (RRB NTPC 08.10–06.11.2026; CSIR NET 07.10–05.11.2026, late fee to 09.11.2026 — both from
  current preset FAQ text).
- `NoticeBadge` status pill: "Form open until X" / "Closed on X" / "Closed: next cycle
  usually <seasonMonths>". Deadline FAQs generated from this field; delete the hand-written
  "last date" FAQ answers.
- JEE Main: do not bump `cycle` to 2027 until the 2027 bulletin is read; until then the
  page shows "Sizes from the 2026 bulletin; we re-check when the 2027 bulletin is out".
- Accept: `presets:check` passes; no page shows a past deadline without a "closed" label.

### E1. Home answers a size on the first screen
- `src/components/site/HomePage.tsx`, `HomePaths.tsx`, `ExamCard.tsx` (C owns ExamCard: E
  sends the props request, C adds `compact` sizes): "Most searched sizes" block under the
  search with the 5 rows in the map §2 (numbers from presets via server loaders, links to
  the document/tool pages, primary keyword as anchor).
- H1 → `Photo and signature resize for exam forms` (subline keeps the tagline). Home FAQ
  "What photo upload size do PSC and sarkari forms need?".
- Pass only IDs/minimal fields to client components (see A6).
- Accept: on a 390 × 844 viewport the block is visible without scrolling; links to
  /exam/jee-main/class10, /exam/csir-net/result-awaited, /exam/rrb-ntpc/certificate,
  /exam/ssc-cgl/signature, /tools/compress-pdf-to-400kb exist on / and /hi (Hindi URLs where
  they exist).

### B1. PDF compressor 400 KB (GA winner)
- `src/content/tools/en/compress-pdf-to-400kb.json`: H1 and meta from the map; FAQ "My PDF
  got bigger after compressing. Why?"; links to the three RRB certificate pages.
- `ToolLayout.tsx` "Exams that use this": for KB-target tools keep only exams whose
  document maxKB ≥ target and within ~25% of it (or equal limit); heading "Exams with a
  {n} KB limit"; link to the document page, not the hub.
- Accept: /tools/compress-pdf-to-400kb lists only RRB NTPC, Group D, ALP; links to
  `/exam/<rrb>/certificate`.

---

## P1: keyword placement and metadata

### B2. Tool copy (map §6)
- Files: `src/content/tools/en/*.json`.
- KB image variants: new metas for 35, 40, 45, 50, 70, 200, 300; H2/FAQ additions for 20,
  50, compress-image.
- Increase, cm, mm: new metas + H2/FAQ from the map.
- signature-resize, compress-pdf, postcard, passport, 3.5×4.5: H2s/FAQs from the map;
  passport title `Passport Size Photo Maker: Pixels, cm and KB`.
- compress-pdf-to-50kb H1 + meta; compress-pdf-to-200kb FAQ.
- JPG-to-PDF 50–500: titles/metas from the map; intros start "JPG to PDF <n> KB:".
- Range page 10–20 KB links to /tools/signature-resize ("signature resize 10 to 20 KB");
  postcard links to /exam/neet-ug ("NEET postcard size photo"); name-date links to
  /exam/jee-main ("JEE Main photo with name and date").
- /tools index: H1 `Photo, signature and PDF tools for exam forms`, "Most used" row.
- Accept: every primary from §6 appears as an exact phrase in title, H1 (or intro for
  JPG-to-PDF), first 100 words and meta; every listed secondary appears at least once on
  its page and on no other page as an H1/title/FAQ question; A2 test passes for /tools/*.

### C4. Family hubs (map §3)
- `src/content/hub-copy/en/{ssc,rrb,ibps}.json`: SSC H2 rename; per-exam FAQs shortened to
  one sentence + exact-anchor link; per-exam rows link to `/exam/<slug>` ("<Exam> photo
  size") and `/exam/<slug>/signature` ("<Exam> signature size").
- `/exams` H1 `Exam photo, signature and document sizes`; cards show photo/sign KB.
- Accept: no hub FAQ answer longer than two sentences for a per-exam query; links present.

### C5. Exam extra FAQs (map §4)
- `src/content/exam-copy/en/{neet-ug,jee-main,ibps-po,nda,cds,upsc-cse,ugc-net,csir-net}.json`:
  FAQs listed in the map, answered from preset/notice only; NEET live-photo FAQ only if the
  bulletin text is in the preset; UGC NET ↔ CSIR NET cross-links.
- Accept: `presets:check` and `i18n:check` pass; FAQPage JSON-LD validates.

### E2. Internal links to orphan-ish guides
- `/guides/how-to-upload-photo-signature`: link from every `/exam/*/photo` and
  `/exam/*/signature` page (D adds the slot; E supplies the guide link helper).
- `/hi/guides/photo-ko-kb-me-kaise-kare`: link from `/hi/tools/compress-image*` and
  `/hi/tools/resize-image` (F adds the Hindi copy key; B renders it in ToolLayout).
- No hreflang between these two guides (different topics).
- `/guides` H1 `Exam form upload guides`.
- Accept: each of the two guides has ≥ 10 internal inlinks in the crawl.

### E3. Thin / utility pages
- `/contact`: title, H1, meta, body from map §2 (no invented response time).
- Metas to 140–160: `/terms`, `/report`, `/privacy`, `/about`.
- Accept: /contact ≥ 200 words main content; A2 test passes on these pages.

### F1. Hindi metadata and copy
- `src/i18n/messages/hi/**`, `src/content/exam-copy/hi/**`, `src/content/tools/hi/**`,
  `src/content/guides/hi/**`: lengthen every Hindi description under 140 (lists in map §9
  and the technical audit: /hi/exam/{bihar-police-constable,ctet,htet,iaf-agniveervayu,
  sbi-po}, six Hindi guides, /hi/tools/{resize-image,compress-pdf-to-500kb,
  compress-image-to-100kb,compress-image-to-30kb}).
- Hindi hub titles/H1s follow the map §9 pattern, mirroring C1 (live-photo wording).
- Hindi guide H2 rename (map §9).
- Accept: A2 test passes for all /hi pages; `i18n:check` passes.

---

## P2: technical hygiene and performance

### A5. Robots / hreflang / sitemaps
- 404: root layout default robots must not be added to not-found pages (only `noindex`);
  check `src/app/global-not-found.tsx` and the `(en)`/`hi` layouts' metadata.
- `src/seo/hreflang.ts`: omit hreflang when a page is noindex (65 kit pages).
- Kit descriptions: fix the item-list template that produces "सभी अपलोड एक फ्लो में:
  हस्ताक्षर।" (only if kit pages are ever indexed; still fix the cut-off text).
- Sitemaps: add `lastmod` to sitemap-tools and sitemap-pages (from content `lastChecked` /
  file dates); home URL in sitemap without trailing slash to match canonical; serve
  `/sitemap.xml` as a 301 to `/sitemap-index.xml` (redirect in `next.config.mjs`).
- Accept: crawl shows one robots tag on 404; zero hreflang on noindex pages; all 7 sitemaps
  have lastmod; `/sitemap.xml` → 301; home sitemap URL equals canonical.

### A6. Page weight
- Find what `/`, `/hi` and `/hi/exam/*` serialize into the RSC payload (home 172 KB inline,
  /hi 170 KB, Hindi exam hubs ~130 KB). Likely full preset/exam lists and FAQ data passed to
  client components (`HeroSearch`, `ExamSearch`, `HomePaths`, `ExamsFilterBoot`). Pass IDs
  and minimal fields; lazy-load below-the-fold client widgets. Coordinate with E (home
  components) and C (exam hubs): A measures and proposes, the owner edits its component.
- Accept: inline script payload on `/` ≤ 80 KB and on `/hi/exam/*` ≤ 70 KB; `check:budgets`
  passes.

### A7. Caching and host canonicalisation
- `next.config.mjs` `headers()`: HTML and `robots.txt` → `s-maxage=3600,
  stale-while-revalidate=86400` (unless the deploy purges the CDN; then document that).
  OG PNGs may keep long caching but should change URL when content changes.
- www → apex and http → https: 301 at nginx (host config, outside the repo) or a
  host-based redirect in `next.config.mjs`. Production check after deploy:
  `curl -I http://www.sahisize.online/` → 301 to `https://sahisize.online/`.
- Accept: headers verified on the standalone server; redirect verified in production.

### E4. Duplicate breadcrumbs
- `src/components/site/Breadcrumbs.tsx`: render one `<ol>`; truncate with CSS (or
  `aria-hidden` on the compact copy). BreadcrumbList JSON-LD unchanged.
- Accept: one breadcrumb list in the accessibility tree per page.

---

## New pages (only with demand and real data)

| Owner | URL | Why | Data |
|---|---|---|---|
| F (route code with D) | `/hi/exam/jee-main/class10` | top GA page; Hindi SERP weak | jee-main preset |
| F (with D) | `/hi/exam/rrb-ntpc/certificate` | GA winner | rrb-ntpc preset |
| F (with C) | `/hi/exam/csir-net` | only published exam without a Hindi hub | csir-net preset + new `exam-copy/hi/csir-net.json` |
| F (with D) | `/hi/exam/csir-net/result-awaited` | GA winner | csir-net preset |
| F | `/hi/id-documents/pan-card-signature-size` | English page exists, Hindi pair missing | id-documents copy |

Rules: hreflang pairs with the English page, entries in `docs/routes.txt`, sitemaps,
OG images (A1 generator), titles/metas per map §9. D builds the Hindi
`[document]` route generically but only `generateStaticParams` for the listed pairs.

**Not now** (need an official source first): Indian Army Agniveer, UP Police, Rajasthan
Police, MP Police, Haryana Police, KVS, BPSC TRE (presets exist, unpublished, values
disagree with other sites); RRB NTPC Undergraduate CEN 07/2026 (new preset from the
official annexure only); FCI/LIC/TNPSC/OJAS/CCC/IB ACIO; NSDL/UTI/Aadhaar pages.

## Facts to verify before copy repeats them

1. CSIR NET result-awaited form: preset 50–300 KB (Dec 2026 bulletin p.7) vs 50–500 KB in
   older bulletins and one Dec 2026 third-party guide.
2. RRB SC/ST certificate: preset up to 399 KB ("less than 400 KB", CEN 06/2026 p.23; same
   in Group D CEN 09/2025 and ALP CEN 01/2026 presets) vs "below 500 KB" in older RRB FAQs.
3. JEE Main 2027 bulletin: class 10 rule and cycle bump.
4. `support@sahisize.in` mailbox exists and is intended.
Year labels SSC MTS 2025 and RRB Group D 2025 match the notices the presets cite; keep.

## Order of work

P0 in parallel: A1–A4, C1–C3, D1–D2, E1, B1. Then P1: B2, C4, C5, E2, E3, F1 (F after C1/D1
so Hindi mirrors the final English). Then new pages, then P2. A2's length test becomes
blocking last.
