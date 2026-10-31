import 'server-only';
/**
 * "Other documents (not exams)": the home section and the "Other documents" search group.
 * Spec lines are built from the ID section data and the size-preset config, never typed by
 * hand. No logos, no Aadhaar page (UIDAI publishes no upload size), never ask for ID numbers.
 */
import { SIZE_PRESETS, TOOL_META, type SizePresetSlug } from '@/config/tools';
import type { Lang } from '@/i18n/config';
import { t } from '@/i18n/server';
import { num, pxLabel } from '@/lib/format';
import type { OtherDocId } from './core/graph';
import { localHref } from './hindi';
import { ID_HUB_PATHS, NOT_COVERED_ANCHOR, getIdPage, notCovered, type IdDocPage } from './id-documents';
import { content } from './registry';

export type { OtherDocId } from './core/graph';

/** Short name of the agency whose values the PAN cards show. */
const PAN_AGENCY = 'Protean (NSDL)';

export interface OtherDocCard {
  id: OtherDocId;
  name: string;
  /** Spec line built from config/data. */
  spec: string;
  href: string;
  /** Small "not affiliated" line (PAN cards). */
  note: string | null;
}

/** "Protean (NSDL) · 3.5×2.5 cm · ≤ 20 KB" (official order: height × width). */
function panSpec(p: IdDocPage): string {
  const ph = p.spec.physical!;
  return `${PAN_AGENCY} · ${num(ph.height)}×${num(ph.width)} ${ph.unit} · ≤ ${p.official.maxKB} KB`;
}

const UNIT_TEXT: Record<Lang, Record<'cm' | 'mm' | 'in', string>> = {
  en: { cm: 'cm', mm: 'mm', in: 'in' },
  hi: { cm: 'cm', mm: 'mm', in: 'in' },
};

/** "3.5×4.5 cm · 276×354 px" from the size-preset page's starting values. */
function sizeSpec(slug: SizePresetSlug, lang: Lang): string {
  const { unit, w, h, dpi } = SIZE_PRESETS[slug].initial;
  if (unit === 'px' || w === undefined || h === undefined || dpi === undefined) return '';
  return `${num(w)}×${num(h)} ${UNIT_TEXT[lang][unit]} · ${pxLabel(w, h, unit, dpi)}`;
}

const TOOL_CARDS: { id: OtherDocId; slug: SizePresetSlug | 'custom-preset'; nameKey: string }[] = [
  { id: 'passport', slug: 'passport-size-photo', nameKey: 'site.toolNames.passportSizePhoto' },
  { id: 'stamp', slug: 'stamp-size-photo', nameKey: 'site.toolNames.stampSizePhoto' },
  { id: 'postcard', slug: 'postcard-size-photo', nameKey: 'site.toolNames.postcardSizePhoto' },
  { id: 'custom', slug: 'custom-preset', nameKey: 'site.toolNames.customPreset' },
];

/** Cards for the home "Other documents (not exams)" section, in display order. */
export function otherDocCards(lang: Lang): OtherDocCard[] {
  const note = t(lang, 'site.home.panNotAffiliated');
  const pan = (id: OtherDocId, slug: string, nameKey: string): OtherDocCard => {
    const p = getIdPage(slug)!;
    return { id, name: t(lang, nameKey), spec: panSpec(p), href: lang === 'hi' && p.hiPath ? p.hiPath : p.path, note };
  };
  return [
    pan('pan-photo', 'pan-card-photo-size', 'site.home.panPhoto'),
    pan('pan-signature', 'pan-card-signature-size', 'site.home.panSignature'),
    ...TOOL_CARDS.map(({ id, slug, nameKey }) => ({
      id,
      name: t(lang, nameKey),
      spec: slug === 'custom-preset' ? t(lang, 'site.home.customSpec') : sizeSpec(slug, lang),
      href: localHref(TOOL_META[slug].path, lang),
      note: null,
    })),
  ];
}

/** Slim entry for the "Other documents" search group. */
export interface OtherDocSearchEntry {
  id: OtherDocId;
  en: string;
  hi: string;
  aliases: string[];
  href: { en: string; hi: string };
  /** One-line note under the result (Aadhaar: why there is no page). */
  note?: { en: string; hi: string };
}

export function otherDocsSearchIndex(): OtherDocSearchEntry[] {
  const aliases = content().otherDocAliases;
  const en = otherDocCards('en');
  const hi = otherDocCards('hi');
  const out: OtherDocSearchEntry[] = en.map((c, i) => ({
    id: c.id,
    en: c.name,
    hi: hi[i]!.name,
    aliases: [...aliases[c.id]],
    href: { en: c.href, hi: hi[i]!.href },
  }));
  const aadhaar = notCovered()[0]!;
  out.push({
    id: 'aadhaar',
    en: aadhaar.name.en,
    hi: aadhaar.name.hi,
    aliases: [...aliases.aadhaar],
    href: { en: `${ID_HUB_PATHS.en}#${NOT_COVERED_ANCHOR}`, hi: `${ID_HUB_PATHS.hi}#${NOT_COVERED_ANCHOR}` },
    note: aadhaar.reason,
  });
  return out;
}
