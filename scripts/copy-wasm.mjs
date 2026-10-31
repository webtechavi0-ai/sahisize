// Copies the codec .wasm files into public/wasm so the browser engine can fetch them by URL.
import { copyFileSync, mkdirSync } from 'node:fs';
const FILES = {
  'jpeg-enc': '@jsquash/jpeg/codec/enc/mozjpeg_enc.wasm',
  'jpeg-dec': '@jsquash/jpeg/codec/dec/mozjpeg_dec.wasm',
  png: '@jsquash/png/codec/pkg/squoosh_png_bg.wasm',
  'webp-enc': '@jsquash/webp/codec/enc/webp_enc.wasm',
  'webp-dec': '@jsquash/webp/codec/dec/webp_dec.wasm',
  resize: '@jsquash/resize/lib/resize/pkg/squoosh_resize_bg.wasm',
};
mkdirSync('public/wasm', { recursive: true });
for (const [name, src] of Object.entries(FILES)) copyFileSync(`node_modules/${src}`, `public/wasm/${name}.wasm`);
