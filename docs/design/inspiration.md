# SahiSize — Design Inspiration & Pattern Brief

Research date: 2026-11-21. Method: Google-style web search for the target queries, then text fetches of 17 pages.
**Caveat:** the pages were read as markup and text, not as rendered screenshots. "Above the fold", colours and ad placement are inferred from source order and labels. Check the key claims on a real mid-range Android before acting on them.
Copyright rule: everything below describes general patterns. Do not copy any reference's assets, copy, illustrations or exact layouts.

---

## 1. Indian exam photo/signature resizer competitors

Sites that showed up for "ssc photo resize", "photo resizer in kb", "signature resize 20 kb" and "passport size photo maker": imresizer.com, onlineresult.in, docset.in, testbook.com (tool page), resizer.exammint.in, examoresizer.com, simpleimageresizer.com, globaldrishti.in, examdetail.in, freetool.odoo.com, passportsizephoto.in, photogov.net, aipassportphotos.com, sarkaridnatools.com, Wondershare and CapCut SEO pages.

### imresizer.com/compress-image-in-kb
- **Good:** a plain H1 ("Reduce Image Size in KB") with the upload box right below it, two sample photos to try, and a clear "Images never leave your device / no login" claim. The tool sits near the top.
- **Bad:** an ad slot between the hero and the tool. There are no exam presets, only a raw KB input. No before/after or size readout is visible. About 2,000 words, with a FAQ of around 20 items and 8 related-tool cards. No Hindi.
- **Adopt:** sample images ("try with a sample photo"), and a short privacy line placed next to the upload button.

### onlineresult.in/tools/exam-photo-resizer?preset=ssc
- **Good:** the richest feature set in the niche. It has about 46 exam presets, KB chips (5/20/50/100/300), px/cm/mm inputs and a live preview pane with an estimated KB and dimensions. Name/date stamping and an EN/हिंदी toggle are included.
- **Bad:** the tool sits below a mega-nav of about 60 links, so on mobile it is far below the fold. Promos for Telegram/WhatsApp groups and cross-sells add clutter, and the page runs to 5,000+ words. Emoji are used as icons.
- **Adopt:** an exam preset that fills every field at once, a live "estimated size" readout, and a language toggle. **Avoid:** the nav and promo weight above the tool.

### docset.in/resize/ssc-cgl
- **Good:** many KB chips, plus toggles for AI face crop, name/date and white background. A spec table appears next to the tool.
- **Bad:** five or more labelled ads and a "Sponsored" block. A sidebar lists about 150 tools. The H1 is keyword-stuffed ("…2026: Official Size Fix"), the FAQ appears twice, and an unsourced "30% rejected" statistic weakens trust.
- **Adopt:** feature toggles shown as simple switches. **Avoid:** fear statistics without a source, and a stuffed H1.

### testbook.com/exam-photo-crop-resize-tool
- **Good:** a problem-led title ("Error uploading photo?…") that matches how students search. The form sits right under the H1, and a spec table covers about 15 exams. The brand's authority helps it rank.
- **Bad:** a bare form with no presets, no preview, no privacy claim, a dated copyright and 2020-era FAQs. It feels like an afterthought inside a coaching portal.
- **Adopt:** **problem-led microcopy** ("Photo rejected? Fix it in 10 seconds") as a secondary hook.

### resizer.exammint.in/signature-resizer
- **Good:** a clean utility H1 and an "Original vs Optimized" comparison area. Signature-specific controls (brightness, contrast, cleanup slider) make sense for phone photos of ink on paper. It has low clutter and a strong "no files uploaded, no watermark, no logs" line.
- **Bad:** the settings panel comes *before* upload, which is the wrong order for first-timers. No KB is shown on the result, there is no Hindi, and a stray dev link sits in the footer.
- **Adopt:** a signature "ink cleanup" control and a side-by-side comparison. **Fix:** upload first, settings second.

### examoresizer.com/20kb-photo-resizer
- **Good:** single-purpose URL per size. Upload sits right under the H1 with 3 step icons. A "Result: Under 20KB" panel has clear states (waiting, loading, done) and a "Resize another" button. It has a social-proof badge ("100K+ tool uses") and a not-affiliated disclaimer.
- **Bad:** visible SEO instructions leaked into the copy, and the how-to section is repeated. No Hindi, no before/after.
- **Adopt:** a **pass/fail result verdict** ("Under 20 KB ✓"), and an honest usage counter.

### Passport-photo makers (passportsizephoto.in, photogov.net, aipassportphotos.com, sarkaridnatools, cutout.pro, imresizer passport page)
- **Good:** a 35×45 mm crop guide with a face oval overlay, white-background replacement, and a printable 4×6 / A4 sheet layout. A "compliance" framing gives users confidence.
- **Bad:** sources disagree on the size (35×45 mm vs 2×2 in), and some lock HD or no-watermark output behind credits.
- **Adopt:** a face-position guide overlay and a print-sheet output. Cite the source of each spec and show its "last verified" date.

**Niche-wide observations**
- Almost every competitor now claims "in-browser / no upload", so the claim alone no longer sets SahiSize apart. It has to be *shown*, for example by working offline or with an "Airplane-mode safe" badge.
- Nobody pairs a **visual result preview with an official-spec checklist** (✓ 20–50 KB ✓ 200×230 px ✓ JPG ✓ white background). This is the clearest gap.
- Hindi is either missing or limited to a toggle. No competitor has a properly typeset Hindi-first experience.
- Clutter (ads, mega-navs, link farms) is the norm. A calm, fast page will stand out.

---

## 2. Best-in-class single-purpose tool sites

### TinyPNG (tinypng.com)
- **Good:** the dropzone is the hero, with format chips and limits stated up front ("up to 20 images, 5 MB each"). A **before/after slider** asks "Can you tell the difference?" and the % reduction is the headline number. A mascot illustration gives the brand personality, and a deletion-time promise builds trust.
- **Bad:** product upsells sit above the proof section, and the mega-menu is heavy.
- **Adopt:** the before/after slider and a big "% smaller" number. Use one recurring brand character or motif, in SahiSize's own style.

### iLovePDF / iLoveIMG
- **Good:** short verb-noun H1s ("Compress PDF files", "Resize IMAGE") with a one-line subhead. The tool is the whole first screen. The compression slider has **three named levels, each with a caption** (Extreme / Recommended / Less). iLoveIMG's resize has a pixels/percent toggle, 25/50/75% presets and "maintain aspect ratio".
- **Bad:** a huge tool menu, and results show little more than a progress message.
- **Adopt:** three named levels with a "Recommended" default, and a consistent tool-page template across every tool.

### Smallpdf (smallpdf.com/compress-pdf)
- **Good:** three stat bullets beside the dropzone (size reduction, origin, users). Trust is strong (rating with vote count, ISO/GDPR, auto-delete after 1 h). A 4-step how-to includes a real screenshot, and the tool cross-linking is consistent.
- **Bad:** a repeated app banner, and Pro-locked options shown inside the free flow.
- **Adopt:** a short trust row next to the tool, and a how-to that uses *real UI screenshots* of the tool itself.

### remove.bg
- **Good:** a bold promise in a ~7-word H1 ("…100% Automatically and Free") and **use-case chips** that lead to audience pages. It is known for an instant, dramatic before/after reveal.
- **Bad:** an improvement-program opt-in modal, and the dropzone depends on JS.
- **Adopt:** use-case chips (Photo / Signature / Thumb / Certificates PDF / Passport) as the main way to navigate.

### Squoosh (squoosh.app)
- **Good:** the most restrained of the set. Three one-word value headings (Small / Simple / Secure). Sample images are labelled with their sizes ("2.8 MB"). An illustration shows "1.4 MB → 80 KB", and "Images never leave your device" is stated with an icon. Zero clutter, and the source is public.
- **Bad:** a developer-oriented UI with too many codec knobs for students.
- **Adopt:** a "big number → small number" visual, sample images labelled with sizes, and three-word value pillars.

---

## 3. Indian ed-tech and exam-info visual language

### testbook.com (English SSC CGL page and /hi Hindi home)
- **Good:** a large enrolment stat beside the CTA. A "Wall of Fame" with real student photos and AIR ranks is the strongest trust block reviewed. Exams appear as icon-plus-label tiles and pill chips. The Hindi home uses a Devanagari H1 with a 4-verb rhythm (सीखें · अभ्यास · सुधार · सफलता) and a Hindi CTA ("फ्री में शुरू करें").
- **Bad:** a mega-menu of about 150 links. "Download PDF / Share" repeats four or more times. Promos interrupt the content, the Hindi page has contradictory student counts, and an English subhead was left on the Hindi page.
- **Adopt:** exam tiles and chips, a native Devanagari hero, and a short Hindi CTA. **Avoid:** mixed-language leftovers and inconsistent numbers.

### adda247.com
- **Good:** stacked avatars with "10M+ students trust us", category tabs (Govt Jobs, College Entrance) and pill chips for exams. A local-language grid shows **each language in its own script**.
- **Bad:** promo-dense (about 8 product blocks) with a floating AI chat bubble.
- **Adopt:** a language switcher written in native script ("हिंदी", not "Hindi"), and exam category tabs.

### pw.live (Physics Wallah)
- **Good:** a warm, "Bharat"-framed headline with a single CTA. A stat row of 4 counters, exam icon tiles (JEE, NEET…) and rank cards with an exam tag. Real people feature strongly.
- **Bad:** about 20 promo banner tiles, a mega-menu, and dated testimonials next to current-year tiles.
- **Adopt:** a short stat row, and an "Indian, for Indian students" warmth in tone.

### sarkariresult.com
- **Good:** very fast and text-only. Users trust it because it is dense and familiar ("since 2012"). Large WhatsApp/Telegram communities.
- **Bad:** no visual hierarchy, link walls, duplicated headings.
- **Lesson:** SahiSize's audience is used to *fast, plain* pages. Visual polish must not cost speed.

(shiksha.com returned 403 and was not reviewed. hindi.testbook.com does not resolve, so testbook.com/hi was used instead.)

---

## 4. Patterns SahiSize should adopt (14)

1. **The tool is the hero (home and every tool/exam page).** The first mobile screen (360×640) holds the H1, a one-line subhead and a large "Choose photo" button that opens the camera or gallery. Nothing goes between them, no ads and no nav promos. *Why:* every top tool (iLove*, TinyPNG, examoresizer) does this, and the worst competitors bury the tool. This is the most direct lever on the 72.8% home bounce.

2. **Ask "what are you uploading?" first, using big task chips (home).** Show 4–6 large illustrated chips: Photo · Signature · Thumb impression · Certificates → PDF · Passport photo. *Why:* this follows remove.bg's use-case chips but sits closer to how students think. They know *what* they are uploading before they know the KB.

3. **Exam preset picker that fills everything (tool and exam pages).** A searchable "Choose your exam" field with popular exam chips (SSC CGL, UPSC, NEET, JEE Main, IBPS PO, RRB NTPC) fills in KB min/max, px, cm, format and background in one tap. "Custom size" sits behind an expander. *Why:* onlineresult's preset dropdown is its strongest feature. Make it a single tap rather than a long dropdown.

4. **A visible spec card with a "source and last verified" line (exam pages).** Show a compact card with Photo, Signature and Thumb rows (KB range · px · cm · format), the notice PDF name and "Verified 12 Nov 2026". *Why:* specs differ between sites (for example 35×45 mm vs 2×2 in for passport photos). Citing the source is a trust lever no competitor uses.

5. **A pass/fail result checklist (all tool results).** After processing, show ✓ 18 KB (allowed 10–20 KB), ✓ 140×60 px, ✓ JPG, ✓ white background, with a green "Ready to upload" verdict or an amber "Too small, the portal may reject it". *Why:* examoresizer's "Under 20KB" verdict extended into a full spec check. The niche does not have this, and it directly answers the student's worry ("will it get rejected?").

6. **Before/after compare with a big size drop (results).** Use a draggable compare slider or tap-to-toggle, with "2.4 MB → 19 KB" in large numerals. *Why:* TinyPNG and Squoosh show that a visible quality check reassures users. Keep it light: plain CSS clip with no library.

7. **Show privacy rather than only claim it (tool and home).** Use a small badge, "Works offline: your photo never leaves your phone", backed by a real offline/PWA mode and a one-line "how we know" link. *Why:* every competitor claims "no upload". A demonstrable claim stands out.

8. **Try-it sample images (home and tool).** Offer two or three original sample assets (a sample face photo, a signature on paper, a certificate scan) labelled with their sizes ("1.8 MB"). *Why:* Squoosh and imresizer use them. They let a hesitant first-time visitor see the result without picking a personal photo, which lowers bounce.

9. **Three-step strip with real UI thumbnails (tool pages, under the fold).** Choose → Pick exam → Download, each with a small screenshot of SahiSize's own UI (as Smallpdf does). *Why:* this gives low-literacy and first-time users confidence, and it doubles as how-to content for SEO.

10. **Signature-specific controls (signature tool).** Auto-crop to the ink, "make ink darker", a white-paper cleanup slider and a 4:2 frame preview. *Why:* exammint shows the need, because phone photos of signatures come out grey and shadowed.

11. **Face guide overlay for photos and passport photos (photo tool).** Show an oval head guide, a shoulder line, a 35×45 / 3.5×4.5 cm frame, a background-whiteness hint and an optional name/date strip for SSC-style rules. *Why:* passport-photo makers set this expectation, and photo rejections mostly come from face position and background.

12. **Bilingual done properly (site-wide).** A native-script toggle ("English | हिंदी"), a fully translated Hindi UI with no English leftovers, and correct Devanagari type. *Why:* competitors have only a toggle or nothing. Adda247's native-script language cards show the pattern.

13. **A small, honest trust row (home, tool).** Show three facts at most: "Free, no login" · "Works offline" · an *accurate* usage count or "Made for SSC, UPSC, NEET, JEE…" exam marks drawn as neutral text chips. *Why:* Smallpdf and PW use stat rows. Testbook's contradictory counts show the cost of inaccurate numbers. Do not use official exam logos: they are trademarked and suggest an affiliation that does not exist.

14. **Consistent tool-page template and "next step" cross-links (all tools).** Each result ends with the logical next task: "Photo done. Now resize your signature." Links to related exam presets follow. *Why:* iLove* consistency, plus a flow-based way to raise pages per session and lower bounce.

15. **Calm SEO content below the tool (exam and guide pages).** A spec table, a short FAQ (6–8 items) and a link to the guide. Never repeat FAQs and never go past about 1,000 words above the footer. *Why:* the 2,000–5,000-word competitor pages feel cluttered. Content should support the tool, not bury it.

## 5. Anti-patterns to avoid (5)

1. **Anything between the H1 and the upload button.** This includes ads, sponsored blocks, Telegram/WhatsApp promos, app banners and mega-navs (seen at docset, onlineresult, testbook). If ads are ever added, they go only below the result.
2. **Keyword-stuffed H1s and leaked SEO copy.** Examples are "…2026: Official Size Fix", visible "internal links here" instructions, and duplicated FAQs. Write the H1 for a human and let the title tag do the SEO work.
3. **Fear statistics without a source, and inconsistent numbers.** Examples are the "30% rejected" claim and student counts that disagree. Students can tell, and it erodes trust.
4. **Settings before upload, or a bare form with no feedback.** Exammint asks for settings before upload, and testbook's form gives no preview, no size readout and no verdict. The flow should be upload → preset → result → verify.
5. **Heavy visuals that cost speed.** This means large hero photos, autoplay video, Lottie or 3D on a site used on slow data, and also emoji used as icons and stock "smiling student with laptop" images. Keep the first screen under about 100 KB of images. Use SVG illustrations and AVIF/WebP with explicit sizes.

---

## 6. Mood: original to SahiSize

**Concept: "Exam-day calm".** The student is anxious about rejection, so the site should feel like a calm, competent elder sibling at a cyber-café counter: precise, warm and quick. The brand idea comes from the name *Sahi* ("correct"). Its recurring motif is a **check-tick fitting a frame exactly**: a photo snapping into a dashed size frame, with a tick.

**Colour**
- Primary: a deep **indigo-ink** blue (around #2B3A8C). It suggests the ink of a fountain pen and the official admit card, and reads as trustworthy without copying any coaching brand.
- Success/"Sahi" accent: a fresh **leaf green** (around #1E9E6A), used *only* for passed checks and the "Ready to upload" verdict, so green always means "correct".
- Warm accent: **marigold** (around #F4A62A) for highlights, chips and illustration warmth. It is culturally warm without tricolour cliché.
- Warning: terracotta amber for "too small / too large".
- Surfaces: warm paper off-white (around #FAF7F2) with a soft ruled-notebook texture used sparingly. In dark mode, use deep navy-slate rather than pure black.
- Hex values are starting points. Check every text pair against WCAG AA.

**Typography**
- Latin: one geometric-humanist sans with tabular numerals for KB/px figures, for example Inter, Plus Jakarta Sans or Manrope (self-hosted, subset).
- Devanagari: a matched sans such as **Noto Sans Devanagari, Mukta or Hind**, self-hosted and subset. Give Hindi about 1.6–1.7 line-height (taller than Latin) so matras do not clip, and avoid bold weights below 14 px. Size the two scripts to the same optical size, not the same pixel size.
- Show numbers big: the size drop and the KB verdict are the page's display type.

**Illustration style**
- Flat, rounded, two-tone vector *spot illustrations* in indigo and marigold, on paper-white backgrounds with a subtle grain. Recurring objects come from the real experience: an A4 form with a photo box, a signature on lined paper, a blue-ink thumbprint, a mid-range Android phone, a dashed crop frame snapping to a tick, and a ruler marked in cm.
- Characters, if any, are simple and faceless or minimally featured (diverse Indian students: hijab, turban, braid, glasses). Avoid caricature.
- Each tool chip gets one consistent object illustration, which forms SahiSize's own visual vocabulary.

**Photography**
- Use sparingly, and only where it adds proof: real-looking, natural-light shots of an Indian student's hands photographing a signature on a study table, a phone held over a certificate, a student at a cyber-café or hostel desk. Do not use glossy stock or "laptop + headphones smiling" images.
- Sample/demo face photos must be **commissioned or properly licensed, with consent**, or generated synthetic faces clearly used as samples. Never use real students' exam photos.
- Treatment: a slightly warm grade, compressed to AVIF/WebP and lazy-loaded below the fold.

**Iconography**
- One outline icon set (for example Lucide or Phosphor, 1.75 px stroke, rounded caps) recoloured to indigo. Replace all emoji icons.
- Custom glyphs for SahiSize concepts: KB-meter, cm-ruler, face-oval, signature-nib, thumbprint, PDF-stack, offline-shield.
- Exams appear as **neutral text chips** (short name and a colour-coded category dot: SSC, Banking, Railways, Medical, Engineering, UPSC), never with official logos.

**Motion**
- Small and purposeful: the frame-snap tick on success, a count-down animation of the size number (2.4 MB → 19 KB), and a 150 ms chip press. Respect `prefers-reduced-motion`.

---

### Sources consulted
imresizer.com/compress-image-in-kb · onlineresult.in/tools/exam-photo-resizer · docset.in/resize/ssc-cgl · testbook.com/exam-photo-crop-resize-tool · resizer.exammint.in/signature-resizer · examoresizer.com/20kb-photo-resizer · tinypng.com · ilovepdf.com/compress_pdf · iloveimg.com/resize-image · smallpdf.com/compress-pdf · remove.bg · squoosh.app · testbook.com/ssc-cgl · testbook.com/hi · adda247.com · pw.live · sarkariresult.com. Search results only (not fetched): simpleimageresizer.com, globaldrishti.in, examdetail.in, freetool.odoo.com, passportsizephoto.in, photogov.net, aipassportphotos.com, sarkaridnatools.com, cutout.pro, Wondershare and CapCut pages. shiksha.com refused the fetch (403).
