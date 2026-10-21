# SahiSize — Full Build Spec

> NOTE: This copy was pasted from chat and was truncated at ~50,000 characters, partway
> through Appendix A.9. Appendix A.10 (launch list of 35 exams) and A.11 (schema additions)
> are MISSING. See QUESTIONS.md for how the gaps were resolved.

Version 1.0 · 21 Oct 2026 · Owner: Illumin / ONERIQ SERVICES LLP

---

## 0. How to build this (instructions for Claude)

You are building a complete, production-ready website. Work like a small engineering team.

**Use subagents aggressively.** The work splits into independent workstreams (section 15). For each phase:

1. Use a **Plan** agent first to turn this spec into a task list and a file-level plan. Save it as `PLAN.md`.
2. Launch **parallel subagents**, one per workstream, in a single message so they run at the same time. Give each one: its section(s) of this spec, the files it owns, and the interfaces it must match (section 12.3). Agents must not edit files owned by another workstream.
3. After each phase, launch a **separate review agent** that has not seen the code being written. It checks the work against the acceptance criteria in this spec and runs the tests. Fix everything it finds before moving on.
4. Use **Explore** agents for codebase searches instead of reading many files yourself.
5. Use a **general-purpose** agent to re-verify exam presets against official notification PDFs before launch (section 8.4).

**Rules**

- Never upload a user's image or document to any server. All processing runs in the browser.
- Keep every page fast: under 300 KB of JavaScript + CSS before the tool is used.
- Mobile-first. Test at 360 px width first, then desktop.
- Write tests as you go (section 14). A feature is not done until its tests pass.
- Commit after each completed task with a clear message.
- If something in this spec is impossible or contradictory, write it in `QUESTIONS.md`, pick the safest option, and continue.

---

## 1. Product summary

**SahiSize** ("sahi size" = the right size) is a free website that prepares every document an Indian government exam or job form needs, so the upload is never rejected.

The user picks an exam (for example, IBPS PO, UP Police Constable, CTET). The site walks them through each document that form needs, one step at a time:

- Photograph (only for exams that still require an uploaded photo)
- Signature
- Left thumb impression
- Handwritten declaration
- Certificates combined into one PDF under a size limit

Each output file matches the exam's exact pixel size, KB range, format and DPI. A pass check confirms every rule before download. At the end, the user downloads all files as one ZIP.

Standalone tools cover the general searches: compress image to X KB, resize, convert format, images to PDF, compress PDF, passport photo sheet.

**Free for users.** No login. No pop-up ads. Revenue comes from a cross-promotion slot (English Setu by default) and affiliate links, configured in one file (section 10).

**Core promise:** "Right size, first time. Your photo never leaves your phone."

---

## 2. Users

| User | Context | Needs |
| --- | --- | --- |
| Exam aspirant (primary) | 18–30, budget Android, Chrome, mobile data, Hindi or English | Pick exam → all documents done in under 3 minutes |
| Cyber café / CSC operator | Desktop, fills many forms per day | Speed, custom sizes, batch tools |
| Student / job seeker | Phone or laptop, college, scholarship and private job forms | "Compress to X KB", resize, PDF |

Design for the weakest device: a ₹8,000 Android phone with 3 GB RAM on a slow 4G connection.

---

## 3. Brand

### 3.1 Name and voice

- Name: **SahiSize** (domain to be confirmed; keep the name in one config constant `SITE_NAME` so it can change).
- Tagline: **"Right size, first time."** Hindi: **"Pehli baar mein sahi size."**
- Voice: simple, friendly, Hinglish-aware. Short sentences. Name the actual numbers.
  - Good: "Photo 62 KB hai. IBPS ko 20–50 KB chahiye. **Auto-fit** dabayein."
  - Bad: "Your file does not meet the requirements."

### 3.2 Colors (define as CSS variables / Tailwind theme tokens)

| Token | Use | Light | Dark |
| --- | --- | --- | --- |
| `--color-primary` | Headers, links, trust | `#1E3A8A` navy | `#93B4FF` |
| `--color-action` | Main buttons (Upload, Auto-fit, Download) | `#F59E0B` saffron | `#FBBF24` |
| `--color-action-text` | Text on action buttons | `#0F172A` | `#0F172A` |
| `--color-success` | Pass ticks | `#16A34A` | `#4ADE80` |
| `--color-error` | Failed rules | `#DC2626` | `#F87171` |
| `--color-bg` | Page background | `#F8FAFC` | `#0B1220` |
| `--color-surface` | Cards | `#FFFFFF` | `#111A2E` |
| `--color-text` | Body text | `#0F172A` | `#E5E7EB` |
| `--color-muted` | Secondary text | `#475569` | `#94A3B8` |
| `--color-border` | Borders | `#E2E8F0` | `#1F2A44` |

All text/background pairs must pass WCAG AA contrast. Support dark mode via `prefers-color-scheme` plus a manual toggle.

### 3.3 Typography

- English: **Inter** (400, 600, 700). Hindi: **Noto Sans Devanagari** (400, 600).
- Self-host fonts as subset WOFF2 with `font-display: swap`. No Google Fonts requests at runtime.
- Base size 16 px, line height 1.5. Buttons at least 16 px text.

### 3.4 Logo

Icon: a passport-photo frame (rounded rectangle) with a check mark inside. Wordmark: **Sahi** in saffron, **Size** in navy. The icon alone is the favicon, PWA icon and social image mark.

Starter SVG (refine, but keep the idea):

```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" role="img" aria-label="SahiSize">
  <rect x="8" y="4" width="48" height="56" rx="8" fill="#1E3A8A"/>
  <rect x="14" y="10" width="36" height="44" rx="4" fill="#F8FAFC"/>
  <path d="M21 33l8 8 15-17" fill="none" stroke="#F59E0B" stroke-width="6"
        stroke-linecap="round" stroke-linejoin="round"/>
</svg>
```

Deliver: `logo.svg` (icon + wordmark), `icon.svg`, `favicon.ico`, PWA icons (192, 512, maskable), `og-default.png` (1200×630, generated at build time per page with exam name).

### 3.5 UI style

- Clean, card-based, generous spacing, 12 px radius, subtle borders, no heavy shadows.
- Icons: Lucide (tree-shaken, only the ones used).
- No stock photos. Illustrations are simple inline SVG.
- Never use any exam body's logo, emblem or colors as our branding. Exam names in text only.

---

## 4. Pages and routes

Static site. Every page is pre-rendered HTML; interactive tools hydrate as islands.

| Route | Purpose |
| --- | --- |
| `/` | Home: big exam search box, popular exams grid, "what do you need?" quick tools, trust line |
| `/exams` | All exams, grouped by body, with search and filter |
| `/exam/[slug]` | One page per exam: spec table, kit tool embedded, rejection tips, FAQ, official source |
| `/exam/[slug]/[document]` | One page per exam + document (e.g. `/exam/ibps-po/signature`) for long-tail SEO, tool pre-set to that document |
| `/kit/[slug]` | Full-screen kit flow (no distractions), reached from the exam page |
| `/tools/compress-image-to-[n]kb` | n ∈ 10, 20, 30, 50, 100, 200, 500 |
| `/tools/compress-image` | Custom target KB |
| `/tools/resize-image` | Pixels / cm / inches / DPI |
| `/tools/convert-image` | JPG ↔ PNG ↔ WebP, HEIC → JPG |
| `/tools/signature-resize` | Signature cleanup + size |
| `/tools/thumb-impression` | Thumb impression cleanup + size |
| `/tools/handwritten-declaration` | Declaration text generator + scan resize |
| `/tools/images-to-pdf` | Combine images into a PDF under X KB |
| `/tools/compress-pdf` | Reduce PDF to under X KB |
| `/tools/passport-photo-sheet` | Print sheet of 4/8/12/16 photos on A4 or 4×6 |
| `/tools/custom-preset` | Any width, height, min/max KB, DPI |
| `/guides` and `/guides/[slug]` | Articles (section 9.5) |
| `/sources` | Every preset with its official source PDF, page number and last-checked date |
| `/hi/...` | Hindi versions of home, exams index, top 30 exam pages, top tools, top guides |
| `/about`, `/privacy`, `/terms`, `/disclaimer`, `/contact` | Legal and trust pages |
| `/report` | "Report a wrong spec / upload rejected" form (mailto or a simple form service; no images attached) |
| `/404` | Helpful 404 with exam search |

---

## 5. Features and acceptance criteria

Priority: **P0** = required for launch, **P1** = launch if possible, otherwise within 4 weeks, **P2** = later.

### 5.1 Exam kit flow (P0) — the core product

Flow: **Choose exam → document list → for each document: upload → crop/clean → auto-fit → pass check → next → summary → download ZIP.**

| ID | Requirement | Pri |
| --- | --- | --- |
| K1 | Exam search with typo tolerance and Hindi/English names (e.g. "ibps po", "आईबीपीएस", "up police"). Grouped results by body. | P0 |
| K2 | Document checklist screen: shows every document the exam needs, with size rules in plain words, and which ones are done. User can do them in any order. | P0 |
| K3 | Upload from gallery, camera (`capture` attribute), or drag-and-drop. Accept JPG, PNG, WebP, HEIC/HEIF, PDF (for certificate step), up to 25 MB. | P0 |
| K4 | Crop screen: crop box locked to preset aspect ratio; pinch-zoom, drag, rotate 90°, fine rotate ±10°, flip. Photo: face guide overlay (oval + eye line). Signature/thumb: box guide showing that ink should fill ≥ 80% of the box. | P0 |
| K5 | Auto-fit to the exact preset: pixels, KB range, format, DPI (section 7.3). Runs automatically after crop. | P0 |
| K6 | Signature and thumb cleanup (section 7.4), on by default for those documents, with a toggle. | P0 |
| K7 | Pass check card: one row per rule (Width × Height, File size, Format, DPI, Background where checkable) with ✓ or ✗ and the actual vs required value. Download is disabled while any rule fails. | P0 |
| K8 | Output file names follow the preset (e.g. `photo.jpg`, `sign.jpg`, `thumb.jpg`, `decl.jpg`), max 10 characters if preset says so. | P0 |
| K9 | Progress bar: "Step 2 of 5: Signature". State persists in IndexedDB on the device so a page refresh does not lose work; "Start over" clears it. | P0 |
| K10 | Summary screen: thumbnails of all outputs with their KB, "Download all (ZIP)" and individual download buttons. On mobile, also "Share" via Web Share API where supported. | P0 |
| K11 | Name and date strip under the photo (for exams that require it): user types name and date, rendered in black on white below the face, inside the final pixel size. | P1 |
| K12 | Background to white: flood-fill from edges with tolerance slider, for plain backgrounds only. | P2 |
| K13 | Handwritten declaration generator: shows the exam's exact declaration text with name filled in, printable as a trace sheet (A4 PDF), then the scan goes through the normal resize step. | P1 |
| K14 | Certificates step: images or PDFs combined into one PDF under the preset KB cap (section 7.6). | P1 |
| K15 | "Did the portal accept it?" prompt on the next visit (stored locally): Yes / No / Didn't try. A "No" opens the report form with exam and document pre-filled. Send as an analytics event only. | P1 |
| K16 | Rejection guidance: for each exam, a list of real portal error messages and what each one means, with the fix. | P1 |

**Acceptance:** On a mid-range Android phone (or Chrome DevTools with 4× CPU slowdown + Fast 4G), a user completes a 4-document IBPS kit in under 3 minutes of interaction, and each auto-fit finishes in under 2 seconds.

### 5.2 Standalone tools (P0 unless noted)

| ID | Tool | Requirement |
| --- | --- | --- |
| T1 | Compress to X KB | Presets 10–500 KB + custom. Output lands within [target − 10%, target]. Optional min KB. Optional keep dimensions or allow downscale. |
| T2 | Resize | Pixels, cm, mm, inches with DPI. Lock aspect ratio toggle. |
| T3 | Convert | JPG, PNG, WebP output. HEIC input. |
| T4 | Signature resize | K4 + K6 + any KB range. |
| T5 | Thumb impression | K4 + K6 + any KB range. |
| T6 | Images to PDF | Up to 20 images, reorder by drag, A4 or original size, target max KB. (P1) |
| T7 | Compress PDF | Re-render image-heavy PDFs at lower quality to reach max KB; text-only PDFs report "already small". (P1) |
| T8 | Passport photo sheet | 4/8/12/16 copies, A4 or 4×6 in, 300 DPI, cut lines. (P2) |
| T9 | Batch compress | Up to 20 images to the same target, ZIP download. (P1) |
| T10 | Custom preset | Any width, height, min KB, max KB, DPI, format; shareable URL with parameters (e.g. `/tools/custom-preset?w=200&h=230&min=20&max=50`). |

Every tool page shows the same pass check (K7) for the user's chosen rules.

### 5.3 Trust features (P0)

- Line beside every upload control: "Aapki file aapke phone mein hi rehti hai — kabhi upload nahi hoti." / "Processed on your device. Never uploaded."
- Works offline after first visit (PWA) — this also proves the privacy claim.
- Every exam spec table shows: notification name and year, official source link (PDF + page), "last checked" date.
- `/sources` page lists all of them.

### 5.4 Out of scope

User accounts, cloud storage, AI background removal, face detection models, video tools, native app, auto-filling or submitting government portals.

---

## 6. Screen-by-screen UX

### 6.1 Global

- Header: logo, exam search (icon on mobile, expands), language toggle (EN / हिं), theme toggle.
- Footer: tools list, top exams, guides, legal links, "Not affiliated with any government body."
- One primary action per screen, in saffron, in the thumb zone (bottom on mobile, sticky).
- Touch targets ≥ 48 × 48 px.
- Loading states: skeletons, never blank screens. Long tasks show a progress bar.
- Errors: plain words + the numbers + one button to fix it.
- No modal pop-ups except confirm "Start over?".

### 6.2 Home

1. Hero: "Exam form ke photo, signature, sab — sahi size mein." + large search box ("Search your exam: IBPS PO, UP Police, CTET…").
2. Popular exams grid (12 cards, ordered by current application season — driven by `presets/season.json`).
3. Quick tools row: Compress to 20 KB, 50 KB, Signature, Images to PDF.
4. "How it works" — 3 steps with icons.
5. Trust strip: On-device · Free · Official specs · Works offline.
6. FAQ (5 questions).

### 6.3 Exam page `/exam/[slug]`

1. H1: "IBPS PO 2026 Photo, Signature & Thumb Size — Resize Free".
2. Notice badge: "Specs from IBPS CRP PO/MT-XVI notification · checked 12 Oct 2026 · Source".
3. Spec table (document, size in px/cm, KB range, format, DPI, rules).
4. Big button: "Start kit (5 documents)" → `/kit/[slug]`. Plus per-document buttons.
5. Rejection tips and real portal error messages.
6. Handwritten declaration text (for exams that need one).
7. FAQ (exam-specific, 5–8 Q&A).
8. Related exams.
9. Promo slot (section 10), placed after the tool, never inside it.

### 6.4 Kit flow `/kit/[slug]`

Full-screen, minimal header (back, exam name, step count).

- **Checklist screen**: list of document cards (icon, name, rule summary, status: To do / Done ✓). Tap a card to start.
- **Upload screen**: two big buttons — "Take photo" and "Choose from gallery" — plus drag-and-drop zone on desktop. Short tip for this document (e.g. "Sign on white paper with a black pen. Fill the box.").
- **Crop screen**: image with locked crop box and guide overlay; controls below: zoom slider, rotate, flip, "Clean signature" toggle (signature/thumb). Primary button: "Auto-fit".
- **Result screen**: before/after preview at real size and zoomed; live meter (px, KB); pass check card; buttons: "Looks good — Next" (primary), "Adjust crop", "Download this file".
- **Summary screen**: all files, sizes, ticks, "Download all (ZIP)", "Share", and the promo slot underneath.

### 6.5 Tool pages

Same upload → adjust → result pattern on one page. Settings panel (target KB, size, format) above the result. Spec explanation, how-to and FAQ below the tool for SEO.

---

## 7. Processing engine (browser only)

Everything runs in a **Web Worker** so the UI never freezes. The engine is a pure TypeScript module with no UI imports, fully unit-tested.

### 7.1 Input decode

- JPG, PNG, WebP: `createImageBitmap` with `imageOrientation: 'from-image'` (EXIF rotation applied).
- HEIC/HEIF: try native decode first (Safari). If it fails, lazy-load a WASM HEIC decoder (`libheif-js` or `heic2any`) only when needed.
- PDF input (certificate step): lazy-load `pdfjs-dist` to rasterize pages.
- Downscale very large inputs to max 4000 px on the long side immediately, to protect memory on weak phones.

### 7.2 Resize

- Resample with a high-quality filter (Lanczos3 via `@jsquash/resize` WASM, fallback: stepwise halving on OffscreenCanvas).
- Output exactly `width_px × height_px` from the preset, after the user's crop.
- If the preset gives cm/mm, convert using the preset DPI (default 200 if unstated) and store the pixel result in the preset.

### 7.3 Auto-fit to KB range — the key algorithm

Inputs: image (already at target pixels), `minKB`, `maxKB`, format (JPEG unless preset says PNG).
Encoder: MozJPEG via `@jsquash/jpeg` (WASM), baseline (not progressive — some portals reject progressive JPEGs), 4:2:0 chroma subsampling, strip all metadata except JFIF.

```
1. Encode at q = 90. If size within [min, max] → done.
2. If size > max: binary search q in [5, 90] (max 8 iterations), pick the HIGHEST q with size ≤ max.
   If size at q = 5 is still > max: downscale is NOT allowed when preset pixels are fixed →
     reduce detail with a mild blur (sigma 0.5 → 1.5) and retry; if still failing, report a clear error.
     If preset allows a pixel range, step pixels down 5% at a time within the range.
3. If size < min: binary search q in [90, 100] for the LOWEST q with size ≥ min.
4. If still < min at q = 100 (common for small, plain images like 140×60 signatures):
   a. "Grain" stage: add very low-amplitude noise (±1–2 levels, seeded, invisible to the eye) and re-encode at q = 95–100.
      Repeat with slightly stronger noise up to ±4 levels.
   b. If still < min: pad the file with a JPEG COM (comment) segment inserted right after the APP0/JFIF segment,
      sized to reach (min + max) / 2. A COM segment holds max 65,533 bytes; add more segments if needed.
      This does not change any pixel and every decoder ignores it.
5. Set DPI (7.5).
6. Verify: decode the final bytes, check exact width/height, re-measure size, check format magic bytes.
   Only then report pass.
```

Report which stages ran (for analytics: `fit_stage`), so we learn how often padding is needed.

Size unit: **1 KB = 1024 bytes** by default; check both 1000 and 1024 against the range and warn if the file passes only under one of them. Aim for the middle of the range to be safe under either reading.

**Acceptance:** on the generated test corpus (section 14.2), 100% of outputs pass pixels + format, and ≥ 99.5% land inside the KB range using the 1024 definition, each in under 2 s with 4× CPU throttle.

### 7.4 Signature and thumb cleanup

Order matters:

1. Convert to grayscale (keep a color path for blue-ink thumb impressions).
2. **Illumination correction**: estimate background with a large blur (or morphological closing), divide the image by it — removes phone-camera shadows and uneven light.
3. **Threshold**: adaptive (Sauvola or Otsu on the corrected image), with a strength slider.
4. **Crop to ink**: bounding box of ink pixels + 8% padding; then fit into the preset aspect ratio, centered, so the ink fills ≥ 80% of the box width.
5. **White background**: background pixels set to pure white; ink kept dark (black, or blue for thumb if the user chooses).
6. Light despeckle to remove dust dots.

Implement on OffscreenCanvas / typed arrays (no OpenCV — too heavy). Target: < 400 ms for a 12 MP phone photo after downscale.

### 7.5 DPI

Write DPI into the JFIF APP0 header: density units = 1 (dots per inch), X and Y density = preset DPI. Implement as a byte-level patch that walks JPEG markers safely (do not assume APP0 is at a fixed offset; insert one if missing). If the preset gives no DPI, write 200 DPI only for documents whose size is given in cm/mm; otherwise leave the encoder default.

### 7.6 PDF

- Images to PDF: `pdf-lib`. Each image JPEG-encoded, placed on A4 (fit with margins) or original size. If the total exceeds max KB, lower JPEG quality and/or scale images in steps until it fits; report if impossible.
- Compress PDF: rasterize pages with `pdfjs-dist` at 150 → 100 → 72 DPI, re-encode as JPEG pages into a new PDF until under max KB. Warn that text becomes an image.

### 7.7 ZIP

Use `fflate` (small, fast). File names from the preset. Include a small `README.txt` with the exam name, each file's size, and the source of the specs.

### 7.8 Engine API (used by all UI)

```ts
type DocType = 'photo' | 'signature' | 'thumb' | 'declaration' | 'certificate' | 'other';

interface DocSpec {
  doc: DocType;
  label: { en: string; hi: string };
  widthPx: number | null;  heightPx: number | null;   // null = keep aspect, use limits below
  minWidthPx?: number; maxWidthPx?: number; minHeightPx?: number; maxHeightPx?: number;
  minKB: number | null;  maxKB: number;
  format: 'jpg' | 'png' | 'pdf';
  dpi: number | null;
  fileName: string;           // e.g. "photo.jpg"
  maxFileNameChars?: number;
  rules: { en: string; hi: string }[];   // human rules: background, ink colour, etc.
  needsNameDateStrip?: boolean;
  cleanup?: 'signature' | 'thumb' | null;
}

interface FitResult {
  bytes: Uint8Array; widthPx: number; heightPx: number; sizeBytes: number;
  quality: number; stages: ('encode'|'search'|'blur'|'grain'|'pad'|'dpi')[];
  checks: { rule: string; pass: boolean; actual: string; required: string }[];
}

decode(file: File): Promise<ImageBitmap>
crop(img, rect, rotationDeg, flip): Promise<ImageBitmap>
cleanup(img, kind: 'signature'|'thumb', opts): Promise<ImageBitmap>
fit(img, spec: DocSpec): Promise<FitResult>
imagesToPdf(files, opts): Promise<Uint8Array>
compressPdf(file, maxKB): Promise<Uint8Array>
zip(files: {name: string; bytes: Uint8Array}[]): Promise<Uint8Array>
```

Expose via `comlink` to the Web Worker.

---

## 8. Exam presets (data)

### 8.1 Storage

One JSON file per exam in `src/content/presets/[slug].json`, validated at build time with a Zod schema (build fails on invalid data). No code change is needed to add or update an exam.

### 8.2 Schema

```json
{
  "slug": "ibps-po",
  "name": { "en": "IBPS PO", "hi": "आईबीपीएस पीओ" },
  "aliases": ["ibps probationary officer", "crp po"],
  "body": "IBPS",
  "group": "banking",            // banking | ssc | railway | nta | upsc | teaching | police | state-psc | defence | other
  "cycle": "2026",
  "notification": "CRP PO/MT-XVI",
  "sourceUrl": "https://...pdf",
  "sourcePage": 14,
  "lastChecked": "2026-10-12",
  "checkedBy": "name",
  "liveCaptureAlso": true,
  "photoUploadReplacedByLive": false,
  "seasonMonths": [7, 8],
  "documents": [ /* DocSpec[] from 7.8 */ ],
  "declarationText": { "en": "I, _______ (Name of the candidate), hereby declare ..." },
  "rejectionTips": [ { "error": "Invalid file size", "fix": { "en": "...", "hi": "..." } } ],
  "faq": [ { "q": { "en": "...", "hi": "..." }, "a": { "en": "...", "hi": "..." } } ],
  "related": ["ibps-clerk", "sbi-po"]
}
```

### 8.3 Launch set (35 exams)

The exact list is in **Appendix A.10**, with all sizes in A.2–A.9. Exams that still require a photo upload (banking, NTA, UPSC, teaching, state PSC) get the full kit. For SSC and RRB, the photo is captured live in the form, so their pages lead with **signature** and certificates, and say clearly that the photo is taken live.

Only high- and medium-confidence exams publish at launch. Low-confidence ones are built with `published: false` and go live after a person checks the official PDF. Apply the schema additions in **A.11**.

### 8.4 Spec maintenance

- `npm run presets:check` lists presets whose `lastChecked` is older than 120 days or whose `seasonMonths` start within 30 days.
- Before launch, run a **general-purpose agent per exam group** to re-verify each preset against the official notification PDF and update `sourceUrl`, `sourcePage`, `lastChecked`.
- The `/report` form and K15 feedback feed this process.

---

## 9. SEO

### 9.1 Technical

- Every route pre-rendered with unique `<title>`, meta description, canonical, Open Graph and Twitter tags, and an auto-generated OG image (exam name + "Photo & Signature Size").
- `hreflang` pairs for `en-IN` and `hi-IN` pages.
- `sitemap.xml` (split by type), `robots.txt`.
- Structured data (JSON-LD): `WebApplication` on tools, `HowTo` + `FAQPage` on exam and tool pages, `BreadcrumbList` everywhere, `Article` on guides, `Organization` on home.
- Clean URLs, lowercase, hyphenated. No query-string pages indexed except none (custom preset pages are `noindex`).
- Core Web Vitals: LCP < 2.0 s, CLS < 0.05, INP < 200 ms on mobile. Lighthouse ≥ 95 for Performance, SEO, Accessibility, Best Practices.
- Internal links: every exam page links to related exams, its document pages, and the relevant tools; every tool page links to the top exams that use it.

### 9.2 Title and description templates

- Exam: `{Exam} {Cycle} Photo, Signature & Thumb Size — Resize Free in 1 Click | SahiSize`
- Exam document: `{Exam} {Document} Size {Cycle}: {px}, {min}–{max} KB — Resize Free`
- Compress: `Compress Photo to {n} KB Online Free — Exact Size, No Upload`
- Hindi: `{Exam} फोटो और सिग्नेचर साइज़ {Cycle} — फ्री में सही साइज़ करें`

### 9.3 Keyword targets

Exam + document ("ibps po signature size"), exact KB ("photo 20 kb", "signature 10 to 20 kb"), problems ("photo upload error", "image size too large"), Hindi/Hinglish ("photo ka size kam kaise kare", "signature kb kaise kare"). Avoid competing on "image compressor".

### 9.4 Page content rules

- Spec table near the top, with year and source link.
- 400–900 words of genuinely useful content per exam page (rules, tips, FAQ), written per exam — no spun duplicates.
- Update exam pages before each notification season (`seasonMonths`).

### 9.5 Guides at launch (10)

1. Why your photo got rejected (and how to fix it)
2. How to scan your signature with a phone
3. Photo size in KB vs pixels — simple explanation
4. How to make a thumb impression for exam forms
5. Handwritten declaration: format and how to write it
6. How to reduce photo size to 20 KB on mobile
7. How to combine certificates into one PDF under 300 KB
8. Live photo capture in SSC and RRB forms — what to do
9. JPG vs PNG vs PDF for government forms
10. Exam form checklist: documents you need before you start

Write each in English and Hindi. Content as Markdown/MDX in `src/content/guides/`.

---

## 10. Monetization (config-driven)

All in `src/config/monetization.ts`, so it can change without code edits.

- **Promo slot** (default on): one card shown on the kit summary screen and below tools — "Interview aur job ke liye English improve karein — English Setu" linking with UTM tags (`utm_source=sahisize&utm_medium=promo&utm_campaign={exam-slug}`). Text, link and on/off per exam group are configurable.
- **Affiliate slot** (default off): optional test-series or book links per exam group.
- **Ads** (default off): if turned on later, max 2 slots per page, below the tool and in the footer only, lazy-loaded after the tool is interactive. Never inside the upload, crop, result or download area. Never pop-ups, interstitials or auto-play.
- Analytics event on each promo/affiliate click.

---

## 11. Analytics, privacy, legal

### 11.1 Analytics

Privacy-friendly, cookie-less analytics (Plausible, Umami or Cloudflare Web Analytics; configurable). Events only — never images, never file names, never user-typed names.

Events: `exam_selected`, `kit_started`, `doc_uploaded` (doc type, input format, input KB bucket), `fit_done` (doc, pass/fail, stages, duration ms), `doc_downloaded`, `kit_zip_downloaded`, `tool_used` (tool, target), `portal_feedback` (yes/no/skip), `promo_click`, `error` (code).

### 11.2 Legal pages

- Privacy policy (DPDP Act 2023 aware): no files leave the device; analytics are anonymous; what the report form collects.
- Terms of use and disclaimer: "Specs are taken from official notifications. Always check the latest notice. Not affiliated with any exam body or government."
- Operating entity name in footer: configurable constant.

### 11.3 Security

- Strict Content Security Policy (no inline scripts except hashed JSON-LD; `worker-src 'self' blob:`; `wasm-unsafe-eval` only as required).
- No third-party scripts on tool pages except the analytics script.
- Subresource integrity where any external asset is used (prefer none).

---

## 12. Tech stack and structure

### 12.1 Stack

| Layer | Choice |
| --- | --- |
| Framework | **Astro** (static output) with **Preact** islands, TypeScript strict |
| Styling | Tailwind CSS with the tokens from 3.2 |
| i18n | Astro i18n routing (`/` = English, `/hi/` = Hindi); UI strings in `src/i18n/{en,hi}.json` |
| Image engine | `@jsquash/jpeg`, `@jsquash/png`, `@jsquash/webp`, `@jsquash/resize` (WASM) in a Web Worker via `comlink` |
| HEIC | Native first, lazy `libheif-js` fallback |
| PDF | `pdf-lib` (write), `pdfjs-dist` (read/rasterize), both lazy-loaded |
| ZIP | `fflate` |
| Crop UI | Custom Preact component on canvas with pointer events (pinch, drag), or `cropperjs` if faster to ship |
| Local state | IndexedDB via `idb-keyval` |
| Validation | Zod (presets, content) |
| PWA | `vite-plugin-pwa` / Workbox: precache app shell, worker and WASM; runtime cache for pages |
| Tests | Vitest (engine, unit), Playwright (e2e, mobile emulation), Lighthouse CI |
| Hosting | Cloudflare Pages (free tier), GitHub Actions for CI |

### 12.2 Repository layout

```
/src
  /engine          decode, crop, cleanup, fit, dpi, pdf, zip, worker.ts, api.ts   (Workstream A)
  /components      Uploader, Cropper, PassCheck, KbMeter, StepProgress, DocCard, ...  (Workstream B)
  /islands         KitFlow, ToolCompress, ToolResize, ToolPdf, ...                   (Workstream B)
  /layouts         Base, Exam, Tool, Guide                                           (Workstream C)
  /pages           routes from section 4 (en + /hi)                                  (Workstream C)
  /content
    /presets       *.json + schema.ts                                                (Workstream D)
    /guides        *.mdx (en, hi)                                                    (Workstream E)
  /i18n            en.json, hi.json                                                  (Workstream B/C)
  /config          site.ts, monetization.ts, analytics.ts                            (Workstream C)
  /seo             meta.ts, jsonld.ts, og-image.ts                                   (Workstream C)
/public            icons, fonts, logo, manifest
/tests
  /engine          Vitest + corpus
  /e2e             Playwright
/scripts           presets-check.ts, make-test-corpus.ts
```

### 12.3 Interfaces between workstreams

- Engine API exactly as in 7.8 — Workstream B only calls `src/engine/api.ts`.
- Presets typed by `src/content/presets/schema.ts` — B, C and D import the inferred types.
- i18n keys: B and C add keys to `en.json` and `hi.json` only through a shared `KEYS.md` list to avoid collisions.

---

## 13. Quality bars

- **Performance**: JS + CSS on first load ≤ 120 KB gzipped on exam/tool pages; engine WASM loads only when the user picks a file (then cached). Total page weight before tool use ≤ 300 KB.
- **Browsers**: Chrome Android 90+, Samsung Internet, Safari iOS 15+, desktop Chrome/Edge/Firefox/Safari latest 2.
- **Accessibility**: WCAG 2.1 AA; all controls labelled; keyboard-operable on desktop; focus visible; status changes announced via `aria-live`.
- **Memory**: no crash on a 12 MP photo with 3 GB RAM devices (downscale early, release bitmaps with `close()`).
- **Offline**: after one visit, all tools and kit flows work with network off.

---

## 14. Testing

### 14.1 Unit (Vitest)

- `fit()` against every preset in `presets/` with the corpus below: assert exact pixels, KB range, JPEG baseline, DPI value in JFIF header, valid decode.
- DPI patch: JPEGs with and without APP0, with EXIF, with existing COM segments.
- Padding: output decodes identically (pixel hash) before and after padding.
- Cleanup: synthetic signature images with shadow gradients → ink coverage ≥ 80% of box, background ≥ 98% pure white.
- PDF: output under max KB, page count correct.

### 14.2 Test corpus

`scripts/make-test-corpus.ts` generates ≥ 300 images: photos (faces from synthetic shapes/noise, various sizes 0.3–12 MP, JPG/PNG/WebP), signatures (thin and thick strokes on white, grey, shadowed paper), thumbs, near-blank images (hardest for min KB), very detailed images (hardest for max KB), rotated EXIF images. Add 20 real sample photos to `tests/fixtures/` (team members, with consent).

### 14.3 End-to-end (Playwright)

- Mobile emulation (Pixel 5 profile, CPU 4× slowdown): full IBPS PO kit → ZIP downloaded → unzip and verify every file against the preset.
- Each tool page: upload fixture → result passes → download.
- Hindi pages render Devanagari and switch back to English.
- Offline: load once, go offline, complete a compress task.
- No network request contains image bytes (assert via request interception).

### 14.4 CI

GitHub Actions: typecheck, lint, unit, e2e, Lighthouse CI (budgets from section 13), preset schema validation, broken-link check. Block merge on failure.

---

## 15. Agent build plan

Run phases in order. Inside each phase, launch the listed subagents **in parallel**.

### Phase 1 — Foundation (sequential, 1 agent)
- Scaffold Astro + Preact + Tailwind + TS strict, theme tokens, fonts, layouts skeleton, CI, PWA shell, folder layout from 12.2, engine API stubs (7.8), preset schema (8.2), i18n files.
- **Review agent**: builds, lints, Lighthouse on empty pages.

### Phase 2 — Core (parallel)
- **Agent A — Engine**: sections 7.1–7.8 + unit tests + test corpus script.
- **Agent B — UI components and islands**: section 6 components (Uploader, Cropper with guides, PassCheck, KbMeter, StepProgress, DocCard), KitFlow island against the engine API stubs, IndexedDB state.
- **Agent C — Site, pages, SEO**: routes from section 4, layouts, meta/JSON-LD/OG images/sitemap/hreflang, home, exams index, exam page template, tool page template, legal pages, monetization config.
- **Agent D — Presets**: convert Appendix A to preset JSON files, write declaration texts, rejection tips, FAQ per exam; `presets:check` script; `/sources` page data.
- **Review agent** (fresh): integration check, every acceptance criterion in sections 5 and 7, full test run.

### Phase 3 — Tools and content (parallel)
- **Agent E — Guides**: 10 guides in English and Hindi (section 9.5).
- **Agent F — Standalone tools**: T1–T10 islands and pages using the shared engine.
- **Agent G — Hindi**: translate UI strings and the top 30 exam pages; natural Hinglish-aware Hindi, not literal translation.
- **Agent H — QA**: Playwright suites (14.3), accessibility audit (axe), performance budgets, offline test.
- **Review agent** (fresh).

### Phase 4 — Launch prep (parallel)
- **Preset verification agents** (one per exam group): re-check every preset against the official PDF (8.4).
- **Security agent**: CSP, headers (`_headers` for Cloudflare Pages), dependency audit.
- **Final review agent**: walk through every route on mobile emulation, compare with this spec, produce `LAUNCH_CHECKLIST.md` with anything not done.

---

## 16. Definition of done

- [ ] All P0 items in section 5 work and pass their acceptance criteria.
- [ ] 35 exam presets live (Appendix A.10), each with source + last-checked date; low-confidence ones built but hidden.
- [ ] All tests and Lighthouse budgets pass in CI.
- [ ] Works offline after first visit; no request ever carries image bytes.
- [ ] English and Hindi versions of the top pages.
- [ ] 10 guides published.
- [ ] Privacy, terms, disclaimer, about, contact pages live.
- [ ] Deployed to Cloudflare Pages with the production domain, sitemap submitted to Google Search Console.

---

## Appendix A — Exam preset seed data

Researched 21 Oct 2026 from 2025–2026 notifications. **Confidence**: H = read from the official notice; M = reputable secondary source or a copy of the official notice; L = resizer/blog sites only, or sources conflict. Workstream D turns these into preset JSON. **Only H and M exams go live at launch.** L exams are built but hidden (`published: false`) until a person checks the official PDF.

"1 KB = 1024 bytes" unless a notice says otherwise. Where px is "—", the notice gives only a KB range: keep the user's crop aspect and do not force pixels (`widthPx: null`).

### A.1 What the research changed in the product

- **Signature is the universal document.** SSC and RRB (the biggest exams) no longer accept an uploaded photo — it is captured live — but every exam still needs a signature.
- **Many exams give only KB limits, no pixels** (all NTA exams, CTET, REET, HTET). The engine must support KB-only presets.
- **Pixel ranges, not fixed sizes**, for some: RRB signature is a *minimum* 140×60 px; UPSC signature is 350–500 px square. Use `minWidthPx/maxWidthPx` etc.
- **Special signature formats** need their own guidance screens:
  - Bihar CSBC and BPSC: **two signatures** — one in Hindi, one in English (two separate uploads).
  - UPSC (CSE, NDA, CDS): **sign three times**, one below another, in one image.
- **Text on the photo**: MPPSC, Haryana HSSC, HPSC, UKPSC want name + date printed on the photo (K11). IAF Agniveervayu wants the candidate holding a slate with name and date — show it as a capture tip, not a generated strip.
- **Conflicts inside notices** are common (NEET thumb 10–200 vs 50–300 KB; MPPSC advt 25–200 KB vs portal 20–100 KB; SSC CPO signature 6.0 vs 4.0 cm). Rule: **target the overlap of both ranges** and show a note "Notice says X, portal accepts Y — we target the safe overlap."
- **Certificates as PDF** are now common (NTA 50–300 KB each; RRB SC/ST certificate < 400 KB) — K14 is important.

### A.2 Banking (all run on the same IBPS-style portal; SBI values are official)

| Exam | Photo | Signature | Left thumb | Handwritten declaration | Conf | Source |
| --- | --- | --- | --- | --- | --- | --- |
| SBI Clerk (JA) 2026 | 200×230, 20–50 KB | 140×60, 10–20 KB | 240×240, 20–50 KB | 800×400, 50–100 KB | H | [SBI JA 2026 advt](https://sbi.bank.in/webfiles/uploads/files_2627/08/JA_2026_Detailed_Advt_Eng.pdf) |
| SBI PO 2025 | same | same | same | same | H | [SBI PO 2025 advt](https://sbi.bank.in/documents/77530/52947104/1_Detailed_Adv.2025_23.06.2025.pdf/54ca0942-3de1-afc4-45e8-f679fc552e7b?t=1750741324277) |
| IBPS PO 2026 | same | same | same | same | M | [IBPS PO notification copy](https://www.practicemock.com/pricing/marketing/files/pdf/ibps-po-notification-2026-pdf.pdf) |
| IBPS Clerk 2026 | same | same | same | same | M | [Careerpower](https://www.careerpower.in/blog/ibps-clerk-image-resizer) |
| IBPS RRB Officer Scale I 2026 | same | same | same | same | M | [Careerpower](https://www.careerpower.in/blog/ibps-rrb-image-resizer) |
| IBPS RRB Office Assistant 2026 | same | same | same | same | M | [Edutap](https://edutap.in/rrb-clerk/registration/) |
| IBPS SO 2026 | same | same | same | same | M | [AglaSem](https://career.aglasem.com/banking/ibps-so/application) |
| RBI Assistant 2026 | same | same | same | same | M | [PW](https://www.pw.live/banking/exams/rbi-assistant-form-fill-up-2026) |
| RBI Grade B 2026 | same | same | 240×240 (disputed) | 800×400 (disputed) | M/L | [PW](https://www.pw.live/banking/exams/rbi-grade-b-apply-online) |
| NABARD Grade A (2025 cycle) | same | same | same | same | M | [Edutap](https://edutap.in/nabard-grade-a/registration/) |

All banking: JPG, scanned at 200 DPI; photo 4.5×3.5 cm, light/white background, no cap or dark glasses; signature and declaration in black ink, **not in capital letters**; thumb black or blue ink on white paper; declaration in English, own handwriting, prescribed text. Live photo is captured **in addition** to the uploaded photo. IBPS PO/RRB also list a 10th certificate upload — size not yet found (Annexure III); leave as "to verify".

SBI JA declaration text (official): "I, ___ (Name), Date of Birth ___, hereby declare that all the information submitted by me in the application form is correct, true and valid…" — Workstream D: copy the full text from the official PDF.

### A.3 SSC and RRB (photo is live-captured — lead with signature)

| Exam | Photo | Signature | Other | Conf | Source |
| --- | --- | --- | --- | --- | --- |
| SSC CGL 2026 | Live webcam / SSC app only | ~6.0×2.0 cm, 10–20 KB, JPG | PwBD certificate only | H | [SSC CGL 2026 notice](https://ssc.gov.in/api/attachment/uploads/masterData/NoticeBoards/Notice_of_adv_cgl_2026.pdf) |
| SSC GD 2026 | Live | ~6.0×2.0 cm, 10–20 KB | Thumb 10–30 KB (secondary only, L) | H | [SSC GD notice](https://ssc.gov.in/api/attachment/uploads/masterData/NoticeBoards/notice_01122025.pdf) |
| SSC CPO 2026 | Live | 10–20 KB; notice says 6.0×2.0 cm in one place and 4.0×2.0 cm in another | — | H | [CPO 2026 notice copy](https://www.adda247.com/jobs/wp-content/uploads/sites/22/2026/07/10130954/Notice_of_adv_capf_2026.pdf) |
| SSC CHSL 2026 | Live | ~6.0×2.0 cm, 10–20 KB | — | M | [PW](https://www.pw.live/ssc/exams/ssc-chsl-photo-and-signature-size) |
| SSC MTS & Havaldar 2025 | Live | ~6.0×2.0 cm, 10–20 KB | — | M | [SarkariResult](https://www.sarkariresult.com/ssc/ssc-mts-2025/) |
| RRB ALP CEN 01/2026 | Live (no upload) | **min** 140×60 px, **30–49 KB**, ≥100 DPI, centred in 35×20 mm box, black ink | SC/ST certificate PDF < 400 KB | H | [RRB ALP CEN](https://www.rrbcdg.gov.in/uploads/2026/01-ALP/012026ALP-CEN.pdf) |
| RRB Group D CEN 09/2025 | Live | same as ALP | SC/ST cert PDF < 400 KB | H/M | [RRB Group D CEN](https://www.rrbcdg.gov.in/uploads/2025/09-LVL1/092025-CEN.pdf) |
| RRB NTPC CEN 06/2025 | Live | same as ALP | SC/ST cert PDF < 400 KB | M | [NTPC notification copy](https://rank.qmaths.in/pdfs/rrb-ntpc-graduate-cen-06-2026/RRB-NTPC-Graduate-CEN-06-2026-Detailed-Notification.pdf) |

SSC: blurred or tiny signatures are rejected — enforce the "ink fills ≥ 80% of box" guide. SSC gives only cm; at 200 DPI, 6.0×2.0 cm ≈ 472×157 px — use that as the default output, and note it's derived. RRB: a signature that fails 30 KB minimum is the most common case needing the grain/padding stages (section 7.3).

Exam pages for SSC/RRB must say clearly: "Photo is taken live in the form — you don't need to upload one. Here's how to get the live photo right:" with the official tips (plain/white background, good light, camera at eye level, no cap, mask or glasses).

### A.4 NTA (KB-only, no pixel sizes; live photo also captured)

| Exam | Photo | Signature | Other | Conf | Source |
| --- | --- | --- | --- | --- | --- |
| NEET UG 2026 | 10–200 KB JPG, white bg, 80% face incl. ears, taken after 1 Jan 2026 | 10–100 KB | Finger + thumb impressions, both hands: bulletin says 10–200 and 50–300 KB → target **50–200 KB**. Certificates PDF 50–300 KB each | H | [NEET UG 2026 bulletin](https://cdnbbsr.s3waas.gov.in/s37bc1ec1d9c3426357e69acd5bf320061/uploads/2026/02/202602231394640855.pdf) |
| JEE Main 2026 | 10–200 KB, white bg | 10–100 KB | Class 10 / PwD PDF 50–300 KB; ID proof 10–200 KB | H | [JEE Main 2026 bulletin](https://cdnbbsr.s3waas.gov.in/s3f8e59f4b2fe7c5705bf878bbd494ccdf/uploads/2025/11/202511021649722475.pdf) |
| CUET UG 2026 | 10–200 KB, white bg | 10–50 KB | PwD PDF 50–300 KB; ID 10–200 KB | H | [CUET UG 2026 bulletin](https://cdnbbsr.s3waas.gov.in/s3d1a21da7bca4abff8b0b61b87597de73/uploads/2026/01/202601031633478370.pdf) |
| UGC NET Dec 2026 | 10–200 KB | 10–50 KB | PwD PDF 50–300 KB | H | [UGC NET bulletin](https://cdnbbsr.s3waas.gov.in/s301eee509ee2f68dc6014898c309e86bf/uploads/2026/10/202610161905649093.pdf) |
| CSIR NET Dec 2026 | 10–200 KB, white bg | 10–50 KB | Category / PwD / Annexure PDFs 50–300 KB; ID 10–200 KB | H | [CSIR NET bulletin](https://cdnbbsr.s3waas.gov.in/s3efdf562ce2fb0ad460fd8e9d33e57f57/uploads/2026/10/202610071407707951.pdf) |

Default output for KB-only photos: 3.5×4.5 cm aspect, ~413×531 px (300 DPI) scaled down only if needed to fit max KB.

### A.5 UPSC (uploaded photo + live photo, matched)

| Exam | Photo | Signature | Other | Conf | Source |
| --- | --- | --- | --- | --- | --- |
| UPSC CSE / OTR 2026 | 20–200 KB JPG, white bg, face ~75% of frame, both ears visible, no signature on photo | **Three signatures one below another**, black ink, one image; 350–500 px square; 20–100 KB | Photo ID 20–200 KB | M | [Vajiram guide](https://vajiramandravi.com/upsc-exam/upsc-photo-and-signature-guidelines/) · [CSE 2026 notice copy](https://vajiram-prod.s3.ap-south-1.amazonaws.com/upsc_notification_2026_PDF_5ed3fb42a5.pdf) |
| NDA 2026 | same | same | same | M | [SarkariDoc](https://sarkaridoc.com/exams/upsc-nda/) |
| CDS 2026 | same | same | same | M | [SarkariDoc](https://sarkaridoc.com/exams/upsc-cds/) |

### A.6 Teaching

| Exam | Photo | Signature | Other | Conf | Source |
| --- | --- | --- | --- | --- | --- |
| CTET 2026 | 3.5×4.5 cm, 10–100 KB JPG | 3.5×1.5 cm, **3–30 KB** | — | H | [CTET bulletin](https://cdnbbsr.s3waas.gov.in/s3443dec3062d0286986e21dc0631734c9/uploads/2025/11/202511271651651092.pdf) |
| HTET 2025 | 3.5×4.5 cm, 20–50 KB, white bg | 10–50 KB | Thumb 10–50 KB | H/M | [HTET 2025 bulletin](https://htet.eapplynow.com/HTET25_InfoBulletin.pdf) |
| REET (2024 cycle) | 20–50 KB | 20–50 KB, black pen | Aadhaar + Class 10 marksheet images 50–100 KB | M | [REET 2024 form](https://reet-bucket.blr1.cdn.digitaloceanspaces.com/REET2024-Prod/docs/reetform2024.pdf) |
| UPTET 2026 | 3.5×4.5 cm, 20–50 KB | 3.5×1.5 cm, 10–20 KB | — | L | [sizetokb](https://sizetokb.in/uptet/) |
| KVS teacher 2025 | 10–200 KB | 10–50 KB | — | L | [toppersexam](https://toppersexam.com/kvs-nvs-recruitment-2025-complete-step-by-step-form-filling-guide-for-tgt-pgt-prt-and-non-teaching-posts-blog.html) |
| Bihar BPSC TRE 4.0 2026 | Live webcam | Hindi + English signatures, ≤ 20 KB, dims disputed | Certificates PDF ≤ 150 KB | L | [sarkarieasy](https://www.sarkarieasy.com/exams/bpsc-tre-4-2026-otr-document-checklist) |

### A.7 State police

| Exam | Photo | Signature | Conf | Source |
| --- | --- | --- | --- | --- |
| Bihar Police Constable (CSBC 01/2025) | 15–25 KB, JPG/GIF, white bg, ≤ 2 months old | **Two signatures (English + Hindi)**, 15–25 KB each, black/blue ink | H | [CSBC Advt 01/2025](https://csbc.bihar.gov.in/Advt/Advt-01-2025-Constables.pdf) |
| Haryana Police (HSSC 01/2026) | White bg, **name and date written on photo**; size not stated | Size not stated | M (rules), sizes missing | [HSSC notice copy](https://resultbharat.com/NOTICE/HSSC-Constable-01-2026-Notification.pdf) |
| UP Police Constable 2025 | Unclear: live capture vs 200×230, 20–50 KB | 140×60, sources say 5–20 or 30–50 KB | L | [SarkariDoc](https://sarkaridoc.com/exams/up-police/) |
| MP Police Constable 2026 | 200×230, ≤ 50 KB (conflicting) | 140×60, ≤ 20 KB | L | [Spardhasetu](https://www.spardhasetu.in/tools/mp-police) |
| Rajasthan Police Constable 2025 | 200×230, 20–50 KB (generic SSO) | 140×60, 10–20 KB | L | [onlineresult](https://onlineresult.in/tools/exam-photo-resizer/rpsc) |

### A.8 State PSCs

| Exam | Photo | Signature | Other | Conf | Source |
| --- | --- | --- | --- | --- | --- |
| UPPSC PCS / OTR | 5×6 cm at 200 DPI (≈394×472), ≤ 50 KB; composite: photo pasted on paper **with signature below it**, scanned together | 6×3 cm at 200 DPI (≈472×236), ≤ 30 KB, full running signature | — | M | [SarkariDoc](https://sarkaridoc.com/exams/uppsc/) |
| MPPSC State Service | 3.5×4.5 cm (350×450), target **25–100 KB** (advt 25–200, portal 20–100); **name + date on photo** | 350×150, 10–100 KB | Address proof 20–200 KB | M | [SarkariDoc](https://sarkaridoc.com/exams/mppsc/) |
| BPSC CCE 72nd | Live webcam | Hindi + English signatures, ≤ 20 KB, portrait 150–220 × 250–320 px (disputed) | Certificates PDF ≤ 100 KB (L) | M/L | [SarkariDoc](https://sarkaridoc.com/exams/bpsc/) |
| HPSC HCS 2026 | 20–300 KB; name + date below photo | 20–300 KB | Aadhaar PDF; signed form upload | L | [photombtokb](https://photombtokb.com/hpsc-hcs-2026/) |
| UKPSC Upper PCS | 150×200, 30–50 KB; name + date on photo | 150×100, 20–30 KB | — | L | [exammint](https://resizer.exammint.in/ukpsc/) |
| RPSC RAS / SSO OTR | Live photo at e-KYC; sizes conflicting | Hindi or English, sizes conflicting | Handwritten specimen, thumb | L | [Rajasthan recruitment portal](https://recruitment.rajasthan.gov.in/notificationdocview?ID=iL088UmNk8t9Jbsvh9cy8w%3D%3D) |

### A.9 Defence, postal, Delhi

| Exam | Photo | Signature | Other | Conf | Source |
| --- | --- | --- | --- | --- | --- |
| IAF Agniveervayu 02/2027 | 100–200 KB, ≤ 1 month old, light bg, **holding slate with name + date in chalk**; live image also matched | 80–150 KB, black ink | Left thumb 50–100 KB; parent signature if under 18 | M (copy of official) | [Notification copy](https://www.resultbharat.com/NOTICE/IAF-Agniveer-Vayu-Intake-02-2027-Notification.pdf) |
| India Post GDS 2026 | 320×400 (4:5), 30–100 KB, 72–150 DPI, face 70–80% | 300×120 (5:2), 20–100 KB, black/blue pen | No certificate upload | M (copy of official) | [Notification copy](https://www.adda247.com/jobs/wp-content/uploads/2026/08/27102349/descriptive-notification-2.pdf) |
| Delhi DSSSB (OARS) | **Postcard-size** 480×672, 50–300 KB, 96 DPI, upper body, both ears and shoulders | 110×140 (orientation disputed), ≤ 40 KB (some say 20) | Left + right thumb, separate files, ≤ 40 KB | M | [SarkariDoc](https://sarkaridoc.com/exams/dsssb/) |
| Indian Army Agniveer 2027 | 20–50 KB (no KB in official notice) | 10–20 KB (secondary) | — | L | [Official notice — URL truncated in paste] |

<!-- PASTE TRUNCATED HERE. Missing: rest of A.9, A.10 (35-exam launch list), A.11 (schema additions), and anything after. -->
