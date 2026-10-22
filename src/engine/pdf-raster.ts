/**
 * MAIN-THREAD PDF rasteriser (PLAN 1.6 #5): pdfjs legacy build with its own worker, lazy-loaded.
 * Never import this from the engine worker.
 */
import './pdf-polyfills';
// Our worker entry (polyfills + the pdfjs legacy worker), emitted as /_astro/pdf.worker-[hash].js.
import workerUrl from './pdf-worker?worker&url';
import type * as PdfJsModule from 'pdfjs-dist/legacy/build/pdf.mjs';
import { EngineError, type RasterImage } from './types';

type PdfJs = typeof PdfJsModule;
let pdfjsP: Promise<PdfJs> | null = null;

export function loadPdfjs(): Promise<PdfJs> {
  return (pdfjsP ??= import('pdfjs-dist/legacy/build/pdf.mjs')
    .then((m) => {
      m.GlobalWorkerOptions.workerSrc = workerUrl;
      return m;
    })
    .catch((e) => {
      pdfjsP = null;
      throw e;
    }));
}

export interface OpenedPdf {
  numPages: number;
  /** Page size in PDF points (rotation applied). */
  pageSize(n: number): Promise<{ w: number; h: number }>;
  render(n: number, dpi: number, maxSide?: number): Promise<RasterImage>;
  /**
   * Share of page n's area painted by raster images (0..1), from the pdfjs operator list
   * (no rendering). A page with no paintImage* operator is 0.
   */
  imageShare(n: number): Promise<number>;
  destroy(): Promise<void>;
}

type Mat = [number, number, number, number, number, number];
const mul = (m: Mat, t: Mat): Mat => [
  m[0] * t[0] + m[2] * t[1],
  m[1] * t[0] + m[3] * t[1],
  m[0] * t[2] + m[2] * t[3],
  m[1] * t[2] + m[3] * t[3],
  m[0] * t[4] + m[2] * t[5] + m[4],
  m[1] * t[4] + m[3] * t[5] + m[5],
];

/** Image area (in PDF points²) painted by an operator list; images are drawn in the unit square. */
export function imageAreaFromOps(ops: PdfJs['OPS'], fnArray: number[], argsArray: unknown[]): number {
  const single = new Set([ops.paintImageXObject, ops.paintInlineImageXObject, ops.paintImageMaskXObject]);
  const repeat = new Set([ops.paintImageXObjectRepeat, ops.paintImageMaskXObjectRepeat]);
  const group = new Set([ops.paintInlineImageXObjectGroup, ops.paintImageMaskXObjectGroup]);
  let ctm: Mat = [1, 0, 0, 1, 0, 0];
  const stack: Mat[] = [];
  let area = 0;
  for (let i = 0; i < fnArray.length; i++) {
    const fn = fnArray[i];
    const args = argsArray[i] as unknown[] | null;
    if (fn === ops.save) stack.push(ctm);
    else if (fn === ops.restore) ctm = stack.pop() ?? ctm;
    else if (fn === ops.transform && args) ctm = mul(ctm, args as Mat);
    else if (fn === ops.paintFormXObjectBegin) {
      stack.push(ctm);
      const m = args?.[0];
      if (Array.isArray(m) && m.length === 6) ctm = mul(ctm, m as Mat);
    } else if (fn === ops.paintFormXObjectEnd) ctm = stack.pop() ?? ctm;
    else if (single.has(fn!)) area += Math.abs(ctm[0] * ctm[3] - ctm[1] * ctm[2]);
    else if (repeat.has(fn!) && args) {
      const sx = Number(args[1]) || 1;
      const sy = Number(args[2]) || 1;
      const pos = args[3] as ArrayLike<number> | undefined;
      const copies = pos ? Math.max(1, Math.floor(pos.length / 2)) : 1;
      area += copies * Math.abs(sx * sy) * Math.abs(ctm[0] * ctm[3] - ctm[1] * ctm[2]);
    } else if (group.has(fn!)) area += Math.abs(ctm[0] * ctm[3] - ctm[1] * ctm[2]);
  }
  return area;
}

function mapError(e: unknown): EngineError {
  const name = (e as { name?: string })?.name;
  if (name === 'PasswordException') return new EngineError('PDF_ENCRYPTED', 'PDF is password-protected');
  if (e instanceof EngineError) return e;
  return new EngineError('DECODE_FAILED', `PDF could not be read: ${String((e as Error)?.message ?? e)}`, { type: 'pdf' });
}

export async function openPdf(blob: Blob): Promise<OpenedPdf> {
  const pdfjs = await loadPdfjs();
  const data = new Uint8Array(await blob.arrayBuffer());
  // pdfjs 5+ never uses eval (there is no isEvalSupported option any more), so the no-eval
  // worker CSP holds. In pdfjs 6 the loading task, not the document, owns destroy().
  const task = pdfjs.getDocument({ data, useSystemFonts: true });
  let doc: Awaited<(typeof task)['promise']>;
  try {
    doc = await task.promise;
  } catch (e) {
    await task.destroy().catch(() => {});
    throw mapError(e);
  }
  return {
    numPages: doc.numPages,
    async pageSize(n) {
      const page = await doc.getPage(n);
      const vp = page.getViewport({ scale: 1 });
      return { w: vp.width, h: vp.height };
    },
    async render(n, dpi, maxSide = 4000) {
      try {
        const page = await doc.getPage(n);
        const base = page.getViewport({ scale: 1 });
        let scale = dpi / 72;
        const long = Math.max(base.width, base.height) * scale;
        if (long > maxSide) scale *= maxSide / long;
        const vp = page.getViewport({ scale });
        const w = Math.max(1, Math.floor(vp.width));
        const h = Math.max(1, Math.floor(vp.height));
        const canvas = document.createElement('canvas');
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext('2d', { willReadFrequently: true })!;
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, w, h);
        await page.render({ canvasContext: ctx, canvas, viewport: vp }).promise;
        const id = ctx.getImageData(0, 0, w, h);
        page.cleanup();
        canvas.width = canvas.height = 0;
        return { data: new Uint8ClampedArray(id.data.buffer), width: w, height: h };
      } catch (e) {
        throw mapError(e);
      }
    },
    async imageShare(n) {
      try {
        const page = await doc.getPage(n);
        const vp = page.getViewport({ scale: 1 });
        const list = await page.getOperatorList();
        page.cleanup();
        const area = imageAreaFromOps(pdfjs.OPS, list.fnArray, list.argsArray);
        return Math.min(1, area / Math.max(1, vp.width * vp.height));
      } catch (e) {
        throw mapError(e);
      }
    },
    async destroy() {
      await task.destroy();
    },
  };
}
