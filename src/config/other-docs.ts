/**
 * "Other documents (not exams)": the home section and the "Other documents" search group.
 * Spec text is built from src/config/id-documents.ts (PAN, official Protean values) and the
 * size-preset tool configs, never typed by hand. Build time only: islands get the slim
 * `OtherDocSearchEntry[]` as props.
 *
 * Owner rules (Q30): no logos, govt ID pages stay unofficial, no Aadhaar page (UIDAI
 * publishes no upload size), never ask for PAN or Aadhaar numbers.
 */
import type { Lang } from '@/config/site';
import { ID_HUB, ID_NOT_COVERED, getIdPage, type IdDocPage } from '@/config/id-documents';
import { getTool, type ToolSlug } from '@/config/tools';
import { sizePreset, pxLabel, type SizePresetPage } from '@/components/tools/size-presets';
import { hindiToolPath } from '@/seo/hreflang';
import { t } from '@/i18n';

export type OtherDocId =
  | 'pan-photo'
  | 'pan-signature'
  | 'passport'
  | 'stamp'
  | 'postcard'
  | 'custom'
  | 'aadhaar';

/** Short name of the agency whose values the PAN cards show. */
const PAN_AGENCY = 'Protean (NSDL)';

export interface OtherDocCard {
  id: OtherDocId;
  name: string;
  /** Spec line, built from config. */
  spec: string;
  href: string;
  /** Small unofficial line (PAN cards). */
  note: string | null;
}

/** `/hi` route for an English path when a Hindi page exists, else the English path. */
function localTool(path: string, lang: Lang): string {
  return lang === 'hi' ? (hindiToolPath(path) ?? path) : path;
}

function localId(p: IdDocPage, lang: Lang): string {
  return lang === 'hi' && p.hiPath ? p.hiPath : p.path;
}

function num(n: number): string {
  return String(n);
}

/** "3.5×2.5 cm · ≤ 20 KB": official order (height × width, as Protean prints it). */
function panSpec(p: IdDocPage): string {
  const ph = p.spec.physical!;
  return `${PAN_AGENCY} · ${num(ph.height)}×${num(ph.width)} ${ph.unit} · ≤ ${p.official.maxKB} KB`;
}

/** "3.5×4.5 cm · 276×354 px" from the tool's initial preset. */
function sizeSpec(page: SizePresetPage, lang: Lang): string {
  const { unit, w, h, dpi } = sizePreset(page, lang).initial;
  if (unit === 'px' || w === undefined || h === undefined || dpi === undefined) return '';
  return `${num(w)}×${num(h)} ${unit === 'in' ? 'in' : unit} · ${pxLabel(w, h, unit, dpi)}`;
}

const TOOL_NAME_KEY: Partial<Record<ToolSlug, string>> = {
  'passport-size-photo': 'site.toolNames.passportSizePhoto',
  'stamp-size-photo': 'site.toolNames.stampSizePhoto',
  'postcard-size-photo': 'site.toolNames.postcardSizePhoto',
  'custom-preset': 'site.toolNames.customPreset',
};

function toolCard(id: OtherDocId, slug: ToolSlug, lang: Lang): OtherDocCard {
  const tool = getTool(slug);
  const spec =
    slug === 'custom-preset'
      ? t(lang, 'site.home.customSpec')
      : sizeSpec(slug as SizePresetPage, lang);
  return { id, name: t(lang, TOOL_NAME_KEY[slug]!), spec, href: localTool(tool.path, lang), note: null };
}

/** Cards for the home "Other documents (not exams)" section, in display order. */
export function otherDocCards(lang: Lang): OtherDocCard[] {
  const panPhoto = getIdPage('pan-card-photo-size');
  const panSig = getIdPage('pan-card-signature-size');
  const note = t(lang, 'site.home.panNotAffiliated');
  return [
    { id: 'pan-photo', name: t(lang, 'site.home.panPhoto'), spec: panSpec(panPhoto), href: localId(panPhoto, lang), note },
    { id: 'pan-signature', name: t(lang, 'site.home.panSignature'), spec: panSpec(panSig), href: localId(panSig, lang), note },
    toolCard('passport', 'passport-size-photo', lang),
    toolCard('stamp', 'stamp-size-photo', lang),
    toolCard('postcard', 'postcard-size-photo', lang),
    toolCard('custom', 'custom-preset', lang),
  ];
}

/** Home quick chips under the search bar ("Not an exam?"). */
export function notExamChips(lang: Lang): { id: OtherDocId; label: string; href: string }[] {
  return [
    { id: 'pan-photo', label: t(lang, 'site.home.chipPan'), href: localId(getIdPage('pan-card-photo-size'), lang) },
    { id: 'passport', label: t(lang, 'site.home.chipPassport'), href: localTool(getTool('passport-size-photo').path, lang) },
    { id: 'custom', label: t(lang, 'site.home.chipCustom'), href: localTool(getTool('custom-preset').path, lang) },
  ];
}

/** Anchor of the "Not covered" list on the ID hub (same id on /hi). */
export const NOT_COVERED_ANCHOR = 'not-covered';

/** Slim entry for the "Other documents" search group (kept apart from exam entries). */
export interface OtherDocSearchEntry {
  id: OtherDocId;
  en: string;
  hi: string;
  aliases: string[];
  href: { en: string; hi: string };
  /** One-line note shown under the result (Aadhaar: why there is no page). */
  note?: { en: string; hi: string };
}

/** Search aliases per entry (lower case; typo tolerance comes from lib/search). */
export const OTHER_DOC_ALIASES: Readonly<Record<OtherDocId, readonly string[]>> = {
  'pan-photo': ['pan', 'pan card', 'pan card photo', 'nsdl', 'protean', 'uti', 'utiitsl', 'पैन', 'पैन कार्ड'],
  'pan-signature': ['pan signature', 'pan card signature', 'nsdl signature', 'protean signature', 'पैन सिग्नेचर'],
  passport: ['passport', 'passport size', 'passport photo', 'पासपोर्ट'],
  stamp: ['stamp', 'stamp size', 'stamp photo', 'स्टैम्प'],
  postcard: ['postcard', 'postcard size', 'postcard photo', 'पोस्टकार्ड'],
  custom: ['custom', 'custom size', 'own size', 'my exam is not listed', 'exam not listed', 'अपना साइज़'],
  aadhaar: ['aadhaar', 'aadhar', 'adhar', 'aadhar card', 'aadhaar card', 'uidai', 'आधार', 'आधार कार्ड'],
};

export function getOtherDocsSearchIndex(): OtherDocSearchEntry[] {
  const en = otherDocCards('en');
  const hi = otherDocCards('hi');
  const out: OtherDocSearchEntry[] = en.map((c, i) => ({
    id: c.id,
    en: c.name,
    hi: hi[i]!.name,
    aliases: [...OTHER_DOC_ALIASES[c.id]],
    href: { en: c.href, hi: hi[i]!.href },
  }));
  const aadhaar = ID_NOT_COVERED[0]!;
  out.push({
    id: 'aadhaar',
    en: aadhaar.name.en,
    hi: aadhaar.name.hi,
    aliases: [...OTHER_DOC_ALIASES.aadhaar],
    href: { en: `${ID_HUB.en}#${NOT_COVERED_ANCHOR}`, hi: `${ID_HUB.hi}#${NOT_COVERED_ANCHOR}` },
    note: aadhaar.reason,
  });
  return out;
}
