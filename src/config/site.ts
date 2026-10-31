/**
 * Site-wide constants. Imports nothing but types.
 *
 * SITE_URL: set PUBLIC_SITE_URL (server) or NEXT_PUBLIC_SITE_URL (also inlined into client
 * bundles) at build time; canonical URLs, sitemaps, OG images and JSON-LD all read it.
 */
import type { Lang } from '@/i18n/config';

export const SITE_NAME = 'SahiSize';

/** Fallback when no env var is set. No trailing slash. */
export const DEFAULT_SITE_URL = 'https://sahisize.in';

function envSiteUrl(): string | undefined {
  if (typeof process === 'undefined' || !process.env) return undefined;
  // Literal property access so Next can inline NEXT_PUBLIC_SITE_URL into client code.
  const v = process.env.NEXT_PUBLIC_SITE_URL || process.env.PUBLIC_SITE_URL;
  return v && v.trim() ? v.trim() : undefined;
}

/** Absolute origin of the site, no trailing slash, e.g. "https://sahisize.in". */
export const SITE_URL: string = (envSiteUrl() ?? DEFAULT_SITE_URL).replace(/\/+$/, '');

export const TAGLINE: Record<Lang, string> = {
  en: 'Right size, first time.',
  hi: 'Pehli baar mein sahi size.',
};

export const CORE_PROMISE: Record<Lang, string> = {
  en: 'Right size, first time. Your photo never leaves your phone.',
  hi: 'Pehli baar mein sahi size. Aapki file aapke phone mein hi rehti hai.',
};

/** Operating entity shown in the footer and legal pages. */
export const ENTITY_NAME = 'Logicbuds Private Limited';
export const BRAND_OWNER = 'Illumin';

/** Contact address for /contact and /report (mailto). */
export const CONTACT_EMAIL = 'support@sahisize.in';

/**
 * Official social profiles (absolute URLs) for Organization JSON-LD `sameAs`. Leave empty
 * until a profile actually exists.
 */
export const SOCIAL_LINKS: readonly string[] = [];

/**
 * Named person who reviews exam specs and guides (`reviewedBy` in guide JSON-LD). Fill only
 * with a real, consenting reviewer; null = omitted.
 */
export const SPEC_REVIEWER: { name: string; jobTitle?: string; url?: string } | null = null;

export const NOT_AFFILIATED: Record<Lang, string> = {
  en: 'Not affiliated with any government body or exam conducting authority.',
  hi: 'किसी भी सरकारी संस्था या परीक्षा बोर्ड से संबद्ध नहीं।',
};

/** Brand colours used outside CSS (manifest, theme-color meta, OG images). */
export const THEME_COLOR = '#1E2A78';
export const THEME_COLOR_DARK = '#0E1430';
export const BACKGROUND_COLOR = '#FFFBF3';

/** Default Open Graph image path (served by the /og route handler). */
export const DEFAULT_OG_IMAGE = '/og/default.png';
export const OG_IMAGE_WIDTH = 1200;
export const OG_IMAGE_HEIGHT = 630;

/** Organization logo (absolute path), used in JSON-LD. */
export const LOGO_PATH = '/pwa-512.png';

/** Max input upload size accepted by the uploader. */
export const MAX_UPLOAD_BYTES = 25 * 1024 * 1024;

export const ACCEPTED_IMAGE_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/heic',
  'image/heif',
] as const;
export const ACCEPTED_IMAGE_EXT = ['.jpg', '.jpeg', '.png', '.webp', '.heic', '.heif'] as const;
export const ACCEPTED_PDF_TYPES = ['application/pdf'] as const;

/** Presets older than this are flagged by `npm run presets:check`. */
export const PRESET_STALE_DAYS = 120;
/** A notification season starting within this many days is flagged too. */
export const PRESET_SEASON_WARN_DAYS = 30;
