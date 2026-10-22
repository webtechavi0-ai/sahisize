/**
 * Copy for the KB-range pages (/tools/compress-image-{a}kb-to-{b}kb, T1 with a minimum
 * preset) and /tools/mb-to-kb-photo (T1 framed as "photo MB to KB"). Keyword targets:
 * docs/seo/keyword-map.md. Exam names come from verified, published presets only.
 */
import type { Lang } from '@/config/site';
import { COMPRESS_KB_RANGES, compressRangePath, compressToKbPath } from '@/config/tools';
import { hindiToolPath } from '@/seo/hreflang';
import { examsWithRange } from '../presets-server';
import type { ToolCopy, ToolSection } from './types';

interface RangeText {
  title: string;
  description: string;
  h1: string;
  intro: string;
  whyH2: string;
  why: string;
  examsH2: string;
  exams: string;
  pixelsH2: string;
  pixels: string;
  landH2: string;
  land: string;
  faq: { q: string; a: string }[];
}

const RANGES_EN: Record<string, RangeText> = {
  '10-20': {
    title: '10 KB to 20 KB Photo Size: Resize Within Range | SahiSize',
    description:
      'Get the 10 KB to 20 KB photo size signature fields ask for: a JPG that lands at 18–20 KB, never under 10 KB. Free, on your phone, never uploaded.',
    h1: '10 KB to 20 KB photo size, ready to upload',
    intro:
      'Get the 10 KB to 20 KB photo size in one step. The minimum is already set to 10 KB and the target to 20 KB, so your signature or photo comes out as a JPG inside the range.',
    whyH2: 'Why a portal asks for 10 to 20 KB',
    why: 'A range has two jobs. The 20 KB cap keeps millions of uploads small enough to store and to print on admit cards and attendance sheets. The 10 KB floor catches files too small to be useful: a near-blank signature, a photo of a photo, or an image squeezed so hard that the strokes break up. A signature that weighs only 4 KB is usually one of those, and the portal rejects it before a person ever sees it.',
    examsH2: 'Forms that use 10–20 KB',
    exams:
      'The 10–20 KB window is the standard signature rule for banking and SSC. IBPS PO, IBPS Clerk, IBPS RRB, SBI PO, SBI Clerk, RBI and NABARD want a 140×60 px signature inside it, and SSC CGL, CHSL, MTS, CPO and GD use it at larger pixel sizes.',
    pixelsH2: '10 KB to 20 KB photo size in pixels',
    pixels:
      'Pixels and kilobytes are separate rules, and many forms set both. Banking signatures are 140×60 px, SSC CGL, CHSL, MTS and CPO signatures 472×157 px, and SSC GD 709×236 px. At those sizes a clean signature lands inside 10–20 KB easily. A face photo in this range is small, roughly 120×160 to 170×230 px, which is why photo rules usually start at 20 KB.',
    landH2: 'Where in the range your file lands',
    land: 'The tool aims near the top, at 18–20 KB, because more kilobytes keep more detail. If you prefer the middle, type a lower target such as 15 KB: the 10 KB minimum stays filled in, so the file can never slip under the floor.',
    faq: [
      {
        q: 'Can I convert a photo into a 10 KB to 20 KB JPG here?',
        a: 'Yes. Add the photo and download: the result is a JPG between 18 and 20 KB. PNG and HEIC photos are converted to JPG on the way.',
      },
      {
        q: 'Is exactly 20 KB allowed in a 10–20 KB rule?',
        a: 'Yes, the limits are inclusive. We still stop just under 20 KB, and under 20,000 bytes, so the file passes however the portal counts.',
      },
      {
        q: 'Why did the portal reject my 12 KB signature?',
        a: 'If the size is inside the range, check the other rules: the pixel size (for example 140×60), the file type (JPG) and that the signature is not cut off. The Signature resize tool handles all three.',
      },
    ],
  },
  '20-50': {
    title: 'Photo Convert into 20 KB to 50 KB JPG | SahiSize',
    description:
      'Photo convert into 20 KB to 50 KB JPG for bank forms: the minimum and maximum are preset and the result lands at 45–50 KB. Free, nothing is uploaded.',
    h1: 'Photo convert into 20 KB to 50 KB JPG',
    intro:
      'Photo convert into 20 KB to 50 KB JPG in one step: the minimum is set to 20 KB and the target to 50 KB, so your photo or thumb impression always comes out inside the range.',
    whyH2: 'Why bank forms set 20 to 50 KB',
    why: 'Your application photo is kept for the whole recruitment: it is printed on the admit card and checked against your face at the exam centre. The 20 KB floor makes sure the picture has enough detail for that, because a photo squeezed under 20 KB often loses the eyes and the outline of the face. The 50 KB cap keeps each upload light for a portal that receives lakhs of forms in a few weeks.',
    examsH2: 'Forms that use 20–50 KB',
    exams:
      'The 20–50 KB window covers the 200×230 px photograph and the 240×240 px left thumb impression on IBPS PO, IBPS Clerk, IBPS SO, IBPS RRB, SBI PO, SBI Clerk, RBI Assistant, RBI Grade B and NABARD forms. REET uses it for both the photo and the signature, and HTET for the photo at 276×354 px.',
    pixelsH2: '20 to 50 KB photo size in pixels',
    pixels:
      'A banking photo is 200×230 px and a left thumb impression 240×240 px; both sit comfortably in 20–50 KB at high quality. If your form does not fix the pixels, a portrait of about 190×250 to 270×360 px fills the range well.',
    landH2: 'Where in the range your file lands',
    land: 'The output lands at 45–50 KB, near the top, where the face keeps the most detail. To land in the middle instead, type 35 as the target. The 20 KB minimum stays set, so even a very plain photo is never saved below it; the tool raises the quality, or adds invisible padding, until it is inside.',
    faq: [
      {
        q: 'Is a 20 to 50 KB photo size enough for a passport-size photo?',
        a: 'Yes. At 20 KB a 200×230 photo is clear, and at 50 KB it stays sharp even when zoomed.',
      },
      {
        q: 'My photo is 60 KB. Will it still fit?',
        a: 'Yes. It is compressed to 45–50 KB. With Keep dimensions on, only the quality drops; otherwise the picture may also get a little smaller.',
      },
      {
        q: 'Can I do the thumb impression here too?',
        a: 'Yes, it has the same 20–50 KB rule. For the exact 240×240 px square, use the Thumb impression tool, which also crops it.',
      },
    ],
  },
  '50-100': {
    title: 'Photo Compress 50 to 100 KB: Fit the Range | SahiSize',
    description:
      'Photo compress 50 to 100 KB for declarations, ID cards and thumb prints: the minimum is preset and the result lands at 90–100 KB. Free, never uploaded.',
    h1: 'Photo compress 50 to 100 KB',
    intro:
      'Photo compress 50 to 100 KB without guesswork: the minimum is set to 50 KB and the target to 100 KB, so your declaration, scan or photo always lands inside the range.',
    whyH2: 'Why some uploads need at least 50 KB',
    why: 'A 50 KB floor is for images that must stay readable: a handwritten declaration, an Aadhaar card, a marksheet, a clear thumb print. Squeeze a page of handwriting to 15 KB and the letters smear into each other, so nobody can check what you wrote. The floor prevents that, and the 100 KB cap keeps the file small enough to upload over a phone connection.',
    examsH2: 'Forms that use 50–100 KB',
    exams:
      'The handwritten declaration on IBPS PO, IBPS Clerk, IBPS SO, IBPS RRB, SBI PO, SBI Clerk, RBI and NABARD forms must be 50–100 KB at 800×400 px. REET wants the Aadhaar card and the Class 10 marksheet as 50–100 KB JPGs, and IAF Agniveervayu sets 50–100 KB for the left thumb impression.',
    pixelsH2: '50 to 100 KB photo size in pixels',
    pixels:
      'The banking declaration is 800×400 px, wide and short, so a handwritten paragraph fits at a readable size. A document photo such as an Aadhaar card needs roughly 800–1000 px on its long side to keep the small print. For a face photo, 50–100 KB is generous: about 270×360 to 390×520 px.',
    landH2: 'Where in the range your file lands',
    land: 'Results land at 90–100 KB. For more headroom, type 75 as the target: the file then lands at 67.5–75 KB, and the 50 KB minimum still guards the floor.',
    faq: [
      {
        q: 'What about a 50 to 150 KB photo size JPG?',
        a: 'Type 150 as the target. The 50 KB minimum stays, and the file lands at 135–150 KB.',
      },
      {
        q: 'My declaration is a 3 MB photo. Will the text survive?',
        a: 'Yes. It is reduced to a sensible size first, and at 90–100 KB handwriting stays crisp. For the exact 800×400 px, use the Handwritten declaration tool.',
      },
      {
        q: 'Why was my 45 KB declaration rejected?',
        a: 'It is under the 50 KB minimum. Run it through this page: the quality is raised, and if needed invisible padding is added, until it is inside 50–100 KB.',
      },
    ],
  },
};

const RANGES_HI: Record<string, RangeText> = {
  '20-50': {
    title: '20 से 50 KB फोटो साइज़: फोटो रेंज में करें | SahiSize',
    description:
      'फोटो को 20 KB से 50 KB की JPG में बदलें: न्यूनतम और अधिकतम पहले से भरे हैं, फाइल 45–50 KB की बनती है। बैंक फॉर्म के लिए, फ्री, कोई अपलोड नहीं।',
    h1: 'फोटो को 20 KB से 50 KB की JPG बनाएँ',
    intro:
      'फोटो को 20 KB से 50 KB की JPG में एक ही बार में बदलें। न्यूनतम 20 KB और टारगेट 50 KB पहले से भरा है, इसलिए आपकी फोटो या अंगूठे का निशान हमेशा इसी दायरे में आता है।',
    whyH2: 'बैंक फॉर्म 20 से 50 KB क्यों माँगते हैं',
    why: 'आपकी फोटो पूरी भर्ती के दौरान काम आती है: वह एडमिट कार्ड पर छपती है और परीक्षा केंद्र पर आपके चेहरे से मिलाई जाती है। 20 KB की न्यूनतम सीमा यह पक्का करती है कि फोटो में इतनी डिटेल रहे, क्योंकि 20 KB से नीचे दबाई गई फोटो में अक्सर आँखें और चेहरे की रेखा धुंधली हो जाती है। 50 KB की ऊपरी सीमा हर फाइल को हल्का रखती है, क्योंकि कुछ ही हफ़्तों में लाखों फॉर्म आते हैं।',
    examsH2: 'किन फॉर्म में 20–50 KB चाहिए',
    exams:
      'IBPS PO, IBPS Clerk, IBPS SO, IBPS RRB, SBI PO, SBI Clerk, RBI Assistant, RBI Grade B और NABARD में 200×230 px की फोटो और 240×240 px का बाएँ अंगूठे का निशान, दोनों 20–50 KB के होते हैं। REET में फोटो और सिग्नेचर दोनों इसी दायरे में हैं, और HTET में 276×354 px की फोटो।',
    pixelsH2: '20 से 50 KB फोटो पिक्सल में',
    pixels:
      'बैंक की फोटो 200×230 px और अंगूठे का निशान 240×240 px का होता है; दोनों ऊँची क्वालिटी पर भी 20–50 KB में आराम से आ जाते हैं। फॉर्म पिक्सल तय न करे तो लगभग 190×250 से 270×360 px की फोटो इस दायरे में अच्छी बैठती है।',
    landH2: 'फाइल दायरे में कहाँ आती है',
    land: 'फाइल 45–50 KB की बनती है, दायरे के ऊपरी हिस्से में, जहाँ चेहरे की सबसे ज़्यादा डिटेल बचती है। बीच में चाहिए तो टारगेट 35 लिख दें। न्यूनतम 20 KB भरा रहता है, इसलिए सादी फोटो भी उससे नीचे सेव नहीं होती; टूल क्वालिटी बढ़ाता है या अदृश्य पैडिंग जोड़ता है।',
    faq: [
      {
        q: 'क्या पासपोर्ट साइज़ फोटो के लिए 20 से 50 KB काफ़ी है?',
        a: 'हाँ। 20 KB पर भी 200×230 की फोटो साफ़ रहती है, और 50 KB पर ज़ूम करने पर भी तेज़ दिखती है।',
      },
      {
        q: 'मेरी फोटो 60 KB की है, क्या वह फिट होगी?',
        a: 'हाँ, उसे 45–50 KB में कम किया जाता है। "Keep dimensions" चालू हो तो सिर्फ क्वालिटी घटती है, वरना फोटो थोड़ी छोटी भी हो सकती है।',
      },
      {
        q: 'क्या अंगूठे का निशान भी यहाँ बना सकते हैं?',
        a: 'हाँ, उसका नियम भी 20–50 KB है। ठीक 240×240 px के चौकोर के लिए थंब इम्प्रेशन टूल इस्तेमाल करें, वह क्रॉप भी करता है।',
      },
    ],
  },
};

function rangeSteps(a: number, b: number, lang: Lang): ToolCopy['steps'] {
  if (lang === 'hi') {
    return [
      { name: 'फोटो जोड़ें', text: 'फोटो खींचें या गैलरी से चुनें। JPG, PNG, WebP और HEIC सब चलती हैं।' },
      { name: 'दोनों सीमाएँ देखें', text: `न्यूनतम ${a} KB और टारगेट ${b} KB भरा है। फॉर्म कुछ और कहे तभी बदलें।` },
      { name: 'एक पल रुकें', text: `टूल ${b} KB के अंदर सबसे अच्छी क्वालिटी रखता है और ${a} KB से नीचे कभी नहीं जाता।` },
      { name: 'डाउनलोड करें', text: 'पास चेक पर सब टिक हों, तब JPG सेव करके अपलोड करें।' },
    ];
  }
  return [
    { name: 'Add your image', text: 'Take a photo or choose one from your gallery. JPG, PNG, WebP and HEIC files all work.' },
    { name: 'Check both limits', text: `The minimum is set to ${a} KB and the target to ${b} KB. Change them only if your form says something different.` },
    { name: 'Let it work', text: `The tool keeps the highest quality that fits under ${b} KB and never goes below ${a} KB.` },
    { name: 'Download', text: 'When the pass check shows all ticks, save the JPG and upload it.' },
  ];
}

const PRIVACY = {
  en: { q: 'Is my photo uploaded anywhere?', a: 'No. Compression runs inside your browser on your own device. The page even works offline after your first visit.' },
  hi: { q: 'क्या मेरी फोटो कहीं अपलोड होती है?', a: 'नहीं। सब कुछ आपके ब्राउज़र में, आपके फोन पर ही होता है। पहली बार के बाद यह पेज ऑफ़लाइन भी चलता है।' },
};

export function hasRangeCopy(a: number, b: number, lang: Lang): boolean {
  return !!(lang === 'hi' ? RANGES_HI : RANGES_EN)[`${a}-${b}`];
}

export function compressRangeCopy(a: number, b: number, lang: Lang = 'en'): ToolCopy {
  const r = (lang === 'hi' ? RANGES_HI : RANGES_EN)[`${a}-${b}`];
  if (!r) throw new Error(`No ${lang} copy for range ${a}-${b} KB`);
  const loc = (p: string) => (lang === 'hi' ? (hindiToolPath(p) ?? p) : p);
  const seen = new Set<string>();
  const exams = examsWithRange(a, b, lang).filter((x) => (seen.has(x.slug) ? false : (seen.add(x.slug), true)));
  const others = COMPRESS_KB_RANGES.filter(([x, y]) => x !== a || y !== b).map(([x, y]) => ({
    href: loc(compressRangePath(x, y)),
    label: `${x}–${y} KB`,
  }));
  const sections: ToolSection[] = [
    { h2: r.whyH2, paras: [r.why] },
    { h2: r.examsH2, paras: [r.exams], links: exams.slice(0, 12).map((x) => ({ href: x.href, label: x.exam })) },
    { h2: r.pixelsH2, paras: [r.pixels] },
    {
      h2: r.landH2,
      paras: [r.land],
      links: [
        ...[a, b].map((n) => ({ href: loc(compressToKbPath(n)), label: `${n} KB` })),
        ...others,
        { href: loc('/tools/compress-image'), label: lang === 'hi' ? 'कोई भी KB' : 'Any KB' },
      ],
    },
  ];
  return {
    title: r.title,
    description: r.description,
    h1: r.h1,
    intro: r.intro,
    steps: rangeSteps(a, b, lang),
    faq: [...r.faq, PRIVACY[lang]],
    sections,
  };
}

/** /tools/mb-to-kb-photo (English only). */
export function mbToKbCopy(): ToolCopy {
  return {
    title: 'Photo MB to KB Converter: Shrink a 2 MB Photo | SahiSize',
    description:
      'Convert photo MB to KB for exam forms: a 2 MB or 1 MB phone photo becomes a JPG of 20, 50, 100 KB or any size you need. Free and never uploaded.',
    h1: 'Photo MB to KB converter',
    intro:
      'Convert photo MB to KB in one step. A 2 MB or 1 MB phone photo becomes a JPG of the exact kilobytes your form allows, made on your phone, with 100 KB preselected.',
    steps: [
      { name: 'Add the photo', text: 'Pick it from your gallery, even if it is 5 MB or more. HEIC photos from an iPhone work too.' },
      { name: 'Choose the KB', text: '100 KB is preselected. Change it to the number on your form, such as 20 or 50.' },
      { name: 'Download', text: 'The JPG comes out just under your target. Check the pass list and save it.' },
    ],
    faq: [
      {
        q: 'How many KB is 2 MB?',
        a: '2048 KB if 1 MB is 1024 KB, or 2000 KB in decimal units. Your gallery app most likely shows the decimal figure.',
      },
      {
        q: 'Why is my photo several MB?',
        a: 'Modern phone cameras capture 12 megapixels or more, and every pixel costs bytes. A form needs only a tiny fraction of them.',
      },
      {
        q: 'Can I convert MB to KB without losing quality?',
        a: 'You lose only detail the form would never show. On screen, at the size the portal uses, a 100 KB version looks the same as the 3 MB original.',
      },
      PRIVACY.en,
    ],
    sections: [
      {
        h2: 'MB and KB: 1000 or 1024?',
        paras: [
          'In the binary system that Windows and most exam portals use, a kilobyte is 1024 bytes and a megabyte is 1024 kilobytes. Phones and Macs often show sizes in decimal units instead, where 1 MB is 1000 KB and 1 KB is 1000 bytes. So the same photo can show as 2.0 MB in your gallery and as 1,953 KB on a computer.',
          'That gap matters at the edge of a limit. This MB to KB converter counts 1 KB as 1024 bytes and also keeps the file under the decimal reading of your limit, so a 50 KB target stays under 50,000 bytes and passes either way.',
        ],
        list: [
          '0.5 MB = 512 KB (500 KB in decimal units)',
          '1 MB = 1024 KB (1000 KB)',
          '2 MB = 2048 KB (2000 KB)',
          '5 MB = 5120 KB (5000 KB)',
        ],
      },
      {
        h2: 'What a 2 MB photo size really holds',
        paras: [
          'A 12-megapixel phone camera takes pictures of about 4000×3000 pixels, saved as JPG or HEIC files of 2–5 MB. That is far more than any form shows: a banking photo is only 200×230 pixels. Turning a 2 MB photo into 50 KB makes the file about 40 times smaller, and most of that comes from reducing the pixels, not from lowering the quality.',
        ],
      },
      {
        h2: '1 MB photo size and other MB limits',
        paras: [
          'Some portals state a limit such as "maximum 1 MB" or "below 2 MB". If your photo is already under it, upload it as it is. If not, type 1000 as the target for a 1 MB cap or 2000 for 2 MB: the file stays under 1,000,000 or 2,000,000 bytes, which passes both readings.',
        ],
      },
      {
        h2: 'Photo MB to KB convert: common targets',
        paras: ['Exam portals almost always ask for kilobytes, not megabytes. Jump straight to the size your form names:'],
        links: [
          ...[20, 50, 100, 200].map((n) => ({ href: compressToKbPath(n), label: `${n} KB` })),
          ...COMPRESS_KB_RANGES.map(([x, y]) => ({ href: compressRangePath(x, y), label: `${x}–${y} KB` })),
          { href: '/tools/compress-image', label: 'Any KB' },
        ],
      },
    ],
  };
}
