/**
 * Content Security Policy source of truth (PLAN 3.12, QUESTIONS Q10).
 * Phase 1 stub; the Security workstream finalises it in Phase 4.
 *
 * - The document CSP is emitted as a <meta> tag by Astro `experimental.csp`, which
 *   adds sha256 hashes for every inline script it renders.
 * - `frame-ancestors` cannot live in a meta tag; it goes into public/_headers
 *   as a header-only policy WITHOUT script-src (see HEADER_CSP).
 */

/** Third-party analytics origins allowed in script-src / connect-src. Empty until configured. */
export const ANALYTICS_ORIGINS: string[] = [];

/** script-src resources (Astro appends hashes). */
export const SCRIPT_RESOURCES: string[] = ["'self'", "'wasm-unsafe-eval'", ...ANALYTICS_ORIGINS];

/** style-src resources. Inline style attributes from Preact/Astro need 'unsafe-inline'. */
export const STYLE_RESOURCES: string[] = ["'self'", "'unsafe-inline'"];

/** Other directives, in the shape Astro's experimental.csp.directives expects. */
export const CSP_DIRECTIVES = [
  "default-src 'self'",
  "worker-src 'self' blob:",
  "img-src 'self' data: blob:",
  `connect-src 'self'${ANALYTICS_ORIGINS.length ? ' ' + ANALYTICS_ORIGINS.join(' ') : ''}`,
  "font-src 'self'",
  "manifest-src 'self'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
] as const;

/** Header-only CSP for public/_headers (no script-src, see PLAN 3.12). */
export const HEADER_CSP = "frame-ancestors 'none'";
