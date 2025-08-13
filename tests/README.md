# Test Fixture System Documentation

## Overview

The Vibe project uses a comprehensive test fixture system built on Vitest's `test.extend()` functionality to ensure proper cleanup and isolation between tests.

## Core Components

### 1. Fixtures (`tests/utils/fixtures.ts`)

The main fixture system provides:

- `tempDir`: Automatic temporary directory creation and cleanup
- `tempFile`: Helper for creating temporary files within the temp directory
- `configTest`: Specialized fixture for configuration testing with Vibe-specific utilities
- `createMockFileStructure`: Utility for creating complex directory structures

### 2. Test Helpers (`tests/utils/testHelpers.ts`)

Additional utilities for common testing patterns:

- `TestFileManager`: Explicit file/directory management with cleanup tracking
- `ProcessMocker`: Mock process.cwd(), environment variables with automatic restoration
- `AsyncTestUtils`: Utilities for async testing (waitFor, controllable promises)
- `TestDataBuilder`: Factory methods for creating valid test data
- `ErrorSimulator`: Tools for testing error scenarios and flaky conditions
- `PerformanceTestUtils`: Performance measurement and assertion utilities

## Usage Examples

### Basic Temporary Directory Usage

```typescript
import { test, expect } from 'vitest';
import { vibeTest } from './utils/fixtures';

vibeTest('should create files in temp directory', ({ tempDir, tempFile }) => {
  // tempDir is automatically created and will be cleaned up
  const configPath = tempFile('vibe.config.yaml', 'project_type: typescript');

  expect(fs.existsSync(configPath)).toBe(true);
  // No manual cleanup needed - handled automatically
});
```

### Configuration Testing

```typescript
import { configTest } from './utils/fixtures';

configTest(
  'should load valid configuration',
  ({ tempDir, createConfigFile, loadConfig }) => {
    const configPath = createConfigFile({
      project_type: 'typescript',
      workflows: { test: { name: 'test', steps: [] } },
    });

    const config = loadConfig(configPath);
    expect(config.project_type).toBe('typescript');
  }
);
```

### Complex File Structure Creation

```typescript
vibeTest('should handle project structure', ({ tempDir, createMockFileStructure }) => {
  createMockFileStructure(tempDir, {
    'package.json': '{"name": "test"}',
    src: {
      'index.ts': 'export default {};',
      utils: {
        'helper.ts': 'export const helper = () => {};',
      },
    },
  });

  expect(fs.existsSync(path.join(tempDir, 'src', 'utils', 'helper.ts'))).toBe(true);
});
```

### Using Test Helpers

```typescript
import { TestFileManager, ProcessMocker } from './utils/testHelpers';

test('should handle process mocking', () => {
  const processMocker = new ProcessMocker();

  processMocker.mockCwd('/fake/directory');
  processMocker.mockEnv({ NODE_ENV: 'test' });

  // Your test code here

  processMocker.restore(); // Cleanup mocks
});
```

## Migration Guide

### From Manual Cleanup Patterns

Before:

```typescript
test('old pattern', () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'test-'));
  });

  afterEach(() => {
    if (tempDir && fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  // Test code using tempDir
});
```

After:

```typescript
vibeTest('new pattern', ({ tempDir }) => {
  // Test code using tempDir - cleanup automatic
});
```

### From Silent Error Handling

Before:

```typescript
afterEach(() => {
  try {
    fs.rmSync(tempDir, { recursive: true });
  } catch {
    // Silent failure
  }
});
```

After:

```typescript
// Fixtures handle errors appropriately with proper logging
// No manual cleanup needed
```

## Best Practices

1. Use Fixtures for All File Operations: Always prefer fixtures over manual file creation
2. Leverage Specialized Fixtures: Use `configTest` for configuration-related tests
3. Combine Utilities: Use `TestFileManager` when you need explicit control over cleanup
4. Mock Properly: Use `ProcessMocker` for environment and process state changes
5. Test Error Scenarios: Use `ErrorSimulator` to test error handling
6. Performance Testing: Use `PerformanceTestUtils` for timing-sensitive tests

## Configuration

The `vitest.config.ts` has been updated with enhanced cleanup settings:

```typescript
export default defineConfig({
  test: {
    clearMocks: true, // Clear mocks between tests
    restoreMocks: true, // Restore original implementations
    unstubEnvs: true, // Restore environment variables
    testTimeout: 10000, // Reasonable timeout for integration tests
    sequence: {
      hooks: 'list', // Ensure proper hook execution order
    },
  },
});
```

## Troubleshooting

### Common Issues

1. Fixture not available: Ensure you're importing from the correct fixture file
2. Cleanup not working: Check that you're using the fixture system, not manual patterns
3. TypeScript errors: Ensure proper typing when extending fixtures
4. Mock restoration issues: Use `ProcessMocker` or ensure `restoreMocks: true` in config

### Debugging

- Enable verbose logging in tests to see fixture lifecycle
- Use `TestFileManager.getCreatedPaths()` to debug file creation
- Check `performance.now()` measurements for timing issues

## Testing the Test System

Run the test suite with:

```bash
npm test
```

For coverage:

```bash
npm run test:coverage
```

The fixture system itself is tested through integration tests that verify:

- Proper cleanup after test completion
- Isolation between tests
- Error handling in cleanup scenarios
- Performance characteristics
