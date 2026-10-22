/**
 * Page copy for the Govt ID Documents section (/id-documents). Build-time only.
 * Every number here comes from src/config/id-documents.ts (Protean's published scan table,
 * checked 22 Oct 2026). Never claim to be an official site or tool.
 */
import type { Lang } from '@/config/site';
import type { ToolCopy, ToolSection } from '@/components/tools/copy/types';
import { PAN_PHOTO_SPEC, PAN_SIGNATURE_SPEC } from '@/config/id-documents';

export type IdCopy = ToolCopy;

const ph = PAN_PHOTO_SPEC;
const sg = PAN_SIGNATURE_SPEC;
const phPx = `${ph.widthPx}×${ph.heightPx} px`;
const sgPx = `${sg.widthPx}×${sg.heightPx} px`;

// ---------------------------------------------------------------------------
// Hub
// ---------------------------------------------------------------------------

export interface HubCopy {
  title: string;
  description: string;
  h1: string;
  intro: string;
  sections: ToolSection[];
  faq: { q: string; a: string }[];
  labels: {
    specTitle: string;
    colDocument: string;
    colSize: string;
    colKb: string;
    colFormat: string;
    colSource: string;
    pagesTitle: string;
    notCoveredTitle: string;
    notCoveredIntro: string;
    open: string;
  };
}

export function hubCopy(lang: Lang): HubCopy {
  if (lang === 'hi') {
    return {
      title: 'पैन कार्ड फोटो और सिग्नेचर साइज़ | SahiSize',
      description:
        'पैन कार्ड फोटो और सिग्नेचर का साइज़ Protean (NSDL) की गाइडलाइन से: फोटो 3.5×2.5 cm, 20 KB तक; सिग्नेचर 2×4.5 cm, 10 KB तक। फोन पर ही रीसाइज़ करें।',
      h1: 'सरकारी ID डॉक्यूमेंट: पैन फोटो और सिग्नेचर साइज़',
      intro:
        'पैन कार्ड का ऑनलाइन फॉर्म भरते समय फोटो या सिग्नेचर का साइज़ गलत हो तो अपलोड अटक जाता है। यहाँ सिर्फ़ वही साइज़ हैं जो जारी करने वाली एजेंसी ने अपनी वेबसाइट पर खुद लिखे हैं, हर साइज़ के साथ सोर्स लिंक और जाँच की तारीख है। हमारे टूल फाइल को आपके फोन या कंप्यूटर पर ही सही साइज़ में बदलते हैं।',
      sections: [
        {
          h2: 'यह सेक्शन कैसे बना',
          paras: [
            'हमने Protean (पहले NSDL e-Gov), UTIITSL और UIDAI की वेबसाइटें खुद खोलकर पढ़ीं। जहाँ एजेंसी ने पिक्सेल, cm, KB, DPI या फॉर्मेट साफ़ लिखा है, वहीं टूल बनाया। जो साइज़ सिर्फ़ दूसरी वेबसाइटों पर दिखा, उसे हमने नहीं लिया।',
            'आप पैन नंबर, आधार नंबर या नाम कहीं नहीं भरते। सिर्फ़ फोटो या सिग्नेचर की इमेज चुनते हैं, और वह भी आपके डिवाइस से बाहर नहीं जाती।',
          ],
        },
      ],
      faq: [
        {
          q: 'पैन कार्ड फोटो का साइज़ KB में कितना होना चाहिए?',
          a: 'Protean की ऑनलाइन पैन गाइडलाइन में फोटो अधिकतम 20 KB, JPEG, 200 DPI और 3.5×2.5 cm लिखा है। अपलोड से पहले आधिकारिक पेज पर एक बार ज़रूर देखें।',
        },
        {
          q: 'क्या ये साइज़ UTIITSL पर भी लागू हैं?',
          a: 'UTIITSL अपने सार्वजनिक पेजों पर सिर्फ़ JPEG/JPG फॉर्मेट बताता है, KB या पिक्सेल नहीं। इसलिए UTIITSL से अप्लाई करें तो उसकी अपलोड स्क्रीन पर दिखी सीमा मानें।',
        },
      ],
      labels: {
        specTitle: 'आधिकारिक साइज़ एक नज़र में',
        colDocument: 'डॉक्यूमेंट',
        colSize: 'साइज़',
        colKb: 'अधिकतम KB',
        colFormat: 'फॉर्मेट और DPI',
        colSource: 'सोर्स',
        pagesTitle: 'टूल चुनें',
        notCoveredTitle: 'जो शामिल नहीं है, और क्यों',
        notCoveredIntro: 'इनका कोई आधिकारिक अपलोड साइज़ हमें नहीं मिला, या हमारा टूल उसे पूरा नहीं कर सकता:',
        open: 'खोलें',
      },
    };
  }
  return {
    title: 'PAN Card Photo and Signature Size | SahiSize',
    description:
      'PAN card photo and signature size from the Protean (NSDL) guideline: photo 3.5×2.5 cm up to 20 KB, signature 2×4.5 cm up to 10 KB. Resize on your phone.',
    h1: 'Govt ID Documents: PAN photo and signature size',
    intro:
      'A PAN application stalls when the photo or signature file is the wrong size. This section lists only the sizes that the issuing agency itself publishes on its website, each with the source link and the date we checked it. The tools below resize your file on your own phone or computer.',
    sections: [
      {
        h2: 'How this section is built',
        paras: [
          'We opened the Protean (formerly NSDL e-Gov), UTIITSL and UIDAI websites ourselves. A tool exists only where the agency states pixels, centimetres, KB, DPI or a file format in its own words. Numbers seen only on third-party sites were left out.',
          'You never type a PAN number, an Aadhaar number or your name here. You only pick the photo or signature image, and it does not leave your device.',
        ],
      },
    ],
    faq: [
      {
        q: 'What is the PAN card photo size in KB?',
        a: 'Protean’s online PAN guideline lists the photograph as JPEG, 200 DPI, 3.5×2.5 cm and a maximum of 20 KB. Check the official page once before you upload.',
      },
      {
        q: 'Do these sizes apply to UTIITSL too?',
        a: 'UTIITSL’s public pages only say JPEG/JPG, with no KB or pixel limit. If you apply through UTIITSL, follow the limit its upload screen shows.',
      },
    ],
    labels: {
      specTitle: 'Official sizes at a glance',
      colDocument: 'Document',
      colSize: 'Size',
      colKb: 'Max KB',
      colFormat: 'Format and DPI',
      colSource: 'Source',
      pagesTitle: 'Pick a tool',
      notCoveredTitle: 'Not covered, and why',
      notCoveredIntro: 'We found no official upload size for these, or our tool cannot meet it:',
      open: 'Open',
    },
  };
}

// ---------------------------------------------------------------------------
// PAN photo
// ---------------------------------------------------------------------------

export function panPhotoCopy(lang: Lang): IdCopy {
  if (lang === 'hi') {
    return {
      title: 'पैन कार्ड फोटो साइज़: 20 KB में रीसाइज़ करें | SahiSize',
      description:
        'पैन कार्ड फोटो साइज़: 3.5×2.5 cm, 200 DPI, JPEG, 20 KB तक (Protean/NSDL गाइडलाइन)। फोटो क्रॉप करके फोन पर ही सही साइज़ बनाएँ, अपलोड नहीं होती।',
      h1: 'पैन कार्ड फोटो साइज़: 3.5×2.5 cm, 20 KB तक',
      intro: `NSDL पैन फोटो रीसाइज़ करनी है? Protean (पहले NSDL e-Gov) की ऑनलाइन पैन गाइडलाइन फोटो के लिए 3.5×2.5 cm, 200 DPI, रंगीन JPEG और अधिकतम 20 KB बताती है। यह टूल आपकी फोटो को ${phPx} (200 DPI पर 2.5 cm चौड़ा, 3.5 cm ऊँचा) और 20 KB से कम में बदल देता है।`,
      steps: [
        { name: 'फोटो चुनें', text: 'सफ़ेद या हल्के बैकग्राउंड वाली साफ़, रंगीन पासपोर्ट फोटो चुनें। फोन कैमरा, गैलरी या स्कैन सब चलेगा।' },
        { name: 'क्रॉप करें', text: 'फ्रेम पहले से 2.5:3.5 के अनुपात में है। चेहरा बीच में रखें, सिर से कंधों तक।' },
        { name: 'ऑटो-फिट दबाएँ', text: `टूल फोटो को ${phPx}, 200 DPI और 20 KB से कम की JPEG बनाता है, फिर हर नियम पर पास या फेल दिखाता है।` },
        { name: 'डाउनलोड करें', text: 'सारे चेक हरे हों तो pan-photo.jpg सेव करें और पैन फॉर्म में अपलोड करें।' },
      ],
      faq: [
        {
          q: 'पैन कार्ड फोटो का साइज़ KB में कितना है?',
          a: 'Protean की गाइडलाइन में अधिकतम 20 KB लिखा है। Protean के एक मदद लेख में 50 KB तक भी बताया गया है, पर 20 KB से कम की फाइल दोनों में चलती है, इसलिए टूल 20 KB का लक्ष्य रखता है।',
        },
        {
          q: 'पैन फोटो का साइज़ पिक्सेल में कितना होगा?',
          a: `गाइडलाइन cm और DPI बताती है, पिक्सेल नहीं। 200 DPI पर 2.5 cm चौड़ाई लगभग ${ph.widthPx} पिक्सेल और 3.5 cm ऊँचाई लगभग ${ph.heightPx} पिक्सेल होती है।`,
        },
        {
          q: 'क्या यह UTI (UTIITSL) फोटो रीसाइज़र की तरह काम करेगा?',
          a: 'UTIITSL अपने सार्वजनिक पेजों पर कोई KB या पिक्सेल सीमा नहीं बताता, सिर्फ़ JPEG/JPG। UTIITSL फॉर्म के लिए उसकी अपलोड स्क्रीन पर दिखी सीमा देखें।',
        },
        {
          q: 'क्या मेरी फोटो कहीं सेव होती है?',
          a: 'नहीं। फोटो आपके ब्राउज़र में ही बदलती है, किसी सर्वर पर नहीं जाती और पेज बंद करते ही मिट जाती है। पैन या आधार नंबर भी नहीं माँगा जाता।',
        },
      ],
      sections: [
        {
          h2: 'Protean गाइडलाइन में पैन फोटो के नियम',
          paras: [
            'Protean की नई पैन और पैन सुधार, दोनों गाइडलाइन में स्कैन की एक ही टेबल है। फोटो के लिए रेज़ोल्यूशन 200 DPI, टाइप रंगीन, फाइल JPEG, साइज़ अधिकतम 20 KB और माप 3.5×2.5 cm लिखा है।',
            'माप में ऊँचाई और चौड़ाई अलग से नहीं लिखी, पर पासपोर्ट फोटो खड़ी होती है, इसलिए हमने इसे 3.5 cm ऊँचा और 2.5 cm चौड़ा माना है।',
          ],
        },
        {
          h2: 'फोटो रिजेक्ट होने से कैसे बचें',
          paras: [
            'ज़्यादातर गड़बड़ी तीन वजहों से होती है: फाइल 20 KB से बड़ी, फाइल JPEG की जगह PNG या HEIC, या चेहरा बहुत छोटा। टूल पहली दो खुद ठीक करता है, तीसरी के लिए क्रॉप करते समय चेहरा फ्रेम में बड़ा रखें।',
          ],
          list: [
            'हाल की, रंगीन फोटो लें, काला चश्मा या टोपी न हो।',
            'बैकग्राउंड सफ़ेद या हल्का हो, चेहरे पर परछाईं न हो।',
            'एक ही फोटो बार-बार कंप्रेस न करें, असली फोटो से शुरू करें।',
          ],
        },
        {
          h2: 'CSC या साइबर कैफ़े से फॉर्म भर रहे हैं?',
          paras: [
            'CSC पर पैन कार्ड फोटो और सिग्नेचर रीसाइज़ के लिए भी यही तरीका काम आता है। हर ग्राहक की फोटो ब्राउज़र में ही बनती है और कहीं सेव नहीं होती, इसलिए एक कंप्यूटर पर कई लोगों का काम करने पर भी किसी की फाइल पीछे नहीं छूटती।',
          ],
        },
      ],
    };
  }
  return {
    title: 'PAN Card Photo Size: Resize to 20 KB for NSDL PAN | SahiSize',
    description:
      'PAN card photo size: 3.5×2.5 cm, 200 DPI, colour JPEG up to 20 KB, per the Protean (NSDL) guideline. Crop and resize on your phone. Nothing is uploaded.',
    h1: 'PAN card photo size: 3.5×2.5 cm, up to 20 KB',
    intro: `Need an NSDL PAN photo resize? Protean (formerly NSDL e-Gov) lists the PAN card photo size for online applications as 3.5×2.5 cm, 200 DPI, colour JPEG, maximum 20 KB. This PAN photo resizer turns your picture into a ${phPx} JPEG (2.5 cm wide, 3.5 cm tall at 200 DPI) under 20 KB.`,
    steps: [
      { name: 'Pick your photo', text: 'Choose a clear, recent colour photo with a white or light background. A phone camera shot, a gallery image or a scan all work.' },
      { name: 'Crop', text: 'The frame is already locked to 2.5:3.5. Keep your face centred, from the top of the head to the shoulders.' },
      { name: 'Tap Auto-fit', text: `The tool makes a ${phPx} JPEG at 200 DPI under 20 KB, then shows a pass or fail for every rule.` },
      { name: 'Download', text: 'When every check is green, save pan-photo.jpg and upload it in your PAN form.' },
    ],
    faq: [
      {
        q: 'What is the PAN card photo size in KB?',
        a: 'The Protean guideline says a maximum of 20 KB. A Protean help article mentions up to 50 KB, but a file under 20 KB satisfies both, so the tool aims below 20 KB.',
      },
      {
        q: 'What is the PAN photo size in pixels?',
        a: `The guideline gives centimetres and DPI, not pixels. At 200 DPI, 2.5 cm wide is about ${ph.widthPx} pixels and 3.5 cm tall is about ${ph.heightPx} pixels.`,
      },
      {
        q: 'Does this work as a UTI photo resizer?',
        a: 'UTIITSL’s public pages state no KB or pixel limit, only JPEG/JPG. For a UTIITSL form, check the limit its upload screen shows before you rely on this preset.',
      },
      {
        q: 'Is my photo saved anywhere?',
        a: 'No. The photo is resized inside your browser, never sent to a server, and gone when you close the page. No PAN or Aadhaar number is asked for either.',
      },
    ],
    sections: [
      {
        h2: 'PAN photo rules in the Protean guideline',
        paras: [
          'Protean’s guidelines for a new PAN and for a PAN change or reprint carry the same scan table. For the photograph it lists resolution 200 DPI, type colour, file type JPEG, size maximum 20 KB and dimension 3.5×2.5 cm.',
          'The table does not say which side is the height. A passport-style photo is upright, so we read it as 3.5 cm tall and 2.5 cm wide.',
        ],
      },
      {
        h2: 'Avoid a rejected PAN photo',
        paras: [
          'Most failures have three causes: the file is over 20 KB, it is a PNG or HEIC instead of a JPEG, or the face is too small. The tool fixes the first two by itself; for the third, keep the face large in the crop frame.',
        ],
        list: [
          'Use a recent colour photo, with no dark glasses or cap.',
          'Keep the background white or light, with no shadow on the face.',
          'Start from the original photo, not one that was already compressed.',
        ],
      },
      {
        h2: 'Filling the form at a CSC or cyber café?',
        paras: [
          'The same steps work as a CSC PAN card photo and signature resize tool. Each customer’s photo is made in the browser and never stored, so nothing is left behind when one computer serves many people.',
        ],
      },
    ],
  };
}

// ---------------------------------------------------------------------------
// PAN signature (English only)
// ---------------------------------------------------------------------------

export function panSignatureCopy(): IdCopy {
  return {
    title: 'PAN Card Signature Size: 2×4.5 cm, 10 KB Resizer | SahiSize',
    description:
      'PAN card signature size: 2×4.5 cm, 200 DPI JPEG, up to 10 KB, as the Protean (NSDL) PAN guideline lists. Crop, clean and resize your sign on your phone.',
    h1: 'PAN card signature size: 2×4.5 cm, up to 10 KB',
    intro: `For a PAN signature upload, Protean (formerly NSDL e-Gov) lists the scanned signature as 2×4.5 cm, 200 DPI, JPEG, maximum 10 KB. This signature tool crops your sign, whitens the paper and saves a ${sgPx} JPEG (4.5 cm wide, 2 cm tall at 200 DPI) under 10 KB.`,
    steps: [
      { name: 'Sign on white paper', text: 'Sign with a black or dark blue pen on plain white paper, a little larger than usual, then photograph or scan it in good light.' },
      { name: 'Pick the image', text: 'Choose the photo or scan. JPEG, PNG, HEIC and a PDF page all open.' },
      { name: 'Crop tight', text: 'The frame is locked to 4.5:2. Fit the signature inside the guide with a small margin and no ruled lines.' },
      { name: 'Auto-fit and download', text: `The tool cleans the background, makes a ${sgPx} JPEG at 200 DPI under 10 KB and checks it. Save pan-signature.jpg when all checks pass.` },
    ],
    faq: [
      {
        q: 'What is the PAN card signature size in KB?',
        a: 'The Protean guideline lists a maximum of 10 KB for the signature. The tool keeps a small safety margin below that limit.',
      },
      {
        q: 'What is 2×4.5 cm in pixels?',
        a: `At 200 DPI, 4.5 cm wide is about ${sg.widthPx} pixels and 2 cm tall is about ${sg.heightPx} pixels. The tool also writes 200 DPI into the JPEG file.`,
      },
      {
        q: 'The guideline says “Color”. Is a black ink signature fine?',
        a: 'Yes. “Color” describes the scan type, and the tool saves a normal colour JPEG. A dark ink sign on white paper is what reads best when printed small.',
      },
      {
        q: 'Do I need to enter my PAN number?',
        a: 'No. The tool only needs the signature image. It never asks for a PAN number, an Aadhaar number or a name, and nothing is uploaded or stored.',
      },
    ],
    sections: [
      {
        h2: 'Signature rules in the Protean guideline',
        paras: [
          'The scan table in Protean’s new PAN and PAN change guidelines gives the signature resolution 200 DPI, type colour, file type JPEG, size maximum 10 KB and dimension 2×4.5 cm.',
          'A signature is wider than it is tall, so we read 2×4.5 cm as 2 cm high and 4.5 cm wide. A 2 cm strip is small, which is why a thick, dark pen line matters more than a neat style.',
        ],
      },
      {
        h2: 'Why a signature fails at 10 KB',
        paras: [
          'A phone photo of a sign is often several megabytes, with a grey page, shadows and a tilted angle. Squeezing that into 10 KB leaves blotchy noise around faint strokes. Cleaning the paper to pure white first lets the JPEG spend its few bytes on the ink.',
        ],
        list: [
          'Turn on cleanup (on by default) and raise the strength if the paper still looks grey.',
          'Rotate in the crop step if the sign is tilted.',
          'If strokes look broken, sign again with a thicker pen rather than raising the size.',
        ],
      },
      {
        h2: 'Same steps for a PAN correction or reprint',
        paras: [
          'Protean’s change request and reprint guideline uses the identical scan table, so this PAN signature resizer fits a correction form as well as a fresh application.',
        ],
      },
    ],
  };
}
