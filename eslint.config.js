import js from '@eslint/js';
import tseslint from '@typescript-eslint/eslint-plugin';
import tsparser from '@typescript-eslint/parser';

export default [
  js.configs.recommended,
  {
    files: ['**/*.{ts,tsx}'],
    ignores: ['**/dist/**', '**/build/**', '**/node_modules/**'],
    languageOptions: {
      parser: tsparser,
      parserOptions: { ecmaVersion: 2022, sourceType: 'module', ecmaFeatures: { jsx: true } },
      globals: { console: 'readonly', process: 'readonly', document: 'readonly', window: 'readonly', setTimeout: 'readonly', clearTimeout: 'readonly', setInterval: 'readonly', clearInterval: 'readonly', fetch: 'readonly', URL: 'readonly', crypto: 'readonly', TextEncoder: 'readonly', TextDecoder: 'readonly', navigator: 'readonly', location: 'readonly', localStorage: 'readonly', sessionStorage: 'readonly', structuredClone: 'readonly', HTMLDivElement: 'readonly', EventSource: 'readonly' }
    },
    plugins: { '@typescript-eslint': tseslint },
    rules: {}
  },
  {
    files: ['**/*.js', '**/*.mjs'],
    ignores: ['**/dist/**', '**/build/**', '**/node_modules/**'],
    languageOptions: { ecmaVersion: 2022, sourceType: 'module', globals: { console: 'readonly', process: 'readonly', fetch: 'readonly', URL: 'readonly' } },
    rules: {}
  },
  {
    ignores: ['**/dist/**', '**/build/**', '**/node_modules/**', '**/.vite/**']
  }
];