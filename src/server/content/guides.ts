import 'server-only';
/** Guides (src/content/guides/{lang}/{slug}.json). */
import { guidePath } from '@/config/routes';
import { otherLang, type Lang } from '@/i18n/config';
import type { Alternates } from '@/seo/hreflang';
import { content } from './registry';
import type { Guide } from './schemas/pages';

export type { Guide } from './schemas/pages';

/** Published (non-draft) guides of a language, by `order`. */
export function listGuides(lang: Lang): Guide[] {
  return content().guides[lang].filter((g) => !g.draft);
}

export function getGuide(slug: string, lang: Lang): Guide | undefined {
  return listGuides(lang).find((g) => g.slug === slug);
}

/** generateStaticParams helper. */
export function guideSlugs(lang: Lang): string[] {
  return listGuides(lang).map((g) => g.slug);
}

/** True when the other-language version of the guide exists. */
export function hasGuideCounterpart(slug: string, lang: Lang): boolean {
  return !!getGuide(slug, otherLang(lang));
}

/**
 * hreflang pair for a guide. A Hindi-only guide has no English page, so it gets no pair
 * (null) and only its own canonical.
 */
export function guideAlternates(slug: string): Alternates | null {
  const en = getGuide(slug, 'en');
  const hi = getGuide(slug, 'hi');
  if (!en) return null;
  return { en: guidePath(slug), hi: hi ? `/hi${guidePath(slug)}` : null };
}

/** <title> of a guide: seoTitle, else the title. */
export function guideTitle(g: Guide): string {
  return g.seoTitle ?? g.title;
}

/** YYYY-MM-DD of the last change (updatedAt, else publishedAt). */
export function guideLastmod(g: Pick<Guide, 'publishedAt' | 'updatedAt'>): string {
  return (g.updatedAt ?? g.publishedAt).slice(0, 10);
}
