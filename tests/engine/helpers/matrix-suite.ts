/**
 * Shared suite body for the corpus × preset matrix test files. Vitest parallelises across files,
 * so the matrix is split into shard files (fit-presets-N for the default 30-image sample,
 * fit-corpus-N for the full corpus under FULL_CORPUS=1).
 */
import { describe, expect, it } from 'vitest';
import { FULL, formatSummary, runMatrix, summarize, writeShardResults } from './corpus-run';
import { loadPresetSpecs } from './presets';

export function matrixSuite(full: boolean, shard: number, shards: number): void {
  const run = full ? FULL : true;
  describe.skipIf(!run)(`fit() × every preset × ${full ? 'full corpus' : 'corpus sample'} [${shard + 1}/${shards}]`, () => {
    it('presets load from src/content/presets', () => {
      const p = loadPresetSpecs();
      expect(p.files).toBeGreaterThan(0);
      expect(p.specs.length).toBeGreaterThan(0);
      if (p.skipped.length) console.warn(`[presets] skipped ${p.skipped.length}:\n  ${p.skipped.join('\n  ')}`);
    });

    it('100% pixels + format + DPI, >= 99.5% inside the KB range (1 KB = 1024 B), PDFs under max KB', async () => {
      const { results, pdf, specs } = await runMatrix(full, shard, shards);
      const s = summarize(results, pdf);
      if (full) writeShardResults(`shard-${shard + 1}-of-${shards}`, { results, pdf });
      console.log(formatSummary(s, `${full ? 'full' : 'sample'} shard ${shard + 1}/${shards} (${specs} image specs)`));
      expect(s.cases).toBeGreaterThan(0);
      expect(s.pixelsFormat).toBe(s.cases);
      expect(s.dpi).toBe(s.cases);
      expect(s.kb1024 / s.cases).toBeGreaterThanOrEqual(0.995);
      expect(s.pdfOk).toBe(s.pdfCases);
    }, 3_600_000);
  });
}
