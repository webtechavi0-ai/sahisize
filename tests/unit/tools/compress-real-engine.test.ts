// @vitest-environment node
/**
 * T1 acceptance (SPEC 5.2) on the REAL engine in Node: output lands in [target − 10%, target]
 * for 10/20/50/100/200/500 KB, using the same spec/options/downscale helper the island uses.
 * Corpus sample: a few photos and a detailed image (generated deterministically when the
 * gitignored corpus is not on disk).
 */
import { describe, expect, it } from 'vitest';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { setWasmSource } from '@/engine/codecs';
import { installImageDataPolyfill, nodeWasmSource } from '@/engine/codecs-node';
import { createEngineCore } from '@/engine/engine-core';
import { KB } from '@/engine/types';
import { compressFitOptions, compressSpec, fitWithDownscale, lowerBoundKB } from '@/components/tools/logic';
import { CORPUS_DIR, corpusPlan, renderItem } from '../../../scripts/make-test-corpus';

installImageDataPolyfill();
setWasmSource(nodeWasmSource);

const TARGETS = [10, 20, 50, 100, 200, 500];

function sample() {
  const plan = corpusPlan();
  const photos = plan.filter((p) => p.kind === 'photo' && p.uprightW * p.uprightH <= 4e6 && p.format === 'jpg').slice(0, 4);
  const detailed = plan.filter((p) => p.kind === 'detailed' && p.uprightW * p.uprightH <= 4e6).slice(0, 2);
  const sign = plan.filter((p) => p.kind === 'signature' && p.format === 'png').slice(0, 1);
  return [...photos, ...detailed, ...sign];
}

describe('T1 compress to X KB on the real engine', () => {
  const core = createEngineCore({ native: false });
  const items = sample();

  it('has a corpus sample', () => {
    expect(items.length).toBeGreaterThanOrEqual(3);
  });

  for (const item of items) {
    it(`${item.id} (${item.uprightW}×${item.uprightH}) lands in [target−10%, target]`, async () => {
      const onDisk = join(CORPUS_DIR, `${item.id}.${item.format}`);
      const bytes = existsSync(onDisk) ? readFileSync(onDisk) : await renderItem(item);
      const img = await core.decode(new Blob([new Uint8Array(bytes)]));
      try {
        for (const target of TARGETS) {
          const spec = compressSpec(target, null);
          const { result } = await fitWithDownscale(core, img, spec, compressFitOptions(false));
          const kb = result.sizeBytes / KB;
          expect(kb, `${item.id} @ ${target} KB`).toBeLessThanOrEqual(target);
          expect(kb, `${item.id} @ ${target} KB`).toBeGreaterThanOrEqual(lowerBoundKB(target));
          expect(result.checks.filter((c) => (c.level ?? 'required') === 'required').every((c) => c.pass)).toBe(true);
        }
      } finally {
        await core.release(img);
      }
    }, 120_000);
  }
});
