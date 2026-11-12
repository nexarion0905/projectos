import { defineConfig } from 'vitest/config';
import { fileURLToPath } from 'node:url';

export default defineConfig({
  resolve: { alias: { '@': fileURLToPath(new URL('.', import.meta.url)) } },
  test: { include: ['features/**/*.test.ts', 'lib/**/*.test.ts', 'packages/**/*.test.ts'] },
});
