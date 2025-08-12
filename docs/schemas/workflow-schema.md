# Workflow YAML Schema

This document defines the complete schema for workflow YAML files.

## Schema Definition

```yaml
# JSON Schema for workflow validation
{
  '$schema': 'http://json-schema.org/draft-07/schema#',
  'type': 'object',
  'required': ['name', 'description', 'triggers', 'steps'],
  'properties':
    {
      'name':
        {
          'type': 'string',
          'pattern': '^[a-z0-9_]+$',
          'description': 'Unique workflow identifier (snake_case)',
        },
      'description':
        {
          'type': 'string',
          'minLength': 10,
          'description': 'Human-readable workflow description',
        },
      'triggers':
        {
          'type': 'array',
          'items': { 'type': 'string' },
          'minItems': 1,
          'description': 'Patterns that activate this workflow',
        },
      'steps':
        {
          'type': 'array',
          'items': { 'type': 'string' },
          'minItems': 1,
          'description': 'Execution guidance steps',
        },
      'dependencies':
        {
          'type': 'array',
          'items': { 'type': 'string' },
          'description': 'Required tools or packages',
        },
      'project_types':
        {
          'type': 'array',
          'items': { 'type': 'string' },
          'description': 'Compatible project types',
        },
      'conditions':
        {
          'type': 'array',
          'items': { 'type': 'string' },
          'description': 'Execution prerequisites',
        },
    },
}
```

## Field Definitions

### Required Fields

#### name

- **Type**: string
- **Pattern**: `^[a-z0-9_]+$` (snake_case)
- **Description**: Unique identifier for the workflow
- **Example**: `"debug_authentication"`

#### description

- **Type**: string
- **Min Length**: 10 characters
- **Description**: Human-readable description of workflow purpose
- **Example**: `"Debug authentication issues by analyzing logs and testing auth flow"`

#### triggers

- **Type**: array of strings
- **Min Items**: 1
- **Description**: Patterns that should activate this workflow
- **Examples**:

```yaml
triggers:
  - 'debug auth'
  - 'authentication issue'
  - 'login.*fail'
  - 'auth.*bug'
```

#### steps

- **Type**: array of strings
- **Min Items**: 1
- **Description**: Guidance steps for execution (not just commands)
- **Examples**:

```yaml
steps:
  - '🔍 ANALYZE AUTHENTICATION LOGS'
  - 'Check recent authentication failures in application logs'
  - "grep -i 'auth\\|login' logs/*.log | tail -50"
  - '📊 IDENTIFY FAILURE PATTERNS'
  - 'Look for common error messages or timing patterns'
  - '🔧 TEST AUTHENTICATION FLOW'
  - 'Manually test login with known good credentials'
```

### Optional Fields

#### dependencies

- **Type**: array of strings
- **Description**: Required tools, packages, or services
- **Examples**:

```yaml
dependencies:
  - 'grep'
  - 'curl'
  - 'jq'
  - 'python3'
```

#### project_types

- **Type**: array of strings
- **Description**: Project types where this workflow applies
- **Valid Values**: `["python", "javascript", "typescript", "web", "api", "generic"]`
- **Examples**:

```yaml
project_types:
  - 'python'
  - 'web'
```

#### conditions

- **Type**: array of strings
- **Description**: Prerequisites that must be met before execution
- **Examples**:

```yaml
conditions:
  - 'Git repository exists'
  - 'Authentication service is running'
  - 'Log files are accessible'
```

## Complete Example

```yaml
name: 'debug_authentication'
description: 'Comprehensive authentication debugging workflow for web applications'
triggers:
  - 'debug auth'
  - 'authentication.*issue'
  - 'login.*fail'
  - 'auth.*error'
  - 'user.*cannot.*login'
steps:
  - '🔍 ANALYZE AUTHENTICATION LOGS'
  - 'Examine recent authentication failures and error patterns'
  - "grep -i 'auth\\|login\\|fail' logs/*.log | tail -100"
  - '📊 CHECK AUTHENTICATION SERVICE STATUS'
  - 'Verify authentication service health and connectivity'
  - 'curl -s http://localhost:8080/auth/health | jq .'
  - '🔧 TEST AUTHENTICATION FLOW'
  - 'Manually test authentication with known good credentials'
  - 'python scripts/test_auth.py --user test@example.com'
  - '🗄️ VALIDATE DATABASE CONNECTIONS'
  - 'Check user database connectivity and data integrity'
  - 'python -c "from auth import db; print(db.test_connection())"'
  - '⚙️ REVIEW AUTHENTICATION CONFIGURATION'
  - 'Verify authentication settings and environment variables'
  - 'env | grep -i auth'
  - 'cat config/auth.yaml'
  - '🔐 CHECK SECURITY CERTIFICATES'
  - 'Validate SSL/TLS certificates for authentication endpoints'
  - 'openssl s_client -connect auth.example.com:443 -servername auth.example.com'
dependencies:
  - 'grep'
  - 'curl'
  - 'jq'
  - 'python3'
  - 'openssl'
project_types:
  - 'python'
  - 'web'
  - 'api'
conditions:
  - 'Authentication service configuration exists'
  - 'Log files are accessible'
  - 'Network connectivity to auth endpoints'
```

## Validation Rules

### Naming Conventions

- Workflow names must use snake_case
- Names should be descriptive and unique
- Avoid generic names like "workflow1" or "test"

### Trigger Patterns

- Use specific, descriptive trigger phrases
- Include common variations and synonyms
- Support regex patterns for flexible matching
- Avoid overly broad triggers that match everything

### Step Guidelines

- Start steps with emoji headers for visual organization
- Include both guidance text and executable commands
- Provide context and explanations, not just commands
- Follow the autonomous operation philosophy (no user prompts)

### Dependency Specification

- List all required external tools
- Include version requirements when necessary
- Consider platform-specific dependencies

## File Organization

### Directory Structure

```
data/workflows/
├── core/
│   ├── analysis.yaml
│   ├── debugging.yaml
│   └── optimization.yaml
├── python/
│   ├── testing.yaml
│   ├── packaging.yaml
│   └── deployment.yaml
└── web/
    ├── frontend.yaml
    ├── api.yaml
    └── security.yaml
```

### Naming Convention

- Use descriptive, snake_case filenames
- Group related workflows in category directories
- Keep filenames under 50 characters

## Loading and Validation

### Loading Process

1. Scan workflow directories for .yaml files
2. Parse YAML content with PyYAML
3. Validate against JSON schema
4. Register valid workflows in registry
5. Log warnings for invalid workflows

### Error Handling

- Malformed YAML: Skip file, log error
- Schema validation failure: Skip workflow, log details
- Missing required fields: Skip workflow, log missing fields
- Invalid trigger patterns: Skip workflow, log regex errors

### Performance Considerations

- Cache parsed workflows in memory
- Invalidate cache on file changes
- Use lazy loading for large workflow sets
- Implement hot reloading for development
