# Contributing to Vibe MCP

Thank you for your interest in contributing to Vibe! This guide will help you get started with contributing to the project.

## Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Getting Started](#getting-started)
- [Development Setup](#development-setup)
- [Project Structure](#project-structure)
- [Development Workflow](#development-workflow)
- [Testing Guidelines](#testing-guidelines)
- [Code Style](#code-style)
- [Documentation](#documentation)
- [Submitting Changes](#submitting-changes)
- [Release Process](#release-process)

## Code of Conduct

By participating in this project, you agree to abide by our Code of Conduct. Please treat all community members with respect and create a welcoming environment for everyone.

## Getting Started

### Prerequisites

- **Node.js 18+** - Required for running the project
- **TypeScript 4.9+** - For type checking and compilation
- **Git** - For version control
- **VS Code** (recommended) - For the best development experience

### Quick Start

```bash
# Fork the repository on GitHub
# Clone your fork
git clone https://github.com/YOUR-USERNAME/vibe-mcp.git
cd vibe-mcp

# Install dependencies
npm install

# Run tests to verify setup
npm test

# Start development mode
npm run dev
```

## Development Setup

### Environment Configuration

1. **Install Dependencies**

   ```bash
   npm install
   ```

2. **Configure VS Code** (recommended)

   ```bash
   # Install recommended extensions
   code --install-extension esbenp.prettier-vscode
   code --install-extension bradlc.vscode-tailwindcss
   code --install-extension ms-vscode.vscode-typescript-next
   ```

3. **Verify Setup**
   ```bash
   npm run quality
   ```

### Available Scripts

```bash
# Development
npm run dev               # Start development server
npm run build            # Full production build
npm run build:fast       # Fast build for development

# Testing
npm test                 # Run all tests
npm run test:watch       # Run tests in watch mode
npm run test:coverage    # Run tests with coverage report

# Code Quality
npm run lint             # Check code style
npm run lint:fix         # Fix linting issues
npm run format           # Format code with Prettier
npm run type-check       # TypeScript type checking
npm run quality          # Run all quality checks
npm run quality:fix      # Fix all issues automatically

# Dependencies
npm run deps:check       # Check for unused dependencies
npm run deps:fix         # Remove unused dependencies
```

## Project Structure

```
vibe-mcp/
├── src/                      # Source code
│   ├── plan.ts              # Core plan management system
│   ├── workflow-registry.ts # Workflow search and reference
│   ├── mcp-server.ts        # MCP server implementation
│   ├── mcp-server/          # MCP protocol handlers
│   │   ├── plan-handlers.ts
│   │   ├── workflow-handlers.ts
│   │   ├── lint-handlers.ts
│   │   └── environment-handlers.ts
│   ├── config/              # Configuration system
│   ├── cli/                 # Command-line interface
│   └── lint/                # Code quality tools
├── tests/                   # Test files
│   ├── testPlan.test.ts
│   ├── testMcpServer.test.ts
│   └── testWorkflowRegistry.test.ts
├── data/                    # Static data
│   └── workflows/           # YAML workflow definitions
├── docs/                    # Documentation
│   ├── API.md
│   └── ARCHITECTURE.md
└── dist/                    # Built output (generated)
```

### Key Files

- **`src/plan.ts`** - Core plan management logic
- **`src/mcp-server.ts`** - MCP protocol implementation
- **`src/workflow-registry.ts`** - Workflow search system
- **`tests/`** - Comprehensive test suite (234 tests)
- **`data/workflows/`** - YAML workflow definitions (58 workflows)

## Development Workflow

### 1. Choose an Issue

- Check the [issue tracker](https://github.com/your-username/vibe-mcp/issues) for open issues
- Look for issues labeled `good first issue` for newcomers
- Comment on the issue to let others know you're working on it

### 2. Create a Feature Branch

```bash
# Create and switch to a new branch
git checkout -b feature/your-feature-name

# Or for bug fixes
git checkout -b fix/issue-description
```

### 3. Development Process

1. **Make your changes**
   - Follow the existing code patterns
   - Add tests for new functionality
   - Update documentation as needed

2. **Test thoroughly**

   ```bash
   npm run test
   npm run test:coverage
   ```

3. **Check code quality**

   ```bash
   npm run quality
   ```

4. **Commit your changes**
   ```bash
   git add .
   git commit -m "feat: add amazing new feature"
   ```

### 4. Keep Your Branch Updated

```bash
# Fetch latest changes from upstream
git fetch upstream
git rebase upstream/main
```

## Testing Guidelines

Vibe maintains **99%+ test coverage** on critical components. All contributions must include appropriate tests.

### Test Structure

```
tests/
├── testPlan.test.ts         # Plan system tests (43 tests)
├── testMcpServer.test.ts    # MCP server tests (25 tests)
├── testWorkflowRegistry.test.ts # Workflow registry tests (31 tests)
├── testBasic.test.ts        # Basic functionality tests
└── testErrorHandling.test.ts # Error handling tests
```

### Writing Tests

1. **Unit Tests** - Test individual functions/classes in isolation
2. **Integration Tests** - Test component interactions
3. **End-to-End Tests** - Test full workflows

#### Example Test Structure

```typescript
describe('PlanManager', () => {
  let tempDir: string;
  let manager: PlanManager;

  beforeEach(async () => {
    // Setup test environment
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'vibe-test-'));
    manager = new PlanManager(path.join(tempDir, 'test-plan.json'));
  });

  afterEach(async () => {
    // Clean up
    await fs.rm(tempDir, { recursive: true, force: true });
  });

  test('adds plan item successfully', async () => {
    const item = await manager.addItem('Test task');

    expect(item.text).toBe('Test task');
    expect(item.status).toBe('pending');
    expect(item.id).toBeDefined();
  });
});
```

### Test Requirements

- **Coverage**: New code must maintain 90%+ test coverage
- **Isolation**: Tests must not depend on external resources
- **Cleanup**: Tests must clean up after themselves
- **Descriptive**: Test names should clearly describe what's being tested

### Running Tests

```bash
# Run all tests
npm test

# Run tests with coverage
npm run test:coverage

# Run tests in watch mode
npm run test:watch

# Run specific test file
npm test tests/testPlan.test.ts
```

## Code Style

We use ESLint and Prettier to maintain consistent code style.

### TypeScript Guidelines

```typescript
// Use explicit types for public APIs
export interface PlanItem {
  id: string;
  text: string;
  status: 'pending' | 'complete';
}

// Use async/await instead of promises
async function loadPlan(): Promise<Plan> {
  const data = await fs.readFile(this.planFile, 'utf-8');
  return JSON.parse(data);
}

// Use descriptive variable names
const completedItems = plan.items.filter(item => item.status === 'complete');

// Error handling with proper types
try {
  await savePlan(plan);
} catch (error) {
  throw new Error(
    `Failed to save plan: ${error instanceof Error ? error.message : String(error)}`
  );
}
```

### Naming Conventions

- **Files**: `kebab-case.ts` (e.g., `plan-manager.ts`)
- **Classes**: `PascalCase` (e.g., `PlanManager`)
- **Functions**: `camelCase` (e.g., `addPlanItem`)
- **Constants**: `SCREAMING_SNAKE_CASE` (e.g., `MAX_PLAN_ITEMS`)
- **Interfaces**: `PascalCase` with descriptive names (e.g., `PlanItem`)

### Import Organization

```typescript
// External imports first
import * as fs from 'fs/promises';
import * as path from 'path';

// Internal imports second
import { PlanManager } from './plan.js';
import { WorkflowRegistry } from './workflow-registry.js';
import type { Plan, PlanItem } from './models.js';
```

## Documentation

### API Documentation

All public APIs must be documented with JSDoc:

```typescript
/**
 * Adds a new item to the plan
 * @param text - The task description
 * @param parentId - Optional parent task ID for creating subtasks
 * @returns Promise resolving to the created plan item
 * @throws {Error} When parent item is not found
 */
async addItem(text: string, parentId?: string): Promise<PlanItem> {
  // Implementation
}
```

### Workflow Documentation

New workflows should include:

- Clear description
- Appropriate triggers
- Step-by-step guidance
- Category assignment

```yaml
name: new-feature-workflow
description: Guidance for implementing new features
category: development
triggers:
  - implement feature
  - new functionality
  - add capability
steps:
  - Define requirements and acceptance criteria
  - Design component architecture
  - Implement core functionality
  - Add comprehensive tests
  - Update documentation
```

### README Updates

Update README.md for:

- New features or capabilities
- Changed installation instructions
- Updated usage examples
- Modified configuration options

## Submitting Changes

### Pull Request Process

1. **Prepare Your PR**

   ```bash
   # Make sure your branch is up to date
   git fetch upstream
   git rebase upstream/main

   # Run quality checks
   npm run quality

   # Push your branch
   git push origin feature/your-feature-name
   ```

2. **Create Pull Request**
   - Use descriptive title following [Conventional Commits](https://www.conventionalcommits.org/)
   - Fill out the PR template completely
   - Link related issues
   - Add screenshots for UI changes

3. **PR Title Format**
   ```
   feat: add workflow template system
   fix: resolve plan persistence issue
   docs: update API documentation
   test: add coverage for workflow search
   refactor: simplify plan item creation
   ```

### PR Template

```markdown
## Description

Brief description of changes made.

## Type of Change

- [ ] Bug fix
- [ ] New feature
- [ ] Breaking change
- [ ] Documentation update

## Testing

- [ ] Unit tests pass
- [ ] Integration tests pass
- [ ] Coverage maintained/improved
- [ ] Manual testing completed

## Checklist

- [ ] Code follows style guidelines
- [ ] Self-review completed
- [ ] Documentation updated
- [ ] Tests added for new functionality
```

### Review Process

1. **Automated Checks**
   - All tests must pass
   - Linting must pass
   - Type checking must pass
   - Coverage must be maintained

2. **Manual Review**
   - Code quality and style
   - Test adequacy
   - Documentation completeness
   - Architecture consistency

3. **Approval and Merge**
   - Requires approval from maintainers
   - Squash merge preferred
   - Delete branch after merge

## Release Process

### Version Numbering

We follow [Semantic Versioning](https://semver.org/):

- **MAJOR** (1.0.0) - Breaking changes
- **MINOR** (0.1.0) - New features (backward compatible)
- **PATCH** (0.0.1) - Bug fixes (backward compatible)

### Release Checklist

1. **Pre-release**
   - [ ] All tests passing
   - [ ] Documentation updated
   - [ ] CHANGELOG.md updated
   - [ ] Version bumped in package.json

2. **Release**
   - [ ] Create release branch
   - [ ] Final testing
   - [ ] Create GitHub release
   - [ ] Publish to npm

3. **Post-release**
   - [ ] Update documentation site
   - [ ] Announce in community channels
   - [ ] Close related issues

## Getting Help

### Community Resources

- 📖 **Documentation**: [docs/](docs/)
- 🐛 **Issues**: [GitHub Issues](https://github.com/your-username/vibe-mcp/issues)
- 💬 **Discussions**: [GitHub Discussions](https://github.com/your-username/vibe-mcp/discussions)

### Maintainer Contact

For urgent issues or questions:

- Create an issue with the `question` label
- Tag maintainers in discussions
- Follow up on existing PRs/issues

### Development Tips

1. **Use TypeScript strict mode** - Catches issues early
2. **Write tests first** - TDD approach works well
3. **Small, focused PRs** - Easier to review and merge
4. **Ask questions early** - Better to clarify requirements upfront
5. **Follow existing patterns** - Consistency is key

## Recognition

Contributors are recognized in:

- README.md acknowledgments
- Release notes
- GitHub contributors graph
- Special mentions for significant contributions

Thank you for contributing to Vibe MCP! Your efforts help make this tool better for the entire community of AI agents and developers.
