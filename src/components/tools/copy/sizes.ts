/**
 * Copy for the physical-size preset pages over T2 resize (keyword map, agent C):
 * 3.5×4.5 cm, resize in cm, resize in mm, passport size, postcard size, stamp size.
 * English for all six, Hindi for passport-size-photo and photo-3-5x4-5-cm. Build-time only.
 * Pixel numbers: px = size ÷ 2.54 × DPI (cm) or ÷ 25.4 × DPI (mm), rounded; unit-tested.
 */
import type { Lang } from '@/config/site';
import type { SizePresetPage } from '../size-presets';
import type { ToolCopy } from './types';

function photo3545(lang: Lang): ToolCopy {
  if (lang === 'hi') {
    return {
      title: '3.5 cm x 4.5 cm फोटो — पिक्सल और KB में फ्री बनाएँ',
      description:
        'फोटो को 3.5 × 4.5 cm में बदलें: 200 DPI पर 276 × 354 px, 300 DPI पर 413 × 531 px। चाहें तो अधिकतम KB भी डालें। फोटो आपके फोन से बाहर नहीं जाती।',
      h1: '3.5 × 4.5 cm फोटो बनाएँ (पिक्सल और KB के साथ)',
      intro:
        'फॉर्म में 3.5 cm × 4.5 cm फोटो माँगी गई है? अपनी फोटो चुनें, DPI तय करें, और ठीक उसी नाप की JPG डाउनलोड करें। साइज़ पहले से भरा है।',
      steps: [
        { name: 'फोटो चुनें', text: 'गैलरी से फोटो लें या नई खींचें। सादी हल्की दीवार के सामने, सीधी रोशनी में ली गई फोटो सबसे अच्छी रहती है।' },
        { name: 'DPI चुनें', text: 'ऑनलाइन फॉर्म के लिए 200 DPI काफ़ी है। नोटिस में 300 DPI लिखा हो या फोटो छपवानी हो, तो 300 DPI चुनें।' },
        { name: 'KB डालें', text: 'फॉर्म में अधिकतम साइज़ लिखा हो, जैसे 50 KB, तो वही नंबर डालें। न लिखा हो तो खाली छोड़ दें।' },
        { name: 'डाउनलोड करें', text: 'पास चेक में पिक्सल और साइज़ पर टिक दिखे, तब JPG डाउनलोड करें।' },
      ],
      faq: [
        {
          q: '3.5 × 4.5 cm कितने पिक्सल होते हैं?',
          a: 'यह DPI पर निर्भर है। 200 DPI पर 276 × 354 पिक्सल और 300 DPI पर 413 × 531 पिक्सल। हिसाब है: पिक्सल = cm ÷ 2.54 × DPI।',
        },
        {
          q: '4.5 × 3.5 cm और 3.5 × 4.5 cm में क्या फ़र्क है?',
          a: 'नाप एक ही है, बस कोई ऊँचाई पहले लिखता है। फोटो खड़ी होती है: चौड़ाई 3.5 cm और ऊँचाई 4.5 cm।',
        },
        {
          q: 'क्या फोटो खिंच जाएगी?',
          a: 'नहीं। आपकी फोटो का अनुपात अलग हो तो टूल किनारों से थोड़ा काटकर बीच का हिस्सा रखता है, ताकि चेहरा पतला या चौड़ा न दिखे।',
        },
        {
          q: 'क्या यह पासपोर्ट साइज़ फोटो है?',
          a: 'भारत में ज़्यादातर फॉर्म "पासपोर्ट साइज़" से 3.5 × 4.5 cm ही मानते हैं। पासपोर्ट के आवेदन के नियम अलग हो सकते हैं, उनके लिए पासपोर्ट साइज़ फोटो वाला पेज देखें।',
        },
      ],
      sections: [
        {
          h2: '3.5 × 4.5 cm पिक्सल में',
          paras: [
            'स्क्रीन पर फोटो का कोई cm नहीं होता, सिर्फ पिक्सल होते हैं। cm को पिक्सल में बदलने के लिए DPI चाहिए, यानी एक इंच में कितने पिक्सल। एक इंच 2.54 cm का होता है, इसलिए 200 DPI पर 3.5 cm = 3.5 ÷ 2.54 × 200 ≈ 276 पिक्सल।',
            'CTET का फॉर्म यही नाप माँगता है: 3.5 × 4.5 cm, 200 DPI पर 276 × 354 पिक्सल, 10 से 100 KB। आपकी परीक्षा का किट हमारे पास हो, तो वहाँ KB की सीमा भी पहले से भरी मिलेगी।',
          ],
          list: ['200 DPI: 276 × 354 px', '300 DPI: 413 × 531 px', 'mm में: 35 × 45 mm'],
        },
        {
          h2: 'हिसाब खुद जाँचना हो तो',
          paras: [
            'मान लीजिए नोटिस 300 DPI कहता है। तब 3.5 को 2.54 से भाग दें (≈ 1.378 इंच) और 300 से गुणा करें: लगभग 413। इसी तरह 4.5 cm ≈ 1.772 इंच, यानी 531। गोल करने से एक-आध पिक्सल का अंतर आ सकता है, जिसे पोर्टल मान लेते हैं।',
            'mm में लिखा हो तो 35 × 45 mm भी यही नाप है। इंच में यह लगभग 1.38 × 1.77 इंच बैठता है।',
          ],
        },
        {
          h2: 'फोटो रिजेक्ट न हो, इसके लिए',
          paras: [
            'चेहरा फोटो का बड़ा हिस्सा घेरे, दोनों कान दिखें, बैकग्राउंड सादा और हल्का हो। धूप का चश्मा, टोपी और फ़िल्टर न लगाएँ। फाइल JPG हो और KB की सीमा के अंदर हो।',
          ],
          links: [
            { href: '/hi/tools/passport-size-photo', label: 'पासपोर्ट साइज़ फोटो' },
            { href: '/tools/passport-photo-sheet', label: 'प्रिंट शीट (English)' },
            { href: '/hi/tools/compress-image-to-50kb', label: 'फोटो 50 KB में' },
          ],
        },
      ],
    };
  }
  return {
    title: '3.5 cm x 4.5 cm Photo: Resize Online in Pixels and KB',
    description:
      'Make a 3.5 × 4.5 cm photo online: 276 × 354 px at 200 DPI or 413 × 531 px at 300 DPI, with an optional KB limit. Free, and your photo stays on your phone.',
    h1: '3.5 cm × 4.5 cm photo maker',
    intro:
      'Need a 3.5 cm × 4.5 cm photo for a form? The size is already filled in. Add your picture, choose 200 or 300 DPI, set a KB limit if the form gives one, and download.',
    steps: [
      { name: 'Add your photo', text: 'Pick a recent front-facing picture, ideally taken against a plain light wall in daylight.' },
      { name: 'Choose the DPI', text: '200 DPI suits almost every online form. Pick 300 DPI when the notice asks for it or you plan to print.' },
      { name: 'Add a KB limit', text: 'If the form says something like "maximum 50 KB", type 50 in Max size. Otherwise leave it empty.' },
      { name: 'Download', text: 'When the pass check shows ticks for pixels and size, save the JPG.' },
    ],
    faq: [
      {
        q: 'What is 3.5 cm × 4.5 cm in pixels?',
        a: 'At 200 DPI it is 276 × 354 pixels; at 300 DPI it is 413 × 531 pixels. The rule is pixels = centimetres ÷ 2.54 × DPI, rounded to whole pixels.',
      },
      {
        q: 'Is 4.5 cm × 3.5 cm in pixels any different?',
        a: 'No. It is the same photo, just written height first. The photo stands upright: 3.5 cm wide and 4.5 cm tall, so 276 × 354 px at 200 DPI.',
      },
      {
        q: 'Will my face get stretched?',
        a: 'No. If your picture has a different shape, the tool trims a little from the edges and keeps the centre, so proportions stay natural. Keep your face in the middle when you take it.',
      },
      {
        q: 'Which DPI should I pick?',
        a: 'Use the one your notice states. When it gives none, 200 DPI is the usual choice for online forms; the DPI value is also written into the JPG.',
      },
    ],
    sections: [
      {
        h2: 'Why 3.5 × 4.5 cm has two pixel sizes',
        paras: [
          'A digital image has no centimetres, only pixels. The DPI (dots per inch) links the two, and one inch is 2.54 cm. So 3.5 cm at 200 DPI is 3.5 ÷ 2.54 × 200 ≈ 276 pixels, and 4.5 cm is about 354. At 300 DPI the same photo needs 413 × 531 pixels, which is sharper in print but a larger file.',
          'CTET is one exam that asks for exactly this: a 3.5 × 4.5 cm photo at 200 DPI (276 × 354 px) between 10 and 100 KB. If your exam has a kit on SahiSize, open it instead; the KB range is already set there.',
        ],
        list: ['200 DPI: 276 × 354 px', '300 DPI: 413 × 531 px', 'Same size in millimetres: 35 × 45 mm'],
      },
      {
        h2: 'Tips for a photo that gets accepted',
        paras: [
          'Let the face fill most of the frame with both ears visible, look straight at the camera and use a plain white or light background. Avoid caps, dark glasses and beauty filters. Save as JPG, the format nearly every portal accepts.',
        ],
        links: [
          { href: '/tools/passport-size-photo', label: 'Passport size photo' },
          { href: '/tools/passport-photo-sheet', label: 'Print a photo sheet' },
          { href: '/tools/resize-image-in-cm', label: 'Any size in cm' },
        ],
      },
    ],
  };
}

function resizeInCm(): ToolCopy {
  return {
    title: 'Resize Image in cm Online: Photo Resizer in cm and KB',
    description:
      'Resize any photo in centimetres: type width and height in cm, pick a DPI and an optional KB limit, and get exact pixels. Free, private, works offline.',
    h1: 'Resize image in cm',
    intro:
      'Type the width and height in centimetres, exactly as your form or print shop gives them. The tool converts centimetres to pixels at your DPI and saves a JPG or PNG of that size.',
    steps: [
      { name: 'Add an image', text: 'Choose a photo, scan or screenshot. Its current size appears in centimetres at 200 DPI.' },
      { name: 'Type the size in cm', text: 'Enter the width; with the lock on, the height follows your picture. Turn the lock off to type both.' },
      { name: 'Check the DPI', text: 'Leave 200 unless your notice names another value. The pixel result is shown under the fields.' },
      { name: 'Set KB and save', text: 'Add a maximum KB if needed, then download once the pass check is green.' },
    ],
    faq: [
      {
        q: 'How do I convert cm to pixels?',
        a: 'Divide the centimetres by 2.54 to get inches, then multiply by the DPI. For example, 6 cm at 200 DPI is 6 ÷ 2.54 × 200 ≈ 472 pixels. The tool does this for you as you type.',
      },
      {
        q: 'Can I resize in cm and KB together?',
        a: 'Yes. Set the size in centimetres, then type the largest file size allowed in Max size. The tool keeps the exact pixels and lowers the JPG quality only as much as needed.',
      },
      {
        q: 'Why does my 3.5 cm photo look bigger on screen?',
        a: 'Screens ignore centimetres and show pixels at their own zoom. The size becomes real when printed at the DPI written into the file, or when a portal reads the pixel count.',
      },
      {
        q: 'Can I type decimals like 2.5 cm?',
        a: 'Yes, up to two decimals. Use a dot, not a comma.',
      },
    ],
    sections: [
      {
        h2: 'Common sizes in centimetres',
        paras: [
          'Indian notices often describe photos and signatures in centimetres rather than pixels. These are the pixel results at 200 DPI, the value most portals expect when the notice is silent:',
        ],
        list: [
          '3.5 × 4.5 cm photo: 276 × 354 px',
          '6.0 × 2.0 cm signature (SSC forms): 472 × 157 px',
          '2.0 × 2.5 cm stamp photo: 157 × 197 px',
          '10.2 × 15.2 cm postcard: about 803 × 1197 px (4 × 6 in is exactly 800 × 1200)',
        ],
      },
      {
        h2: 'Rounding, aspect and DPI',
        paras: [
          'Pixels are whole numbers, so every conversion is rounded to the nearest pixel. Two pages that quote the same centimetre size can therefore differ by one pixel, and portals accept that. If both sides are fixed and your picture has a different shape, unlock the aspect ratio; for photos, a centre crop to the shape usually looks better than stretching.',
          'The DPI you choose is written into the JPG header. Some portals read it, and printers use it to print at the right physical size.',
        ],
        links: [
          { href: '/tools/resize-image-in-mm', label: 'Resize in mm' },
          { href: '/tools/photo-3-5x4-5-cm', label: '3.5 × 4.5 cm photo' },
          { href: '/tools/signature-resize', label: 'Signature 6 × 2 cm' },
        ],
      },
    ],
  };
}

function resizeInMm(): ToolCopy {
  return {
    title: 'Resize Image in mm: Photo Resizer in Millimetres, Free',
    description:
      'Photo resizer in mm: enter width and height in millimetres, choose 200 or 300 DPI, and download a JPG or PNG with the exact pixels. Nothing is uploaded.',
    h1: 'Resize image in mm',
    intro:
      'Some forms, visa checklists and photo labs give sizes in millimetres. Type them here and the image is resized to the matching pixel count at your chosen DPI.',
    steps: [
      { name: 'Choose the image', text: 'Open a photo from your gallery or camera. Its present size is shown in mm.' },
      { name: 'Enter millimetres', text: 'Type the width and height in mm. Switch the aspect lock off when both numbers are fixed.' },
      { name: 'Pick the DPI', text: 'Millimetres only become pixels through the DPI. 200 suits uploads; 300 suits printing.' },
      { name: 'Download', text: 'Optionally cap the KB, then save the file once every check passes.' },
    ],
    faq: [
      {
        q: 'How many pixels is 1 mm?',
        a: 'At 200 DPI one millimetre is about 7.87 pixels, and at 300 DPI about 11.81 pixels, because an inch is 25.4 mm. The tool multiplies and rounds to whole pixels.',
      },
      {
        q: 'What is 35 × 45 mm in pixels?',
        a: 'It is 276 × 354 px at 200 DPI and 413 × 531 px at 300 DPI. That is the same as 3.5 × 4.5 cm, the common passport-size photo on Indian forms.',
      },
      {
        q: 'What is 51 × 51 mm in pixels?',
        a: 'At 200 DPI it is 402 × 402 px; at 300 DPI it is 602 × 602 px. A 2 × 2 inch photo at 300 DPI is exactly 600 × 600 px, the tiny difference coming from rounding 2 inches to 51 mm.',
      },
      {
        q: 'Does it work without internet?',
        a: 'Yes, after your first visit the page works offline, and images are processed on your device either way.',
      },
    ],
    sections: [
      {
        h2: 'Millimetres, inches and DPI',
        paras: [
          'One inch is 25.4 millimetres, and the DPI says how many pixels fit in that inch. So pixels = mm ÷ 25.4 × DPI. Small millimetre sizes are sensitive to this: a 20 mm side is 157 px at 200 DPI but 236 px at 300 DPI. When a notice gives a size in mm and also a DPI, use both exactly; when it gives no DPI, 200 is the safe default for uploads.',
          'Millimetre sizes appear mostly for photos: 35 × 45 mm, 51 × 51 mm (2 × 2 inch) for some visa applications, and small stamp prints. For signatures, notices tend to use centimetres instead.',
        ],
      },
      {
        h2: 'Printing at the right size',
        paras: [
          'If you will print the result, choose 300 DPI and print at 100% (actual size), never "fit to page". To place several copies on one sheet with cut lines, the photo sheet tool does the layout for you.',
        ],
        links: [
          { href: '/tools/passport-photo-sheet', label: 'Photo print sheet' },
          { href: '/tools/resize-image-in-cm', label: 'Resize in cm' },
          { href: '/tools/stamp-size-photo', label: 'Stamp size photo' },
        ],
      },
    ],
  };
}

function passportSize(lang: Lang): ToolCopy {
  if (lang === 'hi') {
    return {
      title: 'पासपोर्ट साइज़ फोटो मेकर — cm, पिक्सल और KB में फ्री',
      description:
        'पासपोर्ट साइज़ फोटो ऑनलाइन बनाएँ: फॉर्म के लिए 3.5 × 4.5 cm (276 × 354 px) या चौकोर 51 × 51 mm, साथ में KB की सीमा। फोटो अपलोड नहीं होती।',
      h1: 'पासपोर्ट साइज़ फोटो मेकर',
      intro:
        'फॉर्म के लिए पासपोर्ट साइज़ फोटो चाहिए? साइज़ चुनें, चाहें तो 20 या 50 KB जैसी सीमा डालें, और सही पिक्सल की JPG डाउनलोड करें। छापने के लिए प्रिंट शीट भी है।',
      steps: [
        { name: 'फोटो जोड़ें', text: 'हाल की, सामने से ली गई फोटो चुनें। सादा सफेद या हल्का बैकग्राउंड सबसे सुरक्षित है।' },
        { name: 'साइज़ चुनें', text: 'भारतीय फॉर्म के लिए 3.5 × 4.5 cm चुनें। चौकोर 51 × 51 mm (2 × 2 इंच) तभी चुनें जब आवेदन में वही माँगा गया हो।' },
        { name: 'KB तय करें', text: 'फॉर्म में "20 KB से कम" जैसा नियम हो तो अधिकतम साइज़ में 20 लिखें।' },
        { name: 'डाउनलोड या प्रिंट', text: 'पास चेक हरा होने पर JPG लें। कागज़ पर कई कॉपी चाहिए तो प्रिंट शीट टूल खोलें।' },
      ],
      faq: [
        {
          q: 'पासपोर्ट साइज़ फोटो का साइज़ cm में कितना होता है?',
          a: 'भारत में ज़्यादातर परीक्षा और नौकरी के फॉर्म में पासपोर्ट साइज़ का मतलब 3.5 cm चौड़ा और 4.5 cm ऊँचा होता है, यानी 35 × 45 mm।',
        },
        {
          q: 'पासपोर्ट साइज़ फोटो कितने पिक्सल की होती है?',
          a: '3.5 × 4.5 cm फोटो 200 DPI पर 276 × 354 पिक्सल और 300 DPI पर 413 × 531 पिक्सल की होती है। चौकोर 51 × 51 mm फोटो 200 DPI पर 402 × 402 पिक्सल की होती है।',
        },
        {
          q: 'पासपोर्ट के आवेदन के लिए कौन सा साइज़ लें?',
          a: 'पासपोर्ट और वीज़ा के नियम परीक्षा फॉर्म से अलग हो सकते हैं, और कई जगह चौकोर 2 × 2 इंच फोटो माँगी जाती है। आवेदन करते समय दिए गए फोटो निर्देश ज़रूर पढ़ें।',
        },
        {
          q: 'फोटो 20 KB में कैसे करें?',
          a: 'अधिकतम साइज़ में 20 डालें। 276 × 354 पिक्सल की फोटो आसानी से 20 KB के अंदर आ जाती है और साफ़ भी दिखती है।',
        },
      ],
      sections: [
        {
          h2: 'दो तरह की "पासपोर्ट साइज़" फोटो',
          paras: [
            'भारत में फॉर्म भरते समय जिसे पासपोर्ट साइज़ कहते हैं, वह आम तौर पर 3.5 × 4.5 cm की खड़ी फोटो है। स्टूडियो भी यही नाप छापते हैं। चौकोर 51 × 51 mm (2 × 2 इंच) फोटो कुछ पासपोर्ट और वीज़ा आवेदनों में माँगी जाती है। इसलिए जो नाप आपके फॉर्म में लिखा हो, वही चुनें।',
            'अगर फॉर्म सिर्फ पिक्सल देता है, जैसे बैंकिंग परीक्षाओं में 200 × 230 px, तो उस परीक्षा का किट खोलें। वहाँ पिक्सल और KB दोनों पहले से भरे होते हैं।',
          ],
        },
        {
          h2: 'स्टूडियो जैसी फोटो, मोबाइल से',
          paras: [
            'दिन की रोशनी में खिड़की की ओर मुँह करके खड़े हों, पीछे सफेद दीवार रखें और फ़ोन आँखों की ऊँचाई पर पकड़ें। गहरे रंग के कपड़े सफेद बैकग्राउंड पर अच्छे दिखते हैं। मुस्कान हल्की रखें, मुँह बंद। ज़ूम न करें; दूर से खींचकर बाद में क्रॉप करना बेहतर है।',
          ],
        },
        {
          h2: 'घर पर प्रिंट करें',
          paras: [
            'कागज़ वाली फोटो चाहिए तो प्रिंट शीट टूल एक ही फोटो की कई कॉपी A4 या 4 × 6 इंच फोटो पेपर पर कटिंग लाइन के साथ लगा देता है। 100% साइज़ पर प्रिंट करें।',
          ],
          links: [
            { href: '/tools/passport-photo-sheet', label: 'पासपोर्ट फोटो शीट (English)' },
            { href: '/hi/tools/photo-3-5x4-5-cm', label: '3.5 × 4.5 cm फोटो' },
            { href: '/hi/tools/compress-image-to-20kb', label: 'फोटो 20 KB में' },
          ],
        },
      ],
    };
  }
  return {
    title: 'Passport Size Photo Maker: 3.5×4.5 cm, Pixels and KB',
    description:
      'Free passport size photo maker: 3.5 × 4.5 cm (276 × 354 px) for Indian forms or square 51 × 51 mm, with a KB limit such as 20 KB. Nothing is uploaded.',
    h1: 'Passport size photo maker',
    intro:
      'Turn any clear selfie or photo into a passport size photo for an online form. Choose the size, set a KB limit if needed, and download. Need prints? Send it to the photo sheet tool.',
    steps: [
      { name: 'Add a photo', text: 'Use a recent, front-facing picture with a plain white or light background and even light.' },
      { name: 'Choose the size', text: 'Pick 3.5 × 4.5 cm for Indian exam and job forms. Choose the square 51 × 51 mm only when your application asks for it.' },
      { name: 'Set the KB', text: 'If the form says "under 20 KB" or "up to 50 KB", type that number in Max size.' },
      { name: 'Download or print', text: 'Save the JPG once the checks pass, or open the photo sheet tool to print several copies.' },
    ],
    faq: [
      {
        q: 'What is the passport size photo size in cm?',
        a: 'On Indian exam, job and admission forms, "passport size" almost always means 3.5 cm wide by 4.5 cm tall (35 × 45 mm). Photo studios print the same size.',
      },
      {
        q: 'How many pixels is a passport size photo?',
        a: 'A 3.5 × 4.5 cm photo is 276 × 354 px at 200 DPI and 413 × 531 px at 300 DPI. The square 51 × 51 mm option is 402 × 402 px at 200 DPI and 602 × 602 px at 300 DPI.',
      },
      {
        q: 'Which size do I need for a passport application?',
        a: 'Passport and visa rules can differ from exam forms; many ask for a square 2 × 2 inch (51 × 51 mm) photo. Always follow the photo instructions given with your own application.',
      },
      {
        q: 'How do I make a passport size photo of 20 KB?',
        a: 'Type 20 in Max size. A 276 × 354 px photo fits under 20 KB comfortably while still looking sharp; the pass check confirms the final size.',
      },
      {
        q: 'Is my photo uploaded?',
        a: 'No. The photo is resized and compressed inside your browser, on your device.',
      },
    ],
    sections: [
      {
        h2: 'Passport size width and height, explained',
        paras: [
          'Two different sizes travel under the same name. On Indian application forms and at local studios, passport size is the upright 3.5 × 4.5 cm photo. The square 51 × 51 mm (2 × 2 inch) photo is asked for by some passport and visa applications. Pick the size your form names; when it gives only pixels, follow the pixels.',
          'Many exams skip centimetres altogether. Banking forms, for instance, want 200 × 230 px between 20 and 50 KB. For those, open the exam kit, which already knows the pixels and KB range.',
        ],
      },
      {
        h2: 'From file to print',
        paras: [
          'For paper copies, the photo sheet tool lays out 4 copies on 4 × 6 inch photo paper or up to 16 on A4, with cut lines, at 300 DPI. Print at 100% so each copy keeps its true size.',
        ],
        links: [
          { href: '/tools/passport-photo-sheet', label: 'Passport photo sheet' },
          { href: '/tools/photo-3-5x4-5-cm', label: '3.5 × 4.5 cm photo' },
          { href: '/tools/compress-image-to-20kb', label: 'Photo to 20 KB' },
        ],
      },
    ],
  };
}

function postcard(): ToolCopy {
  return {
    title: 'Postcard Size Photo Maker: 4×6 inch (10.2×15.2 cm)',
    description:
      'Make a postcard size photo online: 4 × 6 inch (10.2 × 15.2 cm), 800 × 1200 px at 200 DPI or 1200 × 1800 px at 300 DPI. Add a KB limit. No upload.',
    h1: 'Postcard size photo maker (4 × 6 inch)',
    intro:
      'Convert a JPG to postcard size, 4 inches wide and 6 inches tall, ready to upload or print. The size is preset; choose the DPI and an optional KB limit.',
    steps: [
      { name: 'Add a photo', text: 'A postcard photo shows more than the face, usually head and shoulders or the upper body. Pick a picture that has room around you.' },
      { name: 'Choose 200 or 300 DPI', text: '200 DPI (800 × 1200 px) keeps the file small for uploads; 300 DPI (1200 × 1800 px) is for printing at a lab.' },
      { name: 'Set a KB limit', text: 'Postcard photos are large, so if the form caps the size, type the limit in Max size.' },
      { name: 'Download', text: 'Save the JPG once the pass check shows the right pixels and size.' },
    ],
    faq: [
      {
        q: 'What is postcard size photo in cm?',
        a: 'Postcard size is 4 × 6 inches, which is about 10.2 × 15.2 cm (10.16 × 15.24 cm exactly). It is the standard 4R print size at photo labs.',
      },
      {
        q: 'What are the postcard size photo dimensions in pixels?',
        a: '800 × 1200 pixels at 200 DPI and 1200 × 1800 pixels at 300 DPI. The photo is upright: the shorter side is the width.',
      },
      {
        q: 'Is a postcard size photo needed for NEET?',
        a: 'Earlier NEET UG cycles asked for a 4 × 6 inch postcard photo alongside the passport-size one. The NEET UG 2026 bulletin we track lists a single photograph of 10–200 KB with no pixel size, so check the current bulletin before making a postcard photo.',
      },
      {
        q: 'Why is my postcard photo cut at the sides?',
        a: 'A phone photo is usually 3:4, while postcard is 2:3. To avoid stretching, the tool trims evenly from the edges. Leave a little space around yourself when taking it.',
      },
    ],
    sections: [
      {
        h2: 'Postcard size vs passport size',
        paras: [
          'A passport size photo is a tight 3.5 × 4.5 cm crop of the face. A postcard photo is about four times taller and shows more of you, which lets an exam body compare it with the candidate on the day. Do not simply enlarge a small passport photo to postcard size; it will look blurry. Start from the original phone picture.',
          'Exam forms define postcard photos differently. DSSSB, for example, asks for its own postcard-style upper-body photo of 480 × 672 px and 50–300 KB; use the DSSSB kit for that one. For NEET UG, follow whatever the bulletin of your year says.',
        ],
      },
      {
        h2: 'Keeping the file inside the limit',
        paras: [
          'An 800 × 1200 px JPG is often between 100 and 250 KB. If your form allows, say, 200 KB at most, type 200 and the tool lowers the JPG quality just enough while keeping the exact size.',
        ],
        links: [
          { href: '/exam/neet-ug', label: 'NEET UG sizes' },
          { href: '/exam/dsssb', label: 'DSSSB sizes' },
          { href: '/tools/passport-size-photo', label: 'Passport size photo' },
        ],
      },
    ],
  };
}

function stamp(): ToolCopy {
  return {
    title: 'Stamp Size Photo Maker: 2 x 2.5 cm in Pixels, Free',
    description:
      'Make a stamp size photo online: commonly 2.0 × 2.5 cm, which is 157 × 197 px at 200 DPI or 236 × 295 px at 300 DPI. Add a KB limit. Never uploaded.',
    h1: 'Stamp size photo maker',
    intro:
      'A stamp size photo is the small portrait some forms, affidavits and ID cards ask for. The common size, 2.0 × 2.5 cm, is preset; adjust it if your form says otherwise.',
    steps: [
      { name: 'Pick a photo', text: 'Choose a clear front-facing picture. In such a small print the face must fill the frame, so crop close.' },
      { name: 'Check the size', text: '2.0 × 2.5 cm is filled in. If your form gives a different stamp size, type it in the cm fields.' },
      { name: 'Pick a DPI', text: 'Use 300 DPI for printing; 200 DPI is fine for uploads.' },
      { name: 'Download', text: 'Add a KB limit if needed, then save the JPG.' },
    ],
    faq: [
      {
        q: 'What is the stamp size photo size in cm?',
        a: 'It is commonly 2.0 cm wide and 2.5 cm tall. No single official definition exists, and some studios cut a little larger, such as 2.5 × 3 cm, so use the size your form names if it gives one.',
      },
      {
        q: 'How many pixels is a stamp size photo?',
        a: 'At 2.0 × 2.5 cm it is 157 × 197 px at 200 DPI and 236 × 295 px at 300 DPI.',
      },
      {
        q: 'Can I print many stamp photos on one sheet?',
        a: 'Yes. The photo sheet tool has a stamp option and places many copies on A4 or 4 × 6 inch paper with cut lines. Its stamp option is 25 × 30 mm, slightly larger than 2.0 × 2.5 cm.',
      },
      {
        q: 'Will a stamp photo be blurry?',
        a: 'Not if you start from a normal phone photo; shrinking keeps details sharp. Enlarging an already tiny image, such as one cropped from a group picture or a WhatsApp forward, is what causes blur.',
      },
    ],
    sections: [
      {
        h2: 'Where stamp size photos are used',
        paras: [
          'Stamp photos turn up on paper forms with a small photo box, affidavits, some office ID cards and older application formats. Because the box is small, a full passport-size photo would not fit, and a shrunken one shows too much background. A tight crop where the face takes most of the 2.0 × 2.5 cm area looks best.',
          'Online exam portals rarely say "stamp size"; they give pixels and KB instead. If your portal does that, use your exam kit or the custom size tool so both the pixels and the KB range are checked.',
        ],
      },
      {
        h2: 'Stamp size in other units',
        paras: ['If your form writes the size another way, these are the same photo:'],
        list: ['20 × 25 mm', 'about 0.79 × 0.98 inch', '157 × 197 px at 200 DPI, 236 × 295 px at 300 DPI'],
        links: [
          { href: '/tools/passport-photo-sheet', label: 'Print a photo sheet' },
          { href: '/tools/resize-image-in-mm', label: 'Resize in mm' },
          { href: '/tools/custom-preset', label: 'Custom size' },
        ],
      },
    ],
  };
}

export function sizePageCopy(page: SizePresetPage, lang: Lang = 'en'): ToolCopy {
  switch (page) {
    case 'photo-3-5x4-5-cm':
      return photo3545(lang);
    case 'passport-size-photo':
      return passportSize(lang);
    case 'resize-image-in-cm':
      return resizeInCm();
    case 'resize-image-in-mm':
      return resizeInMm();
    case 'postcard-size-photo':
      return postcard();
    case 'stamp-size-photo':
      return stamp();
  }
}
