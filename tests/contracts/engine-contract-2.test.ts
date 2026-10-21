import { describe, expect, it } from 'vitest';
import * as mock from '@/engine/mock';
import { cropAspect, isEngineError, letterboxesOnMismatch, type DocSpec } from '@/engine/types';

const base: DocSpec = {
  doc: 'signature',
  label: { en: 'Signature', hi: 'हस्ताक्षर' },
  widthPx: null,
  heightPx: null,
  minKB: 10,
  maxKB: 20,
  format: 'jpg',
  dpi: null,
  fileName: 'sign.jpg',
  rules: [],
};

describe('cropAspect (Q13)', () => {
  it('fixed pixels -> w/h', () => {
    expect(cropAspect({ ...base, widthPx: 140, heightPx: 60 })).toBeCloseTo(140 / 60);
  });
  it('explicit aspect wins over KB-only defaults, but not over fixed px', () => {
    expect(cropAspect({ ...base, aspect: 3 })).toBe(3);
    expect(cropAspect({ ...base, aspect: 3, widthPx: 200, heightPx: 100 })).toBe(2);
  });
  it('square range (UPSC 350-500) -> 1', () => {
    expect(
      cropAspect({ ...base, minWidthPx: 350, maxWidthPx: 500, minHeightPx: 350, maxHeightPx: 500 }),
    ).toBe(1);
  });
  it('min-only range (RRB 140x60) -> 7:3', () => {
    expect(cropAspect({ ...base, minWidthPx: 140, minHeightPx: 60 })).toBeCloseTo(7 / 3);
  });
  it('mixed range -> free', () => {
    expect(
      cropAspect({ ...base, minWidthPx: 150, maxWidthPx: 220, minHeightPx: 250, maxHeightPx: 320 }),
    ).toBeNull();
  });
  it('KB-only defaults by doc type', () => {
    expect(cropAspect({ ...base, doc: 'photo' })).toBeCloseTo(3.5 / 4.5);
    expect(cropAspect(base)).toBeCloseTo(7 / 3);
    expect(cropAspect({ ...base, doc: 'thumb' })).toBe(1);
    expect(cropAspect({ ...base, doc: 'declaration' })).toBeNull();
    expect(cropAspect({ ...base, doc: 'other' })).toBeNull();
  });
  it('letterbox vs cover-crop docs (Q14)', () => {
    expect(
      ['signature', 'thumb', 'declaration', 'certificate'].every((d) =>
        letterboxesOnMismatch(d as DocSpec['doc']),
      ),
    ).toBe(true);
    expect(letterboxesOnMismatch('photo')).toBe(false);
    expect(letterboxesOnMismatch('other')).toBe(false);
  });
});

describe('mock follows the contract additions', () => {
  it('fit warns LETTERBOXED / COVER_CROPPED on aspect mismatch', async () => {
    mock.resetMock();
    const img = await mock.resize(
      await mock.decode(new Blob([mock.TINY_JPEG], { type: 'image/jpeg' })),
      300,
      300,
    );
    expect(img).toMatchObject({ width: 300, height: 300 });
    const sig = await mock.fit(img, { ...base, widthPx: 140, heightPx: 60 });
    expect(sig.warnings).toContain('LETTERBOXED');
    const photo = await mock.fit(img, {
      ...base,
      doc: 'photo',
      widthPx: 200,
      heightPx: 230,
      minKB: 20,
      maxKB: 50,
      fileName: 'photo.jpg',
    });
    expect(photo.warnings).toContain('COVER_CROPPED');
    const square = await mock.fit(img, {
      ...base,
      doc: 'thumb',
      widthPx: 240,
      heightPx: 240,
      fileName: 'thumb.jpg',
    });
    expect(square.warnings).toEqual([]);
  });

  it('fit throws SPEC_INCOMPLETE when maxKB is null (Q15)', async () => {
    mock.resetMock();
    const img = await mock.decode(new Blob([mock.TINY_JPEG], { type: 'image/jpeg' }));
    await expect(mock.fit(img, { ...base, maxKB: null })).rejects.toSatisfy(
      (e: unknown) => isEngineError(e) && e.code === 'SPEC_INCOMPLETE',
    );
  });

  it('cleanup pads to targetAspect', async () => {
    mock.resetMock();
    const img = await mock.resize(
      await mock.decode(new Blob([mock.TINY_JPEG], { type: 'image/jpeg' })),
      1000,
      1000,
    );
    const out = await mock.cleanup(img, 'signature', {
      strength: 50,
      ink: 'black',
      targetAspect: 7 / 3,
    });
    expect(out.width / out.height).toBeCloseTo(7 / 3, 2);
  });

  it('decodePdfPages returns one handle per requested page; encrypted -> PDF_ENCRYPTED', async () => {
    mock.resetMock();
    const pdf = new Blob(['%PDF-1.4\n'], { type: 'application/pdf' });
    const pages = await mock.decodePdfPages(pdf, { dpi: 100, pages: [1, 2, 3] });
    expect(pages).toHaveLength(3);
    expect(pages[0]!.width).toBe(827);
    const enc = new Blob(['%PDF-1.4\n/Encrypt 5 0 R'], { type: 'application/pdf' });
    await expect(mock.decodePdfPages(enc)).rejects.toSatisfy(
      (e: unknown) => isEngineError(e) && e.code === 'PDF_ENCRYPTED',
    );
  });

  it('convert accepts options', async () => {
    mock.resetMock();
    const img = await mock.decode(new Blob([mock.TINY_JPEG], { type: 'image/jpeg' }));
    const out = await mock.convert(img, 'jpg', { quality: 80, background: '#FFFFFF' });
    expect([...out.slice(0, 2)]).toEqual([0xff, 0xd8]);
  });
});
