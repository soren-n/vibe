# Vibe MCP

<div style="display: flex; flex-direction: column; align-items: center; text-align: center; margin: 20px 0;">
  <img src="images/icon.png" alt="Vibe Icon" width="256" height="256">
  <p style="margin-top: 16px; max-width: 256px;">A Model Context Protocol server that provides a persistent planning system and workflow guidance for AI agents.</p>
</div>

[![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=flat&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Node.js](https://img.shields.io/badge/Node.js-339933?style=flat&logo=node.js&logoColor=white)](https://nodejs.org/)
[![Test Coverage](https://img.shields.io/badge/coverage-99%25-brightgreen)](#test-coverage)
[![Quality](https://img.shields.io/badge/quality-A+-brightgreen)](#code-quality)

## Overview

Vibe is a **production-ready planning tool** designed for AI agents that provides:

### 🎯 **Core Features**

1. **🧠 Persistent Plan Management** - Nested todo list system that serves as long-term memory for agents
2. **📚 Workflow Guidance Library** - 58+ searchable workflows providing development best practices and inspiration
3. **🔌 MCP Integration** - Seamless integration with AI agents via Model Context Protocol
4. **⚡ High Performance** - 99%+ test coverage, pure ES modules, optimized architecture

### 🏗️ **Architecture**

Vibe uses a **plan-centric architecture** where everything revolves around persistent plans:

- **Plans persist automatically** to `~/.vibe/current-plan.json`
- **Nested task breakdown** with unlimited subtask depth
- **No sessions** - plans maintain state indefinitely
- **Workflow inspiration** - search and reference development best practices

## Quick Start

### Installation

Configure Vibe as an MCP server in VS Code by creating `.vscode/mcp.json` in your workspace:

```json
{
  "servers": {
    "vibe-mcp": {
      "type": "stdio",
      "command": "npx",
      "args": ["vibe-mcp@latest", "mcp-server"],
      "cwd": "${workspaceFolder}",
      "env": {}
    }
  }
}
```

**Note**: After creating this file, restart VS Code to enable the MCP integration.

### Basic Usage

Once configured, AI agents can use Vibe to:

- **Manage persistent plans**: Add, complete, and break down tasks into subtasks
- **Search workflow guidance**: Find relevant workflows for inspiration and best practices
- **Track progress**: Monitor completion status and maintain context across work periods
- **Plan dynamically**: Create nested todo lists that can be expanded to arbitrary detail

Vibe automatically detects project type and adapts its recommendations accordingly.

## 🛠️ MCP Tools Reference

### Plan Management Tools

| Tool                                   | Description                                  | Parameters                                                              |
| -------------------------------------- | -------------------------------------------- | ----------------------------------------------------------------------- |
| `get_plan_status()`                    | View current plan with completion statistics | None                                                                    |
| `add_plan_item(text, parent_id?)`      | Add new task or subtask                      | `text`: Task description<br>`parent_id?`: Parent task ID                |
| `add_plan_items(items)` **NEW**        | **Batch add multiple tasks efficiently**     | `items`: Array of `{text, parent_id?}` objects                          |
| `complete_plan_item(item_id)`          | Mark task as complete                        | `item_id`: Task ID to complete                                          |
| `expand_plan_item(item_id, sub_tasks)` | Break down task into subtasks                | `item_id`: Parent task ID<br>`sub_tasks`: Array of subtask descriptions |
| `clear_plan()`                         | Clear entire plan                            | None                                                                    |

### Workflow Guidance Tools

| Tool                                   | Description                          | Parameters                                                |
| -------------------------------------- | ------------------------------------ | --------------------------------------------------------- |
| `query_workflows(pattern?, category?)` | Search workflows by pattern/category | `pattern?`: Search text<br>`category?`: Workflow category |

### Environment & Quality Tools

| Tool                               | Description                  | Parameters                                              |
| ---------------------------------- | ---------------------------- | ------------------------------------------------------- |
| `check_vibe_environment()`         | Validate Vibe configuration  | None                                                    |
| `init_vibe_project(project_type?)` | Initialize project with Vibe | `project_type?`: Project type                           |
| `lint_project(fix?)`               | Run project quality checks   | `fix?`: Auto-fix issues                                 |
| `lint_text(content, content_type)` | Lint specific text content   | `content`: Text to lint<br>`content_type`: Content type |

## ⚡ Performance Features

### Batch Operations

**NEW in v1.6.0**: The `add_plan_items` tool provides significant performance improvements:

```javascript
// ❌ Old way - Multiple API calls, N disk writes
const task1 = await add_plan_item('Phase 1: Setup');
const task2 = await add_plan_item('Phase 2: Implementation');
const task3 = await add_plan_item('Phase 3: Testing');

// ✅ New way - Single API call, 1 disk write
const phases = await add_plan_items([
  { text: 'Phase 1: Setup' },
  { text: 'Phase 2: Implementation' },
  { text: 'Phase 3: Testing' },
]);
```

**Performance Benefits:**

- **90% fewer disk operations** for large task lists
- **Transactional integrity** - all items added or none
- **Mixed hierarchies** - root and child items in one call
- **Backward compatible** - existing `add_plan_item` still works

## 🏛️ Architecture Deep Dive

### Core Components

```
src/
├── plan.ts              # Core plan system (PlanManager, PlanItem classes)
├── workflow-registry.ts # Simple workflow search and reference
├── workflows.ts         # Workflow loading from YAML files
├── mcp-server.ts        # Main MCP server entry point
├── mcp-server/          # MCP protocol handlers
│   ├── plan-handlers.ts    # Plan management operations
│   ├── workflow-handlers.ts # Workflow search operations
│   ├── lint-handlers.ts    # Code quality operations
│   ├── environment-handlers.ts # Environment operations
│   └── query-handlers.ts   # Generic MCP queries
└── config/              # Configuration system
```

### Data Flow

1. **Plans** - Persist to `~/.vibe/current-plan.json`
2. **Workflows** - Loaded from `data/workflows/*.yaml`
3. **MCP** - Agents communicate via stdio protocol
4. **Configuration** - Auto-detects project type and adapts

### Key Design Principles

- **Persistent by default** - Plans survive across sessions
- **Guidance-only workflows** - Inspiration, not execution
- **Plan-centric** - Everything revolves around the active plan
- **Type-safe** - Full TypeScript coverage
- **Testable** - 99%+ test coverage

## 📚 Workflow Categories

Vibe includes **58 workflows** organized in these categories:

- **Core** (20 workflows) - Fundamental development practices
- **Development** (29 workflows) - Coding, testing, debugging
- **Documentation** (5 workflows) - Writing docs, guides, APIs
- **Testing** (2 workflows) - Unit testing, integration testing
- **Automation** (1 workflow) - CI/CD, deployment
- **Configuration** (1 workflow) - Project setup, tooling

## 🧪 Test Coverage

Vibe maintains **99%+ test coverage** across critical components:

| Module                 | Coverage  | Tests         |
| ---------------------- | --------- | ------------- |
| `plan.ts`              | 99.13%    | 43 tests      |
| `workflow-registry.ts` | 91.30%    | 31 tests      |
| `mcp-server.ts`        | 57.63%    | 25 tests      |
| **Overall**            | **61.8%** | **243 tests** |

### Test Categories

- **Unit Tests** - Individual component testing
- **Integration Tests** - MCP protocol compliance
- **End-to-End** - Full workflow testing
- **Error Handling** - Edge cases and failures
- **Performance** - Speed and memory testing

## 🔧 Development

### Prerequisites

- Node.js 18+
- TypeScript 4.9+
- npm or equivalent package manager

### Setup

```bash
# Clone the repository
git clone https://github.com/soren-n/vibe-mcp.git
cd vibe-mcp

# Install dependencies
npm install

# Run tests
npm test

# Run with coverage
npm run test:coverage

# Start development server
npm run dev
```

### Available Scripts

```bash
# Build and development
npm run build              # Full build with data copy
npm run build:fast         # Fast build without cleaning
npm run dev               # Development mode with tsx
npm run mcp-server        # Start MCP server

# Testing
npm test                  # Run tests
npm run test:watch        # Run tests in watch mode
npm run test:coverage     # Run tests with coverage

# Code quality
npm run lint              # Run ESLint
npm run lint:fix          # Fix linting issues
npm run format            # Format code with Prettier
npm run type-check        # TypeScript type checking
npm run quality           # Run all quality checks
npm run quality:fix       # Fix all automatically fixable issues

# Dependencies
npm run deps:check        # Check for unused dependencies
npm run deps:fix          # Remove unused dependencies
```

### Code Quality Standards

- **ESLint** - Code linting and style enforcement
- **Prettier** - Consistent code formatting
- **TypeScript** - Strict type checking enabled
- **Vitest** - Fast unit testing framework
- **99%+ Test Coverage** - Critical paths fully tested

## 🤝 Contributing

We welcome contributions! Please see our [Contributing Guide](CONTRIBUTING.md) for details.

### Quick Contribution Steps

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Make your changes
4. Add tests for new functionality
5. Ensure all tests pass (`npm run quality`)
6. Commit your changes (`git commit -m 'Add amazing feature'`)
7. Push to the branch (`git push origin feature/amazing-feature`)
8. Open a Pull Request

## 📋 Roadmap

### Completed ✅

- [x] Core plan management system
- [x] MCP server implementation
- [x] Workflow guidance library
- [x] 243 comprehensive tests
- [x] Pure ES modules migration
- [x] Batch plan operations (add_plan_items)
- [x] Lint and environment tools
- [x] Comprehensive documentation

### Upcoming 🚀

- [ ] Web UI for plan visualization
- [ ] Plan templates and sharing
- [ ] Advanced workflow filtering
- [ ] Integration with more editors
- [ ] Performance optimizations
- [ ] Plugin system

## 🐛 Troubleshooting

### Common Issues

**MCP Server Not Starting**

- Check Node.js version (18+ required)
- Verify `.vscode/mcp.json` configuration
- Restart VS Code after configuration changes

**Plans Not Persisting**

- Check file permissions in home directory
- Ensure `~/.vibe/` directory exists
- Review error logs in VS Code output

**Workflow Search Not Working**

- Verify workflow files in `data/workflows/`
- Check YAML syntax in workflow files
- Reload VS Code window

### Getting Help

- 📖 [Documentation](docs/)
- 🐛 [Issue Tracker](https://github.com/soren-n/vibe-mcp/issues)
- 💬 [Discussions](https://github.com/soren-n/vibe-mcp/discussions)

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- Model Context Protocol by Anthropic
- TypeScript community for excellent tooling
- Vitest for fast testing framework
- All contributors and users of Vibe

---

<div align="center">
  <strong>Built with ❤️ for AI agents and developers</strong>
</div>
