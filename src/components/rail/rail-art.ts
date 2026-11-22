/**
 * Which illustration the side panel shows (server only). Pure lookup over the image manifest, kept
 * out of blocks.tsx so it can be unit-tested without JSX.
 */
import { groupImage, imagesForRoute, type ResolvedImage } from '@/components/media/images';
import type { Lang } from '@/i18n/config';

export interface ArtSource {
  /** English routes whose own hero is preferred, most specific first (exam, then its hub...). */
  routes?: readonly (string | null | undefined)[];
  /** Exam group ("banking", "ssc") whose illustration is used when no route above has a hero. */
  group?: string | null;
  /** Routes tried last, after the group (e.g. the family hub's hero). */
  fallbackRoutes?: readonly (string | null | undefined)[];
}

function routeHeroImage(chain: readonly (string | null | undefined)[], lang: Lang): ResolvedImage | null {
  for (const r of chain) {
    const hero = r ? imagesForRoute(r, lang).find((x) => x.slot.placement === 'hero') : undefined;
    if (hero) return hero;
  }
  return null;
}

/**
 * The panel illustration: the first route in `routes` with a published hero, else the group's
 * illustration, else the first hero in `fallbackRoutes`. Null when none is published.
 */
export function artImageFor(src: ArtSource, lang: Lang): ResolvedImage | null {
  return (
    routeHeroImage(src.routes ?? [], lang) ??
    (src.group ? groupImage(src.group, lang) : null) ??
    routeHeroImage(src.fallbackRoutes ?? [], lang)
  );
}
