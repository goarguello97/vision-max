import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['esm'],
  platform: 'node',
  target: 'node24',
  // packages/shared se publica como TS fuente: se incluye en el bundle.
  noExternal: [/^@vision-max\//],
  sourcemap: true,
  clean: true,
});
