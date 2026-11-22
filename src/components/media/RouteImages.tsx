/**
 * Page-level wiring for the generated illustrations (src/content/images/manifest.json).
 *
 *   <RouteHero route="/exam/neet-ug" lang={lang} />
 *   <RouteImages route="/exam/neet-ug" lang={lang} placements={['example-correct', 'example-rejected']} />
 *
 * Both look slots up by the page's ENGLISH path (Hindi pages reuse the English slot, with the
 * Hindi alt text). Until a slot is approved and optimized they render NOTHING (or `fallback`):
 * no wrapper, no empty box, so a page without generated images is byte-for-byte what it was.
 *
 * Placement rule: the hero is rendered by the layouts AFTER the answer box / tool, so it can
 * never push the answer or the tool below the first phone screen. It therefore lazy-loads.
 */
import { type ReactNode } from 'react';
import { type Lang } from '@/i18n/config';
import { type Placement } from './image-schema';
import { imagesForRoute } from './images';
import { Picture } from './Picture';

/** Dark-mode plate for light-background art: thin ring + rounded clip, no light padding frame. */
export const HERO_DARK_PLATE = 'dark:overflow-hidden dark:rounded-3xl dark:ring-1 dark:ring-white/10';
export const HERO_DARK_IMG = 'dark:rounded-none dark:brightness-[.88]';

interface RouteHeroProps {
  /** English path of the page, e.g. "/tools/compress-image". */
  route: string;
  lang: Lang;
  /** Classes for the <figure> wrapper (only rendered when an image exists). */
  className?: string;
  /** Eager + fetchpriority=high. Only for a hero that is above the fold on every screen size. */
  priority?: boolean;
  /** Rendered when the route has no published hero (e.g. the home page's built-in SVG art). */
  fallback?: ReactNode;
  /** Classes for the <img> (default: fluid, rounded). */
  imgClassName?: string;
  /** Overrides the manifest `sizes` when the page lays the hero out differently. */
  sizes?: string;
}

export function RouteHero({ route, lang, className, priority, fallback = null, imgClassName, sizes }: RouteHeroProps) {
  const hero = imagesForRoute(route, lang).find((r) => r.slot.placement === 'hero');
  if (!hero) return <>{fallback}</>;
  // The art has a light (#F8FAFF) background. In dark mode every hero gets the same quiet
  // treatment (design-plan 6.5): a thin 1 px ring, rounded clip, image dimmed to ~.88, so it
  // reads as a deliberate plate instead of a white slab on the #0B1020 page.
  return (
    <figure
      className={`${className ?? 'mt-6 max-w-md overflow-hidden rounded-card'} ${HERO_DARK_PLATE}`}
      data-route-hero
    >
      <Picture
        slot={hero.slot.id}
        lang={lang}
        priority={priority}
        sizes={sizes}
        className={`${imgClassName ?? 'h-auto w-full rounded-card'} ${HERO_DARK_IMG}`}
      />
    </figure>
  );
}

interface RouteImagesProps {
  route: string;
  lang: Lang;
  placements: readonly Placement[];
  className?: string;
}

/** Example / step illustrations for the spec or rules section: a small responsive grid. */
export function RouteImages({ route, lang, placements, className }: RouteImagesProps) {
  const want = new Set<Placement>(placements);
  const images = imagesForRoute(route, lang).filter((r) => want.has(r.slot.placement));
  if (images.length === 0) return null;
  return (
    <div className={className ?? 'mt-6 grid max-w-3xl gap-4 sm:grid-cols-2'} data-route-images>
      {images.map((r) => (
        <figure key={r.slot.id} className="overflow-hidden rounded-card border border-border bg-surface">
          <Picture slot={r.slot.id} lang={lang} className="h-auto w-full" />
        </figure>
      ))}
    </div>
  );
}
