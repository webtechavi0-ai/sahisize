/**
 * Engine Web Worker. Phase 1 STUB: every call throws NOT_IMPLEMENTED.
 * Workstream A replaces the bodies in Phase 2 (handle registry Map<id, RasterImage>,
 * codecs, fit, cleanup, pdf, zip). Keep `Comlink.expose(impl)` and
 * `installErrorTransfer()`.
 */
import * as Comlink from 'comlink';
import { installErrorTransfer } from './errors';
import { EngineError } from './types';
import type { WorkerApi } from './worker-protocol';

installErrorTransfer();

function notImplemented(fn: string): never {
  throw new EngineError(
    'NOT_IMPLEMENTED',
    `engine.${fn} is not implemented yet (Phase 2, Workstream A)`,
  );
}

const impl: WorkerApi = {
  async caps() {
    return {
      offscreenCanvas: typeof OffscreenCanvas !== 'undefined',
      wasm: typeof WebAssembly !== 'undefined',
    };
  },
  decode: async () => notImplemented('decode'),
  adoptRaster: async () => notImplemented('adoptRaster'),
  crop: async () => notImplemented('crop'),
  cleanup: async () => notImplemented('cleanup'),
  fit: async () => notImplemented('fit'),
  imagesToPdf: async () => notImplemented('imagesToPdf'),
  assemblePdfFromRasters: async () => notImplemented('assemblePdfFromRasters'),
  zip: async () => notImplemented('zip'),
  prewarm: async () => {},
  release: async () => {},
  convert: async () => notImplemented('convert'),
  photoSheet: async () => notImplemented('photoSheet'),
  preview: async () => notImplemented('preview'),
};

Comlink.expose(impl);
