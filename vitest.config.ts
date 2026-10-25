import { defineConfig } from 'vitest/config';
import { fileURLToPath } from 'node:url';

const alias = { '@': fileURLToPath(new URL('./src', import.meta.url)) };

export default defineConfig({
  resolve: { alias },
  esbuild: { jsx: 'automatic', jsxImportSource: 'preact' },
  test: {
    passWithNoTests: true,
    projects: [
      {
        extends: true,
        test: {
          name: 'engine',
          environment: 'node',
          include: ['tests/engine/**/*.test.ts'],
          setupFiles: ['tests/engine/setup.ts'],
          pool: 'threads',
          testTimeout: 60_000,
        },
      },
      {
        extends: true,
        test: {
          name: 'node',
          environment: 'node',
          include: [
            'tests/contracts/**/*.test.ts',
            'tests/presets/**/*.test.ts',
            'tests/security/**/*.test.ts',
          ],
        },
      },
    ],
  },
});
