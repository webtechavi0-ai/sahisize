/**
 * Browser / worker WASM source: Vite resolves `?url` to a hashed asset under /_astro/
 * (precached by the service worker, PLAN 3.15).
 */
import jpegEncUrl from '@jsquash/jpeg/codec/enc/mozjpeg_enc.wasm?url';
import jpegDecUrl from '@jsquash/jpeg/codec/dec/mozjpeg_dec.wasm?url';
import pngUrl from '@jsquash/png/codec/pkg/squoosh_png_bg.wasm?url';
import webpEncUrl from '@jsquash/webp/codec/enc/webp_enc.wasm?url';
import webpDecUrl from '@jsquash/webp/codec/dec/webp_dec.wasm?url';
import resizeUrl from '@jsquash/resize/lib/resize/pkg/squoosh_resize_bg.wasm?url';
import type { WasmName, WasmSource } from './codecs';

const URLS: Record<WasmName, string> = {
  'jpeg-enc': jpegEncUrl,
  'jpeg-dec': jpegDecUrl,
  png: pngUrl,
  'webp-enc': webpEncUrl,
  'webp-dec': webpDecUrl,
  resize: resizeUrl,
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
