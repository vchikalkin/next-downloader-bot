import { defineConfig } from 'tsup';

export default defineConfig({
  bundle: true,
  clean: true,
  define: {
    'process.env.SENTRY_BUILD_ENV': JSON.stringify('production'),
  },
  entry: ['./src/index.ts'],
  external: ['@sentry/node', 'grammy', 'zod'],
  format: 'cjs',
  loader: { '.json': 'copy' },
  minify: true,
  outDir: './dist',
  sourcemap: false,
  splitting: false,
  target: 'es2022',
});
