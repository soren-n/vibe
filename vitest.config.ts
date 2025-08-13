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
    // Externalize all dependencies to prevent bundling
    server: {
      deps: {
        external: [/.*\/node_modules\/.*/], // Force all node_modules to be external
        fallbackCJS: false, // Don't try to bundle ESM packages
      },
    },
  },
});
