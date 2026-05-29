import { defineConfig } from 'vitest/config';

// Live suite: makes real calls to https://api.apollo.io via the built CLI.
// Local-only (reuses `apollo auth login` credentials), never run in CI.
// Runs serially with long timeouts to respect API rate limits.
export default defineConfig({
  test: {
    include: ['src/live/**/*.live.test.ts'],
    fileParallelism: false,
    pool: 'forks',
    poolOptions: { forks: { singleFork: true } },
    testTimeout: 30_000,
    hookTimeout: 30_000,
  },
});
