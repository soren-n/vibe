# Vibe Project - AI Agent Collaboration Guide

## CRITICAL: Self-Dogfooding Development Approach

**MANDATORY FOR ALL AI AGENTS**: This project leverages "eating our own dog food" - using Vibe to develop Vibe itself. This means ALL AI interactions should utilize the Vibe workflow system as the primary development interface.

### Required Vibe-First Development

**🔄 When uncertain about ANY development task:**

1. **Always use Vibe guidance first**: Query the guidance system with natural language
2. **Get command recommendations**: Let Vibe suggest the appropriate commands and tools
3. **Execute recommended commands**: Use Vibe's guidance instead of manual command discovery

**🎯 For ALL development operations:**

1. **Use Vibe guidance**: Instead of manual Python commands, use Vibe queries for recommendations
2. **Leverage command guidance**: Let Vibe determine the right tools and command sequence
3. **Follow Vibe patterns**: Use the established workflow architecture for new features

**💡 For complex problem-solving:**

1. **Query Vibe first**: Ask "what commands should I run for X?"
2. **Follow command guidance**: Let Vibe break down complex tasks into executable commands
3. **Validate with Vibe guidance**: Use Vibe's recommended validation commands before implementation

### Vibe-Enhanced Development Flow

Instead of traditional approaches, use:

- ✅ Query Vibe for command guidance and recommendations
- ✅ Use Vibe's suggested commands and follow the guidance
- ✅ Follow Vibe's recommended development patterns
- ❌ Manual command execution without consulting Vibe first
- ❌ Bypassing the guidance system for development tasks

## Project Overview

Vibe is an AI-powered workflow orchestration system that bridges natural language queries with automated development workflows. The system provides intelligent routing between different workflow types (Python, JavaScript, documentation, deployment) and maintains a comprehensive knowledge base of development patterns.

**Development Context**: This is a self-improving system where Vibe is used to develop itself. All processes, documentation, and workflows should demonstrate the power and utility of the Vibe system through dogfooding.

**Automation Philosophy**: Vibe follows a **guidance-first development approach** where natural language queries are translated into actionable command recommendations. AI agents should demonstrate this approach by using Vibe guidance for all development tasks.

## AI Agent Context Summary

**Architecture Patterns:**

- Python-based core with modular workflow system
- YAML-defined workflows organized by category (automation/, core/, development/, documentation/, frontend/, media/, python/, session/, test/, testing/)
- Natural language query processing with intelligent workflow routing
- Composable workflow system with dependency management
- Self-documenting workflow architecture
- MCP (Model Context Protocol) server for step-by-step workflow execution

**Code Organization:**

- `vibe/` - Core Python package
- `vibe/workflows/` - Workflow system and definitions
- `vibe/workflows/data/` - Organized YAML workflow definitions (49 workflows across 10 categories)
- `vibe/agents/` - AI agent configurations and chat modes
- `vibe/analyzer.py` - Natural language query analysis
- `vibe/session.py` - Session-based workflow execution with MCP support
- `mcp-server/` - Model Context Protocol server for AI agent integration
- `docs/` - Project documentation and examples

**Quality Patterns:**

- Guidance-driven development (use Vibe to develop Vibe)
- YAML-defined workflows for consistency and version control
- Comprehensive workflow organization by functional category
- Natural language interface for all development operations
- Self-validating through recommended command sequences

**Error Prevention:**

- Always query Vibe guidance before manual operations
- Use Vibe's recommended validation commands for quality assurance
- Follow established workflow patterns from similar tasks
- Document new patterns as YAML workflows
- Test command execution before implementation

### Vibe Workflow Integration

**All development activities must leverage Vibe workflows:**

- **Core Operations**: Use `vibe/workflows/data/core/` workflows for analysis, cleanup, help
- **Python Development**: Use `vibe/workflows/data/python/` workflows for env, testing, quality
- **Documentation**: Use `vibe/workflows/data/documentation/` workflows for docs creation and maintenance
- **Session Management**: Use `vibe/workflows/data/session/` workflows for development sessions
- **Development Process**: Use `vibe/workflows/data/development/` workflows for git, dependencies, branching

### MCP Tool Integration

**MANDATORY**: All AI agents must leverage Vibe MCP tools for session-based workflow execution:

#### Available MCP Tools (7 total):
1. **start_workflow** - Begin new step-by-step workflow sessions from natural language prompts
2. **get_workflow_status** - Check current session progress, workflow stack, and step details
3. **advance_workflow** - Move to next step in current workflow
4. **back_workflow** - Navigate back to previous step (error correction/retry)
5. **restart_workflow** - Restart entire session from beginning with same prompt
6. **break_workflow** - Exit current workflow, return to parent workflow
7. **list_workflow_sessions** - View all active sessions for management

#### MCP-Enhanced Development Patterns:
- **Session-Based Execution**: Use MCP tools instead of linear command execution
- **Workflow Stack Management**: Leverage nested workflow visibility for complex tasks
- **Error Recovery**: Use `back_workflow` and `restart_workflow` for corrections
- **Multi-Session Management**: Handle concurrent workflows via `list_workflow_sessions`
- **Step-by-Step Guidance**: Use `get_workflow_status` to understand current context

#### MCP Usage Examples:
```javascript
// Start guided workflow
mcp_vibe-workflow_start_workflow({
  prompt: "analyze project and run quality checks",
  project_type: "python"
})

// Monitor progress and workflow stack
mcp_vibe-workflow_get_workflow_status({
  session_id: "abc12345"
})

// Navigate backwards if needed
mcp_vibe-workflow_back_workflow({
  session_id: "abc12345"
})

// Restart if major correction needed
mcp_vibe-workflow_restart_workflow({
  session_id: "abc12345"
})
```

## Technology Stack

- **Core**: Python 3.x with Rich for beautiful terminal output
- **Workflow Engine**: YAML-based workflow definitions with Python execution
- **Query Processing**: Natural language analysis with intelligent workflow routing
- **Package Management**: pip/poetry for dependency management
- **Configuration**: YAML-based configuration with environment variable support
- **AI Integration**: Agent configurations for various AI development scenarios
- **Documentation**: Markdown-based with examples and tutorials

## Repository Structure

```
/
├── .github/                    # GitHub configuration
│   ├── copilot-instructions.md # This file
│   └── chatmodes/             # VSCode Copilot chat modes
├── vibe/                      # Core Python package
│   ├── __init__.py           # Package initialization
│   ├── analyzer.py           # Query analysis and routing
│   ├── agents/               # AI agent configurations
│   └── workflows/            # Workflow system
│       ├── __init__.py       # Workflow loading
│       ├── loader.py         # YAML workflow loader
│       ├── models.py         # Workflow data models
│       └── data/             # Organized workflow definitions (49 workflows across 10 categories)
│           ├── core/         # Core project operations (6 workflows)
│           ├── session/      # Session management (2 workflows)
│           ├── documentation/ # Documentation workflows (4 workflows)
│           ├── development/  # Development process (3 workflows)
│           ├── python/       # Python-specific (6 workflows)
│           ├── frontend/     # Frontend/JavaScript (8 workflows)
│           ├── automation/   # CI/CD and automation (6 workflows)
│           ├── testing/      # Test suites and validation (5 workflows)
│           └── media/        # Media processing (4 workflows)
├── mcp-server/               # Model Context Protocol server
├── docs/                     # Project documentation
├── README.md                 # Project overview and quick start
├── pyproject.toml           # Python project configuration
└── main.py                  # CLI entry point
```

## Development Workflow Commands

### Prerequisites

- Install Python 3.x
- Install dependencies: `pip install -r requirements.txt` or `poetry install`

### Vibe-First Development Workflow

1. **Query Vibe for guidance**: `uv run vibe guide "what workflow should I use for [task]?"`
2. **Execute suggested commands**: Follow Vibe's recommendations manually
3. **Validate with Vibe**: Use Vibe's quality assurance command recommendations
4. **Document new patterns**: Add new workflows to appropriate categories

### Direct Workflow Execution

**Always consult Vibe first, but direct workflow access is available:**

#### Core Operations

- **Project Analysis**: Query Vibe: "analyze this project"
- **Quality Checks**: Query Vibe: "run quality checks"
- **Cleanup**: Query Vibe: "clean up temporary files"
- **Help**: Query Vibe: "what can you help me with?"

#### Python Development

- **Environment Setup**: Query Vibe: "set up Python environment"
- **Testing**: Query Vibe: "run Python tests"
- **Quality**: Query Vibe: "check Python code quality"
- **Type Checking**: Query Vibe: "run Python type checking"

#### Documentation

- **Create Docs**: Query Vibe: "create documentation for X"
- **Review Docs**: Query Vibe: "review documentation quality"
- **ADR Management**: Query Vibe: "create architectural decision record"

#### Session Management

- **Start Session**: Query Vibe: "start development session"
- **Session Retrospective**: Query Vibe: "complete development session"

#### Development Process

- **Git Workflow**: Query Vibe: "help with git workflow"
- **Branch Strategy**: Query Vibe: "what branching strategy should I use?"
- **Dependency Updates**: Query Vibe: "update project dependencies"

### Important Notes

- **Always use Vibe first** - demonstrate the power of the system by using it
- **Natural language queries** are the primary interface
- **Workflow composition** - Vibe can chain multiple workflows together
- **Self-improvement** - New patterns should be documented as workflows

## Core Architecture

### Workflow System

The application implements a comprehensive workflow orchestration system:

- **WorkflowLoader**: Loads YAML workflow definitions from organized categories
- **Analyzer**: Natural language query processing and workflow routing
- **Models**: Type-safe workflow definitions with dependencies and conditions
- **Execution Engine**: Runs workflows with proper dependency resolution

### Query Processing

- **Natural Language Interface**: Converts user queries to command guidance
- **Intelligent Routing**: Determines appropriate workflows based on query intent
- **Context Awareness**: Considers project state and previous interactions
- **Command Composition**: Chains multiple command sequences for complex tasks

### Workflow Categories

- **Core Operations**: Project analysis, quality checks, help, cleanup
- **Python Development**: Environment, testing, quality, type checking, building
- **Frontend Development**: JavaScript, React, Vue, testing, building
- **Documentation**: Creation, review, ADR management, documentation-driven development
- **Development Process**: Git workflow, branching, dependency management
- **Session Management**: Development session lifecycle and retrospectives
- **Automation**: CI/CD, quality gates, deployment automation
- **Testing**: Comprehensive test suites, performance testing
- **Media**: Image processing, video handling, asset optimization

### Key Components

- `vibe/analyzer.py` - Natural language query analysis and workflow routing
- `vibe/workflows/loader.py` - YAML workflow loading with recursive directory scanning
- `vibe/workflows/models.py` - Workflow data models and validation
- `vibe/workflows/data/` - Organized YAML workflow definitions (29 workflows)
- `vibe/agents/` - AI agent configurations for various development scenarios
- `main.py` - CLI interface for natural language workflow guidance

### State Management

- Uses workflow definitions stored in YAML files
- Workflow state managed through execution context
- Session state persisted through workflow execution
- Configuration managed through environment variables and files

### Guardrailed Development: Using Vibe to Build Vibe

To demonstrate the power of guidance-driven development, use these patterns:

- **Guidance-First Development**: Always query Vibe before manual operations
- **Self-Dogfooding**: Use Vibe guidance to develop new Vibe features
- **Natural Language Interface**: Demonstrate query processing by using it
- **Automated Quality**: Use Vibe's validation command recommendations for all changes
- **Pattern Documentation**: Add new successful patterns as YAML workflows
- **Composition Examples**: Show how Vibe chains command sequences for complex tasks

**Dogfooding Examples:**
- ✅ Query: "create a new Python workflow for testing" → Vibe provides workflow creation commands
- ✅ Query: "validate my code changes" → Vibe suggests appropriate quality check commands
- ✅ Query: "help me organize these files" → Vibe recommends cleanup commands
- ✅ Query: "what's the best workflow for X?" → Vibe analyzes and provides command guidance
- ❌ Manually running Python commands without consulting Vibe first
- ❌ Creating files without using Vibe's command guidance capabilities

**Self-Improvement Workflow Examples:**
- Query: "analyze recent changes and suggest workflow improvements"
- Query: "create documentation for the new feature I just built"
- Query: "validate that all workflows are working correctly"
- Query: "help me refactor this workflow to be more efficient"

### Development Conventions

- **Always demonstrate Vibe's capabilities** by using them
- **Query first, execute second** - show the natural language interface
- **Document patterns as workflows** for future use
- **Use command composition** to show complex task automation
- **Validate everything through Vibe** to demonstrate quality command guidance

## Development Guidelines

### AI Agent Collaboration Guidelines

- **Dogfood by default**: Use Vibe guidance for all development tasks
- **Natural language first**: Query Vibe before manual operations
- Always demonstrate the guidance system's capabilities through usage
- Use Vibe's query processing to determine appropriate commands
- Follow command suggestions and document new patterns
- When implementing new functionality, create corresponding workflows
- Use Vibe's guidance for quality assurance commands
- Focus on showing how natural language queries translate to actionable command recommendations

**Vibe-First Usage Guidelines:**

**🎯 ALWAYS REMEMBER: Use Vibe to develop Vibe**

**Query-Driven Development (Use FIRST for any task):**

- **When to use**: Before starting ANY development task, feature implementation, or maintenance
- **Pattern**: Query Vibe → Follow command recommendations → Execute through terminal
- **Examples**:
  - "what workflow should I use to add a new feature?"
  - "help me test my Python code changes"
  - "create documentation for this new workflow"
- **Remember**: Demonstrate Vibe's natural language capabilities by using them

**Workflow Composition (Use for complex tasks):**

- **When to use**: For multi-step development tasks that span categories
- **Benefits**: Shows how Vibe chains command sequences for complex operations
- **Integration**: Demonstrates the power of automated command guidance

**Self-Improvement (Use for enhancing Vibe itself):**

- **When to use**: When adding features, fixing bugs, or improving Vibe
- **Tool**: Use Vibe to analyze what workflows are needed and create them
- **Benefits**: Creates a self-improving system that documents its own patterns

**Quality Assurance (Use for all validation):**

- **When to use**: Before committing changes, after implementing features
- **Tools**: Use Vibe's command recommendations instead of manual testing
- **Integration**: Shows how Vibe maintains its own quality through guidance automation

**Documentation and Patterns (Use for knowledge capture):**

- **When to use**: When creating docs, recording decisions, sharing knowledge
- **Tools**: Use Vibe's documentation command recommendations for consistency
- **Benefits**: Demonstrates how Vibe helps maintain its own documentation

**Enhanced Workflow Development**: Always use Vibe's workflow creation capabilities to add new patterns to the system

### Code Style

- Use Python type hints and docstrings
- Follow PEP 8 style guidelines
- Implement comprehensive error handling
- Use descriptive variable and function names
- Create modular, reusable workflow components

### Workflow Design Patterns

- Always use YAML for workflow definitions
- Include proper metadata (name, description, triggers, commands)
- Define clear dependencies and conditions
- Use consistent naming conventions across categories
- Test workflow execution before committing

### Natural Language Interface

- Design queries to be intuitive and conversational
- Support multiple ways of expressing the same intent
- Provide helpful suggestions when queries are ambiguous
- Include examples in documentation and help systems
- Test natural language understanding with real user queries

### Component Design Patterns

- Keep workflow definitions atomic and composable
- Separate query analysis from workflow execution
- Use proper abstraction layers for different workflow types
- Implement proper validation for workflow parameters
- Design for extensibility - new workflow categories should be easy to add

### Error Handling & Validation

- Always validate workflow definitions on load
- Provide clear error messages for invalid queries
- Handle missing dependencies gracefully
- Implement proper logging for workflow execution
- Use Vibe's own validation workflows for quality assurance

### Performance Considerations

- Cache workflow definitions for faster query processing
- Use lazy loading for workflow execution
- Implement proper resource management for long-running workflows
- Monitor workflow performance and optimize bottlenecks
- Design workflows to be idempotent where possible

### Workflow Organization

- Core workflows in `vibe/workflows/data/core/`
- Language-specific workflows in appropriate subdirectories
- Use clear, descriptive names for workflow files
- Maintain README documentation for each workflow category
- Group related workflows logically and maintain good organization

### Documentation & Comments

- Use docstrings for all public APIs
- Include usage examples in workflow documentation
- Document the natural language query patterns that trigger workflows
- Explain workflow composition patterns and dependencies
- Keep the main README up-to-date with new capabilities

### Dogfooding Standards

- Always use Vibe workflows for Vibe development
- Demonstrate natural language query capabilities in all interactions
- Create workflows for new development patterns as they emerge
- Use Vibe's validation and quality workflows for all changes
- Show workflow composition for complex tasks

## Testing and Validation

### Dogfooding Validation

1. Query Vibe for appropriate testing: "what testing workflows should I use?"
2. Execute Vibe's recommended testing workflows
3. Validate workflow execution through Vibe's quality workflows
4. Document testing patterns as new workflows if needed

### Automated Testing

1. **Use Vibe testing workflows**: Query for "run tests" or "validate code"
2. **Workflow validation**: Ensure all YAML workflows load correctly
3. **Query processing tests**: Validate natural language understanding
4. **Integration tests**: Test workflow composition and execution

### Manual Testing

1. Test natural language query processing with various phrasings
2. Verify workflow execution produces expected results
3. Test workflow composition for complex multi-step tasks
4. Validate error handling and edge cases

## Troubleshooting

### Common Issues

- **Workflow not found**: Check YAML file syntax and category organization
- **Query not understood**: Try rephrasing or use more specific terminology
- **Execution errors**: Check workflow dependencies and prerequisites
- **Natural language issues**: Use Vibe's help workflow for guidance

### Development Tips

- Always query Vibe first for guidance
- Use Vibe's help workflows to discover capabilities
- Check workflow execution logs for debugging
- Test new workflows in isolation before integration
- Document successful query patterns for future reference

## Vibe Development Workflow

This project uses Vibe itself for development workflows. Always query Vibe for guidance rather than executing manual commands.

## AI Agent Compliance and Validation

### Vibe-First Development Checklist

**BEFORE responding to ANY development request, AI agents must:**

1. **📋 Workflow Query Check**:
   - [ ] Should I query Vibe for appropriate workflows for this task?
   - [ ] Would Vibe's natural language interface provide better guidance?
   - [ ] Should I demonstrate Vibe's capabilities by using them?

2. **🔄 Workflow Execution Check**:
   - [ ] Am I about to suggest manual commands instead of using Vibe workflows?
   - [ ] Would this benefit from Vibe's automated workflow orchestration?
   - [ ] Should I use Vibe's validation workflows for quality assurance?

3. **🧠 Dogfooding Check**:
   - [ ] Is this an opportunity to show how Vibe improves development workflow?
   - [ ] Should I create new workflows to capture successful patterns?
   - [ ] Can I demonstrate workflow composition for complex tasks?

4. **📚 Documentation Check**:
   - [ ] Should I use Vibe's documentation workflows for creating/updating docs?
   - [ ] Would this benefit from Vibe's pattern documentation capabilities?
   - [ ] Should I query Vibe for documentation best practices?

**If ANY checkbox is checked, use Vibe workflows FIRST before proceeding.**

### Mandatory Development Examples and Anti-Patterns

**✅ CORRECT Vibe-First Pattern:**

```bash
# Always query Vibe first
python main.py "what workflow should I use to test my Python code?"

# Follow Vibe's recommendations
python main.py "run Python quality checks"

# Use Vibe for validation
python main.py "validate my recent changes"
```

**❌ NEVER Bypass Vibe:**

```bash
# Don't run manual commands without consulting Vibe
python -m pytest  # Should query Vibe first
flake8 .          # Should use Vibe's quality workflows
```

**✅ CORRECT Natural Language Workflow Usage:**

```python
# Demonstrate Vibe's query processing
user_query = "help me create documentation for this new feature"
# Let Vibe determine appropriate workflows and execute them
```

**❌ NEVER Skip Natural Language Interface:**

```python
# Don't hardcode workflow execution
workflows = ["create_docs", "validate_docs"]  # Should query Vibe instead
```

### Pre-Implementation Validation Checklist

**MANDATORY: Query Vibe for guidance before any development:**

1. **Workflow Discovery**: Query "what workflow should I use for [task]?"
2. **Follow Recommendations**: Execute Vibe's suggested workflows
3. **Validate Results**: Use Vibe's validation workflows
4. **Document Patterns**: Create new workflows for successful patterns

### Vibe-First Development Protocol

**After any AI-generated development:**

1. **Query Vibe**: Ask for appropriate validation workflows
2. **Execute Validation**: Run Vibe's recommended quality checks
3. **Document Success**: Create workflow if pattern is reusable
4. **Demonstrate Capabilities**: Show how Vibe improves development flow

### Agent Validation Protocol

**When working on Vibe development:**

- Query Vibe for command guidance before manual operations
- Use Vibe's natural language interface to demonstrate capabilities
- Follow Vibe's command recommendations religiously
- Create new workflows for successful development patterns
- Document how Vibe improves the development experience

**If dogfooding fails:**

- Stop implementation immediately
- Query Vibe for alternative approaches
- Document any limitations discovered
- Improve Vibe's workflows to handle the use case
- Retry with improved guidance system

### Context Enhancement for AI Agents

**When requesting development assistance, always include:**

- Query Vibe first: "how should I approach [task]?"
- Reference Vibe's workflow recommendations
- Use Vibe's natural language interface for task execution
- Document successful patterns as new workflows

**Example Enhanced Prompt:**

```
Create a new feature for Vibe following the dogfooding approach.
First query: "what workflow should I use to add a new feature to Vibe?"
Follow Vibe's recommendations and document the process as a new workflow.
Use Vibe's validation workflows to ensure quality.
```

## Session Retrospective and Continuous Improvement

### Vibe-Powered Development Sessions

**MANDATORY**: After each development session, use Vibe to:

1. **Session Analysis**: Query "analyze my development session"
2. **Pattern Documentation**: Query "document successful patterns as workflows"
3. **Quality Review**: Query "validate all changes made during this session"
4. **Improvement Suggestions**: Query "how can I improve my workflow?"

### Workflow Enhancement

**Integration with Session Completion**:

- Query Vibe for session completion: "complete my development session"
- Use Vibe's retrospective workflows for analysis
- Document new patterns discovered during development
- Improve Vibe's capabilities based on session learnings

### Continuous Improvement Automation

**Vibe-Enhanced Learning Loop**:

- **Session Start**: Query "start development session for [goal]"
- **During Development**: Query for appropriate workflows at each step
- **Quality Gates**: Use Vibe's validation workflows throughout
- **Session End**: Query "complete session and document learnings"

### Self-Improvement Patterns

#### Vibe Workflow Enhancement

```
User requests enhancement →
Query Vibe for approach →
Follow Vibe's workflow recommendations →
Document successful patterns as new workflows
```

#### Quality Assurance Loop

```
Development task needed →
Query Vibe for appropriate command guidance →
Execute commands manually through terminal →
Validate with Vibe's recommended quality commands
```

#### Knowledge Capture

```
Successful development pattern →
Query Vibe: "create workflow for this pattern" →
Document as YAML workflow →
Test command execution
```

### Future Session Enhancement Guidelines

**Before starting any development session**:

1. Query Vibe for session planning: "plan development session for [goal]"
2. Use Vibe's workflow recommendations throughout
3. Document new patterns as they emerge
4. Validate everything through Vibe's quality workflows

**During development**:

1. Always query Vibe before manual operations
2. Use natural language interface to demonstrate capabilities
3. Create workflows for successful patterns
4. Validate continuously through Vibe's guidance system

**At session completion**:

1. Query Vibe for session retrospective
2. Document learnings as new workflows
3. Improve Vibe's capabilities based on experience
4. Commit workflow improvements along with feature development

**Session Success Metrics**:

- ✅ All development tasks guided through Vibe's system
- ✅ Natural language interface used for task discovery
- ✅ New workflows created for successful patterns
- ✅ Vibe's capabilities demonstrated and enhanced
- ✅ Quality validated through Vibe's command recommendations
- ✅ Future sessions will benefit from documented workflows
