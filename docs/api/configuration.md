# Configuration API Reference

The configuration system provides project-specific settings, workflow definitions, and runtime configuration for Vibe.

## Core Interfaces

### VibeConfig Interface

The main configuration interface that aggregates all configuration aspects.

```
Interface VibeConfig:
  project_type: string                              # Project type identifier or "auto" for detection
  workflows: map<string, WorkflowConfig>           # User-defined workflows
  project_types: map<string, ProjectTypeConfig>    # Project type configurations
  lint: LintConfig                                 # Linting configuration
  session: SessionConfig                           # Session behavior configuration

  Static Method load_from_file(config_path: string | null) -> VibeConfig
  Method find_config_file() -> string | null
  Method detect_project_type() -> string
  Method merge_gitignore_patterns() -> void
```

**Properties:**

- `project_type: string` - Project type identifier or "auto" for detection
- `workflows: map<string, WorkflowConfig>` - User-defined workflows
- `project_types: map<string, ProjectTypeConfig>` - Project type configurations
- `lint: LintConfig` - Linting configuration
- `session: SessionConfig` - Session behavior configuration

**Methods:**

#### load_from_file(config_path)

Loads configuration from YAML file with gitignore integration.

**Parameters:**

- `config_path: string | null` - Path to config file, auto-detected if null

**Returns:**

- `VibeConfig` - Loaded configuration with merged defaults

**Algorithm:**

1. Find config file (vibe.yaml, .vibe.yaml) if not provided
2. Load YAML data with safe parsing
3. Create VibeConfig instance with validation
4. Read gitignore patterns from project tree
5. Merge gitignore patterns with lint.exclude_patterns
6. Return configured instance

**Implementation:**

```
Static Method load_from_file(config_path: string | null) -> VibeConfig:
  if config_path == null:
    config_path = find_config_file()

  project_root = get_parent_directory(config_path) or current_directory()

  if config_path exists:
    data = load_yaml_file(config_path)
    config = create_vibe_config(data)

    // Integrate gitignore patterns
    gitignore_patterns = read_gitignore_patterns(project_root)
    essential_patterns = [".git", ".git/**", ".github", ".github/**",
                         ".gitignore", ".gitattributes"]
    all_patterns = gitignore_patterns + essential_patterns

    if all_patterns.length > 0:
      existing = set_from_list(config.lint.exclude_patterns)
      new_patterns = filter(all_patterns, pattern => not existing.contains(pattern))
      config.lint.exclude_patterns.extend(new_patterns)
  else:
    config = create_default_vibe_config()

  return config
```

#### \_find_config_file()

Discovers configuration file in current or parent directories.

**Returns:**

- `Path | None` - Path to found config file or None

**Search Pattern:**

1. Look for vibe.yaml in current directory
2. Look for .vibe.yaml in current directory
3. Traverse up parent directories
4. Return first match or None

### WorkflowConfig

Configuration for individual workflows.

```python
class WorkflowConfig(BaseModel):
    """Configuration for a specific workflow."""

    triggers: list[str] = Field(default_factory=list)
    steps: list[str] = Field(default_factory=list)
    commands: list[str] = Field(default_factory=list)  # Legacy
    description: str = ""
    dependencies: list[str] = Field(default_factory=list)
```

**Properties:**

- `triggers: list[str]` - Regex patterns that trigger this workflow
- `steps: list[str]` - Step descriptions for execution
- `commands: list[str]` - Legacy format, converted to steps
- `description: str` - Human-readable workflow description
- `dependencies: list[str]` - Required workflow dependencies

**Post-initialization:**

- Converts legacy `commands` to `steps` if steps is empty

### LintConfig

Configuration for code quality and linting rules.

```python
class LintConfig(BaseModel):
    """Configuration for linting and quality checks."""

    exclude_patterns: list[str] = Field(default_factory=lambda: [...])
    max_step_message_length: int = 100
    min_action_word_percentage: float = 5.0
    unprofessional_patterns: list[str] = Field(default_factory=lambda: [...])
```

**Properties:**

- `exclude_patterns: list[str]` - File patterns to exclude from linting
- `max_step_message_length: int` - Maximum allowed step message length
- `min_action_word_percentage: float` - Minimum percentage of action words required
- `unprofessional_patterns: list[str]` - Regex patterns for unprofessional language

**Default Exclude Patterns:**

- `__pycache__/**`, `*.pyc`, `.pytest_cache/**`
- `node_modules/**`, `.next/**`, `dist/**`, `build/**`
- `.vibe/**`, `coverage/**`

**Default Unprofessional Patterns:**

- Informal words: `awesome`, `cool`, `amazing`, `epic`
- Contractions: `gonna`, `wanna`, `gotta`
- Internet slang: `omg`, `lol`, `btw`, `fyi`
- Multiple punctuation: `!!+`, `??+`

### SessionConfig

Configuration for workflow session behavior and AI agent optimization.

```python
class SessionConfig(BaseModel):
    """Configuration for workflow session behavior."""

    ai_agent_prefix: bool = Field(default=True)
    ai_agent_suffix: bool = Field(default=True)
```

**Properties:**

- `ai_agent_prefix: bool` - Add AI-optimized prefixes to workflow steps
- `ai_agent_suffix: bool` - Add AI-optimized suffixes to workflow steps

### ProjectTypeConfig

Configuration for specific project types.

```python
class ProjectTypeConfig(BaseModel):
    """Configuration for a project type."""

    name: str
    detection_files: list[str] = Field(default_factory=list)
    workflows: dict[str, WorkflowConfig] = Field(default_factory=dict)
```

**Properties:**

- `name: str` - Project type identifier
- `detection_files: list[str]` - Files that indicate this project type
- `workflows: dict[str, WorkflowConfig]` - Project-specific workflows

## Utility Functions

### \_read_gitignore_patterns(project_root)

Reads and processes gitignore patterns from project tree.

**Parameters:**

- `project_root: Path` - Root directory to scan

**Returns:**

- `list[str]` - Normalized gitignore patterns

**Algorithm:**

1. Find all .gitignore files in project (excluding cache directories)
2. Process each file to extract patterns
3. Normalize patterns based on file location
4. Expand directory patterns to include subdirectories
5. Remove duplicates and return

### \_find_gitignore_files(project_root)

Discovers gitignore files while excluding cache directories.

**Parameters:**

- `project_root: Path` - Root directory to scan

**Returns:**

- `list[tuple[Path, str]]` - List of (gitignore_path, relative_directory) tuples

**Excluded Directories:**

- `__pycache__`, `.pytest_cache`, `.mypy_cache`, `.ruff_cache`
- `node_modules`, `dist`, `build`, `.venv`, `venv`
- `coverage`, `.git`, `.github`

### \_process_gitignore_file(gitignore_path, relative_dir)

Processes a single gitignore file and returns normalized patterns.

**Parameters:**

- `gitignore_path: Path` - Path to .gitignore file
- `relative_dir: str` - Relative directory from project root

**Returns:**

- `list[str]` - Normalized patterns from the file

**Processing Steps:**

1. Read file content with UTF-8 encoding
2. Skip comments and empty lines
3. Skip overly broad patterns (`*`, `**`, `*/**`)
4. Normalize patterns based on file location
5. Expand directory patterns

## Configuration File Format

Vibe looks for configuration files in this order:

1. `vibe.yaml` in current directory
2. `.vibe.yaml` in current directory
3. Same files in parent directories (recursive)

**Example Configuration:**

```yaml
project_type: 'python'

workflows:
  custom_setup:
    triggers:
      - 'set up.*environment'
      - 'configure.*project'
    steps:
      - 'Create virtual environment'
      - 'Install dependencies'
      - 'Configure development tools'
    dependencies: ['python_base']

lint:
  max_step_message_length: 120
  exclude_patterns:
    - 'custom_cache/**'

session:
  ai_agent_prefix: true
  ai_agent_suffix: false
```
