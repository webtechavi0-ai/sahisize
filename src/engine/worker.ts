/**
 * Engine Web Worker: Comlink.expose over the environment-agnostic core (engine-core.ts).
 * Pixels stay here in the handle registry (Q5); byte results are transferred, not copied.
 */
import * as Comlink from 'comlink';
import { createEngineCore } from './engine-core';
import { installErrorTransfer } from './errors';
import type { Bytes } from './types';
import type { WorkerApi } from './worker-protocol';

installErrorTransfer();

const core = createEngineCore();

const tx = <T extends Bytes>(b: T): T => Comlink.transfer(b, [b.buffer]);

const impl: WorkerApi = {
  caps: () => core.caps(),
  decode: (blob, opts) => core.decode(blob, opts),
  adoptRaster: (r) => core.adoptRaster(r),
  adoptRasters: (rs) => core.adoptRasters(rs),
  resize: (img, w, h) => core.resize(img, w, h),
  crop: (img, rect, deg, flip) => core.crop(img, rect, deg, flip),
  cleanup: (img, kind, opts) => core.cleanup(img, kind, opts),
  async fit(img, spec, opts, strip) {
    const r = await core.fit(img, spec, opts, strip);
    return Comlink.transfer(r, [r.bytes.buffer]);
  },
  async imagesToPdf(items, opts, onProgress) {
    return tx(await core.imagesToPdf(items, opts, onProgress));
  },
  async assemblePdfFromRasters(pages, opts) {
    return tx(await core.assemblePdfFromRasters(pages, opts));
  },
  async zip(files, readme) {
    return tx(await core.zip(files, readme));
  },
  prewarm: (kinds) => core.prewarm(kinds),
  release: (img) => core.release(img),
  async convert(img, format, opts) {
    return tx(await core.convert(img, format, opts));
  },
  async photoSheet(img, opts) {
    return tx(await core.photoSheet(img, opts));
  },
  async preview(img, opts) {
    const r = await core.preview(img, opts);
    return Comlink.transfer(r, [r.bytes.buffer]);
  },
};

Comlink.expose(impl);
