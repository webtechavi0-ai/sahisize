/**
 * Fit timing in Node (proxy; the 4× CPU throttle check is Playwright's perf-fit.spec, PLAN 3.8).
 * Typical kit fits from a 12 MP photo must stay well under 2 s; the worst KB-only case is logged.
 */
import { describe, expect, it } from 'vitest';
import { fitRaster } from '@/engine/fit';
import type { DocSpec } from '@/engine/types';
import { deps, prepareForSpec } from './helpers/corpus-run';
import { synthDetailed, synthPhoto, synthSignature } from './helpers/synth';

const base = { label: { en: 'x', hi: 'x' }, format: 'jpg' as const, fileName: 'x.jpg', rules: [] };
const specs: [string, DocSpec][] = [
  ['IBPS photo 200×230 20–50 KB', { ...base, doc: 'photo', widthPx: 200, heightPx: 230, minKB: 20, maxKB: 50, dpi: 200 }],
  ['SBI signature 140×60 10–20 KB', { ...base, doc: 'signature', widthPx: 140, heightPx: 60, minKB: 10, maxKB: 20, dpi: 200, cleanup: 'signature' }],
  ['Declaration 800×400 50–100 KB', { ...base, doc: 'declaration', widthPx: 800, heightPx: 400, minKB: 50, maxKB: 100, dpi: 200 }],
  ['RRB signature min 140×60 30–49 KB', { ...base, doc: 'signature', widthPx: null, heightPx: null, minWidthPx: 140, minHeightPx: 60, minKB: 30, maxKB: 49, dpi: 200, cleanup: 'signature' }],
  ['KB-only other 20–200 KB', { ...base, doc: 'other', widthPx: null, heightPx: null, minKB: 20, maxKB: 200, dpi: null }],
];

describe('fit timing (Node)', () => {
  const photo = synthPhoto(3000, 4000, 1, { noise: 12, texture: true });
  const sig = synthSignature(3000, 1400, 2, { paper: 'shadow', thickness: 10 }).raster;
  const detailed = synthDetailed(3000, 4000, 3);

  it.each(specs)('%s', async (_name, spec) => {
    const times: number[] = [];
    for (const [kind, src] of [['photo', photo], ['signature', sig], ['detailed', detailed]] as const) {
      const input = await prepareForSpec(src, spec, { kind: kind === 'detailed' ? 'detailed' : kind, params: {} });
      const t = performance.now();
      await fitRaster(input, spec, deps);
      times.push(performance.now() - t);
    }
    console.log(`[perf] ${_name}: photo ${times[0]!.toFixed(0)} ms, signature ${times[1]!.toFixed(0)} ms, detailed ${times[2]!.toFixed(0)} ms`);
    expect(Math.max(...times)).toBeLessThan(2500); // Node, under parallel test load
  }, 120_000);
});
