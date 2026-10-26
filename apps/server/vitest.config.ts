import { defineConfig } from 'vitest/config';
import { testEnv } from './test/testEnv';

export default defineConfig({
  test: {
    include: ['test/**/*.test.ts'],
    env: testEnv,
    globalSetup: ['test/globalSetup.ts'],
    setupFiles: ['test/setup.ts'],
    // Todos los archivos comparten la misma base: se corren de a uno.
    fileParallelism: false,
    testTimeout: 15_000,
  },
});
