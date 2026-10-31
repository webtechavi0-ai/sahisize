import { beforeAll, describe, expect, it } from 'vitest';
import { inspectJpeg } from '../core/jpeg-markers';
import { gradient } from '../testing/fixtures';
import { useNodeWasm } from '../testing/node-wasm-source';
import { decodeJpeg, decodePng, encodeJpeg, encodePng, resizeLanczosWasm } from './codecs';

beforeAll(() => useNodeWasm());

describe('codecs (real WASM in Node)', () => {
  it('MozJPEG writes baseline 4:2:0 with JFIF only', async () => {
    const bytes = await encodeJpeg(gradient(120, 90, 10), 80);
    const info = inspectJpeg(bytes);
    expect(info.baseline).toBe(true);
    expect(info.progressive).toBe(false);
    expect(info.lumaSampling).toEqual({ h: 2, v: 2 });
    expect(info.jfif).not.toBeNull();
    expect(info.hasExif).toBe(false);
    expect([info.width, info.height]).toEqual([120, 90]);
    const back = await decodeJpeg(bytes);
    expect([back.width, back.height]).toEqual([120, 90]);
  });

  it('quality changes size monotonically on a noisy image', async () => {
    const r = gradient(160, 120, 30);
    const low = await encodeJpeg(r, 20);
    const high = await encodeJpeg(r, 90);
    expect(high.length).toBeGreaterThan(low.length);
  });

  it('PNG round-trips', async () => {
    const r = gradient(33, 21);
    const back = await decodePng(await encodePng(r));
    expect(back.width).toBe(33);
    expect(Array.from(back.data.slice(0, 8))).toEqual(Array.from(r.data.slice(0, 8)));
  });

  it('resize WASM produces the requested size', async () => {
    const out = await resizeLanczosWasm(gradient(100, 80), 37, 29);
    expect([out.width, out.height, out.data.length]).toEqual([37, 29, 37 * 29 * 4]);
  });
});
