/**
 * Monetization rules. Change behaviour here, not in components.
 *
 * - Partner promo slot: OFF (no partner set). When on, UTM-tagged per exam slug and shown on
 *   the kit summary, exam and guide pages. Never inside upload, crop, result or download areas.
 * - Affiliate slot: OFF.
 * - Ads: OFF. If enabled later: max 2 slots per page, lazy-loaded after the tool is
 *   interactive; never pop-ups, interstitials or auto-play.
 * Every promo/affiliate click fires the `promo_click` analytics event.
 */
import type { Lang } from '@/i18n/config';
import type { ExamGroup } from './exams';

export type PromoPlacement = 'kit-summary' | 'tool' | 'exam' | 'guide';

export interface PromoConfig {
  enabled: boolean;
  partner: string;
  /** Base URL before UTM tags. */
  url: string;
  text: Record<Lang, string>;
  cta: Record<Lang, string>;
  /** Per exam group on/off. A group missing here follows `enabled`. */
  groups: Partial<Record<ExamGroup, boolean>>;
  placements: readonly PromoPlacement[];
}

export const PROMO: PromoConfig = {
  enabled: false,
  partner: '',
  url: '',
  text: { en: '', hi: '' },
  cta: { en: '', hi: '' },
  groups: {},
  // Tool pages and home carry the ExamPilot card instead, so a page never shows two.
  placements: ['kit-summary', 'exam', 'guide'],
};

/**
 * ExamPilot (exampilot.ai): a separate AI mock-interview product, NOT part of SahiSize.
 * Placement (tool pages and home only, never inside upload/crop/result/download areas):
 *  - >=1440px tool pages: `card`, sticky in the right sidebar
 *  - 640–1439px tool pages: `inline` under the result and download section
 *  - phones: `inline`, after the tool (after the Download button)
 *  - home: one dismissible `banner` below the hero (dismissal kept in localStorage)
 * A plain outbound link: rendering it makes no network request beyond our own mock-up image.
 * Clicks fire `promo_click` { slot: 'promo', promo: 'exampilot', placement, page }.
 */
export type ExamPilotVariant = 'card' | 'inline' | 'banner';

export interface ExamPilotCopy {
  /** Sponsorship label, always visible. */
  label: string;
  name: string;
  pitch: string;
  cta: string;
  /** Alt text of the interview-screen mock-up. */
  imageAlt: string;
  /** Banner dismiss button (accessible name). */
  dismiss: string;
}

export const EXAMPILOT = {
  enabled: true,
  id: 'exampilot',
  url: 'https://exampilot.ai/',
  onTools: true,
  onHome: true,
  /** localStorage key that remembers a dismissed home banner. */
  dismissKey: 'sahisize:promo:exampilot:dismissed',
  /** Mock-up image (src/assets/promo/exampilot-mockup.svg). */
  image: { width: 320, height: 200 },
  copy: {
    en: {
      label: 'Sponsored',
      name: 'ExamPilot',
      pitch: 'Practise for exam and job interviews with an AI mock interviewer.',
      cta: 'Try ExamPilot',
      imageAlt: 'Illustration of an AI mock-interview screen',
      dismiss: 'Hide this ExamPilot banner',
    },
    hi: {
      label: 'प्रायोजित',
      name: 'ExamPilot',
      pitch: 'एग्ज़ाम और नौकरी के इंटरव्यू की प्रैक्टिस करें, AI मॉक इंटरव्यूअर के साथ।',
      cta: 'ExamPilot आज़माएँ',
      imageAlt: 'AI मॉक इंटरव्यू स्क्रीन का चित्र',
      dismiss: 'ExamPilot बैनर छिपाएँ',
    },
  } satisfies Record<Lang, ExamPilotCopy>,
  /** Hindi copy still needs a native-speaker review. */
  hiReviewed: false,
} as const;

/** UTM campaign value when no exam is in context (tools, guides). */
export const DEFAULT_CAMPAIGN = 'general';

/** ExamPilot link: utm_source=sahisize&utm_medium=referral&utm_campaign=<page-slug>. */
export function examPilotHref(pageSlug: string): string {
  const u = new URL(EXAMPILOT.url);
  u.searchParams.set('utm_source', 'sahisize');
  u.searchParams.set('utm_medium', 'referral');
  u.searchParams.set('utm_campaign', pageSlug || DEFAULT_CAMPAIGN);
  return u.toString();
}

export interface AffiliateLink {
  label: Record<Lang, string>;
  url: string;
}

export const AFFILIATE: {
  enabled: boolean;
  byGroup: Partial<Record<ExamGroup, readonly AffiliateLink[]>>;
} = {
  enabled: false,
  byGroup: {},
};

export const ADS: {
  enabled: boolean;
  /** Hard cap. */
  maxSlotsPerPage: 2;
  slots: readonly ('below-tool' | 'footer')[];
} = {
  enabled: false,
  maxSlotsPerPage: 2,
  slots: ['below-tool', 'footer'],
};

/**
 * Append UTM tags: utm_source=sahisize&utm_medium={medium}&utm_campaign={campaign}.
 * Existing query parameters are kept; existing utm_* values are replaced.
 */
export function withUtm(
  url: string,
  campaign: string = DEFAULT_CAMPAIGN,
  medium: 'promo' | 'affiliate' = 'promo',
): string {
  const u = new URL(url);
  u.searchParams.set('utm_source', 'sahisize');
  u.searchParams.set('utm_medium', medium);
  u.searchParams.set('utm_campaign', campaign || DEFAULT_CAMPAIGN);
  return u.toString();
}

export interface ResolvedPromo {
  href: string;
  text: string;
  cta: string;
  partner: string;
}

/** The partner promo for a placement, or null when switched off. */
export function getPromo(opts: {
  placement: PromoPlacement;
  lang: Lang;
  exam?: string;
  group?: ExamGroup;
}): ResolvedPromo | null {
  if (!PROMO.enabled || !PROMO.url) return null;
  if (!PROMO.placements.includes(opts.placement)) return null;
  if (opts.group && PROMO.groups[opts.group] === false) return null;
  return {
    href: withUtm(PROMO.url, opts.exam ?? DEFAULT_CAMPAIGN, 'promo'),
    text: PROMO.text[opts.lang],
    cta: PROMO.cta[opts.lang],
    partner: PROMO.partner,
  };
}

/** Affiliate links for an exam group (empty when off). */
export function getAffiliateLinks(
  group: ExamGroup | undefined,
  exam?: string,
): { label: Record<Lang, string>; href: string }[] {
  if (!AFFILIATE.enabled || !group) return [];
  return (AFFILIATE.byGroup[group] ?? []).map((l) => ({
    label: l.label,
    href: withUtm(l.url, exam ?? DEFAULT_CAMPAIGN, 'affiliate'),
  }));
}
