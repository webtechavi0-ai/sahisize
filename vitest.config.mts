/**
 * Vitest config (repo root, so plain `npx vitest run [paths]` picks it up; there is no
 * `npm test` script).
 */
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

const root = fileURLToPath(new URL('./', import.meta.url));

export default defineConfig({
  root,
  resolve: {
    alias: [
      // `import 'server-only'` throws outside a React Server Components bundle.
      { find: /^server-only$/, replacement: `${root}src/seo/__tests__/server-only-stub.ts` },
      { find: /^@\/(.*)$/, replacement: `${root}src/$1` },
    ],
  },
  test: {
    include: ['src/**/*.test.ts'],
    environment: 'node',
  },
});
