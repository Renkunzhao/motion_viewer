import { defineConfig } from 'vitest/config';

export default defineConfig({
  // Use relative asset paths so dist/ can be hosted under any sub-path.
  base: './',
  server: {
    host: true,
    port: 5173,
    watch: {
      ignored: [
        // Reference repos and embedded Python envs are large and not part of Vite HMR sources.
        '**/ref/**',
        '**/.venv/**',
        '**/site-packages/**',
      ],
    },
  },
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
});
