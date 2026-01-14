import { node } from '@repo/eslint-config/node';

/** @type {import("eslint").Linter.Config} */
export default [
  ...node,
  {
    ignores: ['**/types/**', '*.config.*'],
  },
  {
    rules: {
      '@typescript-eslint/naming-convention': 'off',
      'unicorn/prevent-abbreviations': 'off',
      'canonical/id-match': 'off',
      'id-length': 'off',
    },
  },
];
