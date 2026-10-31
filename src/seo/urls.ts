/**
 * Absolute and canonical URLs. Pure.
 */
import { SITE_URL } from '@/config/site';

export { SITE_URL } from '@/config/site';

export function isAbsoluteUrl(s: string): boolean {
  return /^https?:\/\//i.test(s);
}

/**
 * Canonical form of a site path: no ".html", no trailing slash (except "/"), "/index" -> "/",
 * query and hash dropped, duplicate slashes collapsed.
 *   normalizePath('/tools/resize-image.html') -> '/tools/resize-image'
 *   normalizePath('/hi/')                      -> '/hi'
 */
export function normalizePath(path: string): string {
  const p = (path.split(/[?#]/)[0] ?? '')
    .replace(/\/{2,}/g, '/')
    .replace(/\.html$/, '')
    .replace(/\/index$/, '/')
    .replace(/(.)\/+$/, '$1');
  if (!p) return '/';
  return p.startsWith('/') ? p : `/${p}`;
}

/** Absolute URL for a site path ("/exams" -> "https://sahisize.in/exams"). Absolute URLs pass through. */
export function absoluteUrl(pathOrUrl: string): string {
  if (isAbsoluteUrl(pathOrUrl)) return pathOrUrl;
  return `${SITE_URL}${pathOrUrl.startsWith('/') ? pathOrUrl : `/${pathOrUrl}`}`;
}

/** Canonical absolute URL of a page path (normalised; the home page keeps its slash). */
export function canonicalUrl(path: string): string {
  const p = normalizePath(path);
  return p === '/' ? `${SITE_URL}/` : `${SITE_URL}${p}`;
}

/**
 * OG image path for an English page path: "/" -> "/og/home.png",
 * "/exam/ibps-po" -> "/og/exam/ibps-po.png". Hindi pages use their English counterpart's
 * image (OG text is English-only).
 */
export function ogImagePath(enPath: string): string {
  const p = normalizePath(enPath);
  if (p === '/') return '/og/home.png';
  return `/og${p}.png`;
}
