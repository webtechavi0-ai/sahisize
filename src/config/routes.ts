/**
 * Static route paths (English). Dynamic routes are built by the helpers below.
 * Hindi counterparts of dynamic pages are derived from content data (server/content/hindi.ts).
 */

export const ROUTES = {
  home: '/',
  exams: '/exams',
  guides: '/guides',
  tools: '/tools',
  idDocuments: '/id-documents',
  sources: '/sources',
  about: '/about',
  contact: '/contact',
  privacy: '/privacy',
  terms: '/terms',
  disclaimer: '/disclaimer',
  editorialPolicy: '/editorial-policy',
  report: '/report',
  offline: '/offline',
} as const;

/** Static English pages that have a Hindi twin at /hi{path} (/ -> /hi). */
export const STATIC_HINDI_PAGES: readonly string[] = [
  ROUTES.home,
  ROUTES.exams,
  ROUTES.guides,
  ROUTES.tools,
  ROUTES.idDocuments,
  ROUTES.editorialPolicy,
];

/**
 * Pages that are never indexed and never listed in a sitemap. Kit pages (/kit/*, /hi/kit/*)
 * are noindex too (the exam page is the indexable one).
 */
export const NOINDEX_PATHS: readonly string[] = [ROUTES.report, ROUTES.offline, '/tools/custom-preset'];
export const KIT_PAGES_NOINDEX = true;

export const examPath = (slug: string): string => `/exam/${slug}`;
export const examDocPath = (slug: string, docSlug: string): string => `/exam/${slug}/${docSlug}`;
export const kitPath = (slug: string): string => `/kit/${slug}`;
export const guidePath = (slug: string): string => `/guides/${slug}`;
export const familyPath = (family: string): string => `/exams/${family}`;
export const idDocumentPath = (slug: string): string => `/id-documents/${slug}`;
export const toolPath = (slug: string): string => `/tools/${slug}`;
