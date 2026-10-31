/**
 * compressPdf control flow, free of pdfjs and the worker so it can be unit-tested.
 *
 * 1. Already small: size <= maxKB×1000 (hard limit) -> ALREADY_SMALL.
 * 2. Mostly text: raster images cover < TEXT_ONLY_IMAGE_SHARE of the sampled pages ->
 *    PDF_TEXT_ONLY before anything is rasterised, unless `allowTextOnly`.
 * 3. Bounded work: on PDFs with more than SAMPLE_PAGES pages, a few sample pages pick the first
 *    DPI that can fit, so one full render pass is the norm. A pass that misses the target only
 *    moves to the next DPI when the size it reached, scaled by the pixel ratio, could fit.
 */
import { EngineError, isEngineError, type Bytes, type CompressPdfOptions } from '../types';

export const COMPRESS_DPIS = [150, 100, 72] as const;
/** Below this share of page area painted by raster images, a PDF counts as text. */
export const TEXT_ONLY_IMAGE_SHARE = 0.1;
/** Pages checked for images (evenly spread). */
export const SHARE_PAGES = 10;
/** Pages rendered to choose the DPI on longer PDFs. */
export const SAMPLE_PAGES = 3;
/** Slack on the pixel-ratio estimate before giving up on a lower DPI. */
const ESTIMATE_SLACK = 1.2;

export interface CompressPdfDeps {
  numPages: number;
  imageShare(n: number): Promise<number>;
  /**
   * Render `pages` (1-based) at `dpi` and assemble them under `maxKB`. Calls `onPage` after each
   * page render. Throws PDF_IMPOSSIBLE with `minKBReached` when it cannot fit.
   */
  build(pages: number[], dpi: number, maxKB: number, onPage: () => void): Promise<Bytes>;
}

/** Up to `k` page numbers spread evenly over 1..n. */
export function spreadPages(n: number, k: number): number[] {
  if (n <= k) return Array.from({ length: n }, (_, i) => i + 1);
  const out = new Set<number>();
  for (let i = 0; i < k; i++) out.add(1 + Math.round((i * (n - 1)) / (k - 1 || 1)));
  return [...out];
}

/** KB reached by a PDF_IMPOSSIBLE failure (null when unknown). Rethrows any other error. */
function reachedKB(e: unknown): number | null {
  if (!isEngineError(e) || e.code !== 'PDF_IMPOSSIBLE') throw e;
  const v = Number(e.details?.minKBReached);
  return Number.isFinite(v) ? v : null;
}

/** Could a pass at `dpi` fit, given `kb` reached at `from` DPI? Size scales ~ with pixel count. */
export const mayFit = (kb: number, from: number, dpi: number, maxKB: number) =>
  kb * (dpi / from) ** 2 <= maxKB * ESTIMATE_SLACK;

/** The hard maximum is maxKB×1000 bytes; at or under it there is nothing to do. */
export function assertNotAlreadySmall(fileSize: number, maxKB: number): void {
  if (fileSize <= maxKB * 1000) {
    throw new EngineError('ALREADY_SMALL', 'PDF is already under the limit', {
      sizeKB: Math.round((fileSize / 1024) * 10) / 10,
      maxKB,
    });
  }
}

export async function runCompressPdf(
  fileSize: number,
  maxKB: number,
  deps: CompressPdfDeps,
  opts?: CompressPdfOptions,
): Promise<Bytes> {
  assertNotAlreadySmall(fileSize, maxKB);
  const sizeKB = Math.round((fileSize / 1024) * 10) / 10;
  const n = deps.numPages;
  if (!opts?.allowTextOnly) {
    const checked = spreadPages(n, SHARE_PAGES);
    let share = 0;
    for (const p of checked) share += await deps.imageShare(p);
    share /= Math.max(1, checked.length);
    if (share < TEXT_ONLY_IMAGE_SHARE) {
      throw new EngineError('PDF_TEXT_ONLY', 'PDF is mostly text', { sizeKB, maxKB, imagePct: Math.round(share * 100) });
    }
  }

  let step = 0;
  let total = n;
  const onPage = () => opts?.onProgress?.(Math.min(++step, total), total);
  let smallest = Infinity;
  const fail = () =>
    new EngineError('PDF_IMPOSSIBLE', 'PDF cannot be compressed under the limit', {
      minKBReached: Number.isFinite(smallest) ? Math.round(smallest * 10) / 10 : 0,
      maxKB,
    });

  // Choose the starting DPI from a few sample pages (long PDFs only).
  let start = 0;
  if (n > SAMPLE_PAGES) {
    const sample = spreadPages(n, SAMPLE_PAGES);
    const share = sample.length / n;
    total = n + sample.length * COMPRESS_DPIS.length;
    let chosen = -1;
    for (let i = 0; i < COMPRESS_DPIS.length; i++) {
      const dpi = COMPRESS_DPIS[i]!;
      try {
        await deps.build(sample, dpi, maxKB * share, onPage);
        chosen = i;
        break;
      } catch (e) {
        const kb = reachedKB(e);
        if (kb === null) continue;
        const est = kb / share;
        smallest = Math.min(smallest, est);
        const lowest = COMPRESS_DPIS[COMPRESS_DPIS.length - 1]!;
        if (!mayFit(est, dpi, lowest, maxKB)) throw fail();
      }
    }
    if (chosen < 0) throw fail();
    start = chosen;
    total = step + n;
  }

  const all = Array.from({ length: n }, (_, i) => i + 1);
  for (let i = start; i < COMPRESS_DPIS.length; i++) {
    const dpi = COMPRESS_DPIS[i]!;
    try {
      const out = await deps.build(all, dpi, maxKB, onPage);
      opts?.onProgress?.(total, total);
      return out;
    } catch (e) {
      const kb = reachedKB(e);
      if (kb !== null) smallest = Math.min(smallest, kb);
      const next = COMPRESS_DPIS[i + 1];
      if (next === undefined || (kb !== null && !mayFit(kb, dpi, next, maxKB))) break;
      total += n;
    }
  }
  throw fail();
}
