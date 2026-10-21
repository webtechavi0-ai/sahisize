/**
 * Node WASM source for tests and scripts (PLAN 1.6 #1, 3.8). Never imported by browser code.
 */
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import type { WasmName, WasmSource } from './codecs';

const require = createRequire(import.meta.url);

const PATHS: Record<WasmName, string> = {
  'jpeg-enc': '@jsquash/jpeg/codec/enc/mozjpeg_enc.wasm',
  'jpeg-dec': '@jsquash/jpeg/codec/dec/mozjpeg_dec.wasm',
  png: '@jsquash/png/codec/pkg/squoosh_png_bg.wasm',
  'webp-enc': '@jsquash/webp/codec/enc/webp_enc.wasm',
  'webp-dec': '@jsquash/webp/codec/dec/webp_dec.wasm',
  resize: '@jsquash/resize/lib/resize/pkg/squoosh_resize_bg.wasm',
};

/** Minimal ImageData polyfill: the jsquash decoders construct `new ImageData(...)`. */
export function installImageDataPolyfill(): void {
  const g = globalThis as { ImageData?: unknown };
  if (!g.ImageData) {
    g.ImageData = class ImageData {
      data: Uint8ClampedArray;
      width: number;
      height: number;
      constructor(data: Uint8ClampedArray, width: number, height: number) {
        this.data = data;
        this.width = width;
        this.height = height;
      }
    };
  }
}

export const nodeWasmSource: WasmSource = {
  async load(name) {
    installImageDataPolyfill();
    const bytes = readFileSync(require.resolve(PATHS[name]));
    return WebAssembly.compile(bytes);
  },
};
