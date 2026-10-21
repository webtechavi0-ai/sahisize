import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { getDocument, OPS } from 'pdfjs-dist/legacy/build/pdf.mjs';
import { imageAreaFromOps } from '@/engine/pdf-raster';
import {
  COMPRESS_DPIS,
  runCompressPdf,
  spreadPages,
  TEXT_ONLY_IMAGE_SHARE,
  type CompressPdfDeps,
} from '@/engine/compress-pdf';
import { EngineError, isEngineError } from '@/engine/types';
import { outputChecks } from '@/components/tools/logic';

const fixture = (n: string) => new Uint8Array(readFileSync(new URL(`../fixtures/e2e/${n}`, import.meta.url)));

async function shares(name: string): Promise<number[]> {
  const doc = await getDocument({ data: fixture(name) }).promise;
  const out: number[] = [];
  for (let n = 1; n <= doc.numPages; n++) {
    const page = await doc.getPage(n);
    const vp = page.getViewport({ scale: 1 });
    const ops = await page.getOperatorList();
    out.push(imageAreaFromOps(OPS, ops.fnArray, ops.argsArray) / (vp.width * vp.height));
  }
  await doc.destroy();
  return out;
}

describe('T7 image share (pdfjs operator list)', () => {
  it('a scanned PDF is all image; a text PDF with a small logo is under the text-only share', async () => {
    const scan = await shares('scan.pdf');
    expect(scan.every((s) => s > 0.95 && s <= 1.01)).toBe(true);
    const text = await shares('text-long.pdf');
    expect(text.length).toBe(40);
    expect(text[0]).toBeGreaterThan(0); // the 40×40 pt logo is seen…
    expect(Math.max(...text)).toBeLessThan(0.01); // …but is negligible
    expect((await shares('text-only.pdf'))[0]).toBe(0);
  });
});

/** Fake PDF: every page costs `kbAt150` KB at 150 DPI (scales with pixel count), min quality. */
function fakeDeps(numPages: number, kbAt150: number, share = 1) {
  const calls: { pages: number; dpi: number; maxKB: number }[] = [];
  let renders = 0;
  const deps: CompressPdfDeps = {
    numPages,
    imageShare: async () => share,
    async build(pages, dpi, maxKB, onPage) {
      for (let i = 0; i < pages.length; i++) {
        renders++;
        onPage();
      }
      calls.push({ pages: pages.length, dpi, maxKB });
      const kb = pages.length * kbAt150 * (dpi / 150) ** 2;
      if (kb > maxKB) throw new EngineError('PDF_IMPOSSIBLE', 'no', { minKBReached: kb, maxKB });
      return new Uint8Array(Math.round(kb * 1000));
    },
  };
  return { deps, calls, renders: () => renders };
}

describe('T7 compressPdf control flow', () => {
  it('already small uses the 1000-byte hard limit (Q26)', async () => {
    const { deps } = fakeDeps(1, 1);
    // 300 KB limit: 300,000 B is under; 300,001 B is over even though it is < 300×1024.
    await expect(runCompressPdf(300_000, 300, deps)).rejects.toMatchObject({ code: 'ALREADY_SMALL' });
    await expect(runCompressPdf(300_001, 300, deps)).resolves.toBeInstanceOf(Uint8Array);
  });

  it('a mostly-text PDF stops before any rasterising; allowTextOnly compresses anyway', async () => {
    const f = fakeDeps(5, 10, TEXT_ONLY_IMAGE_SHARE / 2);
    const err = await runCompressPdf(500_000, 100, f.deps).catch((e) => e);
    expect(isEngineError(err) && err.code).toBe('PDF_TEXT_ONLY');
    expect(err.details).toMatchObject({ maxKB: 100, imagePct: 5 });
    expect(f.renders()).toBe(0);
    await expect(runCompressPdf(500_000, 100, f.deps, { allowTextOnly: true })).resolves.toBeInstanceOf(Uint8Array);
  });

  it('a 120-page PDF renders a few sample pages, then one full pass at the DPI that fits', async () => {
    // 3 KB/page at 150 DPI = 360 KB; 100 DPI ≈ 160 KB fits under 200 KB.
    const f = fakeDeps(120, 3);
    const progress: [number, number][] = [];
    await runCompressPdf(2_000_000, 200, f.deps, { onProgress: (d, t) => progress.push([d, t]) });
    const full = f.calls.filter((c) => c.pages === 120);
    expect(full).toEqual([{ pages: 120, dpi: 100, maxKB: 200 }]);
    expect(f.renders()).toBeLessThanOrEqual(120 + 3 * COMPRESS_DPIS.length);
    expect(progress.at(-1)![0]).toBe(progress.at(-1)![1]);
  });

  it('stops early when even 72 DPI cannot reach the target (no full passes)', async () => {
    const f = fakeDeps(120, 50); // 6000 KB at 150 DPI, ~1400 KB at 72 DPI
    const err = await runCompressPdf(9_000_000, 300, f.deps).catch((e) => e);
    expect(isEngineError(err) && err.code).toBe('PDF_IMPOSSIBLE');
    expect(Number(err.details.minKBReached)).toBeGreaterThan(300);
    expect(f.calls.some((c) => c.pages === 120)).toBe(false);
    expect(f.renders()).toBe(3); // one sample pass at 150 DPI was enough to know
  });

  it('short PDFs skip sampling and stop after a pass that cannot be rescued', async () => {
    const f = fakeDeps(2, 500); // 1000 KB at 150 DPI; 72 DPI ≈ 230 KB > 100 × 1.2
    await expect(runCompressPdf(1_200_000, 100, f.deps)).rejects.toMatchObject({ code: 'PDF_IMPOSSIBLE' });
    expect(f.calls.length).toBe(1);
  });

  it('spreads checked pages over the document', () => {
    expect(spreadPages(2, 3)).toEqual([1, 2]);
    expect(spreadPages(120, 3)).toEqual([1, 61, 120]);
  });
});

describe('outputChecks size row (Q26)', () => {
  const pdf = (n: number) => {
    const b = new Uint8Array(n);
    b.set([0x25, 0x50, 0x44, 0x46]);
    return b;
  };
  it('passes at maxKB×1000 bytes and fails one byte over', () => {
    const row = (n: number) => outputChecks({ bytes: pdf(n), format: 'pdf', maxKB: 300 }).find((c) => c.rule === 'size')!;
    expect(row(300_000).pass).toBe(true);
    expect(row(300_001).pass).toBe(false);
  });
});
