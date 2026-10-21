import { describe, expect, it } from 'vitest';
import type * as Api from '@/engine/api';
import * as mock from '@/engine/mock';
import { isEngineError, type DocSpec, type EngineApi, type FitResult } from '@/engine/types';

// Compile-time: mock exports the same function names/signatures as api.ts.
type ApiFns = Pick<typeof Api, keyof EngineApi>;
const _mockMatchesApi: ApiFns = mock;
void _mockMatchesApi;

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
  rules: [{ en: 'Light background', hi: 'हल्का बैकग्राउंड' }],
};

function assertValidFitResult(r: FitResult, spec: DocSpec) {
  expect(r.bytes).toBeInstanceOf(Uint8Array);
  expect(r.sizeBytes).toBe(r.bytes.length);
  expect([...r.bytes.slice(0, 3)]).toEqual([0xff, 0xd8, 0xff]);
  expect(r.widthPx).toBeGreaterThan(0);
  expect(r.heightPx).toBeGreaterThan(0);
  expect(r.quality).toBeGreaterThanOrEqual(0);
  expect(r.quality).toBeLessThanOrEqual(100);
  expect(r.stages.length).toBeGreaterThan(0);
  expect(r.checks.map((c) => c.rule)).toEqual(expect.arrayContaining(['dims', 'size', 'format']));
  for (const c of r.checks) {
    expect(typeof c.pass).toBe('boolean');
    expect(typeof c.actual).toBe('string');
    expect(typeof c.required).toBe('string');
  }
  expect(r.sizeBytes).toBeLessThanOrEqual(spec.maxKB! * 1024);
  expect(r.sizeBytes).toBeGreaterThanOrEqual((spec.minKB ?? 0) * 1024);
}

describe('engine contract', () => {
  it('api.ts exports every EngineApi function', async () => {
    const api = await import('@/engine/api');
    const names: (keyof EngineApi)[] = [
      'decode',
      'crop',
      'cleanup',
      'fit',
      'imagesToPdf',
      'decodePdfPages',
      'resize',
      'compressPdf',
      'zip',
      'prewarm',
      'release',
      'convert',
      'photoSheet',
      'preview',
    ];
    for (const n of names) expect(typeof api[n]).toBe('function');
    expect(typeof api.engine.fit).toBe('function');
  });

  it('mock.fit returns a valid FitResult for a fixed-size spec', async () => {
    mock.resetMock();
    const img = await mock.decode(new Blob([mock.TINY_JPEG], { type: 'image/jpeg' }));
    expect(img).toMatchObject({ width: 16, height: 16 });
    const r = await mock.fit(img, ibpsPhoto);
    assertValidFitResult(r, ibpsPhoto);
    expect(r.widthPx).toBe(200);
    expect(r.heightPx).toBe(230);
    expect(r.checks.every((c) => c.pass || c.level !== 'required')).toBe(true);
  });

  it('mock.fit handles KB-only and range specs', async () => {
    mock.resetMock();
    const img = await mock.decode(new Blob([new Uint8Array(10)], { type: 'image/png' }));
    const kbOnly: DocSpec = {
      ...ibpsPhoto,
      widthPx: null,
      heightPx: null,
      minKB: 10,
      maxKB: 200,
      dpi: null,
    };
    const r1 = await mock.fit(img, kbOnly);
    assertValidFitResult(r1, kbOnly);
    expect(r1.dims?.mode).toBe('kb-only');
    const range: DocSpec = {
      ...kbOnly,
      doc: 'signature',
      minWidthPx: 140,
      minHeightPx: 60,
      minKB: 30,
      maxKB: 49,
    };
    const r2 = await mock.fit(img, range);
    assertValidFitResult(r2, range);
    expect(r2.dims?.mode).toBe('range');
  });

  it('mock errors are EngineErrors with codes', async () => {
    mock.resetMock();
    mock.configureMock({ failFit: { photo: 'TOO_DETAILED' } });
    const img = await mock.decode(new Blob([mock.TINY_JPEG], { type: 'image/jpeg' }));
    await expect(mock.fit(img, ibpsPhoto)).rejects.toSatisfy(
      (e: unknown) => isEngineError(e) && e.code === 'TOO_DETAILED',
    );
    await expect(mock.decode(new Blob(['x'], { type: 'text/plain' }))).rejects.toSatisfy(
      (e: unknown) => isEngineError(e) && e.code === 'UNSUPPORTED_TYPE',
    );
    mock.resetMock();
  });
});
