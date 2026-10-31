/**
 * MAIN-THREAD PDF rasteriser: pdfjs legacy build with its own worker, lazy-loaded. Pages render
 * on an OffscreenCanvas when available (no DOM nodes, backing store freed right after reading).
 * Never import this from the engine worker.
 */
import './pdf-polyfills';
import type * as PdfJsModule from 'pdfjs-dist/legacy/build/pdf.mjs';
import { imageAreaFromOps } from '../core/pdf-image-area';
import { EngineError, isEngineError, type RasterImage } from '../types';

type PdfJs = typeof PdfJsModule;

let pdfjsP: Promise<PdfJs> | null = null;

export function loadPdfjs(): Promise<PdfJs> {
  if (!pdfjsP) {
    const attempt = import('pdfjs-dist/legacy/build/pdf.mjs').then((m) => {
      // Our worker entry: polyfills + the pdfjs legacy worker.
      m.GlobalWorkerOptions.workerPort = new Worker(new URL('./pdf-worker.ts', import.meta.url), {
        type: 'module',
        name: 'sahisize-pdf',
      });
      return m;
    });
    pdfjsP = attempt;
    attempt.catch(() => {
      if (pdfjsP === attempt) pdfjsP = null;
    });
  }
  return pdfjsP;
}

export interface OpenedPdf {
  numPages: number;
  /** Page size in PDF points (rotation applied). */
  pageSize(n: number): Promise<{ w: number; h: number }>;
  render(n: number, dpi: number, maxSide?: number): Promise<RasterImage>;
  /** Share of page n's area painted by raster images (0..1), from the operator list. */
  imageShare(n: number): Promise<number>;
  destroy(): Promise<void>;
}

function mapError(e: unknown): EngineError {
  if (isEngineError(e)) return e;
  const name = (e as { name?: unknown } | null)?.name;
  if (name === 'PasswordException') return new EngineError('PDF_ENCRYPTED', 'PDF is password-protected');
  const message = e instanceof Error ? e.message : String(e);
  return new EngineError('DECODE_FAILED', `PDF could not be read: ${message}`, { type: 'pdf' });
}

interface RenderSurface {
  ctx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D;
  dispose(): void;
}

function makeSurface(w: number, h: number): RenderSurface {
  if (typeof OffscreenCanvas !== 'undefined') {
    const canvas = new OffscreenCanvas(w, h);
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (ctx) {
      return {
        ctx,
        dispose: () => {
          canvas.width = canvas.height = 0;
        },
      };
    }
  }
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) throw new EngineError('OUT_OF_MEMORY', 'Canvas unavailable');
  return {
    ctx,
    dispose: () => {
      canvas.width = canvas.height = 0;
    },
  };
}

export async function openPdf(blob: Blob): Promise<OpenedPdf> {
  const pdfjs = await loadPdfjs();
  const data = new Uint8Array(await blob.arrayBuffer());
  // pdfjs 5+ never uses eval, so the no-eval worker CSP holds. In pdfjs 6 the loading task, not
  // the document, owns destroy().
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
        try {
          const base = page.getViewport({ scale: 1 });
          let scale = dpi / 72;
          const long = Math.max(base.width, base.height) * scale;
          if (long > maxSide) scale *= maxSide / long;
          const vp = page.getViewport({ scale });
          const w = Math.max(1, Math.floor(vp.width));
          const h = Math.max(1, Math.floor(vp.height));
          const surface = makeSurface(w, h);
          try {
            surface.ctx.fillStyle = '#FFFFFF';
            surface.ctx.fillRect(0, 0, w, h);
            // pdfjs types only name the DOM context; an OffscreenCanvas 2D context is API-compatible.
            const canvasContext = surface.ctx as CanvasRenderingContext2D;
            await page.render({ canvasContext, canvas: null, viewport: vp }).promise;
            const id = surface.ctx.getImageData(0, 0, w, h);
            return { data: new Uint8ClampedArray(id.data.buffer), width: w, height: h };
          } finally {
            surface.dispose();
          }
        } finally {
          page.cleanup();
        }
      } catch (e) {
        throw mapError(e);
      }
    },

    async imageShare(n) {
      try {
        const page = await doc.getPage(n);
        try {
          const vp = page.getViewport({ scale: 1 });
          const list = await page.getOperatorList();
          const area = imageAreaFromOps(pdfjs.OPS, list.fnArray, list.argsArray);
          return Math.min(1, area / Math.max(1, vp.width * vp.height));
        } finally {
          page.cleanup();
        }
      } catch (e) {
        throw mapError(e);
      }
    },

    async destroy() {
      await task.destroy();
    },
  };
}
