/**
 * MAIN-THREAD PDF rasteriser (PLAN 1.6 #5): pdfjs legacy build with its own worker, lazy-loaded.
 * Never import this from the engine worker.
 */
import workerUrl from 'pdfjs-dist/legacy/build/pdf.worker.min.mjs?url';
import { EngineError, type RasterImage } from './types';

type PdfJs = typeof import('pdfjs-dist/legacy/build/pdf.mjs');
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
  destroy(): Promise<void>;
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
  let doc: Awaited<ReturnType<PdfJs['getDocument']>['promise']>;
  try {
    // pdfjs 5.x never uses eval (the isEvalSupported option was removed), so CSP is fine.
    doc = await pdfjs.getDocument({ data, useSystemFonts: true }).promise;
  } catch (e) {
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
    async destroy() {
      await doc.destroy();
    },
  };
}
