import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['tests/**/*.test.ts'],
    // Improved cleanup configuration
    clearMocks: true, // Clear mock call history before each test
    restoreMocks: true, // Restore original implementations after each test
    unstubEnvs: true, // Restore environment variables after each test
    isolate: true, // Ensure test isolation (default, but explicit)
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: ['node_modules/', 'dist/', 'coverage/', 'tests/', '**/*.d.ts'],
    },
    typecheck: {
      enabled: true,
    },
    // Add GitHub Actions reporter when in CI
    reporters: process.env['GITHUB_ACTIONS'] ? ['dot', 'github-actions'] : ['default'],
    // Increase timeout for tests that involve file operations
    testTimeout: 10000,
    // Configure test sequencing to avoid conflicts
    sequence: {
      hooks: 'list', // Run hooks in FIFO order for predictable cleanup
    },
    // Use Node.js module resolution - avoid Vite/Rollup bundling
    pool: 'forks',
    poolOptions: {
      forks: {
        singleFork: true,
      },
    },
  },
});
