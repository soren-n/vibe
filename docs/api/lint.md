# Lint System API Reference

The lint system provides comprehensive code quality checking including naming conventions, professional language validation, and emoji usage analysis.

## Core Classes

### ProjectLinter

Main linter class that orchestrates all linting operations.

```python
class ProjectLinter:
    """Main project linter that coordinates all linting operations."""

    def __init__(self, config: VibeConfig):
        """Initialize with project configuration."""
```

**Constructor Parameters:**

- `config: VibeConfig` - Project configuration with lint settings

**Properties:**

- `config: VibeConfig` - Project configuration object
- `lint_config: LintConfig` - Lint-specific configuration
- `naming_linter: NamingConventionLinter` - File/directory naming checker
- `text_linter: TextQualityLinter` - Text quality and professionalism checker
- `emoji_linter: EmojiUsageLinter` - Emoji usage pattern checker

**Methods:**

#### lint_project(project_path=".", format="json")

Lints entire project and returns comprehensive report.

**Parameters:**

- `project_path: str` - Path to project root (default: current directory)
- `format: str` - Output format ("json", "rich", "summary")

**Returns:**

- `LintReport` - Complete lint analysis results

**Algorithm:**

1. Discover all files in project (respecting exclusions)
2. Apply naming convention checks to files and directories
3. Analyze text content for quality issues
4. Check emoji usage patterns
5. Aggregate results by type and severity
6. Generate suggestions for improvements
7. Format results according to specified format

**Implementation:**

```python
def lint_project(self, project_path: str = ".", format: str = "json") -> LintReport:
    project_root = Path(project_path)
    all_issues: list[LintIssue] = []

    # Discover files and directories
    files_to_check = self._discover_files(project_root)
    dirs_to_check = self._discover_directories(project_root)

    # Lint naming conventions
    for file_path in files_to_check:
        all_issues.extend(self.naming_linter.lint_file_naming(file_path))

    for dir_path in dirs_to_check:
        all_issues.extend(self.naming_linter.lint_directory_naming(dir_path))

    # Lint text content
    for file_path in files_to_check:
        if self._is_text_file(file_path):
            all_issues.extend(self.text_linter.lint_file_content(file_path))

    # Lint emoji usage
    for file_path in files_to_check:
        all_issues.extend(self.emoji_linter.lint_file_emoji(file_path))

    # Generate report
    return self._generate_report(all_issues, format)
```

#### lint_text(text, context="general", format="json")

Lints specific text content for quality issues.

**Parameters:**

- `text: str` - Text content to analyze
- `context: str` - Context for linting rules ("general", "step_message", "documentation")
- `format: str` - Output format

**Returns:**

- `dict[str, Any]` - Text-specific lint results

### NamingConventionLinter

Validates file and directory naming conventions.

```python
class NamingConventionLinter:
    """Lints file and directory naming conventions."""

    def __init__(self, config: LintConfig):
        """Initialize with lint configuration."""
```

**Methods:**

#### lint_file_naming(file_path, skip_exclusion_check=False)

Checks if file follows naming convention for its extension.

**Parameters:**

- `file_path: Path` - Path to file to check
- `skip_exclusion_check: bool` - Skip exclusion pattern check if already done

**Returns:**

- `list[LintIssue]` - List of naming convention violations

**Convention Mapping:**

```python
# Default naming conventions by file extension
naming_conventions = {
    ".py": "snake_case",
    ".js": "camelCase",
    ".ts": "camelCase",
    ".vue": "PascalCase",
    ".md": "kebab-case",
    ".yaml": "kebab-case",
    ".json": "kebab-case"
}
```

**Implementation:**

```python
def lint_file_naming(self, file_path: Path, skip_exclusion_check: bool = False) -> list[LintIssue]:
    issues: list[LintIssue] = []

    if not skip_exclusion_check and self._should_exclude(file_path):
        return issues

    extension = file_path.suffix.lower()
    if extension not in self.config.naming_conventions:
        return issues

    expected_convention = self.config.naming_conventions[extension]
    file_stem = file_path.stem

    if not self._follows_convention(file_stem, expected_convention):
        suggestion = self._convert_to_convention(file_stem, expected_convention)
        issues.append(LintIssue(
            file_path=file_path,
            issue_type="naming_convention",
            severity="warning",
            message=f"File name '{file_stem}' doesn't follow {expected_convention} convention",
            suggestion=f"Consider renaming to: {suggestion}{extension}"
        ))

    return issues
```

#### lint_directory_naming(dir_path, skip_exclusion_check=False)

Checks if directory follows naming convention.

**Parameters:**

- `dir_path: Path` - Directory to check
- `skip_exclusion_check: bool` - Skip exclusion check

**Returns:**

- `list[LintIssue]` - Directory naming violations

**Convention Checking:**

#### \_follows_convention(name, convention)

Validates name against specific convention.

**Parameters:**

- `name: str` - Name to validate
- `convention: str` - Convention type

**Returns:**

- `bool` - True if name follows convention

**Supported Conventions:**

- `snake_case`: lowercase with underscores
- `camelCase`: camelCase with first letter lowercase
- `PascalCase`: PascalCase with first letter uppercase
- `kebab-case`: lowercase with hyphens
- `CONSTANT_CASE`: uppercase with underscores

**Implementation:**

```python
def _follows_convention(self, name: str, convention: str) -> bool:
    if convention == "snake_case":
        return re.match(r"^[a-z0-9_]+$", name) is not None
    elif convention == "camelCase":
        return re.match(r"^[a-z][a-zA-Z0-9]*$", name) is not None
    elif convention == "PascalCase":
        return re.match(r"^[A-Z][a-zA-Z0-9]*$", name) is not None
    elif convention == "kebab-case":
        return re.match(r"^[a-z0-9-]+$", name) is not None
    elif convention == "CONSTANT_CASE":
        return re.match(r"^[A-Z0-9_]+$", name) is not None
    else:
        return True  # Unknown convention, assume valid
```

### TextQualityLinter

Analyzes text content for professional language and quality issues.

```python
class TextQualityLinter:
    """Lints text content for professional language and quality."""

    def __init__(self, config: LintConfig):
        """Initialize with lint configuration."""
```

**Methods:**

#### lint_file_content(file_path)

Analyzes entire file content for text quality issues.

**Parameters:**

- `file_path: Path` - File to analyze

**Returns:**

- `list[LintIssue]` - Text quality violations

#### lint_text_content(text, context="general")

Analyzes specific text for quality issues.

**Parameters:**

- `text: str` - Text to analyze
- `context: str` - Context for analysis rules

**Returns:**

- `list[LintIssue]` - Text quality issues found

**Quality Checks:**

1. **Professional Language**: Checks for unprofessional patterns
2. **Action Word Percentage**: Ensures sufficient action words
3. **Length Validation**: Checks against maximum lengths
4. **Grammar Patterns**: Basic grammar and style checks

**Unprofessional Patterns:**

```python
unprofessional_patterns = [
    r"\b(awesome|cool|amazing|epic)\b",     # Informal adjectives
    r"\b(gonna|wanna|gotta)\b",             # Contractions
    r"\b(omg|lol|btw|fyi)\b",              # Internet slang
    r"!!+",                                 # Multiple exclamation marks
    r"\?\?+",                              # Multiple question marks
]
```

**Action Words:**

```python
action_words = [
    "create", "build", "implement", "configure", "setup", "install",
    "run", "execute", "test", "verify", "check", "validate",
    "analyze", "review", "update", "modify", "fix", "debug",
    "deploy", "launch", "start", "stop", "restart", "reload"
]
```

**Implementation:**

```python
def lint_text_content(self, text: str, context: str = "general") -> list[LintIssue]:
    issues: list[LintIssue] = []

    # Check professional language
    for pattern in self.config.unprofessional_patterns:
        matches = re.finditer(pattern, text, re.IGNORECASE)
        for match in matches:
            issues.append(LintIssue(
                file_path=Path(""),  # Will be set by caller
                issue_type="unprofessional_language",
                severity="warning",
                message=f"Unprofessional language detected: '{match.group()}'",
                suggestion="Use more professional terminology"
            ))

    # Check action word percentage
    words = re.findall(r'\b\w+\b', text.lower())
    action_word_count = sum(1 for word in words if word in self.action_words)
    action_percentage = (action_word_count / len(words)) * 100 if words else 0

    if action_percentage < self.config.min_action_word_percentage:
        issues.append(LintIssue(
            file_path=Path(""),
            issue_type="insufficient_action_words",
            severity="info",
            message=f"Low action word percentage: {action_percentage:.1f}%",
            suggestion="Add more action-oriented language"
        ))

    # Context-specific checks
    if context == "step_message":
        if len(text) > self.config.max_step_message_length:
            issues.append(LintIssue(
                file_path=Path(""),
                issue_type="message_too_long",
                severity="warning",
                message=f"Step message too long: {len(text)} characters",
                suggestion=f"Keep under {self.config.max_step_message_length} characters"
            ))

    return issues
```

### EmojiUsageLinter

Analyzes emoji usage patterns and consistency.

```python
class EmojiUsageLinter:
    """Lints emoji usage patterns."""

    def __init__(self, config: LintConfig):
        """Initialize with lint configuration."""
```

**Methods:**

#### lint_file_emoji(file_path)

Analyzes emoji usage in file content.

**Parameters:**

- `file_path: Path` - File to analyze

**Returns:**

- `list[LintIssue]` - Emoji usage violations

#### analyze_emoji_patterns(text)

Analyzes emoji patterns in text content.

**Parameters:**

- `text: str` - Text to analyze

**Returns:**

- `dict[str, Any]` - Emoji analysis results

**Emoji Checks:**

1. **Excessive Usage**: Too many emojis in text
2. **Inconsistent Patterns**: Mixed emoji styles
3. **Professional Context**: Emojis in inappropriate contexts
4. **Accessibility**: Emojis without text alternatives

## Data Structures

### LintIssue

Represents a single linting issue found during analysis.

```python
@dataclass
class LintIssue:
    """Represents a linting issue found during analysis."""

    file_path: Path
    issue_type: str
    severity: str  # "error", "warning", "info"
    message: str
    line_number: int | None = None
    column: int | None = None
    suggestion: str | None = None
```

**Properties:**

- `file_path: Path` - File where issue was found
- `issue_type: str` - Type of issue (naming_convention, unprofessional_language, emoji_usage)
- `severity: str` - Issue severity level (error, warning, info)
- `message: str` - Human-readable description
- `line_number: int | None` - Line number where issue occurs (optional)
- `column: int | None` - Column position (optional)
- `suggestion: str | None` - Suggested fix (optional)

### LintReport

Complete lint analysis results.

```python
class LintReport(TypedDict):
    """Type for lint report structure."""

    total_issues: int
    issues_by_type: dict[str, int]
    issues_by_severity: dict[str, int]
    files_with_issues: list[str]
    suggestions: list[str]
```

**Properties:**

- `total_issues: int` - Total number of issues found
- `issues_by_type: dict[str, int]` - Count of issues by type
- `issues_by_severity: dict[str, int]` - Count of issues by severity
- `files_with_issues: list[str]` - List of files with issues
- `suggestions: list[str]` - General improvement suggestions

## Configuration Integration

### LintConfig

Configuration for linting behavior and rules.

```python
class LintConfig(BaseModel):
    """Configuration for linting and quality checks."""

    exclude_patterns: list[str] = Field(default_factory=lambda: [...])
    naming_conventions: dict[str, str] = Field(default_factory=lambda: {...})
    directory_naming: str = "snake_case"
    max_step_message_length: int = 100
    min_action_word_percentage: float = 5.0
    unprofessional_patterns: list[str] = Field(default_factory=lambda: [...])
```

**Default Exclusions:**

```python
default_exclude_patterns = [
    "__pycache__/**", "*.pyc", ".pytest_cache/**",
    "node_modules/**", ".git/**", "dist/**", "build/**",
    ".venv/**", "venv/**", ".vibe/**", "coverage/**"
]
```

**Default Naming Conventions:**

```python
default_naming_conventions = {
    ".py": "snake_case",
    ".js": "camelCase",
    ".ts": "camelCase",
    ".vue": "PascalCase",
    ".jsx": "camelCase",
    ".tsx": "camelCase",
    ".md": "kebab-case",
    ".yaml": "kebab-case",
    ".yml": "kebab-case",
    ".json": "kebab-case"
}
```

## CLI Integration

### lint Command

Command-line interface for linting operations.

```bash
vibe lint [target] [options]
```

**Options:**

- `--format`: Output format (json, rich, summary)
- `--severity`: Filter by severity (error, warning, info)
- `--type`: Filter by issue type
- `--fix`: Apply automatic fixes where possible

**Implementation:**

```python
@click.command()
@click.argument("target", default=".")
@click.option("--format", default="rich", type=click.Choice(["json", "rich", "summary"]))
@click.option("--severity", type=click.Choice(["error", "warning", "info"]))
@click.option("--type", type=click.Choice(["naming_convention", "unprofessional_language", "emoji_usage"]))
def lint(target: str, format: str, severity: str | None, type: str | None) -> None:
    """Lint project for quality and naming issues."""
    try:
        config = VibeConfig.load_from_file()
        linter = ProjectLinter(config)

        report = linter.lint_project(target, format)

        # Filter results if specified
        if severity or type:
            report = _filter_report(report, severity, type)

        # Output results
        if format == "json":
            print(json.dumps(report, indent=2))
        elif format == "rich":
            _display_rich_report(report)
        else:  # summary
            _display_summary_report(report)

    except Exception as e:
        console.print(f"[red]Lint error: {e}[/red]")
        sys.exit(1)
```

## Usage Examples

### Basic Project Linting

```python
from vibe.config import VibeConfig
from vibe.lint import ProjectLinter

# Initialize linter
config = VibeConfig.load_from_file()
linter = ProjectLinter(config)

# Lint entire project
report = linter.lint_project(".", format="json")

print(f"Total issues: {report['total_issues']}")
for issue_type, count in report['issues_by_type'].items():
    print(f"  {issue_type}: {count}")
```

### Text-Only Linting

```python
# Lint specific text content
text = "This is totally awesome and super cool!"
issues = linter.text_linter.lint_text_content(text, context="step_message")

for issue in issues:
    print(f"{issue.severity}: {issue.message}")
    if issue.suggestion:
        print(f"  Suggestion: {issue.suggestion}")
```

### File-Specific Linting

```python
from pathlib import Path

# Lint specific file
file_path = Path("src/my_component.js")
naming_issues = linter.naming_linter.lint_file_naming(file_path)
content_issues = linter.text_linter.lint_file_content(file_path)
emoji_issues = linter.emoji_linter.lint_file_emoji(file_path)

all_issues = naming_issues + content_issues + emoji_issues
```

### Custom Configuration

```python
# Custom lint configuration
custom_config = LintConfig(
    max_step_message_length=150,
    min_action_word_percentage=10.0,
    exclude_patterns=["custom_cache/**", "temp/**"],
    naming_conventions={
        ".py": "snake_case",
        ".js": "camelCase",
        ".custom": "kebab-case"
    }
)

linter = ProjectLinter(VibeConfig(lint=custom_config))
```

## Error Handling

The lint system handles errors gracefully:

- **File Access Errors**: Skip inaccessible files, continue processing
- **Encoding Errors**: Handle non-UTF-8 files appropriately
- **Pattern Errors**: Validate regex patterns, provide clear error messages
- **Configuration Errors**: Use sensible defaults when configuration is invalid

## Performance Optimization

### Efficient File Processing

- **Parallel Processing**: Process multiple files concurrently
- **Exclusion Filtering**: Skip excluded files early in pipeline
- **Content Caching**: Cache file content for multiple analyzers
- **Pattern Compilation**: Compile regex patterns once and reuse

### Memory Management

- **Streaming Analysis**: Process large files in chunks
- **Result Batching**: Aggregate results efficiently
- **Cache Limits**: Limit in-memory caching for large projects

### Scalability

- **Incremental Analysis**: Only analyze changed files when possible
- **Plugin Architecture**: Allow custom linters and rules
- **Configuration Hierarchy**: Support project, user, and system-level configs
