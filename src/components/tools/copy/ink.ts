/** Copy for T4 signature (EN + provisional HI), T5 thumb and the declaration tool (EN). */
import type { Lang } from '@/config/site';
import type { ToolCopy } from './types';

export function signatureCopy(lang: Lang = 'en'): ToolCopy {
  if (lang === 'hi') {
    return {
      title: 'सिग्नेचर रीसाइज़ करें — 140×60, 10–20 KB, सफेद बैकग्राउंड, फ्री',
      description: 'सिग्नेचर की फोटो को क्रॉप करें, कागज़ सफेद और स्याही गहरी करें, और 140×60 px, 10–20 KB या किसी भी साइज़ में बनाएँ। कुछ भी अपलोड नहीं होता।',
      h1: 'सिग्नेचर रीसाइज़ और साफ़ करें',
      intro: 'सफेद कागज़ पर काले पेन से साइन करें, फोटो लें, और सही पिक्सल व KB में तैयार सिग्नेचर डाउनलोड करें।',
      steps: [
        { name: 'साइन की फोटो लें', text: 'सफेद कागज़ पर काले या नीले पेन से साइन करें और ऊपर से, अच्छी रोशनी में फोटो लें।' },
        { name: 'साइज़ चुनें', text: 'अपनी परीक्षा का नियम चुनें, जैसे IBPS के लिए 140×60 px, 10–20 KB, या अपना साइज़ डालें।' },
        { name: 'क्रॉप करें', text: 'स्याही पीले डैश वाले बॉक्स का कम से कम 80% भरे, इस तरह फ्रेम सेट करें।' },
        { name: 'ऑटो-फिट और डाउनलोड', text: 'ऑटो-फिट दबाएँ। पास चेक पर सब टिक हों, तब sign.jpg डाउनलोड करें।' },
      ],
      faq: [
        { q: 'सिग्नेचर 10–20 KB में कैसे करें?', a: 'ऊपर "140×60 px, 10–20 KB" चुनें, फोटो जोड़ें और ऑटो-फिट दबाएँ। फाइल अपने आप 10 से 20 KB के बीच आती है।' },
        { q: 'कागज़ धूसर या छाया वाला दिख रहा है, क्या करें?', a: '"सिग्नेचर साफ़ करें" चालू रखें। यह छाया हटाकर कागज़ को पूरा सफेद और स्याही को गहरा कर देता है। स्याही हल्की हो तो सफ़ाई की ताकत बढ़ाएँ।' },
        { q: 'SSC का सिग्नेचर साइज़ क्या है?', a: 'SSC के फॉर्म में सिग्नेचर 6.0×2.0 cm (200 DPI पर लगभग 472×157 px) और 10–20 KB का होता है। यह विकल्प ऊपर की सूची में है।' },
        { q: 'क्या मेरा सिग्नेचर कहीं भेजा जाता है?', a: 'नहीं। सारा काम आपके फोन के ब्राउज़र में होता है।' },
      ],
      sections: [
        {
          h2: 'सिग्नेचर क्यों रिजेक्ट होता है',
          paras: [
            'सबसे आम कारण: फाइल 20 KB से बड़ी, स्याही बहुत पतली या हल्की, कागज़ पर छाया, या साइन बॉक्स के बीच बहुत छोटा। यह टूल छाया हटाता है, स्याही के आसपास क्रॉप करता है ताकि साइन बॉक्स को भरे, और फिर ठीक पिक्सल और KB में फाइल बनाता है।',
            'कैपिटल अक्षरों में लिखा नाम सिग्नेचर नहीं माना जाता। वही साइन करें जो आप परीक्षा केंद्र पर करेंगे।',
          ],
        },
      ],
    };
  }
  return {
    title: 'Signature Resize Online: 10–20 KB, 140×60 px, 6×2 cm',
    description:
      'Signature resize in KB: crop, whiten the paper and fit your sign to 10–20 KB, 140 × 60 px or SSC 6 × 2 cm (472 × 157 px). Free and never uploaded.',
    h1: 'Signature resize: KB, pixels and cm',
    intro:
      'Signature resize in one step: sign on white paper, take a photo, pick your exam’s rule, and download a clean signature at the exact pixels and KB range the form checks.',
    steps: [
      { name: 'Photograph your signature', text: 'Sign on plain white paper with a black or dark blue pen. Take the photo from straight above in daylight.' },
      { name: 'Pick the size rule', text: 'Choose your exam’s rule, like 140×60 px and 10–20 KB for IBPS and SBI, or type your own pixels and KB range.' },
      { name: 'Crop', text: 'Move and zoom so the ink fills at least 80% of the yellow dashed box. Straighten it with the slider if needed.' },
      { name: 'Auto-fit and download', text: 'Tap Auto-fit. When every pass-check row has a tick, download sign.jpg.' },
    ],
    faq: [
      {
        q: 'How do I resize a signature to 10 to 20 KB?',
        a: 'Choose a rule with 10–20 KB, add your photo and tap Auto-fit. The tool works as a signature compressor when the file is too big and as a size increaser when it is too small: it raises the quality and, if needed, adds invisible padding until the file sits inside the range.',
      },
      {
        q: 'What is 140 × 60 pixels in a signature?',
        a: 'It is the signature box used by IBPS, SBI, RBI and NABARD forms: 140 pixels wide and 60 pixels tall, between 10 and 20 KB. Write your sign wide and low so it fills that strip.',
      },
      {
        q: 'What is 6 cm × 2 cm in pixels?',
        a: 'At 200 DPI, 6 × 2 cm is 472 × 157 px, the size SSC CGL, CHSL and MTS forms use. At 300 DPI it is 709 × 236 px, which is what SSC GD asks for. Both rules are in the list, at 10–20 KB.',
      },
      {
        q: 'My paper looks grey with shadows. Will it be rejected?',
        a: 'It might be. Keep "Clean signature" on: it removes shadows, turns the paper pure white and makes the ink dark. If thin lines disappear, lower the strength.',
      },
      {
        q: 'Is my signature uploaded?',
        a: 'No. Cropping, cleaning and resizing all run in your browser on your own device.',
      },
    ],
    sections: [
      {
        h2: 'Signature size rules by exam',
        paras: [
          'Each notice sets its own signature size, in pixels, centimetres or KB only. The list in the tool comes from the official notices we track, so you rarely need to type numbers:',
        ],
        list: [
          'IBPS, SBI, RBI, NABARD: 140 × 60 px, 10–20 KB',
          'SSC CGL, CHSL, MTS, CPO: 6.0 × 2.0 cm, 472 × 157 px at 200 DPI, 10–20 KB',
          'SSC GD: 6.0 × 2.0 cm at 300 DPI, 709 × 236 px, 10–20 KB',
          'NEET UG and other NTA forms: 10–100 KB, no fixed pixels',
        ],
      },
      {
        h2: 'Why signatures get rejected',
        paras: [
          'The usual reasons are a file over the KB limit, ink too faint to read, a grey or shadowed background, or a signature sitting tiny in the middle of a white box. This signature resizer fixes all four: it evens out the light, crops tightly around the ink so it fills the box, then hits the exact pixels and KB range.',
          'A name written in capital letters is not accepted as a signature. Sign the way you will sign at the exam centre, because it is compared with your attendance sheet.',
        ],
        links: [
          { href: '/tools/resize-image-in-cm', label: 'Resize in cm' },
          { href: '/tools/thumb-impression', label: 'Thumb impression' },
          { href: '/tools/handwritten-declaration', label: 'Handwritten declaration' },
        ],
      },
    ],
  };
}

export function thumbCopy(): ToolCopy {
  return {
    title: 'Thumb Impression Online: Left Thumb Resize, 240×240 px',
    description:
      'Make your left thumb impression online: clean it to dark ink on white and resize to 240 × 240 px, 20–50 KB for banking forms, or any size. On your device.',
    h1: 'Left thumb impression: clean and resize online',
    intro:
      'Press your left thumb on white paper, photograph it, and turn it into a clean thumb impression at the exact size your form wants. Nothing leaves your phone.',
    steps: [
      { name: 'Make the impression', text: 'Press your left thumb on a blue or black ink pad, then flat on plain white paper. Roll it only slightly so the edges print, and lift it straight up so nothing smudges.' },
      { name: 'Photograph it', text: 'Take the photo from straight above in daylight, without flash, filling the screen with the print.' },
      { name: 'Pick the size rule and crop', text: 'Choose your exam’s rule (240×240 px, 20–50 KB for banking forms) and fit the print inside the yellow box.' },
      { name: 'Auto-fit and download', text: 'Tap Auto-fit, check the ticks and download thumb.jpg.' },
    ],
    faq: [
      {
        q: 'Which thumb do forms ask for?',
        a: 'Most forms want the left hand thumb impression. If you do not have a left thumb, notices usually allow the right one; check yours. A few forms want both, each as its own file.',
      },
      {
        q: 'What size do banking forms want?',
        a: 'IBPS, SBI, RBI and NABARD ask for the left thumb impression at 240 × 240 px and 20–50 KB, on white paper. Pick that rule and Auto-fit lands the file inside the range.',
      },
      {
        q: 'Should I keep the blue colour of the ink?',
        a: 'Choose "Blue" under ink colour if your form asks for a blue impression or you want to keep it. Black gives the strongest contrast and works wherever no colour is set.',
      },
      {
        q: 'The ridges look blotchy. What can I do?',
        a: 'Use less ink and press without sliding. In the tool, lower the cleaning strength so fine ridges are not filled in.',
      },
      {
        q: 'Is my thumb impression stored anywhere?',
        a: 'No. It is processed in your browser and never leaves your device, which matters for biometric data.',
      },
    ],
    sections: [
      {
        h2: 'What a good thumb impression looks like',
        paras: [
          'Verification staff want a print where the ridges are visible, the background is white and the print fills most of the box. Smudged, faint or tiny prints are the common reasons for rejection. The cleanup step corrects uneven light, makes the paper white, crops around the print and keeps the ink dark.',
          'Rules differ by exam. DSSSB asks for a left and a right thumb impression as two files, each up to 40 KB. NEET UG asks for the finger and thumb impressions of both hands on one sheet, 50–200 KB. Make each print on fresh paper and run this thumb resizer once per file.',
        ],
      },
      {
        h2: 'Thumb impression resize without a scanner',
        paras: [
          'A phone camera is enough. Daylight from a window gives even light; a desk lamp from one side throws shadows across the ridges. Hold the phone parallel to the paper so the print is not stretched, and keep the camera a hand’s length away so it can focus.',
        ],
        links: [
          { href: '/exam/dsssb', label: 'DSSSB sizes' },
          { href: '/exam/neet-ug', label: 'NEET UG sizes' },
          { href: '/tools/signature-resize', label: 'Signature resize' },
        ],
      },
    ],
  };
}

export function declarationCopy(): ToolCopy {
  return {
    title: 'Handwritten Declaration: IBPS RRB Text, Size and Resize',
    description:
      'Handwritten declaration help: get the text with your name, print an A4 trace sheet, then resize the photo of your page to 800 × 400 px, 50–100 KB.',
    h1: 'Handwritten declaration: text, trace sheet and resize',
    intro:
      'Banking forms ask for a declaration in your own handwriting. Get the exact declaration text, print a sheet to copy it neatly, then size the photo for the form.',
    steps: [
      { name: 'Choose your exam', text: 'Pick the exam to load its declaration text, or paste the text from your notice.' },
      { name: 'Print the trace sheet', text: 'Type your name and download the A4 PDF. It shows the text in light grey with lines to write on.' },
      { name: 'Write and photograph', text: 'Write the declaration in your own handwriting, in English, with a black pen. Photograph the page from above in good light.' },
      { name: 'Resize and download', text: 'Crop to the written text, tap Auto-fit and download decl.jpg once all checks pass.' },
    ],
    faq: [
      {
        q: 'What is the handwritten declaration for IBPS RRB?',
        a: 'IBPS RRB PO and Clerk forms ask for a handwritten declaration image of 800 × 400 px, 50–100 KB, like other IBPS forms. The text loaded for IBPS RRB is copied from the IBPS PO notice, so check it against your own notice before writing.',
      },
      {
        q: 'What is the IBPS handwritten declaration size?',
        a: 'IBPS, SBI, RBI and NABARD ask for 800 × 400 px at 50–100 KB, as a JPG. That is the first rule in the resize list.',
      },
      {
        q: 'Is there a written declaration for FCI?',
        a: 'We do not track FCI notices yet, so we cannot confirm its declaration format or size. Check the FCI notice, choose "Other exam: paste the text", and pick Custom in the size list to type its pixels and KB.',
      },
      {
        q: 'Can I type the declaration instead of writing it?',
        a: 'No. The notice asks for your own handwriting, and typed or traced-over text can be rejected. The trace sheet is only a guide; write on the empty line under each grey line or on a fresh page.',
      },
    ],
    sections: [
      {
        h2: 'Handwriting declaration rules that cause rejections',
        paras: [
          'The declaration confirms, in your own hand, that the details you submitted are true. It is compared with your handwriting at the exam and at joining, so write it the way you normally write. Banking notices reject declarations in capital letters, a text that differs from the notice, a page photographed at an angle, and files over 100 KB.',
          'Texts marked "check against the notice" were copied from a related notice. Compare them with your own notification word by word before you write.',
        ],
      },
      {
        h2: 'Format of the page',
        paras: [
          'Use plain white unruled paper and a black pen. Write the text in four or five lines across the page, leaving a margin, and keep the full text in the frame when you photograph it. The 800 × 400 px box is twice as wide as it is tall, so a page cropped close to the text fills it well.',
        ],
        list: [
          'English, in running handwriting, not capitals',
          'Your full name exactly as in the application',
          'No signature or date unless your notice asks for one',
        ],
        links: [
          { href: '/exam/ibps-rrb-po', label: 'IBPS RRB PO sizes' },
          { href: '/exam/ibps-rrb-clerk', label: 'IBPS RRB Clerk sizes' },
          { href: '/tools/signature-resize', label: 'Signature resize' },
        ],
      },
    ],
  };
}
