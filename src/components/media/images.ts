/**
 * Server-side access to the image manifest and the optimize output. Both JSON files are parsed
 * with zod once per process, so a malformed file fails the build instead of shipping a broken
 * <img>. Server-only: the manifest carries long generation prompts that must not reach the
 * client bundle.
 */
import 'server-only';
import manifestJson from '@/content/images/manifest.json';
import generatedJson from '@/content/images/generated.json';
import { type Lang } from '@/i18n/config';
import {
  GeneratedImagesSchema,
  ImageManifestSchema,
  type GeneratedImage,
  type ImageManifest,
  type ImageSlot,
} from './image-schema';

let manifest: ImageManifest | undefined;
let generated: Record<string, GeneratedImage> | undefined;

export function getImageManifest(): ImageManifest {
  manifest ??= ImageManifestSchema.parse(manifestJson);
  return manifest;
}

function getGenerated(): Record<string, GeneratedImage> {
  generated ??= GeneratedImagesSchema.parse(generatedJson).images;
  return generated;
}

export function getImageSlot(id: string): ImageSlot | undefined {
  return getImageManifest().slots.find((s) => s.id === id);
}

/** A slot ready to render: approved in the manifest AND present in the optimize output. */
export interface ResolvedImage {
  slot: ImageSlot;
  image: GeneratedImage;
  alt: string;
}

export function resolveImage(id: string, lang: Lang): ResolvedImage | null {
  const slot = getImageSlot(id);
  if (!slot || slot.status !== 'approved') return null;
  const image = getGenerated()[id];
  if (!image) return null;
  return { slot, image, alt: slot.alt[lang] };
}

/** Approved, published slots for an English route path ("/exam/neet-ug"), manifest order. */
export function imagesForRoute(route: string, lang: Lang): ResolvedImage[] {
  return getImageManifest()
    .slots.filter((s) => s.routes.includes(route))
    .map((s) => resolveImage(s.id, lang))
    .filter((r): r is ResolvedImage => r !== null);
}

/**
 * The published illustration for an exam group ("banking", "state-psc"), from the manifest slot
 * whose `groups` lists it (id `group-<group>`), or null until it is approved and optimized.
 */
export function groupImage(group: string, lang: Lang): ResolvedImage | null {
  const slot = getImageManifest().slots.find((s) => s.status !== 'retired' && s.groups?.includes(group));
  return slot ? resolveImage(slot.id, lang) : null;
}

/**
 * Image for an exam page's side panel: the exam's own hero when it has one (e.g. /exam/neet-ug),
 * otherwise its group's illustration. `route` is the English exam path ("/exam/ibps-po"),
 * `group` the preset's `group`. A page that already renders its own hero with RouteHero should
 * pass `{ skipRouteHero: true }` so the same picture is not shown twice.
 */
export function examPanelImage(
  route: string,
  group: string,
  lang: Lang,
  opts: { skipRouteHero?: boolean } = {},
): ResolvedImage | null {
  if (!opts.skipRouteHero) {
    const hero = imagesForRoute(route, lang).find((r) => r.slot.placement === 'hero');
    if (hero) return hero;
  }
  return groupImage(group, lang);
}
