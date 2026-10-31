/**
 * Where codec WebAssembly modules come from.
 *
 * Browser / worker: the content-hashed URLs written by scripts/copy-wasm.mjs into
 * wasm-manifest.generated.ts (immutable, safe to cache forever). Tests install a Node source
 * with `setWasmSource`.
 */
import { WASM_MANIFEST } from '../wasm-manifest.generated';

export type WasmName = 'jpeg-enc' | 'jpeg-dec' | 'png' | 'webp-enc' | 'webp-dec' | 'resize';

export interface WasmSource {
  load(name: WasmName): Promise<WebAssembly.Module>;
}

// Compile-time check that the generated manifest covers every codec.
const URLS: Record<WasmName, string> = WASM_MANIFEST;

export function wasmUrl(name: WasmName): string {
  return URLS[name];
}

export const browserWasmSource: WasmSource = {
  async load(name) {
    const url = wasmUrl(name);
    if (typeof WebAssembly.compileStreaming === 'function') {
      try {
        return await WebAssembly.compileStreaming(fetch(url, { credentials: 'same-origin' }));
      } catch {
        // wrong MIME type or no streaming support: fall back to bytes below
      }
    }
    const res = await fetch(url, { credentials: 'same-origin' });
    if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
    return WebAssembly.compile(await res.arrayBuffer());
  },
};

let current: WasmSource = browserWasmSource;

export function getWasmSource(): WasmSource {
  return current;
}

/** Replace the module source (tests, or a custom CDN). Codecs already loaded are kept. */
export function setWasmSource(source: WasmSource): void {
  current = source;
}
