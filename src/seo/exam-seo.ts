/**
 * Per-exam search copy (docs/seo/keyword-map.md, "Exams"): the primary keyword goes into
 * the title, H1, intro and description; secondary keywords into H2s and extra FAQs.
 * English only; Hindi pages keep the generic templates. Every number here is a verified
 * preset value (tests/presets/toverify-copy.test.ts scans this file).
 * Titles must stay <= 60 characters (tests/unit/seo/titles.test.ts).
 */

export interface ExamSeo {
  /** Primary keyword from the keyword map (used by tests). */
  keyword: string;
  title?: string;
  h1?: string;
  description?: string;
  /** First paragraph under the H1. */
  intro?: string;
  specH2?: string;
  aboutH2?: string;
  faqH2?: string;
  /** Extra FAQs, shown after the preset FAQs (and in FAQPage JSON-LD). */
  faq?: { q: string; a: string }[];
}

const SEO: Record<string, ExamSeo> = {
  'neet-ug': {
    keyword: 'neet photo size',
    title: 'NEET Photo Size 2026: Photo, Signature & Thumb',
    h1: 'NEET Photo Size 2026: Photo, Signature and Finger Prints',
    description:
      'NEET photo size 2026: JPG photo 10–200 KB, signature 10–100 KB, finger and thumb sheet 50–200 KB. Resize free on your phone, plus postcard photo notes.',
    intro:
      'The NEET photo size for 2026 is 10–200 KB in JPG, with no fixed pixel size; the signature is 10–100 KB. Use the NEET photo resizer kit below to make the upload photo, the signature and the finger-print sheet in one sitting, then read the postcard-size and admit-card photo notes further down.',
    specH2: 'NEET 2026 photo requirements and signature size',
    aboutH2: 'NEET photo upload, postcard size photo and admit card photo',
    faqH2: 'NEET photo size FAQ',
    faq: [
      {
        q: 'Does NEET still ask for a postcard size photo?',
        a: 'Not as an upload in the 2026 bulletin as we read it: the form takes one passport-style photo of 10–200 KB. Older NEET forms asked for a postcard-size (4×6 inch) photo upload, which is why many guides still mention it. A printed postcard-size photo can still be needed on exam day, so read your admit card when it comes out.',
      },
      {
        q: 'What is the NEET admit card photo size?',
        a: 'The admit card prints the photo you uploaded, so get the upload right first. On exam day you paste a passport-size print of the same photo on the attendance sheet, and the admit card says whether you also need a postcard-size print for the proforma. Print a few copies of the same photo with the passport photo sheet tool.',
      },
      {
        q: 'Is a passport size photo fine for NEET?',
        a: 'Yes. A passport-style photo with a white background, the face filling about 80% of the frame and both ears visible is what the 2026 form wants. SahiSize keeps 3.5×4.5 cm proportions and brings the file inside 10–200 KB.',
      },
    ],
  },
  'upsc-cse': {
    keyword: 'upsc photo resize',
    title: 'UPSC Photo Resize 2026: Photo & Signature Size',
    h1: 'UPSC Photo Resize for CSE 2026: Photo Size and Three Signatures',
    description:
      'UPSC photo resize for CSE 2026: JPG photo 20–200 KB on a white background, and one image with your signature three times. Free, on your phone, no upload.',
    intro:
      'UPSC photo resize, done right: the UPSC CSE 2026 form takes a JPG photo of 20–200 KB and one image with your signature written three times. This page lists the UPSC photo size and signature rules from the notice, and the kit below makes both files on your phone.',
    specH2: 'UPSC photo size and signature size',
    aboutH2: 'UPSC photo upload: what the form checks',
    faqH2: 'UPSC photo FAQ',
    faq: [
      {
        q: 'How do I do the UPSC photo upload from a phone?',
        a: 'Make the photo here, save it, then pick it from Files or Gallery in the OTR profile or the application form. Upload the saved file as it is; sending it through WhatsApp first shrinks it below 20 KB.',
      },
      {
        q: 'Can I reuse my UPSC CSE photo for NDA or CDS?',
        a: 'Yes, if it is still recent. UPSC NDA and CDS forms take the same JPG photo of 20–200 KB through the same One-Time Registration profile.',
      },
    ],
  },
  'uppsc-pcs': {
    keyword: 'uppsc photo and signature size',
    title: 'UPPSC Photo and Signature Size 2026',
    h1: 'UPPSC Photo and Signature Size 2026 (PCS and OTR)',
    description:
      'UPPSC photo and signature size 2026: 5×6 cm photo with signature below, up to 50 KB; 6×3 cm signature, up to 30 KB; JPG. Make both free on your phone.',
    intro:
      'The UPPSC photo and signature size for PCS 2026 and One Time Registration: a 5×6 cm photo with your signature below it, up to 50 KB, and a separate 6×3 cm signature, up to 30 KB, both JPG. UPPSC is the only big commission that wants the signature inside the photo image too, so read the composite photo steps below.',
    specH2: 'UPPSC photo size and signature size table',
    aboutH2: 'How to make the UPPSC photo with signature',
    faqH2: 'UPPSC photo and signature FAQ',
  },
  dsssb: {
    keyword: 'dsssb photo resize',
    title: 'DSSSB Photo Resize 2026: Photo, Signature & Thumb',
    h1: 'DSSSB Photo Resize: Postcard Photo, Signature and Thumb Size',
    description:
      'DSSSB photo resize: postcard-style photo 480×672 px, 50–300 KB; signature up to 20 KB; each thumb up to 40 KB. Free DSSSB photo resizer, no upload.',
    intro:
      'DSSSB photo resize works differently from other exams: OARS wants a postcard-style upper-body photo of 480×672 px and 50–300 KB, not a tight passport crop. Use the DSSSB photo resizer below for the photo, the signature (up to 20 KB) and the left and right thumb impressions (up to 40 KB each).',
    specH2: 'DSSSB photo size and upload sizes',
    aboutH2: 'DSSSB postcard size photo and thumb impression size',
    faqH2: 'DSSSB photo resizer FAQ',
    faq: [
      {
        q: 'What is the DSSSB thumb impression size?',
        a: 'The left and right thumbs are separate JPG uploads, each up to 40 KB. Press once on white paper with a stamp pad and photograph it in daylight; Clean thumb removes the grey paper tone.',
      },
      {
        q: 'What is the DSSSB photo upload size in KB?',
        a: '50–300 KB. Many DSSSB rejections are photos under 50 KB, because a passport-size face crop compresses too small. Keep the upper body in frame and Auto-fit lands it inside the range.',
      },
    ],
  },
  mppsc: {
    keyword: 'mppsc photo and signature size',
    title: 'MPPSC Photo and Signature Size 2026',
    h1: 'MPPSC Photo and Signature Size 2026, with Name and Date',
    description:
      'MPPSC photo and signature size 2026: photo 350×450 px, 25–100 KB, with name and date; signature 350×150 px, 10–100 KB; JPG. Free, made on your phone.',
    intro:
      'The MPPSC photo and signature size for the State Service Exam 2026: the photo is 350×450 px (3.5×4.5 cm), 25–100 KB, with your name and the photo date on it; the signature is 350×150 px, 10–100 KB; both JPG. The kit adds the name-and-date strip for you.',
    specH2: 'MPPSC photo size and signature size table',
    aboutH2: 'MPPSC photo with name and date: how to get it right',
    faqH2: 'MPPSC photo and signature FAQ',
  },
  ctet: {
    keyword: 'ctet photo size',
    title: 'CTET Photo Size 2026 and Signature Size',
    h1: 'CTET Photo Size 2026 and Signature Size',
    description:
      'CTET photo size 2026: 3.5×4.5 cm, 10–100 KB, JPG; signature 3.5×1.5 cm, 3–30 KB. We convert the cm to pixels and fit both files free on your phone.',
    intro:
      'The CTET photo size is 3.5×4.5 cm, 10–100 KB, JPG; the signature is 3.5×1.5 cm, 3–30 KB. SahiSize turns those centimetres into pixels (about 276×354 and 276×118 at 200 DPI) and fits both files on your phone, so the CTET form accepts them the first time.',
    specH2: 'CTET photo size and signature size in cm, pixels and KB',
    aboutH2: 'CTET photo upload tips',
    faqH2: 'CTET photo size FAQ',
  },
  'jee-main': {
    keyword: 'jee photo size',
    title: 'JEE Photo Size 2026: JEE Main Photo & Signature',
    h1: 'JEE Main Photo Size 2026 and Signature Size',
    description:
      'JEE photo size for JEE Main 2026: JPG photo 10–200 KB, signature 10–100 KB, Class 10 PDF 50–300 KB. Name and date on photo explained. Free, no upload.',
    intro:
      'The JEE photo size for JEE Main 2026 is 10–200 KB, JPG, with no fixed pixel size; the signature is 10–100 KB. Below: the full upload list, whether the JEE Main photo needs your name and date, and a kit that makes every file on your phone.',
    specH2: 'JEE Main photo size and other uploads',
    aboutH2: 'JEE Main photo upload rules',
    faqH2: 'JEE photo size FAQ',
    faq: [
      {
        q: 'Does the JEE Main photo need my name and date?',
        a: 'Not in the 2026 bulletin as we read it: the photo rules ask for a recent colour photo on a white background, with no name-and-date strip. Older forms and some coaching guides mention a JEE Main photo with name and date, which is why people search for it. Follow your own bulletin; if it asks for the strip, add it before you upload.',
      },
    ],
  },
  'cuet-ug': {
    keyword: 'cuet photo size',
    title: 'CUET Photo Size 2026: CUET UG Photo & Signature',
    h1: 'CUET UG Photo Size 2026 and Signature Size',
    description:
      'CUET photo size for CUET UG 2026: JPG photo 10–200 KB, signature 10–50 KB, a smaller limit than NEET or JEE Main. Resize both free on your phone.',
    intro:
      'The CUET photo size for CUET UG 2026 is 10–200 KB, JPG; the signature is 10–50 KB, a smaller limit than NEET or JEE Main. If you are reusing files from another NTA form, run the signature through Auto-fit again before you upload it here.',
    specH2: 'CUET photo size and signature size',
    aboutH2: 'CUET photo upload rules',
    faqH2: 'CUET photo size FAQ',
  },
  'sbi-po': {
    keyword: 'sbi po photo resizer',
    title: 'SBI PO Photo Resizer: Photo, Signature & Thumb Size',
    h1: 'SBI PO Photo Resizer: Photo, Signature, Thumb and Declaration Size',
    description:
      'SBI PO photo resizer: photo 200×230 px, 20–50 KB; signature 140×60 px, 10–20 KB; thumb and handwritten declaration too. Free, nothing is uploaded.',
    intro:
      'This SBI PO photo resizer makes all four uploads at the official size: photo 200×230 px, 20–50 KB; signature 140×60 px, 10–20 KB; left thumb 240×240 px, 20–50 KB; and the handwritten declaration 800×400 px, 50–100 KB.',
    specH2: 'SBI PO photo size and other uploads',
    aboutH2: 'SBI PO photo and signature: what gets rejected',
    faqH2: 'SBI PO photo size FAQ',
  },
  'sbi-clerk': {
    keyword: 'sbi clerk thumb impression size',
    title: 'SBI Clerk Thumb Impression Size & Photo Size 2026',
    h1: 'SBI Clerk Thumb Impression Size 2026, Photo and Signature Size',
    description:
      'SBI Clerk thumb impression size: 240×240 px, 20–50 KB, left thumb. Photo 200×230 px, 20–50 KB; signature 140×60 px, 10–20 KB. Free, no upload.',
    intro:
      'SBI Clerk (Junior Associate) 2026 uses the same pixel sizes as SBI PO. The SBI Clerk thumb impression size is 240×240 px, 20–50 KB: your left thumb in black or blue ink on white paper. The photo is 200×230 px, 20–50 KB, and the signature 140×60 px, 10–20 KB.',
    specH2: 'SBI Clerk photo size and thumb impression size',
    aboutH2: 'SBI Clerk uploads and the SBI declaration',
    faqH2: 'SBI Clerk size FAQ',
  },
  'india-post-gds': {
    keyword: 'gds signature size 2026',
    title: 'India Post GDS Signature Size 2026 & Photo Size',
    h1: 'India Post GDS Signature Size 2026 and Photo Size',
    description:
      'GDS signature size 2026: 300×120 px, 20–100 KB, JPG, filling 70–80% of the image. GDS photo 320×400 px, 30–100 KB. Make both free on your phone.',
    intro:
      'GDS signature size 2026, in short: 300×120 px (a 5:2 shape), 20–100 KB, JPG, with the signature filling 70–80% of the image. The photo is 320×400 px, 30–100 KB. Both are made here at the exact size, ready for the India Post GDS form.',
    specH2: 'GDS signature size and photo size',
    aboutH2: 'India Post GDS upload rules',
    faqH2: 'GDS signature and photo FAQ',
  },
};

export function examSeo(slug: string): ExamSeo | undefined {
  return SEO[slug];
}

export function examSeoSlugs(): string[] {
  return Object.keys(SEO);
}
