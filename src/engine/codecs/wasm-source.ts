/**
 * Where codec WebAssembly modules come from.
 *
 * Browser / worker: each binary is referenced with `new URL(..., import.meta.url)`, so Next
 * (webpack) emits it under /_next/static/media with a content hash (immutable, safe to cache
 * forever) and always pairs it with the JS glue of the same package version.
 */

export type WasmName = 'jpeg-enc' | 'jpeg-dec' | 'png' | 'webp-enc' | 'webp-dec' | 'resize';

export interface WasmSource {
  load(name: WasmName): Promise<WebAssembly.Module>;
}

const URLS: Record<WasmName, URL> = {
  'jpeg-enc': new URL('@jsquash/jpeg/codec/enc/mozjpeg_enc.wasm', import.meta.url),
  'jpeg-dec': new URL('@jsquash/jpeg/codec/dec/mozjpeg_dec.wasm', import.meta.url),
  png: new URL('@jsquash/png/codec/pkg/squoosh_png_bg.wasm', import.meta.url),
  'webp-enc': new URL('@jsquash/webp/codec/enc/webp_enc.wasm', import.meta.url),
  'webp-dec': new URL('@jsquash/webp/codec/dec/webp_dec.wasm', import.meta.url),
  resize: new URL('@jsquash/resize/lib/resize/pkg/squoosh_resize_bg.wasm', import.meta.url),
};

export function wasmUrl(name: WasmName): string {
  return URLS[name].href;
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

/** Replace the module source (e.g. a custom CDN). Codecs already loaded are kept. */
export function setWasmSource(source: WasmSource): void {
  current = source;
}
