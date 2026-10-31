import { PDFDocument } from 'pdf-lib';
import { beforeAll, describe, expect, it } from 'vitest';
import { encodeJpeg } from '../codecs/codecs';
import { resizeRaster } from '../codecs/resize';
import { gradient } from '../testing/fixtures';
import { useNodeWasm } from '../testing/node-wasm-source';
import { A4_MARGIN_PT, A4_PT, a4Placement, assembleCompressed, imagesToPdfCore, originalPagePt } from './pdf-assemble';
import { targetWindow } from './kb';

beforeAll(() => useNodeWasm());

async function pageSizes(bytes: Uint8Array): Promise<{ w: number; h: number }[]> {
  const doc = await PDFDocument.load(bytes);
  return doc.getPages().map((p) => ({ w: p.getWidth(), h: p.getHeight() }));
}

describe('PDF sizing', () => {
  it('a4Placement fits inside 10 mm margins, centred, landscape for wide images', () => {
    const p = a4Placement(1000, 2000);
    expect(p.pagePt).toEqual({ w: A4_PT.w, h: A4_PT.h });
    expect(p.box.h).toBeCloseTo(A4_PT.h - 2 * A4_MARGIN_PT);
    expect(p.box.x).toBeCloseTo((A4_PT.w - p.box.w) / 2);
    expect(a4Placement(3000, 1000).pagePt).toEqual({ w: A4_PT.h, h: A4_PT.w });
  });

  it('original size assumes 150 DPI', () => {
    expect(originalPagePt(1500, 300)).toEqual({ w: 720, h: 144 });
  });

  it('imagesToPdfCore builds A4 pages under maxKB', async () => {
    const pdf = await imagesToPdfCore([gradient(600, 800, 40), gradient(900, 500, 40)], { page: 'a4', maxKB: 100 }, encodeJpeg, resizeRaster);
    expect(pdf.length).toBeLessThanOrEqual(targetWindow(null, 100).hi);
    const sizes = await pageSizes(pdf);
    expect(sizes[0]!.w).toBeCloseTo(A4_PT.w, 1);
    expect(sizes[1]!.w).toBeCloseTo(A4_PT.h, 1); // landscape
  });

  it('pads up to minKB with an unreferenced stream', async () => {
    const pdf = await imagesToPdfCore([gradient(100, 100)], { page: 'original', maxKB: 200, minKB: 100 }, encodeJpeg, resizeRaster);
    const win = targetWindow(100, 200);
    expect(pdf.length).toBeGreaterThanOrEqual(win.hardLo);
    expect(pdf.length).toBeLessThanOrEqual(win.hardHi);
    const sizes = await pageSizes(pdf);
    expect(sizes[0]!.w).toBeCloseTo(48, 1); // 100 px at 150 DPI
  });

  it('throws PDF_IMPOSSIBLE with the smallest size reached', async () => {
    await expect(imagesToPdfCore([gradient(2000, 2000, 120)], { page: 'a4', maxKB: 1 }, encodeJpeg, resizeRaster)).rejects.toMatchObject({
      code: 'PDF_IMPOSSIBLE',
      details: { maxKB: 1 },
    });
  });

  it('assembleCompressed keeps the original page sizes full-bleed', async () => {
    const pdf = await assembleCompressed([gradient(300, 400, 20)], [{ w: 612, h: 792 }], 200, encodeJpeg);
    expect(await pageSizes(pdf)).toEqual([{ w: 612, h: 792 }]);
  });
});
