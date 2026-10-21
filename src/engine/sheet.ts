/**
 * T8 passport photo sheet at 300 DPI with cut lines (A4 or 4×6 in).
 * PDF: the photo is embedded once and drawn N times (small, sharp). JPG: a raster sheet.
 */
import { PDFDocument, rgb } from 'pdf-lib';
import { setDpi, stripMetadata } from './jpeg-markers';
import { createRaster, blit, flattenAlpha, hasAlpha } from './raster';
import { coverCrop, type ResizeFn } from './resize';
import type { Bytes, PhotoSheetOptions, RasterImage } from './types';
import type { JpegEncodeFn } from './pdf';

export const SHEET_DPI = 300;
export const PAPER_MM = { a4: { w: 210, h: 297 }, '4x6': { w: 101.6, h: 152.4 } } as const;
export const SHEET_MARGIN_MM = 5;
export const SHEET_GAP_MM = 3;

const mmToPx = (mm: number) => Math.round((mm / 25.4) * SHEET_DPI);
const mmToPt = (mm: number) => (mm / 25.4) * 72;

export interface SheetLayout {
  paper: { w: number; h: number }; // mm, oriented
  cols: number;
  rows: number;
  placed: number;
  /** Top-left of each copy in mm (from the top-left of the paper). */
  slots: { x: number; y: number }[];
  copy: { w: number; h: number }; // mm
}

export function layoutSheet(opts: PhotoSheetOptions): SheetLayout {
  const copy = { w: opts.widthMm ?? 35, h: opts.heightMm ?? 45 };
  const base = PAPER_MM[opts.paper];
  const fit = (paper: { w: number; h: number }) => {
    const cols = Math.max(0, Math.floor((paper.w - 2 * SHEET_MARGIN_MM + SHEET_GAP_MM) / (copy.w + SHEET_GAP_MM)));
    const rows = Math.max(0, Math.floor((paper.h - 2 * SHEET_MARGIN_MM + SHEET_GAP_MM) / (copy.h + SHEET_GAP_MM)));
    return { paper, cols, rows, cap: cols * rows };
  };
  const portrait = fit({ w: base.w, h: base.h });
  const landscape = fit({ w: base.h, h: base.w });
  // Portrait unless landscape fits more copies.
  const pick = landscape.cap > portrait.cap && portrait.cap < opts.copies ? landscape : portrait;
  const placed = Math.min(opts.copies, pick.cap);
  const usedCols = Math.min(pick.cols, placed);
  const gridW = usedCols * copy.w + (usedCols - 1) * SHEET_GAP_MM;
  const x0 = (pick.paper.w - gridW) / 2;
  const y0 = SHEET_MARGIN_MM;
  const slots: { x: number; y: number }[] = [];
  for (let i = 0; i < placed; i++) {
    const c = i % pick.cols;
    const r = Math.floor(i / pick.cols);
    slots.push({ x: x0 + c * (copy.w + SHEET_GAP_MM), y: y0 + r * (copy.h + SHEET_GAP_MM) });
  }
  return { paper: pick.paper, cols: pick.cols, rows: pick.rows, placed, slots, copy };
}

export async function photoSheetCore(
  src: RasterImage,
  opts: PhotoSheetOptions,
  encodeJpeg: JpegEncodeFn,
  resize: ResizeFn,
): Promise<Bytes> {
  const L = layoutSheet(opts);
  const pw = mmToPx(L.copy.w);
  const ph = mmToPx(L.copy.h);
  let photo = await coverCrop(src, pw, ph, resize);
  if (hasAlpha(photo)) photo = flattenAlpha(photo);

  if ((opts.output ?? 'pdf') === 'jpg') {
    const W = mmToPx(L.paper.w);
    const H = mmToPx(L.paper.h);
    const sheet = createRaster(W, H);
    const line = (x: number, y: number, w: number, h: number) => {
      for (let yy = Math.max(0, y); yy < Math.min(H, y + h); yy++)
        for (let xx = Math.max(0, x); xx < Math.min(W, x + w); xx++) {
          const p = (yy * W + xx) * 4;
          sheet.data[p] = sheet.data[p + 1] = sheet.data[p + 2] = 150;
        }
    };
    for (const s of L.slots) {
      const x = mmToPx(s.x);
      const y = mmToPx(s.y);
      blit(sheet, photo, x, y);
      line(x - 2, y - 2, pw + 4, 1);
      line(x - 2, y + ph + 1, pw + 4, 1);
      line(x - 2, y - 2, 1, ph + 4);
      line(x + pw + 1, y - 2, 1, ph + 4);
    }
    return setDpi(stripMetadata(await encodeJpeg(sheet, 90)), SHEET_DPI);
  }

  const doc = await PDFDocument.create();
  doc.setProducer('SahiSize');
  const img = await doc.embedJpg(stripMetadata(await encodeJpeg(photo, 92)));
  const pageH = mmToPt(L.paper.h);
  const page = doc.addPage([mmToPt(L.paper.w), pageH]);
  const cw = mmToPt(L.copy.w);
  const ch = mmToPt(L.copy.h);
  for (const s of L.slots) {
    const x = mmToPt(s.x);
    const y = pageH - mmToPt(s.y) - ch; // PDF origin is bottom-left
    page.drawImage(img, { x, y, width: cw, height: ch });
    page.drawRectangle({ x: x - 0.6, y: y - 0.6, width: cw + 1.2, height: ch + 1.2, borderColor: rgb(0.6, 0.6, 0.6), borderWidth: 0.4 });
  }
  const bytes = await doc.save({ useObjectStreams: false });
  const out = new Uint8Array(bytes.length);
  out.set(bytes);
  return out;
}
