# Workflow Design Philosophy

## User-Installable Tool Principle

**Vibe is a user-installable MCP tool that runs locally on user machines, not a deployed service.**

### Deployment Context

- Users download and install Vibe on their local machines
- Execution happens in user's local environment with their file system
- No server infrastructure, monitoring, or web deployment concerns
- Focus on user safety, file system security, and local execution reliability

## Unattended Operation Principle

**Vibe executes workflows without requiring user input beyond the initial prompt.**

### Requirements

- Workflows operate independently after task assignment
- Execution proceeds without user confirmation
- No interactive prompts or manual interventions
- Complete task execution with automated validation

## Implementation Standards

### Unattended Patterns

```
# Recommended: Informational output
output("Analyzing project structure")
output("Validating dependencies automatically")

# Avoid: User-dependent prompts
output("Which branch should be used?")
input("Do you want to continue? (y/n)")
```

### Decision Logic

```
# ✅ Built-in logic
output("🎯 AUTOMATED BRANCH SELECTION")
output("• Branch determined by change analysis")

# ❌ User-dependent
output("🎯 MANUAL BRANCH SELECTION REQUIRED")
output("• Please specify target branch")
```

### Command Execution

```
# ✅ Direct execution
execute_command("check project status")
execute_command("install dependencies")
execute_command("synchronize project state")

# ❌ Manual requests
output("Run: check project status")
output("Please install dependencies manually")
```

## Design Requirements

### Workflow Design

- Informational headers replace questions
- Automated validation replaces manual checks
- Built-in decision logic replaces user prompts
- Commands execute without user interaction

### Error Handling

- Graceful error handling with diagnostics
- Automatic fixes when possible
- Clean continuation or termination
- No user intervention required

## Benefits

**Scalability**: Multi-task AI agent operation without bottlenecks
**Consistency**: Deterministic workflow outcomes
**Efficiency**: Zero wait time for user responses
**Reliability**: Reduced human error surface area

## Validation Criteria

Workflows must satisfy:

- ✅ Complete execution without user input
- ✅ Informational output only (no interactive prompts)
- ✅ Commands run without user confirmation
- ✅ Decision logic integrated within workflow
