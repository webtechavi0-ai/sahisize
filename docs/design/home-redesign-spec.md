# SahiSize home redesign: final spec ("Clear Desk, thumb-first")

Status: **approved direction, ready to build.** Written by the design director after reviewing three proposals
(conversion, brand, mobile-a11y). This file replaces the three proposals; the build and QA agents work from it alone.

Scope: global tokens, page background, fonts and type scale, Header, Footer, all home sections (`/` and `/hi`),
and the global fixes needed so tool, exam, kit, guide and legal pages still look right with the new tokens.
Out of scope: tool/exam page layout changes, dark mode following the OS (see §13), an inline tool on the home.

Hard rules this spec keeps: Next.js server components + Tailwind only; HeroSearch stays the only client island on
the home (one optional ~150-byte addition to the existing `HeaderClient` chunk, §8.3); no new font files; no CDN;
CSP `font-src 'self'`; one H1; every H2 id, JSON-LD block, link and `data-*` hook kept; WCAG AA (`npm run
check:contrast` passes); tap targets ≥ 48 px; existing dark-mode mechanism (`localStorage 'sahisize:theme'` →
`<html data-theme>`); Hindi parity for every string.

---

## 0. Decision record

### 0.1 Scorecard (1–10, higher is better; "risk/perf" 10 = lowest risk, best performance)

| Criterion | Conversion | Brand | Mobile-a11y |
|---|---|---|---|
| Speed to first action at 360 px | 9 | 7 | 9 |
| Visual quality / modernity | 7 | 9 | 7 |
| Trust | 8 | 8 | 8 |
| Accessibility / Hindi | 7 | 7 | 10 |
| Responsiveness 360 / 768 / 1024 / 1440 | 8 | 8 | 9 |
| Implementation risk / performance | 8 | 5 | 8 |
| **Total (60)** | **47** | **44** | **51** |

Why each lost points:
- **Conversion**: strongest first-screen logic, but the "Most asked" saffron 20 KB tile is a guess that leaves the
  generic "photo size in kb" visitor (no number yet) without a default; duplicate trust-strip twins; thin on Hindi
  font weight.
- **Brand**: best-looking, but a new 22 KB display font counts against `check:budgets` totals and the LCP text,
  sticky header with `backdrop-blur` costs paint on cheap Android, natural-wrap chips bring back the ragged last row
  the owner criticised, and the "or pick your exam" pill keeps a divider the owner called weak.
- **Mobile-a11y**: winner. Best Hindi handling (real Devanagari bold without a new file, line heights, no faux
  bold), image kept out of the phone hero (H1 is LCP, 0 image bytes before the fold), search box above the fold at
  360, full rows everywhere, the most checkable QA list. Weaknesses fixed here: it specified weight 800 (we ship no
  Inter 800 file), an uppercase kicker, an ink-filled primary that looks like the number tiles, and a 17 px Hindi
  body applied to every page.

### 0.2 What came from where

| Taken from | Idea |
|---|---|
| Mobile-a11y (base) | Token values, `band` / `ink-soft` tokens, Devanagari 700 via `local()` + 600 file, Inter fallback metrics, hero art hidden on phones and lazy elsewhere, art on a plate in dark mode, 3×2 / 4×2 exam chips, Latin exam codes on Hindi chips (owner to confirm), `.band` full-bleed helper + `overflow-x: clip`, footer `<details>` with `::details-content` + HeaderClient fallback, QA checklist |
| Brand | `--heading` token for H1/H2, 4 + 2 tile grid (KB tiles in one row from 640 px, then two wide action buttons), "Other size" as the single saffron primary, ink text + thin saffron bar for "in KB", band alternation, section-header pattern with a short "All N →" link on phones, footer brand block, tools "By document" first |
| Conversion | Static (non-sticky) header on phones, near-black body text and calm indigo-black headings, "Don't know the size?" kicker instead of the "or" divider, removing the tools rows that repeat the hero, How-it-works without art boxes on phones, measurable acceptance numbers, `text-wrap: balance` |

### 0.3 The one judgement call: which tile is primary

**"Other size" is the single filled (saffron) action.** The head query is "photo size in KB" with no number. The
four KB tiles are self-selecting (people tap the number their form shows), so they are equal white tiles with the
number as the biggest text. "Other size" is the only tile that works for every visitor, including those whose
number is not shown, and it matches "for any form" in the H1. Saffron keeps one meaning site-wide: "the main thing
to do here" (the tool pages' "Take photo" is the next saffron button the visitor sees).
Measure: if analytics shows one KB tile getting more than 40% of hero clicks after two weeks, revisit (content change only).

---

## 1. Tokens

### 1.1 Strategy

Keep every existing CSS variable name and its `--name: R G B; /* #HEX */` format (the Tailwind `token()` helper
and `scripts/contrast-check.ts` parse it). Change values only. Add **three** tokens: `--band`, `--ink-soft`,
`--heading`. Delete `--margin-line`, `--rule-alpha`, `--margin-alpha` and the Tailwind `margin` colour.

### 1.2 Light (`:root`)

| Token | Old | **New** | Use |
|---|---|---|---|
| `--paper` | #FFFBF3 | **#F8FAFF** (248 250 255) | Page background. Equals the generated illustrations' background, so art has no box. |
| `--card` | #FFFFFF | #FFFFFF | Cards, tiles, header, inputs |
| `--band` (new) | – | **#EEF2FB** (238 242 251) | Alternating full-bleed section bands, footer, wells inside cards (table heads) |
| `--rule` | #E7E1D4 | **#E2E8F0** (226 232 240) | Decorative borders and dividers |
| `--rule-strong` | #857C6A | **#7C879E** (124 135 158) | Borders of inputs, outline buttons, chips, tiles (WCAG 1.4.11) |
| `--heading` (new) | – | **#1E1B4B** (30 27 75) | H1, H2, H3, tile numbers, wordmark "Size" |
| `--ink` | #1E2A78 | **#4338CA** (67 56 202) | Links, icons, selected chips, focus ring, the "in KB" accent. Matches the illustration indigo. |
| `--ink-hover` | #16205E | **#3730A3** (55 48 163) | Hover/pressed |
| `--ink-soft` (new) | – | **#EEF2FF** (238 242 255) | Hover tints, icon wells, KB pills, cycle badges, open-menu state |
| `--on-ink` | #FFFFFF | #FFFFFF | |
| `--saffron` | #F59E0B | #F59E0B | **Fill only**: one primary per screen; the 3 px bar under "in KB". Never text. |
| `--saffron-hover` | #FBBF24 | #FBBF24 | |
| `--on-saffron` | #1E2A78 | **#1E1B4B** | Text on saffron |
| `--saffron-soft` | #FEF3C7 | #FEF3C7 | Tips, notices |
| `--saffron-text` | #B45309 | **#A3480A** (163 72 10) | Saffron as text ("Sahi" in the logo) |
| `--chalk` | #0F766E | #0F766E | Success/privacy icons |
| `--chalk-soft` | #CCFBF1 | **#D5F5EC** (213 245 236) | Privacy pill (less neon in sunlight) |
| `--chalk-text` | #115E59 | #115E59 | Privacy line text |
| `--text` | #1F2937 | **#0F172A** (15 23 42) | Body |
| `--text-muted` | #6B7280 | **#475569** (71 85 105) | Secondary text (was 4.7:1, now 7.3:1) |
| `--danger` / `--danger-text` | #DC2626 / #B91C1C | same | |
| `--sheet-check` | #E7E1D4 | **#E2E8F0** | |
| `--scrim`, `--on-scrim`, `--sheet` | | same | |
| `--shadow-rgb` | 30 42 120 | **15 23 42** | Neutral slate shadows |

### 1.3 Dark (`:root[data-theme='dark']`, mechanism unchanged)

| Token | New | | Token | New |
|---|---|---|---|---|
| `--paper` | #0B1020 | | `--ink` | #A5B4FC |
| `--card` | #131A2E | | `--ink-hover` | #C7D2FE |
| `--band` | #0F1528 | | `--ink-soft` | #1E2550 |
| `--rule` | #25304D | | `--on-ink` | #0B1020 |
| `--rule-strong` | #6B7A99 | | `--saffron` / `--saffron-hover` | #FBBF24 / #FCD34D |
| `--heading` | #EEF2FF | | `--on-saffron` | #0B1020 |
| `--text` | #E2E8F0 | | `--saffron-soft` | #3A2E0B |
| `--text-muted` | #94A3B8 | | `--saffron-text` | #FBBF24 |
| `--chalk` | #2DD4BF | | `--chalk-soft` | #0D3532 |
| `--chalk-text` | #5EEAD4 | | `--danger` / `--danger-text` | #F87171 / #FCA5A5 |
| `--shadow-rgb` | 0 0 0 | | `--sheet-check` | #E2E8F0 |

### 1.4 Contrast (WCAG 2.x formula, computed for these exact values; light / dark)

| Pair | Ratio | Pair | Ratio |
|---|---|---|---|
| text / paper | 17.10 / 15.36 | heading / paper | 15.31 / 16.93 |
| text / card | 17.85 / 14.02 | heading / card | 15.99 / 15.46 |
| text / band | 15.92 / 14.71 | heading / band | 14.26 / 16.21 |
| text / ink-soft | 15.97 / 11.87 | ink / paper | 7.57 / 9.50 |
| text-muted / paper | 7.26 / 7.38 | ink / card | 7.90 / 8.67 |
| text-muted / card | 7.58 / 6.74 | ink / band | 7.05 / 9.10 |
| text-muted / band | 6.76 / 7.07 | ink / ink-soft | 7.07 / 7.34 |
| text-muted / ink-soft | 6.78 / 5.70 | on-ink / ink | 7.90 / 9.50 |
| on-saffron / saffron | 7.44 / 11.34 | on-ink / ink-hover | 9.93 / 12.69 |
| on-saffron / saffron-hover | 9.58 / 13.13 | saffron-text / paper | 5.76 / 11.34 |
| saffron-text / card | 6.02 / 10.35 | saffron-text / saffron-soft | 5.41 / 7.98 |
| chalk-text / paper · card | 7.26 · 7.58 / 12.80 · 11.68 | chalk-text / chalk-soft | 6.54 / 9.03 |
| danger-text / paper · card | 6.20 · 6.47 / 9.98 · 9.11 | text / saffron-soft · chalk-soft | 16.03 · 15.39 / 10.81 · 10.83 |
| **Non-text (≥ 3)** rule-strong / paper · card · band · ink-soft | 3.46 · 3.61 · 3.22 · 3.23 / 4.39 · 4.01 · 4.20 · 3.39 | chalk / chalk-soft | 4.72 / 7.17 |

All text pairs ≥ 4.5, all non-text ≥ 3.0, in both themes.

**`scripts/contrast-check.ts` changes**
- `TEXT_PAIRS` add: `['text','band']`, `['text-muted','band']`, `['ink','band']`, `['ink','ink-soft']`,
  `['text','ink-soft']`, `['text-muted','ink-soft']`, `['heading','paper']`, `['heading','card']`, `['heading','band']`.
- `NON_TEXT_PAIRS` add: `['rule-strong','band']`, `['rule-strong','ink-soft']`, `['ink','band']`.
- `TINTED`: remove the `hero marker` entry (the highlighter tint behind text is gone; "in KB" is now `ink` text,
  covered by `ink/paper`).

### 1.5 Tailwind (`tailwind.config.cjs`)

```js
colors: {
  ink: { DEFAULT: token('ink'), hover: token('ink-hover'), soft: token('ink-soft') },
  band: token('band'),
  heading: token('heading'),
  // delete: margin: token('margin-line'),
  /* everything else unchanged, legacy aliases kept */
},
fontFamily: {
  sans: ['Inter', '"Inter Fallback"', 'Noto Sans Devanagari', ...defaultTheme.fontFamily.sans],
  hindi: ['Noto Sans Devanagari', 'Inter', '"Inter Fallback"', ...defaultTheme.fontFamily.sans],
},
fontSize: {
  hero:  ['clamp(1.75rem, 1.35rem + 1.8vw, 2.75rem)',  { lineHeight: '1.15', letterSpacing: '-0.025em', fontWeight: '700' }], // 28 → 44
  h1:    ['clamp(1.5rem, 1.25rem + 1.1vw, 2.25rem)',   { lineHeight: '1.2',  letterSpacing: '-0.02em',  fontWeight: '700' }], // 24 → 36
  h2:    ['clamp(1.25rem, 1.1rem + 0.6vw, 1.625rem)',  { lineHeight: '1.25', letterSpacing: '-0.015em', fontWeight: '700' }], // 20 → 26
  h3:    ['1.0625rem',                                 { lineHeight: '1.35', fontWeight: '700' }],                            // 17
  lead:  ['clamp(1.0625rem, 1rem + 0.25vw, 1.1875rem)', { lineHeight: '1.5' }],                                              // 17 → 19
  stat:  ['clamp(1.625rem, 1.4rem + 0.8vw, 2rem)',     { lineHeight: '1',    letterSpacing: '-0.02em',  fontWeight: '700' }], // 26 → 32
},
borderRadius: { card: '16px' },   // was 12; every .card follows
boxShadow: {
  btn:        '0 1px 2px rgb(var(--shadow-rgb) / 0.12), inset 0 -2px 0 rgb(0 0 0 / 0.08)',
  'btn-hover':'0 6px 16px -6px rgb(var(--shadow-rgb) / 0.30)',
  e1:         '0 1px 2px rgb(var(--shadow-rgb) / 0.06), 0 1px 3px rgb(var(--shadow-rgb) / 0.08)',
  e2:         '0 10px 28px -12px rgb(var(--shadow-rgb) / 0.28)',
  e3:         '0 24px 48px -16px rgb(var(--shadow-rgb) / 0.30)',
  lift:       '0 10px 28px -12px rgb(var(--shadow-rgb) / 0.28)', // alias of e2 so old uses follow
},
```

Weights: **700 is the heaviest weight anywhere** (we self-host Inter 400/600/700 and Noto Devanagari 400/600 only).
Never write `font-extrabold` / `font-black`.

### 1.6 Radius, spacing, motion

- Radius: `rounded-lg` 8 px (small pills, inputs inside cards), `rounded-xl` 12 px (buttons, chips, inputs),
  `rounded-2xl` / `rounded-card` 16 px (tiles, cards), `rounded-3xl` 24 px (hero art plate), `rounded-full`
  (badges, KB pills). No other values on new code.
- 8-point rhythm. Section bands `py-10 sm:py-14 lg:py-20`. H2 → content `mt-4 sm:mt-6`. Card padding
  `p-4 sm:p-5 lg:p-6`. Tile/chip gaps `gap-2.5` phones, `gap-3` from 640.
- Motion: `transition-[transform,box-shadow,background-color,border-color] duration-150 ease-out`; tiles
  `hover:-translate-y-0.5 hover:shadow-e2 active:translate-y-0 active:scale-[.98] motion-reduce:transform-none`.
  The global reduced-motion kill switch stays.
- Dark elevation: shadows are invisible on #0B1020. Add in `global.css`:
  `:root[data-theme='dark'] :is(.card, .shadow-e1, .shadow-e2) { box-shadow: 0 0 0 1px rgb(255 255 255 / 0.06); }`

---

## 2. Page background, width and bands (global)

- Delete both `body { background-image }` media blocks (ruled lines, margin line). `body` is flat `rgb(var(--paper))`.
- `html { overflow-x: clip; }` (not `hidden`, which breaks sticky elements).
- `.container-fluid` max width **1920 px** (owner, 2026-11-22: full width on every common screen; was 1280). With the 48 px `xl` gutters, content is 1184 px wide at ≥1280,
  so header, home, footer and every page line up, and lines at 1440 stay readable. No other gutter change.
- Full-bleed band helper (home sections and footer use it; opt-in elsewhere):
  ```css
  .band { margin-inline: calc(50% - 50vw); padding-inline: calc(50vw - 50%); background: rgb(var(--band)); }
  .band-plain { margin-inline: calc(50% - 50vw); padding-inline: calc(50vw - 50%); }
  ```
  Never use `100vw` widths directly.
- Home hero wash (on the hero `<section>` only, 0 bytes, decorative):
  ```css
  .hero-wash { background:
      radial-gradient(90% 60% at 100% 0%, rgb(var(--ink) / .07), transparent 60%),
      radial-gradient(60% 50% at 0% 100%, rgb(var(--saffron) / .08), transparent 70%); }
  :root[data-theme='dark'] .hero-wash { background:
      radial-gradient(90% 60% at 100% 0%, rgb(var(--ink) / .10), transparent 60%),
      radial-gradient(60% 50% at 0% 100%, rgb(var(--saffron) / .05), transparent 70%); }
  ```
- Base rules (`@layer base`):
  ```css
  h1, h2, h3 { color: rgb(var(--heading)); }
  h1, h2 { text-wrap: balance; }
  .text-lead { text-wrap: pretty; }
  .num { font-variant-numeric: tabular-nums; }
  ```

---

## 3. Fonts and type (global)

### 3.1 `src/styles/fonts.css`

1. **Devanagari 700 with no new file** (stops faux bold smearing matras):
   ```css
   @font-face {
     font-family: 'Noto Sans Devanagari'; font-style: normal; font-weight: 700; font-display: swap;
     src: local('Noto Sans Devanagari Bold'), local('NotoSansDevanagari-Bold'),
          url('/fonts/noto-devanagari-600.woff2') format('woff2');
     unicode-range: U+0900-097F, U+1CD0-1CF9, U+200C-200D, U+20F0, U+25CC, U+A830-A839, U+A8E0-A8FF;
   }
   ```
2. **Metric-matched Inter fallback** (no CLS when Inter swaps in):
   ```css
   @font-face { font-family: 'Inter Fallback'; src: local('Arial'), local('Roboto');
     size-adjust: 107.06%; ascent-override: 90.49%; descent-override: 22.56%; line-gap-override: 0%; }
   ```
3. `RootShell.tsx`: on the home route only (`/`, `/hi`), also preload `/fonts/inter-latin-700.woff2` (the H1 is
   700 and is the LCP text). Other pages keep only the 400 preload.

### 3.2 Scale

| Token | 360 | 768 | 1024 | 1440 | Weight | Line height | Tracking |
|---|---|---|---|---|---|---|---|
| `text-hero` (home H1) en | 28 | 37 | 40 | 44 | 700 | 1.15 | −0.025em |
| `text-hero` hi | 26 | 33 | 36 | 40 | 700 (local Bold / 600 file) | 1.4 | 0 |
| `text-h1` (other pages) en | 24 | 31 | 34 | 36 | 700 | 1.2 | −0.02em |
| `text-h1` hi | 24 | 31 | 34 | 36 | 700 | 1.4 | 0 |
| `text-h2` en / hi | 20 → 26 | | | | 700 | 1.25 / 1.45 | −0.015em / 0 |
| `text-h3` en / hi | 17 | 17 | 17 | 17 | 700 | 1.35 / 1.5 | 0 |
| `text-lead` en / hi | 17 | 18 | 18 | 19 | 400 | 1.5 / 1.7 | 0 |
| body en / hi | 16 / 16 | | | | 400 | 1.55 / 1.7 | 0 |
| small | 14 (never smaller, except the 13 px 600-weight tile kicker) | | | | 400/600 | 1.45 / 1.6 | 0 |
| `text-stat` (KB numbers) | 26 | 29 | 30 | 32 | 700, `.num` | 1 | −0.02em |

Hindi overrides in `global.css` (`@layer base`):
```css
html[lang|='hi'] body { line-height: 1.7; }
html[lang|='hi'] :is(.text-hero, .text-h1, .text-h2, .text-h3, h1, h2, h3) { letter-spacing: 0; line-height: 1.4; }
html[lang|='hi'] .text-hero { font-size: clamp(1.625rem, 1.25rem + 1.6vw, 2.5rem); }
html[lang|='hi'] .text-lead { line-height: 1.7; }
```
Rules: no `uppercase` anywhere (it breaks Hindi and shouts in English); no `leading-tight`/`leading-none` on anything
that can hold Devanagari, except `text-stat` (digits and "KB" only). KB numbers stay Latin in Hindi ("20 KB").

---

## 4. Shared components (global)

| Component | Classes | Use |
|---|---|---|
| `.btn-action` (primary, keep name) | `inline-flex min-h-[52px] min-w-tap items-center justify-center gap-2 rounded-xl bg-saffron px-5 font-bold text-on-saffron shadow-btn hover:bg-saffron-hover hover:shadow-btn-hover active:scale-[.98]` (drop the hover translate) | **One per screen**: "Take photo", home "Other size", "Download" |
| `.btn-secondary` (new) | `inline-flex min-h-[52px] items-center justify-center gap-2 rounded-xl border-[1.5px] border-rule-strong bg-card px-5 font-semibold text-ink no-underline hover:border-ink hover:bg-ink-soft active:scale-[.98]` | "Choose from gallery", "See all exams", Signature |
| Text link button | `inline-flex min-h-tap items-center gap-1 rounded-xl px-2 text-[15px] font-semibold text-ink no-underline hover:bg-ink-soft` | "All 48 exams →" |
| `.chip` (one style everywhere) | `inline-flex min-h-tap items-center justify-center rounded-xl border border-rule-strong bg-card px-3 text-[15px] font-semibold text-ink whitespace-nowrap hover:border-ink hover:bg-ink-soft`; `[aria-pressed=true]`: `border-ink bg-ink text-on-ink`; `.chip-n` → `bg-ink-soft text-ink` | Home exam chips, /exams filters, DocOtherChips |
| Input | `min-h-[56px] rounded-xl border-[1.5px] border-rule-strong bg-card px-4 text-base placeholder:text-muted focus:border-ink focus:ring-4 focus:ring-ink/15` | HeroSearch, site search |
| `.card` | `rounded-card border border-rule bg-card` (+ `shadow-e1` where elevated) | |
| Focus | `:focus-visible { outline: 3px solid rgb(var(--ink)); outline-offset: 2px; }`; on saffron/ink fills `outline-color: rgb(var(--heading))` light, `rgb(var(--saffron))` dark | |
| `.marker` (restyle, keep name) | see below | "in KB" in the H1 |
| `.stamp` | keep shape, drop `rotate(-2deg)` and the double border: `rounded-lg border-2 border-chalk bg-chalk-soft` | Result screen |

```css
.marker {
  color: rgb(var(--ink));
  background: linear-gradient(rgb(var(--saffron)), rgb(var(--saffron))) no-repeat 0 94% / 100% 0.12em;
  padding: 0; margin: 0; border-radius: 0;
  -webkit-box-decoration-break: clone; box-decoration-break: clone;
}
/* delete the old :root[data-theme='dark'] .marker block: ink is already light in dark mode */
```

**Icon.tsx**: add `chevronDown` (24 px stroke, same style as `arrowRight`) and `sliders` (for "Other size"). Server
SVG only.

**Hover sweep (global, CSS-only):** `hover:bg-paper` and `hover:bg-saffron-soft` on interactive rows/buttons become
`hover:bg-ink-soft` (Header, HeaderClient, LangToggle, ThemeToggle, HomeTools, HomePaths, ExamSearch result rows).
Wells inside white cards that used `bg-paper`/`bg-bg` to show a region (table heads in SpecTable/IdSpecTable,
SummaryGrid, chip counts, ExamCard cycle badge) become `bg-band`, because #F8FAFF on white is too faint. Leave
`bg-paper` where it is a page-level background. There are ~39 uses in 29 files; the build agent greps
`bg-paper\b|bg-bg\b` and applies this rule.

---

## 5. Header (global)

```
360  ┌────────────────────────────────────┐ 56 px, bg-card, border-b border-rule, NOT sticky
     │ [✓] SahiSize        🔍  हिं  ☾  ☰  │ 4 × 48 px buttons + logo fit in 328 px
     └────────────────────────────────────┘
1024+┌────────────────────────────────────────────────────────────────────────┐ 64 px
     │ [✓] SahiSize    Exams  Tools  Govt ID  Guides           🔍  हिं  ☾     │
     └────────────────────────────────────────────────────────────────────────┘
                     ‾‾‾‾‾ current page: 2 px ink bar under the label
```
- Stays `relative` (not sticky) at every width: zero scroll cost on a 780 px phone, no blur paint cost.
- `min-h-[56px] lg:min-h-[64px]`, inner `container-fluid` (now 1280 max).
- Logo: "Sahi" `text-saffron-text`, "Size" `text-heading`, `text-lg sm:text-xl font-bold tracking-tight`.
- Desktop nav: `text-[15px] font-semibold text-text hover:text-ink`, current page `text-ink` +
  `after:absolute after:inset-x-2 after:-bottom-px after:h-0.5 after:bg-ink` (not colour alone, WCAG 1.4.1).
- Icon buttons: `h-tap w-tap rounded-xl text-heading hover:bg-ink-soft`. "हिं" label `text-[17px]`, "EN" `text-[15px] font-bold`.
- Menu (`data-nav-menu`): summary `group-open:bg-ink-soft` (replaces `saffron-soft`); panel `bg-card shadow-e3 rounded-b-2xl`, rows `min-h-[56px] rounded-xl hover:bg-ink-soft`.
- Keep `data-nav-menu`, `data-menu-lang`, `data-theme-toggle`, `data-label-*`, `data-site-search`, `data-focus-hero-search`.

---

## 6. Home hero

### 6.1 Exact copy

| Element | English | Hindi | Key |
|---|---|---|---|
| H1 | Photo size **in KB** for any form | फोटो साइज़ **KB में**, हर फॉर्म के लिए | `site.home.hero` (changed), `heroMark` = "in KB" / "KB में" (unchanged) |
| Lead | Tap the size your form asks for. | आपका फॉर्म जितना KB माँगे, उस पर टैप करें। | `site.home.heroSub` (changed) |
| Privacy line (shield icon, `data-privacy-line`) | Your photo never leaves your phone. | आपकी फोटो आपके फोन से बाहर नहीं जाती। | `site.home.heroPrivacy` (new) |
| Size group H2 (`id="path-size-h"`, sr-only below 1024, visible label from 1024) | Just need a size? | बस कोई साइज़ चाहिए? | `pathSize` (unchanged) |
| KB tile kicker | Photo to | फोटो | `site.home.tilePhoto` (new) |
| KB tile number | 20 KB · 50 KB · 100 KB · 200 KB | same (Latin digits) | – |
| Primary action | Other size | दूसरा साइज़ | `site.home.otherSize` (new) |
| Primary sub-line | Type any KB | कोई भी KB लिखें | `site.home.otherSizeSub` (new) |
| Signature action | Signature | सिग्नेचर | `site.home.signature` (new) |
| Signature sub-line | Scan and resize | स्कैन करें, साइज़ बदलें | `site.home.signatureSub` (new) |
| Exam kicker | Don't know the size? | साइज़ नहीं पता? | `site.home.pathExamKicker` (new) |
| Exam H2 (`id="path-exam-h"`) | Filling an exam form? | परीक्षा का फॉर्म भर रहे हैं? | `pathExam` (unchanged) |
| Exam hint (≥640 only) | Tap your exam, or search for it. | अपनी परीक्षा पर टैप करें या खोजें। | `pathExamHint` (unchanged) |
| All exams link | See all {count} exams → (phones: "All {count} →") | सभी {count} परीक्षाएँ देखें → | `allExams` (unchanged; `{count}` = `publishedPresets().length`, never hard-coded) |
| Most searched H2 (`id="path-top-h"`) | Most searched sizes | सबसे ज़्यादा खोजे गए साइज़ | `sizesTitle` (unchanged) |

Removed from the hero: the Hinglish `heroTagline` (key kept, unused), the "or" divider (`pathOr` kept, unused),
`pathSizeHint` (kept, unused), the separate `CORE_PROMISE` line under the paths (CORE_PROMISE moves to the footer
brand block; `data-privacy-line` moves to the new hero privacy line). `<title>` and meta are unchanged.

Accessible names: KB tiles read "Photo to 20 KB" (en) / "फोटो 20 KB" (hi) from visible text in DOM order. No
`aria-label` on tiles (keeps label-in-name).

### 6.2 Actions (`data-path="size"` on the wrapper, `<ul data-size-tasks>`, each `<a data-task>` keeps its id)

Order and ids: `20kb`, `50kb`, `100kb`, `200kb`, `any-kb` (→ `/tools/photo-size-converter-in-kb`, hi via
`hindiPathFor`), `signature`. Remove `pan`, `passport`, `custom` from `tasks` (they live in Tools, §7.2, keeping
`data-other-doc`).

Grid: `ul.grid grid-cols-2 gap-2.5 sm:grid-cols-4 sm:gap-3`. `any-kb` and `signature` items are
`col-span-1 sm:col-span-2`. Result: phones 2×2 KB tiles + one row [Other size | Signature]; ≥640 one row of 4 KB
tiles + one row of two half-width actions. Always full rows.

**A. KB tile ×4**
```tsx
<a data-task="20kb" href=… className="group relative flex h-full min-h-[72px] flex-col justify-center rounded-2xl
   border border-rule bg-card px-4 py-3 no-underline shadow-e1 transition-[transform,box-shadow,border-color]
   duration-150 hover:-translate-y-0.5 hover:border-ink hover:shadow-e2 active:translate-y-0 active:scale-[.98]
   motion-reduce:transform-none sm:min-h-[84px] lg:min-h-[88px]">
  <span className="text-[13px] font-semibold leading-snug text-muted">{tilePhoto}</span>
  <span className="num text-stat text-heading">20<span className="ml-1 text-base font-bold text-ink">KB</span></span>
  <Icon name="arrowRight" size={16} className="absolute right-3 top-3 text-muted group-hover:text-ink" />
</a>
```
The tile edge is carried by fill + shadow + `rule`; the label identifies it, so 1.4.11 does not need a 3:1 border.

**B. Other size (the one primary)**
```tsx
<a data-task="any-kb" className="btn-action h-full min-h-[64px] w-full justify-start gap-3 rounded-2xl px-4 text-left">
  <Icon name="sliders" size={22} className="shrink-0" />
  <span className="min-w-0 flex-1"><span className="block text-base font-bold">{otherSize}</span>
    <span className="block text-[13px] font-semibold opacity-90">{otherSizeSub}</span></span>
  <Icon name="arrowRight" size={18} className="shrink-0" />
</a>
```
**C. Signature**
```tsx
<a data-task="signature" className="btn-secondary h-full min-h-[64px] w-full justify-start gap-3 rounded-2xl px-4 text-left">
  <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-ink-soft text-ink"><Icon name="pen" size={22} /></span>
  <span className="min-w-0 flex-1"><span className="block text-base font-bold text-ink">{signature}</span>
    <span className="block text-[13px] font-semibold text-muted">{signatureSub}</span></span>
</a>
```
At 360 each half cell is 159 px: "दूसरा साइज़" / "कोई भी KB लिखें" fit at 16/13 px; sub-lines may wrap to 2 lines
(allowed: `min-h`, never fixed `h`).

### 6.3 Exam card (`<section data-path="exam" aria-labelledby="path-exam-h">`)

- `rounded-2xl border border-rule bg-card p-4 shadow-e1 sm:p-5`.
- Kicker `<p class="text-sm font-semibold text-muted">Don't know the size?</p>`, then H2 `text-h3` with a 32 px
  `rounded-xl bg-ink-soft text-ink` search-icon well. Hint `hidden sm:block text-sm text-muted`.
- HeroSearch: logic untouched. Class strings only (in `ExamSearch.tsx` hero variant): input per §4 Input, `bg-paper`
  inside the white card, remove `shadow-lift`; result rows `hover:bg-ink-soft`.
- Chips `<ul data-exam-chips class="mt-3 grid grid-cols-3 gap-2 sm:grid-cols-4">`: 6 chips below 640 (items 7–8
  keep `wideOnly` → `hidden sm:block`), 8 from 640. Always 2 full rows. Chip = `.chip w-full` (§4).
- **Hindi chips (owner to confirm, default ON):** on `/hi` the visible label is the Latin code
  (`latinTitleName(p)` from `src/server/content/exam-meta.ts`: "IBPS PO", "SSC CGL") with `lang="en"`, and the Hindi full name in `title`. This is how the
  name appears on forms and admit cards and stops 2-line chips. If the owner rejects it, keep Hindi `cardName` and
  use `grid-cols-2 sm:grid-cols-4` on `/hi`.
- Then the text-link button "See all {count} exams →" (`/exams`, localized), right-aligned.

### 6.4 Most searched (`<section data-most-searched aria-labelledby="path-top-h">`)

- Card as §6.3. H2 `text-h3` with a 32 px `bg-saffron-soft text-saffron-text` well (icon `badge`).
- Rows `<a data-size-row>`: `-mx-2 flex min-h-[56px] flex-wrap items-center gap-x-3 gap-y-1 rounded-xl px-2 py-2
  no-underline hover:bg-ink-soft`, `divide-y divide-rule` on the list. Label `min-w-0 flex-1 font-semibold
  text-heading`. Spec as a pill `ml-auto shrink-0 rounded-full bg-ink-soft px-2.5 py-1 text-sm font-bold num
  text-ink` (wraps under the label when long). Chevron `text-muted`.

### 6.5 Illustration (`RouteHero route="/"`, slot `home-hero`, 3:2, #F8FAFF background)

- **Remove `priority`.** Lazy everywhere; the H1 is the LCP element at every width.
- **< 768:** not in the hero. Hero figure is `hidden md:block`. A second `RouteHero` renders at the top of How it
  works with `md:hidden` (lazy; Chrome does not fetch lazy images inside `display:none`, so phones fetch it only
  when scrolled near).
- **768–1023:** beside the H1 + lead, 280 px wide.
- **≥ 1024:** right 5/12 column, top-aligned with the H1 (`lg:self-start lg:mt-2`), sized so its bottom lands
  within ±40 px of the tile grid's bottom. Light: no border, no shadow, no box (background = page).
- **Dark:** a deliberate plate: wrapper `dark:rounded-3xl dark:bg-sheet dark:p-2 dark:ring-1 dark:ring-white/10`,
  image `dark:brightness-[.92]`.
- Keep `width`/`height` from the manifest (CLS 0) and `data-route-hero`.

### 6.6 Hero DOM and grid

DOM order (also the heading order): H1 → lead → privacy line → H2 "Just need a size?" + tiles → exam card (H2) →
most-searched card (H2) → figure. Figure last in the DOM; CSS places it.

```tsx
<section className="hero-wash band-plain">
  <div className="mx-auto max-w-[1184px] pt-5 pb-10 sm:pt-10 lg:pt-14 lg:pb-16">
    <div className="grid gap-y-5 md:grid-cols-[minmax(0,1fr)_280px] md:gap-x-8 lg:grid-cols-12 lg:gap-x-10">
      <div className="min-w-0 md:col-start-1 md:row-start-1 lg:col-span-7">H1 · lead · privacy</div>
      <div data-path="size" className="min-w-0 md:col-span-2 md:row-start-2 lg:col-span-7 lg:row-start-2">H2 · tiles</div>
      <figure className="hidden md:block md:col-start-2 md:row-start-1 md:self-center
                         lg:col-span-5 lg:col-start-8 lg:row-span-2 lg:row-start-1 lg:self-start lg:mt-2">RouteHero</figure>
    </div>
    <div data-home-paths className="mt-6 grid gap-4 md:grid-cols-2 md:items-stretch lg:mt-10 lg:grid-cols-12 lg:gap-10">
      <section data-path="exam" className="lg:col-span-7">…</section>
      <section data-most-searched className="lg:col-span-5">…</section>
    </div>
  </div>
</section>
```
(`data-home-paths` may move to an outer wrapper if a check expects it to contain `data-path="size"`; keep the
attribute on exactly one element.)

### 6.7 Wireframes

**360 × 780, English** (y in px; Playwright viewport, no browser chrome)
```
y=0   ┌────────────────────────────────────┐
      │ [✓] SahiSize        🔍  हिं  ☾  ☰  │ header 56, static
56    ├────────────────────────────────────┤ (faint indigo wash top-right)
76    │ Photo size in KB                   │ H1 28/1.15, 700, heading colour, 2 lines
      │ for any form                       │ "in KB" ink + saffron bar
146   │ Tap the size your form asks for.   │ lead 17, muted, 1 line
178   │ 🛡 Your photo never leaves your phone│ 15 px chalk-text, data-privacy-line
206   │                                    │ (sr-only H2 "Just need a size?")
226   │ ┌───────────────┐ ┌───────────────┐│ KB tiles 159×72, gap 10
      │ │Photo to     → │ │Photo to     → ││ kicker 13 muted
      │ │20 KB          │ │50 KB          ││ number 26 heading, "KB" ink
      │ └───────────────┘ └───────────────┘│
      │ ┌───────────────┐ ┌───────────────┐│
      │ │Photo to     → │ │Photo to     → ││
      │ │100 KB         │ │200 KB         ││
      │ └───────────────┘ └───────────────┘│ 380
390   │ ┏━━━━━━━━━━━━━━━┓ ┌───────────────┐│ 64 px
      │ ┃⚙ Other size  →┃ │(✎) Signature  ││ saffron PRIMARY | outline secondary
      │ ┃  Type any KB  ┃ │ Scan and resize││
      │ ┗━━━━━━━━━━━━━━━┛ └───────────────┘│ 454
478   │ ┌────────────────────────────────┐ │ exam card
      │ │ Don't know the size?           │ │ kicker 14 muted
      │ │ (🔍) Filling an exam form?      │ │ h3 17
      │ │ ┌────────────────────────────┐ │ │
      │ │ │ 🔍 Search your exam…        │ │ │ 56 px input, bottom ≈ 608
      │ │ └────────────────────────────┘ │ │
      │ │ [IBPS PO] [SSC CGL] [NEET UG]  │ │ 3×2 chips, 48 px, full rows
      │ │ [RRB NTPC][SBI PO ] [SSC CHSL] │ │
      │ │            See all 48 exams →  │ │
      │ └────────────────────────────────┘ │ ≈ 780 (fold)
      │ ┌ (★) Most searched sizes ───────┐ │
      │ │ JEE Main 10th certificate size │ │
      │ │                  [50–300 KB·PDF]│ │ KB pill
      │ │ SSC CGL signature   [10–20 KB] │ │
      │ └────────────────────────────────┘ │ hero ends ≈ 1,150
```
**360, Hindi:** H1 "फोटो साइज़ KB में, / हर फॉर्म के लिए" 2 lines at 26/1.4 (≈ 73 px); lead may take 2 lines at
17/1.7. Everything shifts ≈ 35 px: tiles end ≈ 490, search input bottom ≈ 645.

**768 × 1024**
```
┌──────────────────────────────────────────────────────────────┐ header 56
│ Photo size in KB for any form           ┌──────────────────┐ │ grid [1fr_280px] gap-8
│ (H1 37, 1–2 lines)                      │  illustration    │ │ art centred on the text block
│ Tap the size your form asks for.        │  280×187, lazy   │ │
│ 🛡 Your photo never leaves your phone.   └──────────────────┘ │
│ ┌────────────┐┌────────────┐┌────────────┐┌────────────┐     │ 4 KB tiles, 84 px
│ │Photo to  → ││Photo to  → ││Photo to  → ││Photo to  → │     │
│ │20 KB       ││50 KB       ││100 KB      ││200 KB      │     │
│ └────────────┘└────────────┘└────────────┘└────────────┘     │
│ ┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓┌────────────────────────────┐ │ 64 px, half width each
│ ┃⚙ Other size · Type any KB →┃│(✎) Signature · Scan and…   │ │
│ ┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛└────────────────────────────┘ │
│ ┌────────────────────────────┐┌────────────────────────────┐ │ md:grid-cols-2, equal height
│ │ Don't know the size?       ││ (★) Most searched sizes     │ │
│ │ (🔍) Filling an exam form?  ││ JEE Main 10th…  [50–300 KB] │ │
│ │ [ 🔍 Search your exam…    ] ││ CSIR NET …      [50–300 KB] │ │
│ │ [IBPS PO][SSC CGL][NEET][RRB]│ RRB NTPC SC/ST  [≤399 KB]   │ │ chips 4×2
│ │ [SBI PO][CHSL][CTET][UPSC]  ││ SSC CGL sign.   [10–20 KB]  │ │
│ │        See all 48 exams →  ││                             │ │
│ └────────────────────────────┘└────────────────────────────┘ │ ≈ y 950: whole hero on one screen
```

**1024 × 768** (12 columns, gap 40; content 960 px)
```
┌────────────────────────────────────────────────────────────────────────┐ header 64
│ ┌──── col 1–7 (≈543) ───────────────────┐  ┌── col 8–12 (≈377) ──────┐ │
│ │ Photo size in KB                      │  │                         │ │ art top = H1 top + 8
│ │ for any form            (H1 40, 2 ln) │  │   illustration 3:2      │ │
│ │ Tap the size your form asks for.      │  │   ≈377×251, no frame    │ │
│ │ 🛡 Your photo never leaves your phone. │  │                         │ │
│ │ Just need a size?   (15 px label)     │  └─────────────────────────┘ │
│ │ [Photo to 20KB][50KB][100KB][200KB]   │                              │ tiles ≈127×88
│ │ [⚙ Other size        →][(✎) Signature]│                              │
│ └───────────────────────────────────────┘                              │
│ ┌── exam card col 1–7 ──────────────────┐  ┌── most searched 8–12 ───┐ │ equal height
│ │ Don't know the size?                  │  │ (★) Most searched sizes │ │
│ │ (🔍) Filling an exam form?             │  │ rows with KB pills      │ │
│ │ [ 🔍 Search your exam…              ] │  │                         │ │
│ │ [IBPS PO][SSC CGL][NEET UG][RRB NTPC] │  │                         │ │
│ │ [SBI PO ][SSC CHSL][CTET  ][UPSC CSE] │  │                         │ │
└────────────────────────────────────────────────────────────────────────┘
```

**1440 × 900** (container 1280, content 1184, ≈128 px outer margins)
```
┌──────────────────────────────────────────────────────────────────────────────────────┐ header 64
│        ┌──────────────── content 1184 ───────────────────────────────────┐           │
│        │ Photo size in KB                   │ ┌──────────────────────────┐│           │ pt-14
│        │ for any form         (H1 44, ≤2 ln)│ │                          ││           │ art top-aligned
│        │ Tap the size your form asks for.   │ │  illustration ≈ 460×307  ││           │ with H1
│        │ 🛡 Your photo never leaves your     │ │  no frame (light)        ││           │
│        │   phone.                           │ │                          ││           │
│        │ Just need a size?                  │ └──────────────────────────┘│           │
│        │ [20 KB ][50 KB ][100 KB][200 KB]   │                             │           │ 88 px tiles
│        │ [⚙ Other size     →][✎ Signature]  │                             │ ≈ y 560   │
│        │ ┌─ exam card (7/12) ─────────────┐ ┌─ Most searched (5/12) ─────┐│ ≈ y 640   │
│        │ │ Don't know the size?           │ │ JEE Main 10th…  [50–300 KB]││           │
│        │ │ Filling an exam form?          │ │ CSIR NET …      [50–300 KB]││           │
│        │ │ [ 🔍 Search your exam…       ] │ │ …                          ││ input ≈ 760│
│        │ │ [chips 4×2]                    │ │                            ││           │
└──────────────────────────────────────────────────────────────────────────────────────┘ fold 900
```

**Dark (all widths):** page #0B1020 with the dark wash; tiles `bg-card` #131A2E with the 1 px white/6% ring, numbers
#EEF2FF, "KB" #A5B4FC; "Other size" #FBBF24 with #0B1020 text; Signature outlined #6B7A99; exam/most cards #131A2E;
art on the light plate (§6.5). Nothing on the page is brighter than the plate.

---

## 7. Rest of the home

Band order: hero (`hero-wash`) → Popular exams (`.band`) → Tools (paper) → How it works (`.band`) → Trust + FAQ
(paper) → footer (`bg-band`). Inner content `mx-auto max-w-[1184px]`.

**Section header pattern** (Popular, Tools):
```tsx
<div className="flex items-end justify-between gap-4">
  <h2 id="pop-h" className="text-h2">…</h2>
  <a className="inline-flex min-h-tap shrink-0 items-center gap-1 rounded-xl px-2 text-[15px] font-semibold text-ink no-underline hover:bg-ink-soft">
    <span className="sm:hidden">All {count} →</span><span className="hidden sm:inline">See all {count} exams →</span>
  </a>
</div>
```
(Hindi short form: "सभी {count} →". Add `site.home.allShort` = "All {count}" / "सभी {count}".)

### 7.1 Popular exams (`#pop-h`, `.band`)
- 12 cards in the HTML; phones show 6: `max-sm:[&>li:nth-child(n+7)]:hidden`. Grid `grid gap-3 sm:grid-cols-2
  lg:grid-cols-3 xl:grid-cols-4` (12 = full rows at 3 and 4 columns; at sm/md 6 rows of 2).
- Under the grid on phones only: full-width `.btn-secondary` "See all {count} exams".
- **ExamCard (global; /exams, related, 404):** `card shadow-e1 flex h-full flex-col p-4 transition hover:-translate-y-0.5 hover:border-ink hover:shadow-e2`;
  name `text-h3 text-heading` (keeps `data-card-name` and the sr-only full name); cycle badge `bg-ink-soft text-ink
  font-semibold text-xs rounded-full px-2 py-0.5` (was invisible); sizes `text-sm font-semibold num text-text`
  (`data-card-sizes`); docs `text-sm text-muted` (`data-card-docs`); arrow in a 32 px `rounded-full bg-ink-soft
  text-ink` circle. All `data-exam-card`, `data-group`, `data-search` hooks unchanged.

### 7.2 Tools (`data-home-tools data-other-docs`, paper)
- Remove the 4 rows that repeat the hero (Photo to 20/50/100/200 KB). They stay linked from the hero.
- Order: **By document** (PAN photo, PAN signature, Passport, 3.5×4.5 cm, Stamp, Postcard, Signature, Thumb,
  Declaration) → **By file size** (20–50 KB, converter, compress, increase, Custom size) → **PDF and more**.
- Each group: `<details data-open-md class="card shadow-e1 overflow-hidden group" data-tool-group={id}>`.
  Summary `flex min-h-[56px] items-center gap-3 px-4 list-none cursor-pointer [&::-webkit-details-marker]:hidden`
  with a 32 px `rounded-lg bg-ink-soft text-ink` icon (`badge` / `file` / `download`), the H3 (keep
  `id="tools-{id}-h"`, sentence case, `text-h3`), a count `ml-auto text-sm text-muted`, and `chevronDown`
  (`md:hidden group-open:rotate-180`).
- Phones: "By document" has `open`; the other two are closed. ≥768: all open (§8.3). Grid `md:grid-cols-2 lg:grid-cols-3 items-start`.
- Rows: `min-h-[52px] px-4 hover:bg-ink-soft`, name `font-semibold text-heading`, spec `text-sm num text-muted`,
  note `text-xs text-muted`. `data-other-doc` kept.

### 7.3 How it works (`.band`)
- Phones: the lazy `RouteHero` (`md:hidden`, `rounded-3xl`, max-w 360 centred) first, then 3 rows: 40 px
  `rounded-full bg-ink text-on-ink` number, title `text-h3`, text `text-sm text-muted`. The step scene boxes are
  `hidden sm:block`.
- ≥640: 3 columns with the scenes, scene box `rounded-xl bg-card ring-1 ring-rule` (no cream box).

### 7.4 Trust strip (paper)
- One card: `card shadow-e1 grid divide-y divide-rule md:grid-cols-4 md:divide-y-0 md:divide-x`. Item `flex
  items-center gap-3 px-4 py-3`, 36 px `rounded-xl bg-chalk-soft text-chalk` icon well, title `font-semibold
  text-heading`, text `text-sm text-muted` (phones: same line under the title, 1 line each).

### 7.5 FAQ (paper, global component)
- `FaqList` gets an `openFirst?: boolean` prop (home passes `true`; other pages unchanged). Container `card shadow-e1
  divide-y divide-rule`; summary `min-h-[56px] px-4 sm:px-5 font-semibold text-heading` with `chevronDown`
  `transition-transform group-open:rotate-180` (replaces "+"). FaqIllustration unchanged (hidden < 768). FAQ text
  and FAQPage JSON-LD unchanged.

### 7.6 Feedback widget: unchanged.

Target: home at 360 ≤ 5,000 px (today 8,366).

---

## 8. Footer (global)

### 8.1 Layout
```
360 ┌────────────────────────────────────┐ bg-band border-t border-rule
    │ [✓] SahiSize                       │ brand block
    │ Right size, first time. Your photo │ CORE_PROMISE, text-sm muted
    │ never leaves your phone.           │
    │ (Not affiliated with any govt body)│ pill: rounded-full bg-card ring-1 ring-rule text-xs
    ├────────────────────────────────────┤
    │ Tools                            ⌄ │ <details data-open-md> summary 56 px
    ├────────────────────────────────────┤
    │ Top exams                        ⌄ │
    ├────────────────────────────────────┤
    │ Guides                           ⌄ │
    ├────────────────────────────────────┤
    │ About and legal                  ⌄ │
    ├────────────────────────────────────┤
    │ © 2026 … · Operated by …           │ text-[13px] muted
    └────────────────────────────────────┘ ≈ 440 px

768+┌──────────────────────────────────────────────────────────────────────┐ grid-cols-[1.4fr_1fr_1fr_1fr_1fr] gap-8 py-12
    │ [✓] SahiSize        Tools          Top exams    Guides     About      │ groups open, chevrons hidden
    │ Right size, first…  Compress…      RRB NTPC     How to…    Privacy    │ (768–1023: brand row on top,
    │ (Not affiliated…)   …              …            …          …          │  4 columns below)
    ├──────────────────────────────────────────────────────────────────────┤
    │ © 2026 … · Operated by …                                             │
    └──────────────────────────────────────────────────────────────────────┘
```
At 768–1023 use `md:grid-cols-4` with the brand block `md:col-span-4`; at `lg:` the 5-column grid.

### 8.2 Markup
- `<footer class="bg-band border-t border-rule">` (drop `mt-12`; bands touch). Inner `container-fluid`.
- Each group: `<details data-open-md class="group border-t border-rule md:border-0">` with
  `<summary class="flex min-h-[56px] cursor-pointer list-none items-center justify-between [&::-webkit-details-marker]:hidden md:min-h-0 md:mb-2 md:cursor-default">`
  containing `<h2 id="ft-tools" class="text-[15px] font-bold text-heading">` (ids `ft-tools`, `ft-exams`,
  `ft-guides`, `ft-legal` kept; the `ul` keeps `aria-labelledby`) and `chevronDown` `md:hidden group-open:rotate-180`.
- Links `inline-flex min-h-tap items-center text-[15px] text-text no-underline hover:text-ink hover:underline`
  (48 px kept at every width). Phones: Tools/Exams/Guides lists `grid grid-cols-1`; Legal `flex flex-wrap gap-x-4`.
- Bottom bar: `border-t border-rule py-5 text-[13px] text-muted`, copyright + operator. `notAffiliated` moves to
  the brand block pill.
- All ~33 links stay in the HTML (closed `<details>` content is in the DOM and indexed).

### 8.3 Open at ≥ 768 (footer groups and home tool groups share `data-open-md`)
```css
@media (min-width: 768px) {
  @supports selector(::details-content) {
    details[data-open-md]::details-content { content-visibility: visible; display: block; height: auto; }
  }
  details[data-open-md] > summary { pointer-events: none; }
}
```
Fallback for browsers without `::details-content`: in the existing `HeaderClient` (already on every page, no new
island) run once on mount:
`if (matchMedia('(min-width:768px)').matches) document.querySelectorAll('details[data-open-md]').forEach(d => { d.open = true; });`
Both elements are below the fold at ≥768, so this causes no CLS.

---

## 9. Global fixes so other pages do not break

| Area | Change | Files |
|---|---|---|
| Tokens, background, width | §1, §2 | `global.css`, `tailwind.config.cjs`, `scripts/contrast-check.ts` |
| Fonts | §3.1 | `fonts.css`, `RootShell.tsx` |
| Heading colour | `h1,h2,h3 { color: heading }` replaces `h1,h2 { color: ink }`. Remove explicit `text-ink`/`text-primary` on H1s. | `global.css`, `HomePage.tsx` |
| Page H1s | Use `text-h1` instead of `text-2xl … sm:text-3xl lg:text-4xl` / `text-3xl` (17 places). No layout change. | Tool, Exam, Guide, Legal, IdDocument, Kit layouts; index pages |
| Buttons | `.btn-action` per §4; "Choose from gallery" and other outline buttons → `.btn-secondary` | `global.css`, `src/components/ui/Button.tsx`, tool flows |
| Wells and hovers | Sweep per §4 "Hover sweep" (`bg-paper`/`bg-bg` inside cards → `bg-band`; interactive hovers → `ink-soft`) | ~29 files |
| `.chip`, `.stamp`, `.marker`, `shadow-lift` | §4; `shadow-lift` aliased to e2 | `global.css`, `tailwind.config.cjs` |
| ExamCard, FaqList, Header, Footer | §5, §7.1, §7.5, §8 | components |
| `margin` colour | Deleted. Grep `bg-margin|text-margin|border-margin` must return nothing. | |

Tool and exam pages get **no layout change** in this pass. (Separate later task: on `/exam/*` at < 640 px, move the
spec box above the long intro.)

---

## 10. Hard-rule and SEO checklist (must stay true)

- One H1 per page. Home heading order: H1 → H2 "Just need a size?" (sr-only < 1024) → H2 "Filling an exam form?" →
  H2 "Most searched sizes" → H2 Popular → H2 Tools (H3 groups) → H2 How it works → H2 FAQ → footer H2s.
- Ids kept: `path-size-h`, `path-exam-h`, `path-top-h`, `pop-h`, `tools-h`, `tools-{id}-h`, `faq-h`, `ft-*`.
- Hooks kept: `data-home-paths`, `data-path="size|exam"`, `data-size-tasks`, `data-task` (6 now: 20kb, 50kb, 100kb,
  200kb, any-kb, signature), `data-exam-chips`, `data-most-searched`, `data-size-row`, `data-privacy-line`,
  `data-route-hero`, `data-home-tools`, `data-other-docs`, `data-tool-group`, `data-other-doc`, `data-exam-card`,
  `data-group`, `data-search`, `data-card-*`, `data-nav-menu`, `data-menu-lang`, `data-theme-toggle`,
  `data-label-*`, `data-site-search`, `data-focus-hero-search`. New: `data-open-md`.
- JSON-LD (organization, website, FAQPage) unchanged. Every link that exists today is still in the HTML
  (PAN/passport/custom move from hero to Tools; hidden-by-CSS cards and closed `<details>` stay in the DOM).
- No new client component; JS on `/` within ±1 KB of today. CSS ≤ +2 KB gzip. Fonts: 0 new bytes.

---

## 11. i18n changes (en and hi in the same commit; `npm run i18n:check` must pass)

New keys under `site.home`: `heroPrivacy`, `tilePhoto`, `otherSize`, `otherSizeSub`, `signature`, `signatureSub`,
`pathExamKicker`, `allShort`. Changed: `hero`, `heroSub`. Kept but unused on home: `heroTagline`, `pathOr`,
`pathSizeHint`, `anyKb`. Values are in §6.1 and §7.

---

## 12. Acceptance criteria (QA from screenshots + simple DOM measurements)

Setup: `npm run build` once, `PORT=<port> HOSTNAME=127.0.0.1 node .next/standalone/server.js`. Shoot `/` and `/hi`
at 360×780, 768×1024, 1024×768, 1440×900, light and dark (dark: set `localStorage['sahisize:theme']='dark'` before
load), plus `/tools/compress-image-to-20kb` and `/exam/ssc-cgl` at 390×844 light and dark.

**First screen**
1. 360 en: H1 is 2 lines; all 6 `[data-task]` bottoms ≤ 470; HeroSearch input bottom ≤ 640.
2. 360 hi: H1 ≤ 2 lines; all 6 tiles bottom ≤ 510; search input bottom ≤ 700.
3. 768: whole hero (both cards) bottom ≤ 1,024 en.
4. 1440: H1 ≤ 2 lines; art top within 24 px of H1 top; art bottom within ±40 px of the tile grid bottom; search
   input fully visible above 900.
5. Exactly one saffron-filled element in the first screen of `/` at every width (the "Other size" tile).

**Layout**
6. Tile grid: 3 full rows at < 640 (2+2+2), 2 full rows at ≥ 640 (4 + 2 wide). Exam chips: 2 full rows at every
   width (6 chips < 640, 8 ≥ 640). No chip or tile label wraps inside a 48 px chip; no clipped text
   (`scrollHeight === clientHeight` on chips and tile labels).
7. No horizontal scroll at 320, 360, 390, 768, 1024, 1440 (`document.documentElement.scrollWidth === innerWidth`).
8. Home height at 360 ≤ 5,000 px (en and hi). Footer at 360 ≤ 480 px with groups closed. Footer groups open at
   ≥ 768 with every link visible.
9. No ruled lines, no pink margin line, no beige borders on any shot. Light mode: no visible box edge around the
   hero art.

**Accessibility**
10. `npm run check:contrast` passes with the new pairs.
11. Every `a, button, summary, input` below 1024 px is ≥ 48 px tall and ≥ 48 px wide (or full-width rows); tiles
    ≥ 72, primary/secondary actions ≥ 64.
12. Hindi: no heading has computed `line-height < 1.35 × font-size`; no `letter-spacing < 0` on `/hi`; no element
    with `text-transform: uppercase` anywhere.
13. Keyboard order on `/`: skip link → header → 20 → 50 → 100 → 200 KB → Other size → Signature → search → chips →
    See all → most searched rows. Focus ring visible on the saffron tile and on chips, light and dark.
14. 200% zoom at 360: tiles grow taller, nothing overlaps or clips.
15. `prefers-reduced-motion`: no translate/scale on hover/press.

**Dark mode**
16. Art sits on a framed plate; no `#F8FAFF` rectangle without the ring; no text below AA (covered by 10).

**Performance**
17. At 360 no image request before the first scroll (hero art hidden, How-it-works art lazy). LCP element = H1.
18. CLS < 0.02 on `/` with Slow 3G throttling (fallback font metrics, art width/height set).
19. `npm run check:budgets` passes; JS on `/` within ±1 KB of the previous build.

**Regression on other pages**
20. Tool page at 390: one saffron "Take photo", outline "Choose from gallery", H1 2 lines in heading colour, footer
    accordion. Exam page at 390: spec card readable, wells visible (`bg-band`), no layout change vs today.

---

## 13. Open points for the owner (defaults in bold; build proceeds with the default)

1. Hindi exam chips show Latin codes ("IBPS PO") with the Hindi name as tooltip: **yes**.
2. Dark mode following the phone's setting when no choice is stored: **not in this pass** (the task requires the
   existing mechanism). It is a one-line change in the pre-paint script in `RootShell.tsx` when the owner wants it.
3. Primary action = "Other size": **yes**; revisit only if one KB tile takes > 40% of hero clicks after two weeks.
4. Later: an inline "Choose photo" on the home (adds JS; not now).

## 14. Build order (each step can ship alone; run `npm run check:contrast` after 1)

1. Tokens, background removal, container width, `.band`, contrast pairs (§1, §2).
2. Fonts and type scale, Hindi rules, page H1 classes (§3, §9).
3. Shared components, hover/well sweep, Header, Footer (§4, §5, §8).
4. Home hero + i18n (§6, §11).
5. Rest of home (§7).
6. Build once; QA against §12.
