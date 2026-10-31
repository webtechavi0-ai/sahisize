/**
 * Exact Lanczos3 resample: squoosh resize WASM, falling back to the pure-JS implementation
 * (Node, WASM blocked by CSP, transient failures).
 *
 * The WASM path is only disabled after two consecutive failures, so one transient error (e.g. a
 * failed fetch while offline) does not slow every later resize down for the rest of the session.
 */
import { boxPrepass, resizeLanczosJs } from '../core/lanczos';
import { cloneRaster } from '../core/raster';
import type { ResizeFn } from '../core/geometry';
import type { RasterImage } from '../types';
import { resizeLanczosWasm } from './codecs';

const MAX_WASM_FAILURES = 2;
let wasmFailures = 0;

/** Test hook. */
export function resetResizeState(): void {
  wasmFailures = 0;
}

export const resizeRaster: ResizeFn = async (src: RasterImage, width: number, height: number) => {
  const w = Math.max(1, Math.round(width));
  const h = Math.max(1, Math.round(height));
  if (w === src.width && h === src.height) return cloneRaster(src);
  const r = boxPrepass(src, w, h);
  if (wasmFailures < MAX_WASM_FAILURES) {
    try {
      const out = await resizeLanczosWasm(r, w, h);
      wasmFailures = 0;
      return out;
    } catch {
      wasmFailures++;
    }
  }
  return resizeLanczosJs(r, w, h);
};
