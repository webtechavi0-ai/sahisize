/**
 * "Govt ID Documents" section (/id-documents). Only specs that the issuing agency itself
 * publishes on its own website are used here. Every value below was read on the official
 * page named in `source`, on ID_CHECKED_ON.
 *
 * Found (22 Oct 2026):
 *  - Protean eGov Technologies (formerly NSDL e-Gov), PAN guidelines for online applications
 *    (Form 93 / Form 94 page and the change-request / reprint page) publish one scan table:
 *    "Resolution (in DPI) 200 DPI 200 DPI 200 DPI · Type Color Color Black & White ·
 *    File type JPEG JPEG PDF/A or JPEG · Size Max. 20 KB Max. 10 KB Max. 300KB/per page ·
 *    Dimension 3.5X2.5 cms. 2X4.5 cms" (photograph, signature, supporting documents).
 * Not found / skipped: see ID_NOT_COVERED.
 *
 * Rules for this section (owner): no PAN/Aadhaar number or name fields, no persistence of
 * uploads, no official branding, a visible disclaimer and source + checked date on every page.
 */
import type { DocSpec } from '@/engine/types';

/** ISO date the official pages were read. */
export const ID_CHECKED_ON = '2026-10-22';
export const ID_CHECKED_LABEL = { en: 'Checked on 22 Oct 2026', hi: '22 अक्टूबर 2026 को जाँचा गया' } as const;

export const ID_DISCLAIMER = {
  en: 'Not affiliated with NSDL, UTIITSL or UIDAI. Please verify on the official website.',
  hi: 'SahiSize का NSDL, UTIITSL या UIDAI से कोई संबंध नहीं है। कृपया आधिकारिक वेबसाइट पर जाँच लें।',
} as const;

export const ID_PRIVACY = {
  en: 'Processed on your device. Never uploaded or stored.',
  hi: 'आपके डिवाइस पर ही प्रोसेस होता है। न अपलोड होता है, न सेव।',
} as const;

/** Domains of the issuing agencies. Source links must be https on one of these. */
export const OFFICIAL_DOMAINS = ['proteantech.in', 'nsdl.com', 'utiitsl.com', 'uidai.gov.in'] as const;

export interface OfficialSource {
  /** Agency, as named on its own site. */
  body: string;
  /** Page title as shown on the official page. */
  title: string;
  url: string;
  /** Exact text from the page (table cells joined with " · "). */
  quote: string;
}

const PROTEAN_BODY = 'Protean eGov Technologies (formerly NSDL e-Gov)';
const PROTEAN_TABLE =
  'Resolution (in DPI) 200 DPI 200 DPI 200 DPI · Type Color Color Black & White · File type JPEG JPEG PDF/A or JPEG · Size Max. 20 KB Max. 10 KB Max. 300KB/per page · Dimension 3.5X2.5 cms. 2X4.5 cms';

export const PROTEAN_NEW_PAN: OfficialSource = {
  body: PROTEAN_BODY,
  title: 'Guidelines for filling PAN New Application',
  url: 'https://tin.tin.proteantech.in/pan/form49Adsc.html',
  quote: PROTEAN_TABLE,
};

export const PROTEAN_CHANGE_PAN: OfficialSource = {
  body: PROTEAN_BODY,
  title: 'Guidelines for filling PAN Change Request Application / Reprint of PAN Card',
  url: 'https://tin.tin.proteantech.in/pan/correctiondsc.html',
  quote: PROTEAN_TABLE,
};

export type IdDocSlug = 'pan-card-photo-size' | 'pan-card-signature-size';

export interface IdDocPage {
  slug: IdDocSlug;
  /** English path. */
  path: string;
  /** Hindi path when a Hindi page exists. */
  hiPath: string | null;
  doc: 'photo' | 'signature';
  /** Official values as published (for the spec table). */
  official: {
    dimension: string;
    dpi: number;
    type: string;
    fileType: string;
    maxKB: number;
  };
  /** The preset the tool fits to: the official values, with px derived at the official DPI. */
  spec: DocSpec;
  sources: readonly OfficialSource[];
}

/** cm at a DPI -> px, rounded (Q4: same rule as derived exam presets). */
export function cmToPx(cm: number, dpi: number): number {
  return Math.round((cm / 2.54) * dpi);
}

export const PAN_PHOTO_SPEC: DocSpec = {
  doc: 'photo',
  label: { en: 'PAN photo', hi: 'पैन फोटो' },
  // "3.5X2.5 cms": a passport-style portrait, 2.5 cm wide and 3.5 cm tall.
  widthPx: cmToPx(2.5, 200),
  heightPx: cmToPx(3.5, 200),
  minKB: null,
  maxKB: 20,
  format: 'jpg',
  dpi: 200,
  fileName: 'pan-photo.jpg',
  rules: [
    { en: 'Colour photo, JPEG, 200 DPI', hi: 'रंगीन फोटो, JPEG, 200 DPI' },
    { en: 'Up to 20 KB', hi: 'अधिकतम 20 KB' },
  ],
  physical: { width: 2.5, height: 3.5, unit: 'cm' },
  pxDerived: true,
};

export const PAN_SIGNATURE_SPEC: DocSpec = {
  doc: 'signature',
  label: { en: 'PAN signature', hi: 'पैन सिग्नेचर' },
  // "2X4.5 cms": a landscape box, 4.5 cm wide and 2 cm tall.
  widthPx: cmToPx(4.5, 200),
  heightPx: cmToPx(2, 200),
  minKB: null,
  maxKB: 10,
  format: 'jpg',
  dpi: 200,
  fileName: 'pan-signature.jpg',
  rules: [
    { en: 'JPEG, 200 DPI', hi: 'JPEG, 200 DPI' },
    { en: 'Up to 10 KB', hi: 'अधिकतम 10 KB' },
  ],
  cleanup: 'signature',
  physical: { width: 4.5, height: 2, unit: 'cm' },
  pxDerived: true,
};

export const ID_PAGES: readonly IdDocPage[] = [
  {
    slug: 'pan-card-photo-size',
    path: '/id-documents/pan-card-photo-size',
    hiPath: '/hi/id-documents/pan-card-photo-size',
    doc: 'photo',
    official: { dimension: '3.5X2.5 cms.', dpi: 200, type: 'Color', fileType: 'JPEG', maxKB: 20 },
    spec: PAN_PHOTO_SPEC,
    sources: [PROTEAN_NEW_PAN, PROTEAN_CHANGE_PAN],
  },
  {
    slug: 'pan-card-signature-size',
    path: '/id-documents/pan-card-signature-size',
    hiPath: null,
    doc: 'signature',
    official: { dimension: '2X4.5 cms', dpi: 200, type: 'Color', fileType: 'JPEG', maxKB: 10 },
    spec: PAN_SIGNATURE_SPEC,
    sources: [PROTEAN_NEW_PAN, PROTEAN_CHANGE_PAN],
  },
];

export const ID_HUB = { en: '/id-documents', hi: '/hi/id-documents' } as const;

/** Everything this section looked at and did NOT build, with the reason (shown on the hub). */
export interface NotCovered {
  name: { en: string; hi: string };
  reason: { en: string; hi: string };
  /** Official page that was checked. */
  url: string;
}

export const ID_NOT_COVERED: readonly NotCovered[] = [
  {
    name: { en: 'Aadhaar photo', hi: 'आधार फोटो' },
    reason: {
      en: 'Aadhaar: photo is captured at the enrolment centre; no upload size is published.',
      hi: 'आधार: फोटो एनरोलमेंट सेंटर पर ही खींची जाती है; अपलोड का कोई साइज़ प्रकाशित नहीं है।',
    },
    url: 'https://uidai.gov.in/',
  },
  {
    name: { en: 'Aadhaar card size in cm', hi: 'आधार कार्ड का साइज़ (cm)' },
    reason: {
      en: 'We found no Aadhaar card size in cm published on uidai.gov.in, so we do not state one.',
      hi: 'uidai.gov.in पर आधार कार्ड का cm में कोई साइज़ प्रकाशित नहीं मिला, इसलिए हम कोई साइज़ नहीं बताते।',
    },
    url: 'https://uidai.gov.in/',
  },
  {
    name: { en: 'UTIITSL PAN photo and signature', hi: 'UTIITSL पैन फोटो और सिग्नेचर' },
    reason: {
      en: 'UTIITSL’s public PAN pages say only that the photo and signature must be JPEG/JPG files. They publish no pixel, KB or DPI limit, so there is no UTIITSL preset. Follow the limits its upload screen shows.',
      hi: 'UTIITSL के सार्वजनिक पैन पेज सिर्फ़ इतना कहते हैं कि फोटो और सिग्नेचर JPEG/JPG फाइल हों। पिक्सेल, KB या DPI की कोई सीमा प्रकाशित नहीं है, इसलिए UTIITSL का प्रीसेट नहीं है। अपलोड स्क्रीन पर दिखी सीमा मानें।',
    },
    url: 'https://www.pan.utiitsl.com/',
  },
  {
    name: { en: 'PAN supporting documents (Protean)', hi: 'पैन के सपोर्टिंग डॉक्यूमेंट (Protean)' },
    reason: {
      en: 'Protean asks for black-and-white scans at 200 DPI, as PDF/A or JPEG, up to 300 KB per page. SahiSize cannot yet make PDF/A files or force black and white, so we do not offer a preset for them.',
      hi: 'Protean 200 DPI पर ब्लैक-एंड-व्हाइट स्कैन, PDF/A या JPEG में, हर पेज 300 KB तक माँगता है। SahiSize अभी PDF/A नहीं बना सकता और ब्लैक-एंड-व्हाइट पक्का नहीं कर सकता, इसलिए इनका प्रीसेट नहीं है।',
    },
    url: 'https://tin.tin.proteantech.in/pan/form49Adsc.html',
  },
];

export function getIdPage(slug: IdDocSlug): IdDocPage {
  const p = ID_PAGES.find((x) => x.slug === slug);
  if (!p) throw new Error(`Unknown id-documents page: ${slug}`);
  return p;
}

/** All indexable URLs of the section, for its own sitemap group. */
export function idDocumentUrls(): { en: string; hi: string | null }[] {
  return [{ en: ID_HUB.en, hi: ID_HUB.hi }, ...ID_PAGES.map((p) => ({ en: p.path, hi: p.hiPath }))];
}
