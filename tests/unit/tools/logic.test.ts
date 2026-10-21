import { describe, expect, it } from 'vitest';
import * as mock from '@/engine/mock';
import { EngineError, type EngineImage, type FitResult } from '@/engine/types';
import {
  addCapped,
  baseName,
  buildCustomQuery,
  compressFitOptions,
  compressSpec,
  customErrors,
  customSpec,
  fitWithDownscale,
  fromPx,
  inkSpec,
  jpegSize,
  lockedPair,
  lowerBoundKB,
  moveItem,
  outputChecks,
  parseCustomQuery,
  runBatch,
  sheetCapacity,
  sniffFormat,
  toPx,
  uniqueNames,
  validateKb,
  visibleChecks,
  type FitEngine,
} from '@/components/tools/logic';

describe('T1 compress spec', () => {
  it('targets [target − 10%, target] and honours a higher user minimum', () => {
    expect(lowerBoundKB(20)).toBe(18);
    expect(lowerBoundKB(25)).toBe(22.5);
    const s = compressSpec(50, null);
    expect([s.minKB, s.maxKB, s.widthPx, s.heightPx, s.format, s.doc]).toEqual([45, 50, null, null, 'jpg', 'other']);
    expect(compressSpec(50, 48).minKB).toBe(48);
    expect(compressSpec(50, 10).minKB).toBe(45);
  });

  it('validates targets and minimums', () => {
    expect(validateKb(20, null)).toBeNull();
    expect(validateKb(2, null)).toBe('targetInvalid');
    expect(validateKb(NaN, null)).toBe('targetInvalid');
    expect(validateKb(20, 30)).toBe('minAboveMax');
    expect(validateKb(20, -1)).toBe('minInvalid');
  });

  it('maps keep-dimensions vs allow-downscale to fit options', () => {
    expect(compressFitOptions(true)).toEqual({ keepSourceDims: true, allowDownscale: false });
    expect(compressFitOptions(false)).toEqual({ keepSourceDims: true, allowDownscale: true });
  });

  it('works end to end on the mock engine: lands inside the window', async () => {
    mock.resetMock();
    const img = await mock.decode(new File([mock.TINY_JPEG], 'a.jpg', { type: 'image/jpeg' }));
    for (const n of [10, 20, 30, 50, 100, 200, 500]) {
      const { result } = await fitWithDownscale(mock, img, compressSpec(n), compressFitOptions(false));
      expect(result.sizeBytes / 1024).toBeLessThanOrEqual(n);
      expect(result.sizeBytes / 1024).toBeGreaterThanOrEqual(lowerBoundKB(n));
    }
  });
});

describe('fitWithDownscale', () => {
  const big: EngineImage = { id: 'x', width: 4000, height: 3000 };
  function fakeEngine(okBelow: number) {
    const released: string[] = [];
    const sizes: number[] = [];
    let id = 0;
    const engine: FitEngine = {
      async fit(img) {
        sizes.push(img.width);
        if (img.width > okBelow) throw new EngineError('TOO_DETAILED', 'x', { maxKB: 10 });
        return { widthPx: img.width, heightPx: img.height, sizeBytes: 9000, bytes: new Uint8Array(1), quality: 50, stages: [], checks: [] } as FitResult;
      },
      async resize(_img, w, h) {
        return { id: `r${++id}`, width: w, height: h };
      },
      release(img) {
        released.push(img.id);
      },
    };
    return { engine, released, sizes };
  }

  it('shrinks by 0.6 until it fits and releases the intermediates, never the input', async () => {
    const { engine, released, sizes } = fakeEngine(1000);
    const { result, scaled } = await fitWithDownscale(engine, big, compressSpec(10), compressFitOptions(false));
    expect(scaled).toBe(true);
    expect(sizes).toEqual([4000, 2400, 1440, 864]);
    expect(result.widthPx).toBe(864);
    expect(released).toEqual(['r1', 'r2', 'r3']);
  });

  it('does not shrink when dimensions must be kept', async () => {
    const { engine, sizes } = fakeEngine(1000);
    await expect(fitWithDownscale(engine, big, compressSpec(10), compressFitOptions(true))).rejects.toMatchObject({ code: 'TOO_DETAILED' });
    expect(sizes).toEqual([4000]);
  });

  it('gives up after the retry limit and passes other errors through', async () => {
    const { engine, released } = fakeEngine(10);
    await expect(fitWithDownscale(engine, big, compressSpec(10), compressFitOptions(false), 2)).rejects.toMatchObject({ code: 'TOO_DETAILED' });
    expect(released).toEqual(['r1', 'r2']);
    const bad: FitEngine = { ...engine, fit: async () => Promise.reject(new EngineError('DECODE_FAILED')) };
    await expect(fitWithDownscale(bad, big, compressSpec(10), compressFitOptions(false))).rejects.toMatchObject({ code: 'DECODE_FAILED' });
  });
});

describe('T2 units and aspect lock', () => {
  it('converts cm/mm/in at DPI', () => {
    expect(toPx(3.5, 'cm', 200)).toBe(276);
    expect(toPx(4.5, 'cm', 200)).toBe(354);
    expect(toPx(6, 'cm', 200)).toBe(472);
    expect(toPx(35, 'mm', 300)).toBe(413);
    expect(toPx(2, 'in', 300)).toBe(600);
    expect(toPx(140, 'px', 72)).toBe(140);
    expect(toPx(-1, 'px', 72)).toBe(0);
    expect(fromPx(472, 'cm', 200)).toBe(5.99);
    expect(fromPx(600, 'in', 300)).toBe(2);
  });

  it('keeps the other side in proportion', () => {
    expect(lockedPair('w', 200, 4 / 3, 0)).toEqual({ w: 200, h: 150 });
    expect(lockedPair('h', 3, 0.5)).toEqual({ w: 1.5, h: 3 });
  });

  it('hides size rows when there is no KB limit', () => {
    const rows = [
      { rule: 'dims', pass: true, actual: '', required: '' },
      { rule: 'size', pass: true, actual: '', required: '' },
      { rule: 'size1000', pass: true, actual: '', required: '' },
    ] as const;
    expect(visibleChecks(rows, false).map((r) => r.rule)).toEqual(['dims']);
    expect(visibleChecks(rows, true)).toHaveLength(3);
  });
});

describe('output checks (T3, T6, T7, T8)', () => {
  it('sniffs formats by magic bytes', () => {
    expect(sniffFormat(mock.TINY_JPEG)).toBe('jpg');
    expect(sniffFormat(new Uint8Array([0x89, 0x50, 0x4e, 0x47]))).toBe('png');
    expect(sniffFormat(new TextEncoder().encode('RIFF\0\0\0\0WEBPVP8 '))).toBe('webp');
    expect(sniffFormat(new TextEncoder().encode('%PDF-1.7'))).toBe('pdf');
    expect(sniffFormat(new Uint8Array([1, 2, 3]))).toBeNull();
  });

  it('reads JPEG dimensions', () => {
    expect(jpegSize(mock.TINY_JPEG)).toEqual({ w: 16, h: 16 });
    expect(jpegSize(new Uint8Array([1, 2]))).toBeNull();
  });

  it('builds required rows for size and format', () => {
    const pdf = new TextEncoder().encode('%PDF-1.4 ' + 'x'.repeat(2000));
    const ok = outputChecks({ bytes: pdf, format: 'pdf', maxKB: 3 });
    expect(ok.map((c) => [c.rule, c.pass])).toEqual([
      ['size', true],
      ['format', true],
    ]);
    const tooBig = outputChecks({ bytes: pdf, format: 'pdf', maxKB: 1 });
    expect(tooBig[0]!.pass).toBe(false);
    const wrong = outputChecks({ bytes: pdf, format: 'jpg', width: 10, height: 10 });
    expect(wrong.find((c) => c.rule === 'format')!.pass).toBe(false);
    expect(wrong.find((c) => c.rule === 'dims')!.level).toBe('info');
    const exact = outputChecks({ bytes: mock.TINY_JPEG, format: 'jpg', width: 16, height: 16, expect: { w: 16, h: 17 } });
    expect(exact.find((c) => c.rule === 'dims')!.pass).toBe(false);
  });
});

describe('file names and lists', () => {
  it('makes safe, unique names', () => {
    expect(baseName('IMG 2024 (1).HEIC')).toBe('IMG-2024-1');
    expect(baseName('.jpg')).toBe('image');
    expect(baseName('फोटो.jpg')).toBe('image');
    expect(uniqueNames(['a.jpg', 'A.jpg', 'a.jpg', 'b'])).toEqual(['a.jpg', 'A-2.jpg', 'a-3.jpg', 'b']);
  });

  it('moves and caps items', () => {
    expect(moveItem([1, 2, 3, 4], 0, 2)).toEqual([2, 3, 1, 4]);
    expect(moveItem([1, 2, 3], 2, 9)).toEqual([1, 2, 3]);
    expect(moveItem([1, 2, 3], 2, 0)).toEqual([3, 1, 2]);
    const { list, dropped } = addCapped(Array(18).fill(0), [1, 2, 3, 4]);
    expect(list).toHaveLength(20);
    expect(dropped).toBe(2);
  });
});

describe('T8 sheet capacity', () => {
  it('matches the engine layout (5 mm margin, 3 mm gap)', () => {
    expect(sheetCapacity('4x6')).toBe(6);
    expect(sheetCapacity('a4')).toBe(30);
    expect(sheetCapacity('4x6', 51, 51)).toBe(2);
  });
});

describe('T9 runBatch', () => {
  it('runs sequentially, records failures and stops between items', async () => {
    const order: number[] = [];
    const states: Record<number, string[]> = {};
    let stop = false;
    const sum = await runBatch(
      [1, 2, 3, 4, 5],
      async (n) => {
        order.push(n);
        if (n === 2) throw new Error('bad');
        if (n === 3) stop = true;
        return n * 10;
      },
      { shouldStop: () => stop, onUpdate: (i, s) => (states[i] ??= []).push(s.status) },
    );
    expect(order).toEqual([1, 2, 3]);
    expect(sum).toEqual({ done: 2, failed: 1, skipped: 2 });
    expect(states[0]).toEqual(['working', 'done']);
    expect(states[1]).toEqual(['working', 'failed']);
    expect(states[4]).toEqual(['skipped']);
  });
});

describe('T10 custom preset query', () => {
  it('parses the SPEC example and round-trips', () => {
    const s = parseCustomQuery('?w=200&h=230&min=20&max=50');
    expect(s).toEqual({ w: 200, h: 230, minKB: 20, maxKB: 50, dpi: null, format: 'jpg' });
    expect(parseCustomQuery(buildCustomQuery(s))).toEqual(s);
    const full = { w: 140, h: 60, minKB: 10, maxKB: 20, dpi: 200, format: 'png' as const };
    expect(buildCustomQuery(full)).toBe('?w=140&h=60&min=10&max=20&dpi=200&fmt=png');
    expect(parseCustomQuery(buildCustomQuery(full))).toEqual(full);
  });

  it('falls back safely on junk', () => {
    expect(parseCustomQuery('')).toMatchObject({ w: 200, h: 230, maxKB: 50 });
    const s = parseCustomQuery('?w=abc&h=10&min=90&max=50&dpi=5&fmt=gif');
    expect(s).toEqual({ w: null, h: null, minKB: null, maxKB: 50, dpi: null, format: 'jpg' });
  });

  it('builds fixed or KB-only specs and reports errors', () => {
    const fixed = customSpec({ w: 200, h: 230, minKB: 20, maxKB: 50, dpi: 200, format: 'jpg' });
    expect([fixed.widthPx, fixed.heightPx, fixed.minKB, fixed.maxKB, fixed.dpi]).toEqual([200, 230, 20, 50, 200]);
    const kbOnly = customSpec({ w: null, h: null, minKB: 10, maxKB: 200, dpi: null, format: 'jpg' });
    expect([kbOnly.widthPx, kbOnly.minKB, kbOnly.maxKB]).toEqual([null, 10, 200]);
    expect(customErrors({ w: 200, h: null, minKB: null, maxKB: 50, dpi: null, format: 'jpg' })).toEqual(['dims']);
    expect(customErrors({ w: 1, h: 1, minKB: 60, maxKB: 50, dpi: 20, format: 'jpg' })).toEqual(['kb', 'dpi']);
  });
});

describe('ink tools', () => {
  it('builds signature/thumb/declaration specs with cleanup', () => {
    const s = inkSpec('signature', { w: 140, h: 60, minKB: 10, maxKB: 20, dpi: 200 })!;
    expect([s.doc, s.widthPx, s.heightPx, s.minKB, s.maxKB, s.cleanup, s.fileName]).toEqual(['signature', 140, 60, 10, 20, 'signature', 'sign.jpg']);
    const d = inkSpec('declaration', { w: null, h: null, minKB: 50, maxKB: 100, dpi: null })!;
    expect([d.widthPx, d.cleanup, d.minKB]).toEqual([null, null, 50]);
    expect(inkSpec('thumb', { w: 240, h: null, minKB: null, maxKB: 50, dpi: null })).toBeNull();
    expect(inkSpec('thumb', { w: 240, h: 240, minKB: 60, maxKB: 50, dpi: null })).toBeNull();
  });
});
