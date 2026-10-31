/**
 * Every /tools/{slug} page the site serves, and what kind of page a slug is.
 * Pure and client-safe. Hindi pages are the subset with Hindi copy (server: hindiToolSlugs()).
 */
import {
  COMPRESS_KB_RANGES,
  COMPRESS_KB_TARGETS,
  JPG_PDF_KB_TARGETS,
  PDF_KB_TARGETS,
  SIZE_PRESET_SLUGS,
  TOOL_SLUGS,
  type SizePresetSlug,
  type ToolSlug,
} from '@/config/tools';

export type ToolPage =
  | { kind: 'compress-kb'; slug: string; tool: 'compress-image'; kb: number }
  | { kind: 'compress-range'; slug: string; tool: 'compress-image'; minKb: number; maxKb: number }
  | { kind: 'mb-to-kb'; slug: 'mb-to-kb-photo'; tool: 'compress-image' }
  | { kind: 'compress-pdf-kb'; slug: string; tool: 'compress-pdf'; kb: number }
  | { kind: 'jpg-pdf-kb'; slug: string; tool: 'images-to-pdf'; kb: number }
  | { kind: 'size'; slug: SizePresetSlug; tool: SizePresetSlug }
  | { kind: 'base'; slug: ToolSlug; tool: ToolSlug };

const has = (list: readonly number[], n: number) => list.includes(n);

/** Classify a slug (path segment after /tools/), or null when no such page exists. */
export function parseToolSlug(slug: string): ToolPage | null {
  let m: RegExpExecArray | null;
  if ((m = /^compress-image-to-(\d+)kb$/.exec(slug))) {
    const kb = Number(m[1]);
    return has(COMPRESS_KB_TARGETS, kb) ? { kind: 'compress-kb', slug, tool: 'compress-image', kb } : null;
  }
  if ((m = /^compress-image-(\d+)kb-to-(\d+)kb$/.exec(slug))) {
    const minKb = Number(m[1]);
    const maxKb = Number(m[2]);
    return COMPRESS_KB_RANGES.some(([a, b]) => a === minKb && b === maxKb)
      ? { kind: 'compress-range', slug, tool: 'compress-image', minKb, maxKb }
      : null;
  }
  if ((m = /^compress-pdf-to-(\d+)kb$/.exec(slug))) {
    const kb = Number(m[1]);
    return has(PDF_KB_TARGETS, kb) ? { kind: 'compress-pdf-kb', slug, tool: 'compress-pdf', kb } : null;
  }
  if ((m = /^jpg-to-pdf-under-(\d+)kb$/.exec(slug))) {
    const kb = Number(m[1]);
    return has(JPG_PDF_KB_TARGETS, kb) ? { kind: 'jpg-pdf-kb', slug, tool: 'images-to-pdf', kb } : null;
  }
  if (slug === 'mb-to-kb-photo') return { kind: 'mb-to-kb', slug, tool: 'compress-image' };
  if ((SIZE_PRESET_SLUGS as readonly string[]).includes(slug)) {
    const s = slug as SizePresetSlug;
    return { kind: 'size', slug: s, tool: s };
  }
  if ((TOOL_SLUGS as readonly string[]).includes(slug)) {
    const s = slug as ToolSlug;
    return { kind: 'base', slug: s, tool: s };
  }
  return null;
}

/** Every English tool page slug, base tools first, then the generated KB/PDF pages. */
export function allToolPageSlugs(): string[] {
  return [
    ...TOOL_SLUGS,
    'mb-to-kb-photo',
    ...COMPRESS_KB_TARGETS.map((n) => `compress-image-to-${n}kb`),
    ...COMPRESS_KB_RANGES.map(([a, b]) => `compress-image-${a}kb-to-${b}kb`),
    ...PDF_KB_TARGETS.map((n) => `compress-pdf-to-${n}kb`),
    ...JPG_PDF_KB_TARGETS.map((n) => `jpg-to-pdf-under-${n}kb`),
  ];
}

/** English path of a tool page slug. */
export function toolPagePath(slug: string): string {
  return `/tools/${slug}`;
}

/** Smallest compress-to-N page that is >= maxKB (50 KB -> 50, 45 KB -> 45, 600 -> null). */
export function compressTargetFor(maxKB: number | null): number | null {
  if (maxKB === null) return null;
  return COMPRESS_KB_TARGETS.find((x) => x >= maxKB) ?? null;
}

/** Lower edge of a compress target's result window (90%): 20 -> 18, 15 -> 13.5. */
export function lowerBoundKB(targetKB: number): number {
  return Math.round(targetKB * 0.9 * 10) / 10;
}
