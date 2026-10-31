/**
 * Web app manifest data, served by src/app/manifest.ts at /manifest.webmanifest.
 */
import { BACKGROUND_COLOR, SITE_NAME, TAGLINE, THEME_COLOR } from './site';

export const PWA_MANIFEST = {
  id: '/',
  name: `${SITE_NAME}: exam photo, signature and document resizer`,
  short_name: SITE_NAME,
  description: `${TAGLINE.en} Resize exam photos, signatures and documents to the exact size. Works offline, nothing is uploaded.`,
  lang: 'en-IN',
  dir: 'ltr',
  start_url: '/',
  scope: '/',
  display: 'standalone',
  orientation: 'portrait',
  theme_color: THEME_COLOR,
  background_color: BACKGROUND_COLOR,
  categories: ['utilities', 'education', 'productivity'],
  icons: [
    { src: '/pwa-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
    { src: '/pwa-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
    { src: '/pwa-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    { src: '/icon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any' },
  ],
} as const;

/** Offline fallback page served by the service worker. */
export const OFFLINE_PATH = '/offline';
