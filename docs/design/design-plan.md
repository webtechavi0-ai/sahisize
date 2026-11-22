# SahiSize design plan: modern UI and image plan

Scope: sahisize.online (Next.js 15 standalone, Tailwind 3.4), branch `seo/production-seo`.
Method: read-only code audit plus the built standalone server on :3201 (`.next/standalone`, build from 16 Nov). No repo files were changed.
Problem: home bounce is 72.8% and average engagement is 15 s. The owner wants a modern, attractive site that uses images.

---

## 0. Key findings

1. **There are no raster images on the site.** Every page has exactly one `<img>`, the header logo `/icon.svg`. All visuals are hand-drawn inline SVG (`HeroArt`, `FaqIllustration`, `how/How*`, `kit/CaptureExample`). The people in these drawings are flat clip-art figures 30–40 px tall. Nothing shows a real passport photo, a real signature or a real result. For a tool whose whole job is "make your photo look right", this is the biggest gap in trust and engagement.
2. **The brief assumed some art that does not exist.** There is no exam-family art, no promo SVG and no images in `src/assets` (it only holds the OG fonts). The OG route (`src/seo/og-render.ts`) draws a flat indigo card with text, in English only.
3. **Home looks like a wall of link boxes.** `HomePage.tsx` → `HomePaths.tsx` stacks three bordered `card shadow-lift` panels, a "— or —" divider, 6 task buttons, 8 exam chips and a list of "most searched" sizes. Below that come 12 text-only exam cards, three tool lists of 6–9 rows each, How it works, a trust strip and the FAQ. On a phone, the first screen is an H1 plus a search box and grey chips, with no picture. The hero art is pushed *below* all three panels (`mt-8`, after `HomePaths`).
4. **The "Exam Hall notebook" theme looks dated.** It uses a cream background `#FFFBF3`, ruled lines every 32 px at ≥640 px, a pink margin line at ≥1024 px (`src/styles/global.css` lines ~120–150), a highlighter `.marker` and a rotated `.stamp`. It is distinctive, but it reads as "school worksheet", not "modern app". Every surface is the same white card with a beige 1 px border, so nothing stands out.
5. **The most valuable SEO block is the weakest visually.** `DocAnswerBox` (`src/features/exam-document/DocAnswer.tsx`) holds the answer to the search query ("SSC CGL signature: 472×157 px, 10–20 KB, JPG"). It is rendered as a `text-sm` `<dl>` in a plain `rounded-card border p-3` box. The numbers people came for are 14 px regular text.
6. **The pages are heavy.** From the standalone build: home HTML is 282 KB raw (45 KB gzip), with **84 inline `<svg>`** because `site/Icon.tsx` inlines every icon. JS is 162 KB gzip on home, 192 KB on `/exam/ssc-cgl` and 200 KB on `/tools/compress-image`, already at the top of the 120–200 KB budget. CSS is 11.5 KB gzip. Images must therefore cost **zero JS** and modest bytes.

---

## 1. Current visual audit

### 1.1 Design tokens (`src/styles/global.css`, `tailwind.config.cjs`)

| Token | Light | Dark | Notes |
|---|---|---|---|
| ink (primary) | `#1E2A78` | `#A5B4FC` | Strong, 12.3:1 on paper. Used for H1/H2, links and chips. |
| saffron (action fill) | `#F59E0B` | `#FBBF24` | Fill only, 2.1:1 on paper, never text. `saffron-text #B45309` is used for text. |
| chalk (success) | `#0F766E` | `#2DD4BF` | |
| paper (page bg) | `#FFFBF3` cream | `#0E1430` | Has ruled lines and a margin line at ≥640 / ≥1024. |
| card | `#FFFFFF` | `#161D40` | |
| rule | `#E7E1D4` beige | `#2A3366` | A warm beige border on a cool indigo brand. The temperatures clash. |
| text / muted | `#1F2937` / `#6B7280` | `#F3F4F6` / `#9CA3AF` | Muted is 4.68:1 on paper, which only just passes AA. |

- **Duplicate naming.** Legacy aliases `primary`, `action`, `success`, `error`, `bg`, `surface` and `border` sit beside `ink`, `saffron`, `chalk`, `paper`, `card` and `rule`. Components mix them freely, for example `ExamCard` uses `text-primary bg-bg` while `HomePaths` uses `text-ink bg-paper`. They resolve to the same values, but the code reads as two design systems.
- **Type.** Inter 400/600/700 static latin (72 KB total, 3 files) plus Noto Sans Devanagari 400/600 with `local()` first (`src/styles/fonts.css`). There is no type scale token. Headings are ad hoc: home H1 `text-2xl sm:text-4xl lg:text-5xl`, exam H1 `text-2xl sm:text-3xl`, guide H1 a fixed `text-3xl` (not responsive). All H2s are `text-xl font-bold` with no display style. The heading font is the same Inter as body, and there is no 800 weight.
- **Radius.** Five values are in use with no clear rule: `rounded-card` (12 px), `rounded-xl` (12 px, the same value under a different name), `rounded-2xl` (16 px, home panels and HeroArt), `rounded-lg` (`.stamp`) and `rounded-full` (chips).
- **Shadows.** `btn`, `btn-hover` and `lift`, all indigo-tinted. `lift` is used only on the home panels and HeroArt. Exam cards, tool groups and the answer box have no elevation, so the hierarchy is flat.
- **Spacing.** Every section uses `mt-12`, with no full-bleed bands or background changes between sections. The page is one long column of cards on lined paper.

### 1.2 Components: what looks dated or plain

| Component | File | Issue |
|---|---|---|
| Home hero | `site/HomePage.tsx`, `site/HomePaths.tsx` | No image above the fold on phones. Three equal-weight panels compete for attention, so there is no single primary CTA. The "— or —" divider is a leftover of the old two-path layout. The 8 exam chips are identical grey boxes. |
| Hero art | `site/HeroArt.tsx` | A 400×190 inline SVG with tiny cartoon heads. It is the only hero visual and on phones it sits about 900 px down the page. |
| Exam cards | `site/ExamCard.tsx` | Text-only, and all 48 look identical. The year chip `bg-bg text-muted` is nearly invisible on white. Nothing distinguishes banking, railway, SSC or UPSC. |
| Most searched sizes | `HomePaths.tsx` | A plain divided list. The KB number, the thing people want, is regular 14 px text. |
| Tool lists | `site/HomeTools.tsx`, `site/ToolsIndex.tsx` | Uppercase grey group headers and plain rows with no icons or previews. It reads like a sitemap. |
| How it works | `site/HowItWorks.tsx` + `how/*` | Decent, but the 120 px illustration boxes on lined paper look like wireframes. |
| Trust strip | `site/TrustStrip.tsx` | Four identical cards with a green icon. Generic. |
| FAQ | `site/FaqList.tsx` + `FaqIllustration.tsx` | The illustration is hidden below 768 px, which means hidden for most users. |
| Exam-document answer box | `features/exam-document/DocAnswer.tsx` | See finding 5. There is no example image of a correct signature or photo, and the CTA sits under the box, not inside it. |
| Other-doc chips | `DocAnswer.tsx` `DocOtherChips` | `rounded-card` rectangles, while the `/exams` filter chips are `rounded-full`. The two chip styles are inconsistent. |
| Exam page | `layouts/ExamLayout.tsx` | H1 uses `text-text` (other pages use ink). The spec `<dl>` card is followed by the start card and then a long text block, with no visual header or identity for the exam. |
| Family page | `app/(en)/exams/[family]/page.tsx` | A wide comparison table (`min-w-[640px]`), so it scrolls sideways on phones. No art. |
| Guide | `layouts/GuideLayout.tsx` | Plain prose with no cover image, no inline figures and no reading-time or step visuals. 11 EN and 11 HI guides have no images at all. |
| Footer | `site/Footer.tsx` | About 33 links, each `min-h-[48px]`, in 4 columns that stack on phones. That is roughly **1,550 px of footer on a phone**, the longest block on most pages. |
| Upload sample | `kit/CaptureExample.tsx` | The right idea ("Good / Avoid"), but drawn as clip-art in a 160×120 box. A real photo would be far more persuasive. |
| OG images | `seo/og-render.ts` | A flat `#1E2A78` card with title and subtitle, English only (satori cannot shape Devanagari). Hindi pages reuse the English images. |

### 1.3 Mobile issues

- No image in the first 600 px of home on a 360×740 phone. The H1 is `text-2xl` (24 px), modest for a hero.
- The exam chip grid is `grid-cols-3` with 15 px labels like "IBPS PO" in 48 px boxes. That is fine for tapping but gives no visual cue.
- The family comparison table scrolls horizontally.
- The footer is about 1,550 px (above).
- The FAQ illustration and the `wideOnly` hero exams are hidden on phones, so the phone gets the least visual content of any breakpoint, even though it is the main device.
- The notebook ruled lines are already disabled under 640 px. Their 32 px rhythm also clashes with the content rhythm at ≥640 px.

### 1.4 What hurts trust and engagement

- There is no visual evidence that the tool works. Showing a real photo going from 3.2 MB to an 18 KB accepted result, as a real image, is the single strongest persuader for this audience.
- There are no "this is what officials accept vs reject" photos, which is exactly what anxious applicants look for (Google Images queries like "ssc photo sample", "signature sample for exam form").
- The site's content is genuinely trustworthy (sources, last-checked date, editorial policy), but the UI hides it in muted 14 px text. "Checked against the official notice, 22 Oct 2026" deserves a badge.
- Everything has the same visual weight, so users scan, find no anchor and leave. That matches the 15 s engagement time.

---

## 2. Modern direction: "Clear Desk"

A clean, cool and bright surface with one vivid brand colour, saffron as an accent, real photos as the hero material, and no more notebook ruling. The brand stays "exam" and Indian, and the look becomes "modern fintech or utility app".

### 2.1 Palette (all ratios computed with the WCAG formula)

**Light**

| Role | Hex | Use | Contrast |
|---|---|---|---|
| `--brand` | `#4338CA` (indigo-700) | Primary buttons, links, selected chips | White on it 7.9:1. On `--bg` 7.6:1 |
| `--brand-strong` | `#3730A3` | Hover/pressed state, H1 | White on it 9.9:1 |
| `--brand-soft` | `#EEF2FF` | Chip/tile backgrounds, answer box header | Brand text on it 7.1:1 |
| `--accent` (saffron) | `#F59E0B` | Fill only: KB pill, highlight, "PASS" seal | `#1E1B4B` text on it 7.4:1 |
| `--accent-hover` | `#FBBF24` | Hover fill | `#1E1B4B` on it 9.6:1 |
| `--accent-text` | `#B45309` | Saffron used as text | 5.0:1 on white |
| `--ok` | `#047857` | Success text and ticks | 5.5:1 on white, 5.2:1 on `#ECFDF5` |
| `--ok-soft` | `#ECFDF5` | "Accepted" panels | |
| `--bad` | `#B91C1C` | Reject text and crosses | 6.5:1 on white, 5.9:1 on `#FEF2F2` |
| `--bad-soft` | `#FEF2F2` | "Rejected" panels | |
| `--bg` | `#F8FAFF` | Page background (cool off-white, no lines) | |
| `--surface` | `#FFFFFF` | Cards | |
| `--surface-2` | `#F1F5F9` | Alternating section bands | |
| `--line` | `#E2E8F0` | Decorative borders | |
| `--line-strong` | `#8B95A7` | Form-control borders | 3.0:1 (WCAG 1.4.11) |
| `--text` | `#0F172A` | Body | 17.1:1 |
| `--text-muted` | `#475569` | Secondary | 7.3:1 (up from 4.7) |

**Dark**

| Role | Hex | Contrast |
|---|---|---|
| `--bg` | `#0B1020` | |
| `--surface` | `#131A2E` | |
| `--brand` | `#A5B4FC` (text and fills, with `#0B1020` text on fills) | 8.7:1 on surface, 9.5:1 reversed |
| `--accent` | `#FBBF24` | 10.4:1 on surface |
| `--ok` / `--bad` | `#34D399` / `#F87171` | 9.0:1 / 6.3:1 |
| `--text` / `--text-muted` | `#E2E8F0` / `#94A3B8` | 15.4:1 / 6.7:1 |
| `--line` | `#25304D` | |

Implementation:
- Keep the existing `--name: R G B; /* #HEX */` format so `scripts/contrast-check.ts` keeps working.
- Drop the legacy aliases in `tailwind.config.cjs` after a codemod (`primary`→`brand`, `bg`→`bg`, `surface`→`surface`, `border`→`line`).
- Remove the `body` background-image rules (ruled lines and margin) from `global.css`.
- Keep `--sheet` (always-white preview background) unchanged.
- Gradient use: one subtle radial mesh behind the hero only, `radial-gradient(60% 50% at 80% 0%, rgb(var(--brand)/.10), transparent), radial-gradient(40% 40% at 0% 30%, rgb(var(--accent)/.12), transparent)`. It is CSS only and costs 0 bytes of images.

### 2.2 Typography (self-hosted, OFL, from `@fontsource`, like today)

| Role | Latin | Devanagari | Files (woff2, subset) |
|---|---|---|---|
| Display/H1–H2 | **Plus Jakarta Sans** 700 + 800 (variable `wght` file, latin) | **Mukta** 700 (it pairs with Jakarta's geometric forms and has open counters at small sizes) | ~32 KB + ~38 KB (Devanagari range only) |
| Body/UI | **Inter** variable 400–700, latin (replaces the 3 static files) | **Noto Sans Devanagari** 400/600 (keep, with `local()` first) | ~48 KB (saves ~24 KB vs today) |

- Preload only Inter (body, LCP text) and Jakarta (H1). Load Mukta through `unicode-range` so English pages never fetch it, the same trick `fonts.css` already uses for the rupee sign.
- `font-display: swap` plus a metric-matched fallback (`size-adjust` / `ascent-override` on a local Arial `@font-face`) to avoid CLS on the H1.
- Fluid type scale tokens in `tailwind.config.cjs` (`fontSize`):
  - `display`: `clamp(1.875rem, 1.2rem + 3.2vw, 3.5rem)`, line-height 1.1, tracking −0.02em (Latin only)
  - `h1`: `clamp(1.625rem, 1.2rem + 1.8vw, 2.5rem)` / 1.15
  - `h2`: `clamp(1.375rem, 1.1rem + 1vw, 1.875rem)` / 1.2
  - `h3`: 1.125rem / 1.35; `body` 1rem / 1.6; `small` 0.875rem / 1.5; `stat` (KB/px numbers) `clamp(1.5rem, 1.1rem + 1.6vw, 2.25rem)` with `font-variant-numeric: tabular-nums`, weight 800
- Hindi rules: `html[lang|='hi']` gets line-height ≥1.7 for body and 1.35 for headings (matras need space), and never negative tracking. Headings in `font-hindi-display` (Mukta 700).

### 2.3 Spacing, radius, elevation

- **Spacing:** an 8-point rhythm. Sections become full-bleed bands, `py-12 sm:py-16 lg:py-24`, alternating `bg` and `surface-2`, instead of `mt-12` cards on a single background. Card padding is `p-4 sm:p-6`. Gaps are `gap-3` on mobile and `gap-4`/`gap-6` on desktop.
- **Radius tokens:** `sm 8px` (inputs, small pills), `md 12px` (buttons, chips), `lg 16px` (cards), `xl 24px` (hero media, answer box), `full` (badges). Delete the `rounded-card`/`rounded-xl` duplication.
- **Elevation**, tinted with `--shadow-rgb` (indigo in light, black in dark):
  - `e0`: 1 px `--line` border, no shadow (list rows)
  - `e1`: `0 1px 2px rgb(s/.06), 0 1px 3px rgb(s/.08)` (cards at rest)
  - `e2`: `0 8px 24px -8px rgb(s/.18)` (hovered cards, answer box, hero media)
  - `e3`: `0 24px 48px -16px rgb(s/.28)` (sticky CTA bar, dialogs)
  - Dark mode: replace shadows with a 1 px `rgb(255 255 255 / .06)` inner ring, because shadows are invisible on dark backgrounds.

### 2.4 Motion (CSS only, zero JS)

- Card hover/focus: `translateY(-2px)` plus `e1→e2`, 150 ms `cubic-bezier(.2,.8,.2,1)`. Buttons: a 100 ms press scale of 0.98.
- Hero before→after: a one-time 1.2 s CSS "wipe" (`clip-path: inset()` keyframe) on page load, revealing the "after" photo over the "before". It runs only inside `@media (prefers-reduced-motion: no-preference)`. Otherwise the after image is static.
- Section reveals: `animation-timeline: view()` fade-up 12 px, wrapped in `@supports (animation-timeline: view())` plus no-preference. Unsupported browsers just show content.
- `<details>` FAQ/footer: rotate the chevron 180° and use `interpolate-size: allow-keywords` for smooth height where supported.
- The existing global reduced-motion kill switch in `global.css` stays.
- Banned: carousels, autoplay video, Lottie/Framer (JS cost), parallax.

### 2.5 Component upgrades

**Hero (home)** — `HomePage.tsx`, `HomePaths.tsx`, replacing `HeroArt.tsx`
- Mobile order: eyebrow pill ("Free · Nothing uploaded · 48 exams"), display H1 (one line with an accent underline instead of the highlighter), one-line sub, **the hero search as the single primary action** (big 56 px input with brand ring), then a horizontal scroll strip of 8 exam chips. After that comes the **before→after hero image** (§3.1, aspect 4:3, about 300 px tall) with two overlaid pills: "4.2 MB · 3024×4032" (bad-soft) → "18 KB · 200×230 ✓" (ok-soft). The pills are HTML text, not baked into the image, so they translate and stay crisp.
- Desktop: a 2-column grid (copy 7/12, media 5/12) on the radial mesh.
- Move the "Just need a size?" tasks and "Most searched sizes" out of the hero into the next band. This cuts three panels down to one clear job.

**Size cards** ("Most searched sizes" + "Just need a size?" merged into a band titled "Common sizes")
- A 2-col (mobile) / 3-col / 4-col grid. Each card has a 40 px icon from the sprite in a `brand-soft` rounded square, a big stat "20 KB" in the `stat` style, a label "Photo for SSC / IBPS", and a spec line in muted. It uses `e1`, with `e2` and a lift on hover. Tap target is the whole card, at least 88 px tall.

**Exam chips/cards**
- Chips: `rounded-full`, 44–48 px, a 20 px group emblem on the left (§3.3) and the label in 600 weight. Selected state is brand fill with white text. One chip style across `/exams` filters, the home strip and `DocOtherChips`.
- `ExamCard`:
  - Top row: group emblem tile 40 px (tinted per group, see §3.3), short name in Jakarta 700, cycle badge (`brand-soft` / brand text, readable at 7:1).
  - Middle: a "Photo 20–50 KB · Sign 10–20 KB" stat line.
  - Bottom: doc pills.
  - The whole card is a link with an `e1→e2` hover.

**Spec answer box** (`DocAnswerBox`, the money block on 118 exam-document pages and their Hindi copies)
- A full-width card with `rounded-xl` and `e2`, a `brand-soft` header strip "SSC CGL signature size 2026", and a "✓ Checked 22 Oct 2026 · Official notice para 9.6" verified badge (ok-soft pill linking to the source).
- A 2×2 stat grid in the `stat` style: **10–20 KB** | **472×157 px** | **JPG** | **6.0×2.0 cm**. Each tile has a muted 12 px caption above.
- On the right (desktop) or below (mobile): a thumbnail of the **correct example** for this doc type (§3.5), 120×80 for signatures or 96×110 for photos, captioned "Correct example".
- Primary CTA **inside** the box: full-width `btn-action` "Resize my signature to 10–20 KB" linking to `#kit`.
- Keep the `<dl>` semantics and `data-answer-box` hook. The CTA is a plain link, with no JS.
- Mobile **sticky bottom CTA** ("Resize now →"): a `position: sticky; bottom: 0` bar with `e3`, only on doc and exam pages. It is hidden with a CSS scroll-driven animation once `#kit` is in view where supported; elsewhere it is always visible and small (56 px).

**Correct vs rejected strip** (new, under the answer box): see §3.5. A horizontally scrollable snap row on mobile (`scroll-snap-type: x mandatory`) and a 4-up grid on desktop. Each figure has an ok/bad badge and a one-line reason.

**Tool card** (`ToolsIndex.tsx`, `HomeTools.tsx`)
- A card with a before→after thumbnail pair (64×64 each, §3.6) or a sprite icon for tools without a natural preview, plus the name and a one-line "what you get" spec.
- Group headers become sentence case with an icon, not uppercase grey.
- On home, show 6 featured tools as cards plus a "See all 19 tools" link instead of 21 rows.

**FAQ**
- Native `<details>` with a 56 px summary row, a chevron, and `e0` rows separated by `--line`. The first item is open by default.
- Show a compact FAQ illustration on mobile too (a 16:9 version, lazy loaded, §3.10), or drop it.

**Footer**
- Mobile: four `<details>` accordions ("Tools", "Top exams", "Guides", "About & legal"), collapsed by default. This takes about 1,550 px down to about 320 px with no JS, and every link stays in the HTML for SEO.
- Desktop: as today, but on a `surface-2` band with a brand block (logo, one-line promise, "Not affiliated with any government body", language/theme toggles).

**Icons:** replace inline `site/Icon.tsx` and `ui/Icon.tsx` paths with one SVG sprite `public/img/icons.<hash>.svg` used through `<svg><use href="/img/icons.<hash>.svg#search"/></svg>`. Same-origin `<use>` is allowed by the current CSP `img-src 'self'`, and `currentColor` still works. The 84 inline SVGs on home become 84 short `<use>` tags, an estimated 25–40 KB less raw HTML. Keep the inline fallback for the 2–3 icons above the fold if the sprite request matters.

### 2.6 Mobile-first layout rules

- Design at 360×740 first. The first screen of every landing template must contain: the H1, the answer (doc pages) or search (home), the primary CTA, and **one image**.
- Max content width 1200 px (not 1440) for reading pages. Tools keep full width.
- Replace the horizontally scrolling family table with stacked comparison cards under 768 px; keep the table from `md:` up.
- 48 px targets everywhere, as today. Keep `container-fluid` safe-area handling.

### 2.7 Performance guardrails

- JS: **no increase**. Every change above is server components plus CSS. The current 162–200 KB gzip is the ceiling. Trim later by auditing client islands (`ExamSearch.tsx` at 669 lines is a candidate).
- CSS: target ≤ 16 KB gzip (11.5 today).
- Fonts: ≤ 2 preloads and ≤ 110 KB total font bytes on EN, ≤ 160 KB on HI (Devanagari via `local()` is usually 0).
- Images: per page, ≤ 60 KB above the fold and ≤ 200 KB total (lazy loaded). LCP should stay the H1 text on mobile, or a ≤ 35 KB AVIF hero.
- CI budgets: add Lighthouse CI or a simple `scripts/size-check` on HTML, JS and image bytes for 5 template URLs.

---

## 3. Image plan

### 3.0 Pipeline: serving images in Next standalone

Constraints today: `images: { unoptimized: true }` in `next.config.mjs`, no `sharp` in the standalone image, no image CDN, and CSP `img-src 'self' data: blob: <GA>`.

Recommendation: **build-time optimisation, no runtime optimiser.**
1. Source masters (PNG/TIFF/JPEG at 2× the largest display size, and SVG) go in `assets-src/img/**`, outside `public` and outside the bundle. They are committed with Git LFS or kept small.
2. A script `scripts/build-images.mjs` uses `sharp` as a **devDependency** only (it runs in CI or locally before `next build`, never in the runtime image). For each raster master it writes:
   - AVIF (q≈50, effort 6) and WebP (q≈72) at widths from the per-slot list (e.g. 320/480/640/960), plus one JPEG fallback at the middle width for old Android browsers.
   - Content-hashed names: `public/img/<area>/<name>.<w>.<hash8>.avif`
   - A generated manifest `src/generated/images.ts`: `{ id, width, height, alt?: never, srcset: { avif, webp }, fallback, dominant: '#hex' }`. Alt text is never baked in; it comes from i18n.
   - SVGs are run through SVGO (`multipass`, keep `viewBox`, strip ids except sprite symbols) to `public/img/**/<name>.<hash8>.svg`.
3. Add a `<Picture>` server component, `src/components/ui/Picture.tsx`, with zero JS. It renders `<picture><source type="image/avif" srcset sizes><source type="image/webp" …><img src=fallback width height alt loading decoding fetchpriority></picture>`. It sets `style`-free CSS aspect via `aspect-[w/h]` classes (CSP forbids inline style attributes), and uses the dominant colour as a `bg-[#hex]` placeholder class from a safelist, or a neutral `bg-surface-2`.
   - Do **not** use `next/image` here. With `unoptimized` it emits a single `src` (no AVIF/WebP `srcset`) and adds nothing the `<picture>` component doesn't do better.
4. Caching: add `{ source: '/img/:file*', headers: [{ key: 'Cache-Control', value: 'public, max-age=31536000, immutable' }] }` to `next.config.mjs` (same pattern as the existing `/fonts/:file*` rule), and exclude `img/` from the HTML cache-control regex at line ~114.
5. SEO extras:
   - Add an `image:image` entry for each example photo in `sitemap-documents.xml` (Google Images traffic for "ssc cgl photo sample" style queries).
   - Add `primaryImageOfPage` / `ImageObject` (with `contentUrl`, `caption`, `creditText: "SahiSize"`, `license` → `/terms#images`) to the existing JSON-LD in `src/seo/jsonld.ts`.
   - Use descriptive file names such as `signature-correct-black-ink-white-paper.480.ab12cd34.avif`.
6. Service worker: `public/sw.js` should precache only the icon sprite. Example photos are runtime-cached (stale-while-revalidate), not precached.

### 3.1 Home hero: before→after
- **Purpose:** prove the product in one glance: a casual phone photo becomes an accepted passport-style exam photo.
- **Type:** **photographic**, Indian context. A young adult applicant (alternate between a woman and a man version, and pick one per build, not per request), shot on a mid-range phone in a home setting (cluttered background, warm light) for "before". The "after" is the **actual SahiSize output** of that photo (white or light background, correct crop, 200×230). Don't fake it.
- **Composition:** one image, 4:3, with the "before" phone screenshot on the left, tilted 4°, and the "after" passport photo on the right in a white frame. Or two images layered in CSS for the wipe animation (preferred, because it reuses the same files in the tool previews).
- **Dimensions:** mobile 360w (4:3, 360×270) and desktop 560w (5:4, 560×448), at 1×/2× → widths 360/560/720/1120.
- **Format:** AVIF + WebP + JPEG fallback.
- **Budget:** ≤ 30 KB AVIF at 720w, ≤ 45 KB WebP.
- **Count:** 2 masters (before, after) × 4 widths × 3 formats.
- **Loading:** `fetchpriority="high"`, `loading="eager"`, `decoding="async"` on the desktop source only. On mobile the image sits below the search and is not the LCP element, so use `loading="lazy"` on the mobile `<img>` through art direction (`<source media="(min-width:1024px)">` carries the high-priority variant).
- **Alt (EN):** "Phone photo of 4.2 MB resized to an 18 KB passport-size photo for an exam form". **(HI):** "4.2 MB की फ़ोन फ़ोटो को परीक्षा फ़ॉर्म के लिए 18 KB पासपोर्ट साइज़ फ़ोटो में बदला गया"
- **Location:** `assets-src/img/home/hero-before.jpg`, `hero-after.jpg` → `public/img/home/`.

### 3.2 Size cards and task icons
- **Purpose:** fast visual scanning of the "Common sizes" and tool cards.
- **Type:** vector icons in a **single SVG sprite**, 24 grid, 1.75 stroke, `currentColor`, in Lucide style to match the existing icons. Two-tone versions use `brand` plus an `accent` dot.
- **Symbols (~22):** photo-kb, signature, thumb, passport, pan-card, stamp, postcard, crop, ruler-cm, ruler-mm, convert, increase-kb, compress-pdf, images-to-pdf, name-date, photo-sheet, declaration, certificate, live-camera, batch, custom, id-card. The existing `Icon.tsx` paths cover about 12 of these.
- **Format:** SVG sprite, one file, ≤ 8 KB gzip.
- **Loading:** one request, cached as immutable.
- **Alt:** decorative (`aria-hidden`), because the card label carries the meaning.
- **Location:** `assets-src/img/icons/*.svg` → `public/img/icons.<hash>.svg` (built by the script, sprite generation with `svgstore`-style concatenation).

### 3.3 Exam group emblems (and family art)
- **Purpose:** give 48 identical text cards an identity, and give chips and the exam-page header a visual anchor.
- **Type:** **original vector illustrations, NOT official logos.** Don't reproduce SSC, UPSC, NTA, IBPS or RRB logos, and never the State Emblem of India (restricted under the State Emblem of India (Prohibition of Improper Use) Act 2005). It would also contradict the "Not affiliated" disclaimer and risk trademark complaints. Use generic motifs instead:
  - banking: bank pillars + ₹
  - railway: train front
  - ssc: office building + files
  - upsc: pillared dome / scroll
  - nta: lab flask + book
  - teaching: blackboard
  - police: shield + star
  - defence: wings/anchor
  - state-psc: map pin + building
  - other: clipboard
- **Count:** 10 group emblems, plus 3 family banners (ssc, rrb, ibps) that reuse the emblem in a larger scene.
- **Dimensions:**
  - Emblems: 48×48 viewBox, shown at 20 px (chips), 40 px (cards) and 72 px (exam header). One colour plus a tint; each group gets a tint from a fixed, AA-checked set (e.g. banking `#0E7490`, railway `#B45309`, ssc `#4338CA`, upsc `#7C3AED`, nta `#047857`, teaching `#BE185D`, police `#1D4ED8`, defence `#4D7C0F`, state-psc `#C2410C`, other `#475569`), used only on the emblem tile background at 12% alpha and the glyph at 100%.
  - Family banners: 1200×400 viewBox (3:1), shown as a header band on `/exams/ssc|rrb|ibps`.
- **Format:**
  - Emblems: **inline SVG symbols in the same sprite** (§3.2), so they are themable through `currentColor` and the tint class. Each is ≤ 1.2 KB.
  - Family banners: external `.svg` via `<img>`, ≤ 10 KB each, self-contained light colours on their own rounded panel so they work in both themes.
- **Loading:** emblems come with the sprite. Family banner: `loading="eager"` (it is a header), with explicit width and height.
- **Alt:** emblems are decorative. Family banner EN "Illustration: SSC exams, photo and signature sizes"; HI "चित्र: SSC परीक्षाएँ, फ़ोटो और हस्ताक्षर साइज़".
- **Location:** `assets-src/img/emblems/<group>.svg`, `assets-src/img/families/<family>.svg`.

### 3.4 Exam page hero (`/exam/{slug}`, 35 EN + 31 HI)
- **Purpose:** an identity and "you're in the right place" signal, plus the key sizes at a glance.
- **Approach:** **no 48 unique images.** A CSS header band: group emblem (72 px) + exam name (H1) + cycle badge + a stat strip (Photo KB · Signature KB · Thumb · Docs count) + a row of thumbnails of the correct examples for the exam's documents (reusing §3.5 at 64 px).
- **New images:** 0. **Bytes:** about 3 × 4 KB lazy thumbnails.
- **Alt for the thumbnails:** "{Exam} {document} sample: correct", e.g. "SSC CGL signature sample: correct".

### 3.5 Exam-document "correct vs rejected" examples (highest priority)
- **Purpose:** the visual answer to "what should my photo or signature look like?". It cuts rejections and builds trust, and it ranks in Google Images. The images are shared per **document type**, not per exam: 118 EN doc pages + 3 HI doc pages + 35 kit pages + the upload step in `kit/CaptureExample.tsx` (which it replaces) + guides all reuse one set.
- **Type:** **photographic and real.** Shoot with consenting adult models (written model release, DPDP-Act-compliant consent kept on file, models aged 18+). Use Indian applicants of varied skin tones and genders, mid-range Android phones, real A4 paper, real blue/black ball pens and a real ink pad. Do NOT use AI-generated faces for the "correct" examples: users compare their own face to these, and a synthetic look destroys trust. Illustrations are acceptable only for the abstract "crop guide" overlays.
- **Set (≈ 32 images):**

| Doc type | Correct | Rejected (one reason each) | Pages served |
|---|---|---|---|
| Photo (standard) | 1: light plain background, face 70–80% height, ears visible, even light | 4: busy background · shadow/dark · cap or dark glasses · cut-off head/too far | 27 doc pages + kits + tools |
| Photo with name & date strip | 1 | 1 (strip missing/cut) | name-date tool + exams that need it |
| Live capture (SSC/RRB webcam) | 1: framed in webcam guide | 2: backlit window · spectacles | live-capture notices, guide |
| Signature | 1: black ink on plain white, tightly cropped | 3: ruled notebook paper · shadow/grey paper · too much margin/tiny | 33 + variants |
| Signature: triple (UPSC) | 1 | – | UPSC |
| Signature: dual (Hindi+English) | 1 | – | Bihar exams |
| Thumb impression | 1: left thumb, blue ink, white paper, clear ridges | 3: smudged · too faint · photo of finger instead of impression | 14 + L/R variants (reuse, caption says left or right) |
| Handwritten declaration | 1: full text, black ink, white paper, flat | 2: angled/keystoned · shadow over text | 10 |
| Certificate/marksheet/ID PDF scan | 1: flat, full page, readable | 2: cut corners · blurry | 13 + class10, category, pwd, id-proof, address-proof |

  - Every document is a **SPECIMEN**: fake names, a watermark "SAMPLE – SahiSize", no real Aadhaar or ID numbers (the Aadhaar Act prohibits showing full numbers; use a masked fake specimen).
- **Dimensions:**
  - Photo examples: 3:4 (shown at 120–200 px wide) → widths 240/400.
  - Signature, declaration and certificate examples: native ratio (signature 3:1, declaration and certificate 3:4 or 1:1.414) → widths 320/640.
  - Thumb: 1:1, widths 200/400.
- **Format:** AVIF + WebP + JPEG fallback. Signatures and thumbs as AVIF too (they are photos of paper, not line art); never PNG.
- **Budget:** ≤ 12 KB AVIF per image at display size. A 4-image strip should be ≤ 50 KB.
- **Overlays:** the ✓/✕ badge and reason text are HTML over the image, so they translate and are not baked in.
- **Loading:**
  - The correct example inside the answer box: `loading="eager"` (it is small and above the fold, but not `fetchpriority=high`; the H1 stays the LCP).
  - The rejected strip: `loading="lazy"`.
- **Alt pattern (keep it specific; it is the Google Images snippet):**
  - Correct, EN: "{Exam} {document} sample: correct, {spec}" → "SSC CGL signature sample: correct, black ink on white paper, 472×157 px". HI: "{Exam} {document} नमूना: सही, {spec}".
  - Rejected, EN: "{Document} rejected: {reason}" → "Photo rejected: dark shadow on face". Use the generic name because the image is shared and the alt must stay true on every page. The figcaption carries the exam-specific line.
- **Location:** `assets-src/img/examples/<doctype>/<correct|reject-<reason>>.jpg` → `public/img/examples/…`. Map doc type to images in `src/content/examples.json` (doc-type id, file id, reason i18n key) so `DocAnswerBox`, `CaptureExample` and guides read one source.

### 3.6 Tool before→after previews
- **Purpose:** show the outcome on `/tools/*` (60 EN routes: 19 base tools + KB/size variants) and on tool cards.
- **Type:** photographic, **produced by the SahiSize engine itself** from 6 source masters (portrait, signature, thumb, declaration, a 3-page certificate set, and a group of 4 photos for batch). The labels ("2.8 MB → 19.6 KB") then match what the tool really does.
- **Count:** 19 base tools × 1 before/after pair, with "before" shared across tools from the 6 masters. That is about 6 before + 19 after = **25 images**. KB variant pages (`compress-image-to-20kb`, `-50kb` …) reuse the compress pair with the KB label in HTML text, so no extra images.
- **Dimensions:**
  - Tool hero pair: each 1:1 or 3:4, displayed 160–240 px wide, side by side on mobile → widths 240/480.
  - Card thumbs: 64×64 crops (widths 64/128).
  - Size-preset tools (stamp, postcard, 3.5×4.5 cm, passport sheet): render the "after" on a printed-sheet mock (A4/4×6 photo paper), 4:3.
- **Format:** AVIF + WebP + JPEG fallback.
- **Budget:** ≤ 15 KB per hero image, ≤ 4 KB per card thumb.
- **Loading:** lazy. They sit below the uploader on mobile; the uploader stays first because the tool is the job.
- **Alt:** EN "Before and after: {tool name}, {before size} photo resized to {after size}". HI equivalent.
- **Location:** `public/img/tools/<slug>-before|after.*`, generated by `scripts/build-tool-previews.mjs` (runs the engine in Node through the same wasm codecs in `public/wasm`, or captured once from the browser and committed).

### 3.7 Guide illustrations (11 EN + 11 HI = 22 pages, 12 unique slugs)
- **Cover:** one per slug, **vector illustration**, text-free so EN and HI share it, 16:9. Use a consistent style: flat, brand palette, the same character set as the empty states.
  - Count: 12 (the 11 shared slugs plus `photo-ko-kb-me-kaise-kare` and `how-to-upload-photo-signature`).
  - Format: SVG via `<img>`, ≤ 14 KB each.
  - Size: 1200×675 viewBox, shown at full column width.
  - Loading: eager (it is the header) but not high priority; the H1 is first.
  - Alt: "Illustration: {short guide topic}". HI equivalent.
- **Inline figures:** reuse §3.5 and §3.6 images through a new rich-text block in the guide JSON `body`, e.g. `{ "type": "figure", "image": "examples/signature/correct", "caption": {...} }`, rendered by `src/components/content/RichText.tsx`. About 2–4 per guide, lazy.
- **Step screenshots:** for "how to upload", "reduce to 20 KB on mobile" and "scan signature with phone", use **real phone screenshots of SahiSize** (9:19.5, widths 280/560, AVIF ≤ 20 KB, framed with a CSS device frame rather than a baked frame). About 3 per guide × 4 guides = 12. These must be retaken when the UI changes; keep a script note in `assets-src/img/guides/README` (not in docs/).

### 3.8 OG / share images
- **Current:** satori + resvg, 1200×630 PNG, English, flat indigo, text only (`src/seo/og-render.ts`, `src/seo/og-entries.ts`).
- **Upgrade the template:**
  - Left 60%: logo, title, subtitle and a stat pill ("Photo 20–50 KB · Sign 10–20 KB").
  - Right 40%: the group emblem in a big tint tile for exams, the before→after thumbnail for tools, or the guide cover for guides. Satori accepts `<img src="data:image/png;base64…">`, so read the PNG/AVIF→PNG at build time.
  - Background: the brand mesh gradient.
- **Hindi OG:** satori cannot shape Devanagari conjuncts, but **resvg can** (it uses rustybuzz). For `/hi/*`, build an SVG string template directly (no satori) with `<text>` in Noto Sans Devanagari Bold and render it with `new Resvg(svg, { font: { fontFiles: ['…/NotoSansDevanagari-Bold.ttf'], loadSystemFonts: false } })`. Add the TTF to `src/assets/og-fonts/`. Verify conjuncts (क्ष, त्र, र्) visually before shipping.
- **Count:**
  - EN: default, home, exams, guides, 48 exams, 19 tools, 22 guides ≈ 93 (exists).
  - New HI: home, exams, guides, tools index, 31 exams, ~15 hi tools, 11 guides ≈ 60.
  - Optional per-document EN (118) in phase 3, high value for WhatsApp/Telegram shares ("SSC CGL Signature 472×157 px 10–20 KB").
- **Format:** PNG (best compatibility with WhatsApp and other crawlers). Keep ≤ 120 KB each; quantise with `pngquant`-like palette reduction in resvg output, or emit JPEG q85 (WhatsApp accepts JPEG). Must stay ≤ 300 KB for WhatsApp previews.
- **Alt (`og:image:alt`):** "{Exam} {document} size: {spec}, SahiSize".

### 3.9 Empty states and system pages
- **Purpose:** humane, branded moments instead of grey text.
- **Set (5):**
  - Uploader idle (a phone with a photo and a dotted drop target)
  - No search results (magnifier + clipboard)
  - Offline (`/offline`, cloud with a tick: "works offline")
  - 404 (`global-not-found.tsx`: lost exam admit card)
  - Processing error ("couldn't reach the KB", scale tipping)
- **Type:** vector, same style as the guide covers, inline SVG (small, ≤ 4 KB, themable through token classes as today) because each appears on one page and must work offline.
- **Size:** 240×180 viewBox.
- **Alt:** decorative if the heading says it all, otherwise "Illustration: {state}".
- **Location:** `src/components/illustrations/*.tsx`. Move `HeroArt`, `FaqIllustration` and `how/*` here too, and retire `HeroArt` once §3.1 ships.

### 3.10 Trust badges and the FAQ illustration
- **Trust strip:** 4 honest badges as sprite icons in tinted circles: "Nothing uploaded (on-device)", "Free, no sign-up", "Checked against official notice", "Works offline". **No fake** user counts, ratings, testimonials or "Govt approved" seals. A "Used by N students" figure may appear only if GA supports it and the number is shown with its date.
- **"Verified" seal component:** CSS pill + icon + date, reused in the answer box, exam header and spec table. 0 images.
- **FAQ illustration:** keep the vector, redraw it in the new palette at 16:9 for mobile (currently hidden below 768 px). Lazy, external SVG ≤ 6 KB.

### 3.11 Totals

| Kind | Unique masters | Files after pipeline (≈) | Bytes per typical page |
|---|---|---|---|
| Hero photos | 2 | 24 | ≤ 30 KB (home) |
| Example photos (correct/rejected) | ~32 | ~200 | 12–50 KB (doc page) |
| Tool before→after | ~25 | ~150 | ≤ 30 KB (tool page) |
| Guide step screenshots | ~12 | ~72 | ≤ 60 KB (guide) |
| SVG sprite (icons + 10 emblems) | 1 | 1 | ≤ 10 KB once, cached |
| Family banners | 3 SVG | 3 | ≤ 10 KB |
| Guide covers | 12 SVG | 12 | ≤ 14 KB |
| Empty states | 5 inline | – | ≤ 4 KB |
| OG | ~93 EN (exists) + ~60 HI (+118 doc optional) | build output | n/a |

Photo shoot: about **70 real photos** (2 hero + ~32 examples + 6 tool sources, the rest derived), feasible in **one day** with 3–4 models, one phone, A4 sheets, pens and an ink pad. Illustrations: about 30 vectors (10 emblems, 3 banners, 12 covers, 5 empty states) from one illustrator for style consistency.

Repo layout:
```
assets-src/img/{home,examples,tools,guides,emblems,families,icons,empty}/   # masters (LFS for rasters)
scripts/build-images.mjs                     # sharp (devDep) + svgo -> public/img + manifest
public/img/**                                # hashed outputs, immutable cache
src/generated/images.ts                      # manifest (ids, sizes, srcsets)
src/content/examples.json                    # doc type -> example ids + reason keys
src/components/ui/Picture.tsx                # <picture> server component, zero JS
src/components/illustrations/*.tsx           # inline SVG (empty states, legacy art)
```
`public/img/**` and `src/generated/images.ts` can be committed or generated in the Docker build stage before `next build`. The Dockerfile already builds standalone, so add `RUN node scripts/build-images.mjs` before the build. `sharp` then lives only in the builder stage, not the runner.

---

## 4. Phased rollout

Ordered by expected engagement and SEO gain per effort. Most organic landings are exam and exam-document pages (118 doc routes + 35 exam routes vs 1 home), so phase 1 targets those first, even though home has the bounce headline.

**Phase 0: foundation (2–3 days, no visual risk)**
1. New tokens in `global.css` / `tailwind.config.cjs` (palette, radius, elevation, type scale); remove the ruled-paper background; codemod the legacy colour aliases; run `npm run check:contrast`.
2. Fonts: Inter variable, Plus Jakarta Sans 700/800, Mukta 700 (Devanagari headings); metric-matched fallbacks.
3. Image pipeline (`build-images.mjs`, `Picture.tsx`, `/img` immutable caching header, manifest).
4. SVG sprite replaces inline icons (saves HTML bytes on every page).
5. Footer accordions on mobile (about 1,200 px shorter pages).

**Phase 1: exam-document and exam pages (biggest organic surface)**
1. Redesigned `DocAnswerBox`: stat tiles, verified badge, CTA inside, correct-example thumbnail.
2. Correct-vs-rejected strip for photo, signature and thumb first (≈ 16 images), then declaration and certificates.
3. Mobile sticky "Resize now" CTA.
4. `kit/CaptureExample.tsx` uses the same real photos.
5. ImageObject JSON-LD + `image:image` in `sitemap-documents.xml`.
6. Exam page header band (emblem + stat strip + thumbnails); group emblems in the sprite.
- **Measure:** scroll depth, CTA→kit clicks, kit start rate, Google Images impressions (Search Console, "Image" search type).

**Phase 2: home (bounce 72.8%)**
1. New hero: one search, a chip strip, the real before→after photo with the CSS wipe and HTML pills.
2. "Common sizes" card grid with icons and big KB numbers; ExamCards with emblems and a stat line; featured tool cards (6) instead of 21 rows.
3. Full-bleed alternating bands; trust badges; FAQ restyle with the mobile illustration.
- **Measure:** home bounce, engaged-session rate, hero search usage and chip clicks. Run as an A/B (feature flag by cookie, server-rendered) if traffic allows, otherwise compare before and after over two equal weeks, accounting for exam-season effects.

**Phase 3: tools, guides, sharing**
1. Tool before→after previews (25 images, engine-generated) and tool cards with thumbs.
2. Guide covers (12 SVG), inline example figures and phone screenshots in the 4 how-to guides.
3. OG template upgrade (art on the right) and **Hindi OG via resvg** (≈ 60), then optional per-document OG (118) for WhatsApp sharing.

**Phase 4: polish**
1. Family pages: banners and mobile comparison cards instead of the sideways-scrolling table.
2. Empty states (5), 404, offline.
3. Scroll-driven reveal motion, dark-mode tuning of photos (a slight `brightness(.95)` filter on the white sheets in dark mode), and a size-budget check in CI.

**Guardrails for every phase**
- No new client JS for visuals.
- Lighthouse mobile ≥ 90 performance on home, `/exam/ssc-cgl`, `/exam/ssc-cgl/signature`, `/tools/compress-image` and `/hi`.
- CLS < 0.05 (every image gets width and height).
- No official logos or emblems; every face photo has a model release; every document is a specimen.
