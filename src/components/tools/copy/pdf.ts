/** Copy for T6 images to PDF (EN + provisional HI) and T7 compress PDF (EN). */
import type { Lang } from '@/config/site';
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
        },
      ],
    };
  }
  return {
    title: 'Images to PDF Under 300 KB: Combine Certificates, Reorder, Free',
    description:
      'Combine up to 20 photos or scans of certificates into one PDF, reorder pages, choose A4 or original size and keep it under 300 KB or any KB limit. Never uploaded.',
    h1: 'Images to PDF (with a KB limit)',
    intro: 'Put every page of a certificate or mark sheet into one PDF that fits your form’s KB limit. The photos never leave your phone.',
    steps: [
      { name: 'Add the pages', text: 'Photograph each page or choose them from your gallery: up to 20 files. You can add PDFs too; their pages are included.' },
      { name: 'Put them in order', text: 'Drag the rows, use the up and down buttons, or focus a row and press Alt + arrow keys.' },
      { name: 'Choose page size and limit', text: 'A4 fits each image on an A4 page with margins; Original keeps each image’s own size. Set the maximum KB from your form.' },
      { name: 'Make the PDF', text: 'Tap Make PDF, check that the size row has a tick, then download.' },
    ],
    faq: [
      { q: 'How do I combine certificates into one PDF under 300 KB?', a: 'Add every page, set the maximum to 300 KB and tap Make PDF. If the first try is too big, image quality and size are lowered step by step until the PDF fits. If it cannot fit, you are told how small it got.' },
      { q: 'Should I choose A4 or original size?', a: 'A4 is best when the document may be printed or the portal shows it as a page. Original is best for receipts or ID cards, so there is no white border.' },
      { q: 'Can I add a PDF together with photos?', a: 'Yes. Each page of the PDF is turned into an image and added in place. Password-protected PDFs cannot be opened; remove the password first.' },
      { q: 'Why is the text a little softer than my original?', a: 'To reach a small KB limit, pages are saved as compressed images. At 300 KB for a few pages, printed text stays clearly readable.' },
      { q: 'Are my documents uploaded?', a: 'No. The PDF is built in your browser and never sent to any server.' },
    ],
    sections: [
      {
        h2: 'Common PDF limits on exam forms',
        paras: [
          'NTA forms (NEET UG, JEE Main, CUET UG, UGC NET, CSIR NET) want certificates as PDFs of 50–300 KB. IBPS PO accepts the 10th certificate as a PDF of up to 500 KB, and RRB forms cap documents at about 400 KB. UPSC forms also ask for a photo ID; check its size in the notice. If your PDF is a little over, this tool brings it under without retaking the photos.',
        ],
      },
      {
        h2: 'Tips for a clean scan',
        paras: [
          'Lay each page flat and photograph it from directly above in daylight, without flash. Fill the frame with the page so little background shows. Straight, evenly lit pages compress far better than tilted ones with shadows, so they stay readable at small sizes.',
        ],
        links: [
          { href: '/tools/compress-pdf', label: 'Compress PDF' },
          { href: '/tools/batch-compress', label: 'Batch compress' },
        ],
      },
    ],
  };
}

export function compressPdfCopy(): ToolCopy {
  return {
    title: 'Compress PDF to 100, 200, 300 or 500 KB Online Free — No Upload',
    description:
      'Reduce a scanned PDF to under 100, 200, 300 or 500 KB, or any size, for exam and job forms. Pages are re-rendered on your device; nothing is uploaded.',
    h1: 'Compress PDF to under X KB',
    intro: 'Make a big scanned PDF small enough for your form. If it is already under the limit, we tell you and leave it alone.',
    steps: [
      { name: 'Choose the PDF', text: 'Pick the PDF from your phone or computer, up to 25 MB.' },
      { name: 'Set the limit', text: 'Choose 100, 200, 300, 500 or 1000 KB, or type the limit from your form.' },
      { name: 'Compress', text: 'Pages are redrawn at 150 DPI, then 100 and 72 DPI if needed, until the file fits.' },
      { name: 'Download', text: 'Check the size tick and download the smaller PDF.' },
    ],
    faq: [
      { q: 'Why does it say my PDF is already small?', a: 'If the file is already under your limit, compressing would only lower the quality. Upload the original as it is.' },
      { q: 'Will I still be able to select the text?', a: 'No. Each page is saved as an image, so the text cannot be selected or searched afterwards. It still looks the same and prints clearly. Keep your original PDF if you need the text.' },
      { q: 'What if it cannot get small enough?', a: 'You will see how small it got. Remove pages you do not need, or split the document, and try again. Very long PDFs may not fit under 100 KB.' },
      { q: 'Does it work with password-protected PDFs?', a: 'No. Remove the password first (open it and save a copy without one), then compress.' },
      { q: 'Is my PDF uploaded?', a: 'No. It is opened and rewritten in your browser, on your device.' },
    ],
    sections: [
      {
        h2: 'How the compression works',
        paras: [
          'Most large PDFs from phone scanner apps are big because each page is a high-resolution photo. We draw every page again at 150 DPI and save it as a JPEG page, which is usually enough to get under a few hundred KB while text stays readable. If the file is still too big, we try 100 DPI and then 72 DPI, and stop at the first one that fits.',
          'Because pages become images, text and links in the PDF stop being selectable. For exam forms this does not matter: portals only check that the document opens and is readable.',
        ],
      },
      {
        h2: 'Making a PDF from photos instead',
        paras: ['If you have photos of the pages rather than a PDF, combine them directly with a KB limit; the result is usually sharper.'],
        links: [{ href: '/tools/images-to-pdf', label: 'Images to PDF' }],
      },
    ],
  };
}
