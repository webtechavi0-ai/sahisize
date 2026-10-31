import { describe, expect, it } from 'vitest';
import { EngineError } from '../types';
import { runCompressPdf, spreadPages, type CompressPdfDeps } from './compress-plan';

const ok = new Uint8Array([1]);

function deps(over: Partial<CompressPdfDeps> & { reach?: (dpi: number, pages: number[]) => number | null } = {}): CompressPdfDeps & { builds: number[] } {
  const builds: number[] = [];
  return {
    builds,
    numPages: 2,
    imageShare: async () => 1,
    async build(pages, dpi, maxKB, onPage) {
      builds.push(dpi);
      pages.forEach(() => onPage());
      const kb = over.reach?.(dpi, pages) ?? null;
      if (kb !== null && kb > maxKB) throw new EngineError('PDF_IMPOSSIBLE', 'x', { minKBReached: kb, maxKB });
      return ok;
    },
    ...over,
  };
}

describe('runCompressPdf', () => {
  it('rejects files already under the hard limit', async () => {
    await expect(runCompressPdf(100_000, 100, deps())).rejects.toMatchObject({ code: 'ALREADY_SMALL' });
  });

  it('rejects text-only PDFs unless allowed', async () => {
    await expect(runCompressPdf(500_000, 100, deps({ imageShare: async () => 0.02 }))).rejects.toMatchObject({
      code: 'PDF_TEXT_ONLY',
      details: { imagePct: 2 },
    });
    await expect(runCompressPdf(500_000, 100, deps({ imageShare: async () => 0 }), { allowTextOnly: true })).resolves.toBe(ok);
  });

  it('steps down DPI and stops when a lower DPI cannot fit', async () => {
    const d = deps({ reach: (dpi) => (dpi === 150 ? 200 : dpi === 100 ? 140 : 50) });
    await expect(runCompressPdf(500_000, 100, d)).resolves.toBe(ok);
    expect(d.builds).toEqual([150, 100, 72]);
    const hopeless = deps({ reach: () => 1000 });
    await expect(runCompressPdf(500_000, 100, hopeless)).rejects.toMatchObject({ code: 'PDF_IMPOSSIBLE', details: { minKBReached: 1000 } });
    expect(hopeless.builds).toEqual([150]);
  });

  it('samples long PDFs to pick the starting DPI', async () => {
    const d = deps({ numPages: 20, reach: (dpi, pages) => (dpi === 150 ? 20 * pages.length : 2 * pages.length) });
    const progress: [number, number][] = [];
    await runCompressPdf(5_000_000, 100, d, { onProgress: (a, b) => progress.push([a, b]) });
    expect(d.builds).toEqual([150, 100, 100]);
    expect(progress.at(-1)![0]).toBe(progress.at(-1)![1]);
  });

  it('spreads pages evenly', () => {
    expect(spreadPages(3, 10)).toEqual([1, 2, 3]);
    expect(spreadPages(100, 3)).toEqual([1, 51, 100]);
  });
});
