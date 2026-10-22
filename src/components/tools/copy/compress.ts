/**
 * Copy for T1 pages: the KB hub /tools/compress-image and /tools/compress-image-to-[n]kb
 * (EN), plus Hindi for the hub and the sizes in KB_SIZES_HI. Per-size text lives in
 * kb-sizes.ts / kb-sizes-hi.ts; range and MB-to-KB pages in kb-ranges.ts.
 * Keyword targets: docs/seo/keyword-map.md ("Tools: KB size").
 */
import { compressMeta } from '@/seo/meta';
import type { Lang } from '@/config/site';
import { COMPRESS_KB_RANGES, COMPRESS_KB_TARGETS, MB_TO_KB_PATH, compressRangePath, compressToKbPath } from '@/config/tools';
import { hindiToolPath } from '@/seo/hreflang';
import { lowerBoundKB } from '../logic';
import { examsWithMaxKB } from '../presets-server';
import { KB_SIZES_EN, type KbSizeCopy } from './kb-sizes';
import { KB_SIZES_HI } from './kb-sizes-hi';
import type { ToolCopy, ToolSection } from './types';

/** "18", "13.5". */
const lo = (n: number) => String(lowerBoundKB(n));

/** Rough portrait size (3:4) that a plain-background JPG holds at good quality: ~2000 px per KB. */
export function faceDims(n: number): string {
  const w = Math.round(Math.sqrt(n * 2000 * 0.75) / 10) * 10;
  const h = Math.round((w * 4) / 3 / 10) * 10;
  return `${w}×${h}`;
}

/** Localised link to a tool path: the Hindi page when it exists. */
function href(path: string, lang: Lang): string {
  return lang === 'hi' ? (hindiToolPath(path) ?? path) : path;
}

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

/** Neighbouring sizes, the matching range page, the hub and MB to KB. */
function nearbyLinks(n: number, lang: Lang): { href: string; label: string }[] {
  const all = COMPRESS_KB_TARGETS as readonly number[];
  const i = all.indexOf(n);
  const sizes = all.slice(Math.max(0, i - 2), i + 3).filter((x) => x !== n);
  const ranges = COMPRESS_KB_RANGES.filter(([a, b]) => n >= a && n <= b);
  return [
    ...sizes.map((x) => ({ href: href(compressToKbPath(x), lang), label: `${x} KB` })),
    ...ranges.map(([a, b]) => ({ href: href(compressRangePath(a, b), lang), label: `${a}–${b} KB` })),
    { href: href('/tools/compress-image', lang), label: lang === 'hi' ? 'कोई भी KB' : 'Any KB' },
    { href: MB_TO_KB_PATH, label: 'MB → KB' },
  ];
}

function kbSteps(n: number, lang: Lang): ToolCopy['steps'] {
  if (lang === 'hi') {
    return [
      { name: 'फोटो जोड़ें', text: 'फोटो खींचें या गैलरी से चुनें। JPG, PNG, WebP और iPhone की HEIC फोटो सब चलती हैं।' },
      { name: 'सेटिंग देखें', text: `${n} KB पहले से चुना है। फॉर्म में न्यूनतम KB हो तो वह भी डालें।` },
      { name: 'एक पल रुकें', text: `टूल ${n} KB के अंदर सबसे अच्छी क्वालिटी ढूँढता है, और ज़रूरत हो तभी फोटो छोटी करता है।` },
      { name: 'डाउनलोड करें', text: 'पास चेक की हर लाइन पर टिक दिखे, तब JPG डाउनलोड करके फॉर्म में अपलोड करें।' },
    ];
  }
  return [
    { name: 'Add your image', text: 'Take a photo or pick one from your gallery. JPG, PNG, WebP and iPhone HEIC files all work.' },
    { name: 'Check the target', text: `${n} KB is already selected. Type a minimum if your form sets one, and decide whether the pixel size may change.` },
    { name: 'Let it work', text: `The tool tries the highest JPEG quality that stays under ${n} KB and makes the picture smaller only when it has to.` },
    { name: 'Download', text: 'When every line of the pass check has a tick, save the JPG and upload it to your form.' },
  ];
}

export function compressKbCopy(n: number, lang: Lang = 'en'): ToolCopy {
  const hi = lang === 'hi';
  const notes: KbSizeCopy | undefined = hi ? KB_SIZES_HI[n] : KB_SIZES_EN[n];
  if (!notes) throw new Error(`No ${lang} copy for ${n} KB`);
  const meta = compressMeta(n, lang, notes.verb);
  const bytes = (n * 1000).toLocaleString('en-IN');
  const sections: ToolSection[] = hi
    ? [
        { h2: notes.usesH2, paras: [notes.uses] },
        {
          h2: notes.qualityH2,
          paras: [
            notes.quality,
            `मोटा अंदाज़ा: सादे बैकग्राउंड वाली पासपोर्ट स्टाइल फोटो ${n} KB में लगभग ${faceDims(n)} पिक्सल तक साफ़ रहती है। भरा-भरा बैकग्राउंड या कम रोशनी वाली फोटो को उतने ही साइज़ के लिए ज़्यादा KB चाहिए।`,
          ],
        },
        {
          h2: 'आपको क्या मिलेगा',
          paras: [
            `फाइल ${lo(n)} से ${n} KB के बीच की baseline JPG होती है और ${bytes} bytes से नीचे रहती है, ताकि 1 KB को 1000 या 1024 bytes, किसी भी तरह गिनने वाला पोर्टल उसे पास करे। कैमरा या लोकेशन की छुपी जानकारी हटा दी जाती है।`,
          ],
        },
        { h2: 'कम्प्रेस करने से पहले एक टिप', paras: [notes.tip] },
      ]
    : [
        { h2: notes.usesH2, paras: [notes.uses] },
        {
          h2: notes.qualityH2,
          paras: [
            notes.quality,
            `As a rough guide, a passport-style photo on a plain background stays clean at about ${faceDims(n)} pixels in ${n} KB. A busy background or a dim, noisy shot needs more kilobytes for the same size, and a signature on white paper needs far fewer.`,
          ],
        },
        {
          h2: 'What you will get',
          paras: [
            `Whatever you add, the download is a baseline JPG (not progressive) between ${lo(n)} and ${n} KB. It stays under ${bytes} bytes, so it passes whether the portal counts 1 KB as 1000 or 1024 bytes, and hidden camera and location data are removed.`,
          ],
        },
        { h2: 'Tip before you compress', paras: [notes.tip] },
      ];
  const ex = examSection(n, lang);
  if (ex) sections.push(ex);
  sections.push(
    hi
      ? {
          h2: 'दूसरे साइज़',
          paras: ['फॉर्म में लिखी सीमा से ठीक नीचे वाला साइज़ चुनें। फॉर्म न्यूनतम और अधिकतम दोनों बताए, तो रेंज वाला पेज न्यूनतम भी भर देता है।'],
          links: nearbyLinks(n, lang),
        }
      : {
          h2: 'Other sizes and ranges',
          paras: ['Pick the size just under the limit printed on your form. If the form gives both a minimum and a maximum, a range page fills in the minimum for you.'],
          links: nearbyLinks(n, lang),
        },
  );
  return {
    title: meta.title,
    description: notes.description,
    h1: hi ? `${n} KB फोटो साइज़: ${notes.verb} ${n} KB में करें` : `${n} KB photo size: ${notes.verb.toLowerCase()} ${n} KB`,
    intro: notes.intro,
    steps: kbSteps(n, lang),
    faq: [
      ...notes.faq,
      hi
        ? { q: 'क्या मेरी फोटो कहीं अपलोड होती है?', a: 'नहीं। सब कुछ आपके ब्राउज़र में, आपके फोन पर ही होता है। पहली बार के बाद यह पेज ऑफ़लाइन भी चलता है।' }
        : { q: 'Is my photo uploaded anywhere?', a: 'No. Compression runs inside your browser on your own device. The page even works offline after your first visit.' },
    ],
    sections,
  };
}

/** Size grid for the hub: every KB page, grouped, then ranges and MB to KB. */
function sizeGrid(lang: Lang): ToolSection[] {
  const pages = (from: number, to: number) =>
    (COMPRESS_KB_TARGETS as readonly number[])
      .filter((n) => n >= from && n <= to)
      .map((n) => ({ href: href(compressToKbPath(n), lang), label: `${n} KB` }));
  const ranges = [
    ...COMPRESS_KB_RANGES.map(([a, b]) => ({ href: href(compressRangePath(a, b), lang), label: `${a}–${b} KB` })),
    { href: MB_TO_KB_PATH, label: 'MB → KB' },
  ];
  if (lang === 'hi') {
    return [
      {
        h2: 'साइज़ चुनें',
        paras: [
          'छोटे साइज़ (5–30 KB) सिग्नेचर और अंगूठे के निशान के लिए हैं, 35–100 KB फोटो और डिक्लेरेशन के लिए, और 150–500 KB बड़ी फोटो व दस्तावेज़ों के लिए। जिन पेजों का हिंदी रूप है, वे हिंदी में खुलते हैं।',
        ],
        links: [...pages(5, 500), ...ranges],
      },
    ];
  }
  return [
    {
      h2: 'Small files: signatures and thumbs (5–30 KB)',
      paras: ['Signature fields usually cap at 20 or 30 KB, and some state forms go lower.'],
      links: pages(5, 30),
    },
    {
      h2: 'Photos and declarations (35–100 KB)',
      paras: ['Most photo, thumb impression and declaration rules fall in this band.'],
      links: pages(35, 100),
    },
    {
      h2: 'Large photos and documents (150–500 KB)',
      paras: ['NTA and UPSC photos go up to 200 KB; scanned pages need more.'],
      links: pages(150, 500),
    },
    {
      h2: 'Ranges and MB to KB',
      paras: ['When the form gives a minimum and a maximum, a range page fills in both. If your phone shows the size in MB, start with MB to KB.'],
      links: ranges,
    },
  ];
}

export function compressImageCopy(lang: Lang = 'en'): ToolCopy {
  if (lang === 'hi') {
    return {
      title: 'KB में फोटो रीसाइज़र: कोई भी KB साइज़ | SahiSize',
      description:
        'KB में फोटो रीसाइज़र: फोटो या सिग्नेचर को 5 से 500 KB तक किसी भी साइज़ में बदलें, चाहें तो न्यूनतम KB भी दें। सब फोन में होता है, अपलोड नहीं।',
      h1: 'फोटो का साइज़ KB में कम करें',
      intro: 'यह KB में फोटो रीसाइज़र आपकी फोटो, सिग्नेचर या स्कैन को उतने KB की JPG बनाता है जितनी आपका फॉर्म माँगता है। टारगेट KB चुनें, न्यूनतम हो तो वह भी डालें, और डाउनलोड करें।',
      steps: [
        { name: 'फोटो जोड़ें', text: 'फोटो खींचें या गैलरी से चुनें। फाइल आपके फोन में ही रहती है।' },
        { name: 'KB चुनें', text: '10 से 500 KB में से चुनें या अपना नंबर लिखें। न्यूनतम KB वैकल्पिक है।' },
        { name: 'डाउनलोड करें', text: 'पास चेक पर सब टिक हों, तब डाउनलोड करें।' },
      ],
      faq: [
        { q: 'फोटो का साइज़ KB में कैसे कम करें?', a: 'ऊपर फोटो चुनें, टारगेट KB चुनें, और कुछ ही सेकंड में नई फाइल तैयार हो जाती है। फाइल टारगेट के 10% के अंदर, उससे नीचे आती है।' },
        { q: '"Keep dimensions" का क्या मतलब है?', a: 'यह चालू हो तो फोटो के पिक्सल (चौड़ाई × ऊँचाई) नहीं बदलते, सिर्फ क्वालिटी कम होती है। बंद हो तो ज़रूरत पड़ने पर फोटो छोटी भी की जा सकती है, जिससे कम KB में भी फोटो साफ़ रहती है।' },
        { q: 'न्यूनतम KB क्यों चाहिए?', a: 'कई फॉर्म, जैसे IBPS, 20 KB से छोटी फोटो नहीं लेते। न्यूनतम डालने पर फाइल उससे छोटी नहीं होगी।' },
        { q: 'क्या यह ऑफ़लाइन चलता है?', a: 'हाँ। एक बार पेज खुलने के बाद इंटरनेट बंद होने पर भी यह टूल चलता है।' },
        {
          q: 'मेरी फोटो 2 MB की है, क्या वह भी KB में आएगी?',
          a: 'हाँ। 2 MB यानी लगभग 2048 KB। फोन की बड़ी फोटो पहले सही पिक्सल साइज़ में लाई जाती है, फिर क्वालिटी इस तरह चुनी जाती है कि फाइल आपके टारगेट KB के ठीक नीचे आए। iPhone की HEIC फोटो भी सीधे JPG बन जाती है।',
        },
      ],
      sections: [
        {
          h2: 'KB और पिक्सल में फ़र्क',
          paras: [
            'पिक्सल फोटो की चौड़ाई और ऊँचाई है, जैसे 200×230। KB फाइल का साइज़ है, यानी फोन में फाइल कितनी जगह लेती है। एक ही पिक्सल की फोटो क्वालिटी के हिसाब से 15 KB की भी हो सकती है और 80 KB की भी। यह टूल क्वालिटी को इस तरह चुनता है कि फाइल आपकी सीमा के ठीक नीचे आए।',
            'हम 1 KB = 1024 bytes मानते हैं, जैसे ज़्यादातर पोर्टल मानते हैं, और अगर फाइल सिर्फ 1000 bytes वाले हिसाब से पास होती हो तो चेतावनी देते हैं।',
          ],
        },
        {
          h2: 'आम सीमाएँ',
          paras: ['बैंकिंग फॉर्म में फोटो 20–50 KB और सिग्नेचर 10–20 KB होता है। NTA फॉर्म (NEET, JEE, CUET) में फोटो 10–200 KB तक चलती है। RRB में सिग्नेचर 30–49 KB का चाहिए।'],
        },
        ...sizeGrid('hi'),
      ],
    };
  }
  return {
    title: 'Photo Resizer in KB: Compress to Any Size | SahiSize',
    description:
      'Free photo resizer in KB for exam forms: pick any target from 5 to 500 KB, add a minimum if needed, and get a JPG just under it. Nothing is uploaded.',
    h1: 'Photo resizer in KB for exam forms',
    intro:
      'This photo resizer in KB turns any photo, signature or scan into a JPG of the exact size your form asks for. Pick a target, add a minimum if there is one, and download.',
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
      { q: 'Can this KB resizer make a file bigger?', a: 'Yes. If your photo is under the minimum, the tool raises the JPEG quality, and adds invisible padding if needed, so it reaches the range. The picture is never stretched.' },
      { q: 'Is this safe for my documents?', a: 'Yes. Nothing is uploaded. All processing runs in your browser, and the page works offline after the first visit.' },
    ],
    sections: [
      {
        h2: 'Photo in KB size vs pixels',
        paras: [
          'Pixels are the width and height of the picture, such as 200×230. Kilobytes are how much space the file takes. The same 200×230 photo can be 15 KB or 80 KB depending on the JPEG quality. This tool searches for the highest quality that keeps the file under your target, so you lose as little detail as possible.',
          'We count 1 KB as 1024 bytes, the way most portals do, and keep the file under the 1000-byte reading of your limit too.',
        ],
      },
      {
        h2: 'An image converter in KB and JPG at once',
        paras: [
          'Phones save photos as 2–5 MB HEIC or JPG files. This KB converter opens HEIC, PNG and WebP on your device and saves a JPG, the format every exam portal accepts, so changing the format and reducing photo KB happen in one step. For a whole set of files, Batch compress handles up to 20 images at once.',
        ],
      },
      {
        h2: 'Common limits on exam forms',
        paras: [
          'Banking forms (IBPS, SBI, RBI) want photos of 20–50 KB and signatures of 10–20 KB. NTA forms such as NEET UG, JEE Main and CUET UG take photos from 10 to 200 KB, and RRB signatures must be 30–49 KB. Your exam page lists every document with its pixel size too.',
        ],
      },
      ...sizeGrid('en'),
    ],
  };
}
