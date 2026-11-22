/**
 * doc-seo.json, validated once at import (a schema error fails the build). No imports from
 * `@/server/content`, so `hindi.ts` can use `hindiDocKeys()` without an import cycle.
 */
import raw from './doc-seo.json';
import { docSeoSchema, type DocSeoData, type DocSeoPage } from './schema';

export const docSeo: DocSeoData = docSeoSchema.parse(raw);

/** Override for "{exam slug}/{doc slug}", if any. */
export function docSeoPage(slug: string, doc: string): DocSeoPage | undefined {
  return docSeo.pages[`${slug}/${doc}`];
}

/** "{slug}/{doc}" keys that carry Hindi copy (a /hi page exists when the exam has a Hindi hub too). */
export function hindiDocKeys(): Set<string> {
  return new Set(Object.entries(docSeo.pages).filter(([, p]) => p.hi).map(([k]) => k));
}
