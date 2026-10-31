// @ts-check
import { defineConfig } from 'eslint/config';
import tseslint from 'typescript-eslint';
import jsxA11y from 'eslint-plugin-jsx-a11y-x';

export default defineConfig(
  {
    ignores: [
      'dist/**',
      '.next/**',
      'out/**',
      'node_modules/**',
      '.lighthouseci/**',
      'test-results/**',
      'public/**',
      'dev-dist/**',
      '.claude/**', // agent worktrees: their own tsconfig makes the parser root ambiguous
    ],
  },
  ...tseslint.configs.recommended,
  {
    files: ['**/*.{tsx,jsx}'],
    ...jsxA11y.configs.recommended,
  },
  {
    rules: {
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_', caughtErrorsIgnorePattern: '^_' },
      ],
      '@typescript-eslint/consistent-type-imports': 'error',
    },
  },
  {
    files: ['**/*.cjs'],
    languageOptions: {
      sourceType: 'commonjs',
      globals: {
        module: 'writable',
        require: 'readonly',
        __dirname: 'readonly',
        process: 'readonly',
      },
    },
    rules: { '@typescript-eslint/no-require-imports': 'off' },
  },
);
