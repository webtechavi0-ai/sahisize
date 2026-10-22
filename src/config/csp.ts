/**
 * Content Security Policy source of truth (PLAN 3.12, QUESTIONS Q10). Finalised in Phase 4
 * (Security); see SECURITY.md.
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

/** Inline style attributes (not elements) may use 'unsafe-inline'; see CSP_DIRECTIVES. */
export const STYLE_ATTR_DIRECTIVE = "style-src-attr 'unsafe-inline'";

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
  // Astro always adds sha256 hashes to style-src (its island <style> tag), and a hash makes
  // browsers ignore 'unsafe-inline', so style="" attributes were blocked: SSR style
  // attributes (Q10) and WebKit's own <select> rendering (found by csp.spec on /report).
  // style-src-attr governs attributes only, so <style> elements stay hash-locked.
  // Astro's directive allow-list has no style-src-attr and validates with startsWith, so it
  // rides on the form-action entry; csp.spec checks it reaches the <meta> tag.
  `form-action 'self'; ${STYLE_ATTR_DIRECTIVE}`,
] as const;

/**
 * Header-only CSP for every route in public/_headers (no script-src, see PLAN 3.12). The
 * header and the <meta> policy are both enforced, so this must not restrict anything the
 * meta policy allows. tests/security/headers.test.ts checks _headers against it.
 */
export const HEADER_CSP = "frame-ancestors 'none'";

/**
 * Extra header CSP for the engine worker scripts (/_astro/workers/*). A worker's policy comes
 * from its own response; 'unsafe-eval' is the Chrome 90-96 WASM fallback (Q10).
 */
export const WORKER_CSP =
  "script-src 'self' 'wasm-unsafe-eval' 'unsafe-eval'; object-src 'none'; base-uri 'none'";

/**
 * Extra header CSP for the pdf.js worker (/_astro/pdf.worker*). It parses untrusted PDFs, so
 * it gets no eval of any kind (defence in depth for GHSA-hq66-cqwq-w95j, see SECURITY.md).
 */
export const PDF_WORKER_CSP = "script-src 'self'; object-src 'none'; base-uri 'none'";
