/** Copy for T6 images to PDF (EN + provisional HI) and T7 compress PDF (EN). */
import type { Lang } from '@/config/site';
import { JPG_PDF_KB_TARGETS, PDF_KB_TARGETS, compressPdfToKbPath, jpgToPdfUnderKbPath } from '@/config/tools';
import type { ToolCopy } from './types';

export function imagesToPdfCopy(lang: Lang = 'en'): ToolCopy {
  if (lang === 'hi') {
    return {
      title: 'फोटो से PDF बनाएँ — 20 फोटो तक, 300 KB से कम, फ्री',
      description: 'सर्टिफिकेट और मार्कशीट की फोटो को एक PDF में जोड़ें, क्रम बदलें, A4 या असली साइज़ चुनें और PDF को 300 KB या किसी भी KB से कम रखें। कुछ अपलोड नहीं होता।',
      h1: 'फोटो से PDF बनाएँ (KB सीमा के साथ)',
      intro: 'सर्टिफिकेट के सारे पेज एक PDF में, फॉर्म की KB सीमा के अंदर। फोटो आपके फोन में ही रहती हैं।',
      steps: [
        { name: 'पेज जोड़ें', text: 'हर पेज की फोटो खींचें या गैलरी से चुनें। 20 फाइलें तक, PDF भी जोड़ सकते हैं।' },
        { name: 'क्रम ठीक करें', text: 'ऊपर-नीचे वाले बटन से या खींचकर पेजों का क्रम बदलें।' },
        { name: 'पेज और KB चुनें', text: 'A4 या असली साइज़ चुनें, और अधिकतम KB, जैसे 300 KB।' },
        { name: 'PDF बनाएँ', text: 'PDF बनाएँ दबाएँ, पास चेक देखें और डाउनलोड करें।' },
      ],
      faq: [
        { q: 'कई फोटो को एक PDF में कैसे बनाएँ?', a: 'ऊपर सारे पेज चुनें, सही क्रम में लगाएँ और "PDF बनाएँ" दबाएँ। एक ही PDF फाइल बनती है।' },
        { q: 'PDF 300 KB से कम कैसे होगा?', a: 'अधिकतम KB में 300 चुनें। अगर PDF बड़ा बने तो फोटो की क्वालिटी और साइज़ धीरे-धीरे कम करके उसे सीमा के अंदर लाया जाता है।' },
        { q: 'A4 और असली साइज़ में क्या फ़र्क है?', a: 'A4 में हर फोटो A4 पेज पर किनारों के साथ बैठती है, प्रिंट के लिए अच्छा। असली साइज़ में पेज का आकार फोटो जितना होता है।' },
        { q: 'क्या मेरे सर्टिफिकेट अपलोड होते हैं?', a: 'नहीं। PDF आपके फोन में ही बनता है।' },
      ],
      sections: [
        {
          h2: 'साफ़ स्कैन के लिए सुझाव',
          paras: [
            'हर पेज को सपाट रखकर ऊपर से, दिन की रोशनी में फोटो लें। फ्लैश से चमक आ सकती है। पेज के किनारे दिखें और बैकग्राउंड न दिखे। NTA फॉर्म (NEET, JEE, CUET) में सर्टिफिकेट 50–300 KB के PDF में चाहिए, और IBPS 10वीं का सर्टिफिकेट 500 KB तक लेता है।',
          ],
          links: [
            { href: '/hi/tools/jpg-to-pdf-under-300kb', label: 'JPG से PDF 300 KB' },
            { href: '/hi/tools/compress-pdf-to-200kb', label: 'PDF 200 KB' },
            { href: '/hi/tools/compress-pdf-to-500kb', label: 'PDF 500 KB' },
          ],
        },
      ],
    };
  }
  return {
    title: 'JPG to PDF Under Any KB: Combine Certificates, Free',
    description:
      'Convert JPG photos to one PDF under 100, 200, 300 or 500 KB, or any limit. Reorder pages, choose A4 or original size. Built on your device, never uploaded.',
    h1: 'JPG to PDF under any KB',
    intro: 'Turn JPG photos of a certificate or mark sheet into one PDF under the KB limit your form sets. Pick a size below or type your own; the photos never leave your phone.',
    steps: [
      { name: 'Add the pages', text: 'Photograph each page or choose them from your gallery: up to 20 files. You can add PDFs too; their pages are included.' },
      { name: 'Put them in order', text: 'Drag the rows, use the up and down buttons, or focus a row and press Alt + arrow keys.' },
      { name: 'Choose page size and limit', text: 'A4 fits each image on an A4 page with margins; Original keeps each image’s own size. Set the maximum KB from your form.' },
      { name: 'Make the PDF', text: 'Tap Make PDF, check that the size row has a tick, then download.' },
    ],
    faq: [
      { q: 'How do I convert JPG to PDF under a KB limit?', a: 'Add every page, set the maximum from your form and tap Make PDF. If the first try is too big, image quality and size are lowered step by step until the PDF fits. If it cannot fit, you are told how small it got.' },
      { q: 'Should I choose A4 or original size?', a: 'A4 is best when the document may be printed or the portal shows it as a page. Original is best for receipts or ID cards, so there is no white border.' },
      { q: 'Can I add a PDF together with photos?', a: 'Yes. Each page of the PDF is turned into an image and added in place. Password-protected PDFs cannot be opened; remove the password first.' },
      { q: 'Why is the text a little softer than my original?', a: 'To reach a small KB limit, pages are saved as compressed images. At 300 KB for a few pages, printed text stays clearly readable.' },
      { q: 'Is there a minimum size?', a: 'This tool sets only a maximum. If your form also has a minimum, like the 50 KB floor on NTA uploads, make the PDF in that exam’s kit, which pads it up.' },
      { q: 'Are my documents uploaded?', a: 'No. The PDF is built in your browser and never sent to any server.' },
    ],
    sections: [
      {
        h2: 'JPG to PDF under a fixed KB size',
        paras: [
          'Each size page covers the documents that use that limit, how many photographed pages fit, and the page-order and A4 choices that matter. NTA forms (NEET UG, JEE Main, CUET UG, UGC NET, CSIR NET) want certificates as PDFs of 50–300 KB. IBPS PO accepts the Class 10 certificate as an A4 PDF of up to 500 KB, and RRB forms take the SC/ST certificate for the free travel pass as a PDF under 400 KB.',
        ],
        links: JPG_PDF_KB_TARGETS.map((n) => ({ href: jpgToPdfUnderKbPath(n), label: `Under ${n} KB` })),
      },
      {
        h2: 'Tips for a clean scan',
        paras: [
          'Lay each page flat and photograph it from directly above in daylight, without flash. Fill the frame with the page so little background shows. Straight, evenly lit pages compress far better than tilted ones with shadows, so they stay readable at small sizes.',
        ],
        links: [
          { href: '/tools/compress-pdf', label: 'PDF resize in KB' },
          { href: '/tools/batch-compress', label: 'Batch compress' },
        ],
      },
    ],
  };
}

export function compressPdfCopy(): ToolCopy {
  return {
    title: 'PDF Resize in KB: Compress a PDF to Any Size, Free',
    description:
      'PDF resize in KB for exam and job forms: compress a scanned PDF from MB to 100, 200, 300 or 500 KB, or any size. Runs on your device; nothing is uploaded.',
    h1: 'PDF resize in KB',
    intro:
      'Resize a PDF in KB to whatever your form allows. Pick a size or type your own, and a big scanned PDF is redrawn on your device until it fits. If it is already under the limit, we tell you and leave it alone.',
    steps: [
      { name: 'Choose the PDF', text: 'Pick the PDF from your phone or computer, up to 25 MB.' },
      { name: 'Set the limit', text: 'Tap 100, 200, 300, 500 or 1000 KB, or choose Custom and type the number from your form.' },
      { name: 'Compress', text: 'Pages are redrawn at 150 DPI, then 100 and 72 DPI if needed, until the file fits.' },
      { name: 'Download', text: 'Check the size tick and download the smaller PDF.' },
    ],
    faq: [
      { q: 'How do I convert a PDF from MB to KB?', a: 'There is nothing to convert: MB and KB are just units (1 MB is 1024 KB). What you need is a smaller file. Choose the PDF, set the KB limit from your form and press Compress; a 3 MB scan typically comes down to a few hundred KB.' },
      { q: 'Can I increase a PDF size in KB?', a: 'Not with this tool; it only makes PDFs smaller. If a form has a minimum, such as the 50 KB floor on NTA certificate uploads, make the PDF in that exam’s kit, which pads a small PDF up to the minimum without changing the pages.' },
      { q: 'Why does it say my PDF is already small?', a: 'If the file is already under your limit, compressing would only lower the quality. Upload the original as it is.' },
      { q: 'Will I still be able to select the text?', a: 'No. Each page is saved as an image, so the text cannot be selected or searched afterwards. It still looks the same and prints clearly. Keep your original PDF if you need the text.' },
      { q: 'What if it cannot get small enough?', a: 'You will see how small it got. Remove pages you do not need, or split the document, and try again. Very long PDFs may not fit under 100 KB.' },
      { q: 'Is my PDF uploaded?', a: 'No. It is opened and rewritten in your browser, on your device. Password-protected PDFs cannot be opened; remove the password first.' },
    ],
    sections: [
      {
        h2: 'Resize a PDF to an exact KB size',
        paras: [
          'Each size page explains which forms use that limit, how many scanned pages realistically fit, and what to watch for. NTA forms (NEET UG, JEE Main, CUET UG) take certificates as PDFs of 50–300 KB, the railway forms take the SC/ST certificate under 400 KB, and IBPS PO wants the Class 10 certificate as an A4 PDF of up to 500 KB.',
        ],
        links: PDF_KB_TARGETS.map((n) => ({ href: compressPdfToKbPath(n), label: `${n} KB PDF` })),
      },
      {
        h2: 'How the compression works',
        paras: [
          'Most large PDFs from phone scanner apps are big because each page is a high-resolution photo. We draw every page again at 150 DPI and save it as a JPEG page, which is usually enough to get under a few hundred KB while text stays readable. If the file is still too big, we try 100 DPI and then 72 DPI, and stop at the first one that fits.',
          'Because pages become images, text and links in the PDF stop being selectable. For exam forms this does not matter: portals only check that the document opens and is readable. A PDF that is mostly typed text is detected before anything is redrawn, and you are asked whether to compress it anyway.',
        ],
      },
      {
        h2: 'Making a PDF from photos instead',
        paras: ['If you have photos of the pages rather than a PDF, combine them directly with a KB limit; the result is usually sharper than photo, then PDF, then compress.'],
        links: [{ href: '/tools/images-to-pdf', label: 'JPG to PDF' }],
      },
    ],
  };
}
