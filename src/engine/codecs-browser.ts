/**
 * Browser / worker WASM source: served from /wasm (copied from node_modules at build).
 */
import type { WasmName, WasmSource } from './codecs';

// .wasm files are copied to /public/wasm by scripts/copy-wasm.mjs (predev/prebuild).
const URLS: Record<WasmName, string> = {
  'jpeg-enc': '/wasm/jpeg-enc.wasm',
  'jpeg-dec': '/wasm/jpeg-dec.wasm',
  png: '/wasm/png.wasm',
  'webp-enc': '/wasm/webp-enc.wasm',
  'webp-dec': '/wasm/webp-dec.wasm',
  resize: '/wasm/resize.wasm',
};

export const browserWasmSource: WasmSource = {
  async load(name) {
    const url = URLS[name];
    if (typeof WebAssembly.compileStreaming === 'function') {
      try {
        return await WebAssembly.compileStreaming(fetch(url));
      } catch {
        // wrong MIME type or no streaming support: fall back to bytes
      }
    }
    const res = await fetch(url);
    if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
    return WebAssembly.compile(await res.arrayBuffer());
  },
};
