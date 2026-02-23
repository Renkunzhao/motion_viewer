import { defineConfig } from 'vitest/config';

export default defineConfig({
  // Use relative asset paths so dist/ can be hosted under any sub-path.
  base: './',
  server: {
    host: true,
    port: 5173,
  },
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
});
