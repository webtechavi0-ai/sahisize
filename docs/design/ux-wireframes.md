# SahiSize: mobile-first wireframe specs

Branch `seo/production-seo`. Based on the working-tree code plus the rendered HTML from the existing
standalone build (port 3202). The specs only, no repo files changed.

Scale: wireframes are drawn at **360 px** (16 px side gutters, so 328 px of content ≈ 44 characters).
`───── 600px ─────` marks the end of the first phone screen once the browser chrome is gone
(about 600 px of 640–740 px). The header (logo, menu, हिं) takes about 56 px.

---

## 0. What the current build shows (findings that drive the specs)

| # | Page | Observation (from code + rendered HTML) | Consequence |
|---|------|------------------------------------------|-------------|
| F1 | Home | `HomePaths` renders **"Filling an exam form?" first**, then "Most searched sizes", then "or", then **"Just need a size?" last**. That is the reverse of the owner's fixed order. | On a 360 px phone the size tasks start at about 1,050 px, two screens down. Someone who only wants "photo to 20 KB" sees a search box and exam chips instead. This is the most likely cause of the 72.8% bounce and 15 s engagement. |
| F2 | Home | Nothing on home can be acted on directly: every block is a link. `HeroArt` drops below all the paths on phones (around 1,400 px), so nobody sees it. | The phone screen holds only text. There is no "aha" moment and no picture that says "this fixes your photo". |
| F3 | Home | The H1 "Photo and signature resize for exam forms" plus a subline that mixes Hinglish and English uses about 150 px and gives no number. | The first screen shows no size, KB value or pixel count. |
| F4 | Doc page | The answer box (`DocAnswerBox`) comes before the tool. This is good and explains why these pages win. But the size is `text-sm` inside a `<dl>`, the same weight as the "Who uploads" row. | The number people searched for ("50–300 KB") is not the loudest thing on the page. |
| F5 | Doc page | The source/checked date appears **three times**: in the answer box "Source" row, the `freshness` line, and the `NoticeBadge` below the chips. | This is noise. One trust row near the answer is enough. |
| F6 | Doc page | `model.next` for JEE Main Class 10 is **"Disability / UDID certificate"**, which only PwD candidates need. | The next-step link sends most users to a document they don't need. It should skip conditional documents (who ≠ every candidate). |
| F7 | Doc page | For certificates, the upload buttons read "Take photo / Choose from gallery" and the action is "Make PDF". No picture shows the idea "pages → one PDF ≤ 300 KB". | Certificate users are unsure whether they can add several pages. |
| F8 | Tool: 50 KB | The first screen is already right: GoalLine "We'll make your photo 50 KB." → Take photo / Choose from gallery → trust line. The options sit in a collapsed "More options". | Keep this. It is the template for the other tools. |
| F9 | Tool: PDF 400 KB | There is **no GoalLine**. The button says "Choose from gallery" even though it takes a PDF. A "Settings" block with 7 size chips and a "Compress to 400 KB" button is open before any file is added. | It is inconsistent with F8. On a phone, "gallery" for a PDF is wrong (the file is in Files or Downloads). |
| F10 | Exam page | Good: a "Make my JEE Main files" CTA, then a numbered document list with KB values. But the H1 promises "JEE Photo Size", and the photo answer (10–200 KB) is only one row in a list. A size answer box only renders when `photoUploadReplacedByLive`. | People who search "JEE photo size" get the size, but not as a headline answer. |
| F11 | /exams | H1 → 3 family chips → search → **11 filter chips** (they scroll sideways on phones) → the first exam card at about 560 px. | The first screen is all navigation. No card shows. |
| F12 | /tools | "Most used" has 4 cards (good). After it come 6 jump chips, then a "Photo by KB" section with **28 KB chips**. | Wall of chips; no "type your KB" input. |
| F13 | All | No raster images in `public/`. All art is inline SVG: `HeroArt`, `CaptureExample` (good/avoid, used only inside the kit upload step), `FaqIllustration`, `DocIcon`, `ResultPreview` (before/after, result only). | The visual assets already exist. They are just placed below the fold or only inside the flow. |

Existing analytics events (`src/lib/analytics`): `tool_used`, `doc_uploaded`, `fit_done`,
`doc_downloaded`, `exam_selected`, `kit_started`, `kit_zip_downloaded`, `error`, `portal_feedback`.
The specs below reuse them and propose a few new ones, each marked **(new)**.

---

## Global rules (every page)

- **Answer → action → proof → depth.** The first 600 px must show the exact size (KB, px or format) and
  one primary action. Everything else goes below.
- **One primary button per screen**, using the existing `btn-action` style (saffron, ≥ 56 px tall,
  full width on phones). Secondary actions are outlined or text links, all ≥ 48 px (`min-h-tap`).
- **Numbers are typography.** Sizes are set as display text (`text-3xl font-bold tabular-nums`),
  never as body text inside a sentence.
- **One trust row per page, placed next to the answer**, not repeated:
  `🛡 Stays on your phone · ✓ Checked 22 Oct 2026 · Official notice ↗`
  (shield, check and external-link icons, not emoji; chalk colour as in `TrustLine`).
- **Sticky bottom bar on phones** appears only when there is something to do (Download, Next document).
  It must respect `env(safe-area-inset-bottom)`. `ResultPanel` already does this for Download.
- **Motion:** only 150–200 ms transitions. Every animation has `motion-reduce:` off. No autoplay.
- **Focus:** 3 px ink outline with 2 px offset (as in `MoreOptions`). Never remove it. Skip link to `#main`.
- **Contrast:** body text ≥ 4.5:1, large numbers ≥ 3:1, but aim for ink-on-paper. `text-muted` must
  not be placed on `bg-saffron-soft`; check it in dark mode too.
- **Hindi (`/hi/*`):** Devanagari at 17 px base with `leading-relaxed` (≈1.6). Headings use
  `leading-snug`, not `tight`, because matras get clipped. Keep digits and units in Latin form
  (`20 KB`, `200×230 px`), as students read them on the form. Key form words appear in both
  languages once: "साइज़ (Size)", "हस्ताक्षर (Signature)". Hindi labels run about 20–30% longer than
  English, so chips and buttons must wrap and never truncate. Where a Hindi page links to an
  English-only page, keep the existing "English" pill.

---

## 1. Home `/` and `/hi`

**User's job:** "I have a photo, signature or PDF and a number from a form. Make it fit, now."
Some users arrive knowing only the exam name. The owner fixed the order: **size first, exam second**.

**Change that cuts bounce:** move "Just need a size?" to the top and make it **actionable on the
page**: KB chips plus a single "Choose photo" button that runs the compress tool inline (lazy-loaded).
Drop the generic H1 to one line. The home stops being a list of links: the first tap does the job.
**Metric:** home bounce rate (72.8% → target < 55%), average engagement time (15 s → > 45 s), and
**(new)** `home_quick_start {kb}` / `fit_done {tool:'compress-image', from:'home'}` per home session.
Also track **(new)** `home_path_click {path:'size'|'exam'|'searched', pos}` to see which block is used.

### 360 px wireframe

```
┌────────────────────────────────────────────┐
│ ◧ SahiSize            Exams Tools  हिं  ☰  │  56  header (no search on home)
├────────────────────────────────────────────┤
│ Exam form photo, signature & PDF —         │  H1, 24px, 2 lines max
│ the ==exact size==, on your phone.         │  (marker on "exact size")
│                                            │
│ ┌────────────────────────────────────────┐ │
│ │ ✂ Just need a size?                    │ │  H2 path A (saffron dot icon)
│ │ ┌──────┐┌──────┐┌──────┐┌──────────┐   │ │  KbChips: radio group,
│ │ │20 KB ││50 KB ││100 KB││ Other KB │   │ │  48px each, 20 KB pre-selected
│ │ └──────┘└──────┘└──────┘└──────────┘   │ │
│ │ ┌────────────────────────────────────┐ │ │
│ │ │  📷  Choose photo → make it 20 KB  │ │ │  btn-action 56px, label tracks chip
│ │ └────────────────────────────────────┘ │ │
│ │ 🛡 Stays on your phone. Never uploaded. │ │  TrustLine
│ │ ─────────────────────────────────────  │ │
│ │ [✍ Signature] [📄 PDF to 400 KB]       │ │  TaskChips row 2 (scrolls
│ │ [🪪 PAN photo] [🛂 Passport] [⌗ Custom] │ │  sideways ≤ 2 rows)
│ └────────────────────────────────────────┘ │
│                                            │
│ ┌────────────────────────────────────────┐ │
│ │ 🔍 Filling an exam form?               │ │  H2 path B (ink dot icon)
│ ─────────────────── 600px ───────────────────
│ │ [ Search your exam…              🔍 ]  │ │  HeroSearch
│ │ [IBPS PO] [SSC CGL] [NEET UG]          │ │  ExamChips 3×2
│ │ [RRB NTPC][SBI PO ] [SSC CHSL]         │ │
│ └────────────────────────────────────────┘ │
│                                            │
│ Most searched sizes                        │  SizeAnswerList (organic winners)
│ ┌────────────────────────────────────────┐ │
│ │ JEE Main 10th certificate          ›   │ │
│ │ 50–300 KB · PDF                        │ │  spec bold, tabular
│ ├────────────────────────────────────────┤ │
│ │ CSIR NET result-awaited certificate ›  │ │
│ │ 50–300 KB · PDF                        │ │
│ ├────────────────────────────────────────┤ │
│ │ RRB NTPC SC/ST certificate         ›   │ │
│ │ under 400 KB · PDF                     │ │
│ ├────────────────────────────────────────┤ │
│ │ SSC CGL signature                  ›   │ │
│ │ 472×157 px · 10–20 KB · JPG            │ │
│ └────────────────────────────────────────┘ │
│                                            │
│ ┌─────────── HeroArt (SVG) ──────────────┐ │  moved here: "how it looks"
│ │ [4.2 MB selfie] ──▶ [18.8 KB ✓ PASS]   │ │  explains the result before
│ └────────────────────────────────────────┘ │  the exam list
│ Popular exams right now        See all 35 ›│
│ [ExamCard compact] × 6 (2-col from 640)    │
│ How it works (3 steps, icons)              │
│ Trust strip (4 tiles, 2×2)                 │
│ FAQ (accordion)                            │
└────────────────────────────────────────────┘
```

**In the first 600 px:** a one-line value H1, the KB chips with 20 KB selected (the answer is the number
itself), the primary **Choose photo** button, the trust line, the second row of tasks, and the start of
the exam path (owner order kept, with the exam path visible as a "peek").

**Inline quick-size flow** (same states as §7; it reuses `ToolCompress` with `askSize` lazily mounted):
1. *Empty:* chips plus the button. Tapping a chip updates the button label ("make it 50 KB").
   "Other KB" opens a numeric input (`inputmode="numeric"`, suffix "KB", 1–2000).
2. *Picked:* the panel swaps in place (no navigation) to `Working`: "Making it 20 KB…" with a spinner.
   Load the engine on `pointerenter`/`focus` of the button (`prewarmEngine` already exists).
3. *Result:* `ResultPanel` inside the card. It shows the "Ready: 18.8 KB ✓" stamp, before → after
   thumbnails, and a sticky **Download** button.
4. *Next step:* "Need exact pixels for your exam? Pick your exam ↓" scrolls to path B. A text
   link "Open full tool" goes to `/tools/compress-image-to-20kb`, keeping the SEO page as the
   canonical place for the tool.
   If an inline tool is too much JavaScript for home, the fallback is that the button links to the
   `/tools/compress-image-to-{kb}kb` page and auto-opens the picker (`#pick`). The layout stays the
   same and only the hand-off changes.

**Images:** `HeroArt` moves below "Most searched sizes" on phones (on desktop it stays in the right
column). The task chips get 18 px line icons (existing `Icon`). Do not add photos of people above the fold.

**Micro-interactions:** the selected chip fills saffron with a check icon (150 ms). The button label
cross-fades when the chip changes. Rows in "Most searched sizes" use a pressed state
(`active:bg-saffron-soft`).

**Trust cues:** the `TrustLine` under the button. "Most searched sizes" rows show specs taken from
verified presets only (already enforced: `toVerify` → null).

**Hindi:** H1 "परीक्षा फॉर्म की फोटो, साइन और PDF — ==सही साइज़== में, आपके फोन पर।". The chips stay
"20 KB". The button reads "फोटो चुनें → 20 KB बनाएँ". Use the Hinglish tagline only on `/` (it already is).

**A11y:** the KB chips are a `role="radiogroup"` with arrow-key support and a visible label "Size".
The button's accessible name includes the KB value. The result is announced via `LiveRegion`.

**Desktop (≥ 1024):** a two-column hero. The left column holds the H1 and "Just need a size?"
(chips, button and task chips in one row). The right column holds HeroArt. Below, "Filling an exam form?"
and "Most searched sizes" sit side by side at equal height. Popular exams use a 4-column grid.
Avoid the current `xl:grid-cols-2` layout that places the exam panel first.

---

## 2. `/tools` hub ("Just need a size?")

**User's job:** "I know the number (or the document type). Take me to the right tool in one tap."

**Change:** put a **"Type your size" field** above everything (KB + photo/PDF toggle → routes to the
nearest `/tools/compress-image-to-{n}kb` or `compress-pdf-to-{n}kb`, else the generic tool with the KB
pre-filled). Collapse the 28-chip wall to the 8 most used plus a "More sizes" disclosure.
**Metric:** the /tools exit rate and the click-through to a tool page (**(new)** `tools_hub_click {via:'input'|'card'|'chip'}`),
then `tool_used` on the next page view.

```
┌────────────────────────────────────────────┐
│ Home › Tools                               │
│ Photo, signature & PDF tools               │  H1 20–24px, 1–2 lines
│ 🛡 Everything runs on your phone.          │  TrustLine
│ ┌────────────────────────────────────────┐ │
│ │ What size does your form ask for?      │ │  SizeFinder
│ │ ( Photo ) ( Signature ) ( PDF )        │ │  segmented, 48px
│ │ [  20        ] KB   [  Go ▶  ]         │ │  numeric input + btn
│ │ e.g. "max 50 KB" → type 50             │ │  hint
│ └────────────────────────────────────────┘ │
│ Most used                                  │
│ ┌──────────────────┐┌──────────────────┐   │  ToolCard 2-col on 360?
│ │▣ Photo to 20 KB  ││✍ Signature       │   │  -> no: 1-col list rows,
│ │ any photo ≤20 KB ││ white bg, right  │   │  icon left, 64px each
│ └──────────────────┘└──────────────────┘   │
│ ┌──────────────────┐┌──────────────────┐   │
│ │📄 PDF to 400 KB  ││⧉ Photos → 1 PDF  │   │
│ ─────────────────── 600px ───────────────────
│ Jump: [By KB][Size & format][Signature]    │  JumpChips, sticky under
│       [Documents][PDF][Govt ID]            │  header when scrolled
│ ▣ Photo by KB                              │  ToolSection (icon tile)
│  Compress image · Increase KB · MB→KB …    │
│  [10][20][30][50][100][200] KB  More ▾     │  8 chips + disclosure
│ ... sections continue ...                  │
└────────────────────────────────────────────┘
```

On 360 px, use **2-column cards only if each name fits on 2 lines**. Otherwise use 1-column rows with
the icon on the left, at 64 px each (four rows take 256 px, which still fits above 600 px together with the SizeFinder).

**Images:** one 40 px icon tile per section (already present). Most-used cards get the same icon set.
There is no hero art: this is a utility page.

**Micro-interactions:** the SizeFinder's Go button stays disabled until a value is entered. When the
number has its own page, the hint changes live to "→ Opens Photo to 50 KB"; otherwise it says
"→ Opens Compress image set to 37 KB". Pressing Enter submits.

**Hindi:** on `/hi/tools`, tools without a Hindi page keep the "English" pill. SizeFinder labels:
"आपके फॉर्म में कितना साइज़ लिखा है?", with the toggle "फोटो / सिग्नेचर / PDF".

**A11y:** the SizeFinder is a `<form role="search">` with a `<label>`. The segmented control is a
radiogroup. The input uses `inputmode="numeric"` and `enterkeyhint="go"`.

**Desktop:** the SizeFinder and Most used sit side by side (40/60). The sections use a 3-column grid. The jump chips become a sticky left rail at ≥ 1280.

---

## 3. `/exams` hub ("Filling an exam form?")

**User's job:** "Find my exam fast and see its sizes before I open it."

**Change:** search first, filter chips second, and at most one row of chips that scrolls sideways. Add a
**"Open now / closing soon"** strip (from `applyWindow`) so the first screen shows real exam cards with
sizes. Move the family chips under the strip.
**Metric:** /exams → exam-page CTR (`exam_selected`), time to first card tap, and **(new)**
`exams_search {q_len, results}`, including zero-result queries, as a backlog signal for new exams.

```
┌────────────────────────────────────────────┐
│ Home › Exams                               │
│ Exam photo, signature & document sizes     │  H1
│ 35 exams · official notices · checked dates│  meta line (count + trust)
│ [ 🔍 Type your exam (SSC, IBPS, NEET…) ]   │  ExamSearch 48px, filters live
│ [All 35][Banking 10][SSC 5][RRB 3][NTA 5]→ │  FilterChips, 1 row, scroll-x,
│                                            │  fade edge = more
│ Forms open now                             │  OpenNowStrip (if any)
│ ┌────────────────────────────────────────┐ │
│ │ RRB NTPC 2026          closes 30 Nov ● │ │  ExamCard (sizes line bold)
│ │ Photo (live) · Signature 30–49 KB    › │ │
│ └────────────────────────────────────────┘ │
│ ┌────────────────────────────────────────┐ │
│ │ CSIR NET Dec 2026      open ●          │ │
│ ─────────────────── 600px ───────────────────
│ │ Photo 10–200 KB · Sign 10–50 KB      › │ │
│ └────────────────────────────────────────┘ │
│ Families: [SSC (5)] [RRB (3)] [IBPS (5)]   │
│ Banking                                    │  grouped sections
│  ExamCard × n                              │
│ …                                          │
│ Can't find your exam?                      │  existing aside
│  [Make a custom size] [Tell us the exam]   │
└────────────────────────────────────────────┘
```

**ExamCard (refined):** the short name and cycle chip on line 1. Line 2 shows the **sizes in bold**
(already `cardSizes`). Line 3 lists the document labels. Add a status dot: green "open", amber
"closing in N days", grey "closed · next ~Feb". The dot is always paired with text, so colour is never the only cue.

**Micro-interactions:** search filters as the user types (already `ExamsFilterBoot`). The result count is
announced politely (already `aria-live`). The filter chips use `aria-pressed`. While filtering, empty
sections collapse instead of leaving headings behind.

**Images:** none needed. At most, small 24 px body logos would be a trademark risk, so prefer text badges ("NTA", "RRB").

**Hindi:** the search placeholder "अपनी परीक्षा लिखें (SSC, IBPS, NEET…)". Search must match Hindi and
English names plus aliases (it already includes `p.name.hi` in `data-search`).

**Desktop:** search and chips in one row. Open-now becomes a 3-column row. The groups use a 3-column grid.
Families can become a left sidebar at ≥ 1280.

---

## 4. Exam page `/exam/[slug]` (e.g. JEE Main, SSC CGL)

**User's job:** "What exactly does *my* exam want for each file, and make them all for me."
Search intent is usually "<exam> photo size" (as in the H1 "JEE Photo Size 2026").

**Change:** add a **"Size at a glance" answer card for every exam**, not only live-photo ones. It holds
the photo and signature sizes as big numbers, and the trust row under it. The existing "Make my files"
CTA and the documents list follow. The H1's promise is then answered visually in the first 300 px.
**Metric:** engagement time on exam pages, `kit_started` per exam pageview, and doc-page CTR from
the list rows (**(new)** `exam_doc_click {doc}`).

```
┌────────────────────────────────────────────┐
│ Home › Exams › NTA › JEE Main              │  Breadcrumbs (1 line, scroll)
│ JEE Main 2026 photo & signature size       │  H1
│ ┌────────────────────────────────────────┐ │  ExamAnswerCard
│ │  PHOTO            SIGNATURE            │ │  2-col big numbers
│ │  10–200 KB        10–100 KB            │ │  text-2xl bold tabular
│ │  JPG · 3.5×4.5cm  JPG                  │ │  small sub-spec
│ │ ────────────────────────────────────── │ │
│ │ ✓ NTA Bulletin p.10 · checked 22 Oct   │ │  TrustRow (one place only)
│ │   2026 · Open notice ↗                 │ │
│ │ ● Form closed · next usually Feb, Nov  │ │  status
│ └────────────────────────────────────────┘ │
│ ┌────────────────────────────────────────┐ │
│ │   Make all 5 JEE Main files  ▶         │ │  btn-action 56px
│ └────────────────────────────────────────┘ │
│   Free · on your phone · about 5 min       │
│ Or one file:                               │
│ ① Photograph        10–200 KB · JPG     ›  │  DocRow 48px, DocIcon left
│ ② Signature         10–100 KB · JPG     ›  │
│ ─────────────────── 600px ───────────────────
│ ③ Class 10 cert.    50–300 KB · PDF     ›  │
│ ④ Disability cert.  only if PwD         ›  │  conditional rows marked
│ ⑤ Identity proof    10–200 KB · JPG     ›  │
│ ┌────────────────────────────────────────┐ │
│ │ GoodBadExample: ✓ good photo ✗ avoid   │ │  CaptureExample (photo)
│ │ [face 80%, white bg] [cap, shadow]     │ │  moved up from kit
│ └────────────────────────────────────────┘ │
│ Live-photo note (if any)                   │
│ Full rules table (SpecTable)               │
│ Mistakes that get rejected (RejectionTips) │
│ About / FAQ / Tools / Related exams        │
└────────────────────────────────────────────┘
```

When an exam has **one uploadable document** (SSC CGL, CHSL, CPO, MTS), the tool is embedded right
under the answer card (`embedOnly`, which already happens). In that case the page follows §5 and §7.

**Images:** `CaptureExample` good/avoid pairs for photo and signature, placed right after the document
list (today they exist only inside the kit upload step). `DocIcon` sits left of each row. A live-photo
exam gets a small camera illustration in the note.

**Micro-interactions:** the rows show a pressed state. If the kit already holds progress in IndexedDB
(`loadKit`), the CTA becomes "Continue: 2 of 5 done ▶", with a mini `StepProgress`. This is a strong
return-visit cue.

**Hindi:** the answer card labels "फोटो" and "सिग्नेचर" with the numbers unchanged. The CTA
"JEE Main की सभी 5 फाइलें बनाएँ". Exam names stay in English when that is how the form shows them.

**A11y:** the answer card is a `<dl>` with `aria-labelledby` set to a visually hidden heading "JEE Main
2026 sizes". Numbers stay plain text, not SVG. The status dot has a text label.

**Desktop:** a two-column layout. The left column (60%) holds the answer card, CTA and document list.
The right column holds the good/avoid examples and the trust details, sticky. The reference content runs full width below.

---

## 5. Exam-document page `/exam/[slug]/[document]` (the organic winners)

Examples: `/exam/jee-main/class10`, `/exam/csir-net/result-awaited`, `/exam/rrb-ntpc/certificate`,
`/exam/ssc-cgl/signature`.

**User's job:** "I searched '<exam> <document> size'. Give me the number and make my file right here."
These pages already work (low bounce). **Keep the order** (answer → tool → other docs) and amplify it.

**Change:**
1. Make the size in the answer box a **headline number** (F4).
2. Show **one** trust row (F5).
3. For certificates, add a "pages → one PDF" visual and a multi-page-friendly uploader (F7).
4. Fix **next-step** to skip conditional documents (F6), and show it as a sticky "Next document" bar
   after download.

The change that raises engagement is the post-download next step. Today the session ends at the download.
**Metric:** `doc_downloaded` → next-doc pageview rate (**(new)** `next_doc_click {from, to}`),
pages/session from doc landings, and `fit_done/doc_uploaded` as tool success.

### 360 px wireframe (certificate variant, e.g. JEE Main Class 10)

```
┌────────────────────────────────────────────┐
│ Home › Exams › JEE Main › Class 10         │
│ JEE Main 10th certificate size 2026        │  H1 (2 lines)
│ ┌────────────────────────────────────────┐ │  DocAnswerBox v2
│ │  50–300 KB  ·  PDF                     │ │  text-3xl bold, tabular
│ │  All pages in one file                 │ │  text-base
│ │  Every candidate uploads this          │ │  "who" as plain line
│ │ ────────────────────────────────────── │ │
│ │ ✓ NTA Bulletin p.10 · checked          │ │  TrustRow
│ │   22 Oct 2026 · Open notice ↗          │ │
│ └────────────────────────────────────────┘ │
│ ┌────────────────────────────────────────┐ │  Tool card (KitSlot only=doc)
│ │ [▯▯▯] ──▶ [ PDF 50–300 KB ✓ ]          │ │  PagesToPdf SVG, 64px tall
│ │ Add a photo of each page.              │ │  GoalLine
│ │ ┌────────────────────────────────────┐ │ │
│ │ │ 📷  Photograph pages               │ │ │  primary 56px (camera)
│ │ └────────────────────────────────────┘ │ │
│ │ ┌────────────────────────────────────┐ │ │
│ │ │ 📁  Choose photos or a PDF         │ │ │  secondary 48px (files)
│ │ └────────────────────────────────────┘ │ │
│ │ 🛡 Stays on your phone. Never uploaded. │ │
│ ─────────────────── 600px ───────────────────
│ │ Tip: lay it flat on a dark table, no   │ │  captureTip (moved INTO tool)
│ │ corners cut.                           │ │
│ └────────────────────────────────────────┘ │
│ How-to guide: Combine certificates ›       │  GuideLink
│ Other JEE Main documents                   │  DocOtherChips
│ [Photograph][Signature][ID proof][PwD*]    │  conditional ones marked *
│ Rules for this document (SpecTable)        │
│ What is specific to JEE Main               │
│ Compared with NEET UG / CUET               │
│ Mistakes that get rejected                 │
│ FAQ                                        │
│ Related pages                              │
│ [Make all 5 JEE Main files ▶] Back to exam │
└────────────────────────────────────────────┘
```

### Photo/signature variant (e.g. SSC CGL signature): only the top changes

```
│ ┌────────────────────────────────────────┐ │
│ │  10–20 KB  ·  472×157 px  ·  JPG       │ │  3 big tokens, wrap at 360
│ │  Black ink on white paper              │ │  first rule
│ │ ✓ SSC notice p.x · checked … · ↗       │ │
│ └────────────────────────────────────────┘ │
│ ┌────────────────────────────────────────┐ │
│ │ ✓ Good         ✗ Avoid                 │ │  GoodBadExample (compact,
│ │ [clean sig]    [lined paper, blue ink] │ │  96px tall, 2-up)
│ │ [📷 Take photo]  [🖼 From gallery]      │ │  Uploader
│ │ 🛡 Stays on your phone                 │ │
│ └────────────────────────────────────────┘ │
```

**In the first 600 px:** the H1, the big answer, the source and date, the illustration, the goal line,
and both upload buttons with the trust line. This matches today's order but with stronger hierarchy and less noise.

**Flow states:** as in §7, using KitFlow's `upload → crop → result` screens. For certificates, the
"pages" step shows thumbnails with a page count ("3 pages") and a running estimate ("≈ 180 KB of
300"). The `KbMeter` stays visible while pages are added. **After download** a sticky bar appears:
`Next: Photograph (10–200 KB) ▶`. The "next" document is the following document that **every
candidate** must upload, skipping PwD/category/conditional ones.

**Live-photo exams:** keep the camera note, but place it **inside the answer box** as a row
("Photo: taken live at the form, no upload"). Then a searcher for "SSC CGL photo size" gets the true
answer at the top.

**Hindi:** the answer box title "JEE Main 10वीं सर्टिफिकेट साइज़" with the numbers unchanged. The rows use
`docCopy('hi')`. The upload buttons read "पेजों की फोटो लें" / "फोटो या PDF चुनें".

**A11y:** the big number is not a heading. It is the first `<dd>`, and the box keeps its `h2` for
screen readers. The certificate page list uses `role="list"`, and each thumbnail has a "Remove page 2" button (≥ 44 px).
Reordering uses up/down buttons, not drag only.

**Desktop:** answer box and tool sit side by side (answer 40% sticky, tool 60%). The reference content runs below at `max-w-4xl`.

---

## 6. Tool page `/tools/[slug]` (compress to 50 KB, PDF to 400 KB)

**User's job:** "Make this file the number in the URL. No settings."

**Change:** align every tool with the compress template (F8): a GoalLine, the right upload control for
the file type, settings collapsed, and an auto-start for fixed-target pages. For **PDF 400 KB**: add
a GoalLine, rename the picker to "Choose PDF file", collapse Settings, auto-run on pick, and add
the cross-link "Have photos, not a PDF? Make one PDF under 400 KB ›" right under the uploader.
After the result, add a **"Which exam is this for?"** chip row (from `examLinks`) as the next step.
**Metric:** `tool_used → fit_done → doc_downloaded` funnel per tool slug, and error rate
(`error` / `tool_used`). For the PDF tool, watch for "file got bigger" outcomes.

```
┌────────────────────────────────────────────┐
│ Home › Tools › Photo to 50 KB              │
│ Resize photo to 50 KB                      │  H1 (short; long SEO H1 moves
│                                            │  to an h2 / the intro)
│ ┌────────────────────────────────────────┐ │  Tool card
│ │ We'll make your photo 45–50 KB.        │ │  GoalLine (range = honest)
│ │ [ 3 MB photo ] ──▶ [ 48 KB ✓ ]         │ │  BeforeAfter mini SVG 56px
│ │ ┌────────────────────────────────────┐ │ │
│ │ │ 📷  Take photo                     │ │ │  56px
│ │ └────────────────────────────────────┘ │ │
│ │ ┌────────────────────────────────────┐ │ │
│ │ │ 🖼  Choose from gallery            │ │ │  48px (PDF: "📁 Choose PDF")
│ │ └────────────────────────────────────┘ │ │
│ │ 🛡 Stays on your phone. Never uploaded. │ │
│ │ › More options  (now: 50 KB)           │ │  collapsed MoreOptions
│ └────────────────────────────────────────┘ │
│ The 50 KB limit is used by IBPS PO, SBI…   │  intro (1–2 lines, moved
│ ─────────────────── 600px ───────────────────  under the tool)
│ Used by: [IBPS PO][SBI Clerk][UGC NET]…    │  exam chips (moved UP)
│ How to use it (4 steps, numbered icons)    │
│ About this size (accordions)               │
│ FAQ                                        │
│ Other sizes: [20][30][100][200] KB  All ›  │
└────────────────────────────────────────────┘
```

**Why move the intro below the tool:** on the 50 KB page the intro is 3 lines (about 90 px) and pushes
"Choose from gallery" toward the fold. The H1 plus the GoalLine already carry the keyword.
Keep the intro text in the DOM right after the tool, so SEO keeps it.

**PDF 400 KB specifics:** the GoalLine reads "We'll make your PDF under 400 KB (all pages kept)." The
pages→PDF illustration is reused. After the result, the panel shows "3 pages · 386 KB · 150 DPI". If the
input was already under 400 KB, the result panel says "Already under 400 KB, upload it as is" with a
**Download original** button and no failure tone. In the "Settings" disclosure, the text-not-selectable
note becomes a one-line hint.

**Images:** a mini before→after SVG in the empty state (it sets expectations: "3 MB → 48 KB"). The real
`ResultPreview` replaces it with the user's own thumbnails in the result state.

**Hindi:** the GoalLine "हम आपकी फोटो 45–50 KB की बना देंगे।". The PDF button "PDF फाइल चुनें".

**Desktop:** `ToolColumns`: tool left (sticky), result right. Content below at `max-w-4xl`.

---

## 7. Shared tool flow states (home inline, doc pages, tool pages, kit)

| State | What shows | Copy (en) | Micro-interaction | A11y |
|-------|------------|-----------|-------------------|------|
| **Empty** | GoalLine, illustration, Take photo (primary) and Choose (secondary), TrustLine, collapsed options | "We'll make your photo 20 KB." | Engine prewarm on hover/focus (exists) | Buttons are real `<button>`s wrapping hidden `<input type=file>`; label includes the target |
| **Picking / reading** | The file card (`SourceBar`): thumbnail, name, original size "3.2 MB · 3024×4032" | "Got it: 3.2 MB" | Thumbnail fades in (150 ms) | `LiveRegion`: "Photo added, 3.2 MB" |
| **Crop** (exam docs only) | `Cropper` with the guide box locked to the aspect, plus `CropGuides` (face oval) | "Keep your face inside the oval" | Pinch/drag; buttons for rotate 90° and reset (≥ 48 px) | Arrow keys nudge the crop and +/− zoom (keyboard alternative) |
| **Processing** | `Working` card with a spinner and a determinate `ProgressBar` for PDFs (per page) | "Making it 20 KB…" then "Page 2 of 3…" | No layout shift: the card keeps the result's min-height | `role="status"` |
| **Result: pass** | Stamp "Ready: 18.8 KB ✓", one plain line, **Download** (sticky bottom on phone), Share, before→after, `KbMeter`, PassCheck folded | "Right size. Download it, then upload it on the form." | The stamp pops (scale 0.96→1, 150 ms, motion-safe). Auto-scroll into view (exists) | Focus moves to the result heading. Download names the file "photo_20kb.jpg" |
| **Result: fail / warn** | PassCheck open with the failing rule, and `ErrorBox` with 1–2 fix buttons | "Still 23 KB, over the 20 KB limit. Try: Allow smaller pixels" | Fix buttons re-run in place | `role="alert"`. Download stays disabled with a reason in `aria-describedby` |
| **Downloaded** | The button becomes "Downloaded ✓ · Download again". A **Next step card** appears | Doc: "Next: Signature (10–20 KB) ▶". Tool: "Which exam? [IBPS PO][SBI…]". Home: "Need exact pixels? Pick your exam" | Next-step card slides up (motion-safe) | Next step announced politely |
| **Error (input)** | `ErrorBox` | "This is a HEIC photo, converting…" / "Over 25 MB, choose a smaller file" | none | `role="alert"` |

---

## 8. Reusable components this implies

Existing components to **reuse as they are** are marked (exists); the rest are new or extended.

| Component | Props | Used on | Notes |
|-----------|-------|---------|-------|
| `QuickSizePanel` (new) | `lang`, `kbOptions: number[]`, `defaultKb`, `tasks: TaskLink[]`, `inline?: boolean`, `toolHref(kb)` | Home (path A) | Wraps `KbChips` + primary button + `TrustLine` + task chips; lazy-mounts `ToolCompress` when `inline` |
| `KbChips` (new, from `TargetKbPicker`) | `options`, `value`, `onChange`, `allowCustom`, `label`, `name` | Home, /tools SizeFinder, tool MoreOptions | radiogroup; "Other KB" opens a numeric input |
| `TaskChips` (extract from `HomePaths`) | `items: {id, href, label, icon}[]`, `columns?` | Home, 404 | 48–52 px chips with icon |
| `ExamPathPanel` (extract from `HomePaths`) | `lang`, `exams: PathLink[]` | Home | Search + exam chips; rendered **after** `QuickSizePanel` |
| `SizeAnswerList` (extract "Most searched sizes") | `rows: MostSearchedRow[]`, `title` | Home, /tools footer, 404 | Spec line bold/tabular |
| `SizeFinder` (new) | `lang`, `kinds: ('photo'\|'signature'\|'pdf')[]`, `resolve(kind, kb) → href` | /tools, home "Other KB" fallback | GET form, works without JS (server redirect or nearest page) |
| `AnswerCard` (generalise `DocAnswerBox`) | `lang`, `headline: string[]` (big tokens), `rows: {label, value}[]`, `trust: TrustRowProps`, `status?` | Exam-document page, exam page (two-column variant), ID-document pages | Big numbers first; one trust row; replaces the separate `freshness` line and the duplicate `NoticeBadge` here |
| `ExamAnswerCard` (variant of `AnswerCard`) | `preset`, `lang`, `docs: ('photo'\|'signature')[]` | Exam page | 2-column photo/signature; live-photo text instead of KB |
| `TrustRow` (new; merges `NoticeBadge` + `TrustLine` text) | `lang`, `source: {name, page?, url?}`, `checked: Date`, `verified: boolean`, `onDevice?: boolean` | Answer cards, tool card, /exams meta | Unverified state keeps the saffron caution style |
| `TrustLine` (exists) | `text` | Every uploader | Keep as the device-privacy pill |
| `GoodBadExample` (expose `CaptureExample`) | `doc: 'photo'\|'signature'\|'thumb'`, `size: 'compact'\|'full'`, `t` | Exam page, photo/signature doc pages, signature tool, kit upload | Server-renderable SVG version needed (today it is client-only) |
| `PagesToPdfArt` (new SVG) | `maxKb`, `minKb?`, `lang` | Certificate doc pages, PDF tools, images-to-PDF | 64 px tall; Latin digits only, so one SVG serves both languages |
| `BeforeAfterMini` (new SVG; small `HeroArt`) | `fromLabel` ("3 MB"), `toLabel` ("48 KB"), `kind` | Tool empty states | Replaced by `ResultPreview` once a result exists |
| `ResultPreview`, `KbMeter`, `PassCheck`, `ResultPanel`, `ShareButton` (exist) | as now | All tools, kit | Add a `nextStep` slot to `ResultPanel` |
| `NextStepCard` (new) | `lang`, `kind: 'doc'\|'exam-chips'\|'scroll'`, `href?`, `label`, `spec?`, `chips?` | Doc pages (next doc), tool pages (exam chips), home inline | Phone: sticky bottom bar after download; desktop: inline card |
| `DocRow` (extract from `ExamLayout` list) | `index`, `label`, `spec`, `href`, `conditional?: string`, `icon` | Exam page, doc-page "other docs", kit checklist | Shows "only if PwD" instead of the KB value for conditional docs |
| `ExamCard` (exists, extend) | add `status?: {kind:'open'\|'closing'\|'closed', text}` | Home, /exams, related, 404 | Status dot plus text |
| `OpenNowStrip` (new) | `lang`, `presets`, `limit` | /exams, home (optional, under exam path) | Based on `applyWindow` |
| `FilterChips` (exists, inline in `ExamsIndex`) | `groups`, `counts` | /exams | Single row with scroll-x and fade edges on phones |
| `GoalLine`, `Working`, `ErrorBox`, `MoreOptions` (exist, `tools/Flow.tsx`) | as now | All tools | Add GoalLine to `ToolCompressPdf` and the other tools without one |
| `Uploader` (exists, extend) | add `variant: 'photo'\|'pdf'\|'pages'` → labels and icons ("Choose PDF file", "Photograph pages") | All tools, kit | Fixes F7 and F9 |
| `StickyActionBar` (factor out of `ResultPanel`/KitFlow) | `primary`, `secondary?`, `visible` | ResultPanel, NextStepCard, KitFlow | Safe-area aware; hidden ≥ 640 px |

---

## 9. Priority list (impact ÷ effort)

| # | Change | Page | Metric to watch | Effort |
|---|--------|------|-----------------|--------|
| 1 | Reorder the hero: **"Just need a size?" first** with KB chips and a "Choose photo" primary button; exam path second; HeroArt moved under "Most searched" on phones | Home | Bounce 72.8% → < 55%; avg engagement 15 s → > 45 s; `home_path_click` | S (reorder + chips; button links to the tool page with `#pick`) |
| 2 | Next document after download, skipping conditional docs (fixes F6) | Doc pages | `next_doc_click` / `doc_downloaded`; pages per session from doc landings | S |
| 3 | Big-number `AnswerCard` + a single `TrustRow` (fixes F4, F5) | Doc, exam | Engagement time; scroll depth to the tool; organic CTR (Search Console, from bigger snippet relevance) | S–M |
| 4 | PDF tool parity: GoalLine, "Choose PDF file", collapsed settings, auto-run, "Have photos?" link (fixes F9) | /tools/compress-pdf-to-* | `fit_done/tool_used`; `error` rate | S |
| 5 | Certificate uploader variant + `PagesToPdfArt` (fixes F7) | Certificate doc pages, images-to-PDF | `doc_uploaded` → `fit_done` for certificate docs | M |
| 6 | Inline quick-size tool on home (lazy) | Home | `fit_done {from:'home'}` per session | M |
| 7 | `SizeFinder` + collapse the KB chip wall | /tools | /tools exit rate; `tools_hub_click` | S |
| 8 | /exams: search first, one-row chips, `OpenNowStrip` | /exams | `exam_selected` per /exams view | M |
| 9 | `GoodBadExample` on exam and photo/signature doc pages | Exam, doc | Rejection-related FAQ opens ↓; `fit_done` passes on first try | S |
| 10 | Exam CTA "Continue: 2 of 5 done" from saved kit state | Exam | Returning-user `kit_zip_downloaded` | S |

Set up a GA4 exploration segmented by landing page group (home / tools hub / exams hub / exam /
exam-doc / tool). Compare 4-week windows before and after, because ~141 home users per 4 weeks is
too few for per-change A/B tests. Ship #1 alone first so its effect can be read.
