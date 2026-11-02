import { defineConfig } from 'vitest/config';
import { fileURLToPath } from 'node:url';

export default defineConfig({
  resolve: { alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) } },
  test: {
    // Engine tests run the real WASM codecs; give slow CI agents headroom.
    testTimeout: 30_000,
  },
});
