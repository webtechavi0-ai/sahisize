/**
 * Copy for the PDF size pages (keyword map "Tools: PDF"):
 *  - T7 /tools/compress-pdf-to-[n]kb, n in PDF_KB_TARGETS
 *  - T6 /tools/jpg-to-pdf-under-[n]kb, n in JPG_PDF_KB_TARGETS
 *  - Hindi: compress-pdf-to-200kb, compress-pdf-to-500kb, jpg-to-pdf-under-300kb
 *
 * Every page is written by hand (SPEC 9.4: no spun duplicates; tests keep sibling pages at
 * Jaccard ≤ 0.45). Exam facts come only from published, verified preset documents:
 *  - NTA forms (NEET UG, JEE Main, CUET UG, UGC NET, CSIR NET): certificate PDFs of 50–300 KB
 *  - RRB NTPC, ALP, Group D: SC/ST certificate for the free travel pass, PDF under 400 KB
 *  - IBPS PO: Class 10 certificate, A4 PDF of up to 500 KB
 * Page-count estimates were measured on phone-style A4 scans: about 20–50 KB a page at 72 DPI,
 * 40–100 KB at 100 DPI and 100–250 KB at 150 DPI (T7), and similar for T6 after scaling.
 * The exam links under each page come from the presets, so they follow preset changes.
 */
import type { Lang } from '@/config/site';
import {
  JPG_PDF_KB_TARGETS,
  PDF_KB_TARGETS,
  compressPdfToKbPath,
  jpgToPdfUnderKbPath,
} from '@/config/tools';
import { getKitDocuments, getPublishedPresets } from '@/content/presets';
import { hasHindiExam, hindiToolPath } from '@/seo/hreflang';
import type { ToolCopy, ToolSection } from './types';

interface PageNotes {
  title: string;
  description: string;
  h1: string;
  intro: string;
  steps: { name: string; text: string }[];
  /** Which documents use this size. */
  uses: ToolSection;
  /** Realistic page counts at this size. */
  pages: ToolSection;
  /** Scans vs text PDFs (T7) or page order and A4 vs original (T6). */
  tip: ToolSection;
  faq: { q: string; a: string }[];
  /** Published exams to link from the "uses" section (validated against the presets). */
  exams: string[];
}

// ---------------------------------------------------------------------------
// T7: compress PDF to N KB (English)
// ---------------------------------------------------------------------------

const PRIVATE_FAQ = {
  q: 'Is my PDF uploaded to a server?',
  a: 'No. The PDF is opened, redrawn and saved inside your browser. It never leaves your device, and the page keeps working offline after your first visit.',
};

const COMPRESS_EN: Record<number, PageNotes> = {
  50: {
    title: 'PDF Compressor 50 KB: Compress a PDF to 50 KB, Free',
    description:
      'Compress a one-page PDF to under 50 KB for forms with a tight document limit. The page is redrawn on your phone, size-checked and never uploaded.',
    h1: 'Compress PDF to 50 KB',
    intro:
      'This PDF compressor aims for 50 KB, about the smallest limit a document upload will ever have. It works best on a single scanned page, and the whole job runs on your own device.',
    steps: [
      { name: 'Choose a short PDF', text: 'A single scanned page has the best chance at 50 KB. Files up to 25 MB open fine.' },
      { name: 'Leave 50 KB selected', text: 'The limit is set for you. If your form actually allows more, tap a bigger chip so the page stays sharper.' },
      { name: 'Press Compress', text: 'The page is redrawn at 150 DPI first, then at 100 and 72 DPI if the file is still too heavy.' },
      { name: 'Zoom before you upload', text: 'Open the preview and make sure names, dates and stamps are still readable, then download.' },
    ],
    uses: {
      h2: 'Where a 50 KB PDF limit comes from',
      paras: [
        'On the big national exams, 50 KB is usually the floor, not the ceiling. NTA forms want certificate PDFs between 50 and 300 KB, so a file under 50 KB is rejected there for being too small. A 50 KB maximum turns up instead on smaller portals: college admissions, scholarships and local recruitment forms that take one page such as an income certificate or an identity card.',
        'If your form says the PDF must be at least 50 KB, you need the opposite of this page. The exam kits for NEET UG and JEE Main build the PDF from your photos and pad it up to the minimum.',
      ],
    },
    pages: {
      h2: 'How many pages fit in 50 KB',
      paras: [
        'Realistically, one. A phone photo of an A4 page redrawn at 72 DPI takes roughly 20 to 50 KB, depending on how much paper texture and shadow the camera caught. A clean white page with dark print sits at the low end, so two such pages can sometimes share the budget. A creased or coloured certificate may need all 50 KB by itself.',
        'Three or more scanned pages will not go under 50 KB with readable text. Instead of handing you an unreadable file, the tool stops and shows the smallest size it reached.',
      ],
    },
    tip: {
      h2: 'Scans versus text PDFs at 50 KB',
      paras: [
        'For a scanner-app PDF, crop to the edge of the paper and delete blank pages before you start; even an empty page costs a few kilobytes. For a PDF typed in Word or exported from a website, check its size first: most are already under 50 KB, and the tool will say so. Forcing a text PDF through compression turns its letters into a picture, which looks softer and can end up larger.',
      ],
    },
    faq: [
      { q: 'Why does a 50 KB PDF look blurry?', a: 'A whole A4 page has to be stored at low resolution with strong JPEG compression to fit. Normal print stays readable, but fine print and faint stamps soften. If the portal allows 100 KB, use that page instead.' },
      { q: 'My PDF has three pages. Can it get under 50 KB?', a: 'Rarely with readable text. Upload only the page the form asks for, or check whether the portal accepts a larger file.' },
      PRIVATE_FAQ,
    ],
    exams: ['neet-ug', 'jee-main'],
  },
  100: {
    title: 'Compress PDF to 100 KB Online Free: 100 KB PDF, No Upload',
    description:
      'Compress a PDF to 100 KB for exam and job forms. Scanned pages are redrawn on your device until the file fits under 100 KB. Free, private, no sign-up.',
    h1: 'Compress PDF to 100 KB',
    intro:
      'Need a 100 KB PDF? Choose the file and this page brings it just under 100 KB by redrawing the scanned pages on your own phone or computer. Nothing is sent anywhere.',
    steps: [
      { name: 'Pick the PDF', text: 'From your phone, laptop or downloads folder; up to 25 MB.' },
      { name: 'Confirm 100 KB', text: 'It is already chosen. Type a different number only if your notice says something else.' },
      { name: 'Compress it', text: 'Pages are rasterised at the highest of 150, 100 or 72 DPI that still fits under 100 KB.' },
      { name: 'Save the smaller file', text: 'A tick on the size row means it passes; the download keeps your file name with "-100kb" added.' },
    ],
    uses: {
      h2: 'Which documents need a 100 KB PDF',
      paras: [
        'Many state recruitment and university portals cap a single document at 100 KB: a caste or domicile certificate, a no-objection certificate, an identity card. Always read the limit in your own form, because it varies between notices.',
        'A 100 KB file also suits NTA uploads. NEET UG takes its address proof and category certificate as PDFs of 50 to 300 KB, and a 100 KB file sits comfortably inside that window, well clear of the 50 KB floor.',
      ],
    },
    pages: {
      h2: 'How many pages fit in 100 KB',
      paras: [
        'One or two scanned pages fit comfortably, and three can work if the pages are clean. A phone-scanned A4 page is roughly 40 to 100 KB at 100 DPI and 20 to 50 KB at 72 DPI, so a front-and-back mark sheet is the typical 100 KB job.',
        'Five or more pages is asking too much. Even at 72 DPI the file stays well above 100 KB, and you will see the smallest size reached so you can decide which pages to drop.',
      ],
    },
    tip: {
      h2: 'Tip: scans and typed PDFs need different handling',
      paras: [
        'Scans: photograph the page flat, in daylight, without flash, and crop away the table. Shadows and wood grain are expensive detail that eats into 100 KB. Typed PDFs, such as a filled form or a downloaded e-certificate, are usually 20 to 80 KB already. The tool notices a mostly-text PDF before it rasterises anything and asks first; press "Compress anyway" only if the file really is over 100 KB, because the text becomes an image.',
      ],
    },
    faq: [
      { q: 'Will the file pass where the form says "up to 100 KB"?', a: 'Yes. It stays under 100 KB whether the portal counts a kilobyte as 1000 or 1024 bytes.' },
      { q: 'Why does it say my PDF is already small?', a: 'Because it is already at or under 100 KB (100,000 bytes). Compressing would only cost quality, so upload the original.' },
      { q: 'Can I still select the text afterwards?', a: 'No. Each page is saved as a picture. It looks the same and prints clearly, but keep your original if you need to copy text from it.' },
      PRIVATE_FAQ,
    ],
    exams: ['neet-ug'],
  },
  150: {
    title: 'Compress PDF to 150 KB: Make a 150 KB PDF Free, No Upload',
    description:
      'Make a 150 KB PDF from a larger scan: two to four pages with readable text and a checked size. Compression runs in your browser, so documents stay private.',
    h1: 'Compress PDF to 150 KB',
    intro:
      'Use this page when a form wants a 150 KB PDF. Each scanned page is redrawn only as much as needed to land under 150 KB, so text keeps as much sharpness as that size allows.',
    steps: [
      { name: 'Open your scan', text: 'Choose the PDF; password-protected files must be unlocked first.' },
      { name: 'Keep the 150 KB chip', text: 'It is selected for you, next to the other common limits.' },
      { name: 'Start compressing', text: 'A progress bar counts the pages while each one is redrawn as a JPEG page.' },
      { name: 'Check and download', text: 'Look at the preview, confirm the size tick, and save the new PDF.' },
    ],
    uses: {
      h2: 'Forms that work well with 150 KB',
      paras: [
        'A 150 KB cap appears on some university and state government forms for papers like a degree certificate, an experience letter or a character certificate. It is also a sensible middle target for NTA uploads: CSIR NET accepts its category certificate and result-awaited attestation form as PDFs of 50 to 300 KB, and a 150 KB file keeps two pages crisp while staying far from either edge.',
      ],
    },
    pages: {
      h2: 'How many pages fit in 150 KB',
      paras: [
        'Two to four. At 100 DPI a clean scanned page takes around 40 to 100 KB, so two pages fit with quality to spare; at 72 DPI, three or four plain pages can squeeze in. A two-sided mark sheet plus a cover letter is a typical 150 KB document. Six or more pages usually will not fit, and you are told how close it got.',
      ],
    },
    tip: {
      h2: 'Tip before compressing to 150 KB',
      paras: [
        'Delete pages the form did not ask for, such as a blank reverse side or an instructions sheet; removing one page buys more clarity than any setting. If your scanner app has a "document" or black-and-white mode, use it: it removes paper texture before the file ever reaches this tool. A typed PDF over 150 KB is usually heavy because of an embedded logo or font, and compressing it means its text turns into an image.',
      ],
    },
    faq: [
      { q: 'Is 150 KB enough for a readable certificate?', a: 'Yes for one or two pages. Printed text, signatures and round stamps stay clear at normal zoom.' },
      { q: 'What happens if 150 KB is impossible?', a: 'You see the smallest size reached, for example 210 KB. Remove a page or use a bigger limit if your form allows it.' },
      { q: 'Does the page size change?', a: 'No. Each page keeps its original width and height; only the picture inside is stored more efficiently.' },
      PRIVATE_FAQ,
    ],
    exams: ['csir-net'],
  },
  200: {
    title: 'Reduce PDF Size to 200 KB: Free 200 KB PDF Converter',
    description:
      'Reduce PDF size to 200 KB for exam forms. Scanned pages are redrawn at 150, 100 or 72 DPI on your device until the PDF fits. No upload, no watermark.',
    h1: 'Reduce PDF size to 200 KB',
    intro:
      'Turn a heavy scan into a 200 KB PDF that exam portals accept. This 200 KB PDF converter runs on your device, adds no watermark and never uploads your file.',
    steps: [
      { name: 'Select the PDF', text: 'Any PDF up to 25 MB, from a scanner app, email or download.' },
      { name: 'Check the limit says 200 KB', text: 'Change it only if your notice gives another number.' },
      { name: 'Reduce the size', text: 'The sharpest of 150, 100 and 72 DPI that fits is used, at the best JPEG quality under 200 KB.' },
      { name: 'Download and upload', text: 'The PDF is ready when the size row shows a tick.' },
    ],
    uses: {
      h2: 'Documents that need a 200 KB PDF',
      paras: [
        'JEE Main asks for the Class 10 certificate or marksheet as a PDF of 50 to 300 KB, and its disability certificate follows the same rule. Aiming at 200 KB rather than the full 300 gives a file that is sharp and still clearly inside the window, even if a portal rounds sizes differently. Plenty of state forms and private employers also set 200 KB as their document limit.',
      ],
    },
    pages: {
      h2: 'How many pages fit in 200 KB',
      paras: [
        'Three to six pages, or one or two at full sharpness. The first setting tried, 150 DPI, costs roughly 100 to 200 KB per scanned page, so a single certificate often keeps its best quality. For a multi-page marksheet the tool falls back to 100 DPI (about 40 to 100 KB a page) and then 72 DPI (about 20 to 50 KB).',
        'A ten-page scan will not reach 200 KB with readable text. Split it, or upload only the pages the form names.',
      ],
    },
    tip: {
      h2: 'Scanned PDF or text PDF?',
      paras: [
        'Scanned PDFs shrink dramatically: a 3 MB, three-page scan from a phone app usually lands just under 200 KB with readable text. An e-certificate downloaded from a government website is different. It is mostly text and normally already small; the tool checks the size first and, if it is already under 200 KB, tells you to upload it unchanged. If it is over and mostly text, you are warned before any page is turned into an image.',
      ],
    },
    faq: [
      { q: 'Is 200 KB the same as 0.2 MB?', a: 'Close enough for forms. Our file stays under 200,000 bytes, so it passes a 0.2 MB limit under either way of counting.' },
      { q: 'Why is my compressed PDF only 150 KB?', a: 'The tool picks the best quality that fits. Sometimes the next quality step would cross 200 KB, so it stops one step lower.' },
      { q: 'Will links and selectable text survive?', a: 'No. Pages become images; links and text selection are lost, but everything looks and prints the same.' },
      PRIVATE_FAQ,
    ],
    exams: ['jee-main'],
  },
  250: {
    title: 'Compress PDF to 250 KB Online: Free 250 KB PDF, Private',
    description:
      'Compress a PDF to 250 KB with every page redrawn on your own device. Good for 4–7 page scans and forms with a 250 KB cap. Free, no sign-up, never uploaded.',
    h1: 'Compress PDF to 250 KB',
    intro:
      'Get a 250 KB PDF from a scan that is too large for your form. The compressor redraws the pages on your device and keeps the highest quality that fits under 250 KB.',
    steps: [
      { name: 'Load the document', text: 'Pick the PDF that the portal rejected for being too large.' },
      { name: 'Use the 250 KB target', text: 'It is preselected; other common limits sit beside it.' },
      { name: 'Compress', text: 'Long files are sampled first, so a 20-page scan does not take a full pass at every resolution.' },
      { name: 'Verify', text: 'Scroll through the preview and download once the size is ticked.' },
    ],
    uses: {
      h2: 'When 250 KB is the right target',
      paras: [
        'A 250 KB limit is not common in the exam notices we track; you will meet it mainly on admission and scholarship portals. It is still a useful safety target for NTA uploads when the scan has several pages. CUET UG and UGC NET both want the disability (UDID) certificate as a PDF of 50 to 300 KB, and a 250 KB file leaves a margin below the ceiling without throwing away detail you might need.',
      ],
    },
    pages: {
      h2: 'How many pages fit in 250 KB',
      paras: [
        'Four to seven scanned pages at 72 or 100 DPI, or about two at 150 DPI. A clean, evenly lit page costs much less than a dim one with a grey cast, so the same certificate can fit five pages or eight depending on how it was photographed. Beyond about ten pages, 250 KB is out of reach.',
      ],
    },
    tip: {
      h2: 'Tip for multi-page scans',
      paras: [
        'Scan every page in the same light and at the same distance; one dark page drags the quality of all the others down, because the whole PDF shares one size budget. For text PDFs with embedded fonts, a size over 250 KB usually comes from a large logo or scanned signature inside. The tool asks before rasterising such a file, since its text would become an image.',
      ],
    },
    faq: [
      { q: 'Can I compress a 20-page PDF to 250 KB?', a: 'Not with readable text. Even at 72 DPI twenty pages need far more. Upload only the pages asked for.' },
      { q: 'Why does a long PDF take a while?', a: 'Every page has to be drawn and re-encoded on your device. A phone handles a few pages per second.' },
      { q: 'Will the PDF stay under 250 KB on the portal?', a: 'Yes. It is kept below 250,000 bytes, so it passes whether the portal divides by 1000 or 1024.' },
      PRIVATE_FAQ,
    ],
    exams: ['cuet-ug', 'ugc-net'],
  },
  300: {
    title: 'Compress PDF to 300 KB for NEET, JEE and CUET: Free',
    description:
      'Compress PDF to 300 KB, the certificate limit on NTA forms such as NEET UG, JEE Main and CUET UG. Redrawn on your device, never uploaded, size checked.',
    h1: 'Compress PDF to 300 KB',
    intro:
      'Compress a PDF to 300 KB, the ceiling NTA sets for certificate uploads. Your scan is redrawn on your phone until it fits, and the size check shows a tick when it is safe.',
    steps: [
      { name: 'Choose the certificate PDF', text: 'Scanned certificates, marksheets and proofs all work.' },
      { name: 'Stay on 300 KB', text: 'NTA’s maximum is already selected.' },
      { name: 'Compress', text: 'You get the best quality that stays under 300 KB on both ways of counting a kilobyte.' },
      { name: 'Check the 50 KB floor', text: 'NTA also has a 50 KB minimum; the result shows its size so you can confirm both.' },
    ],
    uses: {
      h2: 'NTA certificates: 50 to 300 KB',
      paras: [
        'NTA forms share one rule for documents: a PDF between 50 and 300 KB. NEET UG uses it for the Class 10 certificate, the category certificate, the disability certificate and the address proof. JEE Main uses it for the Class 10 certificate or marksheet, and CUET UG, UGC NET and CSIR NET for the disability (UDID) certificate; CSIR NET adds the category certificate and the result-awaited attestation form.',
        '300 KB is the hard top of that range. A file of 301 KB is rejected, so this page always lands a little below it.',
      ],
    },
    pages: {
      h2: 'How many pages fit in 300 KB',
      paras: [
        'Five to nine scanned pages at 72 to 100 DPI, or two to three pages at full 150 DPI quality. Most NTA certificates are one or two pages, which means you usually keep the sharpest setting. A long address proof such as a multi-page rent agreement is where the tool has to step down to a lower resolution.',
      ],
    },
    tip: {
      h2: 'Scans, text PDFs and the 50 KB minimum',
      paras: [
        'If you are starting from photos, skip this page and make the PDF directly: JPG to PDF under 300 KB gives sharper text than photo → PDF → compress. If your PDF is a typed or downloaded document, it may already be under 300 KB; then the tool says so and you should upload it as it is. A file that ends up under 50 KB would fail NTA’s minimum; the NEET UG and JEE Main kits pad it up safely.',
      ],
    },
    faq: [
      { q: 'NEET says 50 to 300 KB. Will my file be at least 50 KB?', a: 'Almost always. The compressor keeps the highest quality that fits, so a real scan lands well above 50 KB. The size is shown; if it is below 50 KB, use the exam kit, which pads to the minimum.' },
      { q: 'Does NTA accept a PDF where text is an image?', a: 'Yes. Portals only check that the file is a readable PDF in the size window; nobody needs to select the text.' },
      { q: 'My certificate has two sides. Should both be in one PDF?', a: 'Yes. NTA wants all pages of a document in one file.' },
      PRIVATE_FAQ,
    ],
    exams: ['neet-ug', 'jee-main', 'cuet-ug', 'ugc-net', 'csir-net'],
  },
  400: {
    title: 'PDF Compressor to 400 KB: RRB Certificate PDF, Free',
    description:
      'Compress a PDF to under 400 KB, as RRB NTPC, ALP and Group D ask for the SC/ST certificate. Pages are redrawn on your phone; nothing is uploaded.',
    h1: 'Compress PDF to 400 KB',
    intro:
      'This PDF compressor gets a scanned document under 400 KB. It is made for limits like the railway forms’ “less than 400 KB” rule, and it runs entirely on your device.',
    steps: [
      { name: 'Add the PDF', text: 'All pages of the certificate should already be in this one file.' },
      { name: 'Keep 400 KB', text: 'The output always stays strictly below 400 KB.' },
      { name: 'Compress', text: 'Pages are redrawn as JPEG pages; most certificates keep the sharp 150 DPI setting.' },
      { name: 'Download', text: 'Then attach it in the document section of your application.' },
    ],
    uses: {
      h2: 'Railway forms: SC/ST certificate under 400 KB',
      paras: [
        'RRB NTPC, RRB ALP and RRB Group D let SC/ST candidates ask for a free train travel pass to the exam. To claim it, you upload your SC/ST certificate as one PDF of less than 400 KB, with all pages in that file, clear and readable, with no edges cut off. The upload is optional and only for candidates who want the pass.',
        '“Less than 400 KB” means 400 KB itself is too much, so this page stays a little under, and the RRB kits cap the same document at 399 KB.',
      ],
    },
    pages: {
      h2: 'How many pages fit in 400 KB',
      paras: [
        'Three or four pages at 150 DPI, or seven to twelve at 72–100 DPI. A typical caste certificate is one or two pages, so it will keep near-original sharpness, including the seal and the issuing officer’s signature.',
      ],
    },
    tip: {
      h2: 'Getting a clean certificate scan',
      paras: [
        'Photograph the certificate on a dark, plain surface so its edges stand out, and make sure no corner is cut; the railway rules reject cut edges. If you have photos of the pages instead of a PDF, use JPG to PDF under 400 KB to combine them directly. A certificate downloaded as a digital PDF is usually tiny already, and the tool will tell you to upload it unchanged.',
      ],
    },
    faq: [
      { q: 'Is 399 KB accepted where it says less than 400 KB?', a: 'Yes. Anything under 400 KB passes. This page keeps the file under 400,000 bytes, which is below the limit under either reading.' },
      { q: 'Do I have to upload this certificate?', a: 'Only if you are an SC/ST candidate asking for the free travel pass. Check your own notice for other documents.' },
      { q: 'The compressed PDF is only 250 KB. Is something wrong?', a: 'No. If even the best quality setting gives 250 KB, the tool keeps that. There is no benefit in filling the file up to 400 KB.' },
      PRIVATE_FAQ,
    ],
    exams: ['rrb-ntpc', 'rrb-alp', 'rrb-group-d'],
  },
  500: {
    title: '500 KB PDF: Compress a PDF Under 500 KB, Free, No Upload',
    description:
      'Make a 500 KB PDF for forms like IBPS PO, which wants the Class 10 certificate as an A4 PDF of up to 500 KB. Runs on your device, free, no sign-up.',
    h1: 'Compress PDF to 500 KB',
    intro:
      'Make a 500 KB PDF from a scan that is a few megabytes. The pages are redrawn on your device, and at this size printed text and stamps stay sharp.',
    steps: [
      { name: 'Pick the large PDF', text: 'Scans of several megabytes are what this page is for.' },
      { name: 'Keep 500 KB', text: 'Already selected. 1000 KB is there too, if your form allows 1 MB.' },
      { name: 'Compress', text: 'With this much room, most documents keep the 150 DPI setting.' },
      { name: 'Download', text: 'The new file name ends in "-500kb" so you can tell it apart.' },
    ],
    uses: {
      h2: 'Who asks for a PDF under 500 KB',
      paras: [
        'IBPS PO asks for the Class 10 certificate as a PDF on A4 pages of not more than 500 KB, with all pages in one file. Many state recruitment and university portals also allow 500 KB per document, which is generous enough for a full mark sheet or a domicile certificate with an attached page.',
      ],
    },
    pages: {
      h2: 'How many pages fit in 500 KB',
      paras: [
        'Three to five pages at 150 DPI, and eight to fifteen at the lower settings. A one- or two-page Class 10 certificate needs only part of the budget, so it keeps excellent quality.',
        'If you get a PDF that is already under 500 KB, nothing is changed: the tool says it is already small and you upload the original.',
      ],
    },
    tip: {
      h2: 'Tip: the A4 rule',
      paras: [
        'Compressing keeps each page’s own size. If your scanner app saved the certificate at a custom size, or you only have photos, build the PDF with JPG to PDF under 500 KB and choose A4, which places each photo on an A4 page with margins. For a typed PDF, compression is rarely needed at 500 KB; if you do force it, the text becomes an image.',
      ],
    },
    faq: [
      { q: 'Is 500 KB the same as 0.5 MB?', a: 'For forms, yes. This page keeps the file under 500,000 bytes, so it passes a 0.5 MB limit too.' },
      { q: 'Will my certificate look worse?', a: 'Hardly. At 500 KB for one or two pages, the difference from the original is hard to see.' },
      { q: 'Can I use this for a 1 MB limit?', a: 'Yes. Tap the 1000 KB chip, or type your own number.' },
      { q: 'My scan is 8 MB. Is that too big?', a: 'No. Files up to 25 MB can be opened. An 8 MB scan of a few pages usually comes down to just under 500 KB in one pass.' },
      PRIVATE_FAQ,
    ],
    exams: ['ibps-po'],
  },
};

// ---------------------------------------------------------------------------
// T6: JPG to PDF under N KB (English)
// ---------------------------------------------------------------------------

const JPG_PRIVATE_FAQ = {
  q: 'Are my photos uploaded?',
  a: 'No. The PDF is put together inside your browser, so certificates and ID cards never leave your device.',
};

const JPG_EN: Record<number, PageNotes> = {
  50: {
    title: 'JPG to PDF Under 50 KB: One Certificate Page, Free',
    description:
      'Convert a JPG of a certificate, ID card or receipt into a PDF under 50 KB. Choose A4 or original size; the PDF is built on your phone and never uploaded.',
    h1: 'JPG to PDF under 50 KB',
    intro:
      'Turn one photo of a document into a PDF under 50 KB. Pick the image, keep the 50 KB limit and download; the conversion happens on your device.',
    steps: [
      { name: 'Add one photo', text: 'A JPG, PNG or iPhone HEIC photo of the page or card.' },
      { name: 'Choose Original or A4', text: 'Original suits a card; A4 suits a full page.' },
      { name: 'Keep 50 KB', text: 'The limit switch is on and 50 KB is selected.' },
      { name: 'Make the PDF', text: 'Quality, then size, is lowered step by step until the PDF fits.' },
    ],
    uses: {
      h2: 'Single-page uploads under 50 KB',
      paras: [
        'A 50 KB PDF limit usually means one small document: an identity card, a fee receipt, a signed undertaking. On NTA forms it is the other way round: 50 KB is the minimum for certificate PDFs, which may go up to 300 KB. For those, use a larger limit here, or the NEET UG and JEE Main kits, which also pad a small PDF up to 50 KB.',
      ],
    },
    pages: {
      h2: 'What fits in 50 KB',
      paras: [
        'One page with readable text, or an ID card front and back. Printed text on an A4 page needs roughly 25 to 50 KB to stay legible, so a second full page would squeeze both below readable. If you add more photos, the PDF can still be made, but the tool may have to shrink each page until small print blurs; zoom in before you upload.',
      ],
    },
    tip: {
      h2: 'Original size for cards, A4 for pages',
      paras: [
        'With Original, the PDF page is exactly the size of your photo, so none of the 50 KB is spent on a white border. That is the better choice for an ID card or a receipt. Pick A4 when the form says A4 or the document is a full sheet. Crop the photo to the document first; a table top around the card wastes kilobytes.',
      ],
    },
    faq: [
      { q: 'Can I put an ID card’s front and back in one 50 KB PDF?', a: 'Yes. Add both photos, choose Original, and put the front first.' },
      { q: 'Why did my text get blurry?', a: 'At 50 KB the page had to be scaled down. Crop tighter, use fewer pages or pick a larger limit.' },
      { q: 'Can I go even lower, like 30 KB?', a: 'Yes. Tap Custom and type 30. A single plain page can usually get there, but zoom in afterwards to be sure the text survived.' },
      JPG_PRIVATE_FAQ,
    ],
    exams: ['neet-ug', 'jee-main'],
  },
  100: {
    title: 'JPG to PDF 100 KB: Photo to PDF Under 100 KB, Free',
    description:
      'Convert photos to a PDF under 100 KB: image to PDF for forms, with page order and A4 or original size. Built on your phone or laptop, never uploaded.',
    h1: 'JPG to PDF under 100 KB',
    intro:
      'Make a photo to PDF under 100 KB in a few taps. Add the image or two, set the order, and the PDF lands below 100 KB without leaving your device.',
    steps: [
      { name: 'Add the photos', text: 'Take them with the camera or pick them from the gallery; up to 20 files.' },
      { name: 'Set the page order', text: 'Use the arrows, drag, or press Alt with an arrow key on a focused row.' },
      { name: 'Keep 100 KB on', text: 'The maximum is set; A4 is the default page size.' },
      { name: 'Make the PDF', text: 'Download when the size row shows a tick.' },
    ],
    uses: {
      h2: 'Where an image to PDF under 100 KB is needed',
      paras: [
        'Many state and university forms cap each document at 100 KB, for papers such as a domicile certificate, a gap-year affidavit or an income certificate. For NEET UG, whose address proof and category certificate must be PDFs of 50 to 300 KB, a 100 KB PDF is also a safe pick: comfortably above the floor and well under the top.',
      ],
    },
    pages: {
      h2: 'How many photos fit in 100 KB',
      paras: [
        'Two pages with clear text, three if the pages are plain. Each A4 page needs about 40 KB to keep normal print readable once it is scaled for a small file. With four or more pages, the tool will still produce a PDF under 100 KB, but every page gets smaller; check the preview before you rely on it.',
        'Photos straight from a modern phone are 2 to 5 MB each, so the tool first caps them at 2000 pixels on the long side and then searches for the best JPEG quality that fits.',
      ],
    },
    tip: {
      h2: 'Page order and page size',
      paras: [
        'The PDF follows the list from top to bottom, so put page 1 first; for a two-sided document, front then back. A4 places each photo on an A4 sheet with margins, which looks like a proper document when the portal or an officer opens it. Original keeps each photo’s shape, which wastes nothing on borders and is better for small items.',
      ],
    },
    faq: [
      { q: 'Can I convert a PNG or HEIC to a PDF under 100 KB?', a: 'Yes. JPG, PNG, WebP and iPhone HEIC photos are all accepted.' },
      { q: 'Can I add an existing PDF to the photos?', a: 'Yes. Its pages are turned into images and inserted where you place the file.' },
      { q: 'What if 100 KB is not enough?', a: 'You are told the smallest size reached. Remove a page or choose a higher limit if your form allows it.' },
      JPG_PRIVATE_FAQ,
    ],
    exams: ['neet-ug'],
  },
  150: {
    title: 'JPG to PDF Under 150 KB: Combine 2–4 Pages Free',
    description:
      'Combine JPG photos of a certificate into one PDF under 150 KB. Reorder pages, pick A4 or original size, and download. Free, no upload, works offline.',
    h1: 'JPG to PDF under 150 KB',
    intro:
      'Combine two to four photos into a single PDF under 150 KB. Arrange the pages, keep the limit, and the PDF is made on your own phone.',
    steps: [
      { name: 'Photograph each page', text: 'Lay it flat and shoot from straight above.' },
      { name: 'Arrange the list', text: 'Page 1 at the top, the last page at the bottom.' },
      { name: 'Choose A4 and 150 KB', text: 'Both are ready; switch to Original only for cards.' },
      { name: 'Make and save', text: 'The PDF opens in the preview before you download it.' },
    ],
    uses: {
      h2: 'Documents that suit 150 KB',
      paras: [
        'A two-sided marksheet, a certificate with an attached annexure, or an experience letter of two pages. 150 KB is also a comfortable target for CSIR NET, which takes its category certificate and result-awaited attestation form as PDFs of 50 to 300 KB: the text stays crisp and the file is far from both limits.',
      ],
    },
    pages: {
      h2: 'How many pages fit in 150 KB',
      paras: [
        'Three clear pages, or four if they are mostly white paper with dark print. Photos of glossy or coloured certificates take more room; for those, plan on two or three pages.',
        'If 150 KB cannot be reached with your photos, you are told the smallest size the tool managed. Removing one photo, or retaking a dark one near a window, usually closes the gap faster than any setting.',
      ],
    },
    tip: {
      h2: 'Tip: one light for every page',
      paras: [
        'Shoot all the pages in the same place and light. The whole PDF shares one 150 KB budget, so one dark, noisy page forces all the others down in quality. Crop each photo to the paper, and choose A4 when the form says nothing about page size; it is what an officer expects to see.',
      ],
    },
    faq: [
      { q: 'Can I reorder pages after adding them?', a: 'Yes. Drag a row, use the up and down buttons, or focus a row and press Alt with the arrow keys.' },
      { q: 'I added a wrong photo. How do I remove it?', a: 'Each row has a remove button. The PDF is rebuilt when you tap Make PDF again.' },
      { q: 'Does it work without internet?', a: 'Yes, after the page has loaded once.' },
      { q: 'My form says “PDF only, maximum 150 KB”. Is this the right page?', a: 'Yes. The result is a PDF below 150 KB, and it passes whether the portal counts a kilobyte as 1000 or 1024 bytes.' },
      JPG_PRIVATE_FAQ,
    ],
    exams: ['csir-net'],
  },
  200: {
    title: 'JPG to PDF 200 KB: Make a 200 KB Photo-Size PDF, Free',
    description:
      'Make a 200 KB PDF from photos of your documents. Merge pages in order, choose A4 or original size, and keep the file under 200 KB. Nothing is uploaded.',
    h1: 'JPG to PDF under 200 KB',
    intro:
      'Turn JPG photos into one PDF of 200 KB or less. It is a good size for a few pages: big enough for sharp text, small enough for strict portals.',
    steps: [
      { name: 'Choose your JPGs', text: 'Add up to 20 photos or scans at once.' },
      { name: 'Check the order', text: 'The list order becomes the page order in the PDF.' },
      { name: 'Limit to 200 KB', text: 'Already set; the toggle turns the limit off if you ever need a full-quality PDF.' },
      { name: 'Make PDF', text: 'Then download the file named “documents-200kb.pdf”.' },
    ],
    uses: {
      h2: 'Where a 200 KB PDF is asked for',
      paras: [
        'JEE Main wants the Class 10 certificate or marksheet as a PDF of 50 to 300 KB. Building it from your photos at 200 KB gives sharp text with room to spare under the ceiling. Many recruitment portals also use 200 KB as the document limit; if your form says “photo size PDF 200 KB”, this is the page.',
      ],
    },
    pages: {
      h2: 'How many pages fit in 200 KB',
      paras: [
        'Up to four pages with clear text, or one to two at near-original sharpness. A single certificate photo rarely needs more than 150 KB, so it keeps most of its detail.',
        'Past five or six pages, each page has to be scaled down so far that small print starts to smear. If you have that many, ask whether the form really wants every page, or whether a larger limit is allowed.',
      ],
    },
    tip: {
      h2: 'Original size or A4?',
      paras: [
        'A4 fits each photo on a portrait or landscape A4 sheet with a white margin, matching the shape of most certificates when printed. Original makes each PDF page the size of its photo, at an assumed 150 DPI, which is handy for marksheets photographed at an angle and cropped tightly. Either way, crop away the background before you add the photo.',
      ],
    },
    faq: [
      { q: 'Can I mix landscape and portrait pages?', a: 'Yes. With A4, a landscape photo gets a landscape A4 page.' },
      { q: 'Can I make a PDF from just one photo?', a: 'Yes. One photo becomes a one-page PDF, and with 200 KB to spend it keeps nearly all of its detail.' },
      { q: 'Why does the PDF come out smaller than 200 KB?', a: 'Quality is lowered in steps, and the next step up would have crossed 200 KB. The text is still at the best quality that fits.' },
      JPG_PRIVATE_FAQ,
    ],
    exams: ['jee-main'],
  },
  300: {
    title: 'JPG to PDF 300 KB: Photo to PDF Under 300 KB, Free',
    description:
      'Convert JPG photos to one PDF under 300 KB, the NTA certificate limit for NEET, JEE Main and CUET. Reorder pages, pick A4, download. Never uploaded.',
    h1: 'JPG to PDF under 300 KB',
    intro:
      'Turn photos of a certificate into one PDF under 300 KB, the size NTA forms accept. Put the pages in order and download; your photos stay on your phone.',
    steps: [
      { name: 'Photograph each page', text: 'Front and back count as separate pages.' },
      { name: 'Order them', text: 'The first row becomes page 1.' },
      { name: 'A4 and 300 KB', text: 'Both are selected for you.' },
      { name: 'Make the PDF', text: 'Check the size tick, then upload it to the form.' },
    ],
    uses: {
      h2: 'NTA documents: one PDF of 50 to 300 KB',
      paras: [
        'NEET UG, JEE Main, CUET UG, UGC NET and CSIR NET take documents as a PDF of 50 to 300 KB, with all pages in one file. That covers NEET UG’s Class 10 certificate, category certificate, disability certificate and address proof, and JEE Main’s Class 10 certificate or marksheet. A photo to PDF under 300 KB is the usual job on these forms.',
        'This page sets only the maximum. If your PDF comes out under 50 KB, the exam kit for your exam pads it up to the minimum.',
      ],
    },
    pages: {
      h2: 'How many pages fit in 300 KB',
      paras: [
        'Four to six pages with sharp text, and up to eight plain ones. One or two pages, which is what most NTA certificates are, keep close to their original quality.',
      ],
    },
    tip: {
      h2: 'Getting the pages in order',
      paras: [
        'Officers read the PDF top to bottom, so follow the document: front before back, page 1 before page 2. If you photographed out of order, move the rows before making the PDF; the result goes stale and is rebuilt when you change anything. Choose A4 for certificates; it looks like the original sheet.',
      ],
    },
    faq: [
      { q: 'How do I make one PDF from many photos under 300 KB?', a: 'Add all the photos, put them in order and tap Make PDF. One PDF file is created.' },
      { q: 'Does the PDF keep my photos sharp?', a: 'At 300 KB for one or two pages, yes. Quality drops only as far as it must to fit.' },
      { q: 'Is a scanner better than a phone photo?', a: 'Not needed. A steady phone photo in daylight, cropped to the page, reads just as well at this size.' },
      { q: 'Can I add a PDF I already have?', a: 'Yes, its pages are added where you place it. Password-protected PDFs need the password removed first.' },
      JPG_PRIVATE_FAQ,
    ],
    exams: ['neet-ug', 'jee-main', 'cuet-ug', 'ugc-net', 'csir-net'],
  },
  400: {
    title: 'JPG to PDF Under 400 KB: Merge Certificate Photos, Free',
    description:
      'Merge photos of a certificate into one PDF under 400 KB, as railway forms ask for the SC/ST certificate. A4 or original size, built on your device.',
    h1: 'JPG to PDF under 400 KB',
    intro:
      'Merge several certificate photos into one PDF that stays under 400 KB. The pages are joined in your order and the file never leaves your device.',
    steps: [
      { name: 'Add every page', text: 'Railway forms want all pages of the certificate in a single file.' },
      { name: 'Arrange them', text: 'Move rows up or down until the order matches the paper.' },
      { name: 'Keep 400 KB', text: 'The PDF stays strictly below 400 KB.' },
      { name: 'Make and download', text: 'Then attach the PDF in the application.' },
    ],
    uses: {
      h2: 'RRB SC/ST certificate: one PDF under 400 KB',
      paras: [
        'RRB NTPC, RRB ALP and RRB Group D ask SC/ST candidates who want a free train travel pass for the exam to upload their SC/ST certificate as one PDF of less than 400 KB. The rules add that all pages must be in that one file, readable, with no edges cut off. It is optional and only for candidates claiming the pass.',
      ],
    },
    pages: {
      h2: 'How many pages fit in 400 KB',
      paras: [
        'Five to eight pages with clear text, and one to three at close to full quality. Caste certificates are usually one or two pages, so seals and signatures keep their detail.',
        'Each photo is first capped at 2000 pixels on its long side, which is already sharper than A4 needs. The tool then lowers JPEG quality step by step, and only scales the pages down further if quality alone cannot get the PDF under 400 KB.',
      ],
    },
    tip: {
      h2: 'Tip: show the whole page',
      paras: [
        'Because cut edges are a rejection reason, leave a thin strip of background around each page in the photo rather than cropping into the paper. Choose A4 so each page sits on a full sheet with margins. If your certificate is already a PDF and only too big, use the PDF compressor at 400 KB instead.',
        'If a photo looks sideways in your gallery, it will be sideways in the PDF too; rotate it in the gallery first so nobody has to turn the screen to read it.',
      ],
    },
    faq: [
      { q: 'Is a 399 KB file under 400 KB?', a: 'Yes. And this page keeps the file under 400,000 bytes, below the limit however the portal counts.' },
      { q: 'Can I add photos and a PDF together?', a: 'Yes. A PDF’s pages are inserted where you put it in the list.' },
      { q: 'The certificate is in Hindi and English. Does that matter?', a: 'No. The page is stored as a picture, so every script and stamp is kept exactly as photographed.' },
      JPG_PRIVATE_FAQ,
    ],
    exams: ['rrb-ntpc', 'rrb-alp', 'rrb-group-d'],
  },
  500: {
    title: 'JPG to PDF Under 500 KB: Multi-Page Certificates, Free',
    description:
      'Combine photos into an A4 PDF under 500 KB, like the IBPS PO Class 10 certificate upload. Reorder pages and download; your photos are never uploaded.',
    h1: 'JPG to PDF under 500 KB',
    intro:
      'Combine photos of a multi-page document into one A4 PDF under 500 KB. With this much room, text, seals and signatures come through sharp.',
    steps: [
      { name: 'Add the photos', text: 'Up to 20 pages, from the camera or gallery.' },
      { name: 'Put them in order', text: 'Use drag, buttons or Alt with the arrow keys.' },
      { name: 'Choose A4', text: 'It is the default and matches forms that ask for A4.' },
      { name: 'Make the PDF', text: 'The 500 KB limit is already set.' },
    ],
    uses: {
      h2: 'IBPS PO and other 500 KB uploads',
      paras: [
        'IBPS PO asks for the Class 10 certificate as a PDF on A4 pages of not more than 500 KB, all pages in one file. Making it from photos with A4 selected meets both parts of the rule at once. State forms that allow 500 KB per document, for example for a domicile certificate with its annexure, work the same way.',
      ],
    },
    pages: {
      h2: 'How many pages fit in 500 KB',
      paras: [
        'Six to ten pages with clear text, and three to four at near-original quality. A one-page certificate uses only part of the budget.',
        'With a single page, the PDF may come out far below 500 KB. That is expected: the tool starts at high JPEG quality and the photo simply does not need more. There is no need to make a file bigger to match a maximum.',
      ],
    },
    tip: {
      h2: 'Why A4 matters here',
      paras: [
        'When a notice asks for A4, choose A4: each photo is fitted onto a 210 × 297 mm page with margins, whatever shape the photo was. Original would make each page the size of your photo, which is not A4. Keep the photos straight and evenly lit, and put the certificate’s front page first.',
        'Before you upload, open the downloaded PDF once on your phone and swipe through every page. It takes ten seconds and catches the two most common mistakes: a page missing from the list, and a back side placed before the front.',
      ],
    },
    faq: [
      { q: 'Will the PDF really be A4?', a: 'Yes. With A4 selected every page is an A4 page; landscape photos get landscape A4.' },
      { q: 'What if I need 1 MB instead?', a: 'Tap the 1000 KB chip or type your own maximum.' },
      { q: 'How many photos can I add?', a: 'Up to 20 files. PDFs count as one file each, and all their pages are included.' },
      JPG_PRIVATE_FAQ,
    ],
    exams: ['ibps-po'],
  },
};

// ---------------------------------------------------------------------------
// Hindi: compress-pdf-to-200kb, compress-pdf-to-500kb, jpg-to-pdf-under-300kb
// ---------------------------------------------------------------------------

const COMPRESS_HI: Record<number, PageNotes> = {
  200: {
    title: 'PDF को 200 KB में कम करें — फ्री, कोई अपलोड नहीं',
    description:
      'स्कैन की हुई PDF को 200 KB से कम करें, एग्ज़ाम फॉर्म के लिए। पेज आपके फोन में ही दोबारा बनते हैं, फाइल कहीं अपलोड नहीं होती और साइज़ की जाँच भी होती है।',
    h1: 'PDF को 200 KB में कम करें',
    intro:
      'भारी स्कैन वाली PDF को 200 KB की PDF में बदलें, जिसे एग्ज़ाम पोर्टल ले लेते हैं। सारा काम आपके फोन या कंप्यूटर में होता है, कोई वॉटरमार्क नहीं।',
    steps: [
      { name: 'PDF चुनें', text: 'स्कैनर ऐप, ईमेल या डाउनलोड से कोई भी PDF, 25 MB तक।' },
      { name: '200 KB देखें', text: 'सीमा पहले से 200 KB है। नोटिस में कुछ और लिखा हो तभी बदलें।' },
      { name: 'कम्प्रेस करें', text: 'पेज 150, 100 या 72 DPI में से सबसे साफ़ सेटिंग पर बनते हैं जो 200 KB में आ जाए।' },
      { name: 'डाउनलोड करें', text: 'साइज़ वाली लाइन पर टिक दिखे, तब फाइल सेव करें।' },
    ],
    uses: {
      h2: '200 KB की PDF कहाँ चाहिए',
      paras: [
        'JEE Main में 10वीं का सर्टिफिकेट या मार्कशीट 50 से 300 KB की PDF में माँगी जाती है। पूरे 300 के बजाय 200 KB रखने से फाइल साफ़ भी रहती है और सीमा से काफ़ी नीचे भी। कई राज्य भर्ती फॉर्म और प्राइवेट नौकरियों के पोर्टल भी डॉक्यूमेंट के लिए 200 KB की सीमा रखते हैं।',
      ],
    },
    pages: {
      h2: '200 KB में कितने पेज आते हैं',
      paras: [
        'तीन से छह स्कैन पेज, या एक-दो पेज पूरी साफ़ क्वालिटी में। 150 DPI पर एक स्कैन पेज लगभग 100 से 200 KB का होता है, इसलिए एक सर्टिफिकेट अक्सर सबसे अच्छी क्वालिटी में ही रह जाता है। ज़्यादा पेज हों तो टूल 100 DPI (हर पेज लगभग 40–100 KB) और फिर 72 DPI (लगभग 20–50 KB) पर जाता है।',
        'दस पेज का स्कैन पढ़ने लायक रहते हुए 200 KB में नहीं आएगा। ऐसे में सिर्फ़ वही पेज रखें जो फॉर्म माँगता है।',
      ],
    },
    tip: {
      h2: 'स्कैन वाली PDF और टेक्स्ट वाली PDF',
      paras: [
        'फोन ऐप से बनी स्कैन PDF बहुत छोटी हो जाती है: 3 MB की तीन पेज वाली फाइल आम तौर पर 200 KB से थोड़ा नीचे आ जाती है। सरकारी वेबसाइट से डाउनलोड की हुई ई-सर्टिफिकेट जैसी टेक्स्ट PDF अक्सर पहले से छोटी होती है; टूल पहले साइज़ देखता है और बता देता है कि उसे वैसे ही अपलोड करें। ध्यान रखें, कम्प्रेस करने पर टेक्स्ट तस्वीर बन जाता है और उसे सिलेक्ट नहीं किया जा सकता।',
      ],
    },
    faq: [
      { q: 'क्या 200 KB और 0.2 MB एक ही हैं?', a: 'फॉर्म के लिए हाँ। हमारी फाइल 2,00,000 bytes से कम रहती है, इसलिए 0.2 MB की सीमा भी पास होती है।' },
      { q: 'मेरी PDF 150 KB की ही क्यों बनी?', a: 'टूल वह सबसे अच्छी क्वालिटी चुनता है जो सीमा में आए। अगला कदम 200 KB पार कर जाता, इसलिए वह एक कदम नीचे रुका।' },
      { q: 'क्या मेरी PDF कहीं अपलोड होती है?', a: 'नहीं। PDF आपके ब्राउज़र में ही खुलती और बनती है, फोन से बाहर नहीं जाती।' },
    ],
    exams: ['jee-main'],
  },
  500: {
    title: 'PDF को 500 KB से कम करें — फ्री, फोन में ही',
    description:
      'बड़ी स्कैन PDF को 500 KB से कम करें, जैसे IBPS PO में 10वीं का सर्टिफिकेट A4 PDF में 500 KB तक माँगा जाता है। फ्री, कोई अपलोड नहीं।',
    h1: 'PDF को 500 KB में कम करें',
    intro:
      'कुछ MB की स्कैन PDF से 500 KB की PDF बनाएँ। पेज आपके फोन में ही दोबारा बनते हैं, और इस साइज़ में छपे अक्षर और मोहर साफ़ रहते हैं।',
    steps: [
      { name: 'बड़ी PDF चुनें', text: 'कई MB वाले स्कैन के लिए ही यह पेज है।' },
      { name: '500 KB रहने दें', text: 'पहले से चुना है। फॉर्म 1 MB तक लेता हो तो 1000 KB भी है।' },
      { name: 'कम्प्रेस करें', text: 'इतनी जगह में ज़्यादातर डॉक्यूमेंट 150 DPI पर ही रह जाते हैं।' },
      { name: 'डाउनलोड करें', text: 'नई फाइल के नाम के आखिर में "-500kb" जुड़ जाता है।' },
    ],
    uses: {
      h2: '500 KB से कम की PDF कौन माँगता है',
      paras: [
        'IBPS PO में 10वीं का सर्टिफिकेट A4 पेज वाली PDF में माँगा जाता है, 500 KB से ज़्यादा नहीं, और सारे पेज एक ही फाइल में। कई राज्य भर्ती और यूनिवर्सिटी पोर्टल भी हर डॉक्यूमेंट के लिए 500 KB देते हैं, जो पूरी मार्कशीट या साथ में जुड़े पेज वाले निवास प्रमाण पत्र के लिए काफ़ी है।',
      ],
    },
    pages: {
      h2: '500 KB में कितने पेज आते हैं',
      paras: [
        '150 DPI पर तीन से पाँच पेज, और कम सेटिंग पर आठ से पंद्रह पेज। एक-दो पेज का 10वीं का सर्टिफिकेट इस सीमा का थोड़ा ही हिस्सा लेता है, इसलिए क्वालिटी बहुत अच्छी रहती है।',
        'अगर PDF पहले से 500 KB से कम है, तो कुछ नहीं बदला जाता। टूल बता देता है कि फाइल पहले से छोटी है, उसे वैसे ही अपलोड करें।',
      ],
    },
    tip: {
      h2: 'A4 वाला नियम',
      paras: [
        'कम्प्रेस करने पर हर पेज का अपना साइज़ वही रहता है। अगर स्कैनर ऐप ने सर्टिफिकेट किसी और साइज़ में सेव किया है, या आपके पास सिर्फ़ फोटो हैं, तो JPG से PDF वाले टूल में A4 चुनकर PDF बनाएँ; वह हर फोटो को किनारों के साथ A4 पेज पर रखता है। टाइप की हुई PDF को 500 KB पर कम्प्रेस करने की ज़रूरत कम ही पड़ती है, और ज़बरदस्ती करने पर उसका टेक्स्ट तस्वीर बन जाता है।',
      ],
    },
    faq: [
      { q: 'क्या 500 KB और 0.5 MB एक ही हैं?', a: 'फॉर्म के लिए हाँ। फाइल 5,00,000 bytes से कम रहती है, इसलिए 0.5 MB की सीमा भी पास होती है।' },
      { q: 'क्या सर्टिफिकेट खराब दिखेगा?', a: 'मुश्किल से फ़र्क दिखेगा। एक-दो पेज के लिए 500 KB काफ़ी जगह है।' },
      { q: 'क्या मेरी PDF अपलोड होती है?', a: 'नहीं। सब कुछ आपके डिवाइस पर होता है, और पहली बार के बाद पेज ऑफ़लाइन भी चलता है।' },
    ],
    exams: ['ibps-po'],
  },
};

const JPG_HI: Record<number, PageNotes> = {
  300: {
    title: 'JPG से PDF 300 KB में बनाएँ — फ्री, कोई अपलोड नहीं',
    description:
      'सर्टिफिकेट की फोटो से 300 KB से कम की एक PDF बनाएँ, जैसी NEET, JEE Main और CUET के फॉर्म माँगते हैं। पेज का क्रम बदलें, A4 चुनें, डाउनलोड करें।',
    h1: 'JPG से PDF 300 KB से कम',
    intro:
      'सर्टिफिकेट की फोटो को 300 KB से कम की एक PDF में बदलें, जिसे NTA के फॉर्म लेते हैं। पेज सही क्रम में लगाएँ और डाउनलोड करें; फोटो आपके फोन में ही रहती हैं।',
    steps: [
      { name: 'हर पेज की फोटो लें', text: 'आगे और पीछे का हिस्सा अलग-अलग पेज गिने जाते हैं।' },
      { name: 'क्रम ठीक करें', text: 'सबसे ऊपर वाली फोटो PDF का पहला पेज बनती है।' },
      { name: 'A4 और 300 KB', text: 'दोनों पहले से चुने हुए हैं।' },
      { name: 'PDF बनाएँ', text: 'साइज़ पर टिक देखें, फिर फॉर्म में अपलोड करें।' },
    ],
    uses: {
      h2: 'NTA के डॉक्यूमेंट: 50 से 300 KB की एक PDF',
      paras: [
        'NEET UG, JEE Main, CUET UG, UGC NET और CSIR NET डॉक्यूमेंट 50 से 300 KB की PDF में लेते हैं, सारे पेज एक ही फाइल में। NEET UG में 10वीं का सर्टिफिकेट, कैटेगरी सर्टिफिकेट, दिव्यांगता सर्टिफिकेट और पते का प्रमाण, और JEE Main में 10वीं का सर्टिफिकेट या मार्कशीट इसी नियम से जाते हैं।',
        'यह पेज सिर्फ़ अधिकतम सीमा रखता है। अगर PDF 50 KB से छोटी बने, तो अपनी परीक्षा का किट इस्तेमाल करें, वह उसे न्यूनतम तक बढ़ा देता है।',
      ],
    },
    pages: {
      h2: '300 KB में कितने पेज आते हैं',
      paras: [
        'साफ़ अक्षरों के साथ चार से छह पेज, और सादे पेज हों तो आठ तक। NTA के ज़्यादातर सर्टिफिकेट एक-दो पेज के होते हैं, जो लगभग असली क्वालिटी में रहते हैं।',
        'अगर सारी फोटो 300 KB में नहीं आ पातीं, तो टूल हर पेज को थोड़ा-थोड़ा छोटा करता है। फिर भी न बने, तो वह बता देता है कि फाइल कितनी छोटी हो पाई; तब कोई फालतू पेज हटाएँ या अंधेरी फोटो दोबारा खींचें।',
      ],
    },
    tip: {
      h2: 'पेज का क्रम और A4',
      paras: [
        'PDF ऊपर से नीचे पढ़ी जाती है, इसलिए डॉक्यूमेंट के हिसाब से लगाएँ: पहले आगे का हिस्सा, फिर पीछे का; पहले पेज 1, फिर पेज 2। फोटो उल्टे क्रम में खींची हों तो PDF बनाने से पहले लाइनें ऊपर-नीचे करें। सर्टिफिकेट के लिए A4 चुनें, वह असली कागज़ जैसा दिखता है; असली साइज़ वाला विकल्प कार्ड या रसीद के लिए बेहतर है।',
      ],
    },
    faq: [
      { q: 'कई फोटो से 300 KB की एक PDF कैसे बनाएँ?', a: 'सारी फोटो जोड़ें, क्रम ठीक करें और "PDF बनाएँ" दबाएँ। एक ही PDF फाइल बनती है।' },
      { q: 'फोटो खींचने का सही तरीका क्या है?', a: 'कागज़ को समतल जगह पर रखें, दिन की रोशनी में ठीक ऊपर से फोटो लें और फ्लैश बंद रखें। चारों किनारे दिखने चाहिए।' },
      { q: 'क्या पहले से बनी PDF भी जोड़ सकते हैं?', a: 'हाँ, उसके पेज वहीं जुड़ते हैं जहाँ आप उसे लगाते हैं। पासवर्ड वाली PDF का पासवर्ड पहले हटाएँ।' },
      { q: 'क्या मेरी फोटो अपलोड होती हैं?', a: 'नहीं। PDF आपके ब्राउज़र में ही बनती है, सर्टिफिकेट फोन से बाहर नहीं जाते।' },
    ],
    exams: ['neet-ug', 'jee-main', 'cuet-ug', 'ugc-net', 'csir-net'],
  },
};

// ---------------------------------------------------------------------------
// Builders
// ---------------------------------------------------------------------------

/** Exam page links for the "uses" section. Throws at build time on an unpublished slug. */
function examLinks(slugs: string[], lang: Lang): { href: string; label: string }[] {
  const pub = getPublishedPresets();
  return slugs.map((s) => {
    const p = pub.find((x) => x.slug === s);
    if (!p) throw new Error(`pdf-kb copy links to unpublished exam ${s}`);
    if (!getKitDocuments(p).some((d) => d.format === 'pdf' && !d.toVerify))
      throw new Error(`pdf-kb copy links to ${s}, which has no verified PDF document`);
    return { href: lang === 'hi' && hasHindiExam(s) ? `/hi/exam/${s}` : `/exam/${s}`, label: p.name[lang] };
  });
}

function sizeLinks(sizes: readonly number[], path: (n: number) => string, n: number, lang: Lang) {
  return sizes
    .filter((k) => k !== n)
    .map((k) => {
      const en = path(k);
      return { href: (lang === 'hi' && hindiToolPath(en)) || en, label: `${k} KB` };
    });
}

/** The JPG to PDF page for the same limit, or the next smaller one (250 -> 200). */
function jpgTwin(n: number): number {
  return [...JPG_PDF_KB_TARGETS].reverse().find((k) => k <= n) ?? JPG_PDF_KB_TARGETS[0];
}

function build(notes: PageNotes, lang: Lang, more: ToolSection): ToolCopy {
  return {
    title: notes.title,
    description: notes.description,
    h1: notes.h1,
    intro: notes.intro,
    steps: notes.steps,
    faq: notes.faq,
    sections: [
      { ...notes.uses, links: examLinks(notes.exams, lang) },
      notes.pages,
      notes.tip,
      more,
    ],
  };
}

export function compressPdfKbCopy(n: number, lang: Lang = 'en'): ToolCopy {
  const notes = (lang === 'hi' ? COMPRESS_HI : COMPRESS_EN)[n];
  if (!notes) throw new Error(`No ${lang} copy for /tools/compress-pdf-to-${n}kb`);
  const more: ToolSection =
    lang === 'hi'
      ? {
          h2: 'दूसरे साइज़ और टूल',
          paras: ['फॉर्म की सीमा अलग है तो वह साइज़ खोलें। फोटो से PDF बनानी हो तो JPG से PDF वाला टूल बेहतर है।'],
          links: [
            ...sizeLinks(PDF_KB_TARGETS, compressPdfToKbPath, n, 'hi'),
            { href: hindiToolPath(jpgToPdfUnderKbPath(300)) ?? jpgToPdfUnderKbPath(300), label: 'JPG से PDF (300 KB)' },
          ],
        }
      : {
          h2: 'Other PDF sizes',
          paras: [
            'Your form has a different limit? Open that size, or the PDF resize hub to type any number. Starting from photos instead of a PDF? Making the PDF from the photos gives sharper pages.',
          ],
          links: [
            { href: '/tools/compress-pdf', label: 'Any KB' },
            ...sizeLinks(PDF_KB_TARGETS, compressPdfToKbPath, n, 'en'),
            { href: jpgToPdfUnderKbPath(jpgTwin(n)), label: `JPG to PDF under ${jpgTwin(n)} KB` },
          ],
        };
  return build(notes, lang, more);
}

export function jpgToPdfKbCopy(n: number, lang: Lang = 'en'): ToolCopy {
  const notes = (lang === 'hi' ? JPG_HI : JPG_EN)[n];
  if (!notes) throw new Error(`No ${lang} copy for /tools/jpg-to-pdf-under-${n}kb`);
  const more: ToolSection =
    lang === 'hi'
      ? {
          h2: 'PDF पहले से है?',
          paras: ['अगर आपके पास पहले से बड़ी PDF है, तो उसे सीधे कम्प्रेस करें।'],
          links: [
            { href: hindiToolPath(compressPdfToKbPath(200)) ?? compressPdfToKbPath(200), label: 'PDF 200 KB' },
            { href: hindiToolPath(compressPdfToKbPath(500)) ?? compressPdfToKbPath(500), label: 'PDF 500 KB' },
            { href: hindiToolPath('/tools/images-to-pdf') ?? '/tools/images-to-pdf', label: 'फोटो से PDF' },
          ],
        }
      : {
          h2: 'Other limits',
          paras: ['Pick the size your form names, or open the JPG to PDF hub to type any maximum. Already have a PDF that is too big? Compress it instead.'],
          links: [
            { href: '/tools/images-to-pdf', label: 'Any KB' },
            ...sizeLinks(JPG_PDF_KB_TARGETS, jpgToPdfUnderKbPath, n, 'en'),
            { href: compressPdfToKbPath(n), label: `Compress PDF to ${n} KB` },
          ],
        };
  return build(notes, lang, more);
}
