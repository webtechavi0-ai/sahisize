/**
 * ★ Frozen contract (Phase 1). Site-wide constants. Change only with orchestrator
 * approval and a note in QUESTIONS.md.
 *
 * The production domain is not confirmed yet (QUESTIONS Q3). Set PUBLIC_SITE_URL at
 * build time to override the placeholder; everything (canonical, sitemap, OG,
 * astro.config `site`) reads SITE_URL from here.
 */

export const SITE_NAME = 'SahiSize';

/** Placeholder until the owner confirms the domain. No trailing slash. */
export const DEFAULT_SITE_URL = 'https://sahisize.in';

function readEnvSiteUrl(): string | undefined {
  // Works in astro.config (Node), Astro pages (import.meta.env) and Vitest.
  const fromProcess =
    typeof process !== 'undefined' && process.env ? process.env.PUBLIC_SITE_URL : undefined;
  return fromProcess && fromProcess.trim() ? fromProcess.trim() : undefined;
}

export const SITE_URL: string = (readEnvSiteUrl() ?? DEFAULT_SITE_URL).replace(/\/+$/, '');

export const TAGLINE = {
  en: 'Right size, first time.',
  hi: 'Pehli baar mein sahi size.',
} as const;

export const CORE_PROMISE = {
  en: 'Right size, first time. Your photo never leaves your phone.',
  hi: 'Pehli baar mein sahi size. Aapki file aapke phone mein hi rehti hai.',
} as const;

/** Operating entity shown in the footer and legal pages (SPEC 11.2). */
export const ENTITY_NAME = 'ONERIQ SERVICES LLP';
export const BRAND_OWNER = 'Illumin';

/** Contact address for /contact and /report (mailto). Placeholder until the domain is live. */
export const CONTACT_EMAIL = 'support@sahisize.in';

export const NOT_AFFILIATED = {
  en: 'Not affiliated with any government body or exam conducting authority.',
  hi: 'किसी भी सरकारी संस्था या परीक्षा बोर्ड से संबद्ध नहीं।',
} as const;

/** Locales. `en` is served at `/`, `hi` under `/hi/` (PLAN 3.11). */
export const LOCALES = ['en', 'hi'] as const;
export type Lang = (typeof LOCALES)[number];
export const DEFAULT_LANG: Lang = 'en';

/** Values for <html lang> and hreflang. */
export const HTML_LANG: Record<Lang, string> = { en: 'en-IN', hi: 'hi-IN' };
export const OG_LOCALE: Record<Lang, string> = { en: 'en_IN', hi: 'hi_IN' };

/** Brand colours used outside CSS (PWA manifest, meta theme-color, OG images). */
export const THEME_COLOR = '#1E3A8A';
export const THEME_COLOR_DARK = '#0B1220';
export const BACKGROUND_COLOR = '#F8FAFC';

/** Default OG image (generated at build by Workstream C, PLAN 3.14). */
export const DEFAULT_OG_IMAGE = '/og/default.png';

/** Max input upload size accepted by the uploader (SPEC K3). */
export const MAX_UPLOAD_BYTES = 25 * 1024 * 1024;

/** Accepted input MIME types / extensions (SPEC K3). */
export const ACCEPTED_IMAGE_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/heic',
  'image/heif',
] as const;
export const ACCEPTED_IMAGE_EXT = ['.jpg', '.jpeg', '.png', '.webp', '.heic', '.heif'] as const;
export const ACCEPTED_PDF_TYPES = ['application/pdf'] as const;

/** Presets older than this are flagged by `npm run presets:check` (SPEC 8.4). */
export const PRESET_STALE_DAYS = 120;
export const PRESET_SEASON_WARN_DAYS = 30;

/** Absolute URL helper. `path` must start with '/'. */
export function absoluteUrl(path: string): string {
  return `${SITE_URL}${path.startsWith('/') ? path : `/${path}`}`;
}
