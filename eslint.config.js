import js from '@eslint/js'
import ts from 'typescript-eslint'
import globals from 'globals'

export default ts.config(
  {
    ignores: [
      'dist/**',
      'public/mediapipe/**',
      '.local/**',
      'test-results/**',
      'coverage/**',
    ],
  },
  js.configs.recommended,
  ...ts.configs.recommended,
  {
    files: ['src/**/*.{ts,tsx}', 'tests/**/*.{ts,tsx}'],
    languageOptions: { globals: globals.browser },
  },
  {
    files: ['*.{js,ts}', 'scripts/**/*.mjs', 'tests/**/*.ts'],
    languageOptions: { globals: globals.node },
  },
  {
    files: ['scripts/sw-template.js'],
    languageOptions: { globals: globals.serviceworker },
  },
)
