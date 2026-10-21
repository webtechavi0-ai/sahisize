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
    title: 'Signature Resize: 140×60 px, 10–20 KB, White Background — Free',
    description:
      'Crop your signature photo, clean the paper to pure white and resize to 140×60 px, 10–20 KB (IBPS, SBI), SSC 6×2 cm or any size and KB range. Never uploaded.',
    h1: 'Signature resize and cleanup',
    intro: 'Sign on white paper with a black pen, take a photo, and download a signature that matches your form’s pixels and KB range.',
    steps: [
      { name: 'Photograph your signature', text: 'Sign on plain white paper with a black or dark blue pen. Take the photo from straight above in daylight.' },
      { name: 'Pick the size rule', text: 'Choose your exam’s rule, like 140×60 px and 10–20 KB for IBPS and SBI, or type your own pixels and KB range.' },
      { name: 'Crop', text: 'Move and zoom so the ink fills at least 80% of the yellow dashed box. Straighten it with the slider if needed.' },
      { name: 'Auto-fit and download', text: 'Tap Auto-fit. When every pass-check row has a tick, download sign.jpg.' },
    ],
    faq: [
      { q: 'How do I make my signature 10–20 KB?', a: 'Choose the "140×60 px, 10–20 KB" rule, add your photo and tap Auto-fit. A small signature is often naturally under 10 KB; the tool raises the quality and, if needed, adds invisible padding so it lands inside the range.' },
      { q: 'My paper looks grey with shadows. Will it be rejected?', a: 'It might be. Keep "Clean signature" on: it removes shadows and uneven light, turns the paper pure white and makes the ink dark. If thin lines disappear, lower the strength; if the paper stays grey, raise it.' },
      { q: 'What is the SSC signature size?', a: 'SSC forms ask for a 6.0 × 2.0 cm signature of 10–20 KB, which is about 472 × 157 px at 200 DPI. It is one of the rules in the list.' },
      { q: 'Can I use a signature drawn on the screen?', a: 'Forms expect a scan or photo of a real pen signature. Sign on paper; it also looks more natural after cleanup.' },
      { q: 'Is my signature uploaded?', a: 'No. Cropping, cleaning and resizing all run in your browser on your own device.' },
    ],
    sections: [
      {
        h2: 'Why signatures get rejected',
        paras: [
          'The usual reasons are a file over the KB limit, ink too thin or faint to read, a grey or shadowed background, or a signature that sits tiny in the middle of a large white box. This tool fixes all four: it evens out the light, crops tightly around the ink so it fills the box, and then hits the exact pixel size and KB range.',
          'A name written in capital letters is not accepted as a signature. Sign the way you will sign at the exam centre, because it is compared with your attendance sheet.',
        ],
      },
      {
        h2: 'Size rules in the list',
        paras: [
          'The rules come from the official notices we track. Banking exams (IBPS, SBI, RBI, NABARD) use 140×60 px and 10–20 KB. SSC uses 6.0×2.0 cm at 10–20 KB. NTA exams such as NEET and JEE Main accept 10–100 KB with no fixed pixels. If your exam is not listed, choose Custom and type the numbers from your notice.',
        ],
      },
    ],
  };
}

export function thumbCopy(): ToolCopy {
  return {
    title: 'Thumb Impression Resize: 240×240 px, 20–50 KB, Clean White Background',
    description:
      'Photograph your left thumb impression, clean it to dark ink on white and resize to 240×240 px, 20–50 KB (IBPS, SBI) or any size. Processed on your device.',
    h1: 'Thumb impression resize and cleanup',
    intro: 'Press your left thumb on white paper, take a photo, and get a clean, sharp impression at the exact size your form wants.',
    steps: [
      { name: 'Make the impression', text: 'Press your left thumb on a blue or black ink pad, then firmly on plain white paper. Roll it slightly so the whole print shows.' },
      { name: 'Photograph it', text: 'Take the photo from straight above in daylight, without flash, filling the screen with the print.' },
      { name: 'Pick the size rule and crop', text: 'Choose your exam’s rule (240×240 px, 20–50 KB for banking forms) and fit the print inside the yellow box.' },
      { name: 'Auto-fit and download', text: 'Tap Auto-fit, check the ticks and download thumb.jpg.' },
    ],
    faq: [
      { q: 'Should I keep the blue colour of the ink?', a: 'Choose "Blue" under ink colour if your form asks for a blue impression or you want to keep it. Black gives the strongest contrast and is accepted everywhere a colour is not specified.' },
      { q: 'The ridges look blotchy. What can I do?', a: 'Use less ink and press without sliding. In the tool, lower the cleaning strength so fine ridges are not filled in.' },
      { q: 'What size do banking forms want?', a: 'IBPS, SBI, RBI and NABARD ask for the left thumb impression at 240×240 px and 20–50 KB, on white paper. Other forms set their own range, so check your notice and pick that rule above.' },
      { q: 'Is my thumb impression stored anywhere?', a: 'No. It is processed in your browser and never leaves your device. That matters for biometric data.' },
    ],
    sections: [
      {
        h2: 'What a good impression looks like',
        paras: [
          'Portals and verification staff want a print where the ridges are visible, the background is white and the print fills most of the box. Smudged, faint or tiny prints are the common reason for rejection. The cleanup step corrects uneven light, makes the paper pure white, crops around the print and keeps the ink dark.',
          'Some forms also ask for a right thumb or for both thumbs (DSSSB asks for two). Make each one on its own paper and run this tool once for each.',
        ],
      },
    ],
  };
}

export function declarationCopy(): ToolCopy {
  return {
    title: 'Handwritten Declaration: Text, Trace Sheet PDF and Resize (IBPS, SBI)',
    description:
      'Get your exam’s handwritten declaration text with your name filled in, print an A4 trace sheet, then resize the photo of your page to 800×400 px, 50–100 KB.',
    h1: 'Handwritten declaration: text, trace sheet and resize',
    intro: 'Banking exams ask for a declaration in your own handwriting. Get the exact text, print a sheet to copy it neatly, then size the photo for the form.',
    steps: [
      { name: 'Choose your exam', text: 'Pick the exam to load its official declaration text, or paste the text from your notice.' },
      { name: 'Print the trace sheet', text: 'Type your name and download the A4 PDF. It shows the text in light grey with lines to write on.' },
      { name: 'Write and photograph', text: 'Write the declaration in your own handwriting, in English, with a black pen. Photograph the page from above in good light.' },
      { name: 'Resize and download', text: 'Crop to the written text, tap Auto-fit and download decl.jpg once all checks pass.' },
    ],
    faq: [
      { q: 'Can I type the declaration instead of writing it?', a: 'No. The notice asks for your own handwriting, and typed or traced-over text can be rejected. The trace sheet is only a guide to copy from; write the text yourself on the empty line under each grey line or on a fresh page.' },
      { q: 'Which language should I write it in?', a: 'Write it in English unless your notice says otherwise. Banking notices say it must not be written in capital letters.' },
      { q: 'What size does IBPS want for the declaration?', a: 'IBPS, SBI, RBI and NABARD ask for 800×400 px at 50–100 KB, as a JPG. That is the first rule in the resize list.' },
      { q: 'Is my name sent anywhere?', a: 'No. The name is only used to draw the PDF on your device.' },
    ],
    sections: [
      {
        h2: 'Why the declaration is checked',
        paras: [
          'The handwritten declaration confirms that the details you submitted are true, in your own hand. It is compared with your handwriting at the exam and at joining, so write it the way you normally write. Common rejections are capital letters, a different text from the notice, a page photographed at an angle, and a file over 100 KB.',
          'Texts marked "check against the notice" were copied from a related notice. Compare them with your own notification before you write.',
        ],
      },
    ],
  };
}
