# Image-generation APIs for SahiSize: research and recommendation

Researched on **2026-11-21**. Every price and claim below was read on that date at the cited URL, unless marked *(unverified)* or *(secondary source)*. Prices are in USD, before tax, and change often, so re-check the vendor page before buying credits.

---

## TL;DR

| Need | Use | Why |
|---|---|---|
| Illustrations, hero art, exam-family art, icons (SVG) | **Recraft API**: `recraftv4_1_vector`, or a custom **style_id** with V4 Styles Vector | Native SVG output. You build a brand style once from 1–10 reference images and reuse its `style_id`. $0.05–0.08 per SVG. OpenAI-compatible API. |
| Synthetic passport-style photos, signatures, thumbprints, documents | **Google Gemini API, Nano Banana 2.1** (`gemini-nano-banana-2.1`). Fallback: **OpenAI `gpt-image-2.6-flare` / `-sunburst`** | Cheapest good photoreal option at $0.0336 per 1K image, or $0.0168 in batch. Takes up to 4 character references, so one synthetic face can stay the same across correct and wrong variants. Editing gives you the wrong variants. |
| Before→after tool previews | **No extra API.** Derive them with `sharp` from the photos above (crop, compress, resize, background swap). | Real tool output is more honest than AI output, and it costs nothing. |
| OG images 1200×630 (EN and HI) | **Keep satori + resvg.** Add a Devanagari font (Noto Sans Devanagari, Mukta, or Hind) and test conjunct rendering. | No API needed. Never let an image model draw Hindi text. |
| Estimated cost for 300–600 images, including retries | **About $40–120 total, one time** (≈ ₹3.5k–11k; check today's FX rate) | See the cost table in section 4. |

---

## 1. Options compared

### 1.1 OpenAI image API (GPT Image)
- **Models (pricing page):** `gpt-image-2.6-sunburst`, `gpt-image-2.6-flare`, `gpt-image-2.5-sunburst`, `gpt-image-2.5-flare`, `gpt-image-2`, `gpt-image-1.5`, `gpt-image-1-mini`, `chatgpt-image-latest`. Sunburst is aimed at precise editing. Flare is aimed at "fast, high-quality everyday generation". Source: https://developers.openai.com/api/docs/pricing and https://developers.openai.com/api/docs/guides/image-generation (seen 2026-11-21).
  - *(Secondary source, unverified)*: gpt-image-1 retires 2026-10-23, and gpt-image-1.5, gpt-image-1-mini and chatgpt-image-latest retire 2026-12-01 (https://www.developersdigest.tech/models/image-generation/openai). Don't build on 1.x.
- **Pricing:** billed per token. For 2.x/2.5/2.6 image tokens: $8/1M input, $2/1M cached input, $30/1M output. Batch is half: $4 input, $15 output. `gpt-image-1-mini`: $2.50 input, $8 output. (pricing page, 2026-11-21)
  - The official per-image table is labelled *historical*, for GPT-Image-2. At 1024×1024: low $0.006, medium $0.053, high $0.211. At 1024×1536 / 1536×1024: low $0.005, medium $0.041, high $0.165. 2.5/2.6 have the same output token price, but no per-image table is published, so use the guide's calculator. A reasonable planning figure is **~$0.04–0.06 per medium image**. (guide, 2026-11-21)
- **Formats:** png (default), jpeg, webp (with `output_compression`). `background: "transparent"` works with png or webp. **SVG output is available on the generations endpoint for 2.6 models only** (`n=1`, no streaming, static vector, cannot be used as edit input). GIF output is also available. (guide, 2026-11-21)
- **Resolution:** recommended sizes are 1024², 1536×1024 and 1024×1536. Custom sizes must be multiples of 16, with aspect ratio between 1:3 and 3:1. Max edge 3840 px, total pixels from 655,360 to 8,294,400. For 2.5, sizes above 2560×1440 are experimental. Quality settings: low / medium / high / xhigh / max / auto. (guide)
- **Text in images:** the guide itself says "precise text placement and clarity can still be weak". It gives no guidance for Devanagari. **Don't trust it for Hindi.**
- **Consistency:** the guide also says recurring characters and brand elements "may not stay consistent across generations". There are no seeds and no saved brand styles. You can pass reference images to the edit endpoint.
- **Rate limits:** depend on your account tier. The guide does not list them. You may need **API Organization Verification** before using GPT Image models. (guide)
- **Licence:** Terms of Use, effective 2026-01-01: you "own the Output", and OpenAI assigns its rights in it to you (https://openai.com/policies/terms-of-use/). Usage Policies, effective 2026-11-20, restrict using "someone's likeness, including their photorealistic image… without their consent" and prohibit IP infringement and impersonation (https://openai.com/policies/usage-policies/). Synthetic, non-identifiable adults are fine.
- **India billing:** API credits are bought in USD only, according to OpenAI's help article on multi-currency billing (https://help.openai.com/hi-in/articles/10421635-multicurrency-billing, translated snippet). Users report e-mandate failures with Indian cards (https://community.openai.com/t/unable-to-make-payment-from-india/938806/7) and GST changes after adding a GSTIN (https://community.openai.com/t/gst-no-longer-being-charged-after-adding-gst-number-in-india/998331). Plan to pay with an international-enabled card.
- **SDK:** official `openai` npm package (TypeScript).
- **Fit:** photos ★★★★, edits for wrong variants ★★★★, illustrations ★★★ (2.6 SVG is new, so test it), Hindi text ★.

### 1.2 Google: Gemini API image models (Nano Banana) / Vertex AI
- **Imagen 4 is gone.** *(Secondary source)*: the Gemini API shut down Imagen 4 on 2026-08-17, and Vertex AI on 2026-06-30. Google's docs point to Nano Banana instead (search summary of https://the-rogue-marketing.github.io/google-nano-banana-imagen-4-image-generation-pricing-may-2026/ and similar pages). The current Gemini image docs list no Imagen models.
- **Models (https://aistudio.google.com/docs/image-generation, which ai.google.dev now redirects to; seen 2026-11-21):** `gemini-nano-banana-2.1` ("Recommended for all new projects"), `gemini-3.1-flash-image` (Nano Banana 2), `gemini-3.1-flash-lite-image` (Nano Banana 2 Lite), `gemini-3-pro-image` (Nano Banana Pro), and `gemini-2.5-flash-image` (legacy, shuts down 2027-03-15).
- **Pricing (https://aistudio.google.com/docs/pricing, 2026-11-21):**

  | Model | 1K | 2K | 4K | Batch 1K |
  |---|---|---|---|---|
  | gemini-nano-banana-2.1 | $0.0336 | $0.0504 | $0.113 | $0.0168 |
  | gemini-3.1-flash-lite-image | $0.0336 | – | – | $0.0168 |
  | gemini-3.1-flash-image | $0.067 (0.5K $0.045) | $0.101 | $0.151 | – |
  | gemini-3-pro-image | $0.134 | $0.134 | $0.24 | – |

  No free tier for image models.
- **Formats:** the examples return `image/png` and `image/jpeg`. There is no SVG and no native transparency, so convert to WebP/AVIF with sharp.
- **Consistency:** Nano Banana 2.1 takes up to 10 object references and up to 4 character references. Pro takes up to 6 objects, 5 characters and 3 style references (14 total). This lets you keep one synthetic sample face across all correct and wrong photo variants.
- **Text:** "legible, stylized text for infographics, menus…". Hindi is not mentioned, so don't rely on it for Devanagari.
- **Watermark:** "All generated images include a SynthID watermark". This works in your favour, because it marks the photos as synthetic.
- **Terms (https://aistudio.google.com/docs/terms, effective 2026-03-23):** Google "won't claim ownership" of generated content. You must be 18 or older. On **unpaid** services, prompts and outputs can be used for training and read by human reviewers. A **paid** Cloud project with billing switches that off. Usage is also governed by the Prohibited Use Policy.
- **India billing:** Google Cloud billing works in India. Google is moving the Gemini API to **prepay** credit ($5 minimum, or the local equivalent), per https://ai.google.dev/gemini-api/docs/billing (search snippet, 2026-11-21). I could not confirm INR explicitly. In practice, Google Cloud accounts in India are invoiced in INR with GST (verify in the Cloud console).
- **SDK:** `@google/genai` (TypeScript). The Batch API halves the price, which suits build-time jobs.
- **Fit:** photos ★★★★★ (price and references), edits ★★★★, illustrations ★★★ (raster only), Hindi text ★★ (still overlay it yourself).

### 1.3 Stability AI API
- **Pricing (https://docs.stability.ai/pricing, 2026-11-21; 1 credit = $0.01):** Stable Image Ultra $0.08, SD 3.5 Large $0.065, SD 3.5 Large Turbo $0.04, SD 3.5 Medium $0.035, SD 3.5 Flash $0.025, Stable Image Core $0.03, SDXL from $0.009.
- Raster output only (png/jpeg/webp). It has seeds and image-to-image, but no brand-style system like Recraft's. Its text rendering is behind the others. Its licence terms are on separate pages and I did not verify them here.
- **Fit:** an acceptable budget option, but it is not best at anything you need. **Not recommended.**

### 1.4 Black Forest Labs FLUX (direct, fal.ai, Replicate)
- **BFL direct (https://bfl.ai/pricing, 2026-11-21):** FLUX 3 Image: 768² $0.041, 1K $0.048, 1.5K $0.07, 2K $0.10, 4K $0.607. FLUX 3 Image Klein: 1K $0.009, 2K $0.014. FLUX.2 per megapixel: [pro] $0.03 for the first MP plus $0.015 per extra MP, [max] $0.07, [flex] $0.05, [klein] 4B $0.014. FLUX.1 Kontext [pro] $0.04 per image. BFL also has Erase, Outpainting and Fill tools.
- **fal.ai (https://fal.ai/pricing, 2026-11-21):** FLUX 2 $0.012/MP, FLUX 2 Flash $0.005/MP, FLUX 3 edit $0.048/MP, FLUX.1 schnell $0.003/MP. fal also resells Nano Banana ($0.0398–0.15) and GPT Image 2.
- **Replicate (https://replicate.com/pricing, 2026-11-21):** flux-1.1-pro $0.04, flux-dev $0.025, flux-schnell $3 per 1,000. The pricing page does not list FLUX 3.
- **Licence:** BFL's help centre says "All images generated through the BFL API include full commercial usage rights" (https://help.bfl.ai/articles/3670520907-can-i-use-the-api-for-a-commercial-application). The binding text is in https://bfl.ai/legal/flux-api-service-terms, which I could not read in full. Self-hosted FLUX [dev] weights have a separate non-commercial licence, so use the API.
- **Formats:** raster only (jpeg/png/webp). It supports seeds and multi-reference editing (Kontext / FLUX.2 / FLUX 3 edit). Photorealism is excellent.
- **SDK:** BFL offers REST with polling. fal has `@fal-ai/client`. Replicate has the `replicate` npm package.
- **Fit:** photos ★★★★★ (Klein is very cheap for drafts), illustrations ★★★, Hindi text ★. This is a **strong alternative** to Nano Banana for photos.

### 1.5 Ideogram API
- **Pricing (https://ideogram.ai/pricing/?pricing_tab=api, page dated 2026-11-21):** Ideogram 4.5 Generate: Low $0.03, Medium $0.06, High $0.10. Ideogram 4.0: Turbo $0.03, Default $0.06, Quality $0.10. 4.0 transparent background from $0.03 at 1K–2K. **Ideogram Vector, Generate SVG: $0.13 / $0.16 / $0.20.** Image→SVG: $0.10. Character reference (3.0): $0.10–0.20. Custom models: $0.06–0.20. Edit, reframe and replace-background cost the same as generation.
- **Rate limit:** 10 in-flight requests by default.
- **Licence:** the FAQ says "We do not claim ownership of your generated images… free to use them for any purpose, including commercial use". API use is also governed by the Developer API Agreement. Fees are non-refundable.
- **Strength:** the best text rendering of the group (Latin script), plus native SVG. But SVG costs 2–3× Recraft's, and Devanagari is still not something to rely on.
- **Fit:** a useful second choice for text-heavy posters or infographics in English. You don't need it if you overlay text yourself.

### 1.6 Recraft API (recommended for illustrations)
- **Pricing (https://www.recraft.ai/pricing?tab=api, 2026-11-21; 1,000 units = $1):** V4.1 $0.035 · V4.1 Pro $0.21 · V4.1 Flash $0.007 · **V4.1 Vector $0.08** · V4.1 Pro Vector $0.33 · V4 Styles $0.035 · **V4 Styles Vector $0.05** · V4 Styles Pro Vector $0.12 · V4.1 Utility $0.035. Tools: style creation $0.0055, vectorize $0.011, background removal $0.011, replace background (raster) $0.044, crisp upscale $0.0044, erase region $0.0022.
- **Brand styles (https://www.recraft.ai/docs/api-reference/styles.md):** create a style from **1–10 reference images**, or pass references inline and the API returns a `style_id` you can reuse. `match` can be `flexible` or `precise`. A style is tied to the model it was created with, so use it with the matching model at generation time. This is the most direct way to get a consistent house style across hundreds of icons and illustrations.
- **Limits (https://www.recraft.ai/docs/api-reference/appendix.md):** 100 images per minute and 5 requests per second per user. Supported ratios: 1:1, 2:1, 1:2, 3:2, 2:3, 4:3, 3:4, 5:4, 4:5, 6:10, 14:10, 10:14, 16:9, 9:16. Vector models accept only ratios ("SVG output has no fixed pixel size"). Raster output goes up to 3072×1536 on Pro models. **Result URLs expire after about 24 h, so download immediately.**
- **API:** `https://external.api.recraft.ai/v1`, OpenAI-compatible (`POST /v1/images/generations`). Use the `openai` npm client with `baseURL` set to that URL (https://www.recraft.ai/docs).
- **Licence (https://www.recraft.ai/terms, 2026-11-21):** on paid plans, "You own all Assets you create"; on the free tier, Recraft owns assets and commercial use is not allowed. API ownership falls under the Developer Terms (https://www.recraft.ai/legal/developer-terms). Recraft's docs and blog say API output is owned by the customer. Before generating, buy API units on a paid account, read the Developer Terms, and **opt out of training**, which is on by default (Terms §7.7).
- **Fit:** illustrations and icons ★★★★★ (real SVG plus brand style), photos ★★★.

### 1.7 Adobe Firefly Services API
- **Enterprise-only, contract pricing.** Adobe's rate card counts in "Operations", e.g. Generate Image at 0.5 Operations per image, and gives no USD price (https://helpx.adobe.com/business/enterprise/kb/fireflyservices-ratecard-ver-a.html). *(Secondary source, unverified)*: API access reportedly starts around $1,000/month, with a sales cycle and no self-serve option (search summary, 2026-11-21).
- Its strength is commercially safe training data and IP indemnity. That doesn't justify the cost for a free utility site. **Not recommended.**

### 1.8 Free / no-API routes
- **Hand-made or code-generated SVG:** best for icons such as file-type, KB-size, crop and check/cross badges. Use the existing icon set (Lucide or similar, ISC/MIT licensed; check your package) plus simple shapes you author. Cost: $0.
- **unDraw (https://undraw.co/license, 2026-11-21):** free for commercial use with no attribution. It **forbids** using its assets "as training data for generative AI models", bulk packs, scraping, and building a competing library. **So don't use unDraw SVGs as Recraft style references.** Fine to use a few directly, with recoloured accents.
- **satori + @resvg/resvg-js:** keep these for OG images and any "card" graphic that contains text. The satori README says it supports TTF, OTF, WOFF and WOFF2, `lang`-aware locales, and "HarfBuzz… glyph shaping for complex scripts" (https://github.com/vercel/satori, 2026-11-21). Load a Devanagari font such as **Noto Sans Devanagari, Mukta or Hind** (all SIL OFL) and pass `lang="hi"`. Run a visual check on conjuncts and matras like क्ष, त्र, ज्ञ, श्र, द्ध, र्‍ and "प्रवेश पत्र", because older satori builds rendered Devanagari unshaped. If any glyph breaks, pin or upgrade satori. As a last resort, render Hindi text with a headless browser at build time.
- **sharp:** resize, crop, AVIF/WebP, blur, rotate and compress. Use it for every derivative and every before→after preview.

---

## 2. Category-by-category recommendation

| Category | Primary | Notes |
|---|---|---|
| Hero art, exam-family art, guide illustrations | Recraft **V4 Styles Vector** with your `style_id` ($0.05), or **V4.1 Vector** ($0.08) | Create the style from 3–6 of **your own** approved images. Generate 2–3 drafts with V4.1 Flash ($0.007, raster) to choose compositions, then produce the final SVG. Run SVGO afterwards. |
| Size and tool icons | Hand-made SVG or an existing icon library. Use Recraft vector only for special pictograms. | AI icons are often inconsistent at 24 px. |
| Synthetic passport photos, correct and wrong | **Nano Banana 2.1** via the Batch API ($0.0168 at 1K). Fallback: FLUX 3 / FLUX.2 [pro] or gpt-image-2.6-flare. | Generate about 6–10 **fictional** adult faces (varied gender, region and skin tone, plain clothes). Keep each as a character reference, then **edit** to make wrong variants: coloured background, glasses glare, side shadow, tilted head, cap, low light. Simple faults like wrong crop, too small, blurry, stretched or over-compressed should be made with **sharp**, not AI. |
| Signature on white paper | Nano Banana 2.1 or FLUX, then a sharp threshold step. Better still, render fictional names with an OFL handwriting font via satori or SVG. | Code-rendered signatures are deterministic and certainly not anyone's real signature. Use fictional names only. |
| Thumb impressions | Nano Banana or FLUX, "ink thumbprint on white paper, sample" | Add a visible "SAMPLE / नमूना" overlay. |
| Documents (admit card, certificate, caste/EWS certificate mock-ups) | **Build them as HTML or satori templates**, not AI images | AI invents wrong text and emblem-like seals. A template with "SAMPLE" lets you control every word, including Hindi. |
| Before→after previews | sharp pipeline on the generated photos | Shows the real behaviour of the real tool. |
| OG 1200×630 (EN and HI) | Keep satori + resvg, add a Devanagari font, test shaping | You can composite a small AI or SVG illustration into the card. |

---

## 3. Legal and ethical cautions
1. **No real people.** Generate only fictional, non-identifiable adults. Never upload a real user's photo, a celebrity, a politician or a teacher as a reference. Don't prompt for "looks like X". OpenAI's policy restricts likeness use without consent, and Google requires following its Prohibited Use Policy.
2. **No minors.** Describe subjects as adults (e.g. "a 22-year-old"), even though "students" are the theme. Gemini API users must also be 18 or older.
3. **No government emblems or official marks.** That means no Ashoka Lion Capital or State Emblem (use is restricted by the State Emblem of India (Prohibition of Improper Use) Act, 2005), no ministry or state seals, and no realistic Aadhaar, PAN or passport layouts. Mock documents must say **SAMPLE / नमूना** and must not look like a real issued document.
4. **Exam-body names and logos are trademarks.** This covers SSC, UPSC, IBPS, RRB, NTA, state PSCs and others. Don't generate or recreate their logos. Use exam **names** in text only, for identification (nominative use), and use neutral SahiSize art for each exam family.
5. **Label synthetic images** in alt text and captions, e.g. "AI-generated sample photo (not a real person)". SynthID (Google) and C2PA metadata can stay embedded, so don't strip them on purpose. Note that sharp drops metadata by default.
6. **Vendor terms:** pay before generating (Recraft's free tier gives Recraft the ownership). Opt out of training where possible (Recraft). Gemini's free tier would allow human review of prompts, but image models have no free tier anyway. Keep a copy of each vendor's terms with the date.
7. **unDraw and other libraries:** don't feed them to AI as style references, and don't redistribute them as packs.
8. **Accuracy:** pixel and KB specs in the images must match your `src/content` data. Generate any number or text overlay from the data, not from the model.

---

## 4. Cost estimate for about 450 final images

| Bucket | Final count | Attempts per final | Unit price | Cost |
|---|---|---|---|---|
| Illustrations: hero, families, guides (Recraft V4 Styles Vector / V4.1 Vector) | 120 | 3 | $0.05–0.08 | $18–29 |
| Composition drafts (Recraft V4.1 Flash) | – | 300 drafts | $0.007 | $2 |
| Style creation (Recraft) | 3 styles | – | $0.0055 | ~$0 |
| Synthetic photos and edits (Nano Banana 2.1 1K, batch) | 180 | 3 | $0.0168 (batch) – $0.0336 | $9–18 |
| Hero-quality photos at 2K (Nano Banana 2.1) | 20 | 3 | $0.0504 | $3 |
| Signatures, thumbprints (Nano Banana or code-rendered) | 40 | 2 | $0.0336 | $3 |
| Before→after previews (sharp) | 60 | – | $0 | $0 |
| OG images (satori) | per page | – | $0 | $0 |
| Buffer for re-dos, model switch, gpt-image fallback (~$0.05 each) | – | – | – | $20–60 |
| **Total** | **~420 plus OG** | | | **≈ $55–115 one time** |

If you used gpt-image-2.x at medium (about $0.04–0.06) for every photo, the photo line would be about $25–35. Even the most expensive mix stays under about $150. Re-runs cost money only when a prompt changes, because of the content-hash cache.

---

## 5. Build-time pipeline design

**Principle:** generate rarely, offline, on purpose, never per request and never on every Jenkins build. Commit the results to git (or LFS, or object storage). Jenkins only *verifies* them, and optionally regenerates on a manually triggered job.

```
content/images/manifest.json          # source of truth (committed)
scripts/images/generate.ts            # node --env-file / tsx
scripts/images/providers/{recraft,gemini,openai,fal}.ts
scripts/images/lock.json              # id -> {hash, provider, model, files, createdAt} (committed)
public/images/<category>/<id>.{svg,avif,webp}
src/content/images.json               # id -> {src, width, height, alt:{en,hi}, synthetic:true, credit}
```

**Manifest entry**
```json
{
  "id": "photo-wrong-shadow-01",
  "category": "examples/photo",
  "provider": "gemini",
  "model": "gemini-nano-banana-2.1",
  "prompt": "Passport-style photo of a fictional 22-year-old Indian woman, plain white background, harsh shadow on the left side of face, studio, sample image",
  "refs": ["characters/char-03.png"],
  "styleId": null,
  "size": "1K",
  "aspect": "4:5",
  "outputs": [{"w": 600, "fmt": ["avif", "webp"]}, {"w": 300, "fmt": ["avif", "webp"]}],
  "alt": {"en": "Sample photo (AI-generated, not a real person) rejected because of a shadow on the face", "hi": "..."},
  "postprocess": ["sampleWatermark"]
}
```

**generate.ts flow**
1. Load the manifest. For each entry, compute `hash = sha256(provider + model + prompt + refs' file hashes + styleId + size + aspect + outputs + postprocessVersion)`.
2. If the hash and all output files match `lock.json`, skip. Use `--force <id>` or `--only <glob>` for manual re-runs, and `--dry-run` to print the cost estimate (count × unit price table).
3. Call the provider adapter. Use a concurrency limit with `p-limit` (Recraft allows 5 rps and 100 images/min, Ideogram allows 10 in flight). Retry 429/5xx with exponential backoff. For Gemini, use the Batch API when there are more than about 20 images. **Download the result immediately** (Recraft URLs expire after about 24 h).
4. Save the raw original to `.cache/images-raw/` (git-ignored, or archived as a Jenkins artifact) so you can re-optimise without paying again.
5. Optimise:
   - SVG: `svgo` with multipass, removing metadata and unused IDs, and keeping `viewBox`. Optionally swap fills for CSS variables (`currentColor` / `var(--brand)`) so illustrations follow light and dark themes. Fail if the file is over the size budget (e.g. 40 KB).
   - Raster: `sharp(...).resize(w).avif({quality: 55})` and `.webp({quality: 75})`. Also write width and height. Optionally make a `placeholder` (blur data URL).
   - Wrong-example derivatives (bad crop, low resolution, over-compressed, wrong aspect) are made with sharp from the "correct" base image.
6. Write `public/images/...`, update `lock.json` and `src/content/images.json` (alt text in en and hi, `synthetic: true`, model, date).
7. Pages use `next/image` (or `<picture>`) with the generated dimensions and import alt text from the JSON.

**Secrets and CI**
- Store `RECRAFT_API_KEY`, `GEMINI_API_KEY`, `OPENAI_API_KEY` and `FAL_KEY` in `.env.local` (git-ignored) for local runs, and as **Jenkins credentials** (`withCredentials([string(credentialsId: 'recraft-api-key', variable: 'RECRAFT_API_KEY')])`) for the optional manual `images:generate` job. Never put them in the Docker image or in `NEXT_PUBLIC_*`.
- The normal Jenkins build runs `images:verify` with no keys. It checks that every manifest id has a lock entry whose hash matches and whose files exist, and it fails the build on drift, so an unreviewed prompt edit can't ship broken images.
- Add a CI or pre-commit check that greps for API-key patterns.
- Have a human review every generated image before committing it, checking for artefacts, accidental likeness, and text errors.

**OG images:** keep the existing `src/app/(en)/og/[...path]/route.ts`. Bundle `NotoSansDevanagari-*.ttf` (or Mukta) next to the route, load it as `fonts: [{name, data, lang?}]`, set `lang="hi"` on Hindi text, and add a snapshot test for a set of tricky Hindi strings. Optionally pre-render OG images at build time with `generateStaticParams` to save CPU.

---

## 6. Sources (all seen 2026-11-21)
- OpenAI pricing: https://developers.openai.com/api/docs/pricing
- OpenAI image guide: https://developers.openai.com/api/docs/guides/image-generation
- OpenAI Terms of Use: https://openai.com/policies/terms-of-use/ · Usage Policies: https://openai.com/policies/usage-policies/
- OpenAI billing (India): https://help.openai.com/hi-in/articles/10421635-multicurrency-billing · https://community.openai.com/t/unable-to-make-payment-from-india/938806/7 · https://community.openai.com/t/gst-no-longer-being-charged-after-adding-gst-number-in-india/998331
- Gemini pricing: https://aistudio.google.com/docs/pricing · image docs: https://aistudio.google.com/docs/image-generation · terms: https://aistudio.google.com/docs/terms · billing: https://ai.google.dev/gemini-api/docs/billing
- Imagen 4 shutdown (secondary source): https://the-rogue-marketing.github.io/google-nano-banana-imagen-4-image-generation-pricing-may-2026/
- Stability pricing: https://docs.stability.ai/pricing
- BFL pricing: https://bfl.ai/pricing · commercial-use FAQ: https://help.bfl.ai/articles/3670520907-can-i-use-the-api-for-a-commercial-application · API terms: https://bfl.ai/legal/flux-api-service-terms
- fal.ai pricing: https://fal.ai/pricing · Replicate pricing: https://replicate.com/pricing
- Ideogram API pricing: https://ideogram.ai/pricing/?pricing_tab=api
- Recraft pricing: https://www.recraft.ai/pricing?tab=api · docs: https://www.recraft.ai/docs · styles: https://www.recraft.ai/docs/api-reference/styles.md · limits: https://www.recraft.ai/docs/api-reference/appendix.md · terms: https://www.recraft.ai/terms · developer terms: https://www.recraft.ai/legal/developer-terms
- Adobe Firefly Services rate card: https://helpx.adobe.com/business/enterprise/kb/fireflyservices-ratecard-ver-a.html
- unDraw licence: https://undraw.co/license
- satori: https://github.com/vercel/satori

**Not verified:** BFL API Service Terms full text · Recraft Developer Terms output clause · Stability licence terms · Adobe API USD pricing · INR invoicing for the Gemini API · exact per-image cost for gpt-image-2.5/2.6 (only the GPT-Image-2 table is published) · satori Devanagari shaping in the version you have installed (test it).
