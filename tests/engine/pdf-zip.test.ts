import { describe, expect, it } from 'vitest';
import { PDFDocument } from 'pdf-lib';
import { unzipSync, strFromU8 } from 'fflate';
import { decodeJpeg, encodeJpeg } from '@/engine/codecs';
import { convertRaster } from '@/engine/convert';
import { inspectJpeg } from '@/engine/jpeg-markers';
import { assembleCompressed, imagesToPdfCore } from '@/engine/pdf';
import { resizeRaster } from '@/engine/resize';
import { layoutSheet, photoSheetCore } from '@/engine/sheet';
import { buildReadme, buildZip, uniqueNames } from '@/engine/zip';
import { isEngineError } from '@/engine/types';
import { synthDetailed, synthPhoto } from './helpers/synth';

const pages = (n: number, w = 1240, h = 1754) => Array.from({ length: n }, (_, i) => synthPhoto(w, h, 50 + i, { noise: 10, texture: true }));
const pageCount = async (b: Uint8Array) => (await PDFDocument.load(b)).getPageCount();

describe('imagesToPdf (SPEC 7.6, 14.1)', () => {
  it.each([
    [1, 100],
    [3, 300],
    [5, 150],
  ])('%i pages under %i KB with the right page count', async (n, maxKB) => {
    const out = await imagesToPdfCore(pages(n), { page: 'a4', maxKB }, encodeJpeg, resizeRaster);
    expect(out.length).toBeLessThanOrEqual(maxKB * 1024);
    expect(await pageCount(out)).toBe(n);
    expect(new TextDecoder().decode(out.subarray(0, 5))).toBe('%PDF-');
  }, 60_000);

  it('A4 pages are A4 (landscape image -> landscape A4); original size keeps aspect', async () => {
    const a4 = await PDFDocument.load(await imagesToPdfCore([synthPhoto(800, 500, 1)], { page: 'a4', maxKB: 200 }, encodeJpeg, resizeRaster));
    const p = a4.getPage(0).getSize();
    expect(Math.round(p.width)).toBe(842);
    expect(Math.round(p.height)).toBe(595);
    const orig = await PDFDocument.load(await imagesToPdfCore([synthPhoto(600, 300, 1)], { page: 'original', maxKB: null }, encodeJpeg, resizeRaster));
    const o = orig.getPage(0).getSize();
    expect(o.width / o.height).toBeCloseTo(2, 2);
  });

  it('pads up to minKB without touching pages', async () => {
    const out = await imagesToPdfCore([synthPhoto(200, 200, 2)], { page: 'a4', maxKB: 300, minKB: 50 }, encodeJpeg, resizeRaster);
    expect(out.length).toBeGreaterThanOrEqual(50 * 1024);
    expect(out.length).toBeLessThanOrEqual(300 * 1000);
    expect(await pageCount(out)).toBe(1);
  });

  it('throws PDF_IMPOSSIBLE with numbers when it cannot fit', async () => {
    await expect(imagesToPdfCore(pages(4), { page: 'a4', maxKB: 3 }, encodeJpeg, resizeRaster)).rejects.toSatisfy(
      (e: unknown) => isEngineError(e) && e.code === 'PDF_IMPOSSIBLE' && Number(e.details?.minKBReached) > 3,
    );
  }, 60_000);

  it('compressPdf back end: rasterised pages under maxKB at the original page size', async () => {
    const rs = [synthDetailed(1240, 1754, 1), synthPhoto(1240, 1754, 2, { noise: 20 })];
    const sizes = [{ w: 595.28, h: 841.89 }, { w: 595.28, h: 841.89 }];
    const out = await assembleCompressed(rs, sizes, 900, encodeJpeg);
    expect(out.length).toBeLessThanOrEqual(900 * 1000);
    const doc = await PDFDocument.load(out);
    expect(doc.getPageCount()).toBe(2);
    expect(Math.round(doc.getPage(1).getSize().height)).toBe(842);
    await expect(assembleCompressed(rs, sizes, 5, encodeJpeg)).rejects.toSatisfy((e: unknown) => isEngineError(e) && e.code === 'PDF_IMPOSSIBLE');
  }, 60_000);
});

describe('zip (SPEC 7.7)', () => {
  it('stores JPEGs, adds README.txt with sizes and unique names', async () => {
    const jpg = await encodeJpeg(synthPhoto(100, 100, 1), 80);
    const readme = buildReadme({ examName: 'SBI Clerk 2026', files: [{ name: 'photo.jpg', size: jpg.length }], sourceUrl: 'https://sbi.bank.in/x.pdf', lastChecked: '2026-10-21' });
    expect(readme).toContain('SBI Clerk 2026');
    expect(readme).toContain('https://sbi.bank.in/x.pdf');
    const z = buildZip([{ name: 'photo.jpg', bytes: jpg }, { name: 'photo.jpg', bytes: jpg }], 'Exam: SBI Clerk\n{{files}}\nSource: x');
    const files = unzipSync(z);
    expect(Object.keys(files).sort()).toEqual(['README.txt', 'photo (2).jpg', 'photo.jpg']);
    expect(files['photo.jpg']).toEqual(jpg);
    const txt = strFromU8(files['README.txt']!);
    expect(txt).toContain('photo (2).jpg');
    expect(txt).toContain(`${jpg.length} bytes`);
    expect(txt).toContain('\r\n');
    expect(uniqueNames(['a/b.jpg'])).toEqual(['a_b.jpg']);
  });
  it('appends the listing when there is no placeholder', () => {
    const z = buildZip([{ name: 'sign.jpg', bytes: new Uint8Array([1, 2, 3]) }], 'Exam: X');
    expect(strFromU8(unzipSync(z)['README.txt']!)).toMatch(/Files:\r\n {2}sign\.jpg/);
  });
});

describe('convert and photo sheet', () => {
  it('convert: jpg flattens alpha on white (baseline), png and webp encode', async () => {
    const r = { data: new Uint8ClampedArray(20 * 20 * 4), width: 20, height: 20 }; // fully transparent
    const jpg = await convertRaster(r, 'jpg');
    expect(inspectJpeg(jpg).baseline).toBe(true);
    const d = await decodeJpeg(jpg);
    expect(d.data[0]).toBeGreaterThan(250);
    const blk = await decodeJpeg(await convertRaster(r, 'jpg', { background: '#000000' }));
    expect(blk.data[0]).toBeLessThan(5);
    expect([...(await convertRaster(r, 'png')).subarray(1, 4)]).toEqual([0x50, 0x4e, 0x47]);
    expect(new TextDecoder().decode((await convertRaster(synthPhoto(30, 30, 1), 'webp', { quality: 70 })).subarray(8, 12))).toBe('WEBP');
  });

  it('sheet layout: 8 copies of 35×45 mm fit on 4×6 in; A4 takes 16', () => {
    expect(layoutSheet({ copies: 8, paper: '4x6' }).placed).toBeGreaterThanOrEqual(6);
    expect(layoutSheet({ copies: 16, paper: 'a4' }).placed).toBe(16);
  });

  it('photoSheet: PDF page is A4 with one embedded photo; JPG at 300 DPI', async () => {
    const src = synthPhoto(600, 700, 3);
    const pdf = await PDFDocument.load(await photoSheetCore(src, { copies: 8, paper: 'a4' }, encodeJpeg, resizeRaster));
    expect(pdf.getPageCount()).toBe(1);
    expect(Math.round(pdf.getPage(0).getSize().width)).toBe(595);
    const jpg = await photoSheetCore(src, { copies: 4, paper: '4x6', output: 'jpg' }, encodeJpeg, resizeRaster);
    const info = inspectJpeg(jpg);
    expect(info.jfif).toEqual({ units: 1, xDensity: 300, yDensity: 300 });
    expect([info.width, info.height]).toEqual([1200, 1800]);
  });
});
