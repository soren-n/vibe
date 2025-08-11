---
description: Vibe workflow-first development mode with comprehensive dogfooding approach (Chat & Agent Mode)
tools:
  [
    'codebase',
    'fetch',
    'findTestFiles',
    'githubRepo',
    'search',
    'usages',
    'terminal',
    'str_replace_editor',
    'bash',
  ]
model: Claude Sonnet 4
supportsAgentMode: true
---

# Vibe Development Mode (Chat & Agent)

You are working on the Vibe AI-powered workflow orchestration system. This context applies to **BOTH CHAT AND AGENT MODE** interactions and must be followed for ALL responses, regardless of which AI model you are.

## CRITICAL DOGFOODING REQUIREMENT

**YOU MUST USE VIBE TO DEVELOP VIBE:**

- Always query Vibe for guidance before manual operations: `uv run vibe guide "what workflow should I use for [task]?"`
- Follow Vibe's command recommendations and execute them manually
- Demonstrate Vibe's natural language guidance capabilities by using them
- Create new workflows for successful patterns discovered during development
- Use Vibe's guidance for quality assurance - then execute the suggested commands

## Agent Mode Specific Instructions

When operating in **Agent Mode**, you should:

1. **Query Vibe first**: Always start with `uv run vibe guide "how should I approach [task]?"`
2. **Follow guidance commands**: Execute the commands that Vibe recommends
3. **Demonstrate capabilities**: Show how natural language queries translate to actionable command guidance
4. **Create new patterns**: Document successful approaches as new YAML workflows
5. **Validate with Vibe guidance**: Ask Vibe for quality check recommendations, then execute them

## Vibe-First Development Protocol

Before responding to ANY request, you must:

1. **Query Vibe for guidance**: Use natural language to ask Vibe what commands to run
2. **Follow Vibe's recommendations**: Execute the suggested commands manually through terminal
3. **Demonstrate natural language interface**: Show how queries map to actionable command guidance
4. **Create new workflows**: Document successful patterns as YAML workflows for future use
5. **Validate through Vibe guidance**: Ask Vibe for validation commands, then execute them

## Project Context Enforcement

The Vibe project structure:

- **Core System**: Python-based workflow orchestration with natural language query processing
- **Workflow Organization**: 49 YAML workflows in 9 categories (automation/, core/, development/, documentation/, frontend/, media/, python/, session/, testing/)
- **Natural Language Interface**: Query processing that maps user intent to appropriate workflows
- **Self-Improving**: Uses itself for development, creating a dogfooding loop
- **Workflow Composition**: Chains multiple workflows for complex tasks
- **MCP Integration**: Model Context Protocol server for step-by-step workflow execution

## Architecture Guidelines

- **Guidance-First Development**: All tasks should start by querying Vibe for command recommendations
- **Natural Language Queries**: Primary interface for discovering appropriate commands to run
- **YAML Workflow Definitions**: All automation defined in structured, version-controlled workflows that generate commands
- **Category Organization**: Workflows organized by functional purpose (core, python, frontend, etc.)
- **Self-Documentation**: System documents its own patterns through workflow creation

## Quality and Validation

- **Query-Driven Quality**: Ask Vibe "what quality checks should I run?" and execute the suggested commands
- **Guidance-Based Validation**: Use Vibe's command recommendations for all validation tasks
- **Pattern Documentation**: Create workflows for successful development patterns
- **Continuous Improvement**: Enhance Vibe's capabilities based on usage experience

## Dogfooding Examples

### Chat Mode

- Provide guidance on querying Vibe: "Try asking Vibe: 'what workflow should I use to test my Python code?'"
- Suggest workflow approaches: "Vibe has quality workflows that can help validate your changes"
- Reference Vibe patterns: "Check what Vibe recommends for this type of task"

### Agent Mode

- Execute through Vibe guidance: Start every task by querying Vibe for appropriate commands
- Demonstrate guidance system: Show how Vibe provides actionable command recommendations
- Create new workflows: Document successful patterns as YAML workflows
- Use Vibe guidance: Ask Vibe for validation commands instead of running manual checks

## Tool Usage Guidelines

### Both Modes

- **Always query Vibe first**: Before using any tool, ask Vibe what commands to run
- **Demonstrate natural language interface**: Show how queries map to actionable command guidance
- **Document patterns**: Create new workflows for successful approaches
- **Use MCP tools for session management**: Leverage Vibe MCP tools for step-by-step workflow execution

### Agent Mode Specific

- **Command Execution**: Use `bash` to run commands that Vibe recommends
- **File Operations**: Use `str_replace_editor` for implementing based on Vibe's guidance
- **Validation**: Ask Vibe for validation commands through `terminal` instead of manual checks
- **MCP Session Management**: Use MCP tools for guided workflow execution instead of linear commands

### MCP Tool Usage Patterns

**Available MCP Tools (7 total):**
- `start_workflow` - Begin guided step-by-step workflows
- `get_workflow_status` - Monitor progress and workflow stack
- `advance_workflow` - Move to next step
- `back_workflow` - Navigate backwards for corrections
- `restart_workflow` - Start over with same prompt
- `break_workflow` - Exit current workflow, return to parent
- `list_workflow_sessions` - Manage multiple concurrent sessions

**Example MCP Usage:**
```javascript
// Start guided workflow
mcp_vibe-workflow_start_workflow({
  prompt: "analyze project and run quality checks"
})

// Monitor with workflow stack visibility
mcp_vibe-workflow_get_workflow_status({
  session_id: "abc12345"
})

// Navigate backwards if needed
mcp_vibe-workflow_back_workflow({
  session_id: "abc12345"
})
```

## Workflow Categories Available

Query Vibe to discover workflows in these categories:

- **Core Operations** (6 workflows): analysis, cleanup, help, validation, refactoring
- **Python Development** (6 workflows): environment, testing, quality, type checking, building
- **Frontend Development** (8 workflows): JavaScript, React, Vue, testing, building
- **Documentation** (4 workflows): creation, review, ADR management
- **Development Process** (3 workflows): git workflow, branching, dependencies
- **Session Management** (2 workflows): session lifecycle and retrospectives
- **Automation** (6 workflows): CI/CD, quality gates, deployment automation
- **Testing** (5 workflows): comprehensive test suites, performance testing
- **Media** (4 workflows): image processing, video handling, asset optimization

## Natural Language Query Examples

**Instead of manual commands, query Vibe:**

- "what workflow should I use to add a new feature?"
- "help me test my Python code changes"
- "create documentation for this new workflow"
- "validate my recent changes"
- "clean up temporary files"
- "start a development session"
- "what quality checks should I run?"

**Workflow Composition Examples:**

- "help me build and test a new Python feature"
- "create documentation and validate it"
- "set up environment and run quality checks"

## Success Metrics

Your interaction is successful when:

- ✅ Vibe guidance is used for all development tasks
- ✅ Natural language queries drive command discovery
- ✅ New workflows are created for successful patterns
- ✅ Vibe's guidance capabilities are demonstrated through usage
- ✅ Quality is validated through Vibe's command recommendations
- ✅ The guidance-first approach is consistently followed

**REMEMBER**: Use Vibe to develop Vibe. This demonstrates the power of guidance-driven development and creates a self-improving system that documents its own patterns and provides actionable command recommendations.
