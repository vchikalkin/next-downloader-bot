import { sheriff } from 'eslint-config-sheriff';
import { defineConfig } from 'eslint/config';

const sheriffOptions = {
  react: false,
  next: false,
  astro: false,
  lodash: false,
  remeda: false,
  playwright: false,
  storybook: true,
  jest: false,
  vitest: false,
  tsconfigRootDir: import.meta.dirname,
};

export default defineConfig(sheriff(sheriffOptions), {
  rules: {
    'func-style': 'off',
    '@typescript-eslint/explicit-module-boundary-types': 'off',
    '@typescript-eslint/no-use-before-define': [
      'error',
      { classes: true, enums: true, functions: false, typedefs: true, variables: true },
    ],
    'fsecond/prefer-destructured-optionals': 'off',
    'unicorn/prefer-top-level-await': 'off',
  },
});
