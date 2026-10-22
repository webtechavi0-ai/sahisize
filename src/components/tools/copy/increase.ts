/**
 * Copy for /tools/increase-image-size-in-kb (EN + HI). Exam numbers come from published,
 * verified presets only (tests/presets/toverify-copy.test.ts guards this).
 */
import type { Lang } from '@/config/site';
import type { ToolCopy } from './types';

export function increaseCopy(lang: Lang = 'en'): ToolCopy {
  if (lang === 'hi') {
    return {
      title: 'फोटो का KB बढ़ाएँ — फोटो वैसी ही रहे, फ्री और बिना अपलोड',
      description:
        'फोटो या सिग्नेचर का साइज़ KB में बढ़ाएँ, जैसे IBPS फोटो के लिए कम से कम 20 KB। पिक्सल वही रहते हैं, फोटो वैसी ही दिखती है, और कुछ भी अपलोड नहीं होता।',
      h1: 'फोटो का साइज़ KB में बढ़ाएँ',
      intro:
        'फॉर्म कहता है फोटो कम से कम 20 KB की हो, पर आपकी फाइल सिर्फ़ 12 KB है? यहाँ फोटो का KB बढ़ाएँ: कम से कम साइज़ चुनें, पिक्सल वही रखें, और ऐसी फाइल डाउनलोड करें जो पोर्टल की साइज़ जाँच में पास हो।',
      steps: [
        { name: 'फोटो या सिग्नेचर जोड़ें', text: 'फोन या कंप्यूटर से JPG, PNG, WebP या HEIC फाइल चुनें। फाइल आपके डिवाइस पर ही खुलती है, कहीं भेजी नहीं जाती।' },
        { name: 'कम से कम साइज़ चुनें', text: '10, 20, 30, 50 या 100 KB दबाएँ, या अपना नंबर लिखें। ज़्यादा से ज़्यादा साइज़ अपने फॉर्म से भरें; हर बटन एक आम रेंज से शुरू होता है, जैसे 20–50 KB।' },
        { name: 'पिक्सल वही रखें', text: '"पिक्सल साइज़ वही रखें" चालू रहने दें, ताकि चौड़ाई और ऊँचाई न बदले। इसे सिर्फ़ तब बंद करें जब बहुत बड़ी फोटो अधिकतम साइज़ से ऊपर जा रही हो।' },
        { name: 'जाँचें और डाउनलोड करें', text: 'पास चेक में नया साइज़ आपकी रेंज के साथ दिखता है। हर लाइन पर टिक हो, तब JPG डाउनलोड करें।' },
      ],
      faq: [
        { q: 'KB बढ़ाने से फोटो धुंधली तो नहीं होगी?', a: 'नहीं। फोटो को खींचा या ज़ूम नहीं किया जाता। उसे ज़्यादा क्वालिटी पर सेव किया जाता है, और बाकी साइज़ न दिखने वाले नॉइज़ या छिपे डेटा से आता है। चौड़ाई और ऊँचाई वही रहती हैं।' },
        { q: 'फोटो 10 KB से 20 KB कैसे करें?', a: 'कम से कम साइज़ 20 KB चुनें और ज़्यादा से ज़्यादा वह भरें जो फॉर्म में लिखा है, जैसे 50 KB। फाइल 20 KB से थोड़ी ऊपर बनती है, यानी रेंज के अंदर सुरक्षित।' },
        { q: 'मैंने PNG डाली थी, फिर JPG क्यों मिली?', a: 'एग्ज़ाम पोर्टल लगभग हमेशा JPG या JPEG माँगते हैं, और JPG का साइज़ ठीक से सेट किया जा सकता है। PNG का पारदर्शी हिस्सा सफेद हो जाता है।' },
        { q: 'क्या पोर्टल को जोड़ा गया डेटा दिखता है?', a: 'जोड़ा गया डेटा JPEG का एक सामान्य कमेंट हिस्सा है, जिसे हर फोटो ऐप और पोर्टल छोड़ देता है। पोर्टल वही फोटो पढ़ता है, बस फाइल का साइज़ बड़ा दिखता है।' },
        { q: 'क्या मेरी फोटो किसी सर्वर पर जाती है?', a: 'नहीं। सारा काम आपके ब्राउज़र में होता है। पेज खुलने के बाद आप फ्लाइट मोड भी चालू कर सकते हैं।' },
      ],
      sections: [
        {
          h2: 'पोर्टल कम से कम KB क्यों माँगते हैं',
          paras: [
            'ज़्यादातर लोग फोटो छोटी करने का तरीका ढूँढते हैं, इसलिए "कम से कम 20 KB" वाला नियम कई उम्मीदवारों को चौंका देता है। नोटिस में आम तौर पर इसकी वजह नहीं लिखी होती। सबसे संभावित वजह क्वालिटी है: बहुत छोटी फाइल अक्सर थंबनेल, स्क्रीनशॉट या बार-बार दबाई गई कॉपी होती है, जो एडमिट कार्ड पर साफ़ नहीं छपती और परीक्षा केंद्र पर चेहरे से मिलाना मुश्किल करती है।',
            'जिन ऑफिशियल नोटिस को हम ट्रैक करते हैं, उनमें कम से कम साइज़ ऐसे हैं:',
          ],
          list: [
            'IBPS PO, IBPS Clerk, SBI और RBI: फोटो 20–50 KB, सिग्नेचर 10–20 KB, बाएँ अंगूठे का निशान 20–50 KB, हाथ से लिखा डिक्लेरेशन 50–100 KB।',
            'RRB NTPC, RRB ALP और RRB Group D: सिग्नेचर 30–49 KB।',
            'NEET UG, JEE Main और CUET UG: फोटो 10–200 KB।',
            'UPSC CSE: फोटो 20–200 KB, सिग्नेचर 20–100 KB।',
            'IAF अग्निवीरवायु: फोटो 100–200 KB।',
          ],
        },
        {
          h2: 'फोटो बदले बिना साइज़ कैसे बढ़ता है',
          paras: [
            'JPG फाइल का साइज़ उसकी क्वालिटी सेटिंग और फोटो की बारीकी पर टिका होता है। पहले हम फोटो को ज़्यादा क्वालिटी पर दोबारा सेव करते हैं, जिससे वह वैसी ही या थोड़ी साफ़ दिखती है। सफेद कागज़ पर सिग्नेचर जैसी सादी फोटो सबसे अच्छी क्वालिटी पर भी छोटी रह सकती है। तब हम एक-दो लेवल का बहुत हल्का नॉइज़ जोड़ते हैं, जो आँख से नहीं दिखता, और फिर भी कम पड़े तो फाइल के अंदर एक छिपा कमेंट हिस्सा। इससे फाइल का साइज़ बदलता है, फोटो नहीं।',
            'हम 1 KB को 1024 बाइट मानते हैं, और फाइल को अधिकतम से नीचे रखते हैं, भले पोर्टल 1 KB को 1000 बाइट गिने।',
          ],
        },
        {
          h2: 'सिग्नेचर का KB बढ़ाना',
          paras: [
            'सबसे ज़्यादा यही दिक्कत सिग्नेचर में आती है। सफेद कागज़ पर साफ़ सिग्नेचर 140×60 px पर अक्सर कुछ ही KB का होता है, जबकि बैंकिंग फॉर्म कम से कम 10 KB माँगते हैं। अगर फॉर्म पिक्सल भी तय करता है, तो सिग्नेचर रीसाइज़ टूल लें: वह क्रॉप, सफ़ाई और KB एक साथ ठीक करता है। सिर्फ़ KB गलत हो, तो यहाँ 10 KB चुनें और अधिकतम साइज़ फॉर्म से भरें।',
          ],
          links: [
            { href: '/hi/tools/signature-resize', label: 'सिग्नेचर रीसाइज़' },
            { href: '/hi/tools/compress-image', label: 'फोटो का साइज़ कम करें' },
          ],
        },
      ],
    };
  }
  return {
    title: 'Increase Image Size in KB — Photo Looks the Same, Free',
    description:
      'Increase photo or signature size in KB to meet a form’s minimum, like 20 KB for IBPS photos. Pixels stay the same, it looks the same, nothing is uploaded.',
    h1: 'Increase image size in KB',
    intro:
      'Your form says the photo must be at least 20 KB, but your file is only 12 KB? Increase the image size in KB here: pick the minimum, keep the same pixels, and download a file that passes the portal’s size check.',
    steps: [
      { name: 'Add your photo or signature', text: 'Pick a JPG, PNG, WebP or HEIC file from your phone or computer. It opens on your device and is never uploaded.' },
      { name: 'Choose the minimum', text: 'Tap 10, 20, 30, 50 or 100 KB, or type your own. Set the maximum from your form; each chip starts at a common range, such as 20–50 KB.' },
      { name: 'Keep the pixels', text: 'Leave Keep pixel size on so the width and height do not change. Turn it off only if a very large photo goes over the maximum.' },
      { name: 'Check and download', text: 'The pass check shows the new size against your range. When every row has a tick, download the JPG.' },
    ],
    faq: [
      { q: 'Will increasing the KB make my photo blurry?', a: 'No. Nothing is stretched or zoomed. The picture is saved at a higher quality, and any extra size comes from invisible noise or hidden data. Width and height stay the same.' },
      { q: 'How do I increase photo size from 10 KB to 20 KB?', a: 'Choose 20 KB as the minimum and set the maximum your form allows, for example 50 KB. The file lands a little above 20 KB, safely inside the range.' },
      { q: 'Why do I get a JPG when I uploaded a PNG?', a: 'Exam portals almost always ask for JPG or JPEG, and a JPG’s size can be tuned. A transparent PNG background becomes white.' },
      { q: 'Can the portal see the added data?', a: 'The added data is a standard JPEG comment block that every image viewer and portal skips. The portal reads the same picture; only the file size is bigger.' },
      { q: 'Is my photo uploaded to a server?', a: 'No. Everything runs in your browser. You can even switch on flight mode once the page has loaded.' },
    ],
    sections: [
      {
        h2: 'Why exam portals set a minimum KB',
        paras: [
          'Most people look for ways to make a photo smaller, so a rule like “at least 20 KB” catches many applicants out. Notices rarely say why they set a minimum. The likely reason is quality: a very small file is often a thumbnail, a screenshot or a copy compressed many times, which prints badly on the admit card and is hard to match with your face at the exam centre.',
          'Minimums in the official notices we track:',
        ],
        list: [
          'IBPS PO, IBPS Clerk, SBI and RBI: photo 20–50 KB, signature 10–20 KB, left thumb impression 20–50 KB, handwritten declaration 50–100 KB.',
          'RRB NTPC, RRB ALP and RRB Group D: signature 30–49 KB.',
          'NEET UG, JEE Main and CUET UG: photo 10–200 KB.',
          'UPSC CSE: photo 20–200 KB, signature 20–100 KB.',
          'IAF Agniveervayu: photo 100–200 KB.',
        ],
      },
      {
        h2: 'How the size goes up without changing the photo',
        paras: [
          'A JPG’s size depends on its quality setting and on how much detail the picture has. First we save your picture again at a higher quality, which keeps it looking the same or a little cleaner. A plain picture, like a signature on white paper, can stay small even at the best quality. Then we add very faint noise of a level or two, which you cannot see, and if that is still not enough, a hidden comment block inside the file. That changes the file size, not the picture.',
          'We count 1 KB as 1024 bytes and keep the file under your maximum even if the portal counts 1 KB as 1000 bytes.',
        ],
      },
      {
        h2: 'Signature KB increase',
        paras: [
          'Signatures are the most common case. A clean signature on white paper at 140×60 px is often only a few KB, while banking forms want at least 10 KB. If your form also fixes the pixels, use the Signature resize tool: it crops, cleans and fits the KB range in one go. If only the KB is wrong, choose 10 KB here and the maximum from your form.',
        ],
        links: [
          { href: '/tools/signature-resize', label: 'Signature resize' },
          { href: '/tools/compress-image', label: 'Compress image (make it smaller)' },
        ],
      },
    ],
  };
}
