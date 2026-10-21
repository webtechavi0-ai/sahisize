/**
 * Copy for T1 pages: /tools/compress-image and /tools/compress-image-to-[n]kb (EN), plus
 * provisional Hindi for compress-image, -20kb and -50kb (Workstream G polishes).
 * Each [n] page gets its own explanation (what usually needs that size, what to expect),
 * and a list of exams whose rules use exactly that maximum (built from published presets).
 */
import { compressMeta } from '@/seo/meta';
import type { Lang } from '@/config/site';
import { examsWithMaxKB } from '../presets-server';
import type { ToolCopy, ToolSection } from './types';

const lo = (n: number) => Math.round(n * 0.9);

interface KbNotes {
  uses: string;
  expect: string;
  tip: string;
  faq: { q: string; a: string }[];
}

/** Hand-written per size so every page says something different (SPEC 9.4). */
const EN_NOTES: Record<number, KbNotes> = {
  10: {
    uses: 'Ten kilobytes is the tightest limit you will meet on an exam form. It usually applies to signatures and thumb impressions, and sometimes to the minimum end of a photo rule (NTA forms accept photos from 10 KB). A 10 KB file is tiny: roughly a small signature strip of a few hundred pixels.',
    expect: 'A full phone photo cannot stay sharp at 10 KB, so we let the picture shrink in steps until it fits. For a signature on white paper, 10 KB is plenty and the ink stays crisp. For a face photo, the result will look soft when zoomed in, which portals accept.',
    tip: 'Crop away empty paper or background before compressing. Less area means more detail survives inside the same 10 KB.',
    faq: [
      { q: 'Why does my 10 KB photo look blurry when I zoom in?', a: 'At 10 KB there is room for only a small picture. On the portal it is shown small, so it looks normal there. If the form allows more, use 20 KB or 50 KB instead.' },
      { q: 'My form says "10 to 20 KB". Which page should I use?', a: 'Use the 20 KB page. Your file lands between 18 and 20 KB, which is inside 10–20 KB with a safe margin.' },
    ],
  },
  20: {
    uses: 'Twenty kilobytes is the most common upper limit for signatures. IBPS, SBI, RBI and NABARD forms ask for a 140×60 px signature of 10–20 KB, and SSC forms want a signature of 10–20 KB too. Many state forms use 20 KB for the thumb impression.',
    expect: 'The result lands between 18 and 20 KB, so it never crosses the limit and is still well above a 10 KB minimum. If your image is a large phone photo, it is made smaller in pixels so the quality stays readable.',
    tip: 'If the form also fixes the pixel size (like 140×60), use the Signature resize tool instead. It crops, cleans the paper to white and hits both the pixels and the KB range in one go.',
    faq: [
      { q: 'Will 19 KB be accepted where the form says 20 KB?', a: 'Yes. "Up to 20 KB" or "10–20 KB" means anything from the minimum up to 20 KB. We aim just under the limit so it is safe even if the portal counts 1 KB as 1000 bytes.' },
      { q: 'Can I make a photo exactly 20 KB?', a: 'Exactly 20.0 KB is rarely needed and risky. We target 18–20 KB, which every portal with a 20 KB limit accepts.' },
    ],
  },
  30: {
    uses: 'A 30 KB limit shows up on thumb impressions (SSC GD asks for 10–30 KB) and on signatures for some state commissions such as UPPSC, where the signature must stay under 30 KB.',
    expect: 'You get a file between 27 and 30 KB. That is enough for a clear thumb print or a signature of a few hundred pixels across, with clean edges and no visible blocks.',
    tip: 'For a thumb impression, press firmly on white paper with a blue or black ink pad and photograph it in daylight. A sharp, high-contrast print compresses far better than a faint one.',
    faq: [
      { q: 'Is 30 KB enough for a photo?', a: 'Usually yes for a passport-style photo of about 300×400 px. If your form allows 50 KB, the 50 KB page keeps more detail.' },
      { q: 'What if my form says 10–30 KB?', a: 'Use this page. The output lands at 27–30 KB, comfortably inside the range.' },
    ],
  },
  50: {
    uses: 'Fifty kilobytes is the classic photo limit. IBPS PO, IBPS Clerk, SBI and RBI forms ask for a 200×230 px photo of 20–50 KB, and the same 20–50 KB window applies to the left thumb impression (240×240 px). HTET, REET and UPPSC use a 50 KB cap as well.',
    expect: 'The result lands between 45 and 50 KB. For a face photo this is plenty: skin, hair and the edges of your face stay sharp, and the light background stays clean.',
    tip: 'If your form names exact pixels like 200×230, use that exam’s kit or the Custom size tool so the width and height are exact too. This page keeps your picture’s own shape.',
    faq: [
      { q: 'My photo is only 30 KB. Will it get bigger?', a: 'Yes, we raise the quality so it lands in 45–50 KB. If it still cannot reach that, invisible padding is added (no pixel changes) so the file passes a minimum.' },
      { q: 'Is 50 KB the same as 50,000 bytes?', a: 'Not quite. We use 1 KB = 1024 bytes, like most portals, and aim below 50 so it also passes if a portal uses 1000.' },
    ],
  },
  100: {
    uses: 'A 100 KB limit is common for signatures and photos on NTA, UPSC and defence forms: NEET UG and JEE Main accept a signature from 10 to 100 KB, UPSC CSE wants a 20–100 KB signature, and CTET and India Post GDS cap the photo at 100 KB. Many handwritten declarations must be 50–100 KB.',
    expect: 'You get 90–100 KB. At this size a phone photo of a face or a signed page keeps most of its detail, so the image looks sharp even when zoomed.',
    tip: 'For a handwritten declaration, write it on plain white paper, photograph it straight from above in good light, and crop to the text before compressing.',
    faq: [
      { q: 'Do I need to change the pixel size for 100 KB?', a: 'Usually not. A normal phone photo is reduced to a sensible size automatically, and you can switch on "Keep dimensions" if the pixels must not change.' },
      { q: 'My form says 50–100 KB. Is this the right page?', a: 'Yes. The result is 90–100 KB, which is inside 50–100 KB.' },
    ],
  },
  200: {
    uses: 'Two hundred kilobytes is the upper limit for photos on most NTA forms (NEET UG, JEE Main, CUET UG, UGC NET, CSIR NET accept 10–200 KB) and for UPSC, NDA and CDS photos (20–200 KB). The IAF Agniveervayu photo must be 100–200 KB.',
    expect: 'The result lands at 180–200 KB, which leaves a detailed, high-quality photo. If your file is already smaller, we raise the quality so it is not too small for a minimum.',
    tip: 'Large limits do not mean any photo works. Check the background colour and the face size rules on your exam page too; size is only one of the checks.',
    faq: [
      { q: 'Why make a 120 KB photo bigger?', a: 'Only if you choose 200 KB. If your form accepts 10–200 KB, a 120 KB photo is already fine, so pick a smaller target or upload it as it is.' },
      { q: 'Can I use this for a postcard-size photo?', a: 'Yes. Choose "Keep dimensions" to keep the exact pixels and only change the file size.' },
    ],
  },
  500: {
    uses: 'A 500 KB limit is for bigger documents: scanned certificates saved as images, caste or income certificates, admit card photos for some state forms, and documents that portals accept as JPG instead of PDF. IBPS asks for its 10th certificate as a PDF of up to 500 KB.',
    expect: 'The output is 450–500 KB, enough for a full page scan to stay readable. Text edges stay sharp and stamps remain legible.',
    tip: 'If the portal wants a PDF, not a JPG, use Images to PDF (it can combine several pages under one KB limit) or Compress PDF for a PDF you already have.',
    faq: [
      { q: 'My scan is 4 MB. Will the text still be readable at 500 KB?', a: 'Yes for a normal A4 page. The page is reduced to a sensible size and compressed; printed and handwritten text stay clear.' },
      { q: 'Can I compress several certificates at once?', a: 'Yes, use Batch compress: up to 20 images to the same target, downloaded as one ZIP.' },
    ],
  },
};

function examSection(n: number, lang: Lang): ToolSection | null {
  const refs = examsWithMaxKB(n, lang);
  if (!refs.length) return null;
  const seen = new Set<string>();
  const uniq = refs.filter((r) => (seen.has(r.slug) ? false : (seen.add(r.slug), true))).slice(0, 10);
  if (lang === 'hi') {
    return {
      h2: `किन परीक्षाओं में ${n} KB की सीमा है`,
      paras: [
        `ये फॉर्म ${n} KB की अधिकतम सीमा रखते हैं: ${refs
          .slice(0, 6)
          .map((r) => `${r.exam} (${r.doc}, ${r.range})`)
          .join('; ')}। पूरी जानकारी के लिए अपनी परीक्षा का पेज खोलें।`,
      ],
      links: uniq.map((r) => ({ href: r.href, label: r.exam })),
    };
  }
  return {
    h2: `Exams with a ${n} KB limit`,
    paras: [
      `These forms set a maximum of ${n} KB for at least one document: ${refs
        .slice(0, 6)
        .map((r) => `${r.exam} (${r.doc.toLowerCase()}, ${r.range})`)
        .join('; ')}. Open your exam page for the full rules, including pixel sizes and background.`,
    ],
    links: uniq.map((r) => ({ href: r.href, label: r.exam })),
  };
}

export function compressKbCopy(n: number, lang: Lang = 'en'): ToolCopy {
  const meta = compressMeta(n, lang);
  if (lang === 'hi') return compressKbCopyHi(n, meta);
  const notes = EN_NOTES[n]!;
  const sections: ToolSection[] = [
    { h2: `What needs a ${n} KB file`, paras: [notes.uses] },
    {
      h2: 'What you will get',
      paras: [
        notes.expect,
        `The file is a baseline JPG (not progressive), with no hidden location or camera data. The size check uses 1 KB = 1024 bytes, and we warn you if the file would pass only under the 1000-byte reading.`,
      ],
    },
    { h2: 'Tip before you compress', paras: [notes.tip] },
  ];
  const ex = examSection(n, 'en');
  if (ex) sections.push(ex);
  return {
    title: meta.title,
    description: meta.description,
    h1: `Compress photo to ${n} KB`,
    intro: `Your photo, signature or scan comes out between ${lo(n)} and ${n} KB as a JPG that exam portals accept. It all happens on your phone; nothing is uploaded.`,
    steps: [
      { name: 'Add your image', text: 'Take a photo or choose one from your gallery. JPG, PNG, WebP and iPhone HEIC photos all work.' },
      { name: 'Check the settings', text: `${n} KB is already selected. Add a minimum if your form has one, and choose whether the pixel size may change.` },
      { name: 'Wait a second', text: `We search for the highest quality that stays under ${n} KB, and shrink the picture only if it must.` },
      { name: 'Download', text: 'When every row of the pass check shows a tick, download the JPG and upload it to your form.' },
    ],
    faq: [
      ...notes.faq,
      { q: 'Is my photo uploaded anywhere?', a: 'No. Compression runs inside your browser on your own device. The page even works offline after your first visit.' },
    ],
    sections,
  };
}

function compressKbCopyHi(n: number, meta: { title: string; description: string }): ToolCopy {
  const uses: Record<number, string> = {
    20: 'सिग्नेचर के लिए सबसे आम सीमा 20 KB है। IBPS, SBI, RBI और NABARD के फॉर्म 140×60 px का 10–20 KB सिग्नेचर माँगते हैं, और SSC फॉर्म में भी सिग्नेचर 10–20 KB का होना चाहिए। कई राज्य फॉर्म में अंगूठे का निशान भी 20 KB तक होता है।',
    50: 'फोटो के लिए सबसे आम सीमा 50 KB है। IBPS PO, IBPS Clerk, SBI और RBI फॉर्म 200×230 px की 20–50 KB फोटो माँगते हैं, और बाएँ अंगूठे का निशान (240×240 px) भी 20–50 KB का होता है। HTET, REET और UPPSC में भी 50 KB की सीमा है।',
  };
  const tips: Record<number, string> = {
    20: 'अगर फॉर्म पिक्सेल भी तय करता है (जैसे 140×60), तो सिग्नेचर रिसाइज़ टूल इस्तेमाल करें। वह क्रॉप करता है, कागज़ को सफ़ेद करता है और पिक्सेल व KB दोनों एक साथ सही करता है।',
    50: 'अगर फॉर्म में 200×230 जैसे तय पिक्सेल लिखे हैं, तो अपनी परीक्षा का किट या कस्टम साइज़ टूल इस्तेमाल करें ताकि चौड़ाई और ऊँचाई भी सही हों। यह पेज आपकी फोटो का आकार वैसा ही रखता है।',
  };
  const sections: ToolSection[] = [
    { h2: `${n} KB फाइल कहाँ चाहिए`, paras: [uses[n] ?? ''] },
    {
      h2: 'आपको क्या मिलेगा',
      paras: [
        `फाइल ${lo(n)} से ${n} KB के बीच आती है, कभी सीमा से ऊपर नहीं। बड़ी फोन फोटो को ज़रूरत हो तो पिक्सेल में थोड़ा छोटा किया जाता है ताकि फोटो साफ़ दिखे।`,
        'फाइल baseline JPG होती है (progressive नहीं), और उसमें कैमरा या लोकेशन की छुपी जानकारी नहीं रहती। साइज़ 1 KB = 1024 bytes से जाँचा जाता है।',
      ],
    },
    { h2: 'कम्प्रेस करने से पहले एक टिप', paras: [tips[n] ?? ''] },
  ];
  const ex = examSection(n, 'hi');
  if (ex) sections.push(ex);
  return {
    title: meta.title,
    description: meta.description,
    h1: `फोटो को ${n} KB में कम करें`,
    intro: `आपकी फोटो, सिग्नेचर या स्कैन ${lo(n)} से ${n} KB के बीच की JPG बनकर आती है, जिसे परीक्षा पोर्टल स्वीकार करते हैं। सब कुछ आपके फोन में होता है, कुछ भी अपलोड नहीं होता।`,
    steps: [
      { name: 'फोटो जोड़ें', text: 'फोटो खींचें या गैलरी से चुनें। JPG, PNG, WebP और iPhone की HEIC फोटो सब चलती हैं।' },
      { name: 'सेटिंग देखें', text: `${n} KB पहले से चुना है। फॉर्म में न्यूनतम KB हो तो वह भी डालें।` },
      { name: 'एक पल रुकें', text: `हम ${n} KB के अंदर सबसे अच्छी क्वालिटी ढूँढते हैं।` },
      { name: 'डाउनलोड करें', text: 'पास चेक की हर लाइन पर टिक दिखे, तब JPG डाउनलोड करके फॉर्म में अपलोड करें।' },
    ],
    faq: [
      {
        q: `क्या फोटो ठीक ${n} KB की होगी?`,
        a: `फाइल ${lo(n)} से ${n} KB के बीच होगी, सीमा से ऊपर कभी नहीं। फॉर्म अधिकतम सीमा जाँचते हैं, इसलिए थोड़ा कम रहना सुरक्षित है।`,
      },
      {
        q: 'मेरी फोटो पहले से छोटी है, क्या वह बड़ी होगी?',
        a: `हाँ, क्वालिटी बढ़ाकर उसे ${lo(n)}–${n} KB में लाया जाता है ताकि न्यूनतम सीमा भी पास हो।`,
      },
      { q: 'क्या मेरी फोटो कहीं अपलोड होती है?', a: 'नहीं। सब कुछ आपके ब्राउज़र में, आपके फोन पर ही होता है। पहली बार के बाद यह पेज ऑफ़लाइन भी चलता है।' },
    ],
    sections,
  };
}

export function compressImageCopy(lang: Lang = 'en'): ToolCopy {
  if (lang === 'hi') {
    return {
      title: 'फोटो का साइज़ KB में कम करें — कोई भी KB, फ्री, कोई अपलोड नहीं',
      description: 'फोटो या सिग्नेचर को किसी भी KB में कम करें, चाहें तो न्यूनतम KB भी दें। सब आपके फोन में होता है, कुछ अपलोड नहीं होता।',
      h1: 'फोटो का साइज़ KB में कम करें',
      intro: 'टारगेट KB चुनें। फाइल उस सीमा से ठीक नीचे आती है, और चाहें तो पिक्सेल साइज़ वैसा ही रहता है।',
      steps: [
        { name: 'फोटो जोड़ें', text: 'फोटो खींचें या गैलरी से चुनें। फाइल आपके फोन में ही रहती है।' },
        { name: 'KB चुनें', text: '10 से 500 KB में से चुनें या अपना नंबर लिखें। न्यूनतम KB वैकल्पिक है।' },
        { name: 'डाउनलोड करें', text: 'पास चेक पर सब टिक हों, तब डाउनलोड करें।' },
      ],
      faq: [
        { q: 'फोटो का साइज़ KB में कैसे कम करें?', a: 'ऊपर फोटो चुनें, टारगेट KB चुनें, और कुछ ही सेकंड में नई फाइल तैयार हो जाती है। फाइल टारगेट के 10% के अंदर, उससे नीचे आती है।' },
        { q: '"Keep dimensions" का क्या मतलब है?', a: 'यह चालू हो तो फोटो के पिक्सेल (चौड़ाई × ऊँचाई) नहीं बदलते, सिर्फ़ क्वालिटी कम होती है। बंद हो तो ज़रूरत पड़ने पर फोटो छोटी भी की जा सकती है, जिससे कम KB में भी फोटो साफ़ रहती है।' },
        { q: 'न्यूनतम KB क्यों चाहिए?', a: 'कई फॉर्म, जैसे IBPS, 20 KB से छोटी फोटो नहीं लेते। न्यूनतम डालने पर फाइल उससे छोटी नहीं होगी।' },
        { q: 'क्या यह ऑफ़लाइन चलता है?', a: 'हाँ। एक बार पेज खुलने के बाद इंटरनेट बंद होने पर भी यह टूल चलता है।' },
      ],
      sections: [
        {
          h2: 'KB और पिक्सेल में फ़र्क',
          paras: [
            'पिक्सेल फोटो की चौड़ाई और ऊँचाई है, जैसे 200×230। KB फाइल का साइज़ है, यानी फोन में फाइल कितनी जगह लेती है। एक ही पिक्सेल की फोटो क्वालिटी के हिसाब से 15 KB की भी हो सकती है और 80 KB की भी। यह टूल क्वालिटी को इस तरह चुनता है कि फाइल आपकी सीमा के ठीक नीचे आए।',
            'हम 1 KB = 1024 bytes मानते हैं, जैसे ज़्यादातर पोर्टल मानते हैं, और अगर फाइल सिर्फ़ 1000 bytes वाले हिसाब से पास होती हो तो चेतावनी देते हैं।',
          ],
        },
        {
          h2: 'आम सीमाएँ',
          paras: ['बैंकिंग फॉर्म में फोटो 20–50 KB और सिग्नेचर 10–20 KB होता है। NTA फॉर्म (NEET, JEE, CUET) में फोटो 10–200 KB तक चलती है। सीधे इन पेजों पर जाएँ:'],
          links: [
            { href: '/hi/tools/compress-image-to-20kb', label: '20 KB' },
            { href: '/hi/tools/compress-image-to-50kb', label: '50 KB' },
            { href: '/tools/compress-image-to-100kb', label: '100 KB' },
            { href: '/tools/compress-image-to-200kb', label: '200 KB' },
          ],
        },
      ],
    };
  }
  return {
    title: 'Compress Image to Any KB Online Free — Exact Size, No Upload',
    description:
      'Compress a photo or signature to any target KB, with an optional minimum. The result lands just under your limit. Processed on your device, never uploaded.',
    h1: 'Compress image to any KB',
    intro: 'Pick a target size in KB. The result lands just under it, within 10%, and keeps the same pixel size if you want.',
    steps: [
      { name: 'Add your image', text: 'Take a photo or choose one from your gallery. JPG, PNG, WebP and HEIC work, and the file stays on your device.' },
      { name: 'Choose the size', text: 'Tap a preset from 10 to 500 KB or type your own. Add a minimum KB if your form has one.' },
      { name: 'Pick keep or shrink', text: 'Keep dimensions changes only the quality. Allowing downscale lets the picture get smaller so it stays sharp at low KB.' },
      { name: 'Download', text: 'When the pass check shows all ticks, download the JPG.' },
    ],
    faq: [
      { q: 'How exact is the size?', a: 'The file always lands between 90% and 100% of your target, never over it. For a 50 KB target that means 45–50 KB.' },
      { q: 'What does "Keep dimensions" do?', a: 'It keeps the width and height in pixels exactly as they are and only lowers the JPEG quality. Turn it off to let the picture shrink when a low KB target would otherwise make it blocky.' },
      { q: 'Why would I set a minimum KB?', a: 'Some forms reject files that are too small, for example IBPS photos must be at least 20 KB. With a minimum set, the file never goes below it.' },
      { q: 'Does it work with iPhone HEIC photos?', a: 'Yes. HEIC photos are opened on your device and saved as JPG, which every portal accepts.' },
      { q: 'Is this safe for my documents?', a: 'Yes. Nothing is uploaded. All processing runs in your browser, and the page works offline after the first visit.' },
    ],
    sections: [
      {
        h2: 'KB and pixels are different things',
        paras: [
          'Pixels are the width and height of the picture, such as 200×230. Kilobytes are how much space the file takes. The same 200×230 photo can be 15 KB or 80 KB depending on the JPEG quality. This tool searches for the highest quality that keeps the file under your target, so you lose as little detail as possible.',
          'We count 1 KB as 1024 bytes, the way most portals do, and warn you if a file would pass only when 1 KB is read as 1000 bytes.',
        ],
      },
      {
        h2: 'Popular sizes',
        paras: ['Banking forms want photos of 20–50 KB and signatures of 10–20 KB. NTA forms such as NEET, JEE Main and CUET accept photos from 10 to 200 KB. Jump straight to a size:'],
        links: [10, 20, 30, 50, 100, 200, 500].map((n) => ({ href: `/tools/compress-image-to-${n}kb`, label: `${n} KB` })),
      },
    ],
  };
}
