/**
 * Copy for /tools/name-date-on-photo (EN + HI). The exams named as requiring a name and
 * date come from published presets with `needsNameDateStrip` (nameDateExams); every other
 * exam is "check your notice". Build-time only.
 */
import type { Lang } from '@/config/site';
import type { NameDateExam } from '../name-date-server';
import type { ToolCopy } from './types';

function ruleText(e: NameDateExam): { px: string; kb: string } {
  const s = e.option.spec;
  const px = s.widthPx !== null ? `${s.widthPx}×${s.heightPx} px` : '';
  const kb = s.minKB ? `${s.minKB}–${s.maxKB} KB` : `${s.maxKB} KB`;
  return { px, kb };
}

export function nameDateCopy(lang: Lang = 'en', exams: NameDateExam[] = []): ToolCopy {
  const first = exams[0];
  const r = first ? ruleText(first) : null;
  const links = exams.map((e) => ({ href: e.href, label: e.name }));

  if (lang === 'hi') {
    const names = exams.map((e) => e.name).join(', ');
    const examPara = first
      ? `हर नोटिस में यह नियम नहीं होता, और साल-दर-साल बदल भी सकता है, इसलिए हमेशा अपना ताज़ा नोटिस पढ़ें। जिन परीक्षाओं को हम ऑफिशियल नोटिस से ट्रैक करते हैं, उनमें ${names} फोटो के अंदर चेहरे के नीचे नाम और तारीख माँगता है। ${first.name} के लिए हमारा नियम ${[r!.px, r!.kb].filter(Boolean).join(', ')} है; यह सूची में पहला विकल्प है।`
      : 'हर नोटिस में यह नियम नहीं होता, और साल-दर-साल बदल भी सकता है, इसलिए हमेशा अपना ताज़ा नोटिस पढ़ें।';
    return {
      title: 'फोटो पर नाम और तारीख लगाएँ — फ्री, एग्ज़ाम फॉर्म के लिए',
      description:
        'एग्ज़ाम फॉर्म के लिए फोटो पर नाम और तारीख लगाएँ: नाम लिखें, आज की तारीख रखें और सही KB में पासपोर्ट साइज़ JPG पाएँ। फ्री, कुछ भी अपलोड नहीं होता।',
      h1: 'फोटो पर नाम और तारीख लगाएँ',
      intro:
        'कुछ एग्ज़ाम फॉर्म ऐसी फोटो माँगते हैं जिसमें चेहरे के नीचे आपका नाम और तारीख छपी हो। यहाँ नाम और तारीख लिखें, फोटो क्रॉप करें, और सही पिक्सल और KB में नाम-तारीख वाली पासपोर्ट साइज़ फोटो डाउनलोड करें।',
      steps: [
        { name: 'फोटो जोड़ें', text: 'सादे हल्के बैकग्राउंड वाली हाल की फोटो चुनें, या कैमरे से नई फोटो लें।' },
        { name: 'नाम और तारीख लिखें', text: 'नाम वैसे ही लिखें जैसे फॉर्म में है। तारीख में आज की तारीख DD/MM/YYYY में भरी रहती है; नोटिस फोटो खिंचवाने की तारीख माँगे तो उसे बदल दें।' },
        { name: 'साइज़ चुनें', text: first ? `अपनी परीक्षा का नियम चुनें, जैसे ${first.name} ${[r!.px, r!.kb].filter(Boolean).join(', ')}, या "अपना साइज़"। चौड़ाई-ऊँचाई खाली छोड़ने पर पासपोर्ट साइज़ 3.5×4.5 cm बनता है।` : '"अपना साइज़" चुनें। चौड़ाई-ऊँचाई खाली छोड़ने पर पासपोर्ट साइज़ 3.5×4.5 cm बनता है।' },
        { name: 'क्रॉप करें और जोड़ें', text: 'चेहरे को गाइड के अंदर रखें और "नाम और तारीख जोड़ें" दबाएँ। पास चेक पर सब टिक हों, तब डाउनलोड करें।' },
      ],
      faq: [
        { q: 'पासपोर्ट साइज़ फोटो पर नाम और तारीख कैसे लगाएँ?', a: '"अपना साइज़" चुनें और चौड़ाई-ऊँचाई खाली छोड़ें। आपको 3.5×4.5 cm (413×531 px) की पासपोर्ट साइज़ फोटो मिलेगी, जिसके नीचे की पट्टी में नाम और तारीख होगी।' },
        { q: 'क्या तारीख दूसरे फॉर्मेट में लिख सकते हैं?', a: 'हाँ। तारीख वाले खाने में 12 अक्षर तक कुछ भी लिख सकते हैं, जैसे 21-10-2026 या 21.10.2026। जैसा लिखेंगे, वैसा ही छपेगा।' },
        { q: 'क्या JEE Main या NEET में नाम-तारीख वाली फोटो चाहिए?', a: 'JEE Main और NEET के हमारे पब्लिश्ड नियमों में यह शर्त नहीं है। अपना ताज़ा इन्फॉर्मेशन बुलेटिन देखें; अगर वहाँ माँगा गया हो, तो "अपना साइज़" में बुलेटिन वाले नंबर डालें।' },
        { q: 'क्या पट्टी से फोटो का KB ज़्यादा हो जाएगा?', a: 'नहीं। पट्टी फोटो के तय पिक्सल के अंदर ही बनती है, और पूरी फोटो आपकी KB रेंज में फिट की जाती है। पास चेक में नतीजा दिखता है।' },
      ],
      sections: [
        {
          h2: 'किन परीक्षाओं में फोटो पर नाम और तारीख चाहिए',
          paras: [
            examPara,
            'लोग JEE Main की नाम-तारीख वाली फोटो, NEET फोटो विद नेम एंड डेट, TNPSC फोटो एडिटर और SSC के लिए फोटो पर तारीख भी खोजते हैं। JEE Main और NEET के हमारे पब्लिश्ड नियमों में नाम-तारीख की पट्टी नहीं है, TNPSC को हम अभी ट्रैक नहीं करते, और जिन SSC परीक्षाओं को हम ट्रैक करते हैं, उनमें फोटो फॉर्म भरते समय लाइव खींची जाती है। इन सबके लिए अपना नोटिस देखें: अगर उसमें नाम और तारीख माँगी गई है, तो "अपना साइज़" में उसके नंबर डालें।',
          ],
          links,
        },
        {
          h2: 'नाम और तारीख कैसे छपते हैं',
          paras: [
            'टेक्स्ट तय साइज़ के अंदर ही छपता है, फोटो के बाहर नहीं जोड़ा जाता, इसलिए फोटो की चौड़ाई और ऊँचाई वही रहती है जो फॉर्म माँगता है। फोटो के निचले लगभग पाँचवें हिस्से में सफेद पट्टी बनती है, जिसमें पहली लाइन में नाम और दूसरी में तारीख काले अक्षरों में होती है। ऊपर का चेहरे वाला हिस्सा उसी हिसाब से क्रॉप होता है, इसलिए क्रॉप करते समय सिर के ऊपर थोड़ी जगह छोड़ें।',
            'अभी एक ही स्टाइल है: सफेद पर काले अक्षर, चेहरे के नीचे बीच में। नोटिस यही फॉर्मेट बताते हैं। लंबा नाम चौड़ाई में फिट होने के लिए अपने आप छोटा हो जाता है। तारीख वही डालें जो नोटिस माँगे; पक्का न हो तो फोटो खिंचवाने की तारीख डालें।',
          ],
        },
        {
          h2: 'आपका नाम आपके फोन में ही रहता है',
          paras: [
            'आप जो नाम और तारीख लिखते हैं, उनसे सिर्फ़ आपके ब्राउज़र में पट्टी बनाई जाती है। वे न अपलोड होते हैं, न सेव होते हैं, और न ही हमारे गुमनाम इस्तेमाल के आँकड़ों में भेजे जाते हैं।',
          ],
        },
      ],
    };
  }

  const names = exams.map((e) => e.name).join(', ');
  const examPara = first
    ? `Only some notices ask for this, and the rule can change from year to year, so always read your current notice. Among the exams we track from official notices, ${names} asks for the name and date printed below the face, inside the photo. Our ${first.name} rule is ${[r!.px, r!.kb].filter(Boolean).join(', ')}; it is the first option in the list.`
    : 'Only some notices ask for this, and the rule can change from year to year, so always read your current notice.';
  return {
    title: 'Add Name and Date on Photo Online — Free, Exam Ready',
    description:
      'Add name and date on a photo for exam forms: type your name, keep today’s date, and get a passport size JPG at the right KB. Free and never uploaded.',
    h1: 'Add name and date on photo',
    intro:
      'Some exam forms want a photo with your name and date printed below your face. Type them here, crop your photo, and download a passport size photo with name and date at the exact pixels and KB.',
    steps: [
      { name: 'Add your photo', text: 'Pick a recent photo with a plain, light background, or take one with the camera.' },
      { name: 'Type the name and date', text: 'Enter your name as it appears on the form. The date starts at today in DD/MM/YYYY; change it to the day the photo was taken if your notice asks for that.' },
      {
        name: 'Choose the size',
        text: first
          ? `Pick your exam’s rule, such as ${first.name} ${[r!.px, r!.kb].filter(Boolean).join(', ')}, or My own size. With width and height left empty you get passport size, 3.5×4.5 cm.`
          : 'Choose My own size. With width and height left empty you get passport size, 3.5×4.5 cm.',
      },
      { name: 'Crop and add', text: 'Frame your face inside the guide and tap Add name and date. Download once every pass-check row has a tick.' },
    ],
    faq: [
      { q: 'How do I add name and date on a passport size photo?', a: 'Choose My own size and leave width and height empty. You get a 3.5×4.5 cm passport size photo (413×531 px) with your name and date in a strip at the bottom.' },
      { q: 'Can I write the date in another format?', a: 'Yes. The date box takes any text up to 12 characters, such as 21-10-2026 or 21.10.2026. It is printed exactly as you type it.' },
      { q: 'Does JEE Main or NEET need a photo with name and date?', a: 'Our published rules for JEE Main and NEET do not include it. Check your current information bulletin; if it asks for one, use My own size with the numbers from the bulletin.' },
      { q: 'Will the strip push my photo over the KB limit?', a: 'No. The strip is part of the final pixels, and the whole photo is fitted to your KB range. The pass check shows the result before you download.' },
    ],
    sections: [
      {
        h2: 'Which exams ask for a photo with name and date',
        paras: [
          examPara,
          'People also search for a JEE Main photo with name and date, a NEET photo with name and date, a TNPSC photo editor and a date on photo for SSC. Our published JEE Main and NEET rules have no name-and-date strip, we do not track TNPSC yet, and the SSC exams we track capture the photo live in the form. For all of these, check your notice: if it asks for a name and date, choose My own size and type the numbers it gives.',
        ],
        links,
      },
      {
        h2: 'How the name and date are printed',
        paras: [
          'The text goes inside the final size, not below it, so the photo keeps the exact width and height your form wants. A white strip fills roughly the bottom fifth of the picture, with your name on the first line and the date on the second, in black. The face area above it is cropped to fit, so leave a little space above your head when you crop.',
          'There is one style: black text on white, centred below the face, which is the format notices describe. A long name shrinks to fit the width. Use the date your notice asks for; if you are unsure, use the day the photo was taken.',
        ],
      },
      {
        h2: 'Your name stays on your phone',
        paras: [
          'The name and date you type are only used to draw the strip in your browser. They are not uploaded, not stored and not included in our anonymous usage counts.',
        ],
      },
    ],
  };
}
