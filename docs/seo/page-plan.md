# SahiSize page plan: one landing page per search intent

21 Nov 2026. Read-only analysis of `/Users/adityakumar/sahisize` on branch `seo/production-seo`
(HEAD `c38b516` = main, plus 114 modified and about 20 untracked files that are not committed).
Inputs: `docs/routes.txt`, `src/app/**`, `src/content/**`, `docs/seo/keyword-map.md` (v2),
`docs/seo/seo-plan.md`, the scratchpad `seo-audit-results.md`, and `git diff` / `git status`.

Legend: ✓ exists · ✚ new page · ⟲ merge, redirect or retarget. Volumes are `(Semrush India
monthly, KD)` from keyword-map.md (pulled 22 Oct 2026). "unk" means no volume; the map marks
these "vol: unknown (SERP)". ★ means a GA organic winner (17 Oct–13 Nov 2026).

---

## 0. Structure notes (the code on disk now)

- **`src/features` is not on main.** `git ls-tree main` has no `src/features`. On disk,
  `src/features/` is untracked:
  - `exam-document/` holds 7 files (about 1,150 lines) written by the exam-document SEO agent.
  - `home/client/` is an empty folder.

  So the brief's statement that main "kept src/features/home and src/features/exam-document"
  does not match git. Everything else lives in the restored older layout.
- **Two layout folders:** `src/components/layout/` (RootShell, MainLayout, ClientBoot) and
  `src/components/layouts/` (Exam, Tool, Guide, IdDocument, Kit, Legal).
- **Templates follow three different patterns:**
  - Exam hub: `components/layouts/ExamLayout` + `server/content/exam-template.ts` + `exam-meta.ts`.
  - Exam document: `features/exam-document/*` (page model, DocAnswer, doc-seo.json).
  - Tool: `components/tools/tools-registry.tsx` + `server/content/tool-copy.ts` + `ToolLayout`.

  Pick one convention, `src/features/<page-type>/{model,view,copy}`, before adding more templates.
- **Hindi is a parallel route tree, not a `[lang]` segment.** `src/app/hi/**` duplicates the
  `(en)` page files. For example, `exam/[slug]/[document]/page.tsx` exists twice with near-identical
  code. Every new template is written twice unless the page body becomes one shared component
  that takes `lang`.
- **Document slugs are inconsistent:**
  - `reet/class-10-marksheet` vs `jee-main/class10` and `neet-ug/class10`
  - `iaf-agniveervayu/sign` vs `/signature` everywhere else
  - `dsssb/thumb-left|thumb-right`
  - `bihar-police-constable/signature-english|signature-hindi`

  Do not rename them: the URLs are live. Only new pages should use the canonical slugs
  (`photo`, `signature`, `thumb`, `certificate`, `class10`, `declaration`).
- **Housekeeping:**
  - `vitest.config.ts` was deleted in commit `50bc400` and an untracked `vitest.config.mts`
    replaces it. The doc comment in `src/seo/__tests__/lengths.test.ts` points to a
    non-existent `src/seo/vitest.config.mts`.
  - `public/wasm/` is untracked.
  - Six new routes were appended unsorted at the end of `docs/routes.txt`.
  - Old agent worktrees under `.claude/worktrees/*` still contain `astro.config.mjs` and `.astro`.
    These are outside the app, but delete them so nobody mistakes them for the app (see the memory
    rule: Next.js only).
- **Health right now:** `npx tsc --noEmit` is clean, and `npx vitest run` passes 181 tests in
  11 files. Nothing has been built or crawled since the edits.

---

## 1. Page inventory today

Counts come from `docs/routes.txt`, which includes the 6 new Hindi routes now on disk.

| Type | EN | HI | Indexable? | Notes |
|---|---|---|---|---|
| Home | 1 | 1 | yes | |
| Index hubs (`/tools`, `/exams`, `/guides`, `/id-documents`) | 4 | 4 | yes | `/hi/tools`, `/hi/exams`, `/hi/guides`, `/hi/id-documents` |
| Family hubs `/exams/<family>` | 3 (ssc, rrb, ibps) | 0 | yes | No Hindi family hubs |
| Tools, total | 60 | 18 | 59 + 18 | `custom-preset` is noindex |
| ↳ KB image targets `compress-image-to-<n>kb` | 22 | 6 (10, 20, 30, 50, 100, 200) | | n = 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 60, 70, 80, 90, 100, 150, 200, 250, 300, 350, 400, 500 |
| ↳ KB ranges | 3 | 1 (20–50) | | 10–20, 20–50, 50–100 |
| ↳ KB hub, MB→KB, increase | 3 | 2 (hub, increase) | | `compress-image`, `mb-to-kb-photo`, `increase-image-size-in-kb` |
| ↳ PDF compress (hub + KB) | 1 + 8 | 0 + 2 (200, 500) | | 50, 100, 150, 200, 250, 300, 400★, 500 |
| ↳ JPG/images to PDF (hub + KB) | 1 + 7 | 1 + 1 (300) | | 50–500 |
| ↳ Size and document tools | 12 | 5 | | signature, thumb, declaration, name-date, passport, passport-sheet, 3.5×4.5, postcard, stamp, resize-image, -in-cm, -in-mm. Hindi has signature, name-date, passport, 3.5×4.5, resize-image |
| ↳ Converters, batch, custom | 3 | 0 | | `convert-image`, `batch-compress`, `custom-preset` (noindex) |
| Exam hubs `/exam/<slug>` | 35 | 31 | yes | Hindi is missing ibps-so, nabard-grade-a, rbi-assistant and rbi-grade-b |
| Exam-document pages `/exam/<slug>/<doc>` | 118 | 3 (new) | yes | By type: signature 33 (+ `sign`, `parent-signature`, `signature-english/-hindi`), photo 27, thumb 14 (+ left/right), certificate 13, declaration 10, pwd 3, id-proof 3, class10 2 (+ `class-10-marksheet`), category 2, address-proof 2, result-awaited 1★, aadhaar 1. Hindi: jee-main/class10★, csir-net/result-awaited★, rrb-ntpc/certificate★ |
| ID documents | 3 | 3 | yes | Hub, PAN photo, PAN signature. `/hi/.../pan-card-signature-size` is new |
| Guides | 11 | 11 | yes | 10 en/hi pairs, plus `how-to-upload-photo-signature` (en only) and `photo-ko-kb-me-kaise-kare` (hi only) |
| Kits `/kit/<slug>` | 35 | 31 | **noindex** | |
| Legal and utility | 9 | 1 (`editorial-policy`) | 7 | `/report` and `/offline` are noindex |
| OG images, sitemaps, manifest, robots | 110 PNG + 7 XML | | n/a | |

Total indexable HTML is about **312** pages: 306 in the last crawl plus the 6 new Hindi pages.
Published presets: **35**. Unpublished presets with data: **12** (indian-army-agniveer,
up-police, rajasthan-police, mp-police, haryana-police, kvs-teacher, bpsc-tre, bpsc-cce, hpsc-hcs,
rpsc-ras, ukpsc, uptet).

---

## 2. Target page architecture (one URL per intent cluster)

Rules: keyword-map §0 applies. One primary per URL. A query owned by one page never appears as the
H1, title lead or FAQ question on another page; other pages link to the owner with that query as
the anchor text. Every size comes from a preset.

### 2.1 Home and index hubs

| URL | St | Primary (vol, KD) | Intent | Template |
|---|---|---|---|---|
| `/` | ✓ | photo and signature resize (1.3K, 9) | navigational/transactional | T1 Home |
| `/tools` | ✓ | photo signature and pdf tools for exam forms (unk) | navigational | T2 Index |
| `/exams` | ✓ | exam photo and signature size (unk) | navigational | T2 Index |
| `/guides` | ✓ | exam form upload guides (unk) | informational | T2 Index |
| `/id-documents` | ✓ | pan card photo and signature size (unk) | navigational | T2 Index |
| `/hi`, `/hi/tools`, `/hi/exams`, `/hi/guides`, `/hi/id-documents` | ✓ | Hindi forms of the above | | T1/T2 (hi) |

No new standalone "size hub" URLs. Each size cluster below already has a head-term page that
works as its hub. A hub page with no search demand of its own would be thin and would compete with
these pages. `/tools` gets anchored sections (`#kb`, `#pixels-cm-mm`, `#photo-sizes`,
`#signature-thumb`, `#pdf`, `#convert`) that mirror the clusters.

### 2.2 Size clusters (tools)

**KB cluster.** The hub is `/tools/compress-image`.

| URL | St | Primary (vol, KD) | Owns also | Template |
|---|---|---|---|---|
| `/tools/compress-image` | ✓ | photo resizer in kb (110K, 47) | kb resizer (90.5K), image converter in kb (18.1K), photo kb reduce | T6-hub |
| `/tools/compress-image-to-5kb` … `-500kb` (22) | ✓ | `<n> kb photo size`. Top: 50 (22.2K) plus "resize image to 50kb" (49.5K); 20 (18.1K); 100 (14.8K) plus "resize image to 100kb" (49.5K); 200 (9.9K); 300 (6.6K); 15 and 30 (5.4K each); 500 (5.4K); 40 (4.4K); 10 (3.6K); 150 (3.6K) | per map §6a | T6 |
| `/tools/compress-image-10kb-to-20kb` | ✓ | 10 kb to 20 kb photo size (1.3K) | photo wording only (C8) | T6-range |
| `/tools/compress-image-20kb-to-50kb` | ✓ | photo convert into 20 kb to 50 kb jpg (2.9K) | | T6-range |
| `/tools/compress-image-50kb-to-100kb` | ✓ | photo compress 50 to 100 kb (6.6K) | | T6-range |
| `/tools/mb-to-kb-photo` | ✓ | photo mb to kb (14.8K) | 2 mb photo size (22.2K), 1mb photo size (8.1K) | T9 |
| `/tools/increase-image-size-in-kb` | ✓ | increase image size in kb (27.1K, 23) | kb increase (18.1K), signature kb increase | T9 |

New KB pages: **none**. The map has no Semrush evidence for other KB targets (for example 12,
75 or 120 KB). "2 mb photo size" and "1mb photo size" stay as secondaries on mb-to-kb because the
intent is ambiguous (shrink or grow); re-check them in the next Semrush pull.

**Pixels, cm and mm cluster.** The hub is `/tools/resize-image`.

| URL | St | Primary | Template |
|---|---|---|---|
| `/tools/resize-image` | ✓ | resize image in pixels (unk) | T8 |
| `/tools/resize-image-in-cm` | ✓ | resize image in cm (27.1K, 29); photo resizer in cm (9.9K) | T8 |
| `/tools/resize-image-in-mm` | ✓ | resize image in mm (2.9K, 21) | T8 |
| `/tools/signature-6x2-cm` | ✚ P3 | 6cm x 2cm in pixels (3.6K, 30) + 6cm width and 2cm height in pixels (1K) + signature resize 6cm x 2cm (590), about 5.2K in total | T8 |

Owning the 6 × 2 cm cluster this way resolves C24. Today the terms are split between a FAQ on
signature-resize and the SSC hub. The new page owns the generic "6cm x 2cm" terms. The SSC hub
keeps only "ssc signature resize 6cm x 2cm" (2.4K). signature-resize drops its 6×2 FAQ and links
to the new page instead.

**Photo-size cluster.** The hub is `/tools/passport-size-photo`.

| URL | St | Primary (vol, KD) | Template |
|---|---|---|---|
| `/tools/passport-size-photo` | ✓ | passport size photo maker (301K, 37) | T8 |
| `/tools/photo-3-5x4-5-cm` | ✓ | 3.5 cm x 4.5 cm (14.8K) + passport size photo size in cm (33.1K) (C4) | T8 |
| `/tools/postcard-size-photo` | ✓ | postcard size photo (14.8K) | T8 |
| `/tools/stamp-size-photo` | ✓ | stamp size photo (22.2K, 18) | T8 |
| `/tools/passport-photo-sheet` | ✓ | passport photo sheet (unk) | T8 |
| `/tools/name-date-on-photo` | ✓ | name and date on photo (9.9K, 7) | T8 |

**Signature, thumb and declaration cluster**

| URL | St | Primary | Template |
|---|---|---|---|
| `/tools/signature-resize` | ✓ | signature resize (12.1K, 18); signature resize 10 to 20 kb (6.6K) (C8) | T8 |
| `/tools/thumb-impression` | ✓ | thumb impression (9.9K, 31); left thumb impression (4.4K) | T8 |
| `/tools/handwritten-declaration` | ✓ | declaration handwritten (12.1K) + handwritten declaration for ibps rrb (90.5K, 26; see C19) | T8 |

**PDF cluster.** The hub is `/tools/compress-pdf`.

| URL | St | Primary (vol, KD) | Template |
|---|---|---|---|
| `/tools/compress-pdf` | ✓ | pdf resize in kb (40.5K, 44); pdf mb to kb converter (22.2K) | T7-hub |
| `/tools/compress-pdf-to-{50,100,150,200,250,300,400★,500}kb` | ✓ | pdf compressor 50 kb (2.9K); compress pdf to 100kb (110K, 39); 150 kb pdf (8.1K); 200 kb pdf (27.1K) (C5); 250 kb pdf (2.9K); compress pdf 300 kb (33.1K); pdf compressor 400 kb (8.1K) ★; 500 kb pdf (27.1K) | T7 |
| `/tools/images-to-pdf` | ✓⟲ | Retarget to **jpg to pdf under kb / image to pdf** (hub). Move "image to pdf 100 kb" (8.1K) and "photo to pdf 100 kb" (3.6K) to `jpg-to-pdf-under-100kb` (C18) | T7-hub |
| `/tools/jpg-to-pdf-under-{50,100,150,200,300,400,500}kb` | ✓ | `jpg to pdf <n> kb`: 300 (27.1K), 100 (12.1K), 200 (12.1K), 50/150 (6.6K), 400 (5.4K), 500 (unk) | T7 |
| `/tools/increase-pdf-size-in-kb` | ✚ P4, conditional | pdf size increaser in kb (2.4K). Build it only if the engine can really pad a PDF; otherwise keep it as a FAQ on compress-pdf | T7 |

**Converters**

| URL | St | Primary | Template |
|---|---|---|---|
| `/tools/convert-image` | ✓ | heic to jpg (unk); png to jpg | T9 |
| `/tools/batch-compress` | ✓ | batch compress images (unk) | T9 |
| `/tools/heic-to-jpg`, `/tools/png-to-jpg` | ✚ P4, research | Split from convert-image only if a fresh Semrush pull shows separate demand. Until then, convert-image owns both | T9 |
| `/tools/custom-preset` | ✓ noindex | n/a | |

### 2.3 Exam families

| URL | St | Primary (vol, KD) | Template |
|---|---|---|---|
| `/exams/ssc` | ✓ | ssc signature resize (8.1K, 5) | T3 |
| `/exams/rrb` | ✓ | rrb signature size (2.9K, 3) | T3 |
| `/exams/ibps` | ✓ | ibps photo resizer (1K, 5); ibps handwritten declaration size (1K) (C14) | T3 |
| `/exams/nta` | ✚ P3 | nta photo and signature size (unk). Members: jee-main, neet-ug, cuet-ug, ugc-net and csir-net (5). The shared "50–300 KB certificate PDF" rule is a real cross-exam intent | T3 |
| `/exams/police` | ✚ P4, after presets | police constable photo size (unk). Members once published: bihar, up, rajasthan, mp, haryana | T3 |
| `/exams/defence` | ✚ P4, after presets | agniveer photo size cluster: nda, cds, iaf-agniveervayu, indian-army-agniveer | T3 |
| `/exams/upsc` | **do not create** | It would compete with `/exam/upsc-cse`, which owns "upsc photo resize" (4.4K) and "upsc photo size" (2.4K) (C23) | |
| `/exams/teaching`, `/exams/state-psc`, `/exams/banking` | hold | Create only with Semrush evidence plus at least 3 published members. Today teaching has 3 (ctet, htet, reet), state-psc has 2 and SBI/RBI have 2 each | |
| `/hi/exams/ssc`, `/hi/exams/rrb`, `/hi/exams/ibps` | ✚ P3 | Hindi forms: `SSC सिग्नेचर रीसाइज़` and so on. SERP research found weak Hindi competition | T3 (hi) |

### 2.4 Exam hubs `/exam/<slug>` (35 ✓)

The primary is `<short> photo size` (C2). Each exam's title and H1 are set per exam in keyword-map
§4. Template variants:

- **T4-upload** (photo file upload): ibps-po, ibps-clerk, ibps-rrb-po, ibps-rrb-clerk, ibps-so,
  sbi-po, sbi-clerk (primary: sbi clerk thumb impression size, C9), rbi-assistant, rbi-grade-b,
  nabard-grade-a, jee-main (jee photo size 480, plus "jee main photo with name and date" 2.9K, C6),
  neet-ug (neet photo size 2.9K, plus the postcard cluster 3.6K/2.9K/1.6K, C7), cuet-ug, ugc-net,
  csir-net, upsc-cse (upsc photo resize 4.4K), nda, cds, ctet (720), reet, htet, dsssb (dsssb photo
  resize 2.9K), mppsc (1.3K), uppsc-pcs (3.6K), india-post-gds (gds signature size 480),
  bihar-police-constable, iaf-agniveervayu.
- **T4-live** (`photoUploadReplacedByLive`): rrb-ntpc (rrb ntpc photo and signature size 480),
  rrb-group-d, rrb-alp, ssc-gd.
- **T4-live-single** (live photo plus one upload, tool embedded on the hub): ssc-cgl ★, ssc-chsl
  (590), ssc-cpo, ssc-mts.

New exam hubs (✚ P4). Each needs the official notice read first, because preset values disagree
with other sites:

- `/exam/indian-army-agniveer` (agniveer photo size). Highest SERP demand: at least 5 competitor
  pages.
- `/exam/up-police` (up police photo size). Second highest.
- rajasthan-police, mp-police, haryana-police, kvs-teacher, bpsc-tre, bpsc-cce, hpsc-hcs, rpsc-ras,
  ukpsc and uptet (presets exist, unpublished).
- `/exam/rrb-ntpc-ug` (rrb ntpc undergraduate photo signature size). There is no preset yet; build
  it from the CEN 07/2026 annexure only, with a "Graduate or Undergraduate?" cross-link.

Hindi hubs (✚ P2): `/hi/exam/{ibps-so, nabard-grade-a, rbi-assistant, rbi-grade-b}`. These are the
only published exams without a Hindi hub. Add them to `hindi-exams.json` plus `exam-copy/hi`.

### 2.5 Exam-document pages `/exam/<slug>/<doc>` (118 ✓)

Primary by type. The exam hub never uses these words as its H1 lead.

| Doc type | Count | Primary pattern | Notes and conflicts |
|---|---|---|---|
| signature | 33 + 4 variants | `<short> signature size` (C1) | Absorbs the hub secondaries: ssc gd (2.9K), rrb ntpc (1.9K), ssc cgl (1.3K), rrb group d (1.3K), ssc mts signature resize (1.3K), ntpc (880), neet (590) |
| photo | 27 | `<short> photo resize` / `photo resizer` | **Not** "photo size", which the hub owns (C3). jee-main/photo and neet-ug/photo already have overrides in doc-seo.json (neet photo resizer 1K) |
| thumb | 14 + 2 | `<short> thumb impression size` | thumb impression for neet (720), for ibps po (720) |
| declaration | 10 | `<short> handwritten declaration size` | Never "handwritten declaration for ibps rrb", which the tool owns (C19) |
| certificate | 13 | `<short> <certificate label> size` | RRB SC/ST ×3 ★ (C13); NTA certificates link to compress-pdf-to-300kb |
| class10 / class-10-marksheet | 3 | `<short> 10th certificate size` | jee-main ★ |
| result-awaited, category, pwd, id-proof, address-proof, aadhaar, parent-signature | 13 | `<short> <doc> size` | csir-net/result-awaited ★ |

New Hindi document pages (✚). The pattern is `<short> <doc हिंदी> साइज़`, with hreflang pairs, built
from doc-seo.json `hi` blocks. The route already exists: `src/app/hi/exam/[slug]/[document]`.

| Phase | URLs | Evidence |
|---|---|---|
| ✓ done | `/hi/exam/jee-main/class10`, `/hi/exam/csir-net/result-awaited`, `/hi/exam/rrb-ntpc/certificate` | GA winners |
| P2 | `/hi/exam/{ssc-cgl, ssc-chsl, ssc-cpo, ssc-mts, ssc-gd, rrb-ntpc, rrb-group-d, rrb-alp}/signature` (8) | Highest English volumes in the doc cluster (0.9–2.9K each); weak Hindi SERP; these exams' Hindi hubs say "live photo", so the signature page is the only upload |
| P2 | `/hi/exam/rrb-group-d/certificate`, `/hi/exam/rrb-alp/certificate` (2) | Siblings of a GA winner; the faqSet `rrb-scst` already has `hi` copy |
| P3 | `/hi/exam/neet-ug/class10`, `/hi/exam/cuet-ug/certificate`, `/hi/exam/neet-ug/photo`, `/hi/exam/ibps-po/declaration` (4) | Same NTA rule as the GA winner; neet photo resizer 1K; IBPS declaration questions in SERPs |

New English document pages: only the ones that come with new exams (P4). Every published exam
already has a page for each kit document.

### 2.6 ID documents

| URL | St | Primary | Template |
|---|---|---|---|
| `/id-documents` (+`/hi`) | ✓ | pan card photo and signature size | T2 |
| `/id-documents/pan-card-photo-size` (+`/hi`) | ✓ | pan card photo size | T10 |
| `/id-documents/pan-card-signature-size` (+`/hi` ✓ new) | ✓ | pan card signature size | T10 |
| NSDL / UTI PAN (22 keywords, 151K/mo, KD 4–30, map §7) | P4, owner decision | If the NSDL (Protean) and UTIITSL specs are the same, add them as H2s and FAQs on the two PAN pages, not as new URLs. Only if an official source shows different specs, ✚ `/id-documents/pan-card-photo-size-nsdl` and `-uti` | T10 |
| Aadhaar | hold | Needs an official upload spec and an owner decision | |

### 2.7 Guides and how-to

| URL | St | Primary | Note |
|---|---|---|---|
| `/guides/how-to-upload-photo-signature` | ✓ | how to upload photo and signature in online application form (720, 26) | |
| `/hi/guides/how-to-upload-photo-signature` | ✚ P3 | Hindi pair | Hindi forms are the bigger audience for this intent |
| `/guides/photo-size-kb-vs-pixels` | ✓ | photo size kb vs pixels | Must not answer "20 kb photo size in pixels" (the tool owns it) |
| `/guides/reduce-photo-size-to-20kb-on-mobile` | ✓⟲ watch | reduce photo size to 20 kb on mobile | C20. If GSC shows this guide ranking for "20 kb photo size", merge it into the tool's HowTo and 301 |
| `/guides/combine-certificates-into-pdf-under-300kb` | ✓ | combine certificates into one pdf | C21, resolved by anchor text |
| `/guides/handwritten-declaration-format` | ✓ | handwritten declaration format | C15 |
| `/guides/live-photo-capture-ssc-rrb` | ✓ | ssc live photo capture | |
| `exam-form-checklist`, `jpg-vs-png-vs-pdf`, `photo-rejected-how-to-fix`, `scan-signature-with-phone`, `thumb-impression-for-exam-forms` | ✓ | title topic | |
| `/hi/guides/photo-ko-kb-me-kaise-kare` | ✓ | photo ko kb me kaise kare (590, 17) | Hindi only, no hreflang (C27) |
| `/guides/pdf-upload-error-fix` ("please upload a valid PDF") | hold | SERP question only; already a FAQ on doc pages | Create only if GSC shows impressions for it |

### 2.8 Hindi counterparts: rule

A Hindi page exists only where (a) its English pair exists, (b) all its numbers come from a preset
or tool config, and (c) there is evidence of demand: a GA winner, an English volume of 1K or more,
or a weak Hindi SERP.

Hindi tools to add:

- **P2:** `compress-pdf-to-400kb` ★ and `compress-pdf-to-300kb` (NTA certificates).
- **P3:** `thumb-impression`, `mb-to-kb-photo`, `compress-image-to-15kb`, `compress-image-to-40kb`,
  `postcard-size-photo`, `stamp-size-photo` and `resize-image-in-cm`. All have English volume of
  4.4K or more.

### 2.9 Cannibalisation: open items beyond map C1–C17

C1–C17 are resolved in the keyword map, and on disk they are mostly done (§4). New ones:

| # | Overlap | Resolution |
|---|---|---|
| C18 | `/tools/images-to-pdf` primary "image to pdf 100 kb" vs `/tools/jpg-to-pdf-under-100kb` "jpg to pdf 100 kb" | The 100 KB page owns every "100 kb" PDF-from-image term. images-to-pdf becomes the hub ("jpg to pdf under any kb"), with no number in its title or H1 lead |
| C19 | "handwritten declaration for ibps rrb" (90.5K): tool vs `/exam/ibps-rrb-{po,clerk}/declaration` vs `/exams/ibps` vs the guide | The tool owns it, and the IBPS RRB declaration pages link to it with that anchor. Doc pages own "<exam> handwritten declaration size"; the hub owns "ibps handwritten declaration size"; the guide owns "format" |
| C20 | 20 KB guide vs the 20 KB tool | See §2.7; monitor in GSC |
| C22 | Templated near-duplicates: 5 IBPS exams × 5 docs (25 pages) with identical specs; SBI PO/Clerk; RBI Assistant/Grade B | Each page needs exam-specific content: notice name, cycle, window and 1–2 FAQs taken from that exam's notice. After 90 days, any page with no impressions that GSC flags "Duplicate, Google chose different canonical" is set to noindex,follow (kept for users), not deleted |
| C23 | A possible `/exams/upsc` vs `/exam/upsc-cse` | Don't create the hub |
| C24 | 6 × 2 cm terms on signature-resize (FAQ) and the SSC hub | See §2.2 (`/tools/signature-6x2-cm`) |
| C27 | `/hi/tools/compress-image` vs `/hi/guides/photo-ko-kb-me-kaise-kare` | The tool must not use the Hinglish "photo ko kb me kaise kare" in its title or H1; it links to the guide (F added these links) |
| C28 | `src/content/tools/en/name-date-on-photo.json` has a "People also search for a JEE Main photo with name and date, a NEET photo…, a TNPSC photo editor and a date on photo for SSC" paragraph | This is a keyword list and breaks map rule 5, C6 and C16. Rewrite it as one sentence linking to `/exam/jee-main` with the anchor "JEE Main photo with name and date", and drop the TNPSC and SSC terms |

---

## 3. Template spec per page type

These parts are the same on every page:

- One H1 holding the exact primary phrase.
- The primary also appears in the title (front-loaded, 60 code points or fewer), the meta
  description (140–160) and the first 100 words.
- Breadcrumbs: one `<ol>` plus BreadcrumbList.
- canonical, plus hreflang only when the pair exists and the page is indexable.
- An OG image from `og-entries.ts`.
- A trust line: "Specs from <notice>, page N · checked <date> · Source".
- Every number comes from `verifiedSummary()` or the `spec-text` helpers.

Google shows FAQ rich results only for authoritative government and health sites (since Aug 2023)
and dropped HowTo rich results (Sept 2023). Keep FAQPage and HowTo JSON-LD only where the content
is visible; they still help Bing and AI answers, but don't count on SERP features. The ATF (above
the fold) answer box is the snippet play.

### T1 Home (`/`, `/hi`)
1. H1 plus a subline (tagline).
2. Exam search plus season-ordered exam chips.
3. **"Most searched sizes"**: 5 rows from presets; anchors are the owner pages' primaries. This
   must fit within the first 390×844 screen.
4. "Just need a size?": tool cluster cards (KB, PDF, signature, photo sizes, cm/mm).
5. "Filling an exam form?": popular exam cards with photo and signature KB.
6. How it works (3 steps).
7. Trust strip (no upload).
8. FAQ (3–6).
9. Footer guide links.

JSON-LD: Organization, WebSite plus SearchAction, FAQPage.

### T2 Index hub (`/tools`, `/exams`, `/guides`, `/id-documents`)
1. H1.
2. A one-line answer.
3. A "Most used" row (4 items).
4. Sections per cluster, each with an anchored H2 (`/tools`: `#kb`, `#pdf`, `#photo-sizes`,
   `#signature-thumb`, `#pixels-cm-mm`, `#convert`; `/exams`: by family/group, with cards showing
   photo and signature KB).
5. FAQ (optional, 2–3).

JSON-LD: BreadcrumbList, ItemList (all children), FAQPage if present.

### T3 Family hub (`/exams/<family>`)
1. H1 (family primary).
2. **ATF answer box**: the family-wide rule in one or two rows (for example "SSC 2026: photo is
   captured live; signature 10–20 KB").
3. Embedded tool, when the family shares one spec (SSC/RRB signature).
4. Comparison table, exam by exam: photo, signature, thumb, extra. Each row links
   "<Exam> photo size" to the hub and "<Exam> signature size" to `/signature`.
5. Differences and gotchas.
6. FAQ: family questions, plus per-exam questions answered in one sentence with a link.
7. Related families and guides.

JSON-LD: BreadcrumbList, ItemList, FAQPage. FAQ answers need an optional `link {href, text}` in
the `FaqList` and `schemas/pages.ts` schema (not built yet).

### T4 Exam hub (`/exam/<slug>`), variants upload / live / live-single
1. Breadcrumbs.
2. H1 per map §4.
3. Lead (first 100 words): the primary, every document's size, the notice name.
4. **ATF answer box**: one row per document (live: "Photo: live capture, no upload"), plus the
   status pill (`applyWindow`: open, closed, or next season).
5. **Tool**: KitSlot for all documents. For live-single, an embedded signature uploader that is
   visible at 390 px.
6. H2 "<short> photo and signature size <cycle>": SpecTable from the preset.
7. H2 "Documents to upload": chips to every `/exam/<slug>/<doc>` (anchor "<short> <doc> size").
8. H2 "Mistakes that get uploads rejected": rejectionTips.
9. H2 FAQ, at least 4: the photo-size question, the live-photo question (live only), the deadline
   (generated from `applyWindow`), and exam-specific questions.
10. Related: family hub, sibling exams (same family), guides (live: live-photo guide).
11. A "Do all N documents" link to `/kit/<slug>` (noindex).

JSON-LD: BreadcrumbList, HowTo (upload steps), FAQPage, WebPage with
`dateModified = lastChecked`.

### T5 Exam document (`/exam/<slug>/<doc>`, `/hi/...`)
1. Breadcrumbs.
2. H1 `<short> <Doc> Size <cycle>`, or the doc-seo override.
3. Lead: `<Exam> asks for the <doc> as a <summary> file.` Use correct "up to" and range wording.
4. **ATF answer box** (`DocAnswerBox`): Size | Format | Pixels/pages | Who uploads | Source, page,
   checked date.
5. **Tool**: KitSlot `only=<doc>`. On success, the result state shows "Next: <doc> for <exam>" and
   "Same file works for: <exams>".
6. Guide link (GuideLink).
7. "Other documents for <exam>" chips.
8. NoticeBadge plus the status pill.
9. SpecTable ("Rules from the notice").
10. About / notice excerpts.
11. Rejection tips.
12. FAQ, at least 3 document-specific (doc-seo faqSets/presetFaqs plus the generated deadline FAQ).
13. DocRelated: the matching KB/PDF tool (e.g. compress-pdf-to-400kb), comparisons ("same as NEET
    class 10").
14. Kit CTA.

JSON-LD: BreadcrumbList, HowTo, FAQPage.

### T6 KB image tool (`compress-image-to-<n>kb`, ranges, `compress-image` hub)
1. H1 `<n> KB photo size: …`.
2. Lead: the primary plus the output range (0.9n–n KB, JPG).
3. **Tool directly under the lead**, preset to n KB.
4. **ATF answer box**: "n KB ≈ W×H px at typical JPEG quality" plus "Exams with an n KB limit"
   (from `kb-limit.ts`; only matching limits; links go to the document page).
5. H2 "What n KB means in pixels".
6. H2 "Exams that ask for n KB".
7. H2 "How to get an n KB photo": 3 steps.
8. FAQ, one per secondary.
9. Related: neighbouring KB targets (n−, n+), the range page, signature-resize, increase, the
   guide.

The hub version replaces items 3–4 with a target picker (5–500 KB grid). JSON-LD: BreadcrumbList,
WebApplication (offers 0 INR, already emitted), HowTo, FAQPage.

### T7 PDF / JPG-to-PDF tool
This follows T6, with these differences:
- The lead for JPG-to-PDF starts `JPG to PDF <n> KB:`.
- The answer box shows "Pages are redrawn; digital signatures are not kept" and "Exams with an
  n KB limit" (for example 400 KB lists RRB only).
- The FAQ includes "My PDF got bigger after compressing. Why?"

Related: the other PDF targets plus the certificate document pages. JSON-LD as in T6.

### T8 Size or dimension tool (cm, mm, px, passport, 3.5×4.5, stamp, postcard, signature, thumb, declaration, name-date)
1. H1.
2. Lead with the spec: cm, the px at 200/300 DPI, and KB when the form sets one.
3. **Tool**.
4. **ATF answer box**: a dimension table (cm ↔ mm ↔ px at 200/300 DPI; KB).
5. H2 with a secondary keyword (e.g. "Passport size photo dimensions in cm and pixels").
6. Steps.
7. FAQ.
8. "Exams that use this size", from presets.
9. Related sizes in the same cluster.

JSON-LD: BreadcrumbList, WebApplication, HowTo, FAQPage.

### T9 Utility tool (convert-image, batch-compress, mb-to-kb, increase)
Tool first. Answer box: what it does in one line, plus limits. Then steps, FAQ and related.
JSON-LD as in T8.

### T10 ID document
Same as T5, but the source is the issuing portal instead of the exam notice, and it has no kit.
The answer box shows Size | cm/px | KB | Format | Portal. JSON-LD: BreadcrumbList, WebApplication,
HowTo, FAQPage.

### T11 Guide
1. H1 (a question or how-to).
2. TL;DR answer box: 2–3 lines with a link to the owning tool/doc page (anchor = that page's
   primary).
3. Steps with screenshots or diagrams.
4. Sections.
5. FAQ (optional).
6. Related exams and tools.
7. Updated date.

JSON-LD: BreadcrumbList, Article (image = OG), FAQPage if present. A guide never holds a tool
primary in its title lead.

### T12 Hindi
Same sections as the English template.
- Latin script for exam names, KB, px and cm.
- No English fallback strings: a section is hidden until its Hindi key exists.
- hreflang pairs (en-IN, hi-IN, x-default = en).
- Title and meta limits measured in code points.

### T13 Legal and utility
H1 plus a description of 140–160 characters. No keyword targeting. `/report` and `/offline` stay
noindex.

---

## 4. Status of the interrupted SEO work (verified on disk, 21 Nov)

Sources: `git diff --stat` (114 files, +2,192/−505), untracked files, the implementation reports
in `seo-audit-results.md`, and spot checks. Reports exist only for E, F and C. **A, B and D left
no report** (those agents stopped mid-way), so the rows for them below come from the code alone.
Nothing has been built, crawled or committed.

| Item | Status | Evidence / what's left |
|---|---|---|
| A1 Hindi guide OG 404 | **Done (unverified)** | `src/seo/og-entries.ts` (new) covers every guide including Hindi-only ones; `latinLead()` in `text.ts`; og route refactored |
| A2 Description limits + test | **Done; test is report-only** | `DESC_MIN` 140, `DESC_MAX` 160, `metaLengthIssues()`. `src/seo/__tests__/lengths.test.ts` is skipped without `.next` build output and blocks only with `SEO_LENGTHS_STRICT=1`. Left: build, run strict, fix offenders, make it blocking in CI, fix the config path in its comment |
| A3 GA4 events | **Done** | `src/lib/analytics.ts` gtag sender + `src/lib/__tests__/analytics.test.ts`. Left (owner, in GA): mark `doc_downloaded` and `kit_zip_downloaded` as key events; re-baseline bounce after 7 days |
| A4 Site URL / sameAs | **Done** | `DEFAULT_SITE_URL` is `https://sahisize.online`; `sameAs` is omitted when empty. The code comment now claims the `support@sahisize.in` mailbox exists; the owner must confirm |
| A5 Robots / hreflang / sitemaps | **Mostly done** | 404 uses `omitRobots`; noindex pages get no hreflang (`metadata.ts`); sitemap lastmod (`sitemap.ts` +97, `sitemap.test.ts`); `/sitemap.xml` → 301; home canonical without a slash. **Left:** kit description template ("सभी अपलोड एक फ्लो में: {docs}") is unchanged; low priority because kit pages are noindex |
| A6 Page weight | **Not done** | No change to the RSC payloads of `HeroSearch`, `ExamSearch` or Hindi hubs. The home "Most searched sizes" block is server-rendered and adds no client payload. Measure after the build |
| A7 Caching + host redirect | **Done in code** | `next.config.mjs`: HTML `s-maxage=3600, stale-while-revalidate=86400`; in-app www→apex and http→https 301s. Left: production `curl -I` check; nginx should still do it |
| B1 PDF 400 KB | **Done** | H1 "PDF compressor to 400 KB", the FAQ, `kb-limit.ts` filter (+ test), `kbLimitExamLinks` linking to document pages |
| B2 Tool copy | **Mostly done** | Titles, H1s and metas for JPG-to-PDF, passport, cm, mm, compress-pdf, signature-resize, postcard, 3.5×4.5 and 200 KB PDF are in. **Missing:** 20 KB FAQ "Is this a photo size reducer to 20 KB for signatures too?"; 50 KB H2 "Photo convert into 50 KB in three steps"; C28 keyword paragraph on name-date. No length report from B |
| C1 Exam H1/title template | **Done** | `exam-template.ts` (new) + test, `exam-seo.json`, `exam-title-names.json`; "— Resize Free" is gone |
| C2 Live-photo hubs | **Done (unverified at 390 px)** | Answer box plus embedded signature KitSlot for CGL, CHSL, CPO and MTS |
| C3 applyWindow | **Done** | Schema plus 5 presets (rrb-ntpc, csir-net, ugc-net, ssc-cgl, jee-main); NoticeBadge pill; generated deadline FAQ on hubs. **Gap:** document pages don't call `deadlineFaq()`, so they lost their deadline FAQ. Open/closed status is computed at build time, so it needs a rebuild after each deadline |
| C4 Family hubs / C5 exam FAQs | **Done** | Hub link keys; NEET postcard, IBPS PO resizer and UGC↔CSIR FAQs. **Not written (no source):** JEE name/date, typed signature, NEET Aadhaar mismatch. FAQ answers cannot carry links yet |
| D1 GA-winner doc pages | **Done (unverified)** | `src/features/exam-document/doc-seo.json` overrides: jee-main/class10, csir-net/result-awaited, rrb-ntpc/certificate (en+hi), rrb-group-d/certificate, rrb-alp/certificate, jee-main/photo, neet-ug/photo (en). The CSIR "older bulletins 500 KB" FAQ was correctly **not** shipped |
| D2 Doc template | **Mostly done** | `DocAnswerBox`, `DocOtherChips`, `DocRelated` (with "Next: <doc> for <exam>" and "same file works for"), GuideLink, lead from the page model. **Left:** the "Next" button lives in the page body, not in KitFlow's result state (`KitFlow.tsx` is unchanged); doc-seo overrides for the SSC/RRB `/signature` pages (map §5) are not in doc-seo.json |
| E1–E4 Home, links, contact, breadcrumbs | **Done** | Left: check that the home block fits the first 390×844 screen; the owner must confirm the "reply within 2 working days" claim |
| F1 Hindi metas | **Done** | 8 tools, 10 guides, /hi/exams. **Left:** Hindi strings for `exam.introLive`, `introUpload`, `faqPhotoQ`, `faqPhotoLiveA`, `faqPhotoA`, `hub.photoLink` and `hub.signLink` (C must make the placeholders language-aware first) |
| New pages (plan) | **All 5 on disk, plus 1** | `/hi/exam/csir-net` (+ `/hi/kit/csir-net`), `/hi/id-documents/pan-card-signature-size`, `/hi/exam/{jee-main/class10, csir-net/result-awaited, rrb-ntpc/certificate}`; `hindiPathFor()` maps document paths. All are in `docs/routes.txt` (unsorted) |
| Facts to verify | **Open** | CSIR result-awaited 50–300 vs 500 KB; RRB SC/ST 399 vs 500 KB; JEE Main 2027 bulletin (cycle bump); Agniveer and UP Police values |

**Before any new page, close out this branch:**

1. `npm run build`.
2. Crawl `docs/routes.txt` (all 200), then run the strict lengths test.
3. Check at 390 px: `/` and `/exam/ssc-cgl`.
4. Check `presets:check` and `i18n:check`.
5. Sort `routes.txt`, then commit on `seo/production-seo` and open the PR.

---

## 5. Rollout

| Phase | Scope | New URLs | Retargeted or changed |
|---|---|---|---|
| **P1: ship what's built** (now) | Finish §4 gaps: the deadline FAQ on doc pages; B2 leftovers; C28 rewrite; C18 retarget of images-to-pdf; doc-seo overrides for the 8 SSC/RRB `/signature` pages; KitFlow next-step; build, crawl and the strict length test; merge. Fix structure debt that blocks scaling: one shared page body per template for en/hi | 0 (the 6 Hindi pages already built ship here) | about 15 pages |
| **P2: evidence-backed expansion** | Hindi signature pages for SSC×5 and RRB×3 (8); Hindi RRB Group D and ALP certificate pages (2); Hindi hubs for ibps-so, nabard-grade-a, rbi-assistant and rbi-grade-b (4); `/hi/tools/compress-pdf-to-400kb` ★ and `/hi/tools/compress-pdf-to-300kb` (2). Add the `link` field to FAQ answers (hub and exam FAQ anchors). Re-baseline GA with the new events | **16** | IBPS-cluster uniqueness pass (C22) on about 25 pages |
| **P3: cluster completion** | `/tools/signature-6x2-cm` (C24); `/exams/nta`; `/hi/exams/{ssc,rrb,ibps}` (3); 7 Hindi tools (thumb, mb-to-kb, 15 KB, 40 KB, postcard, stamp, cm); `/hi/guides/how-to-upload-photo-signature`; Hindi doc pages for neet-ug/class10, cuet-ug/certificate, neet-ug/photo and ibps-po/declaration (4). First, refresh the Semrush pull (`docs/seo/semrush/` is empty) and get 4 weeks of GSC data | **about 17** | signature-resize and SSC hub (C24) |
| **P4: gated (official source or owner decision)** | Agniveer, then UP Police (first), then the other 10 unpublished presets: hub + doc pages + Hindi hubs; `rrb-ntpc-ug`; `/exams/police` and `/exams/defence` once they have 3 or more members; NSDL/UTI PAN (only if specs differ); `increase-pdf-size-in-kb` (only if the engine supports it); heic/png→jpg split (only with Semrush data); after 90 days, the GSC-driven noindex or merge of zero-impression near-duplicates (C20, C22) | **about 40–60** (about 13 hubs, 25–35 doc pages, about 12 Hindi hubs, 2–4 family/ID/tool pages) | |

Totals: about 312 indexable pages today. After P1–P3, about 345. After P4, about 390–400.
