# Language and Formatting Standards

## Overview

This document establishes the language and formatting standards for the Vibe project to ensure professional, clear, and accessible communication across all project materials.

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
- Include relevant technical details and command examples where appropriate

## Workflow File Standards

### Step Descriptions

```yaml
# Good
steps:
  - "Install project dependencies using the package manager"
  - "Run quality checks to validate code standards"
  - "Execute test suite to verify functionality"

# Avoid
steps:
  - "🚀 **Install Dependencies**: Get your project ready!"
  - "✅ **Quality Time**: Make sure everything looks good"
```

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
- **Use appropriate file locations**: Place test files in `tests/`, debug scripts in `scripts/` or remove them when done
- **Regular cleanup**: Periodically review and remove unused files, dependencies, and configurations
- **Follow .gitignore patterns**: Ensure temporary files don't get committed by using proper .gitignore rules

### Cleanup Guidelines

- Debug files should be prefixed with `debug-` and removed when no longer needed
- Test scripts should be in the `tests/` directory, not project root
- Test session data should be cleaned up after test runs
- Legacy configuration files should be removed when replaced
- Always verify no dependencies exist before removing files
- Include concrete examples and commands where relevant
- Maintain consistent formatting throughout

### Accessibility

- Write for developers of varying experience levels
- Define technical terms when first introduced
- Provide context for commands and procedures
- Ensure content is scannable with clear sections

## Rationale

These standards ensure that:

- Vibe maintains a professional appearance suitable for enterprise environments
- Documentation remains accessible to international developers
- Content ages well without dependence on ephemeral communication styles
- The project can be taken seriously by technical decision-makers

## Implementation

When contributing to Vibe:

1. Review existing content for compliance with these standards
2. Apply these guidelines to new documentation and workflows
3. Update any content that doesn't meet these standards
4. Consider the long-term maintainability of language choices

This approach prioritizes clarity, professionalism, and universal accessibility over stylistic trends.
