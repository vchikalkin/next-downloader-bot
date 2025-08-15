import { defineConfig } from 'tsup';

export default defineConfig({
  bundle: true,
  clean: true,
  entry: ['./src/index.ts'],
  external: ['grammy', 'zod'],
  format: 'cjs',
  loader: { '.json': 'copy' },
  minify: true,
  outDir: './dist',
  sourcemap: false,
  splitting: false,
  target: 'es2022',
});
