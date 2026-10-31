/**
 * Monetization config (SPEC 10). Change behaviour here, not in components.
 *
 * - Partner promo slot: OFF (no partner set). When a partner is added, it is UTM-tagged
 *   per exam slug and shown on the kit summary screen and after the exam tool area.
 *   Never inside upload, crop, result or download areas.
 * - Affiliate slot: OFF by default (per exam group when turned on).
 * - Ads: OFF. If enabled later: max 2 slots per page (below tool, footer), lazy-loaded
 *   after the tool is interactive; never pop-ups, interstitials or auto-play.
 *
 * Every promo/affiliate click fires the `promo_click` analytics event.
 */
import type { ExamGroup } from '@/content/presets/schema';

export type PromoPlacement = 'kit-summary' | 'tool' | 'exam' | 'guide';

export interface PromoConfig {
  enabled: boolean;
  /** Partner name shown on the card. */
  partner: string;
  /** Base URL before UTM tags. */
  url: string;
  text: { en: string; hi: string };
  cta: { en: string; hi: string };
  /** Per exam group on/off. A group missing here uses `enabled`. */
  groups: Partial<Record<ExamGroup, boolean>>;
  /** Placements where the slot may render. */
  placements: readonly PromoPlacement[];
}

export const PROMO: PromoConfig = {
  enabled: false,
  partner: '',
  url: '',
  text: { en: '', hi: '' },
  cta: { en: '', hi: '' },
  groups: {},
  // Tool pages and the home page carry the ExamPilot promotion instead (EXAMPILOT below),
  // so a page never shows two sponsored cards.
  placements: ['kit-summary', 'exam', 'guide'],
};

/**
 * ExamPilot (exampilot.ai): a separate AI mock-interview product, NOT part of SahiSize.
 * All copy lives here; edit wording without touching components
 * (src/components/promo/ExamPilotPromo.tsx renders it).
 *
 * Placement (tool pages and home only, never inside upload, crop, result or download areas):
 *  - >=1440px tool pages: `card` variant, sticky in the right sidebar.
 *  - 640–1439px tool pages: `inline` variant under the result and download section.
 *  - phones: `inline`, after the tool (so after the Download button), never above the tool.
 *  - home: one dismissible `banner` below the hero (dismissal kept in localStorage).
 * It is a plain outbound link: rendering it makes no network request beyond our own
 * mock-up image. Clicks fire `promo_click` { promo: 'exampilot', placement, page }.
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

export const EXAMPILOT: {
  enabled: boolean;
  id: 'exampilot';
  url: string;
  /** Show on tool pages / the home page. */
  onTools: boolean;
  onHome: boolean;
  /** localStorage key that remembers a dismissed home banner. */
  dismissKey: string;
  copy: Record<'en' | 'hi', ExamPilotCopy>;
  /** Hindi copy still needs a native-speaker review (LAUNCH_CHECKLIST, QUESTIONS Q27). */
  hiReviewed: boolean;
} = {
  enabled: true,
  id: 'exampilot',
  url: 'https://exampilot.ai/',
  onTools: true,
  onHome: true,
  dismissKey: 'sahisize:promo:exampilot:dismissed',
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
  },
  hiReviewed: false,
};

/** ExamPilot link: utm_source=sahisize&utm_medium=referral&utm_campaign=<page-slug>. */
export function examPilotHref(pageSlug: string): string {
  const u = new URL(EXAMPILOT.url);
  u.searchParams.set('utm_source', 'sahisize');
  u.searchParams.set('utm_medium', 'referral');
  u.searchParams.set('utm_campaign', pageSlug || DEFAULT_CAMPAIGN);
  return u.toString();
}

export interface AffiliateLink {
  label: { en: string; hi: string };
  url: string;
}

export interface AffiliateConfig {
  enabled: boolean;
  /** Optional test-series or book links per exam group. */
  byGroup: Partial<Record<ExamGroup, AffiliateLink[]>>;
}

export const AFFILIATE: AffiliateConfig = {
  enabled: false,
  byGroup: {},
};

export interface AdsConfig {
  enabled: boolean;
  /** Hard cap from SPEC 10. */
  maxSlotsPerPage: 2;
  slots: readonly ('below-tool' | 'footer')[];
}

export const ADS: AdsConfig = {
  enabled: false,
  maxSlotsPerPage: 2,
  slots: ['below-tool', 'footer'],
};

/** UTM campaign value when no exam is in context (tools, guides). */
export const DEFAULT_CAMPAIGN = 'general';

/**
 * Append UTM tags: utm_source=sahisize&utm_medium=promo&utm_campaign={exam-slug}.
 * Existing query parameters are preserved; existing utm_* values are replaced.
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

/**
 * The promo to show for a placement, or null when switched off.
 * B's kit summary and C's pages both use this so the rules live in one place.
 */
export function getPromo(opts: {
  placement: PromoPlacement;
  lang: 'en' | 'hi';
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

/** Affiliate links for a group (empty when off). */
export function getAffiliateLinks(group: ExamGroup | undefined, exam?: string) {
  if (!AFFILIATE.enabled || !group) return [];
  return (AFFILIATE.byGroup[group] ?? []).map((l) => ({
    label: l.label,
    href: withUtm(l.url, exam ?? DEFAULT_CAMPAIGN, 'affiliate'),
  }));
}
