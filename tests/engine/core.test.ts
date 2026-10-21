import { describe, expect, it } from 'vitest';
import { PDFDocument } from 'pdf-lib';
import { encodeJpeg, encodePng } from '@/engine/codecs';
import { createEngineCore } from '@/engine/engine-core';
import { inspectJpeg } from '@/engine/jpeg-markers';
import { blockTextRaster } from '@/engine/strip';
import { isEngineError, type DocSpec } from '@/engine/types';
import { insertExifFirst, synthPhoto, synthSignature } from './helpers/synth';
import { applyOrientation } from '@/engine/raster';

const ibpsPhoto: DocSpec = {
  doc: 'photo',
  label: { en: 'Photograph', hi: 'फोटो' },
  widthPx: 200,
  heightPx: 230,
  minKB: 20,
  maxKB: 50,
  format: 'jpg',
  dpi: 200,
  fileName: 'photo.jpg',
  rules: [],
};

describe('engine core: the code the worker runs (PLAN 3.7)', () => {
  const core = createEngineCore({ textRaster: blockTextRaster });

  it('decode -> crop -> fit IBPS photo passes every check', async () => {
    const upright = synthPhoto(1500, 2000, 4, { noise: 6 });
    const file = new Blob([insertExifFirst(await encodeJpeg(applyOrientation(upright, 8), 92), 6)], { type: 'image/jpeg' });
    const img = await core.decode(file);
    expect([img.width, img.height]).toEqual([1500, 2000]);
    const cropped = await core.crop(img, { x: 100, y: 100, w: 1200, h: 1380 }, 0, { h: false, v: false });
    expect([cropped.width, cropped.height]).toEqual([1200, 1380]);
    const r = await core.fit(cropped, ibpsPhoto);
    expect(r.checks.filter((c) => (c.level ?? 'required') === 'required').every((c) => c.pass)).toBe(true);
    expect([r.widthPx, r.heightPx]).toEqual([200, 230]);
    expect(r.sizeBytes).toBeGreaterThanOrEqual(20 * 1024);
    expect(r.sizeBytes).toBeLessThanOrEqual(50 * 1024);
    expect(r.stages).toContain('dpi');
    expect(typeof r.durationMs).toBe('number');
    const pv = await core.preview(cropped, { maxSide: 300 });
    expect(pv.mime).toBe('image/jpeg');
    expect(Math.max(pv.width, pv.height)).toBe(300);
    await core.release(img);
    await core.release(img); // twice is safe
    await expect(core.fit(img, ibpsPhoto)).rejects.toSatisfy((e: unknown) => isEngineError(e) && e.code === 'INTERNAL');
  });

  it('cleanup -> fit signature; name/date strip on a photo', async () => {
    const { raster } = synthSignature(1400, 600, 9, { paper: 'shadow', thickness: 6 });
    const img = await core.decode(new Blob([await encodePng(raster)], { type: 'image/png' }));
    const clean = await core.cleanup(img, 'signature', { strength: 50, ink: 'black', targetAspect: 140 / 60 });
    const r = await core.fit(clean, { ...ibpsPhoto, doc: 'signature', widthPx: 140, heightPx: 60, minKB: 10, maxKB: 20 });
    expect(r.checks.find((c) => c.rule === 'background')?.pass).toBe(true);
    expect(r.sizeBytes).toBeGreaterThanOrEqual(10 * 1024);
    expect(r.sizeBytes).toBeLessThanOrEqual(20 * 1000);

    const ph = await core.decode(new Blob([await encodeJpeg(synthPhoto(350, 450, 1), 90)]));
    const s = await core.fit(ph, { ...ibpsPhoto, widthPx: 350, heightPx: 450, minKB: 25, maxKB: 100, needsNameDateStrip: true }, { nameDate: { name: 'Ravi', date: '21/10/2026' } });
    expect(s.stages).toContain('strip');
    expect([s.widthPx, s.heightPx]).toEqual([350, 450]);
  });

  it('resize, convert, photoSheet, imagesToPdf (blob + handle), zip', async () => {
    const img = await core.decode(new Blob([await encodeJpeg(synthPhoto(640, 480, 2), 90)]));
    const small = await core.resize(img, 320, 240);
    expect([small.width, small.height]).toEqual([320, 240]);
    const jpg = await core.convert(small, 'jpg', { quality: 80 });
    expect(inspectJpeg(jpg).width).toBe(320);
    const sheet = await core.photoSheet(img, { copies: 4, paper: '4x6' });
    expect((await PDFDocument.load(sheet)).getPageCount()).toBe(1);
    const pdf = await core.imagesToPdf(
      [{ kind: 'image', img }, { kind: 'blob', blob: new Blob([jpg], { type: 'image/jpeg' }) }],
      { page: 'a4', maxKB: 200 },
    );
    expect(pdf.length).toBeLessThanOrEqual(200 * 1024);
    expect((await PDFDocument.load(pdf)).getPageCount()).toBe(2);
    const z = await core.zip([{ name: 'photo.jpg', bytes: jpg }], 'Exam: test');
    expect([z[0], z[1]]).toEqual([0x50, 0x4b]);
  });

  it('adoptRaster validates and caps; assemblePdfFromRasters releases handles', async () => {
    await expect(core.adoptRaster({ data: new Uint8ClampedArray(3), width: 2, height: 2 })).rejects.toSatisfy((e: unknown) => isEngineError(e) && e.code === 'DECODE_FAILED');
    const before = core.handleCount();
    const page = await core.adoptRaster(synthPhoto(1240, 1754, 3));
    const out = await core.assemblePdfFromRasters([page], { maxKB: 300, pageSizesPt: [{ w: 595.28, h: 841.89 }] });
    expect(out.length).toBeLessThanOrEqual(300 * 1000);
    expect(core.handleCount()).toBe(before);
  });

  it('SPEC_INCOMPLETE for a toVerify document (maxKB null)', async () => {
    const img = await core.adoptRaster(synthPhoto(100, 100, 1));
    await expect(core.fit(img, { ...ibpsPhoto, maxKB: null })).rejects.toSatisfy((e: unknown) => isEngineError(e) && e.code === 'SPEC_INCOMPLETE');
  });
});
