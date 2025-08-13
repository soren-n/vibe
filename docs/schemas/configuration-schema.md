# Configuration Schema

This document defines the complete schema for Vibe project configuration files (`.vibe.yaml`).

## Schema Definition

```yaml
# JSON Schema for .vibe.yaml validation
{
  '$schema': 'http://json-schema.org/draft-07/schema#',
  'type': 'object',
  'properties':
    {
      'project_type':
        {
          'type': 'string',
          'enum': ['python', 'javascript', 'typescript', 'web', 'api', 'generic'],
          'description': 'Primary project type',
        },
      'workflows':
        {
          'type': 'object',
          'patternProperties': { '^[a-z0-9_]+$': { '$ref': '#/$defs/workflow' } },
          'description': 'Custom workflow definitions',
        },
      'lint':
        {
          '$ref': '#/$defs/lintConfig',
          'description': 'Project linting configuration',
        },
      'session':
        {
          '$ref': '#/$defs/sessionConfig',
          'description': 'Session behavior configuration',
        },
      'exclude_patterns':
        {
          'type': 'array',
          'items': { 'type': 'string' },
          'description': 'File patterns to exclude from analysis',
        },
    },
  '$defs':
    {
      'workflow':
        {
          'type': 'object',
          'required': ['description', 'triggers', 'steps'],
          'properties':
            {
              'description': { 'type': 'string' },
              'triggers': { 'type': 'array', 'items': { 'type': 'string' } },
              'steps': { 'type': 'array', 'items': { 'type': 'string' } },
              'dependencies': { 'type': 'array', 'items': { 'type': 'string' } },
              'project_types': { 'type': 'array', 'items': { 'type': 'string' } },
            },
        },
      'lintConfig':
        {
          'type': 'object',
          'properties':
            {
              'check_emojis': { 'type': 'boolean' },
              'check_professional_language': { 'type': 'boolean' },
              'allow_informal_language':
                { 'type': 'array', 'items': { 'type': 'string' } },
              'naming_conventions':
                {
                  'type': 'object',
                  'patternProperties':
                    {
                      "^\\.[a-z]+$":
                        {
                          'enum':
                            ['snake_case', 'camelCase', 'kebab-case', 'PascalCase'],
                        },
                    },
                },
              'directory_naming':
                { 'enum': ['snake_case', 'camelCase', 'kebab-case', 'PascalCase'] },
            },
        },
      'sessionConfig':
        {
          'type': 'object',
          'properties':
            {
              'auto_advance': { 'type': 'boolean' },
              'max_session_age_hours': { 'type': 'integer', 'minimum': 1 },
              'enable_monitoring': { 'type': 'boolean' },
              'checkpoint_frequency': { 'type': 'integer', 'minimum': 1 },
            },
        },
    },
}
```

## Configuration Structure

### Root Properties

#### project_type

- **Type**: string (enum)
- **Values**: `["python", "javascript", "typescript", "web", "api", "generic"]`
- **Description**: Primary project type for workflow filtering
- **Auto-Detection**: If not specified, Vibe detects automatically
- **Example**: `"python"`

#### workflows

- **Type**: object (custom workflow definitions)
- **Key Pattern**: `^[a-z0-9_]+$` (snake_case workflow names)
- **Description**: User-defined workflows specific to this project
- **Example**:

```yaml
workflows:
  custom_deploy:
    description: 'Deploy application with custom pipeline'
    triggers: ['deploy', 'release']
    steps: ['Build application', 'Run tests', 'Deploy to staging']
```

#### exclude_patterns

- **Type**: array of strings
- **Description**: File patterns to exclude from analysis (extends .gitignore)
- **Examples**:

```yaml
exclude_patterns:
  - '*.tmp'
  - 'build/*'
  - 'node_modules/*'
```

## Lint Configuration

### lint.check_emojis

- **Type**: boolean
- **Default**: `true`
- **Description**: Whether to check for appropriate emoji usage
- **Example**: `check_emojis: false`

### lint.check_professional_language

- **Type**: boolean
- **Default**: `true`
- **Description**: Whether to check for professional language in code/docs
- **Example**: `check_professional_language: true`

### lint.allow_informal_language

- **Type**: array of strings (glob patterns)
- **Description**: Paths where informal language is allowed
- **Examples**:

```yaml
allow_informal_language:
  - '*cli*'
  - '*ui*'
  - '*frontend*'
  - 'tests/*'
```

### lint.naming_conventions

- **Type**: object (file extension mappings)
- **Key Pattern**: `^\\.[a-z]+$` (file extensions like `.py`, `.js`)
- **Values**: `["snake_case", "camelCase", "kebab-case", "PascalCase"]`
- **Description**: Naming conventions by file type
- **Examples**:

```yaml
naming_conventions:
  '.py': 'snake_case'
  '.js': 'camelCase'
  '.ts': 'camelCase'
  '.vue': 'kebab-case'
  '.yaml': 'snake_case'
  '.md': 'kebab-case'
```

### lint.directory_naming

- **Type**: string (enum)
- **Values**: `["snake_case", "camelCase", "kebab-case", "PascalCase"]`
- **Description**: Convention for directory names
- **Example**: `directory_naming: "snake_case"`

## Session Configuration

### session.auto_advance

- **Type**: boolean
- **Default**: `false`
- **Description**: Automatically advance to next step on successful completion
- **Example**: `auto_advance: true`

### session.max_session_age_hours

- **Type**: integer (minimum: 1)
- **Default**: `24`
- **Description**: Maximum session age before cleanup warnings
- **Example**: `max_session_age_hours: 48`

### session.enable_monitoring

- **Type**: boolean
- **Default**: `true`
- **Description**: Enable session monitoring and completion tracking
- **Example**: `enable_monitoring: false`

### session.checkpoint_frequency

- **Type**: integer (minimum: 1)
- **Default**: `10`
- **Description**: Number of steps between automatic checkpoints
- **Example**: `checkpoint_frequency: 5`

## Complete Example

```yaml
# .vibe.yaml - Complete configuration example
project_type: 'python'

# Custom workflows for this project
workflows:
  deploy_staging:
    description: 'Deploy application to staging environment'
    triggers:
      - 'deploy staging'
      - 'stage deploy'
    steps:
      - '🏗️ BUILD APPLICATION'
      - 'python -m build'
      - 'Run tests'
      - 'pytest tests/ --cov=app'
      - 'Deploy to staging'
      - 'ansible-playbook deploy/staging.yml'
    dependencies:
      - 'python'
      - 'pytest'
      - 'ansible'
    project_types:
      - 'python'

  database_migration:
    description: 'Apply database schema migrations'
    triggers:
      - 'migrate database'
      - 'apply.*migration'
    steps:
      - 'Backup database'
      - 'pg_dump app_db > backup_$(date +%Y%m%d).sql'
      - 'Apply migrations'
      - 'python manage.py migrate'
      - 'Verify migration'
      - 'python manage.py check --database=default'

# Project linting configuration
lint:
  check_emojis: true
  check_professional_language: true
  allow_informal_language:
    - '*cli*'
    - '*test*'
    - 'scripts/*'
  naming_conventions:
    '.py': 'snake_case'
    '.yaml': 'snake_case'
    '.md': 'kebab-case'
    '.json': 'snake_case'
  directory_naming: 'snake_case'

# Session behavior configuration
session:
  auto_advance: false
  max_session_age_hours: 24
  enable_monitoring: true
  checkpoint_frequency: 10

# Additional file exclusions
exclude_patterns:
  - '*.pyc'
  - '__pycache__/*'
  - '.venv/*'
  - 'build/*'
  - 'dist/*'
  - '.pytest_cache/*'
```

## Configuration Loading

### Loading Process

1. Look for `.vibe.yaml` in current directory
2. Walk up directory tree to find configuration
3. Merge with default configuration values
4. Validate against schema
5. Apply project type auto-detection if needed

### Default Locations

- `./.vibe.yaml` (current directory)
- `../.vibe.yaml` (parent directories, up to git root)
- `~/.vibe.yaml` (user home directory)

### Environment Variables

- `VIBE_CONFIG_PATH`: Override configuration file path
- `VIBE_PROJECT_TYPE`: Override project type detection
- `VIBE_SESSION_DIR`: Override session storage directory

## Validation and Error Handling

### Schema Validation

- Validate against JSON schema on load
- Report specific validation errors with field paths
- Continue with valid sections, skip invalid ones
- Log warnings for unknown fields

### Error Recovery

- Invalid workflows: Skip and log error
- Missing dependencies: Warn but continue
- Invalid project type: Fall back to auto-detection
- Malformed YAML: Use default configuration

### Migration Support

- Support legacy configuration formats
- Automatically migrate old configurations
- Preserve custom settings during migration
- Backup original configuration files

This configuration system provides flexible project customization while maintaining validation and backward compatibility.
