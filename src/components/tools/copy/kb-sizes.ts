/**
 * Hand-written English copy for every /tools/compress-image-to-[n]kb page (SPEC 9.4,
 * docs/seo/keyword-map.md). Each size says which real documents use it (published,
 * verified presets only: tests/presets/toverify-copy.test.ts), what quality to expect,
 * one practical tip and three FAQs. `primary` must appear once in the title, H1, intro
 * and description (tests/unit/tools/kb-cluster.test.ts).
 */

export interface KbSizeCopy {
  /** Title and H1 tail before "{n} KB", from the size's secondary keywords. */
  verb: string;
  /** 120–155 characters, contains "{n} KB photo size" once. */
  description: string;
  /** First paragraph, contains "{n} KB photo size" once. */
  intro: string;
  usesH2: string;
  uses: string;
  qualityH2: string;
  quality: string;
  tip: string;
  faq: { q: string; a: string }[];
}

export const KB_SIZES_EN: Record<number, KbSizeCopy> = {
  5: {
    verb: 'Compress Image to',
    description:
      'Need the 5 KB photo size for a tiny upload field? Get a JPG of 4.5–5 KB from any photo or signature. Free, works on your phone, nothing is uploaded.',
    intro:
      'Need the 5 KB photo size for a tiny upload field? Add your picture and get a JPG between 4.5 and 5 KB, made on your phone with nothing uploaded.',
    usesH2: 'Where a 5 KB limit shows up',
    uses: 'Five kilobytes is rare on national exam forms, and none of the exams we track uses it as a maximum. You meet it on older state, university and scholarship portals built when storage was expensive, usually for a signature or a small ID photo. It also helps when a form gives a very low floor: CTET accepts a signature from 3 KB up to 30 KB, so a 5 KB copy of your signature fits.',
    qualityH2: 'How a 5 KB image looks',
    quality:
      'At 5 KB there is room for a face about the size of a postage stamp on screen. Skin turns smooth and hair loses its strands, but the face stays recognisable at the size portals display it. A dark-ink signature on white paper survives much better: the white area costs almost nothing, so the strokes stay clean.',
    tip: 'Crop tightly first. For a photo keep only head and shoulders; for a signature cut the paper right up to the ink. Every pixel you remove is detail the 5 KB budget can spend on what matters.',
    faq: [
      {
        q: 'Can a passport photo really be 5 KB?',
        a: 'Yes, but only at a small pixel size, around 90×120. If your form allows 10 or 20 KB, use that instead: the face will be noticeably sharper.',
      },
      {
        q: 'The portal says "less than 5 KB". Is 4.9 KB safe?',
        a: 'Yes. The file lands between 4.5 and 5 KB and stays under 5,000 bytes, so it passes whether the portal counts a kilobyte as 1000 or 1024 bytes.',
      },
      {
        q: 'Why did my picture get so small in pixels?',
        a: 'A 12-megapixel phone photo cannot fit in 5 KB at full size, so the tool shrinks it step by step until the quality is acceptable. Turn on Keep dimensions only if the form fixes the width and height.',
      },
    ],
  },
  10: {
    verb: 'Resize Image to',
    description:
      'Get the 10 KB photo size for small signature and photo fields. Your image becomes a 9–10 KB JPG on your own phone. Free, fast and never uploaded.',
    intro:
      'The 10 KB photo size is the smallest limit most exam forms use. Add your photo or signature and get a JPG between 9 and 10 KB, made on your own phone.',
    usesH2: 'Where you need to resize an image to 10 KB',
    uses: 'On most forms ten kilobytes is the floor, not the ceiling. Banking forms from IBPS, SBI, RBI and NABARD want the signature between 10 and 20 KB, and SSC CGL, CHSL, MTS and CPO use the same 10–20 KB window. NTA forms such as NEET UG, JEE Main and CUET UG accept a photo from 10 KB upwards. A hard cap of 10 KB is rarer; it suits older portals and small ID fields that say "up to 10 KB".',
    qualityH2: 'What a 10 KB photo looks like',
    quality:
      'A face photo at 10 KB looks fine at the small size an admit card prints it, and soft when you zoom in. Signatures fare better, because white paper compresses to almost nothing and a signature a few hundred pixels wide keeps crisp strokes.',
    tip: 'Photograph your signature in daylight with a dark blue or black pen. Faint ink forces the encoder to keep grey noise, and noise eats kilobytes you would rather spend on the strokes.',
    faq: [
      {
        q: 'My form says "10 to 20 KB". Should I use this page?',
        a: 'No. This page aims just under 10 KB, which can fall below a 10 KB minimum. Use the 20 KB page or the 10–20 KB range page; both land safely inside.',
      },
      {
        q: 'Why does my 10 KB photo look blurry when I zoom in?',
        a: 'At 10 KB there is room for only a small picture. On the portal it is shown small, so it looks normal there. If the form allows more, use 20 KB or 50 KB.',
      },
      {
        q: 'What pixel size should a 10 KB signature have?',
        a: 'If the form names pixels, use them, for example 140×60 on banking forms. If it does not, a strip around 300×120 keeps the strokes readable at 10 KB.',
      },
    ],
  },
  15: {
    verb: 'Resize Photo to',
    description:
      'Get the 15 KB photo size: a 13.5–15 KB JPG that sits safely inside 10–20 KB signature rules. Free, made on your phone, nothing is ever uploaded.',
    intro:
      'Need the 15 KB photo size? Add a photo or signature and get a JPG of 13.5–15 KB. It lands comfortably inside the 10–20 KB window that signature fields use.',
    usesH2: 'When to reduce photo size to 15 KB',
    uses: 'No exam we track caps an upload at exactly 15 KB, but 15 KB is a smart target for the many fields with a 10–20 KB range: the banking signature on IBPS, SBI, RBI and NABARD forms, and the SSC signature on CGL, CHSL, MTS and CPO. Landing in the middle leaves a margin on both sides. Bihar Police Constable (CSBC) is the opposite case: its photo and signatures must be at least 15 KB, so use the 25 KB page there.',
    qualityH2: 'What a 15 KB photo size JPG looks like',
    quality:
      'Fifteen kilobytes is a good middle ground: small enough for strict portals, large enough that pen strokes keep their edges. A face photo looks clean on a phone screen, with some softness in hair and fabric.',
    tip: 'If the signature looks grey after compression, retake it with more light on the paper. A white background compresses to almost nothing and leaves more of the 15 KB for the ink.',
    faq: [
      {
        q: 'Is 15 KB accepted where the form says 10–20 KB?',
        a: 'Yes. A file of 13.5–15 KB is above the 10 KB floor and below the 20 KB cap, with room to spare on both sides.',
      },
      {
        q: 'Can I photo resize to 15 KB without changing the pixel size?',
        a: 'Turn on Keep dimensions and only the JPEG quality drops. If the picture is very large, quality may get too low, so letting it shrink usually looks better.',
      },
      {
        q: 'Why not just use the 20 KB page?',
        a: 'You can. 15 KB simply keeps a wider margin under the cap, which helps if a portal counts a kilobyte as 1000 bytes instead of 1024.',
      },
    ],
  },
  20: {
    verb: 'Compress Image to',
    description:
      'Get the 20 KB photo size for signatures and small photos. Your image becomes an 18–20 KB JPG, made on your phone. Free, fast and never uploaded.',
    intro:
      'Get the 20 KB photo size that signature and small photo fields ask for. Your image comes back as a JPG between 18 and 20 KB, made on your phone and never uploaded.',
    usesH2: 'Who needs a photo under 20 KB',
    uses: 'Twenty kilobytes is the most common cap for signatures. IBPS PO, IBPS Clerk, SBI PO, RBI and NABARD forms want a 140×60 px signature of 10–20 KB, and SSC CGL, CHSL, MTS and CPO ask for 10–20 KB too, at 472×157 px. DSSSB caps its signature at 20 KB. Fewer forms want a whole photo this small, but a passport photo converts into a 20 KB JPEG without trouble.',
    qualityH2: '20 KB photo size in pixels',
    quality:
      'What is the size of a 20 KB photo in pixels? KB measures the file and pixels measure the picture, so the same 200×230 photo can weigh 15 KB or 60 KB depending on JPEG quality. The tool keeps quality as high as the 20 KB budget allows.',
    tip: 'If the form also fixes pixels, such as 140×60 for a signature, use the Signature resize tool instead. It crops, cleans the paper to white and hits both the pixels and the KB range in one go.',
    faq: [
      {
        q: 'Will 19 KB be accepted where the form says 20 KB?',
        a: 'Yes. "Up to 20 KB" or "10–20 KB" means anything from the minimum up to 20 KB. We aim just under the limit so it is safe even if the portal counts 1 KB as 1000 bytes.',
      },
      {
        q: 'Can I convert a PNG or HEIC photo into a 20 KB JPEG?',
        a: 'Yes. PNG, WebP and iPhone HEIC files are opened on your device and saved as a JPEG of 18–20 KB, the format exam portals expect.',
      },
      {
        q: 'Is a photo under 20 KB good enough for a bank form?',
        a: 'Banking photos must be 20–50 KB, so a photo under 20 KB would be too small. Use the 50 KB page or the 20–50 KB range page for the photo, and this page for the signature.',
      },
    ],
  },
  25: {
    verb: 'Resize Photo to',
    description:
      'Get the 25 KB photo size Bihar Police forms use: a 22.5–25 KB JPG of your photo or signature. Free, made on your phone, nothing is uploaded.',
    intro:
      'Get the 25 KB photo size that Bihar Police forms use. Add your photo or signature and download a JPG of 22.5–25 KB, made on your phone and never uploaded.',
    usesH2: 'Exams that need a photo resizer for 25 KB',
    uses: 'Bihar Police Constable (CSBC) asks for the photograph and both signatures, one in English and one in Hindi, at 15–25 KB each. This page lands every file at 22.5–25 KB, well above the 15 KB floor. MPPSC State Service uses 25 KB the other way round, as the minimum for its photo with name and date (25–100 KB), so for MPPSC pick a higher target such as 50 KB.',
    qualityH2: 'Detail you keep at 25 KB',
    quality:
      'Twenty-five kilobytes is enough for a clean passport-style photo, and generous for a signature. Faces keep their outline and eyes; very fine textures such as patterned clothing soften a little.',
    tip: 'For the two Bihar Police signatures, sign both on the same sheet with the same pen, then crop and compress each one separately so they come out alike.',
    faq: [
      {
        q: 'Will 24 KB pass a 15–25 KB rule?',
        a: 'Yes. Anything from 15 to 25 KB passes. We stop just under 25 KB, and under 25,000 bytes, so both ways of counting a kilobyte agree.',
      },
      {
        q: 'Can I set 25 KB as a minimum instead?',
        a: 'Yes. Type 25 in the minimum box and pick a higher target such as 50 KB. The file will never drop below 25 KB.',
      },
      {
        q: 'My photo has a name and date strip. Does that change anything?',
        a: 'Text and a white strip add a little detail to store. The tool accounts for that automatically when it searches for the right quality.',
      },
    ],
  },
  30: {
    verb: 'Resize Image to',
    description:
      'Get the 30 KB photo size for signature caps above 20 KB. Your image becomes a 27–30 KB JPG on your own phone. Free, quick and never uploaded.',
    intro:
      'The 30 KB photo size covers signature caps that sit above the banking 20 KB. Add your image and get a JPG of 27–30 KB, made on your phone without uploading anything.',
    usesH2: 'Forms that want you to resize an image to 30 KB',
    uses: 'UPPSC PCS (and its OTR) caps the signature at 30 KB, at 472×236 px. CTET also lets the signature go up to 30 KB, with a very low 3 KB floor. Watch the minimums on other forms: India Post GDS wants its photo at 30–100 KB and the RRB signature must be 30–49 KB, so a file of 27–30 KB would be too small for both. Use the 50 KB page for GDS and the 45 KB page for RRB.',
    qualityH2: 'Quality of a 30 KB photo size JPG',
    quality:
      'You get enough room for a clear thumb print, or a signature a few hundred pixels across with clean edges and no visible blocks. As a photo compressor setting, 30 KB keeps a passport-style face sharp at normal viewing size.',
    tip: 'For a signature, sign with a dark pen on plain white paper and photograph it in daylight. Dark, high-contrast ink compresses far better than faint ink.',
    faq: [
      {
        q: 'Is 30 KB enough for a photo?',
        a: 'Usually yes for a passport-style photo of about 300×400 px. If your form allows 50 KB, the 50 KB page keeps more detail.',
      },
      {
        q: 'What if my form says 10–30 KB?',
        a: 'Use this page. The output lands at 27–30 KB, comfortably inside the range.',
      },
      {
        q: 'Why is my 30 KB file only 27 or 28 KB?',
        a: 'The tool finds the highest quality under the cap and stops there. Anything from 27 to 30 KB passes a 30 KB maximum, and staying slightly under protects you from portals that count 1 KB as 1000 bytes.',
      },
    ],
  },
  35: {
    verb: 'Compress Photo to',
    description:
      'Get the 35 KB photo size that lands mid-way in 20–50 KB and 30–49 KB rules: a 31.5–35 KB JPG made on your phone. Free and never uploaded.',
    intro:
      'The 35 KB photo size sits mid-way in the most common upload windows. Add your image and get a JPG of 31.5–35 KB, created on your phone and never uploaded.',
    usesH2: 'Why 35 KB is a safe middle',
    uses: 'Several forms set a range rather than a single cap, and aiming for the middle is the safest choice. For RRB NTPC, RRB ALP and RRB Group D the signature must be 30–49 KB, and 35 KB keeps it clear of both ends. The banking photo and left thumb impression window is 20–50 KB on IBPS, SBI and RBI forms, and 35 KB lands right in the middle of it.',
    qualityH2: 'How a 35 KB photo looks',
    quality:
      'At 35 KB a 200×230 banking photo can be saved at very high quality, with no visible blocks around the face. A thumb impression keeps its ridges, which matters because a smudged print can be rejected.',
    tip: 'For a thumb impression, press firmly with a little ink on white paper and photograph it from straight above. Clear ridges compress better than smudges.',
    faq: [
      {
        q: 'Is 35 KB accepted for an RRB signature?',
        a: 'Yes. RRB NTPC, ALP and Group D accept 30–49 KB, and a file of 31.5–35 KB is inside that.',
      },
      {
        q: 'Should I pick 35 KB or 50 KB for an IBPS photo?',
        a: 'Both pass the 20–50 KB rule. 35 KB keeps a margin below the cap; 50 KB keeps a little more detail. If in doubt, 35 is the safer pick.',
      },
      {
        q: 'Can I get exactly 35.0 KB?',
        a: 'Not exactly, and you do not need to. The tool lands between 31.5 and 35 KB, which passes any rule that allows 35 KB.',
      },
    ],
  },
  40: {
    verb: 'Compress Photo to',
    description:
      'Get the 40 KB photo size DSSSB uses for thumb impressions: a 36–40 KB JPG of any photo or print. Free, made on your phone, never uploaded.',
    intro:
      'Get the 40 KB photo size DSSSB uses for thumb impressions. Add your image and download a JPG of 36–40 KB, made on your own phone with nothing uploaded.',
    usesH2: 'Where you need to compress a photo to 40 KB',
    uses: 'DSSSB (Delhi) asks for both the left and the right thumb impression as images of up to 40 KB. The same target fits the RRB NTPC, ALP and Group D signature, which must be 30–49 KB, and the 20–50 KB photo and thumb rules on IBPS, SBI and RBI forms.',
    qualityH2: 'Quality when you convert a photo into a 40 KB JPG',
    quality:
      'Forty kilobytes gives a fingerprint or a passport photo plenty of room. Ridges, pores and hairlines stay distinct, and the JPG shows no blocking at normal zoom.',
    tip: 'Make the two DSSSB thumb impressions separately: crop each print to a square around the ridges, then compress. Do not put both thumbs in one image unless the form asks for it.',
    faq: [
      {
        q: 'Do the left and right thumb need the same size?',
        a: 'For DSSSB both have the same 40 KB cap. Compress each image on this page and you get two files of 36–40 KB.',
      },
      {
        q: 'Can I photo resize to 40 KB and keep the exact pixels?',
        a: 'Yes, switch on Keep dimensions. The width and height stay the same and only the JPEG quality changes.',
      },
      {
        q: 'Is 40 KB too large for a 30–49 KB rule?',
        a: 'No. A file of 36–40 KB sits inside 30–49 KB with about nine kilobytes to spare under the cap.',
      },
    ],
  },
  45: {
    verb: 'Compress Photo to',
    description:
      'Get the 45 KB photo size, the safe pick for RRB signatures capped at 49 KB: a 40.5–45 KB JPG made on your phone. Free and never uploaded.',
    intro:
      'The 45 KB photo size is the safe pick for RRB signatures and any 50 KB cap with a margin. Add a picture and get a JPG of 40.5–45 KB, made on your phone.',
    usesH2: 'Which forms suit a 45 KB file',
    uses: 'RRB NTPC, RRB ALP and RRB Group D want the signature between 30 and 49 KB. That odd 49 KB cap catches people who aim for 50, so 45 KB is the natural target. It also fits every 20–50 KB rule, including the IBPS, SBI, RBI and NABARD photograph and left thumb impression, and the REET photo and signature.',
    qualityH2: 'Expected quality at 45 KB',
    quality:
      'For a signature, 45 KB is generous: a large scan several hundred pixels wide keeps smooth pen edges. For a photo, it is near the top of what banking forms allow, and the face stays crisp even on a sharp screen.',
    tip: 'Sign in the middle of a plain white sheet so you can crop with an even white border. Clean paper compresses to almost nothing and leaves the 45 KB for the ink.',
    faq: [
      {
        q: 'Why not just use 50 KB for RRB?',
        a: 'The RRB cap is 49 KB, not 50. A 50 KB target can land anywhere between 45 and 50 KB, and the top of that is over 49 KB. 45 KB stays well inside.',
      },
      {
        q: 'Is 45 KB accepted where the form says 20–50 KB?',
        a: 'Yes. A file of 40.5–45 KB is inside that window.',
      },
      {
        q: 'Does the tool change my signature?',
        a: 'No. It only resizes and re-encodes the image. Strokes, slant and shape are untouched; nothing is redrawn or enhanced.',
      },
    ],
  },
  50: {
    verb: 'Resize Image to',
    description:
      'Get the 50 KB photo size used by IBPS, SBI and RBI forms: a 45–50 KB JPG that keeps your face sharp. Free, on your phone, never uploaded.',
    intro:
      'The 50 KB photo size is the classic limit for exam photographs. Add yours and get a JPG between 45 and 50 KB that keeps your face sharp, made entirely on your phone.',
    usesH2: 'Forms that ask you to resize an image to 50 KB',
    uses: 'IBPS PO, IBPS Clerk, IBPS SO, SBI PO, SBI Clerk, RBI Assistant, RBI Grade B and NABARD all ask for a 200×230 px photo of 20–50 KB, and the left thumb impression (240×240 px) has the same 20–50 KB window. REET and HTET photos are 20–50 KB, UGC NET, CSIR NET and CUET UG take signatures up to 50 KB, and the UPPSC composite photo with the signature below it must stay under 50 KB.',
    qualityH2: 'Quality from a 50 KB photo resizer',
    quality:
      'Fifty kilobytes is generous for a passport-size photo. Skin tone, hair and the edge of your collar stay sharp, and the light background stays clean instead of blotchy. A 3 MB phone photo is first brought to a sensible size, then saved at the highest quality that fits.',
    tip: 'If your form names exact pixels like 200×230, use that exam’s kit or the Custom size tool so the width and height are exact too. This page keeps your picture’s own shape.',
    faq: [
      {
        q: 'My photo is only 30 KB. Will it get bigger?',
        a: 'Yes, we raise the quality so it lands in 45–50 KB. If it still cannot reach that, invisible padding is added (no pixel changes) so the file passes a minimum.',
      },
      {
        q: 'Is 50 KB the same as 50,000 bytes?',
        a: 'Not quite. We use 1 KB = 1024 bytes, like most portals, and aim below 50,000 bytes so it also passes if a portal uses 1000.',
      },
      {
        q: 'For IBPS, should I use this page or the 20–50 KB range page?',
        a: 'Both land inside 20–50 KB. The range page also fills in the 20 KB minimum, so if you later type a lower target the file still cannot drop below the floor.',
      },
    ],
  },
  60: {
    verb: 'Compress Photo to',
    description:
      'Get the 60 KB photo size for uploads with a 50 KB minimum: a 54–60 KB JPG of your photo, scan or declaration. Free, on your phone, never uploaded.',
    intro:
      'Get the 60 KB photo size for fields with a 50 KB minimum. Add your image and download a JPG of 54–60 KB, made on your phone and never uploaded anywhere.',
    usesH2: 'When a 60 KB file is the right target',
    uses: 'A 60 KB file clears a 50 KB floor with room to spare. That floor appears on the handwritten declaration of IBPS, SBI, RBI and NABARD forms, on the REET Aadhaar card and Class 10 marksheet uploads, and on the IAF Agniveervayu left thumb impression, all 50–100 KB. The DSSSB postcard-size photograph has a 50 KB floor too, with a 300 KB cap.',
    qualityH2: 'How much detail 60 KB holds',
    quality:
      'Sixty kilobytes stores a high-quality portrait, or a handwritten paragraph that stays readable. Compared with 50 KB the difference in a face is small, but text and fingerprints gain visibly sharper edges.',
    tip: 'For a declaration, write with a ball pen rather than a gel pen that bleeds, and keep the lines straight. Clean, evenly spaced handwriting compresses better and reads better.',
    faq: [
      {
        q: 'Why choose 60 KB instead of 50 KB?',
        a: 'If the form says 50–100 KB, a 50 KB target can land at 45 KB, which fails the minimum. 60 KB lands at 54–60 KB, safely above it.',
      },
      {
        q: 'Is 60 KB too big for a 20–50 KB photo rule?',
        a: 'Yes. For banking photos use 50 KB or less; 60 KB is for fields whose minimum is 50 KB.',
      },
      {
        q: 'Will the tool enlarge my image to reach 60 KB?',
        a: 'No. If your image is already small, it raises the JPEG quality, and only if that is not enough it adds invisible padding. The picture itself is never stretched.',
      },
    ],
  },
  70: {
    verb: 'Compress Photo to',
    description:
      'Get the 70 KB photo size, a safe middle for 50–100 KB rules: a 63–70 KB JPG of your declaration, scan or photo. Free and never uploaded.',
    intro:
      'The 70 KB photo size gives you a safe middle value for 50–100 KB rules. Add your photo or scan and download a JPG of 63–70 KB, all done on your phone.',
    usesH2: 'Where 70 KB fits',
    uses: 'Rules of 50–100 KB are common for larger uploads: the handwritten declaration on IBPS, SBI, RBI and NABARD forms, the REET Aadhaar card and Class 10 marksheet, and the IAF Agniveervayu thumb impression. 70 KB sits in the middle of that window. It also fits the MPPSC photograph with name and date (25–100 KB, 350×450 px) and the India Post GDS photo (30–100 KB).',
    qualityH2: 'Quality at 70 KB',
    quality:
      'Seventy kilobytes keeps an 800×400 declaration readable down to the dot on each i, and gives a 350×450 photo enough room for natural skin tone. Scanned ID cards keep their small print legible.',
    tip: 'Before compressing a card or marksheet, crop it to the edges of the paper. Dark table or bedsheet borders waste kilobytes and make the scan look careless.',
    faq: [
      {
        q: 'My declaration must be 800×400 pixels. Does this page do that?',
        a: 'This page keeps your image’s own shape. For the exact 800×400 size, use the Handwritten declaration tool, which crops and sizes it for you.',
      },
      {
        q: 'Is 70 KB safer than 100 KB for a 50–100 KB rule?',
        a: 'Yes. A file of 63–70 KB is far from both ends, so small differences in how a portal measures size do not matter.',
      },
      {
        q: 'Can I use 70 KB for an IBPS photo?',
        a: 'No, the IBPS photo cap is 50 KB. Use 70 KB for the declaration on the same form.',
      },
    ],
  },
  80: {
    verb: 'Compress Photo to',
    description:
      'Get the 80 KB photo size for large photos and scans: a 72–80 KB JPG with a clear margin under 100 KB caps. Free, on your phone, never uploaded.',
    intro:
      'Get the 80 KB photo size for large photos and scans. Add a picture and download a JPG of 72–80 KB, processed on your own phone without any upload.',
    usesH2: 'Good uses for 80 KB',
    uses: 'An 80 KB file suits any 50–100 KB rule while keeping a clear margin under the cap: the IBPS, SBI, RBI and NABARD handwritten declaration, the REET Aadhaar card and marksheet images, and the IAF Agniveervayu thumb. One trap: the IAF Agniveervayu signature must be at least 80 KB (80–150 KB). A file of 72–80 KB can fall short, so use the 100 KB or 150 KB page for it.',
    qualityH2: 'How an 80 KB photo looks',
    quality:
      'At 80 KB a portrait shows fine hair and fabric texture, and a photographed document keeps crisp printed text. On a phone screen most people cannot tell an 80 KB face photo from the original.',
    tip: 'If your document photo has a shadow from your hand or phone, retake it near a window. Compression keeps shadows faithfully, and a dark corner can hide text.',
    faq: [
      {
        q: 'Why does the IAF signature need 80 KB or more?',
        a: 'That is the IAF rule: 80–150 KB. Use the 100 KB page, which lands at 90–100 KB, inside the range.',
      },
      {
        q: 'Is 80 KB fine for a 50–100 KB handwritten declaration?',
        a: 'Yes. A file of 72–80 KB is inside the range with about 20 KB to spare.',
      },
      {
        q: 'Will my image be resized to reach 80 KB?',
        a: 'Only made smaller if it is too big. A normal phone photo is reduced to a sensible size; a small image keeps its pixels and gets higher quality instead.',
      },
    ],
  },
  90: {
    verb: 'Compress Photo to',
    description:
      'Get the 90 KB photo size: an 81–90 KB JPG with a buffer under every 100 KB cap, for photos, signatures and declarations. Free and never uploaded.',
    intro:
      'Need the 90 KB photo size? Add your image and get a JPG of 81–90 KB: high quality, yet clearly under any 100 KB cap. It is made on your phone, never uploaded.',
    usesH2: 'Why 90 KB instead of 100 KB',
    uses: 'Many forms cap uploads at 100 KB: the NEET UG and JEE Main signature (10–100 KB), the UPSC CSE, NDA and CDS signature (20–100 KB), the India Post GDS photo and signature, the CTET photo and the MPPSC photo and signature. A 90 KB target keeps nearly all the quality of 100 KB while leaving a 10 KB buffer below the cap.',
    qualityH2: 'Quality to expect at 90 KB',
    quality:
      'Ninety kilobytes is close to the point where extra size stops showing. Faces, a signature written three times as UPSC asks for, and handwritten declarations all look like the original, with no visible blocking even at 200% zoom.',
    tip: 'For a UPSC signature, sign all three times on one white sheet as the notice shows, then crop close so the strip does not carry empty margins.',
    faq: [
      {
        q: 'Is 90 KB safe for a "maximum 100 KB" rule?',
        a: 'Yes. A file of 81–90 KB is well under 100 KB whichever way the portal counts a kilobyte.',
      },
      {
        q: 'Will 90 KB pass a 50–100 KB rule?',
        a: 'Yes, 81–90 KB is inside it.',
      },
      {
        q: 'Is there any visible difference between 90 KB and 100 KB?',
        a: 'Almost never. The last 10 KB mostly stores noise your eye does not see. Pick 90 KB when you want a margin.',
      },
    ],
  },
  100: {
    verb: 'Resize Image to',
    description:
      'Get the 100 KB photo size used by NTA, UPSC and state forms: a 90–100 KB JPG of your photo, signature or declaration. Free and never uploaded.',
    intro:
      'Get the 100 KB photo size used by NTA, UPSC and many state forms. Your photo, signature or declaration comes back as a JPG between 90 and 100 KB, made on your device.',
    usesH2: 'When to resize an image to 100 KB',
    uses: 'NEET UG and JEE Main accept a signature of 10–100 KB, and UPSC CSE, NDA and CDS want the signature, written three times, at 20–100 KB. India Post GDS takes a 320×400 px photo of 30–100 KB, CTET caps its photo at 100 KB, and MPPSC allows 25–100 KB for the photo with name and date. Every handwritten declaration on IBPS, SBI and RBI forms must be 50–100 KB.',
    qualityH2: 'How a 100 KB photo size JPG looks',
    quality:
      'At 100 KB a face photo keeps fine detail and a signed page or declaration stays readable line by line. You will rarely see compression blocks unless the picture has a busy, noisy background.',
    tip: 'For a handwritten declaration, write on plain white paper, photograph it straight from above in good light, and crop to the text before compressing.',
    faq: [
      {
        q: 'Do I need to change the pixel size for 100 KB?',
        a: 'Usually not. A normal phone photo is reduced to a sensible size automatically, and you can switch on Keep dimensions if the pixels must not change.',
      },
      {
        q: 'My form says 50–100 KB. Is this the right page?',
        a: 'Yes. The result is 90–100 KB, which is inside 50–100 KB. For a value nearer the middle, try the 50–100 KB range page and lower the target.',
      },
      {
        q: 'Can I convert a 40 KB photo into 100 KB?',
        a: 'Yes. The tool raises the JPEG quality to reach 90–100 KB. That adds no new detail, so do it only when a form sets a minimum; a photo under 100 KB already passes a "maximum 100 KB" rule.',
      },
    ],
  },
  150: {
    verb: 'Compress Photo to',
    description:
      'Get the 150 KB photo size the IAF Agniveervayu signature caps at: a 135–150 KB JPG made on your phone. Also fits 200 KB photo rules. Never uploaded.',
    intro:
      'Get the 150 KB photo size that the IAF Agniveervayu signature caps at. Add your image and download a JPG of 135–150 KB, made on your phone, never uploaded.',
    usesH2: 'Who needs a photo compressor for 150 KB',
    uses: 'IAF Agniveervayu asks for the candidate’s signature at 80–150 KB, an unusually high range for a signature. This page lands it at 135–150 KB. The same target suits the 10–200 KB photo rule of NEET UG, JEE Main, CUET UG, UGC NET and CSIR NET, and the 20–200 KB photo of UPSC CSE, NDA and CDS, while staying well clear of the 200 KB cap.',
    qualityH2: 'What 150 KB looks like',
    quality:
      'A file this size can hold a signature photographed at good phone resolution and trimmed, or a detailed portrait. Detail is essentially that of the source; any blur you see was already in the original.',
    tip: 'With a large budget, sharpness depends on the photo, not the compression. Hold the phone steady, tap to focus on the paper or face, and use daylight rather than a yellow bulb.',
    faq: [
      {
        q: 'Why is the IAF signature so large?',
        a: 'That is how the IAF form is set up: 80–150 KB. A 20 KB signature that works for banks is below the IAF minimum, so use a high target like this one.',
      },
      {
        q: 'Can I use 150 KB for a NEET photo?',
        a: 'Yes. NEET UG takes a photo of 10–200 KB, and 135–150 KB is inside that.',
      },
      {
        q: 'Will a small image be stretched to reach 150 KB?',
        a: 'No. The tool raises the JPEG quality and, if needed, adds invisible padding. Pixels are never enlarged.',
      },
    ],
  },
  200: {
    verb: 'Resize Image to',
    description:
      'Get the 200 KB photo size for NTA, UPSC and defence forms: a detailed 180–200 KB JPG made on your phone. Free, quick and never uploaded.',
    intro:
      'Need the 200 KB photo size for an NTA or UPSC form? Add your photo and download a JPG between 180 and 200 KB, processed on your own phone.',
    usesH2: 'Forms that let you resize an image to 200 KB',
    uses: 'NEET UG, JEE Main, CUET UG, UGC NET and CSIR NET accept a photograph from 10 to 200 KB, and UPSC CSE, NDA and CDS want 20–200 KB. The IAF Agniveervayu photo has a high minimum: 100–200 KB. NEET UG also asks for the finger and thumb impressions of both hands as one 50–200 KB image.',
    qualityH2: 'What you get in a 200 KB photo size JPG',
    quality:
      'The result leaves a detailed, high-quality photo. If your file is already smaller, we raise the quality so it is not too small for a minimum such as the IAF 100 KB.',
    tip: 'Large limits do not mean any photo works. Check the background colour and the face size rules on your exam page too; file size is only one of the checks.',
    faq: [
      {
        q: 'Why make a 120 KB photo bigger?',
        a: 'Only if you choose 200 KB. If your form accepts 10–200 KB, a 120 KB photo is already fine, so pick a smaller target or upload it as it is.',
      },
      {
        q: 'Can I use this for a postcard-size photo?',
        a: 'Yes. Choose Keep dimensions to keep the exact pixels and change only the file size.',
      },
      {
        q: 'Is a bigger file always better?',
        a: 'Not past the size the portal displays. If your form accepts 10–200 KB, a sharp 60 KB photo is as good as a 190 KB one. Pick 200 KB when the form sets a high minimum.',
      },
    ],
  },
  250: {
    verb: 'Compress Photo to',
    description:
      'Get the 250 KB photo size for postcard photos and photographed pages: a 225–250 KB JPG made on your phone. Free, private, nothing is uploaded.',
    intro:
      'Get the 250 KB photo size for detailed photos and photographed pages. Add an image and download a JPG of 225–250 KB, made entirely on your phone, with nothing uploaded.',
    usesH2: 'What to send at 250 KB',
    uses: 'No exam we track caps an image at exactly 250 KB, but it is a useful target in two cases. The DSSSB postcard-size photograph may be 50–300 KB, and 250 KB keeps detail while staying clear of that cap. And when a portal accepts a scanned certificate as a JPG with a 300 KB limit, 250 KB leaves a safe margin.',
    qualityH2: 'Quality at 250 KB',
    quality:
      'At 250 KB a full A4 page photographed with a phone stays readable, including the small print inside a stamp. A postcard-size portrait of 480×672 pixels can be saved at near-maximum quality.',
    tip: 'Photograph the page flat, in even daylight, filling the frame. A tilted or shadowed page wastes kilobytes on the background and makes small print harder to read.',
    faq: [
      {
        q: 'Is 250 KB right for the DSSSB postcard photo?',
        a: 'Yes, the DSSSB rule is 50–300 KB at 480×672 px. For the exact pixels, use the DSSSB kit; this page keeps your image’s own shape.',
      },
      {
        q: 'My form wants a PDF, not a JPG. Can I use this?',
        a: 'Make the JPG here, then use Images to PDF, or use Compress PDF if you already have a PDF.',
      },
      {
        q: 'Why is my 250 KB photo not sharper than the 100 KB one?',
        a: 'Beyond about 100 KB a face photo is limited by the camera, not the file size. Extra kilobytes mostly keep sensor noise.',
      },
    ],
  },
  300: {
    verb: 'Compress Photo to',
    description:
      'Get the 300 KB photo size for the DSSSB postcard photo and document images: a 270–300 KB JPG made on your phone. Free and never uploaded.',
    intro:
      'Get the 300 KB photo size for postcard photos and document images. Add your file and download a JPG of 270–300 KB, made on your own phone and never uploaded.',
    usesH2: 'Forms with a 300 KB limit',
    uses: 'DSSSB asks for a postcard-size photograph of 480×672 px at 50–300 KB. NTA forms such as NEET UG, JEE Main, CUET UG, UGC NET and CSIR NET set 50–300 KB for certificates like the disability certificate, but those uploads are PDFs; for them use Compress PDF or Images to PDF instead of this page.',
    qualityH2: 'How much fits in 300 KB',
    quality:
      'Three hundred kilobytes holds more photo than any exam photo field needs. For a document photographed as a JPG, it keeps an A4 page sharp enough to read the smallest line.',
    tip: 'If a form gives a wide range like 50–300 KB, you do not have to go near the top. A 100 KB photo uploads faster on a weak connection and passes the same rule.',
    faq: [
      {
        q: 'Is 300kb the same as 300 KB?',
        a: 'Yes, both mean three hundred kilobytes. Portals write it either way; some count 1 KB as 1024 bytes and others as 1000, and this file passes both.',
      },
      {
        q: 'Can I make a 300 KB PDF here?',
        a: 'No, this page makes JPG files. Use Images to PDF to combine JPGs into one PDF under a KB limit.',
      },
      {
        q: 'Will my 4 MB photo still look good at 300 KB?',
        a: 'Yes. A 4 MB phone photo is mostly pixels a form never shows. Reduced to a sensible size, it looks the same on screen at 300 KB.',
      },
    ],
  },
  350: {
    verb: 'Compress Photo to',
    description:
      'Get the 350 KB photo size: a 315–350 KB JPG that keeps a safe margin under 400 KB limits, for detailed scans and photos. Free and never uploaded.',
    intro:
      'Need the 350 KB photo size? Add your photo or scan and get a JPG of 315–350 KB, a high-quality file that still stays under a 400 KB limit. It is made on your phone.',
    usesH2: 'When to choose 350 KB',
    uses: 'No exam in our list sets 350 KB as a cap. It is a buffer target: if a form allows up to 400 KB for an image, 350 KB passes with room to spare, even if the portal measures size slightly differently. It also works for detailed scans, such as a full-page marksheet, where you want the most quality a small file can carry.',
    qualityH2: 'Quality at 350 KB',
    quality:
      'At 350 KB the JPEG quality is high enough that compression is practically invisible, even on printed tables and stamps. Bigger targets mainly preserve camera noise.',
    tip: 'Check the format before the size. If the portal says "PDF only", a perfect 350 KB JPG will still be rejected; use Images to PDF for those fields.',
    faq: [
      {
        q: 'Is 350 KB safe under a 400 KB limit?',
        a: 'Yes. The file lands at 315–350 KB, about 50 KB under the cap.',
      },
      {
        q: 'How long does a 350 KB file take to upload?',
        a: 'On a slow 1 Mbps mobile connection, about three seconds. Smaller files help on weak signals, so use the lowest size your form allows.',
      },
      {
        q: 'Does a higher KB fix a blurry photo?',
        a: 'No. If the original is out of focus, retake it. Extra kilobytes keep the blur exactly as it is.',
      },
    ],
  },
  400: {
    verb: 'Compress Photo to',
    description:
      'Get the 400 KB photo size for large images and photographed documents: a 360–400 KB JPG made on your own phone. Free, private, nothing uploaded.',
    intro:
      'Get the 400 KB photo size for big images and photographed documents. Add your file and download a JPG of 360–400 KB, made on your own phone without uploading.',
    usesH2: 'Where a 400 KB image is used',
    uses: 'A 400 KB limit is mostly for documents. RRB NTPC, RRB ALP and RRB Group D ask for the SC/ST certificate (for the free travel pass) as a PDF of up to 399 KB. That is a PDF rule, so convert your certificate photo with Images to PDF and set 399 KB there. Use this page when a portal accepts the document as a JPG of up to 400 KB.',
    qualityH2: 'What a 400 KB JPG gives you',
    quality:
      'Four hundred kilobytes keeps an A4 document photo crisp, with clear text and stamps, or a portrait well beyond what any form displays. Expect no visible compression at all.',
    tip: 'Mind odd caps. A limit of 399 KB, like RRB’s, means a 400 KB file fails. When the number is not round, set your target a little below it.',
    faq: [
      {
        q: 'Can I compress a certificate to 399 KB here?',
        a: 'Yes, type 399 as the target. But if the form wants a PDF, use Images to PDF so the file type is right too.',
      },
      {
        q: 'Is 400 KB too big for a photo?',
        a: 'For most exam photos, yes: they cap at 50–200 KB. Use 400 KB only when a form allows it.',
      },
      {
        q: 'Does the page keep my document’s colours?',
        a: 'Yes. Colours, stamps and signatures are kept; only the JPEG quality and, if needed, the pixel size change.',
      },
    ],
  },
  500: {
    verb: 'Compress Image to',
    description:
      'Get the 500 KB photo size for scanned certificates and large documents: a readable 450–500 KB JPG made on your phone. Free and never uploaded.',
    intro:
      'Get the 500 KB photo size for scanned certificates and large documents. Add an image and download a JPG of 450–500 KB, made on your phone and never uploaded.',
    usesH2: 'Documents that use a 500 KB limit',
    uses: 'IBPS PO asks for the Class 10 certificate as a PDF of up to 500 KB. Some state and university portals take scanned certificates, caste or income certificates and marksheets as JPGs of up to 500 KB. If the form wants a PDF, make the JPG here and combine it with Images to PDF, or shrink an existing PDF with Compress PDF.',
    qualityH2: 'Readability at 500 KB',
    quality:
      'The output is enough for a full page scan to stay readable. Text edges stay sharp and stamps remain legible, even on a 4 MB original.',
    tip: 'Shoot documents with the phone parallel to the page and the page filling the frame. A straight, well-lit scan reads perfectly at 500 KB; a skewed one stays hard to read at any size.',
    faq: [
      {
        q: 'My scan is 4 MB. Will the text still be readable at 500 KB?',
        a: 'Yes for a normal A4 page. The page is reduced to a sensible size and compressed; printed and handwritten text stay clear.',
      },
      {
        q: 'Can I compress several certificates at once?',
        a: 'Yes, use Batch compress: up to 20 images to the same target, downloaded as one ZIP.',
      },
      {
        q: 'Is 500 KB the same as half an MB?',
        a: 'Roughly. 500 KB is 0.49 MB if 1 MB is 1024 KB, or exactly 0.5 MB if 1 MB is 1000 KB. The MB to KB page explains the difference.',
      },
    ],
  },
};
