/**
 * <Picture slot="home-hero" lang={lang} priority />
 *
 * Server component for the generated illustrations in src/content/images/manifest.json.
 * Renders <picture> with AVIF and WebP sources, explicit width/height (no layout shift), alt text
 * in the page language and a tiny blurred placeholder. Renders `fallback` (default: nothing)
 * until the slot is approved AND optimized, so a page never shows a broken image.
 *
 * `priority` is for the one above-the-fold hero of a page: eager load + fetchpriority=high.
 * Everything else lazy-loads.
 */
import { type ReactNode } from 'react';
import { type Lang } from '@/i18n/config';
import { resolveImage } from './images';
import { pictureModel } from './picture-model';

export interface PictureProps {
  slot: string;
  lang: Lang;
  priority?: boolean;
  /** Classes for the <img>. Default: fluid width, intrinsic aspect. */
  className?: string;
  /** Overrides the manifest `sizes`. */
  sizes?: string;
  /** Shown when the slot has no published image yet. Default: render nothing. */
  fallback?: ReactNode;
}

export function Picture({ slot, lang, priority, className, sizes, fallback = null }: PictureProps) {
  const resolved = resolveImage(slot, lang);
  if (!resolved) return <>{fallback}</>;
  const { sources, img } = pictureModel(resolved, { priority, sizes });
  return (
    <picture>
      {sources.map((s) => (
        <source key={s.type} type={s.type} srcSet={s.srcSet} sizes={s.sizes} />
      ))}
      {/* Plain <img>: next/image is unoptimized here and would add nothing over this markup. */}
      <img {...img} alt={img.alt} className={className ?? 'h-auto w-full'} />
    </picture>
  );
}

export default Picture;
