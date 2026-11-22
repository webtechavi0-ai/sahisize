# SahiSize inner pages: "Desk + side rail" spec

Status: **ready to build.** Product design spec for the owner-approved plan (2026-11-22). The build and QA agents
work from this file plus `docs/design/home-redesign-spec.md`, whose tokens, type scale, card, chip, elevation and
dark-mode rules this file reuses. It adds no new colour tokens, fonts or client JS.

Scope: `/exam/[slug]` (main target) and `/hi/exam/[slug]`, `/exam/[slug]/[document]` and its Hindi twin,
`/exams/[family]` (English only today), `/tools/[slug]` and `/hi/tools/[slug]`.
Out of scope: the home page, `/kit/*`, guides, legal, ID pages, `/exams` and `/tools` indexes.

Hard rules this spec keeps: server components + Tailwind only, **no new client component and no new client JS**;
one H1 (text unchanged); `<title>`, meta and JSON-LD unchanged; canonical, breadcrumbs and every existing link and
`data-*` hook kept; WCAG AA (`npm run check:contrast`), tap targets ≥ 48 px; dark mode via `<html data-theme>`;
Hindi parity for every new string; CLS 0 from this change; **no fact that is not in the preset JSON** (no dates
other than `lastChecked`, no countdowns, no deadlines, no invented sizes). Never create `out/` or use
`output: 'export'`; no hand-made `.html`.

---

## 0. What the screenshots show today (`scratchpad/inner/before/`)

| Page @ 1512×900 | Today |
|---|---|
| `/exam/ibps-po` | H1 + 4-line intro (≈ 790 px wide), then a 576 px CTA card. Right ~830 px of the 1416 px content box is empty for the whole first screen. Illustration and source badge come after the card. |
| `/exam/ssc-cgl` | Same: 576 px answer box + embedded tool, right half empty. |
| `/exam/neet-ug` | No top intro (`seo.intro` lives lower), 7-row CTA card, right half empty. |
| `/exam/ibps-po/photo` | Answer box + tool in a 576 px column, right ~840 px empty. |
| `/exams/ibps` | 5-line intro, then the comparison table uses the full width (good). Later prose is one long column. |
| `/tools/compress-image-to-20kb` | The tool already uses the full width (input left, result preview right). Below it the hero art, about, how-to and FAQ sit in an 896 px column with the right third empty. |
| `/hi/exam/ibps-po` | No intro at all (Hindi `examIntro` is null); CTA card at y 211; same empty right half. |

At 390 px all pages already put the action in the first screen; the IBPS PO English intro is 9 lines and pushes
the CTA to y ≈ 520. At 1024 the main column is 960 px wide and the right ~380 px is empty.

Measured content box (`.container-fluid`, max 1920): 358 px @390, 960 px @1024, 1416 px @1512, 1824 px @1920.

---

## 1. The pattern (all four page types)

```
<PageHead>   breadcrumbs · H1 · (one-line intro)                         full width
<RailGrid>
   [main-top]   the page's action block (CTA card / tool / table)        left
   [rail]       <aside data-rail> panel blocks                           right on ≥1024, below main-top on <1024
   [main-rest]  everything else, in today's order                        left
```

One DOM order for every width: **head → main-top → rail → main-rest.** CSS grid places the rail on the right
from 1024 px. On phones and tablets the rail therefore lands directly under the action block (never above the
CTA) and before the long reference content. Heading order, tab order and reading order follow the DOM.

### 1.1 Grid

New server component `src/components/layouts/RailLayout.tsx`:

```tsx
interface RailLayoutProps {
  head: ReactNode;          // breadcrumbs + H1 + intro (full width)
  top: ReactNode;           // action block
  rail: ReactNode | null;   // null/empty → no aside, main is full width (today's layout)
  children: ReactNode;      // main-rest
  railLabel: string;        // aria-label for <aside>
  fit: RailFit;             // sticky bucket, §2
  topFull?: boolean;        // tool + hub pages: main-top spans both columns (§6, §7)
}
```

```tsx
<>
  <div data-page-head className="min-w-0">{head}</div>
  <div
    data-rail-grid
    className="mt-4 grid grid-cols-1 gap-y-6 sm:mt-5
               lg:grid-cols-[minmax(0,1fr)_320px] lg:grid-rows-[auto_1fr] lg:gap-x-8
               xl:grid-cols-[minmax(0,1fr)_360px] xl:gap-x-10
               wide:grid-cols-[minmax(0,1fr)_400px] wide:gap-x-12"
  >
    <div data-main-top className={`min-w-0 lg:col-start-1 lg:row-start-1 ${topFull ? 'lg:col-span-2' : ''}`}>{top}</div>
    <aside data-rail aria-label={railLabel}
      className={`min-w-0 lg:col-start-2 ${topFull ? 'lg:row-start-2' : 'lg:row-start-1 lg:row-span-2'}
                  lg:self-start ${STICKY[fit]}`}>
      {rail}
    </aside>
    <div data-main-rest className={`min-w-0 lg:col-start-1 ${topFull ? 'lg:row-start-2' : 'lg:row-start-2'}`}>{children}</div>
  </div>
</>
```

(`wide` = 1440 px, already in `tailwind.config.cjs`; `sm/md/lg/xl` are Tailwind defaults.)

| Viewport | Content box | Columns | Main column | Rail | Gap |
|---|---|---|---|---|---|
| 360–639 | 328–607 | 1 | 100% | below main-top, 100% | `gap-y-6` (24) |
| 640–1023 | 592–959 | 1 (rail blocks in a 2-col grid from 768, §3.6) | 100% | below main-top | 24 |
| 1024–1279 | 960–1184 | `1fr 320px` | 608–832 | 320 | 32 |
| 1280–1439 | 1184–1344 | `1fr 360px` | 784–944 | 360 | 40 |
| 1440–1919 | 1344–1824 | `1fr 400px` | 896–1376 | 400 | 48 |
| ≥ 1920 | 1824 | `1fr 400px` | 1376 | 400 | 48 |

Inside the main column, long-form text keeps a readable measure: prose blocks (`p`, `RichText`, FAQ answers)
stay `max-w-[72ch]`; cards, tables and grids (CTA card, SpecTable, rejection list, related cards) fill the column.
The current `max-w-xl` / `max-w-3xl` / `max-w-4xl` caps on those wide blocks are removed **from 1024 up only**
(`lg:max-w-none`) so the left column is used, not re-emptied.

The rail column is fixed width; nothing inside it may set a width larger than 100%. `min-w-0` on all three grid
children is mandatory (prevents table/long-word overflow).

### 1.2 PageHead

- Breadcrumbs + H1 unchanged (`text-h1`, H1 text and `<title>` unchanged).
- Full width at every breakpoint, so a long H1 ("SSC CGL Photo Size 2026: Live Photo and Signature Size") stays on
  one line at 1512 and the rail top aligns with the CTA card top, not the H1.
- One-line intro (exam pages, §4.2): `<p data-intro-short className="mt-2 text-lead text-text max-w-[72ch]">`.

---

## 2. Sticky behaviour (CSS only, no JS)

Rule: **the rail is `position: sticky` only when the whole rail fits in the viewport; otherwise it scrolls with the
page (static).** The header is not sticky, so the sticky offset is `top: 24px` (`lg:top-6`).

CSS cannot compare an element's height with the viewport, so the server estimates the rail height and picks one of
six literal class strings that switch sticky on with a `min-height` media query.

`src/components/rail/rail-fit.ts` (pure, unit-tested):

```ts
export type RailFit = 'h720' | 'h800' | 'h900' | 'h1000' | 'h1100' | 'h1200' | 'none';
export const STICKY: Record<RailFit, string> = {
  h720:  'lg:[@media(min-height:720px)]:sticky lg:top-6',
  h800:  'lg:[@media(min-height:800px)]:sticky lg:top-6',
  h900:  'lg:[@media(min-height:900px)]:sticky lg:top-6',
  h1000: 'lg:[@media(min-height:1000px)]:sticky lg:top-6',
  h1100: 'lg:[@media(min-height:1100px)]:sticky lg:top-6',
  h1200: 'lg:[@media(min-height:1200px)]:sticky lg:top-6',
  none:  '',
};
/** Smallest bucket B with estimate + 48 ≤ B (24 px top + 24 px breathing room), else 'none'. */
export function railFit(estimatePx: number): RailFit { … }
```

Estimate = sum of the rendered blocks' heights + 16 px per gap, computed for the **narrowest rail (320 px)** and
multiplied by **1.12 on Hindi pages** (taller Devanagari line height). Block formulas (px, light or dark identical):

| Block | Height formula (320 px rail) |
|---|---|
| Card chrome (every block) | 32 (padding) + 40 (header row incl. `mt-3`) |
| Sizes at a glance | chrome + rows × 120 + (rows − 1) × 8, rows = ⌈tiles / 3⌉ |
| Doc shape (doc page) | chrome + 196 |
| Rejection tips | chrome + n × 92 + (n − 1) × 8 + 48 (see-all link, only when shown) |
| Source | chrome + 96 (+ 24 when unverified) + 48 (link) |
| Related chips | chrome + ⌈n / 2⌉ × 56 + 24 (legend, only when shown) |
| How it works (tool) | chrome + steps × 64 |
| Family source/how (hub) | chrome + 3 × 64 + 72 |
| Art | 320 × 2/3 = 214 (no chrome) |

The build agent **calibrates these constants once** by measuring the real blocks in Playwright at 1024 px
(en and hi) and keeps them in `rail-fit.ts`; a unit test pins `railFit()` for IBPS PO (static at ≤ 1200),
IBPS PO photo page and `/tools/compress-image-to-20kb` (expected to be sticky at 900).

Notes:
- Tailwind 3.4 supports the arbitrary media variant; the strings above are literals in a `.ts` file under
  `src/`, so JIT picks them up (`content` already scans `src/**/*.ts`).
- `lg:self-start` is always on the aside (needed for sticky inside a grid row and harmless when static).
- No `overflow` on the aside or its ancestors (`html` already uses `overflow-x: clip`, which keeps sticky working).
- `prefers-reduced-motion` needs nothing: sticky is not an animation.

Rejected alternatives (for the record): a scrollable rail with `max-height` + `overflow:auto` (inner scrollbar,
keyboard trap risk on cheap trackpads); bottom-anchored sticky (short rails float to the bottom of the screen); a
JS measurement (adds client JS).

---

## 3. Rail blocks (shared)

All blocks live in `src/components/rail/` as server components. Each returns `null` when its data is missing
(§9), so an empty rail is possible; `RailLayout` then omits the `<aside>` and the main column spans the page.

### 3.0 Common block shell

```tsx
<section data-rail-block="sizes" aria-labelledby="rail-sizes-h"
  className="rounded-card border border-rule bg-card p-4 shadow-e1 xl:p-5">
  <h2 id="rail-sizes-h" className="flex items-center gap-2 text-h3">
    <span aria-hidden="true" className="grid h-8 w-8 shrink-0 place-items-center rounded-xl bg-ink-soft text-ink">
      <Icon name="crop" size={18} />
    </span>
    {title}
  </h2>
  <div className="mt-3">…</div>
</section>
```

- Rail wrapper: `<div className="space-y-4">` (16 px between blocks). From 768 to 1023 the wrapper is
  `md:grid md:grid-cols-2 md:gap-4 md:space-y-0` (see §3.6).
- Headings in the rail are **H2s styled `text-h3`** (17 px, 700, `text-heading`), so the outline stays flat:
  H1 → H2 (need/answer) → rail H2s → main-rest H2s. Ids are prefixed `rail-` and must not collide with existing
  ids (`spec-h`, `rej-h`, `rel-h`, `tools-h`, `other-h`, `how-h`, …).
- Icon wells (32 px, `rounded-xl`): sizes `bg-ink-soft text-ink` + `crop`; tips `bg-saffron-soft text-saffron-text`
  + `alert`; source verified `bg-chalk-soft text-chalk` + `badge`, unverified `bg-saffron-soft text-saffron-text` +
  `info`; related `bg-ink-soft text-ink` + `arrowRight`; how-it-works `bg-ink-soft text-ink` + `check`.
- No saffron fills inside the rail (the one saffron primary per screen stays the CTA / Take photo).
- Dark mode: tokens switch automatically; `.card`/`shadow-e1` already get the 1 px `white/6%` ring in dark
  (home spec §1.6). Nothing else.

### 3.1 Sizes at a glance (`data-rail-block="sizes"`, exam pages)

Data: `kitDocuments(p)` (same list and order as the CTA card; `toVerify`/`maxKB:null` docs are already excluded),
plus a leading **live-photo tile** when `p.photoUploadReplacedByLive`.

Grid: `<ul className="grid grid-cols-3 gap-2">` at every rail width (also 3 columns when the block is full width on
phones: tiles stay small and scannable). Max **6 tiles**: if more, tile 6 is a "+N more" tile linking to `#spec-h`.
Before capping, PDF documents with identical `minKB`/`maxKB` collapse into one tile ("{n} PDFs").

**Tile** (each is one link to the document page, `localHref(examDocPath(slug, docSlug(d)), lang)`):

```tsx
<li>
  <a data-size-box data-doc={docSlug(d)} data-shape="fixed|range|kb|live|pdf|more" href={…}
     className="group flex h-full min-h-[120px] flex-col items-center rounded-xl border border-rule bg-band
                px-1.5 pb-2 pt-3 text-center no-underline transition-colors duration-150
                hover:border-ink hover:bg-ink-soft">
    <svg aria-hidden="true" width="72" height="52" viewBox="0 0 72 52" className="shrink-0 overflow-visible">…</svg>
    <span className="mt-2 line-clamp-2 text-[13px] font-semibold leading-snug text-heading">{label}</span>
    {px && <span className="num text-[13px] leading-snug text-muted">{px}</span>}
    <span className="num text-[13px] font-semibold leading-snug text-ink">{kbAndFormat}</span>
  </a>
</li>
```

- `label`: `d.label[lang]` (clamped to 2 lines; the full text is still in the DOM, so the link name is complete).
- `px`: `pxText(d, lang)` ("200×230 px", "min 350×450 px", "≈472×157 px" when `pxDerived` through the existing
  helper); omitted when null.
- `kbAndFormat`: `[kbText(d, lang), d.format.toUpperCase()].join(' · ')` ("20–50 KB · JPG", "up to 500 KB · PDF",
  Hindi "अधिकतम 500 KB · PDF"). Latin digits in Hindi.
- Hindi tiles: `leading-snug` is overridden by the global Hindi rule to ≥ 1.6; the 120 px `min-h` grows.

**Box drawing rules** (`src/components/rail/scale-box.ts`, pure, unit-tested):

The box shows each file's **shape** (aspect ratio), not its relative size: a shared scale would draw IBPS PO's
140×60 signature at 13×5 px next to a 72×36 declaration, which reads as a dot. Each box is fitted into the same
72×52 stage and the pixel numbers underneath carry the size.

```ts
const STAGE_W = 72, STAGE_H = 52, MIN_SIDE = 16;
export function fitBox(w: number, h: number) {
  const s = Math.min(STAGE_W / w, STAGE_H / h);
  let bw = w * s, bh = h * s;
  if (bh < MIN_SIDE) { bh = MIN_SIDE; }            // very wide strips stay visible (ratio > 4.5)
  if (bw < MIN_SIDE) { bw = MIN_SIDE; }            // very tall strips (ratio < 0.31)
  return { w: Math.round(bw), h: Math.round(bh), x: Math.round((STAGE_W - bw) / 2), y: Math.round(STAGE_H - bh) };
}
```

Boxes sit on a common **baseline** (bottom of the stage, `y = 52 − h`) so a row reads like objects on a shelf.
Reference results: 200×230 → 45×52; 240×240 → 52×52; 800×400 → 72×36; 140×60 → 72×31; 472×157 → 72×24;
709×236 → 72×24; 276×354 → 41×52; 276×118 → 72×31; 140×110 → 66×52; 350×150 → 72×31.

| `data-shape` | When | SVG content |
|---|---|---|
| `fixed` | `widthPx` and `heightPx` set | `<rect>` from `fitBox(widthPx, heightPx)`, `rx=3`, `className="fill-card stroke-ink"`, `strokeWidth=2`; inside, a doc glyph (§ below) centred when `h ≥ 28` |
| `range` | no fixed px, but both of `minWidthPx`/`minHeightPx` (or both max) set | same rect from that pair, `strokeDasharray="4 3"` |
| `kb` | image doc with no px at all (KB-only) | neutral 44×52 rect at x 14, `className="fill-band stroke-rule-strong"`, dashed `4 3`, centred `<text>` = format ("JPG") `className="fill-muted text-[11px] font-bold"` |
| `pdf` | `format === 'pdf'` (one doc or a collapsed group) | 40×52 page shape (rect with a 10 px folded corner path) `fill-card stroke-rule-strong`, text "PDF" |
| `live` | `photoUploadReplacedByLive` lead tile | 52×52 circle `fill-ink-soft stroke-ink`, camera glyph; label `site.exams.docShort.photoLive`, KB line replaced by `site.rail.noUpload` |
| `more` | more than 6 tiles | no shape; `text-stat`-style "+N" (`num text-[22px] font-bold text-ink`), label `site.exams.docShort.more`; href `#spec-h` |

Doc glyph (16 px, `stroke-ink` 1.5, `fill-none`, from `Icon` paths): photo → `camera`-free simple head-and-shoulders
path (or `Icon name="name"` if the build agent prefers an existing path); signature → `pen`; thumb / declaration /
certificate / other → `file`. Glyphs are decorative.

`aspect` and `sizeNote` are **not** used for the drawing (they describe our crop choice or an explanation, not a
notice value).

Footer line under the grid: `<p className="mt-3 text-[13px] text-muted">{site.rail.sizesNote}</p>` (always shown
when the block renders).

### 3.2 Why {exam} uploads get rejected (`data-rail-block="tips"`)

Data: `p.rejectionTips` (exam page) or `insights.tips` (doc page). Show the **first 3**.

```tsx
<ol className="space-y-2">
  <li className="rounded-xl bg-band p-3">
    <p className="text-[14px] font-semibold leading-snug text-danger-text line-clamp-2">
      <span className="sr-only">{site.exam.rejectionError}: </span>
      <q lang="en" className="font-mono text-[13px]">{tip.error}</q>
    </p>
    <p className="mt-1 text-[14px] leading-snug text-text line-clamp-3">
      <span className="font-semibold">{site.exam.rejectionFix}:</span> {tip.fix[lang]}
    </p>
  </li>
</ol>
{total > 3 && <a href="#rej-h" className="mt-2 inline-flex min-h-tap items-center gap-1 rounded-xl px-2 -mx-2
   text-[15px] font-semibold text-ink no-underline hover:bg-ink-soft">{site.rail.tipsAll {n}} <Icon arrowRight 16/></a>}
```

- `danger-text` on `band`: 6.2 light / ≥ 9 dark per home §1.4 (`danger-text/paper`); add `['danger-text','band']`
  to `TEXT_PAIRS` in `scripts/contrast-check.ts`.
- The full list (`RejectionTips`, `#rej-h`) stays in main-rest unchanged, so nothing is removed for SEO. The
  see-all link appears only when the page has more than 3 tips **and** `#rej-h` is rendered.
- Error strings stay verbatim English (`lang="en"`) on Hindi pages; fixes use `fix[lang]`.

### 3.3 Source card (`data-rail-block="source"`)

Replaces the `SourceBadge` half of `NoticeBadge` on exam and doc pages (move `data-source-status="verified|unverified"`
onto this `<section>`; `WindowPill` stays in main-rest exactly where `NoticeBadge` is today, rendered via a new
`NoticeBadge` prop `part="window"`). The hub uses its own variant (§7).

```tsx
<dl className="space-y-1 text-[15px]">
  <div><dt className="sr-only">{site.rail.sourceNoticeLabel}</dt>
       <dd className="font-semibold text-heading">{p.notification}{year-suffix as NoticeBadge does}</dd></div>
  {p.sourcePage && <div><dt className="sr-only">…</dt><dd className="text-muted">{site.exam.sourcePage {page}}</dd></div>}
  <div><dt className="sr-only">…</dt><dd className="text-muted">{site.rail.checked {date}}</dd></div>
</dl>
<a href={p.sourceUrl} target="_blank" rel="noopener nofollow external"
   className="btn-secondary mt-3 w-full min-h-[48px] text-[15px]">
  {isPdf ? site.rail.openPdf : site.rail.openNotice}
  <Icon name="external" size={16} aria-hidden />
  <span className="sr-only">{site.rail.newTab}</span>
</a>
```

- `date` = `formatDate(p.lastChecked, lang)` (the only date shown anywhere in the rail).
- `isPdf` = `/\.pdf$/i.test(new URL(p.sourceUrl).pathname)` (18 of 47 presets point to HTML notices today).
- Verified (`isVerifiedPreset(p)`): heading `site.rail.sourceTitle`, chalk well.
- Unverified: heading `site.rail.sourceTitleUnverified`, saffron well, plus
  `<p className="mt-2 rounded-lg bg-saffron-soft p-2 text-[14px] text-text">{site.exam.unverifiedBadge}</p>` above the
  `dl`, and the link text `site.exam.secondarySource`.
- `rel`: `noopener` as required, plus the site's existing `nofollow external` (same as `NoticeBadge`).
- `p.extraSources` are not shown in the rail (they stay on `/sources`).

### 3.4 Also applying for…? (`data-rail-block="related"`)

Data: the same list `RelatedExams` computes today (move that logic into `relatedExamsFor(p)` in
`src/server/content/` and use it in both places): `p.related` → published presets, topped up with same-group exams
to ≥ 3, max **6** chips here.

```tsx
<ul className="grid grid-cols-2 gap-2">
  <li><a href={localHref(`/exam/${x.slug}`, lang)} data-related-chip={x.slug}
         className="chip w-full justify-between gap-1">
      <span className="min-w-0 truncate" lang={lang === 'hi' ? 'en' : undefined}>{latinTitleName(x)}</span>
      {same && <><Icon name="check" size={16} className="shrink-0 text-chalk" aria-hidden />
               <span className="sr-only">{site.rail.sameSr}</span></>}
  </a></li>
</ul>
{anySame && <p className="mt-2 text-[13px] text-muted"><Icon check 14 inline text-chalk/> {site.rail.sameLegend {exam}}</p>}
```

- Chip label: the Latin short code (`latinTitleName`) on both languages, as the home exam chips do (owner default
  ON, home spec §6.3); Hindi full name in `title`.
- **"Same" mark is computed, never asserted:** `sameUploads(a, b)` is true only when both exams have a `photo` and a
  `signature` kit document and, for each, `widthPx`, `heightPx`, `minKB`, `maxKB` and `format` are all equal.
  (IBPS PO vs IBPS Clerk/SO/RRB PO/SBI PO → true; SSC CGL vs RRB NTPC → false.)
- Heading avoids claiming "same uploads" for all chips: see copy §8.

### 3.5 Art (`data-rail-block="art"`)

```tsx
<RouteHero route={artRoute} lang={lang}
  className="overflow-hidden rounded-card"
  imgClassName="h-auto w-full rounded-card"
  sizes="(min-width:1440px) 400px, (min-width:1280px) 360px, (min-width:1024px) 320px, (min-width:768px) 50vw, 100vw" />
```

- `artRoute` fallback chain (first that has an approved hero): the page's own English route → (exam and doc pages)
  `/exam/{slug}` → `familyOf(p)?.path`. No new placeholder when none exists: the block is omitted.
- Group art for the families that have no image yet (banking, railway, teaching…) needs **no code**: one manifest
  slot can list many routes, so a "banking" hero slot simply lists every banking exam route (the "one hero per
  route" check still holds). That is an image task, not part of this build.
- Lazy (no `priority`); width/height from the manifest (CLS 0); dark plate classes come from `RouteHero`.
- The existing in-flow `RouteHero` calls in `ExamLayout`, the family hub and `ToolLayout` are **removed** (moved
  here), so each page still has at most one hero image.
- Last block in the rail at every width.

### 3.6 Rail at < 1024

- Phones (< 768): blocks stacked full width, order as listed per page; `space-y-4`.
- Tablets (768–1023): `md:grid md:grid-cols-2 md:gap-4`. Placement rules: sizes / doc-shape and source share the
  first row; tips `md:col-span-2`; related and art share the next row; how-it-works (tool) `md:col-span-2`. A block
  that renders alone in its row gets `md:col-span-2`. (Implement by giving each block a `wide` prop that adds
  `md:col-span-2`, decided server-side from which blocks rendered.)

---

## 4. Exam page `/exam/[slug]` and `/hi/exam/[slug]` (`ExamLayout.tsx`)

### 4.1 Mapping

| Slot | Content (existing components unless marked new) |
|---|---|
| head | `Feedback`, Breadcrumbs, H1, **new** `data-intro-short` line |
| main-top | live answer `dl` (if `photoUploadReplacedByLive`), embedded `KitSlot` (one-doc exams) **or** the CTA card `[data-exam-start]` |
| rail | Sizes (§3.1) → Tips (§3.2) → Source (§3.3) → Related (§3.4) → Art (§3.5) |
| main-rest | full intro paragraph `data-exam-intro` (moved, §4.2) / `seo.intro`, `WindowPill`, season note, `LiveCaptureTips`, spec section `#spec-h` + `RouteImages`, `RejectionTips #rej-h`, `DeclarationText`, `ExamCopy`, `FaqList`, tools `#tools-h`, family link, `RelatedExams #rel-h`, `ExamSelectTracker` |

`railLabel` = `site.rail.examLabel {exam}`.

### 4.2 Intro: one line on the first screen, full text kept

New `examIntroShort(p, lang)` in `src/server/content/exam-meta.ts` (built from preset data only):

| Case | en | hi |
|---|---|---|
| photo upload, n kit docs > 1 | `IBPS PO photo: 200×230 px, 20–50 KB, JPG. All 5 uploads below.` | `IBPS PO फोटो: 200×230 px, 20–50 KB, JPG। सभी 5 अपलोड नीचे हैं।` |
| photo upload, n = 1 | `{exam} photo: {summary}.` | `{exam} फोटो: {summary}।` |
| live photo (`photoUploadReplacedByLive`) | `SSC CGL photo: taken live in the form, no upload. Signature: 472×157 px, 10–20 KB, JPG.` (second sentence = first kit doc; omitted when none) | `SSC CGL फोटो: फॉर्म में लाइव ली जाती है, अपलोड नहीं। हस्ताक्षर: 472×157 px, 10–20 KB, JPG।` |
| no photo doc (e.g. BPSC: signatures + PDF) | `{exam} {first doc label lower}: {summary}. All {n} uploads below.` | `{exam} {label}: {summary}। सभी {n} अपलोड नीचे हैं।` |
| no kit docs | no line | no line |

- `{exam}` = `examShortName(p)` (Latin on both languages, matches the Hindi H1 "IBPS PO फोटो साइज़…").
- `{summary}` = `verifiedSummary(doc, lang)` with ` · ` replaced by `, ` (KB-only photo: "NEET UG photo: 10–200 KB,
  JPG. All 7 uploads below.").
- Element: `<p data-intro-short className="mt-2 max-w-[72ch] text-lead">`. At 390 en it is 2 lines.
- The existing long `examIntro` sentence moves to the top of main-rest as
  `<p data-exam-intro className="max-w-[72ch] text-lead">` (same place `seo.intro` renders today; at most one of
  the two exists per page). No sentence is deleted.

### 4.3 CTA card (main-top)

- Keep markup, ids and hooks (`data-exam-start`, `#need-h`, `data-exam-select`).
- Width: `max-w-xl lg:max-w-none` (fills the main column on desktop).
- From 1024: button row `lg:flex lg:items-center lg:gap-4`: button `lg:w-auto lg:min-w-[320px] lg:px-8`, note
  (`ctaNote`) beside it `lg:mt-0 lg:text-left`.
- From 1280, the document list is two columns: `<ul className="mt-1 divide-y divide-rule xl:grid xl:grid-cols-2
  xl:gap-x-6 xl:divide-y-0">` and each `<li>` `xl:border-b xl:border-rule` (an odd last item spans nothing; leave
  the cell empty). This shortens IBPS PO's card from 5 to 3 rows and NEET's from 7 to 4.
- Number badges: `bg-saffron-soft text-ink` → `bg-ink-soft text-ink` (saffron fill reserved for the button).

### 4.4 Removed from the main column (moved, not deleted)

`RouteHero` (→ rail art) and `SourceBadge` (→ rail source card). Nothing else moves.

---

## 5. Exam document page `/exam/[slug]/[document]` and Hindi twin

Files: `src/app/(en)/exam/[slug]/[document]/page.tsx`, `src/app/hi/exam/[slug]/[document]/page.tsx`. Both get the
same structure; extract the shared JSX into `src/features/exam-document/DocPageBody.tsx` while doing it (they are
near-duplicates today).

| Slot | Content |
|---|---|
| head | Breadcrumbs, H1, lead `meta.lead` (already one line, unchanged) |
| main-top | `DocAnswerBox` (`max-w-xl lg:max-w-none`), tool section `[data-doc-tool]` (KitSlot + GuideLink, `max-w-xl` kept: the tool is designed for that width) |
| rail | **Doc shape** (§5.1) → Tips (`insights.tips`, §3.2) → Source (§3.3) → **Other documents** (`DocOtherChips`, moved, §5.2) → Art (§3.5) |
| main-rest | live note, rules `#spec-h` + images + capture tip, about `#about-h`, `RejectionTips` (full), FAQ, `DocRelated`, bottom actions |

`railLabel` = `site.rail.docLabel {exam} {doc}`.

### 5.1 Doc shape block (`data-rail-block="doc-shape"`)

Heading: `site.rail.shapeTitle {doc}`. Content: one large SVG, `viewBox="0 0 240 168"`, `width="100%"`,
`className="h-auto max-w-[280px] mx-auto block"`:
- Stage 200×132 at (20, 24). Box = `fitBox` scaled to that stage (same function with `STAGE_W=200, STAGE_H=132,
  MIN_SIDE=24`), centred horizontally, bottom-aligned.
- Rect `fill-card stroke-ink` 2.5, `rx=4`; glyph 28 px centred.
- Dimension marks for `fixed`/`range`: a 1 px `stroke-rule-strong` line 10 px above the box with end ticks and the
  label `{widthPx} px` centred above it; a vertical line 10 px right of the box with the label `{heightPx} px`
  (horizontal text, left-aligned next to the line's midpoint). Labels `className="fill-muted"` 12 px, `num`.
- `kb` / `pdf`: the neutral shape from §3.1 scaled ×2.5, label `site.rail.anyPixels` under it.
- Under the SVG: `<p className="num mt-2 text-center text-[15px] font-semibold text-ink">{kbAndFormat}</p>`; when
  `d.dpi`: `<p className="text-center text-[13px] text-muted">{d.dpi} DPI</p>`.
- The block is `aria-hidden` on the SVG only; the text lines are real text (they repeat the answer box, which is
  fine: they are the caption of the drawing).

### 5.2 Other documents (moved `DocOtherChips`)

- Rendered inside the rail with the block shell (§3.0), keeps `<nav aria-labelledby="other-h">` and `id="other-h"`
  (no `rail-` prefix: it is the same element moved, not a copy). Heading text unchanged
  (`site.doc.otherDocs {exam}`).
- Next-doc link stays first; chips become `.chip w-full` in `grid grid-cols-1 gap-2` (rail is narrow; long labels
  like "Class 10 (SSC/SSLC) certificate" must not truncate), each chip also showing `kbAndFormat` in
  `text-[13px] text-muted` on the right.

---

## 6. Tool page `/tools/[slug]` and `/hi/tools/[slug]` (`ToolLayout.tsx`)

The tool already uses the full width (input + result preview side by side from 1024), so **main-top spans both
columns** (`topFull`). The rail starts beside the prose.

| Slot | Content |
|---|---|
| head | Breadcrumbs, H1, intro (unchanged; tool intros are 2–3 lines and the tool is already in the first screen) |
| main-top (full width) | `[data-tool-slot]` |
| rail | **How it works** (`#how-h` section moved, §6.1) → **Related** (§6.2) → Art (route hero, moved) |
| main-rest | `content` (ToolContent), FAQ, exam links `#tex-h`, guides `#tgd-h`, all-tools link |

`railLabel` = `site.rail.toolLabel`. The `max-w-4xl` wrapper on main-rest becomes `max-w-none` (prose inside keeps
72ch via §1.1).

### 6.1 How it works

Moves the existing `steps` list (same `id="how-h"`, same text, HowTo JSON-LD untouched) into the rail shell:
`<ol className="space-y-3">`, each `<li className="flex gap-3">` with a 28 px number disc
(`grid h-7 w-7 shrink-0 place-items-center rounded-full bg-ink-soft text-sm font-bold text-ink num`) and
`<p className="text-[15px]"><strong className="text-heading">{name}.</strong> {text}</p>`. All steps are shown
(copy has 3–4); no truncation. Hidden when `steps` is empty.

### 6.2 Related sizes / tools (`data-rail-block="related-tools"`)

New `relatedToolLinks(slug, lang)` in `src/server/content/tool-copy.ts`, from `parseToolSlug`:

| Page kind | Title | Chips (max 8, exclude self, only slugs in `toolSlugs(lang)`) |
|---|---|---|
| `compress-kb` | `site.rail.otherSizes` | other `COMPRESS_KB_TARGETS`, nearest first by \|log(kb/self)\|, label "{n} KB", sorted ascending for display |
| `compress-range` | `site.rail.otherSizes` | same as above (nearest to the range max) |
| `compress-pdf-kb` / `jpg-pdf-kb` | `site.rail.otherSizes` | other targets of the same kind, label "{n} KB PDF" |
| everything else | `site.rail.otherTools` | `photo-size-converter-in-kb`, `signature-resize`, `thumb-impression`, `handwritten-declaration`, `compress-pdf`, `resize-image` (localised names via `toolNameKey`) |

Chips: `grid grid-cols-2 gap-2`, `.chip w-full num`. Hidden when the list is empty.

---

## 7. Family hub `/exams/[family]` (English only today)

The comparison table is the answer and needs ≥ 640 px, so **main-top spans both columns** (`topFull`).

| Slot | Content |
|---|---|
| head | Breadcrumbs, H1, intro (unchanged), live note |
| main-top (full width) | comparison table `#cmp-h` |
| rail | **Sources and how-to** (§7.1) → **Exams in this family** (§7.2) → Art (hub hero, moved) |
| main-rest | RichText body, RouteImages, links `#links-h` + tools, FAQ, all-exams link |

`railLabel` = `site.rail.hubLabel {family}`.

### 7.1 Sources and how-to (`data-rail-block="hub-source"`)

- Line 1: `site.rail.hubSources {n} {date}` where n = members with `isVerifiedPreset`, date = latest `lastChecked`
  among members (formatDate). When n = 0, use `site.rail.hubSourcesNone`.
- `<a href="/sources" className="btn-secondary mt-3 w-full min-h-[48px]">{site.rail.allSources}</a>`.
- Then 3 numbered steps (same disc style as §6.1): `site.rail.hubStep1..3`.

### 7.2 Exams in this family (`data-rail-block="members"`)

`<ul className="grid grid-cols-1 gap-2">`, each `<a className="chip w-full justify-between">`: left
`examShortName(p)` (`font-semibold`), right the photo spec `text-[13px] font-normal text-muted num`
(`verifiedSummary(photo)` short form "20–50 KB · JPG", or `site.hub.livePhoto`). Max 8; when more, a text-link
button "All {n} {family} exams →" to `#links-h`.

---

## 8. Copy (new keys; en + hi in the same commit, `npm run i18n:check` passes)

All under a new `site.rail` object in `src/i18n/messages/{en,hi}/site.json`, plus two under `site.exam`.

| Key | English | Hindi |
|---|---|---|
| `site.exam.introShort` | `{exam} {doc}: {summary}.` | `{exam} {doc}: {summary}।` |
| `site.exam.introShortAll` | `All {n} uploads below.` | `सभी {n} अपलोड नीचे हैं।` |
| `site.exam.introShortLive` | `{exam} photo: taken live in the form, no upload.` | `{exam} फोटो: फॉर्म में लाइव ली जाती है, अपलोड नहीं।` |
| `site.rail.examLabel` | `{exam} uploads at a glance` | `{exam} अपलोड एक नज़र में` |
| `site.rail.docLabel` | `{exam} {doc} at a glance` | `{exam} {doc} एक नज़र में` |
| `site.rail.toolLabel` | `About this tool` | `इस टूल के बारे में` |
| `site.rail.hubLabel` | `{family} exams at a glance` | `{family} परीक्षाएँ एक नज़र में` |
| `site.rail.sizesTitle` | `Sizes at a glance` | `सभी साइज़ एक नज़र में` |
| `site.rail.sizesNote` | `Boxes show each file's shape. Tap one to make it.` | `बॉक्स हर फाइल का आकार दिखाते हैं। बनाने के लिए टैप करें।` |
| `site.rail.noUpload` | `No upload` | `अपलोड नहीं` |
| `site.rail.pdfGroup` | `{n} PDFs` | `{n} PDF` |
| `site.rail.anyPixels` | `Any pixel size` | `कोई भी पिक्सल साइज़` |
| `site.rail.shapeTitle` | `Shape of your {doc}` | `आपकी {doc} का आकार` |
| `site.rail.tipsTitle` | `Why {exam} uploads get rejected` | `{exam} अपलोड क्यों रिजेक्ट होते हैं` |
| `site.rail.tipsAll` | `See all {n} errors and fixes` | `सभी {n} एरर और हल देखें` |
| `site.rail.sourceTitle` | `Where these sizes come from` | `ये साइज़ कहाँ से हैं` |
| `site.rail.sourceTitleUnverified` | `Not yet checked against the notice` | `नोटिस से अभी जाँचा नहीं गया` |
| `site.rail.sourceNoticeLabel` | `Official notice` | `आधिकारिक नोटिस` |
| `site.rail.checked` | `Checked {date}` | `{date} को जाँचा` |
| `site.rail.openPdf` | `Open official PDF` | `आधिकारिक PDF खोलें` |
| `site.rail.openNotice` | `Open official notice` | `आधिकारिक नोटिस खोलें` |
| `site.rail.newTab` | `(opens in a new tab)` | `(नए टैब में खुलेगा)` |
| `site.rail.relatedTitle` | `Also applying for these?` | `इनका फॉर्म भी भर रहे हैं?` |
| `site.rail.sameSr` | `same photo and signature size` | `फोटो और सिग्नेचर साइज़ एक जैसा` |
| `site.rail.sameLegend` | `Same photo and signature size as {exam}` | `{exam} जैसा ही फोटो और सिग्नेचर साइज़` |
| `site.rail.otherSizes` | `Other KB sizes` | `दूसरे KB साइज़` |
| `site.rail.otherTools` | `Other tools` | `दूसरे टूल` |
| `site.rail.hubSources` | `Sizes from {n} official notices, last checked {date}.` | `{n} आधिकारिक नोटिस से साइज़, आखिरी जाँच {date}।` |
| `site.rail.hubSourcesNone` | `Sizes from secondary sources. Check each notice before uploading.` | `साइज़ दूसरे सोर्स से हैं। अपलोड से पहले हर नोटिस देखें।` |
| `site.rail.allSources` | `See all sources` | `सभी सोर्स देखें` |
| `site.rail.hubTitle` | `Sources and how it works` | `सोर्स और यह कैसे काम करता है` |
| `site.rail.hubStep1` | `Pick your exam below.` | `नीचे अपनी परीक्षा चुनें।` |
| `site.rail.hubStep2` | `Add your photo, signature and other files.` | `अपनी फोटो, सिग्नेचर और बाकी फाइलें जोड़ें।` |
| `site.rail.hubStep3` | `Download files that match the notice.` | `नोटिस से मेल खाती फाइलें डाउनलोड करें।` |
| `site.rail.membersTitle` | `{family} exams` | `{family} परीक्षाएँ` |
| `site.rail.membersAll` | `All {n} {family} exams` | `सभी {n} {family} परीक्षाएँ` |

Reused keys: `site.exam.rejectionError`, `rejectionFix`, `sourcePage`, `unverifiedBadge`, `secondarySource`,
`site.exams.docShort.photoLive`, `site.exams.docShort.more`, `site.doc.otherDocs`, `site.tool.howTitle`,
`site.hub.livePhoto`. `{doc}` in Hindi uses `d.label.hi`; in English `lowerLabel(d.label.en)` mid-sentence.

---

## 9. Empty-data rules (each block decides alone; no placeholder boxes ever)

| Block | Hidden when |
|---|---|
| Sizes | `kitDocuments(p)` empty **and** not `photoUploadReplacedByLive` (e.g. Haryana Police, RPSC RAS: all `toVerify`) |
| Doc shape | never on a doc page (doc pages exist only for fittable docs); shape falls back to `kb`/`pdf` |
| Tips | tip list empty (11 presets have none: BPSC CCE/TRE, GATE, Haryana Police, HPSC HCS, Army Agniveer, MP/Rajasthan/UP Police, RPSC RAS, UKPSC); see-all link hidden when ≤ 3 tips |
| Source | `sourceUrl` empty (never today); unverified presets show the unverified variant, never hide |
| Related | fewer than 1 published related/same-group exam; legend hidden when no chip is "same" |
| How it works | `steps` empty |
| Related tools | list empty after filtering to published slugs |
| Hub source/how | never (copy is generic; numbers from members) |
| Members | fewer than 2 members (cannot happen: hubs need ≥ `minSize`) |
| Art | no approved hero on the route chain |
| Whole rail | all blocks hidden → no `<aside>`, main spans both columns |

No block shows `applyWindow`, `seasonMonths`, cycles as dates, or any "last date" text. The existing `WindowPill`
stays where it is in main-rest (it already exists and is not part of the rail).

---

## 10. Wireframes

### 10.1 `/exam/ibps-po` @ 390 × 844 (light)

```
┌──────────────────────────────────────┐ 0
│ [✓] SahiSize          🔍  हिं  ☾  ☰  │ 56
├──────────────────────────────────────┤
│ ← Exams › IBPS exams                  │ ~104
│ IBPS PO Photo Size 2026,              │ H1, 2 lines
│ Signature and Thumb Size              │ ~195
│ IBPS PO photo: 200×230 px, 20–50 KB,  │ intro-short, 2 lines
│ JPG. All 5 uploads below.             │ ~250
│ ┌──────────────────────────────────┐ │
│ │ [ Make my IBPS PO files  → ]     │ │ CTA bottom ≤ 420
│ │ Free · works on your phone · 5min│ │
│ │ Documents to upload              │ │
│ │ ① Photograph   20–50 KB · JPG  → │ │
│ │ ② Signature    10–20 KB · JPG  → │ │ ← first screen ends ~844
│ │ … ⑤                              │ │
│ └──────────────────────────────────┘ │
│ ┌ ⌗ Sizes at a glance ─────────────┐ │ rail starts here (below list)
│ │ ▭     ▭      ▭                   │ │
│ │ Photo Sign.  Thumb               │ │
│ │ ▭     📄                         │ │
│ │ Decl. Class 10                   │ │
│ └──────────────────────────────────┘ │
│ ┌ ⚠ Why IBPS PO uploads get rejected┐ │
│ │ "Invalid file size"  Fix: …       │ │ ×3
│ │ See all 6 errors and fixes →      │ │
│ └──────────────────────────────────┘ │
│ ┌ ✓ Where these sizes come from ───┐ │
│ │ CRP PO/MT-XVI · page 39 · Checked │ │
│ │ [ Open official PDF ↗ ]           │ │
│ └──────────────────────────────────┘ │
│ ┌ → Also applying for these? ──────┐ │
│ │ [IBPS Clerk ✓] [SBI PO ✓]         │ │
│ │ [IBPS RRB PO ✓][IBPS SO ✓]        │ │
│ └──────────────────────────────────┘ │
│ [ illustration, if published ]       │
│ full intro paragraph · spec · tips … │ main-rest
```

### 10.2 `/exam/ibps-po` @ 1024 × 768

```
┌────────────────────────────────────────────────────────────────────────────┐
│ [✓] SahiSize     Exams Tools Govt ID Guides   [🔍 Search your exam]  हिं ☾ │ 64
├────────────────────────────────────────────────────────────────────────────┤
│ Home › Exams › IBPS exams › IBPS PO                                         │
│ IBPS PO Photo Size 2026, Signature and Thumb Size            (full width)   │
│ IBPS PO photo: 200×230 px, 20–50 KB, JPG. All 5 uploads below.             │
│ ┌──────────── main 608 ─────────────────┐ 32 ┌──── rail 320 ────────────┐  │
│ │ [Make my IBPS PO files →] Free · 5 min│    │ ⌗ Sizes at a glance       │  │
│ │ Documents to upload                   │    │ ▭  ▭  ▭                   │  │
│ │ ① Photograph        20–50 KB · JPG  → │    │ ▭  📄                     │  │
│ │ ② Signature         10–20 KB · JPG  → │    ├───────────────────────────┤  │
│ │ ③ Left thumb        20–50 KB · JPG  → │    │ ⚠ Why IBPS PO uploads …   │  │
│ │ ④ Declaration      50–100 KB · JPG  → │    │  3 errors + See all 6 →   │  │
│ │ ⑤ Class 10 cert.  up to 500 KB · PDF→ │    ├───────────────────────────┤  │
│ └───────────────────────────────────────┘    │ ✓ Where these sizes …     │  │
│ Full intro paragraph (72ch)                  │ [Open official PDF ↗]     │  │
│ Live photo note · spec table (scrolls in     ├───────────────────────────┤  │
│ its own region if wider than 608) …          │ → Also applying for…      │  │
│                                              │ [art 320×213]             │  │
│                                              └───────────────────────────┘  │
```
Rail is static here (estimate > 768 − 48).

### 10.3 `/exam/ibps-po` @ 1512 × 900

```
┌──────────────────────────────────────────────────────────────────────────────────────────────┐
│ [✓] SahiSize                         Exams Tools Govt ID Guides  [🔍 Search your exam]  हिं ☾  │
├──────────────────────────────────────────────────────────────────────────────────────────────┤
│ Home › Exams › IBPS exams › IBPS PO                                                           │
│ IBPS PO Photo Size 2026, Signature and Thumb Size                                             │
│ IBPS PO photo: 200×230 px, 20–50 KB, JPG. All 5 uploads below.                               │
│ ┌──────────────────────── main 968 ────────────────────────────┐ 48 ┌──── rail 400 ─────────┐ │
│ │ [ Make my IBPS PO files → ]  Free · works on your phone · 5m │    │ ⌗ Sizes at a glance   │ │
│ │ Documents to upload                                          │    │  ▯45×52  ▭72×31 ■52   │ │
│ │ ① Photograph  20–50 KB · JPG →  ② Signature 10–20 KB · JPG → │    │  Photo   Sign.  Thumb │ │
│ │ ③ Left thumb  20–50 KB · JPG →  ④ Declaration 50–100 KB  →   │    │  ▭72×36  📄            │ │
│ │ ⑤ Class 10 certificate  up to 500 KB · PDF →                 │    │  Decl.  Class 10      │ │
│ └──────────────────────────────────────────────────────────────┘    ├───────────────────────┤ │
│ IBPS PO photo size 2026: 200×230 px… (full intro, 72ch)             │ ⚠ Why IBPS PO uploads │ │
│ [Form-window pill if preset has one] · season note                  │ "Invalid file size" … │ │
│ ┌ Live photo is taken too ─────────────────────────────────────┐    │ See all 6 →           │ │
│ …                                                                   ├───────────────────────┤ │
│                                                                     │ ✓ Where these sizes … │ │
│                                                                     │ [Open official PDF ↗] │ │
│                                                                     ├───────────────────────┤ │
│                                                                     │ → Also applying for…  │ │
│                                                                     │ [art 400×267]         │ │
│                                                                     └───────────────────────┘ │
```
First screen: CTA, all 5 documents and the sizes block are visible; nothing on the right is empty.

### 10.4 Doc page `/exam/ibps-po/photo` @ 1512 (rail sticky when it fits)

```
│ IBPS PO Photo Size 2026                                                                       │
│ IBPS PO asks for the photograph as a JPG file of 200×230 px and 20–50 KB. Add yours below…    │
│ ┌──── main ────────────────────────────────────────────────────┐    ┌──── rail 400 ─────────┐ │
│ │ IBPS PO photograph size at a glance (dl, full width)         │    │ Shape of your photo   │ │
│ │ Add your Photograph  [Take photo] [Choose from gallery]       │    │   ├─200 px─┤          │ │
│ │ (tool, max-w-xl)                                              │    │   ┌──────┐ ┬          │ │
│ │                                                              │    │   │  👤  │ 230 px    │ │
│ │                                                              │    │   └──────┘ ┴          │ │
│ │                                                              │    │ 20–50 KB · JPG · 200DPI│ │
│ │                                                              │    │ ⚠ tips (photo only)   │ │
│ │                                                              │    │ ✓ source              │ │
│ │                                                              │    │ Other IBPS PO docs    │ │
```

### 10.5 Tool page @ 1512

```
│ 20 KB photo size: compress image to 20 KB                                                     │
│ intro (2–3 lines)                                                                             │
│ ┌──────────── tool (full width, own 2 columns: input | result preview) ───────────────────┐  │
│ └──────────────────────────────────────────────────────────────────────────────────────────┘  │
│ ┌──── main: About this tool… / FAQ / Exams / Guides ───────────┐    ┌──── rail 400 ─────────┐ │
│ │                                                              │    │ ✓ How to use it 1·2·3 │ │
│ │                                                              │    │ Other KB sizes        │ │
│ │                                                              │    │ [10][15][30][50]…     │ │
│ │                                                              │    │ [art]                 │ │
```

Hub @ 1512: same as the tool page with the comparison table as the full-width top.

---

## 11. Files to touch

| File | Change |
|---|---|
| `src/components/layouts/RailLayout.tsx` (new) | grid, §1.1 |
| `src/components/rail/{SizesAtGlance,DocShape,RailTips,RailSource,RailRelated,RailArt,RailSteps,RailLinks,HubSource,HubMembers,BlockShell}.tsx` (new) | blocks, §3, §5–7 |
| `src/components/rail/scale-box.ts`, `rail-fit.ts` (new) + `__tests__` | §3.1, §2 |
| `src/components/layouts/ExamLayout.tsx` | §4 |
| `src/app/(en)/exam/[slug]/[document]/page.tsx`, `src/app/hi/exam/[slug]/[document]/page.tsx`, `src/features/exam-document/DocPageBody.tsx` (new), `DocAnswer.tsx` | §5 |
| `src/app/(en)/exams/[family]/page.tsx` | §7 |
| `src/components/layouts/ToolLayout.tsx` | §6 |
| `src/components/site/NoticeBadge.tsx` | `part?: 'all' \| 'source' \| 'window'` |
| `src/components/site/RelatedExams.tsx`, `src/server/content/` | extract `relatedExamsFor`, add `sameUploads`, `examIntroShort`, `relatedToolLinks` |
| `src/i18n/messages/{en,hi}/site.json` | §8 |
| `scripts/contrast-check.ts` | add `['danger-text','band']` |

---

## 12. Acceptance criteria (QA from screenshots + DOM)

Setup: `npm run build` once; `PORT=<p> HOSTNAME=127.0.0.1 node .next/standalone/server.js`. Shoot `/exam/ibps-po`,
`/exam/ssc-cgl`, `/exam/neet-ug`, `/exam/haryana-police`, `/exam/ibps-po/photo`, `/exam/ssc-cgl/signature`,
`/exams/ibps`, `/tools/compress-image-to-20kb`, `/tools/signature-resize`, `/hi/exam/ibps-po`,
`/hi/exam/ibps-po/photo`, `/hi/tools/compress-image-to-20kb` at 360×780, 390×844, 768×1024, 1024×768, 1280×800,
1512×900, 1920×1080, light; 390 and 1512 dark (dark: `localStorage['sahisize:theme']='dark'` via addInitScript).

**Layout**
1. No horizontal page scroll anywhere: `document.documentElement.scrollWidth === innerWidth` on every shot. Tables
   may scroll only inside their own `role="region"` wrapper.
2. ≥ 1024: `[data-rail]` exists (except pages where every block is empty), is visible, and
   `rail.left ≥ mainTop.right + 31`; `rail.width` = 320 (1024–1279), 360 (1280–1439), 400 (≥ 1440) ± 1.
3. ≥ 1024, exam and doc pages: `|rail.top − mainTop.top| ≤ 1`. Tool and hub pages: `rail.top ≥ mainTop.bottom`.
4. < 1024: `rail.left === mainTop.left` (± 1), `rail.top ≥ mainTop.bottom + 16`, and `rail.top < mainRest.top`.
   On exam pages the rail starts below the last `#need-h` list item, never above the CTA.
5. 768–1023: rail blocks form a 2-column grid (at least two `[data-rail-block]` share a `top` value).
6. 1512×900 `/exam/ibps-po`: in the first screen (`top < 900`) there are the CTA, all 5 document rows and the
   whole Sizes block; the region right of the main column is not empty (rail covers ≥ 60% of the first-screen
   height below the H1).

**First screen / CTA**
7. 390×844: `[data-exam-start] a.btn-action` bottom ≤ 420 (en) and ≤ 460 (hi) on `/exam/ibps-po`; the
   `[data-tool-slot]`/`[data-doc-tool]` "Take photo" button bottom ≤ 844 on doc and tool pages (unchanged or better
   than today).
8. `[data-intro-short]` exists on exam pages with kit docs, is ≤ 2 lines at 390 en (≤ 3 hi), contains the photo
   KB text from the preset; `[data-exam-intro]` or the `seo.intro` paragraph still exists in the DOM with the full
   sentence (string compare with the pre-change HTML).
9. Exactly one saffron-filled element (`bg-saffron` computed) in the first screen at every width.

**Sticky**
10. < 1024: `getComputedStyle(rail).position === 'static'`.
11. ≥ 1024: if `position === 'sticky'` then `rail.getBoundingClientRect().height + 48 ≤ innerHeight`. Scroll to
    50% of the page: a sticky rail's top is 24 ± 1 px; a static rail has scrolled out.
12. `/exam/ibps-po/photo` and `/tools/compress-image-to-20kb` at 1512×900 are sticky (calibration target);
    `/exam/ibps-po` at 1512×900 is static.

**Blocks and data**
13. Sizes tiles on `/exam/ibps-po`: 5 tiles; SVG rect sizes 45×52, 72×31, 52×52, 72×36 (± 1) and one `pdf`
    shape; every rect bottom at y = 52; each tile links to `/exam/ibps-po/{doc}`.
14. `/exam/ssc-cgl`: first tile `data-shape="live"`, second `fixed` 72×24. `/exam/neet-ug`: all `kb`/`pdf`
    shapes, ≤ 6 tiles (PDF group or "+N more").
15. `/exam/haryana-police`: no Sizes block, no Tips block; Source block present.
16. Tips: ≤ 3 items, error text in `q[lang=en]`; see-all link `href="#rej-h"` present iff > 3 tips; `#rej-h`
    section still lists all tips.
17. Source: link has `target="_blank"` and `rel` contains `noopener`; text "Open official PDF" iff the URL path ends
    in `.pdf`; `data-source-status` is on the rail source block and appears once per page.
18. Related: ✓ only where `sameUploads` is true (IBPS PO → IBPS Clerk ✓; SSC CGL → RRB NTPC no ✓).
19. No text matching `/last date|deadline|days left|closes on|अंतिम तिथि/i` inside `[data-rail]`.
20. Exactly one `[data-route-hero]` per page, and on ≥ 1024 it is inside `[data-rail]`.

**SEO and structure**
21. One `h1`, text identical to before; `<title>`, meta description, canonical, hreflang and JSON-LD byte-identical
    to the pre-change build for every shot page.
22. Every `href` present before is still present (set compare of all `a[href]`); every id used before
    (`need-h`, `spec-h`, `rej-h`, `rel-h`, `tools-h`, `other-h`, `how-h`, `cmp-h`, `links-h`, `faq-h`, `answer-h`,
    `about-h`, `tex-h`, `tgd-h`, `copy-h`, `decl-h`, `live-h`) still exists once; no duplicate ids.
23. Hooks kept: `data-exam-start`, `data-exam-select`, `data-answer-box`, `data-doc-tool`, `data-tool-slot`,
    `data-source-status`, `data-apply-window`, `data-route-hero`, `data-route-images`, `data-season-note`.
    New: `data-rail`, `data-rail-grid`, `data-main-top`, `data-main-rest`, `data-rail-block`, `data-size-box`,
    `data-shape`, `data-related-chip`, `data-intro-short`, `data-exam-intro`.

**Accessibility**
24. `npm run check:contrast` passes (with `danger-text/band` added). Every `a, button` in the rail is ≥ 48 px tall
    (tiles ≥ 120, chips ≥ 48, source button ≥ 48).
25. Tab order: CTA → document rows → rail links (sizes → see-all → source → related) → main-rest. Focus ring visible
    on tiles and chips in light and dark.
26. Hindi: rail headings line-height ≥ 1.35 × font-size, no negative letter spacing, no clipped tile labels
    (`scrollHeight ≤ clientHeight + 1` on clamped spans is allowed only with `line-clamp`).
27. 200% zoom at 390: tiles grow taller, nothing overlaps.

**Dark / performance**
28. Dark 1512: rail cards show the 1 px ring, SVG boxes use `card` fill with `ink` stroke (visible on `band`), art
    sits on its plate. No pure-white areas.
29. CLS < 0.02 on `/exam/ibps-po` (art has width/height; SVGs have fixed size). JS on these routes within ±1 KB of
    the previous build (`npm run check:budgets` passes); CSS ≤ +3 KB gzip.

---

## 13. Build order

1. `scale-box.ts`, `rail-fit.ts` + tests; i18n keys; contrast pair.
2. `RailLayout` + block shells; exam page (§4). QA items 1–9, 13–23 on exam pages.
3. Doc pages (§5) with the shared `DocPageBody`.
4. Tool pages (§6), hub (§7).
5. Calibrate `rail-fit` constants with Playwright, then full QA (§12).

## 14. Open points for the owner (defaults in bold; build proceeds with the default)

1. Rail headings are real H2s (accessible outline) rather than styled `<p>`: **H2**.
2. Tips block also shown on phones (it repeats the first 3 of the full list further down): **yes**, per the
   approved plan; revisit if phone page length is a concern.
3. Group illustrations for banking / railway / teaching / state PSC: **separate image task** (manifest only).
