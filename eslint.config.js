import { node } from '@vchikalkin/eslint-config-awesome';

/** @type {import("eslint").Linter.Config} */
export default [
  ...node,
  {
    rules: {
      'unicorn/prevent-abbreviations': 'off',
    },
  },
];
