# AI Agent Prefix and Suffix for Workflow Steps

This feature automatically adds prefix and suffix messages to workflow steps to optimize AI agent execution during vibe coding sessions.

## Purpose

When AI agents execute workflow steps, they often encounter issues like:
- Interactive prompts that hang waiting for input
- Verbose output that wastes tokens
- Commands requiring confirmation (y/n prompts)
- Unclear execution context
- Rushing to execution without proper analysis

The AI agent prefix and suffix help guide agents to execute commands more effectively and thoughtfully.

## How It Works

The system dynamically adds prefixes and suffixes to workflow steps at runtime (not stored in YAML files):

### For Command Steps:
```
AUTO-VIBE: Execute without interaction. Use quiet/yes flags. Report outcome concisely.

[original step content]

Remember: Analyze, Reflect, Plan, Execute
```

### For Guidance/Checklist Steps:
```
AUTO-VIBE: Verify and report status briefly.

[original step content]

Remember: Analyze, Reflect, Plan, Execute
```

## Configuration

You can control these features via `.vibe.yaml`:

```yaml
session:
  ai_agent_prefix: true  # Enable prefixes (default)
  ai_agent_suffix: true  # Enable suffixes (default)
```

To disable either or both:
```yaml
session:
  ai_agent_prefix: false  # Disable prefixes
  ai_agent_suffix: false  # Disable suffixes
```

## Workflow and Checklist Refactoring

To avoid redundancy with the new prefix/suffix system, all workflow and checklist files have been refactored to remove redundant action verbs:

### Changes Made
- **"Execute X"** → **"X"**
- **"Run X"** → **"X"**
- **"Check that X"** → **"X"**
- **"Verify that X"** → **"X"**

### Example Transformation
```yaml
# Before refactoring
steps:
  - "Execute unit tests with coverage"
  - "Run Python linting: `ruff check .`"

# After refactoring
steps:
  - "Unit tests with coverage"
  - "Python linting: `ruff check .`"
```

When combined with the prefix/suffix system, this creates clean, non-redundant guidance:

```
AUTO-VIBE: Execute without interaction. Use quiet/yes flags. Report outcome concisely.

Unit tests with coverage

Remember: Analyze, Reflect, Plan, Execute
```

This approach follows the language standards, maintains professionalism, and optimizes for AI agent execution efficiency.
  ai_agent_prefix: false  # Disable prefixes
  ai_agent_suffix: false  # Disable suffixes
```

## Examples

### Enabled (default):
```json
{
  "step_text": "AUTO-VIBE: Execute without interaction. Use quiet/yes flags. Report outcome concisely.\n\nRun tests: `uv run pytest -q --maxfail=1`",
  "is_command": true
}
```

### Disabled:
```json
{
  "step_text": "Run tests: `uv run pytest -q --maxfail=1`",
  "is_command": true
}
```

## Benefits

- **No User Interaction**: Prevents commands from hanging on prompts
- **Minimal Token Usage**: Encourages concise output reporting
- **Automated Execution**: Optimizes for AI agent workflows
- **Configurable**: Can be toggled on/off per project
