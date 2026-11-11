// Error checking rules. Browser code in src/, Node code in tests/.
import js from '@eslint/js';
import globals from 'globals';

export default [
  { ignores: ['node_modules/', 'content/guidelines.js', 'backend/'] },
  js.configs.recommended,
  {
    languageOptions: { globals: { ...globals.browser, ...globals.node } },
    rules: {
      'no-var': 'error',
      'prefer-const': 'error',
      'no-empty': ['error', { allowEmptyCatch: false }],
    },
  },
];
