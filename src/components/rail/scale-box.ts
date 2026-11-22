/**
 * Shape drawings for the side rail (docs/design/inner-pages-spec.md §3.1, §5.1). Pure.
 *
 * A box shows a file's SHAPE (aspect ratio), not its relative size: each box is fitted into
 * the same stage and bottom-aligned, and the pixel numbers printed under it carry the size.
 * Only notice values are drawn (widthPx/heightPx or a min/max pixel pair); `aspect` and
 * `sizeNote` describe our crop choice, so they are never used here.
 */
import type { PresetDocument } from '@/lib/presets/types';

export interface Stage {
  w: number;
  h: number;
  min: number;
}

/** Small tile stage ("Sizes at a glance"). */
export const TILE_STAGE: Stage = { w: 72, h: 52, min: 16 };
/** Large stage of the document page's shape block (leaves room for the px labels in 240×168). */
export const SHAPE_STAGE: Stage = { w: 160, h: 120, min: 24 };

export interface Box {
  w: number;
  h: number;
  /** Left edge inside the stage (centred). */
  x: number;
  /** Top edge inside the stage (bottom-aligned: y + h = stage height). */
  y: number;
}

/** Fit a w×h file into the stage, keeping its ratio; very thin strips keep a minimum side. */
export function fitBox(w: number, h: number, stage: Stage = TILE_STAGE): Box {
  const s = Math.min(stage.w / w, stage.h / h);
  const bw = Math.max(w * s, stage.min);
  const bh = Math.max(h * s, stage.min);
  const rw = Math.round(bw);
  const rh = Math.round(bh);
  return { w: rw, h: rh, x: Math.round((stage.w - rw) / 2), y: stage.h - rh };
}

export type ShapeKind = 'fixed' | 'range' | 'kb' | 'pdf';

export interface DocShape {
  kind: ShapeKind;
  /** Pixel pair the drawing uses (fixed / range only). */
  px: { w: number; h: number } | null;
}

type Dims = Pick<
  PresetDocument,
  'format' | 'widthPx' | 'heightPx' | 'minWidthPx' | 'minHeightPx' | 'maxWidthPx' | 'maxHeightPx'
>;

/** Which drawing a document gets, from its notice values only. */
export function docShape(d: Dims): DocShape {
  if (d.format === 'pdf') return { kind: 'pdf', px: null };
  if (d.widthPx !== null && d.heightPx !== null) return { kind: 'fixed', px: { w: d.widthPx, h: d.heightPx } };
  if (d.minWidthPx !== undefined && d.minHeightPx !== undefined)
    return { kind: 'range', px: { w: d.minWidthPx, h: d.minHeightPx } };
  if (d.maxWidthPx !== undefined && d.maxHeightPx !== undefined)
    return { kind: 'range', px: { w: d.maxWidthPx, h: d.maxHeightPx } };
  return { kind: 'kb', px: null };
}
