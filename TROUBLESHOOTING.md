# Troubleshooting Guide

This document provides solutions for common issues encountered during development and CI/CD.

## Pipeline Fixes (August 2025)

### Issue: ES Module Resolution Errors

**Symptoms:**

- `ERR_MODULE_NOT_FOUND` errors in CI/CD pipelines
- Missing module errors: `Cannot find module '/dist/src/cli/core-commands'`
- Build succeeds but CLI commands fail to run

**Root Cause:**

- TypeScript compiled to ES modules but package.json missing `"type": "module"`
- Relative imports missing `.js` extensions required by ES modules

**Solution:**

1. Add ES module support to `package.json`:

   ```json
   {
     "type": "module"
   }
   ```

2. Update all relative imports in TypeScript files to include `.js` extensions:

   ```typescript
   // Before
   import { something } from './module';

   // After
   import { something } from './module.js';
   ```

**Files Fixed:**

- `package.json`: Added `"type": "module"`
- `src/cli/index.ts`: Updated 6 import statements
- `src/analyzer.ts`: Updated 3 import statements
- `src/workflows.ts`: Updated 1 import statement
- `src/workflow-registry.ts`: Updated 3 import statements
- `src/lint.ts`: Updated 1 import statement
- `src/cli/lint-commands.ts`: Updated 1 import statement
- `src/cli/workflow-commands.ts`: Updated 3 import statements
- `src/cli/generic-commands.ts`: Updated 2 import statements

### Issue: Flaky Timestamp Tests

**Symptoms:**

- Intermittent test failures with message: `expected 'timestamp' not to be 'timestamp'`
- Tests passing locally but failing in CI environment

**Root Cause:**

- Operations completing too quickly in CI, resulting in identical timestamps
- Insufficient timeout (1ms) for ensuring timestamp differences

**Solution:**
Increase timeout from 1ms to 10ms in timestamp-dependent tests:

```typescript
// Before
await new Promise(resolve => setTimeout(resolve, 1));

// After
await new Promise(resolve => setTimeout(resolve, 10));
```

**Files Fixed:**

- `tests/testPlan.test.ts`: Updated 3 timeout values (lines 203, 315, 357)

### Issue: Obsolete CLI Commands in Pipeline

**Symptoms:**

- Release pipeline failing with `error: unknown command 'checklists'`
- CI trying to run non-existent CLI commands

**Root Cause:**

- GitHub Actions workflow referencing removed/renamed CLI commands

**Solution:**
Update `.github/workflows/release.yml` to use valid CLI commands:

```yaml
# Before
node dist/src/cli.js checklists list --format json

# After
node dist/src/cli.js config-info
```

### Issue: Emoji Violations

**Symptoms:**

- Pre-commit hooks failing with emoji detection errors
- Code quality standards violations

**Root Cause:**

- Emojis present in source code files violating enterprise standards

**Solution:**

1. Remove all emojis from source code files
2. Replace emoji status indicators with text alternatives:

   ```typescript
   // Before
   const status = item.status === 'complete' ? '✅' : '⏳';

   // After
   const status = item.status === 'complete' ? '[X]' : '[ ]';
   ```

3. Update test assertions to match new output formats

### Issue: Husky Deprecation Warnings

**Symptoms:**

- Warning: `DEPRECATED - Please remove the following two lines from .husky/pre-commit`

**Root Cause:**

- Outdated husky configuration format

**Solution:**
Remove deprecated lines from `.husky/pre-commit`:

```bash
# Remove these lines:
#!/usr/bin/env sh
. "$(dirname -- "$0")/_/husky.sh"
```

### Issue: ESLint Complexity Warnings

**Symptoms:**

- ESLint warnings about function complexity and line count

**Root Cause:**

- Legitimate complex functions for configuration loading and MCP tool setup

**Solution:**
Add ESLint disable comments for justified complexity:

```typescript
// eslint-disable-next-line complexity
export async function loadFromFile() { ... }

// eslint-disable-next-line max-lines-per-function
private setupTools(): void { ... }
```

## Verification Steps

After applying fixes, verify with:

```bash
# Clean build
npm run clean && npm run build

# Run all quality checks
npm run quality

# Test CLI functionality
npm run cli -- --help
npm run cli -- config-info
npm run cli -- list-workflows

# Run tests multiple times to check stability
npm test && npm test
```

## Prevention

To prevent similar issues:

1. **Always test ES module compatibility** when adding new imports
2. **Use adequate timeouts** (≥10ms) for timestamp-dependent tests
3. **Keep pipeline configurations updated** when CLI commands change
4. **Follow emoji-free coding standards** for enterprise compliance
5. **Update husky configuration** when upgrading versions
6. **Use ESLint exceptions judiciously** only for legitimate complexity

## Pipeline Status

- ✅ **CI Pipeline**: Fully operational and stable
- ❌ **Release Pipeline**: Core functionality works, semantic release configuration needs attention
- ✅ **All Tests**: 243 tests passing consistently
- ✅ **Code Quality**: All linting, formatting, and type checking passes
