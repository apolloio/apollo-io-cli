import { defineConfig } from 'vitest/config';

// Unit suite: fast, mocked, no network. This is the suite CI runs.
export default defineConfig({
  test: {
    include: ['src/**/*.test.ts'],
    exclude: ['src/live/**'],
  },
});
