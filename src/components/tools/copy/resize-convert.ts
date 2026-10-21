/** Copy for T2 resize (EN + provisional HI) and T3 convert (EN). Build-time only. */
import type { Lang } from '@/config/site';
import type { ToolCopy } from './types';

export function resizeCopy(lang: Lang = 'en'): ToolCopy {
  if (lang === 'hi') {
    return {
      title: 'फोटो का साइज़ बदलें — पिक्सल, cm, mm, इंच और DPI में, फ्री',
      description: 'फोटो को सही पिक्सल या cm/mm/इंच में रीसाइज़ करें, DPI के साथ। अनुपात लॉक, JPG या PNG, चाहें तो अधिकतम KB। कुछ भी अपलोड नहीं होता।',
      h1: 'फोटो रीसाइज़ करें (px, cm, इंच)',
      intro: 'फॉर्म में जो साइज़ लिखा है वही डालें: पिक्सल में, या cm/mm/इंच में DPI के साथ। फोटो ठीक उसी साइज़ की बनती है।',
      steps: [
        { name: 'फोटो जोड़ें', text: 'फोटो खींचें या गैलरी से चुनें। फाइल आपके फोन में ही रहती है।' },
        { name: 'साइज़ डालें', text: 'यूनिट चुनें (px, cm, mm, inch), चौड़ाई और ऊँचाई लिखें। cm या इंच में DPI भी देखें, आम तौर पर 200।' },
        { name: 'फॉर्मेट और KB', text: 'JPG या PNG चुनें। फॉर्म में अधिकतम KB हो तो वह भी डालें।' },
        { name: 'डाउनलोड करें', text: 'पास चेक पर सब टिक हों, तब डाउनलोड करें।' },
      ],
      faq: [
        { q: '3.5×4.5 cm कितने पिक्सल होते हैं?', a: '200 DPI पर 3.5×4.5 cm लगभग 276×354 पिक्सल होते हैं, और 300 DPI पर 413×531। यूनिट में cm चुनें और DPI डालें, बाकी हिसाब टूल कर देता है।' },
        { q: 'अनुपात लॉक क्या करता है?', a: 'चालू हो तो चौड़ाई बदलने पर ऊँचाई अपने आप उसी अनुपात में बदलती है, ताकि चेहरा खिंचा हुआ न दिखे। बंद करें तो दोनों अलग-अलग डाल सकते हैं।' },
        { q: 'DPI से क्या फ़र्क पड़ता है?', a: 'DPI बताता है कि छापने पर एक इंच में कितने पिक्सल आएँगे। cm या mm को पिक्सल में बदलने के लिए DPI चाहिए, और हम यही DPI फाइल में भी लिख देते हैं।' },
        { q: 'क्या फोटो अपलोड होती है?', a: 'नहीं। रीसाइज़ आपके ब्राउज़र में, आपके फोन पर ही होता है।' },
      ],
      sections: [
        {
          h2: 'पिक्सल, cm और DPI',
          paras: [
            'कई नोटिस साइज़ cm में देते हैं, जैसे SSC का सिग्नेचर 6.0×2.0 cm या CTET की फोटो 3.5×4.5 cm। स्क्रीन पर फोटो पिक्सल में होती है, इसलिए cm को पिक्सल में बदलने के लिए DPI चाहिए: पिक्सल = cm ÷ 2.54 × DPI। नोटिस में DPI न लिखा हो तो 200 DPI सुरक्षित माना जाता है।',
            'अगर आपकी परीक्षा का किट हमारे पास है, तो वहाँ साइज़ पहले से भरा होता है। अलग साइज़ के लिए यह टूल या कस्टम साइज़ टूल इस्तेमाल करें।',
          ],
        },
      ],
    };
  }
  return {
    title: 'Resize Image in Pixels, cm, mm or Inches with DPI — Free, No Upload',
    description:
      'Resize a photo to exact pixels, or to cm, mm or inches at any DPI. Lock the aspect ratio, pick JPG or PNG and an optional max KB. Runs on your device.',
    h1: 'Resize image (px, cm, mm, inches)',
    intro: 'Type the size your form asks for, in pixels or in cm, mm or inches with a DPI. The output has exactly those pixels, and the DPI is written into the file.',
    steps: [
      { name: 'Add your image', text: 'Take a photo or choose one from your gallery. HEIC photos from iPhones work too.' },
      { name: 'Enter the size', text: 'Choose a unit, then type the width and height. With the lock on, the other side follows so the picture never looks stretched.' },
      { name: 'Set DPI, format and KB', text: 'Physical sizes need a DPI, usually 200 for exam forms. Pick JPG or PNG and, if your form has one, a maximum KB.' },
      { name: 'Download', text: 'Check that width × height and size show ticks, then download.' },
    ],
    faq: [
      { q: 'How many pixels is 3.5 × 4.5 cm?', a: 'At 200 DPI it is about 276 × 354 px; at 300 DPI it is 413 × 531 px. Pick cm as the unit, type 3.5 and 4.5 and set the DPI, and the tool shows the pixels.' },
      { q: 'What does the aspect lock do?', a: 'With the lock on, changing the width updates the height in the same proportion as your picture, so faces are not squashed. Turn it off to set both sides freely; the picture is then stretched to fit.' },
      { q: 'Does DPI change the quality?', a: 'No. DPI only says how big the picture should print. It matters when a notice gives the size in cm or inches, because the pixel count is worked out from it. We also write it into the JPG header, which some portals check.' },
      { q: 'Can I make a small photo bigger?', a: 'Yes, but a picture enlarged beyond its original pixels looks soft. The tool warns you when that happens.' },
      { q: 'Is anything uploaded?', a: 'No. Resizing runs in your browser and the page works offline after your first visit.' },
    ],
    sections: [
      {
        h2: 'Pixels, centimetres and DPI',
        paras: [
          'Many notices give sizes in centimetres: SSC wants a 6.0 × 2.0 cm signature, CTET a 3.5 × 4.5 cm photo, UPPSC a 5 × 6 cm photo. A screen image has no centimetres, only pixels, so the size is converted with the DPI: pixels = cm ÷ 2.54 × DPI. When the notice gives no DPI, 200 DPI is the safe choice that most portals expect.',
          'We resize with a high-quality Lanczos filter, so edges and text stay crisp, and save JPGs as baseline (not progressive), which older government portals require.',
        ],
      },
      {
        h2: 'When to use a different tool',
        paras: ['If your form fixes the pixels and a KB range together, the Custom size tool or your exam’s kit handles both in one step. For signatures, the Signature resize tool also cleans the paper to white.'],
        links: [
          { href: '/tools/custom-preset', label: 'Custom size' },
          { href: '/tools/signature-resize', label: 'Signature resize' },
          { href: '/tools/compress-image', label: 'Compress image' },
        ],
      },
    ],
  };
}

export function convertCopy(): ToolCopy {
  return {
    title: 'Convert Image: HEIC to JPG, PNG to JPG, JPG to WebP — Free, No Upload',
    description:
      'Convert iPhone HEIC photos to JPG, PNG to JPG, or any image to PNG or WebP. Transparent areas turn white for JPG. Processed on your device, never uploaded.',
    h1: 'Convert image (JPG, PNG, WebP, HEIC)',
    intro: 'Turn any photo into the format your form accepts. Most exam portals want JPG; iPhone photos are HEIC, so convert them here first.',
    steps: [
      { name: 'Add your image', text: 'Choose a JPG, PNG, WebP or HEIC file, or a PDF to convert its first page.' },
      { name: 'Pick the format', text: 'JPG for exam forms, PNG for sharp graphics with transparency, WebP for small web images.' },
      { name: 'Download', text: 'The pass check confirms the file really is the format you chose. Then download it.' },
    ],
    faq: [
      { q: 'How do I convert an iPhone HEIC photo to JPG?', a: 'Choose the HEIC file, keep JPG selected and download. The photo is decoded on your phone and saved as a standard baseline JPG that every portal accepts.' },
      { q: 'Why did the transparent part turn white?', a: 'JPG cannot store transparency, so transparent pixels need a colour. White is the default because exam forms want a white background; you can pick black instead.' },
      { q: 'Does renaming a file from .png to .jpg work?', a: 'No. Renaming changes only the name, not the data inside, and many portals check the real format. Converting rewrites the file properly; the pass check shows the detected format.' },
      { q: 'Will converting reduce quality?', a: 'PNG is lossless. JPG and WebP use the quality slider (90 by default), which looks the same as the original to the eye. To hit a KB limit, use Compress image instead.' },
    ],
    sections: [
      {
        h2: 'Which format should I use?',
        paras: [
          'JPG is the safe choice for photos, signatures and thumb impressions on government forms: it is small, and every portal reads it. PNG keeps every pixel exactly and supports transparency, which is good for logos and screenshots but makes photos large. WebP is a modern format that gives smaller files for websites; exam portals rarely accept it.',
          'The output keeps the same pixel size as your input. Hidden camera and location data (EXIF) is not copied, so your converted file is also more private.',
        ],
      },
      {
        h2: 'Need a size as well?',
        paras: ['Converting does not aim at a KB size. After converting, use these tools to get the size right:'],
        links: [
          { href: '/tools/compress-image', label: 'Compress image' },
          { href: '/tools/resize-image', label: 'Resize image' },
        ],
      },
    ],
  };
}
