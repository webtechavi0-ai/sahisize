import { PDFDocument } from 'pdf-lib';
import { beforeAll, describe, expect, it } from 'vitest';
import { encodeJpeg } from '../codecs/codecs';
import { resizeRaster } from '../codecs/resize';
import { gradient } from '../testing/fixtures';
import { useNodeWasm } from '../testing/node-wasm-source';
import { inspectJpeg } from './jpeg-markers';
import { layoutSheet, mmToPt, photoSheetCore } from './sheet';

beforeAll(() => useNodeWasm());

describe('photo sheet', () => {
  it('lays out an even grid', () => {
    const l = layoutSheet({ copies: 16, paper: 'a4' });
    expect(l.placed).toBe(16);
    expect(new Set(l.slots.map((s) => s.x)).size).toBe(4); // 4×4, not 5+5+5+1
    const small = layoutSheet({ copies: 8, paper: '4x6' });
    expect(small.placed).toBeLessThanOrEqual(8);
  });

  it('renders a 300 DPI JPEG sheet and a PDF sheet', async () => {
    const jpg = await photoSheetCore(gradient(350, 450), { copies: 4, paper: '4x6', output: 'jpg' }, encodeJpeg, resizeRaster);
    const info = inspectJpeg(jpg);
    expect(info.jfif).toEqual({ units: 1, xDensity: 300, yDensity: 300 });
    expect([info.width, info.height]).toEqual([1200, 1800]);
    const pdf = await photoSheetCore(gradient(350, 450), { copies: 4, paper: 'a4' }, encodeJpeg, resizeRaster);
    const page = (await PDFDocument.load(pdf)).getPage(0);
    expect(page.getWidth()).toBeCloseTo(mmToPt(210), 1);
  });
});
