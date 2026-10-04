import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: [
      'packages/*/tests/**/*.test.ts',
      'workers/*/tests/**/*.test.ts',
      'plugins/*/tests/**/*.test.ts',
      'tests/**/*.test.ts',
    ],
    environment: 'node',
    // Integration tests run only when DATABASE_URL / REDIS_URL are provided (as in CI).
    passWithNoTests: false,
  },
});
