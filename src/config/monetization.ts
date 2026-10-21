/**
 * Monetization config (SPEC 10). Change behaviour here, not in components.
 *
 * - Promo slot: ON by default, English Setu, UTM-tagged per exam slug.
 *   Shown on the kit summary screen and below tools / after the exam tool area.
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
  enabled: true,
  partner: 'English Setu',
  url: 'https://englishsetu.com/',
  text: {
    en: 'Interview aur job ke liye English improve karein — English Setu',
    hi: 'इंटरव्यू और जॉब के लिए अपनी English बेहतर करें — English Setu',
  },
  cta: { en: 'Try English Setu', hi: 'English Setu आज़माएँ' },
  groups: {},
  placements: ['kit-summary', 'tool', 'exam', 'guide'],
};

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
  if (!PROMO.enabled) return null;
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
