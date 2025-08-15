# Language and Formatting Standards

## Overview

This document establishes the language and formatting standards for the Vibe project to ensure professional, clear, and accessible communication across all project materials. Workflows should focus on general software development guidance and best practices rather than tool-specific implementations.

## Language Standards

### Professional Tone

- Use formal, professional language in all documentation and workflow descriptions
- Write in clear, concise sentences that are accessible to technical and non-technical audiences
- Avoid colloquialisms, slang, or overly casual expressions

### No Emojis or Decorative Characters

- **Prohibited**: Emojis (🚀, 📝, 🔧, etc.) in workflow files, documentation, and code comments
- **Prohibited**: Excessive use of decorative formatting like **bold** for emphasis in workflow steps
- **Preferred**: Clear, descriptive text that stands on its own merit

### Clarity and Precision

- Use specific, actionable language
- Avoid ambiguous terms or vague instructions
- Prefer "Install dependencies" over "Set up your environment"
- Focus on conceptual guidance rather than implementation details
- Emphasize principles and patterns that apply across tools and platforms

## Workflow File Standards

### Tool-Agnostic Approach

Workflows should provide conceptual guidance that applies across tools, languages, and platforms:

```yaml
# Good - Conceptual guidance
steps:
  - "Install project dependencies using the package manager"
  - "Run automated quality checks including linting and formatting"
  - "Execute test suite to verify functionality"
  - "Validate code meets established quality gates"

# Avoid - Tool-specific commands
steps:
  - "Run npm install to install dependencies"
  - "Execute npx eslint . for linting"
  - "Run pytest tests/ for testing"
  - "Use pre-commit hooks for validation"

# Avoid - Decorative language
steps:
  - "🚀 **Install Dependencies**: Get your project ready!"
  - "✅ **Quality Time**: Make sure everything looks good"
```

### Acceptable Specificity

While maintaining tool-agnostic principles, certain specificity is acceptable:

**Allowed**:

- Git operations (universal version control concepts)
- MCP tools and protocols (core to the project purpose)
- General software engineering patterns (testing, linting, formatting)
- Quality gate concepts (coverage thresholds, style compliance)

**Avoid**:

- Specific package managers (npm, pip, cargo, etc.)
- Particular linting tools (ESLint, Pylint, etc.)
- Platform-specific commands (VS Code, specific IDEs)
- Language-specific tooling (TypeScript compiler, Python virtual environments)

### Naming Conventions

- Use descriptive, professional names for workflows
- Avoid marketing language or overly enthusiastic descriptions
- Focus on the functional purpose of each workflow

## Documentation Standards

### Structure

- Lead with purpose and practical information
- Use clear headings and logical organization

### Project Cleanliness and Maintenance

- **Always clean up after development work**: Remove debug files, test artifacts, and temporary files
- **Use appropriate file organization**: Place files in conventional locations (tests in test directories, documentation with documentation)
- **Regular maintenance**: Periodically review and remove unused files, dependencies, and configurations
- **Version control hygiene**: Ensure temporary files don't get committed using proper ignore patterns

### Cleanup Guidelines

- Temporary files should be clearly marked and removed when no longer needed
- Test artifacts should be organized in appropriate directories
- Session data and debug output should be cleaned up after use
- Legacy files should be removed when replaced with newer implementations
- Always verify dependencies before removing any files
- Maintain consistent file organization throughout the project

### Accessibility

- Write for developers of varying experience levels
- Define technical terms when first introduced
- Provide context for commands and procedures
- Ensure content is scannable with clear sections

## Rationale

These standards ensure that:

- Vibe maintains a professional appearance suitable for enterprise environments
- Documentation remains accessible to international developers across different tool ecosystems
- Content ages well without dependence on ephemeral communication styles or specific tool implementations
- Workflows provide lasting value by focusing on principles rather than implementation details
- The project can be taken seriously by technical decision-makers in diverse environments

## Implementation

When contributing to Vibe:

1. Review existing content for compliance with these standards
2. Apply these guidelines to new documentation and workflows
3. Focus on conceptual guidance that transcends specific tools
4. Update any content that doesn't meet these tool-agnostic standards
5. Consider the long-term maintainability and universal applicability of guidance

### Workflow Review Checklist

When evaluating workflows for tool-agnostic compliance:

- Does this workflow provide value across different technology stacks?
- Are the steps focused on concepts rather than specific commands?
- Would this guidance be useful to developers using different tools?
- Are any tool-specific references limited to Git or MCP operations?
- Does the content emphasize principles and best practices?

This approach prioritizes clarity, professionalism, and universal accessibility over implementation specifics.

## Workflow Collection Status

### Cleanup Completion Summary

As of the latest update, the Vibe workflow collection has undergone comprehensive cleanup to achieve **100% tool-agnostic compliance**:

**Current State:**

- **Total workflows: 58** (down from 77+ original)
- **Compliance rate: 100%** (58/58 workflows fully compliant)
- **Removed workflows: 19** (platform-specific with no general value)

### Transformation Results

**✅ Successfully Eliminated:**

- All hardcoded package manager commands (npm, pip, uv, yarn, etc.)
- All specific tool references (ESLint, Pylint, ruff, mypy, pytest, etc.)
- All IDE/platform-specific instructions (VS Code, specific editors)
- All language-specific project constraints
- All tool-specific dependency requirements

**✅ Successfully Maintained:**

- Practical, actionable guidance principles
- Quality standards and best practices
- Professional language and formatting
- Logical workflow organization and triggers
- Comprehensive coverage of development scenarios

### Workflow Categories

**Core (22 workflows):** General development principles, quality standards, guidance systems  
**Development (29 workflows):** Environment setup, dependency management, CI/CD, project maintenance  
**Documentation (5 workflows):** Documentation creation, management, and validation  
**Testing (4 workflows):** Test execution, validation, and quality assurance  
**Frontend (2 workflows):** Generic build processes and quality checks  
**Misc (1 workflow):** Image processing and asset management

All workflows now provide conceptual guidance that applies universally across different:

- Programming languages and frameworks
- Package managers and build systems
- IDEs and development environments
- Operating systems and platforms
- Team sizes and project scales

This transformation ensures the workflow collection serves as universal guidance for AI agents working in any development context.
