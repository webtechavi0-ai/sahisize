/**
 * Engine Web Worker: Comlink.expose over the environment-agnostic core. Pixels stay here in the
 * handle registry; byte results are transferred, not copied.
 */
import * as Comlink from 'comlink';
import { installErrorTransfer } from '../error-transfer';
import type { Bytes, ProgressFn } from '../types';
import { createEngineCore } from './engine-core';
import type { WorkerApi } from './protocol';

installErrorTransfer();

const core = createEngineCore();
const tx = <T extends Bytes>(b: T): T => Comlink.transfer(b, [b.buffer]);

/** Close the MessagePort behind a Comlink-proxied callback once the call is done. */
function releaseCallback(fn: ProgressFn | undefined): void {
  if (!fn) return;
  const release = (fn as unknown as { [Comlink.releaseProxy]?: () => void })[Comlink.releaseProxy];
  if (typeof release === 'function') release();
}

const api: WorkerApi = {
  init: (gen) => core.init(gen),
  caps: () => core.caps(),
  decode: (blob, opts) => core.decode(blob, opts),
  adoptRaster: (r) => core.adoptRaster(r),
  resize: (img, w, h) => core.resize(img, w, h),
  crop: (img, rect, deg, flip) => core.crop(img, rect, deg, flip),
  cleanup: (img, kind, opts) => core.cleanup(img, kind, opts),
  async fit(img, spec, opts, strip) {
    const r = await core.fit(img, spec, opts, strip);
    return Comlink.transfer(r, [r.bytes.buffer]);
  },
  async imagesToPdf(items, opts, onProgress) {
    try {
      return tx(await core.imagesToPdf(items, opts, onProgress));
    } finally {
      releaseCallback(onProgress);
    }
  },
  assemblePdfFromRasters: async (pages, opts) => tx(await core.assemblePdfFromRasters(pages, opts)),
  zip: async (files, readme) => tx(await core.zip(files, readme)),
  prewarm: (kinds) => core.prewarm(kinds),
  release: (img) => core.release(img),
  convert: async (img, format, opts) => tx(await core.convert(img, format, opts)),
  photoSheet: async (img, opts) => tx(await core.photoSheet(img, opts)),
  async preview(img, opts) {
    const r = await core.preview(img, opts);
    return Comlink.transfer(r, [r.bytes.buffer]);
  },
};

Comlink.expose(api);
