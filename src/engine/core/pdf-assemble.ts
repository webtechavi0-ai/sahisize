/**
 * PDF assembly with pdf-lib: images -> JPEG pages, A4 (fit with margins) or original size. Under
 * maxKB by lowering JPEG quality, then scaling pages; padded up to minKB with an unreferenced
 * whitespace stream (pages untouched).
 */
import { PDFDocument } from 'pdf-lib';
import { capLongSide, type ResizeFn } from './geometry';
import { stripMetadata } from './jpeg-markers';
import { KB_MARGIN_MIN, targetWindow } from './kb';
import { flattenAlpha, hasAlpha } from './raster';
import { EngineError, type Bytes, type ProgressFn, type RasterImage } from '../types';

export const A4_PT = { w: 595.28, h: 841.89 } as const;
export const A4_MARGIN_PT = 28.35; // 10 mm
/** "Original size" pages assume this scan resolution. */
export const ORIGINAL_DPI = 150;
/** Pages never need more than ~240 DPI on A4. */
export const PDF_MAX_SIDE = 2000;

export const PDF_QUALITIES = [85, 72, 60, 48, 38, 28, 20] as const;
export const PDF_SCALES = [1, 0.8, 0.64, 0.5, 0.4, 0.3, 0.22] as const;
/** compressPdf qualities (high to low). */
export const COMPRESS_QUALITIES = [80, 65, 50, 40, 30] as const;

export type JpegEncodeFn = (r: RasterImage, q: number) => Promise<Uint8Array>;

export interface PageSize {
  w: number;
  h: number;
}

export interface JpegPage {
  jpeg: Uint8Array;
  /** Page size in points. */
  pagePt: PageSize;
  /** Image placement in points; defaults to the full page. */
  box?: { x: number; y: number; w: number; h: number };
}

const toBytes = (u: Uint8Array): Bytes => {
  const out = new Uint8Array(u.length);
  out.set(u);
  return out;
};

/** Place each JPEG on its own page and save. Optionally pad the file to `padTo` bytes. */
export async function assemblePdfFromJpegs(pages: readonly JpegPage[], padTo?: number): Promise<Bytes> {
  const doc = await PDFDocument.create();
  doc.setProducer('SahiSize');
  doc.setCreator('SahiSize');
  for (const p of pages) {
    const img = await doc.embedJpg(p.jpeg);
    const page = doc.addPage([p.pagePt.w, p.pagePt.h]);
    const box = p.box ?? { x: 0, y: 0, w: p.pagePt.w, h: p.pagePt.h };
    // pdf-lib needs width/height; without them it draws at the pixel size in points.
    page.drawImage(img, { x: box.x, y: box.y, width: box.w, height: box.h });
  }
  let bytes = await doc.save({ useObjectStreams: false });
  if (padTo && bytes.length < padTo) {
    // Each pass adds ~(n + 50) bytes; aim slightly low and top up.
    for (let i = 0; i < 3 && bytes.length < padTo; i++) {
      const n = Math.max(0, padTo - bytes.length - 60);
      doc.context.register(doc.context.stream(new Uint8Array(n).fill(0x20)));
      bytes = await doc.save({ useObjectStreams: false });
    }
  }
  return toBytes(bytes);
}

/** A4 page (landscape for wide images) with the image fitted inside 10 mm margins, centred. */
export function a4Placement(w: number, h: number): { pagePt: PageSize; box: { x: number; y: number; w: number; h: number } } {
  const pagePt = w > h ? { w: A4_PT.h, h: A4_PT.w } : { w: A4_PT.w, h: A4_PT.h };
  const aw = pagePt.w - 2 * A4_MARGIN_PT;
  const ah = pagePt.h - 2 * A4_MARGIN_PT;
  const k = Math.min(aw / w, ah / h);
  const bw = w * k;
  const bh = h * k;
  return { pagePt, box: { x: (pagePt.w - bw) / 2, y: (pagePt.h - bh) / 2, w: bw, h: bh } };
}

/** Page size in points for an "original size" page of a w×h px image. */
export function originalPagePt(w: number, h: number): PageSize {
  return { w: (w * 72) / ORIGINAL_DPI, h: (h * 72) / ORIGINAL_DPI };
}

export interface ImagesToPdfCoreOptions {
  page: 'a4' | 'original';
  maxKB: number | null;
  minKB?: number | null;
  onProgress?: ProgressFn;
  /** Page size in points per raster (rasterised PDF pages keep their size). */
  pageSizesPt?: (PageSize | undefined)[];
}

const flattenIfNeeded = (r: RasterImage) => (hasAlpha(r) ? flattenAlpha(r) : r);

/**
 * Build a PDF under maxKB. For each scale step find the highest quality that fits (binary search
 * over PDF_QUALITIES); move to the next scale when even the lowest does not.
 */
export async function imagesToPdfCore(
  rasters: readonly RasterImage[],
  opts: ImagesToPdfCoreOptions,
  encodeJpeg: JpegEncodeFn,
  resize: ResizeFn,
): Promise<Bytes> {
  if (!rasters.length) throw new EngineError('PDF_IMPOSSIBLE', 'No pages', { pages: 0 });
  const win = opts.maxKB ? targetWindow(opts.minKB ?? null, opts.maxKB) : null;
  const hi = win ? win.hi : Infinity;
  const lo = win ? win.lo : opts.minKB ? Math.ceil(opts.minKB * 1024) + KB_MARGIN_MIN : 0;
  const mid = win ? win.mid : lo;
  const bases: RasterImage[] = [];
  for (const r of rasters) bases.push(flattenIfNeeded(await capLongSide(r, PDF_MAX_SIDE, resize)));

  const total = (Number.isFinite(hi) ? PDF_SCALES.length * 3 : 1) * bases.length;
  let done = 0;
  const progress = () => opts.onProgress?.(Math.min(++done, total), total);

  const build = async (scaled: readonly RasterImage[], q: number, padTo?: number): Promise<Bytes> => {
    const pages: JpegPage[] = [];
    for (let i = 0; i < scaled.length; i++) {
      const r = scaled[i]!;
      const jpeg = stripMetadata(await encodeJpeg(r, q));
      progress();
      const given = opts.pageSizesPt?.[i];
      if (given) pages.push({ jpeg, pagePt: given });
      else if (opts.page === 'a4') pages.push({ jpeg, ...a4Placement(r.width, r.height) });
      else pages.push({ jpeg, pagePt: originalPagePt(bases[i]!.width, bases[i]!.height) });
    }
    return assemblePdfFromJpegs(pages, padTo);
  };

  const qs = PDF_QUALITIES;
  if (!Number.isFinite(hi)) {
    const out = await build(bases, qs[0]);
    return out.length < lo ? build(bases, qs[0], mid) : out;
  }

  let smallest = Infinity;
  for (const s of PDF_SCALES) {
    const scaled =
      s === 1
        ? bases
        : await Promise.all(
            bases.map((b) => resize(b, Math.max(1, Math.round(b.width * s)), Math.max(1, Math.round(b.height * s)))),
          );
    const low = await build(scaled, qs[qs.length - 1]!);
    smallest = Math.min(smallest, low.length);
    if (low.length > hi) continue;
    let goodIdx = qs.length - 1;
    let goodBytes = low;
    let badIdx = -1;
    while (goodIdx - badIdx > 1) {
      const m = (goodIdx + badIdx) >> 1;
      const b = await build(scaled, qs[m]!);
      if (b.length <= hi) {
        goodIdx = m;
        goodBytes = b;
      } else badIdx = m;
    }
    if (goodBytes.length < lo) goodBytes = await build(scaled, qs[goodIdx]!, mid);
    opts.onProgress?.(total, total);
    return goodBytes;
  }
  throw new EngineError('PDF_IMPOSSIBLE', 'Cannot reach the maximum PDF size', {
    minKBReached: Math.round((smallest / 1024) * 10) / 10,
    maxKB: opts.maxKB ?? 0,
  });
}

/** compressPdf back end: rasterised pages, full-bleed at the original page size, under maxKB. */
export async function assembleCompressed(
  rasters: readonly RasterImage[],
  pageSizesPt: readonly PageSize[],
  maxKB: number,
  encodeJpeg: JpegEncodeFn,
): Promise<Bytes> {
  const hi = targetWindow(null, maxKB).hi;
  const qs = COMPRESS_QUALITIES;
  const build = async (q: number) =>
    assemblePdfFromJpegs(
      await Promise.all(
        rasters.map(async (r, i) => ({ jpeg: stripMetadata(await encodeJpeg(flattenIfNeeded(r), q)), pagePt: pageSizesPt[i]! })),
      ),
    );
  // lowest quality first: cheap rejection
  let goodIdx = qs.length - 1;
  let best = await build(qs[goodIdx]!);
  if (best.length > hi) {
    throw new EngineError('PDF_IMPOSSIBLE', 'Too large at this resolution', {
      minKBReached: Math.round((best.length / 1024) * 10) / 10,
      maxKB,
    });
  }
  let badIdx = -1;
  while (goodIdx - badIdx > 1) {
    const m = (goodIdx + badIdx) >> 1;
    const b = await build(qs[m]!);
    if (b.length <= hi) {
      goodIdx = m;
      best = b;
    } else badIdx = m;
  }
  return best;
}
