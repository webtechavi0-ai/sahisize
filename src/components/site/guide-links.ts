/**
 * Which guide a page should link to (SEO plan E2). Pure, so the routing rule is testable;
 * `GuideLink` renders it. The two guides here had a single internal link each (crawl,
 * 14 Nov 2026); they are not translations of each other, so no hreflang between them.
 */
import type { Lang } from '@/i18n/config';

/** "how to upload photo and signature in online application form" (keyword map §8). */
export const UPLOAD_GUIDE = 'how-to-upload-photo-signature';
/** Hindi-only guide: "photo ko kb me kaise kare". */
export const HINDI_KB_GUIDE = 'photo-ko-kb-me-kaise-kare';

/** Exam document pages: photo and signature uploads get the upload guide. */
export function guideForDocument(doc: string): string | null {
  return doc === 'photo' || doc === 'signature' ? UPLOAD_GUIDE : null;
}

/** Tool pages: Hindi photo-KB tools get the Hindi KB guide. `slug` is the /tools/<slug> slug. */
export function guideForTool(slug: string, lang: Lang): string | null {
  if (lang !== 'hi') return null;
  return slug === 'resize-image' || slug === 'compress-image' || /^compress-image-/.test(slug)
    ? HINDI_KB_GUIDE
    : null;
}
