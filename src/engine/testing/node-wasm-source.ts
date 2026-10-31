/**
 * Test support (Node only, never imported by app code): compile the codec .wasm files straight
 * from node_modules so unit tests run the real MozJPEG / PNG / resize codecs.
 */
import { readFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { setWasmSource, type WasmName, type WasmSource } from '../codecs/wasm-source';

const FILES: Record<WasmName, string> = {
  'jpeg-enc': '@jsquash/jpeg/codec/enc/mozjpeg_enc.wasm',
  'jpeg-dec': '@jsquash/jpeg/codec/dec/mozjpeg_dec.wasm',
  png: '@jsquash/png/codec/pkg/squoosh_png_bg.wasm',
  'webp-enc': '@jsquash/webp/codec/enc/webp_enc.wasm',
  'webp-dec': '@jsquash/webp/codec/dec/webp_dec.wasm',
  resize: '@jsquash/resize/lib/resize/pkg/squoosh_resize_bg.wasm',
};

const require = createRequire(import.meta.url);

export const nodeWasmSource: WasmSource = {
  async load(name) {
    const path = require.resolve(FILES[name]);
    return WebAssembly.compile(await readFile(path));
  },
};

export function useNodeWasm(): void {
  setWasmSource(nodeWasmSource);
}
