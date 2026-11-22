# Image pipeline (OpenAI GPT Image -> AVIF/WebP -> `<Picture>`)

Illustrations for SahiSize pages are planned in one manifest, generated once with the OpenAI
Images API, reviewed by a person, committed as PNG sources and published as small, content-hashed
AVIF and WebP files. Nothing in this pipeline runs during `npm run build`, in CI or at request
time. Pages render the committed files only.

```
src/content/images/manifest.json   (hand-edited: slots, alt text, prompts, status)
        |  npm run images:generate      (paid, local only, needs OPENAI_API_KEY)
        v
assets/images/source/<id>.png + <id>.json   (committed after review)
        |  you review, then set "status": "approved"
        |  npm run images:optimize      (sharp, deterministic, free)
        v
public/img/<id>-<width>-<hash8>.{avif,webp} + src/content/images/generated.json
        |
        v
<Picture slot="<id>" lang={lang} priority? />   (src/components/media/Picture.tsx)
```

## Files

| Path | What it is |
|---|---|
| `src/content/images/manifest.json` | One entry per image slot. zod schema: `src/components/media/image-schema.ts`. |
| `src/content/images/generated.json` | Written by `images:optimize` only. Starts as `{ "version": 1, "images": {} }`. |
| `assets/images/source/` | Reviewed PNG sources and their generation metadata (`<id>.json`: model, size, quality, prompt hash). Commit these. |
| `public/img/` | Optimized renditions. Commit these (the server image has no sharp and there is no image CDN). |
| `scripts/images/generate.mjs` | Calls `POST https://api.openai.com/v1/images/generations`. |
| `scripts/images/optimize.mjs` | sharp: crop to slot aspect, 2-3 widths, AVIF + WebP, blur placeholder. |
| `scripts/images/check.mjs` | Offline validation. Part of `npm run verify:static`. |
| `src/components/media/Picture.tsx` | Server component that renders a slot. |

## Slots

Each slot has:

- `id`: kebab-case, also the file stem.
- `routes`: English page paths the image belongs to. Hindi pages (`/hi/...`) use the same slot
  with `lang="hi"`.
- `placement`: `hero` | `example-correct` | `example-rejected` | `step` | `og-background`. A route
  can have only one hero (the page's LCP image); the schema enforces it.
- `aspect`, `widths` (2-3, ascending) and `sizes`: output crop, rendition widths and the HTML
  `sizes` attribute.
- `alt.en` / `alt.hi`: alt text. It describes the picture, does not start with "image of", and
  repeats no exam number that is not on the page from a verified preset.
- `generation`: `prompt` (scene only), `size` (`1536x1024`, `1024x1536` or `1024x1024`),
  `quality` (`low` | `medium` | `high`) and `background` (`opaque` | `transparent`).
- `status`: `planned` -> `review` -> `approved` (or `retired`).
- `notes`: anything the reviewer or the page integration must know.

The manifest-level `style.base` and `style.avoid` are added before and after every slot
prompt, so all images share one look: the Clear Desk palette (`#F8FAFF` background, indigo
`#4338CA`, saffron `#F59E0B`), flat illustration with a soft 3D feel, illustrated Indian students
and candidates. They also forbid text in images, logos, emblems, exam-body branding, real
people and photorealistic faces. Captions, ticks, crosses and all numbers go in page HTML, never
in the image, so they can be translated, read by screen readers and corrected when a notice
changes.

## 1. Set the API key

Create a key at https://platform.openai.com/api-keys in a project with billing enabled. GPT Image
models may first need **API organization verification** (Settings -> Organization -> General).

Put it only in your shell or in `.env.local`, which git ignores (`.env.*`). Never commit it, and
never put it in `next.config.mjs`, CI variables or the Docker image.

```sh
export OPENAI_API_KEY=sk-...
# optional
export OPENAI_IMAGE_MODEL=gpt-image-2     # default; override with another GPT Image model id if needed
export OPENAI_PROJECT_ID=proj_...          # optional header
export OPENAI_ORG_ID=org-...               # optional header
```

The script reads the key from the environment only. Before buying credits, check the current
model list and retirement dates on the OpenAI pricing and image-generation pages: see
`docs/design/image-api-research.md`, which notes that the `gpt-image-1` family is being retired.
If so, set `OPENAI_IMAGE_MODEL` to the current model. The request shape is the same.

## 2. Generate

```sh
npm run images:generate -- --dry-run                 # print every request; no key, no network, no cost
npm run images:generate -- --only home-hero --quality low   # cheap draft to check a prompt
npm run images:generate -- --only home-hero --force         # redo at the slot's own quality
npm run images:generate                              # every slot that has no source PNG yet
```

- Only slots without `assets/images/source/<id>.png` are sent, unless `--force` is given.
  `--only` takes a comma list or can be repeated.
- At most 2 requests run at once. 408/409/429/5xx and network errors are retried 4 times with
  exponential backoff (honouring `Retry-After`). 401/403 stop with a clear message.
- The script refuses to run when `CI` is set or from an npm `build`/`verify` script.
- PNGs are written atomically. A `<id>.json` next to each records the model, size, quality and
  a SHA-256 of the full prompt, so you can tell later which prompt produced which image.

## 3. Review

Open each new PNG at full size and check:

- No readable text, numbers, logos, emblems, seals, flags or exam-body branding. Models
  sometimes add fake lettering on forms or certificates. Reject those.
- People are clearly illustrated, with no photorealistic faces and correct hands.
- The palette and style match the other approved images.
- `example-correct` really follows the rules on the page (plain white background, face large,
  both ears visible, no mask, cap or dark glasses). `example-rejected` shows clear, non-offensive
  mistakes.
- The picture matches its `alt` text. Edit the alt text if needed.
- Tool heroes are visually distinct from each other.

Then set the slot's `status` in the manifest to `approved`, or keep it at `review` while you
decide. To try again, adjust the prompt and run `--only <id> --force`. `images:check` warns when a
`planned` slot already has a PNG.

## 4. Optimize

```sh
npm run images:optimize                  # all approved slots; also removes files of unapproved slots
npm run images:optimize -- --only home-hero
npm run images:optimize -- --force       # re-encode even if unchanged
```

For each approved slot: centre-crop to `aspect`, resize to each width (never upscaling), and
write AVIF (q50) and WebP (q76) to `public/img/<id>-<width>-<hash8>.<ext>`. Then write a 16 px
WebP blur placeholder, the intrinsic width/height and the file list to `generated.json`.

`hash8` comes from the source bytes, the encode settings and the sharp version. Re-running on
the same inputs gives byte-identical files and JSON (libvips runs single-threaded, keys are sorted
and there are no timestamps). A changed image gets new file names, so the files can be cached
as immutable.

## 5. Check and commit

```sh
npm run images:check
```

`images:check` fails when an approved slot lacks its PNG or optimized files, when a listed
file is missing, when a file name does not match its entry, or when an orphan rendition sits in
`public/img`. It warns about slot routes that are not in `docs/routes.txt` yet. It passes with
zero generated images. It is part of `npm run verify:static`.

Commit `assets/images/source/<id>.{png,json}`, `public/img/*`, `src/content/images/*.json` and the
manifest change together.

## 6. Use on a page

```tsx
import { Picture } from '@/components/media/Picture';

<Picture slot="exam-neet-ug-hero" lang={lang} priority className="h-auto w-full rounded-xl" />
<Picture slot="exam-neet-ug-photo-correct" lang={lang} />
```

- Renders `<picture>` with AVIF, then WebP `srcset`, explicit `width`/`height` (no CLS), the
  alt text for `lang` and a blur placeholder behind opaque art.
- `priority` gives `loading="eager"` and `fetchpriority="high"`. Use it only for the one hero above
  the fold. Everything else is `loading="lazy"`.
- Until a slot is approved **and** optimized it renders `fallback` (default: nothing), so a page
  never shows a broken image. You can wire slots into pages before the images exist.
- `imagesForRoute(route, lang)` in `src/components/media/images.ts` lists the published slots of a
  page, for example for `og:image` or ImageObject JSON-LD later.

Integration notes:

- `next.config.mjs` currently sends the HTML Cache-Control to every path outside `_next/`, `og/`
  and `fonts/`. Add `img/` to that exclusion and give `/img/:file*` the same
  `public, max-age=31536000, immutable` header as `/fonts`. The names are content-hashed, so this
  is safe.
- Add `assets/images/source/` to `.dockerignore`. The runtime only needs `public/img`.
- `scripts/check-budgets.ts` counts eager local images in the page total. Keep hero widths and
  `sizes` honest, and lazy-load everything below the fold.
- `og-background` slots are allowed by the schema, but OG cards are rendered by satori, which
  cannot read AVIF/WebP. Wiring one in needs a PNG/JPEG rendition, which `optimize.mjs` does not
  produce yet.

## Cost notes

Prices change, so check https://openai.com/api/pricing before a run. The research note
(`docs/design/image-api-research.md`, 2026-11-21) gives roughly these per-image figures for the GPT
Image line: 1024x1024 low ~$0.006, medium ~$0.053, high ~$0.21. 1536x1024 or 1024x1536 low
~$0.005, medium ~$0.041, high ~$0.165. Newer models are billed per token at similar levels.

The current manifest has 18 slots: 1 at `high` (home hero) and 17 at `medium`. One full pass
is about 1 x $0.17 + 17 x $0.04-0.05, or **$1-1.5**. With 2-3 attempts per slot to get through
review, budget **$3-5**. Draft at `--quality low` (under $0.01 each) while tuning prompts, then
regenerate the keepers at the slot's own quality. `--dry-run` is always free. API credits are
billed in USD. An Indian card needs international transactions enabled.
