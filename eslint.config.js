// Error checking rules. Browser code in src/, Node code in tests/ and scripts/, Apps Script in
// backend/ (pasted into the Apps Script editor, so it is a plain script, not a module).
import js from '@eslint/js';
import globals from 'globals';

export default [
  { ignores: ['node_modules/', 'content/guidelines.js'] },
  js.configs.recommended,
  {
    languageOptions: { globals: { ...globals.browser, ...globals.node } },
    rules: {
      'no-var': 'error',
      'prefer-const': 'error',
      'no-empty': ['error', { allowEmptyCatch: false }],
    },
  },
  {
    files: ['backend/**/*.gs'],
    languageOptions: {
      sourceType: 'script',
      // The Apps Script services Code.gs uses; add one here when the backend starts using it.
      globals: Object.fromEntries(
        [
          'CacheService',
          'ContentService',
          'DriveApp',
          'DocumentApp',
          'LockService',
          'MailApp',
          'PropertiesService',
          'Session',
          'SpreadsheetApp',
          'Utilities',
        ].map((name) => [name, 'readonly']),
      ),
    },
    // Top-level functions are entry points (doGet, doPost, triggers) or shared across the
    // project, so only unused locals count.
    rules: { 'no-unused-vars': ['error', { vars: 'local', args: 'after-used' }] },
  },
];
