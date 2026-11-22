/**
 * Pure attribute builder for <Picture>. Kept out of the .tsx file so it is unit-testable
 * (the repo's vitest setup does not transform JSX).
 */
import { type CSSProperties } from 'react';
import { type ImageFile } from './image-schema';
import { type ResolvedImage } from './images';

export function srcSet(files: readonly ImageFile[]): string {
  return files.map((f) => `${f.src} ${f.width}w`).join(', ');
}

export interface PictureModel {
  sources: { type: 'image/avif' | 'image/webp'; srcSet: string; sizes: string }[];
  img: {
    src: string;
    width: number;
    height: number;
    alt: string;
    loading: 'eager' | 'lazy';
    fetchPriority: 'high' | 'auto';
    decoding: 'sync' | 'async';
    style: CSSProperties | undefined;
    'data-slot': string;
  };
}

export function pictureModel(
  { slot, image, alt }: ResolvedImage,
  { priority = false, sizes }: { priority?: boolean; sizes?: string } = {},
): PictureModel {
  const s = sizes ?? slot.sizes;
  // <img src> for browsers that ignore <source>: the middle (or only) WebP rendition.
  const fallbackFile = image.webp[Math.floor((image.webp.length - 1) / 2)]!;
  // Blur-up only behind opaque art: it would show through a transparent PNG once loaded.
  const style: CSSProperties | undefined =
    slot.generation.background === 'opaque'
      ? { backgroundImage: `url("${image.blurDataURL}")`, backgroundSize: 'cover', backgroundPosition: 'center' }
      : undefined;
  return {
    sources: [
      { type: 'image/avif', srcSet: srcSet(image.avif), sizes: s },
      { type: 'image/webp', srcSet: srcSet(image.webp), sizes: s },
    ],
    img: {
      src: fallbackFile.src,
      width: image.width,
      height: image.height,
      alt,
      loading: priority ? 'eager' : 'lazy',
      fetchPriority: priority ? 'high' : 'auto',
      decoding: priority ? 'sync' : 'async',
      style,
      'data-slot': slot.id,
    },
  };
}
