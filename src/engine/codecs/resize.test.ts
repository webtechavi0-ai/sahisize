import { afterEach, describe, expect, it, vi } from 'vitest';
import { gradient } from '../testing/fixtures';

const wasm = vi.hoisted(() => ({ fail: 0, calls: 0 }));

vi.mock('./codecs', () => ({
  resizeLanczosWasm: async (_r: unknown, w: number, h: number) => {
    wasm.calls++;
    if (wasm.fail > 0) {
      wasm.fail--;
      throw new Error('transient');
    }
    return { data: new Uint8ClampedArray(w * h * 4), width: w, height: h };
  },
}));

const { resizeRaster, resetResizeState } = await import('./resize');

afterEach(() => {
  resetResizeState();
  wasm.fail = 0;
  wasm.calls = 0;
});

describe('resizeRaster', () => {
  it('returns a copy when the size is unchanged', async () => {
    const r = gradient(10, 10);
    const out = await resizeRaster(r, 10, 10);
    expect(out).not.toBe(r);
    expect(wasm.calls).toBe(0);
  });

  it('falls back to JS once but retries WASM after a single transient failure', async () => {
    wasm.fail = 1;
    const first = await resizeRaster(gradient(40, 40), 20, 20);
    expect(first.width).toBe(20); // JS fallback result
    await resizeRaster(gradient(40, 40), 20, 20);
    expect(wasm.calls).toBe(2); // WASM tried again
  });

  it('stops trying WASM after two consecutive failures', async () => {
    wasm.fail = 5;
    await resizeRaster(gradient(40, 40), 20, 20);
    await resizeRaster(gradient(40, 40), 20, 20);
    await resizeRaster(gradient(40, 40), 20, 20);
    expect(wasm.calls).toBe(2);
  });
});
