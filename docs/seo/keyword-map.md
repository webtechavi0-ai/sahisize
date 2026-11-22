# SahiSize keyword-to-page map

Version 2, 14 Nov 2026. This file decides which page owns which search query. Implementers
copy titles, H1s and descriptions from here; anything not listed follows the template of
its page type.

**Sources**
- Semrush, India database, pulled 22 Oct 2026 (Keyword Magic, Bulk Analysis, Organic
  Research). Volumes are monthly Google searches in India; KD = Semrush keyword difficulty
  (%). Written as `(volume, KD)`.
- `docs/seo/semrush/` was empty on 14 Nov 2026, so no fresher export was used.
- SERP research (WebSearch, US vantage point, approximates Google India), 14 Nov 2026.
  Keywords that come only from it are marked **vol: unknown (SERP)**.
- Google Analytics, 17 Oct – 13 Nov 2026 (265 users, 15 s average engagement). Organic
  winners: `/exam/jee-main/class10` (63 views / 9 users), `/exam/csir-net/result-awaited`
  (21/16), `/exam/rrb-ntpc/certificate` (13/9), `/tools/compress-pdf-to-400kb` (10/9, 11%
  bounce), `/exam/ssc-cgl` (9/7). The home page bounces at 72.8%.
- Every size in this file comes from `src/content/presets/*.json` or the live page as of
  14 Nov 2026. If a preset changes, the preset wins and the copy is regenerated from it.

## 0. Rules (all pages)

1. One primary keyword per URL. A query listed under one page must not be the H1, title
   lead or an FAQ question on another page. Other pages may *link* to the owner with the
   keyword as anchor text.
2. The primary keyword goes in the title (front-loaded), the H1, the first 100 words and
   the meta description, as the exact phrase. Case and "&" vs "and" may differ.
3. Title: at most 60 characters, counted as code points. Titles below are the core title;
   `fitTitle()` in `src/seo/text.ts` adds ` | SahiSize` when the result still fits in 60
   and drops it otherwise. Prefer cores of 49 characters or fewer so the brand shows.
4. Meta description: 140–160 characters. **`src/seo/text.ts` currently has `DESC_MIN = 120`
   and `DESC_MAX = 155`; owner A changes them to 140 and 160**, otherwise
   `clampDescription()` cuts the 156–160-character descriptions below.
5. Exactly one H1. Secondary keywords go in H2s, body copy and FAQ questions, at most once
   or twice each. No keyword lists, no hidden text.
6. Facts only from preset data or the cited notice. Never type a size by hand when a
   builder (`verifiedSummary()`, `docSummary`, spec helpers in `src/seo/spec-text.ts`) can
   produce it.
7. Year labels: use the preset `cycle`. SSC MTS (2025), RRB Group D (2025), HTET (2025),
   NABARD Grade A (2025), Bihar Police (2025) and REET (2024) are labelled with the latest
   notice that the preset cites; do not bump a year without a new notice.
8. Hindi pages: Hindi searchers mix scripts ("SSC CGL फोटो साइज़ 2026"). Keep exam names,
   KB, px and cm in Latin script; the rest in Devanagari. Hindi volumes are unknown except
   the four Hinglish guide terms in section 9.

## 1. Cannibalisation conflicts and how they are resolved

| # | Query / overlap | Competing URLs | Owner (decision) | What the other page does |
|---|---|---|---|---|
| C1 | `<exam> signature size` (ssc cgl 1.3K, ssc gd 2.9K, rrb ntpc 1.9K, rrb group d 1.3K, ntpc 880, ssc mts signature resize 1.3K) | `/exams/ssc`, `/exams/rrb`, `/exam/<slug>`, `/exam/<slug>/signature` | `/exam/<slug>/signature` | Hub: one-sentence answer + link with that exact anchor. Exam hub: H1 moves to "photo size" (C2). |
| C2 | `<exam> photo size` / `<exam> photo and signature size` for live-photo exams | `/exam/<slug>` vs `/exam/<slug>/signature` | `/exam/<slug>` | Child page keeps "signature size" only. |
| C3 | `jee photo size`, `neet photo size` | `/exam/jee-main` vs `/exam/jee-main/photo`; `/exam/neet-ug` vs `/exam/neet-ug/photo` | Exam hub | `/photo` child takes `jee main photo resize` / `neet photo resizer` + `neet photo resize`. |
| C4 | `3.5 cm x 4.5 cm`, `passport size photo in cm` | `/tools/passport-size-photo` vs `/tools/photo-3-5x4-5-cm` | `/tools/photo-3-5x4-5-cm` owns every "3.5 × 4.5 cm" and "in cm" query | Passport page owns "passport size photo maker", "passport size photo dimensions in cm" via an H2, links to the 3.5×4.5 page. Passport title drops "3.5×4.5 cm". |
| C5 | `200 kb pdf` (27.1K) | `/tools/jpg-to-pdf-under-200kb` vs `/tools/compress-pdf-to-200kb` | `/tools/compress-pdf-to-200kb` | JPG page: lead with "JPG to PDF 200 KB", never "200 KB PDF" in title/meta. |
| C6 | `jee main photo with name and date` (2.9K) | `/tools/name-date-on-photo` vs `/exam/jee-main` | `/exam/jee-main` | Tool links to it; tool keeps generic name-date terms. |
| C7 | `postcard size photo for neet` (3.6K), `neet post card size photo` (1.6K), `post card size photograph for neet` (2.9K) | `/tools/postcard-size-photo` vs `/exam/neet-ug` | `/exam/neet-ug` (exam intent) | Tool links with anchor "NEET postcard size photo"; tool keeps "postcard size photo", "post card size photo". |
| C8 | `signature resize 10 to 20 kb`, `10kb to 20kb signature size` | `/tools/signature-resize` vs `/tools/compress-image-10kb-to-20kb` | `/tools/signature-resize` (signature wording) | Range page keeps photo wording: "10 kb to 20 kb photo size". |
| C9 | `sbi po photo resizer` vs `sbi clerk thumb impression size` (one map row) | `/exam/sbi-po`, `/exam/sbi-clerk` | Split: one each (matches current pages) | — |
| C10 | `ibps clerk photo size`, `ibps po photo resizer`, `ibps rrb photo and signature size`, `thumb impression for ibps po` | `/exams/ibps` vs per-exam pages | Per-exam pages (`/exam/ibps-clerk`, `/exam/ibps-po`, `/exam/ibps-rrb-po`, `/exam/ibps-po/thumb`) | IBPS hub keeps family terms and links down. |
| C11 | `ssc chsl photo and signature size` (590) | `/exams/ssc` vs `/exam/ssc-chsl` | `/exam/ssc-chsl` | — |
| C12 | `neet signature size` (590), `thumb impression for neet` (720) | `/exam/neet-ug` vs children | `/exam/neet-ug/signature`, `/exam/neet-ug/thumb` | Hub mentions sizes in the spec table only. |
| C13 | `rrb <exam> sc st certificate size` | `/exam/rrb-ntpc/certificate`, `/exam/rrb-group-d/certificate`, `/exam/rrb-alp/certificate`, `/tools/compress-pdf-to-400kb` | Each certificate page owns its own exam name; tool owns "pdf compressor 400 kb" | Tool links to all three with exam anchors. |
| C14 | `ibps handwritten declaration size` (1K) | `/tools/handwritten-declaration` vs `/exams/ibps` | `/exams/ibps` (all IBPS exams share 800×400 px, 50–100 KB) | Tool keeps "declaration handwritten" + IBPS RRB text query. |
| C15 | `handwritten declaration format` | `/tools/handwritten-declaration` vs `/guides/handwritten-declaration-format` | Guide owns "format / how to write"; tool owns "declaration handwritten" (resize + trace) | Cross-link both ways. |
| C16 | `ssc photo with date` (390) vs `date on photo for ssc` (390) | `/exams/ssc` vs `/tools/name-date-on-photo` | `/tools/name-date-on-photo` only if the SSC notice asks for a dated photo; SSC 2026 uses live capture, so **drop both from targeting** | — |
| C17 | Home vs `/tools/compress-image` for "photo resizer" | `/`, `/tools/compress-image` | Home: "photo and signature resize"; KB hub: "photo resizer in kb". Head terms "photo resizer" / "image resizer" (1.2M, KD 88–89) are long-term only, no page targets them now. | — |

### 1a. Semrush retarget, India database (2026-11-21)

These assignments replace the older rows below where they differ. One primary per page; no
other page uses the primary in its title, H1 or meta (enforced for the tool pages by
`src/components/tools/__tests__/tool-copy-seo.test.ts`, for exam/print pages by the exam-seo checks).

| Page | Primary (vol, KD) | Also covered on the same page | Notes |
|---|---|---|---|
| `/` | **photo size in kb** (22.2K, 30) | kb photo size (22.2K, 3), photo kb size (22.2K, 24) | Same intent, one page. Title `Photo Size in KB: Resize for Exam Forms & Everyday Use` (exams and common use: jobs, PAN, passport). "Just need a size?" stays first. "photo and signature resize" becomes secondary. |
| `/tools/photo-size-converter-in-kb` (new) | **photo size converter in kb** (8.1K, 27) | kb converter photo | Reduces or increases to any KB target (existing engine). English only. Moved off `/tools/compress-image`. |
| `/tools/compress-image` | **photo size reducer in kb** (8.1K, 35) | photo resizer in kb (secondary, intro), kb resizer, photo kb reduce | "image converter in kb" section renamed so it does not compete with the converter. |
| `/tools/compress-image-to-100kb` | **100 kb photo size** (18.1K, 23) | 100 kb photo size jpg (8.1K, 22) | JPG in title, H1 and the opening answer. |
| `/tools/compress-image-to-20kb` | **20 kb photo size** (18.1K, 17) | compress image to 20 kb | — |
| `/tools/compress-image-to-200kb` | **200 kb photo size** (12.1K, 21) | resize image to 200 kb | — |
| `/tools/increase-image-size-in-kb` | **increase photo size in kb** (6.6K, 23) | increase image size in kb (secondary, intro), photo kb increase | "Photo" wording in title and H1. |
| `/exams/net` (new hub, UGC NET + CSIR NET) | **net exam photo size** (1K, 5) | ugc net vs csir net photo | Family membership by explicit slugs (`match.slugs`, `minSize: 2`). |
| `/exam/neet-ug` | **neet exam photo size** (480, 21) | neet photo size | — |
| `/exam/neet-ug/photo` | **neet exam passport size photo** (210, 20) | neet photo resizer (secondary) | — |
| `/exam/neet-ug/postcard-photo` (new) | **neet exam post card size photo** (320, 12) | postcard size photo for neet | 4×6 inch print for the admit card (NEET UG 2026 bulletin); not an upload. Replaces C7's exam-hub target. `/tools/postcard-size-photo` keeps the generic "postcard size photo". |
| `/exams/ssc` | **ssc exam photo and signature size** (140, 3) | ssc signature resize (secondary, intro) | — |
| `/exam/gate` (new) | **gate exam photo size** (110, 16) | gate photo and signature size | From the GATE 2027 information brochure. `/exam/gate/photo` takes "gate photo resize", `/exam/gate/signature` "gate signature size". |

## 2. Site pages

### / (home)
- Primary: **photo and signature resize** (1.3K, 9). Secondary: photo and signature resize
  online (1.3K, 9), photo signature resize (1.3K, 24), sarkari result photo resize (480, 6),
  psc photo upload size (170, 3).
- Title: `Photo and Signature Resize for Exam Forms` (keep)
- H1: `Photo and signature resize for exam forms`; keep "Right size, first time." as the subline (not in the H1).
- Meta: keep current (146): `Photo and signature resize online for exam forms: exact pixels and KB for IBPS, SBI, SSC, RRB, NEET, UPSC and more. Free, and nothing is uploaded.`
- H2s: "Most searched sizes" (first screen, rows built from presets: JEE Main 10th certificate · 50–300 KB PDF; CSIR NET result awaited form · 50–300 KB PDF; RRB NTPC SC/ST certificate · up to 399 KB PDF; SSC CGL signature · 472×157 px, 10–20 KB; PDF compressor to 400 KB), "Popular exams right now", "Tools for any KB size", "How it works".
- FAQ: "What photo upload size do PSC and sarkari forms need?" (answer: it differs by exam; link to /exams; quote no single size), "Is my photo uploaded anywhere?", "Which exams are covered?".

### /hi (home, Hindi)
- Primary: **फोटो और सिग्नेचर रीसाइज़** — vol: unknown (SERP). Title keep. H1: `परीक्षा फॉर्म के लिए फोटो और सिग्नेचर रीसाइज़`. Same "Most searched sizes" block, Hindi labels, Hindi URLs where they exist.

### /tools
- Primary: **photo signature and pdf tools for exam forms** — vol: unknown. Title keep: `Free Image, Signature and PDF Tools for Exams`.
- H1: `Photo, signature and PDF tools for exam forms`. H2 "Most used" (photo to 20 KB, signature resize, PDF compressor to 400 KB, JPG to PDF) above the full list.
- Meta: keep (150).

### /exams
- Primary: **exam photo and signature size** — vol: unknown. Title keep: `All Exams: Photo, Signature & Document Sizes`.
- H1: `Exam photo, signature and document sizes`. Cards show "Photo 20–50 KB · Sign 10–20 KB" from presets.
- Meta: keep (157).

### /guides
- Title keep. H1: `Exam form upload guides` (was "Guides"). Meta keep.

### /contact (thin, 80 words)
- Title: `Contact SahiSize: Report a Wrong Size`. H1 `Contact SahiSize`.
- Meta (target 140–160): `Contact SahiSize to report a wrong exam size, a rejected upload or a missing exam. Tell us the exam and document; we check the notice and reply by email.`
- Body: what to report, what not to send (no photos), link to /report and /sources. Response-time claim only if the owner confirms one.

### /terms, /privacy, /about, /disclaimer, /editorial-policy, /sources, /report
- No keyword targeting. Lengthen descriptions below 140 (`/terms` 108, `/report` 108, `/privacy` 135, `/about` 136) to 140–160 with plain factual text. `/offline` and `/report` stay noindex.

## 3. Family hubs (`/exams/<family>`, copy in `src/content/hub-copy/en/*.json`)

| URL | Primary | Secondary (kept on hub) | Moved off the hub |
|---|---|---|---|
| /exams/ssc | **ssc exam photo and signature size** (140, 3), see 1a | ssc signature resize (8.1K, 5), ssc sign resize (8.1K, 5), ssc signature resizer (5.4K, 5), ssc signature size (5.4K, 4), ssc photo resize (3.6K, 5), ssc signature resize 6cm x 2cm (2.4K, 7), signature resize for ssc (1.9K, 3), ssc photo (1.3K, 10), ssc photo and signature size (1K, 4), staff selection commission photo and signature size (1K, 4), ssc photo and signature size converter (720, 4) | ssc cgl signature size → /exam/ssc-cgl/signature; ssc gd signature size → /exam/ssc-gd/signature; ssc mts signature resize → /exam/ssc-mts/signature; ssc chsl photo and signature size → /exam/ssc-chsl; ssc photo with date → dropped (C16) |
| /exams/rrb | **rrb signature size** (2.9K, 3) | rrb photo resizer (1.9K, 5), rrb photo resize (1.6K, 6), signature resize for rrb (1.6K, 3), rrb photo and signature size (880, 2), railway photo resizer (390, 2), rrb photo upload (480) | rrb ntpc signature size, ntpc signature size → /exam/rrb-ntpc/signature; rrb group d signature size, rrb group d signature resize → /exam/rrb-group-d/signature; rrb ntpc photo and signature size (480), ntpc photo upload (480) → /exam/rrb-ntpc |
| /exams/ibps | **ibps photo resizer** (1K, 5) | ibps signature (880, 4), ibps signature size (480, 3), ibps image resize (390, 2), ibps photo and signature size online (260, 3), left thumb impression for ibps (320, 3), ibps declaration size (140, 16), ibps handwritten declaration size (1K, 26) | ibps clerk photo size → /exam/ibps-clerk; ibps po photo resizer → /exam/ibps-po; ibps rrb photo and signature size → /exam/ibps-rrb-po; thumb impression for ibps po → /exam/ibps-po/thumb |

Titles (keep; all fit): `SSC Signature Resize & Size: 6cm x 2cm, 10–20 KB`, `RRB Signature Size: 30–49 KB for NTPC, Group D & ALP`, `IBPS Photo Resizer: PO, Clerk, RRB, SO Sizes 2026`. H1s keep. Metas keep (145–153).

Required changes on all three hubs:
- H2 on SSC: `SSC photo and signature size converter, exam by exam` (replaces "SSC photo and signature size, exam by exam").
- FAQs that answer a per-exam query ("What is the RRB Group D signature size?", "What is the RRB NTPC photo and signature size?", "Is the SSC GD signature size different from SSC CGL?") keep the question but answer in one sentence and link with the exact anchor ("RRB Group D signature size" → /exam/rrb-group-d/signature).
- Each per-exam row links to `/exam/<slug>` with anchor "<Exam> photo size" and to `/exam/<slug>/signature` with anchor "<Exam> signature size".

## 4. Exam hubs (`/exam/<slug>`)

Builders: `src/server/content/exam-meta.ts` (default H1/title), overrides in
`src/content/seo/exam-seo.json`, short names in `src/content/seo/exam-title-names.json`.

### Template
- Primary: **`<short> photo size`**; secondary `<short> photo and signature size`, `<short> photo resize`.
- Short name (titles and H1): no brackets and no "& Havaldar". `RRB NTPC`, `RRB Group D`, `RRB ALP`, `SSC MTS`, `SSC CPO`, `SSC GD`, `IBPS RRB PO`, `IBPS RRB Clerk`, `IBPS SO`, `UPSC NDA`, `UPSC CDS`, `CSIR NET`, `HTET`, `REET`, `Bihar Police Constable`. The full name (e.g. "RRB NTPC (Graduate), CEN 06/2026") goes in the first sentence.
- Title, photo upload exams: `<short> Photo Size <cycle> & Signature Size`; with thumb: `<short> Photo Size <cycle>, Signature & Thumb`.
- Title, live-photo exams (`photoUploadReplacedByLive: true`): `<short> Photo Size <cycle> & Signature Size` (same pattern; the meta and H1 explain the live photo).
- H1, photo upload: `<short> Photo Size <cycle> and Signature Size` (or `…, Signature and Thumb Size`). Drop "— Resize Free".
- H1, live photo: `<short> Photo Size <cycle>: Live Photo and Signature Size`.
- Meta, photo upload: `<short> photo size <cycle>: <photo spec>; signature <sig spec>[; thumb <spec>]. Resize free on your phone, nothing is uploaded.` Built with `fitDescription` and extras until 140–160.
- Meta, live photo: `<short> photo size <cycle>: no photo file, the form takes a live photo. Signature <sig spec>. Resize the signature free on your phone, no upload.`
- First 100 words: the primary phrase, every document's size (from preset), the notice name.
- Required H2s: `<short> photo and signature size <cycle>` (spec table), `Documents to upload`, `Mistakes that get uploads rejected`, `FAQ`.
- Required FAQs (answered from the preset only): "What is the <short> photo size?"; live-photo exams also: "Other sites say a 20–50 KB photo. Is that wrong?" (older rule; this notice uses live capture), "6×2 cm or 4×2 cm signature?" where the preset has it; deadline FAQs come from the `applyWindow` field (seo-plan C3), never free text.
- Live-photo exams with one uploadable document (SSC CGL, CHSL, CPO, MTS): embed the signature tool on the hub (seo-plan C2).

### Explicit rows (lengths checked; meta numbers from presets)

| URL | Primary (vol, KD) | Title (core) | H1 |
|---|---|---|---|
| /exam/ssc-cgl ★GA | ssc cgl photo size (vol: unknown (SERP)); sec. ssc cgl photo and signature size | `SSC CGL Photo Size 2026 & Signature Size` | `SSC CGL Photo Size 2026: Live Photo and Signature Size` |
| /exam/ssc-chsl | ssc chsl photo and signature size (590, 6) | `SSC CHSL Photo and Signature Size 2026` | `SSC CHSL Photo and Signature Size 2026: Live Photo` |
| /exam/ssc-cpo | ssc cpo photo size (unknown) | `SSC CPO Photo Size 2026 & Signature Size` | `SSC CPO Photo Size 2026: Live Photo and Signature Size` |
| /exam/ssc-mts | ssc mts photo size (unknown) | `SSC MTS Photo Size 2025 & Signature Size` | `SSC MTS Photo Size 2025: Live Photo and Signature Size` |
| /exam/ssc-gd | ssc gd photo size (unknown) | `SSC GD Photo Size 2026, Signature & Thumb` | `SSC GD Photo Size 2026: Live Photo, Signature and Thumb` |
| /exam/rrb-ntpc | rrb ntpc photo and signature size (480, 2); sec. ntpc photo upload (480) | `RRB NTPC Photo and Signature Size 2026` | `RRB NTPC Photo and Signature Size 2026: Live Photo` |
| /exam/rrb-group-d | rrb group d photo size (unknown) | `RRB Group D Photo Size 2025 & Signature Size` | `RRB Group D Photo Size 2025: Live Photo and Signature` |
| /exam/rrb-alp | rrb alp photo size (unknown) | `RRB ALP Photo Size 2026 & Signature Size` | `RRB ALP Photo Size 2026: Live Photo and Signature Size` |
| /exam/jee-main | jee photo size (480, 21); sec. jee main photo with name and date (2.9K, 22) | `JEE Photo Size 2026: JEE Main Photo & Signature` (keep) | `JEE Photo Size 2026: JEE Main Photo and Signature` |
| /exam/neet-ug | neet photo size (2.9K, 23); sec. neet photo (1.3K), postcard size photo for neet (3.6K), post card size photograph for neet (2.9K), passport size photo for neet (1.9K), neet post card size photo (1.6K), neet admit card photo size (720), neet 2026 photo requirements (720), neet photo upload (480) | `NEET Photo Size 2026: Photo, Signature & Thumb` (keep) | `NEET Photo Size 2026: Photo, Signature and Finger Prints` (keep) |
| /exam/cuet-ug | cuet photo size (210, 8) | `CUET Photo Size 2026: CUET UG Photo & Signature` (keep) | `CUET Photo Size 2026: CUET UG Photo and Signature` |
| /exam/upsc-cse | upsc photo resize (4.4K, 4); sec. upsc photo size (2.4K), upsc photo (2.4K), upsc photo upload (260) | keep `UPSC Photo Resize 2026: Photo & Signature Size` | keep |
| /exam/nda | nda photo size (unknown) | `NDA Photo Size 2026 & Signature Size` | `UPSC NDA Photo Size 2026 and Signature Size` |
| /exam/cds | cds photo size (unknown) | `CDS Photo Size 2026 & Signature Size` | `UPSC CDS Photo Size 2026 and Signature Size` |
| /exam/ugc-net | ugc net photo size (unknown) | `UGC NET Photo Size Dec 2026 & Signature Size` | `UGC NET Photo Size December 2026 and Signature Size` |
| /exam/csir-net | csir net photo size (unknown) | `CSIR NET Photo Size Dec 2026 & Signature Size` | `CSIR NET Photo Size December 2026 and Signature Size` |
| /exam/ctet | ctet photo size (720, 5) | keep | keep |
| /exam/dsssb | dsssb photo resize (2.9K, 3); sec. dsssb photo resizer (2.9K), dsssb photo size (880), dsssb postcard size photo (390), dsssb thumb impression size (390), dsssb photo upload size (320) | keep | keep |
| /exam/mppsc | mppsc photo and signature size (1.3K, 10) | keep | keep |
| /exam/uppsc-pcs | uppsc photo and signature size (3.6K, 3) | keep | keep |
| /exam/india-post-gds | gds signature size 2026 (480, 10) | keep | keep |
| /exam/ibps-po | ibps po photo size (unknown); sec. ibps po photo resizer (210, 3) | `IBPS PO Photo Size 2026, Signature & Thumb` | `IBPS PO Photo Size 2026, Signature and Thumb Size` |
| /exam/ibps-clerk | ibps clerk photo size (210, 3) | `IBPS Clerk Photo Size 2026, Signature & Thumb` | `IBPS Clerk Photo Size 2026, Signature and Thumb Size` |
| /exam/ibps-rrb-po | ibps rrb photo and signature size (170, 1) | `IBPS RRB Photo and Signature Size 2026: PO` | `IBPS RRB PO Photo and Signature Size 2026, with Thumb` |
| /exam/ibps-rrb-clerk | ibps rrb clerk photo size (unknown) | `IBPS RRB Clerk Photo Size 2026 & Signature` | `IBPS RRB Clerk Photo Size 2026, Signature and Thumb` |
| /exam/ibps-so | ibps so photo size (unknown) | `IBPS SO Photo Size 2026, Signature & Thumb` | `IBPS SO Photo Size 2026, Signature and Thumb Size` |
| /exam/sbi-po | sbi po photo resizer (210, 2); sec. sbi po photo size (170, 3) | keep | keep |
| /exam/sbi-clerk | sbi clerk thumb impression size (110, 7) | `SBI Clerk Thumb Impression Size & Photo 2026` | keep |
| /exam/rbi-assistant, /exam/rbi-grade-b, /exam/nabard-grade-a, /exam/htet, /exam/reet, /exam/bihar-police-constable | `<short> photo size` (unknown) | template | template |

Metas for the live-photo and GA rows (all 140–160):
- ssc-cgl: `SSC CGL photo size 2026: no photo file, the form takes a live photo. Signature 472×157 px, 10–20 KB JPG. Resize the signature free on your phone, no upload.`
- ssc-chsl: `SSC CHSL photo and signature size 2026: the photo is captured live in the form; the signature is 472×157 px, 10–20 KB JPG. Resize free, nothing is uploaded.`
- ssc-cpo: `SSC CPO photo size 2026: no photo file, the form takes a live photo. Signature 472×157 px, 10–20 KB JPG. Resize the signature free on your phone, no upload.`
- ssc-mts: `SSC MTS photo size 2025: no photo file, the form takes a live photo. Signature 472×157 px, 10–20 KB JPG. Resize the signature free on your phone, no upload.`
- ssc-gd: `SSC GD photo size 2026: the photo is taken live in the form. Signature 709×236 px, 10–20 KB; thumb 10–30 KB JPG. Resize both free on your phone, no upload.`
- rrb-ntpc: `RRB NTPC photo and signature size 2026: photo captured live; signature min 140×60 px, 30–49 KB; SC/ST certificate PDF up to 399 KB. Resize free, no upload.`
- rrb-group-d: `RRB Group D photo size 2025: the photo is captured live. Signature min 140×60 px, 30–49 KB JPG; SC/ST certificate PDF up to 399 KB. Free, no upload.`
- rrb-alp: `RRB ALP photo size 2026: the photo is captured live. Signature min 140×60 px, 30–49 KB JPG; SC/ST certificate PDF up to 399 KB. Free, no upload.`

Extra FAQs per exam (answer only from preset/notice; skip a question if the preset has no answer):
- neet-ug: "Does NEET take a live photo? What if it does not match Aadhaar?"; "What is the NEET post card size photo?" (postcard facts already on the page; link /tools/postcard-size-photo).
- jee-main: "Does the JEE Main photo need name and date?" — answer only from the bulletin text; link /tools/name-date-on-photo.
- ibps-po: "Is there an IBPS PO photo resizer for 200×230 px, 20–50 KB?".
- nda/cds/upsc-cse: "Do I sign three times?" (from preset), "Typed or digital signature?".
- ugc-net ↔ csir-net: cross-link ("UGC NET photo size" / "CSIR NET photo size").

## 5. Exam-document pages (`/exam/<slug>/<doc>`)

Builders: `src/app/(en)/exam/[slug]/[document]/page.tsx`, `src/server/content/doc-insights.ts`,
labels in `src/content/seo/doc-title-labels.json`, copy keys `site.doc.*` in
`src/i18n/messages/en/site.json`.

### Template
- Primary: **`<short> <doc label> size`** (e.g. "ibps po signature size"). vol: unknown unless listed.
- Title: `<short> <Doc> Size: <spec>` (current pattern, keep).
- H1: `<short> <Doc> Size <cycle>` (current, keep; use short name: "RRB ALP SC/ST Certificate Size 2026", not "(Assistant Loco Pilot)").
- Meta: `<short> <doc> size <cycle>: <summary>. <one rule from preset>. Resize free on your phone; nothing is uploaded.` 140–160.
- Intro: `<Exam> asks for the <doc> as a <summary> file.` Handle "up to" wording (no "as up to 399 KB · PDF").
- Answer box between H1 and tool: Size | Format | Pixels/pages | Who uploads | Source (notice, page, checked date).
- At least 3 FAQs, document-specific, from preset rules/notes. Deadline FAQ only from `applyWindow`.
- "Other documents for <exam>" chip row under the tool; next-step button in the result panel.
- `/photo` children of jee-main and neet-ug do not use "photo size" (C3); `/signature` children own `<exam> signature size` (C1); `/thumb` children own `<exam> thumb impression size`; `/declaration` children own `<exam> handwritten declaration size` (FAQs: what to write, language, running hand vs capitals, ink colour, 800×400 px / 50–100 KB from preset).

### GA-winner overrides

**/exam/jee-main/class10** ★ (63 views / 9 users)
- Primary: **jee main 10th certificate size** (vol: unknown (SERP)). Secondary: jee main class 10 marksheet size, jee main 10th marksheet pdf size.
- Title: `JEE Main 10th Certificate Size: 50–300 KB PDF`
- H1: `JEE Main 10th Certificate Size 2026` (keep until the 2027 bulletin is verified; then cycle → 2027 from the preset).
- Meta: `JEE Main 10th certificate size 2026: one PDF of 50–300 KB with all pages of your Class 10 certificate or marksheet. Combine and resize free, no upload.`
- First sentence: `The JEE Main 10th certificate size is 50–300 KB, PDF, with every page of your Class 10 certificate or marksheet in one file.`
- FAQs: "Certificate or marksheet: which one do I upload?"; "How do I reduce my 10th marksheet PDF to 300 KB?"; "Why does the form say 'please upload a valid PDF'?" (renamed JPG, password-protected or damaged PDF — general file facts, not a notice claim); "My DigiLocker PDF is over 300 KB. Will compressing remove the digital signature?" (answer what the engine does: pages are redrawn, so an embedded digital signature is not kept; the printed content stays); "What if my PDF is under 50 KB?"; "Do I upload again for session 2?" (existing).
- Links: /exam/jee-main/photo, /exam/jee-main/signature, /tools/compress-pdf-to-300kb ("compress PDF to 300 KB").
- Freshness line: "Sizes from the JEE Main 2026 bulletin (page 10), checked 22 Oct 2026. We re-check when the 2027 bulletin is out."

**/exam/csir-net/result-awaited** ★ (21 / 16)
- Primary: **csir net result awaited form size** (unknown). Secondary: csir net result awaited (coverage audit), result awaited attestation form csir net, csir net result awaited certificate.
- Title: `CSIR NET Result Awaited Form Size: 50–300 KB`
- H1: `CSIR NET Result Awaited Form Size December 2026`
- Meta: `CSIR NET result awaited attestation form size, December 2026: one PDF of 50–300 KB with all pages. Combine and resize free on your phone; nothing is uploaded.`
- First sentence keeps "Joint CSIR-UGC NET December 2026".
- FAQs: "What is the result-awaited attestation form and who signs it?" (from preset notes); "Where do I get the form?" (bulletin annexure — only if the preset/bulletin says so); "I am in my final year. What do I upload?" (existing); "Can it be a JPG?" (preset: PDF only); "Older bulletins said 500 KB. Which limit is right?" — **publish only after re-reading the December 2026 bulletin page 7**; if it says 50–300 KB, say so and that older cycles differed.
- Siblings get the short name too: `CSIR NET Category Certificate Size: 50–300 KB`, `CSIR NET PwD Certificate Size: 50–300 KB`, `CSIR NET Photo Size: 10–200 KB`, `CSIR NET Signature Size: 10–50 KB`, `CSIR NET ID Proof Size: 10–200 KB`.

**/exam/rrb-ntpc/certificate** ★ (13 / 9)
- Primary: **rrb ntpc sc st certificate size** (unknown). Secondary: rrb sc st certificate free travel pass, rrb ntpc sc st certificate format.
- Title: `RRB NTPC SC/ST Certificate Size: Up to 399 KB`
- H1: `RRB NTPC SC/ST Certificate Size 2026 (Free Travel Pass)`
- Meta: `RRB NTPC SC/ST certificate size: one PDF up to 399 KB, needed only for the free travel pass. Combine pages and compress free on your phone, nothing uploaded.`
- FAQs: "Is the SC/ST certificate compulsory?" (only for the free travel pass, per preset label); "Which format?" (Annexure of the CEN — link sourceUrl; state the annexure number only after reading it); "Old FAQs say 500 KB. Which limit is right?" (CEN 06/2026 page 23: less than 400 KB); "Is 399 KB accepted where it says less than 400 KB?"; "Will my old certificate do?" (preset: latest valid certificate as on the closing date).
- Links: /tools/compress-pdf-to-400kb ("PDF compressor to 400 KB"), /exam/rrb-ntpc/signature.

**/exam/rrb-group-d/certificate**, **/exam/rrb-alp/certificate**
- Primaries: **rrb group d sc st certificate size**, **rrb alp sc st certificate size** (unknown). Preset confirms up to 399 KB PDF for both.
- Titles: `RRB Group D SC/ST Certificate Size: Up to 399 KB`, `RRB ALP SC/ST Certificate Size: Up to 399 KB`. H1s: `RRB Group D SC/ST Certificate Size 2025`, `RRB ALP SC/ST Certificate Size 2026`.
- Same FAQ set, exam-specific wording.

**/exam/<ssc|rrb>/signature** — primary `<short> signature size`; absorb the hub secondaries listed in section 3 (e.g. /exam/ssc-gd/signature adds "ssc gd signature size" (2.9K, 3); /exam/rrb-group-d/signature adds "rrb group d signature resize" (1.6K, 3)). Titles keep (`SSC CGL Signature Size: 472×157 px, 10–20 KB` etc.); RRB NTPC title shortens to `RRB NTPC Signature Size: min 140×60 px, 30–49 KB`.

**/exam/jee-main/photo**: primary **jee main photo resize** (unknown). Title `JEE Main Photo Resize: 10–200 KB JPG`; H1 `JEE Main Photo Resize 2026`.
**/exam/neet-ug/photo**: primary **neet photo resizer** (1K, 4) + neet photo resize (1K, 4). Title `NEET Photo Resizer: NEET UG Photo 10–200 KB`; H1 `NEET Photo Resizer 2026`.
**/exam/neet-ug/signature**: adds neet signature size (590, 3). **/exam/neet-ug/thumb**: adds thumb impression for neet (720, 22). **/exam/ibps-po/thumb**: adds thumb impression for ibps po (720, 17).

## 6. Tool pages (`/tools/<slug>`, copy in `src/content/tools/en/<slug>.json`)

### 6a. KB image variants `/tools/compress-image-to-<n>kb`
- Primary: **`<n> kb photo size`**. Title pattern (keep): `<n> KB Photo Size: Resize Image to <n> KB` / `Compress Photo to <n> KB`. H1 (keep): `<n> KB photo size: resize image to <n> KB`.
- Meta pattern: `Get the <n> KB photo size <use from presets>: a <0.9n>–<n> KB JPG made on your phone. <secondary phrase>. Free and never uploaded.` 140–160.
- Required H2s: `What <n> KB means in pixels`, `Exams that ask for <n> KB` (only exams whose preset limit fits; see seo-plan B4), `How to get a <n> KB photo`. FAQs: one per listed secondary.

| n | Primary (vol, KD) | Secondary (vol, KD) | Meta (only where it changes) |
|---|---|---|---|
| 5 | 5 kb photo size (1.9K, 17) | — | keep |
| 10 | 10 kb photo size (3.6K, 17) | resize image to 10kb (1K, 16) | keep |
| 15 | 15 kb photo size (5.4K, 19) | photo resize 15 kb (4.4K, 17), 15 kb photo size jpg (2.9K, 20), photo size reduce to 15 kb (1.3K, 21) | keep |
| 20 | 20 kb photo size (18.1K, 17) | photo 20 kb (3.6K), photo convert into 20 kb jpeg (2.9K), photo size reducer 20 kb (2.4K, 29), photo resize in 20 kb (1.9K), photo under 20 kb (1.3K), 20 kb photo size in pixels (720), what is the size of 20 kb photo (390) | keep; add FAQ "Is this a photo size reducer to 20 KB for signatures too?" |
| 25 | 25 kb photo size (1.9K, 17) | photo resizer 25 kb (590) | keep |
| 30 | 30 kb photo size (5.4K, 18) | 30 kb photo size jpg (3.6K), resize image to 30kb (2.4K), photo compressor 30 kb (1K) | keep |
| 35 | 35 kb photo size (1.6K, 14) | — | `Get the 35 KB photo size that lands mid-way in 20–50 KB and 30–49 KB rules: a 31.5–35 KB JPG made on your phone. Free, private and never uploaded anywhere.` |
| 40 | 40 kb photo size (4.4K, 19) | photo resize 40 kb (1.6K), photo convert into 40 kb jpg (1K), compress photo to 40 kb (590) | `Get the 40 KB photo size DSSSB uses for thumb impressions: a 36–40 KB JPG of any photo or print. Compress photo to 40 KB free on your phone, never uploaded.` |
| 45 | 45 kb photo size (1.9K, 19) | — | `Get the 45 KB photo size, the safe pick for RRB signatures capped at 49 KB: a 40.5–45 KB JPG made on your phone. Free, private and never uploaded anywhere.` |
| 50 | 50kb photo size (22.2K, 21) | resize image to 50kb (49.5K, 29), photo resizer 50kb (14.8K), image resizer 50kb (9.9K), photo convert into 50 kb (2.9K), photo resize 50 kb (2.4K), photo compressor 50 kb (2.4K), 50kb passport size photo (3.6K) | `Get the 50 KB photo size used by IBPS, SBI and RBI forms: a 45–50 KB JPG that keeps your face sharp. A free photo compressor 50 KB that never uploads.`; H2 `Photo convert into 50 KB in three steps` |
| 60, 80, 90 | (1.6K, 12) / (2.4K, 14) / (1.6K, 12) | — | keep |
| 70 | 70 kb photo size (1K, 17) | — | `Get the 70 KB photo size, a safe middle for 50–100 KB rules: a 63–70 KB JPG of your declaration, scan or photo. Free, made on your phone and never uploaded.` |
| 100 | 100 kb photo size (14.8K, 27) | resize image to 100kb (49.5K), 100 kb photo size jpg (8.1K), photo resize 100 kb (8.1K), photo convert into 100 kb (6.6K), photo under 100 kb (1.9K) | keep |
| 150 | 150 kb photo size (3.6K, 16) | photo compressor 150 kb (590) | keep |
| 200 | 200 kb photo size (9.9K, 21) | resize image to 200kb (9.9K, 22), 200 kb photo size jpg (3.6K) | `Get the 200 KB photo size for NTA, UPSC and defence forms: a detailed 180–200 KB JPG made on your phone. Resize image to 200 KB free, quick and never uploaded.` |
| 250, 350, 400, 500 | (1.6K, 13) / (1.9K, 15) / (2.9K, 17) / 500 kb photo size (5.4K, 21) | — | keep |
| 300 | 300kb photo size (6.6K, 22) | 300 kb photo size (2.9K, 21) | `Get the 300 KB photo size for the DSSSB postcard photo and document images: a 270–300 KB JPG made on your phone. Free, private and never uploaded anywhere.` |

### 6b. KB hub, ranges, MB, increase

| URL | Primary (vol, KD) | Secondary | Title / H1 / meta changes |
|---|---|---|---|
| /tools/compress-image | **photo size reducer in kb** (8.1K, 35), see 1a | photo resizer in kb (110K, 47), kb resizer (90.5K, 23), image to kb (8.1K), photo kb reduce (4.4K, 18), photo in kb size (880) | photo size converter in kb and kb converter photo moved to `/tools/photo-size-converter-in-kb` (1a) |
| /tools/compress-image-10kb-to-20kb | 10 kb to 20 kb photo size (1.3K, 10) | photo convert into 10 kb to 20 kb jpg (1K), 10 kb to 20 kb photo size in pixels (880) | keep; link to /tools/signature-resize with anchor "signature resize 10 to 20 KB" (C8) |
| /tools/compress-image-20kb-to-50kb | photo convert into 20 kb to 50 kb jpg (2.9K, 25) | 20 to 50 kb photo size (1.3K), 20 kb to 50 kb photo size (880) | keep |
| /tools/compress-image-50kb-to-100kb | photo compress 50 to 100 kb (6.6K, 29) | 50 to 100 kb photo size (1K), 50 to 150 kb photo size jpg (720) | keep |
| /tools/mb-to-kb-photo | photo mb to kb (14.8K, 21) | photo mb to kb convert (8.1K), mb to kb converter photo (6.6K), 2 mb photo size (22.2K), 1mb photo size (8.1K) | keep |
| /tools/increase-image-size-in-kb | **increase photo size in kb** (6.6K, 23), see 1a | increase image size in kb (27.1K, 23), increase kb of image (18.1K), kb increase (18.1K), photo kb increase (8.1K), image size increase in kb (6.6K), increase photo size in kb (6.6K), size increaser in kb (2.4K), how to increase photo size in kb (1.3K), signature kb increase (260) | Meta `Increase image size in KB to meet a form minimum, like 20 KB for IBPS photos. Pixels stay the same and the photo looks the same. Free; nothing is uploaded.`; FAQ "Is this a size increaser in KB for signatures too?" |

### 6c. Document and size tools

| URL | Primary (vol, KD) | Secondary | Changes |
|---|---|---|---|
| /tools/signature-resize | signature resize (12.1K, 18) | signature resize 10 to 20 kb (6.6K), signature size (5.4K, 8), signature compressor (4.4K), signature resize in kb (4.4K), signature resizer (4.4K), sign resizer in kb (4.4K), sign size reducer (2.9K), signature size reducer (2.9K), signature resize 20 kb (1.9K), 10kb to 20kb signature size (1.6K), signature size increase (1.3K), 140 x 60 pixels (1.6K), 6cm x 2cm in pixels (3.6K, 30), 6cm width and 2cm height in pixels (1K), signature resize 6cm x 2cm (590) | Keep title/H1/meta. Add H2 `Signature size reducer: bring a scan down to 10–20 KB`; FAQs "My signature is under 10 KB. How do I increase the signature size?" (→ /tools/increase-image-size-in-kb), "What is 6 cm width and 2 cm height in pixels?" (472 × 157 px at 200 DPI, as on the page). |
| /tools/thumb-impression | thumb impression (9.9K, 31) | left thumb impression (4.4K), left hand thumb impression (1.3K), thumb impression online (1K), thumb impression resize (480), thumb resizer (140) | keep |
| /tools/handwritten-declaration | declaration handwritten (12.1K, 25) | handwriting declaration (6.6K), handwritten declaration for ibps rrb (90.5K, 26) | keep; link to guide (C15) and /exams/ibps (C14). FCI terms not targeted (no FCI source). |
| /tools/name-date-on-photo | name and date on photo (9.9K, 7) | photo with name and date (9.9K), photo name and date (4.4K), add name and date in photo (3.6K), photo date editor (2.4K), passport size photo with name and date (1.6K), photo date and name (1.6K), add date to photo (1.3K), neet photo with name and date (390), tnpsc photo editor (3.6K — only if a TNPSC source is added; otherwise drop) | keep; link /exam/jee-main with anchor "JEE Main photo with name and date" (C6) |
| /tools/photo-3-5x4-5-cm | 3.5 cm x 4.5 cm (14.8K, 23) | 4.5 cm x 3.5 cm in pixels (8.1K), 3.5 cm x 4.5 cm in pixels (5.4K), 3.5 cm x 4.5 cm photo (2.4K), photo 3.5 x 4.5 cm (2.4K), 4.5 cm x 3.5 cm photo size online free (880), passport size photo size in cm (33.1K, 25), passport size photo in cm (6.6K, 20) | keep title/H1; FAQ "Is 4.5 cm x 3.5 cm the same photo size?" (same size, portrait). |
| /tools/passport-size-photo | passport size photo maker (301K, 37) | passport size photo (450K, 39), passport size photo dimensions in cm (8.1K), passport size photo pixels (5.4K), passport size photo width and height (4.4K), indian passport photo size in cm (2.4K), passport size photo 20 kb (720) | Title `Passport Size Photo Maker: Pixels, cm and KB`; H2 `Passport size photo dimensions in cm and pixels` (276 × 354 px at 200 DPI; 51 × 51 mm square, as on the page), link to /tools/photo-3-5x4-5-cm with anchor "3.5 cm x 4.5 cm photo" (C4). |
| /tools/postcard-size-photo | postcard size photo (14.8K, 24) | post card size photo (9.9K), post card photo size (3.6K), jpg to postcard size (2.4K), postcard size photo in cm (1.6K), postcard size photo dimensions (1K), postcard size photo maker (880) | keep; FAQ "Is post card size photo the same as postcard size?" (yes, 4 × 6 inch); link /exam/neet-ug "NEET postcard size photo" (C7). |
| /tools/stamp-size-photo | stamp size photo (22.2K, 18) | stamp size photo in cm (5.4K), stamp size photo size (5.4K), stamp size photo maker (1.6K) | keep |
| /tools/resize-image-in-cm | resize image in cm (27.1K, 29) | photo resizer in cm (9.9K), image dimension changer in cm (1.9K), image resize centimeters (1.3K), photo resizer in cm and kb (590) | Meta `Resize image in cm online: type width and height in centimetres, pick a DPI and an optional KB limit, and get exact pixels. Free, private, works offline.`; H2 `Photo resizer in cm and KB`; FAQ "Can I change image dimensions in cm without losing quality?" |
| /tools/resize-image-in-mm | resize image in mm (2.9K, 21) | image resizer in mm (2.9K), photo resizer in mm (2.9K) | Meta `Resize image in mm: enter width and height in millimetres, choose 200 or 300 DPI, and download a JPG or PNG with the exact pixels. Free; nothing is uploaded.`; H2 `Photo resizer in mm for forms and visas`; FAQ "Is this image resizer in mm accurate for printing?" |
| /tools/resize-image | resize image in pixels (unknown) | — | keep (general; must not use "in cm"/"in mm" in title lead) |
| /tools/passport-photo-sheet | passport photo sheet (unknown) | — | keep |
| /tools/convert-image | heic to jpg (unknown) | png to jpg | keep |
| /tools/batch-compress | batch compress images (unknown) | — | keep |
| /tools/custom-preset | — (noindex) | — | keep noindex |

### 6d. PDF tools

| URL | Primary (vol, KD) | Secondary | Changes |
|---|---|---|---|
| /tools/compress-pdf | pdf resize in kb (40.5K, 44) | pdf mb to kb converter (22.2K, 43), resize pdf in kb (18.1K, 43), pdf size increaser in kb (2.4K) | H2 `PDF MB to KB converter for exam forms`; FAQ "Can I increase a PDF size in KB?" — answer only what the tool does. |
| /tools/compress-pdf-to-50kb | pdf compressor 50 kb (2.9K, 27) | — | H1 `PDF compressor 50 KB: compress a PDF to 50 KB`; meta `PDF compressor 50 KB: shrink a one-page PDF to under 50 KB for forms with a tight document limit. The page is redrawn on your phone and never uploaded.` |
| /tools/compress-pdf-to-100kb | compress pdf to 100kb (110K, 39) | 100 kb pdf (14.8K), pdf resize 100 kb (9.9K) | keep |
| /tools/compress-pdf-to-150kb | 150 kb pdf (8.1K, 21) | pdf resize 150 kb (6.6K), pdf 150 kb (5.4K), compress pdf 150 kb (3.6K), pdf to 150 kb (2.4K) | keep |
| /tools/compress-pdf-to-200kb | 200 kb pdf (27.1K, 34) | reduce pdf size to 200kb (14.8K), pdf 200 kb converter (9.9K), pdf size reducer 200 kb (9.9K) | FAQ "Is this a PDF size reducer to 200 KB without a watermark?" |
| /tools/compress-pdf-to-250kb | 250 kb pdf (2.9K, 16) | compress pdf 250 kb (2.4K) | keep |
| /tools/compress-pdf-to-300kb | compress pdf 300 kb (33.1K, 35) | 300 kb pdf (12.1K) | keep; links to NTA certificate pages (jee-main/class10, neet-ug/class10, cuet-ug/certificate) |
| /tools/compress-pdf-to-400kb ★ | pdf compressor 400 kb (8.1K, 23) | 400 kb pdf (5.4K), pdf compressor to 400 kb (5.4K), compress pdf to 400kb | Title keep `PDF Compressor to 400 KB: RRB Certificate PDF, Free`; H1 `PDF compressor to 400 KB`; meta `PDF compressor to 400 KB for RRB NTPC, ALP and Group D SC/ST certificates, which must be under 400 KB. Pages are redrawn on your phone; nothing is uploaded.`; FAQ "My PDF got bigger after compressing. Why?"; links to the three RRB certificate pages (C13); "Exams with a 400 KB limit" lists RRB only. |
| /tools/compress-pdf-to-500kb | 500 kb pdf (27.1K, 30) | — | keep |
| /tools/images-to-pdf | image to pdf 100 kb (8.1K, 26) | photo to pdf 100 kb (3.6K) | keep (hub for JPG-to-PDF) |

JPG-to-PDF variants `/tools/jpg-to-pdf-under-<n>kb`: primary **`jpg to pdf <n> kb`**. H1 may stay `JPG to PDF under <n> KB`; intro starts `JPG to PDF <n> KB:`; title and meta must contain the exact phrase.

| n | Primary (vol, KD) | Secondary | Title (core) | Meta |
|---|---|---|---|---|
| 50 | jpg to pdf 50 kb (6.6K, 26) | — | `JPG to PDF 50 KB: One Certificate Page, Free` | `JPG to PDF 50 KB: turn one certificate photo into a PDF under 50 KB for forms with a tight limit. Pick A4 or original size; built on your phone, never uploaded.` |
| 100 | jpg to pdf 100 kb (12.1K, 35) | — | keep | `JPG to PDF 100 KB: turn photos into one PDF under 100 KB for forms, with page order and A4 or original size. Built on your phone or laptop, never uploaded.` |
| 150 | jpg to pdf 150 kb (6.6K, 23) | — | `JPG to PDF 150 KB: Combine 2–4 Pages, Free` | `JPG to PDF 150 KB: combine two to four document photos into one PDF under 150 KB. Reorder pages, pick A4 or original size; made on your phone, never uploaded.` |
| 200 | jpg to pdf 200 kb (12.1K, 33) | 200 kb photo size pdf (1.9K) | `JPG to PDF 200 KB: Photos to One PDF Under 200 KB` | `JPG to PDF 200 KB: merge document photos into one PDF under 200 KB. Set the page order, choose A4 or original size, and download. Nothing is uploaded.` |
| 300 | jpg to pdf 300 kb (27.1K, 23) | photo to pdf 300 kb (3.6K), 300 kb photo size pdf (2.4K) | keep | `JPG to PDF 300 KB: join photos into one PDF under 300 KB, the NTA certificate limit for NEET, JEE Main and CUET. Reorder pages, pick A4, never uploaded.` |
| 400 | jpg to pdf 400 kb (5.4K, 26) | — | `JPG to PDF 400 KB: Merge Certificate Photos, Free` | `JPG to PDF 400 KB: merge SC/ST certificate photos into one PDF under 400 KB for RRB NTPC, ALP and Group D. Reorder pages; made on your phone, never uploaded.` |
| 500 | jpg to pdf 500 kb (unknown) | 500 kb photo size pdf (1.9K) | `JPG to PDF 500 KB: Multi-Page Certificates, Free` | `JPG to PDF 500 KB: combine multi-page certificates into one PDF under 500 KB, the IBPS certificate limit. Reorder pages, pick A4, never uploaded anywhere.` |

## 7. ID documents

| URL | Primary | Notes |
|---|---|---|
| /id-documents | pan card photo and signature size (unknown) | keep title/H1/meta. |
| /id-documents/pan-card-photo-size | pan card photo size (unknown) | keep (3.5×2.5 cm, up to 20 KB as on the page). |
| /id-documents/pan-card-signature-size | pan card signature size (unknown) | keep; add /hi version (section 9). |

Out of scope until the owner decides: NSDL/UTI/Aadhaar pages (22 keywords, 151K/mo, KD 4–30).

## 8. Guides (English, `src/content/guides/en`)

| URL | Primary (vol, KD) | Notes |
|---|---|---|
| /guides/how-to-upload-photo-signature | how to upload photo and signature in online application form (720, 26) | sec. upload photo with signature (590, 11), signature upload size (320, 17). Linked from every `/exam/*/photo` and `/exam/*/signature` page. No hreflang (no Hindi translation). |
| /guides/combine-certificates-into-pdf-under-300kb | combine certificates into one pdf (unknown) | link to /tools/jpg-to-pdf-under-300kb with anchor "JPG to PDF 300 KB" (not compete). |
| /guides/handwritten-declaration-format | handwritten declaration format (unknown) | C15. |
| /guides/photo-size-kb-vs-pixels | photo size kb vs pixels (unknown) | must not answer "20 kb photo size in pixels" (owned by the 20 KB tool); link instead. |
| /guides/reduce-photo-size-to-20kb-on-mobile | reduce photo size to 20 kb on mobile (unknown) | link to /tools/compress-image-to-20kb with anchor "20 KB photo size". |
| /guides/live-photo-capture-ssc-rrb | ssc live photo capture (unknown) | linked from all live-photo exam hubs. |
| others (exam-form-checklist, jpg-vs-png-vs-pdf, photo-rejected-how-to-fix, scan-signature-with-phone, thumb-impression-for-exam-forms) | title topic, unknown | keep. |

## 9. Hindi pages (`/hi/...`)

Patterns (Devanagari + Latin exam names/units; vol: unknown (SERP) unless stated):
- Exam hubs `/hi/exam/<slug>`: primary `<short> फोटो साइज़`. Title `<short> फोटो साइज़ <cycle> और सिग्नेचर साइज़`; H1 same idea; live-photo exams add `लाइव फोटो`. Meta 140–160 code points from preset numbers.
- Hindi tools: primary is the Hindi form of the English primary (e.g. `/hi/tools/compress-image-to-20kb` → "20 KB फोटो साइज़"). Titles keep; lengthen metas under 140 (`/hi/tools/resize-image` 129, `/hi/tools/compress-pdf-to-500kb` 131, `/hi/tools/compress-image-to-100kb` 131, `/hi/tools/compress-image-to-30kb` 133).
- Hindi guide `/hi/guides/photo-ko-kb-me-kaise-kare`: primary **photo ko kb me kaise kare** (590, 17); sec. photo ka kb kaise kam kare (320, 22), photo ko kam kb me kaise kare (320, 23), photo par name (390, 18). Rename the H2 to `Photo ko kam KB me kaise kare, जब नीचे की लिमिट भी हो`. Linked from `/hi/tools/compress-image*` and `/hi/tools/resize-image`. Needs an OG image (seo-plan A1).
- Other Hindi guides: lengthen metas to 140–160 (currently 118–128 on exam-form-checklist, photo-size-kb-vs-pixels, jpg-vs-png-vs-pdf, combine-certificates…, reduce-photo-size…, thumb-impression…).
- Hindi exam hubs with short metas: bihar-police-constable 120, ctet 126, htet 128, iaf-agniveervayu 122, sbi-po 128.

New Hindi pages (seo-plan F2), only these with data in presets:
| New URL | Primary | Title (core) | H1 |
|---|---|---|---|
| /hi/exam/jee-main/class10 | JEE Main 10वीं सर्टिफिकेट साइज़ | `JEE Main 10वीं सर्टिफिकेट साइज़: 50–300 KB PDF` | `JEE Main 10वीं सर्टिफिकेट साइज़ 2026` |
| /hi/exam/rrb-ntpc/certificate | RRB NTPC SC/ST सर्टिफिकेट साइज़ | `RRB NTPC SC/ST सर्टिफिकेट साइज़: 399 KB तक` | `RRB NTPC SC/ST सर्टिफिकेट साइज़ 2026 (फ्री ट्रैवल पास)` |
| /hi/exam/csir-net | CSIR NET फोटो साइज़ | `CSIR NET फोटो साइज़ Dec 2026 और सिग्नेचर` | `CSIR NET फोटो साइज़ दिसंबर 2026 और सिग्नेचर साइज़` |
| /hi/exam/csir-net/result-awaited | CSIR NET result awaited फॉर्म साइज़ | `CSIR NET Result Awaited फॉर्म साइज़: 50–300 KB` | `CSIR NET Result Awaited फॉर्म साइज़ दिसंबर 2026` |
| /hi/id-documents/pan-card-signature-size | पैन कार्ड सिग्नेचर साइज़ | `पैन कार्ड सिग्नेचर साइज़: 2×4.5 cm, 10 KB तक` | `पैन कार्ड सिग्नेचर साइज़: 2×4.5 cm, 10 KB तक` |

## 10. Not targeted (needs a source or a decision first)

- Unpublished presets with demand: Indian Army Agniveer, UP Police, Rajasthan Police, MP Police, Haryana Police, KVS, BPSC TRE. Preset values disagree with most other sites (Agniveer 20–50 / 10–20 KB vs 10–20 / 5–10 KB elsewhere). Publish only after reading the official notice. Primaries when ready: agniveer photo size, up police photo size (+ Hindi forms).
- RRB NTPC Undergraduate (CEN 07/2026): new preset `rrb-ntpc-ug` only after reading the official annexure; never copy the Graduate preset.
- FCI, LIC, TNPSC, OJAS, CCC, IB ACIO; NSDL/UTI/Aadhaar.
- Accuracy checks before any copy repeats these numbers: CSIR NET result-awaited 50–300 KB vs 50–500 KB in older bulletins; RRB SC/ST certificate 399 KB vs 500 KB in older RRB FAQs; JEE Main 2027 bulletin (cycle bump).
