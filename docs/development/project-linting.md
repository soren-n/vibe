# Project Linting System

The Vibe project linting system provides comprehensive code quality checks for professional development projects. It analyzes file naming conventions, language professionalism, emoji usage, and text quality across your entire codebase.

## Features

### 🏷️ Naming Convention Checks
- **File naming**: Enforces conventions (snake_case, camelCase, kebab-case) based on file extensions
- **Directory naming**: Consistent directory naming throughout the project
- **Configurable rules**: Define conventions per file type in `.vibe.yaml`

### 💬 Language Quality Analysis
- **Professional language**: Detects informal expressions ("awesome", "gonna", "super")
- **Emoji detection**: Comprehensive Unicode emoji detection across all text
- **Text quality**: Length checks, readability analysis with TextDescriptives
- **Smart exclusions**: UI/CLI files can use emojis for user experience

### 🎯 Intelligent Filtering
- **High performance**: Efficiently filters ~30k files down to ~300 relevant checks in <5 seconds
- **Pre-filtering architecture**: Excludes files/directories BEFORE analysis, not after
- **Context-aware**: Different rules for different file types and contexts
- **Gitignore integration**: Automatically excludes files/directories from `.gitignore`
- **Smart exclusions**: Additional project-specific exclusions on top of gitignore
- **UI file recognition**: Preserves emoji usage in user-facing interfaces

## Usage

### Command Line Interface

```bash
# Lint entire project
vibe lint project

# Lint with filters
vibe lint project --severity=warning --type=emoji_usage

# Different output formats
vibe lint project --format=summary
vibe lint project --format=json

# Lint specific text
vibe lint text "This is awesome! 😀"

# Context-specific linting
vibe lint text "Long workflow step message..." --context=step_message
```

### Configuration

Add to your `.vibe.yaml`:

```yaml
lint:
  # Language and tone settings
  check_emojis: true
  check_professional_language: true
  allow_informal_language:
    - "**/cli/**"          # CLI interface files can use emojis and informal language
    - "**/ui/**"           # UI components can use emojis for user experience
    - "**/frontend/**"     # Frontend files can use emojis
    - "docs/**"            # Documentation files can use emojis for readability
    - "scripts/**"         # Utility scripts can contain user-facing emojis
    - "README.md"          # Project documentation can use emojis for clarity

  # File naming conventions by extension
  naming_conventions:
    ".py": "snake_case"
    ".js": "camelCase"
    ".ts": "camelCase"
    ".yaml": "kebab-case"  # Standard for config files
    ".md": "kebab-case"

  # Directory naming
  directory_naming: "snake_case"

  # Additional exclusion patterns (beyond .gitignore)
  exclude_patterns:
    - "vibe/workflows/data/**"  # User-facing workflow definitions
    - "tests/**"               # Test files with examples
    - "debug_*.py"             # Debug utilities

  # Quality thresholds
  max_step_message_length: 100
  min_action_word_percentage: 5.0

  # Custom unprofessional patterns
  unprofessional_patterns:
    - "\\b(awesome|cool|super)\\b"
    - "\\b(gonna|wanna|gotta)\\b"
    - "!!+"
```

## Configuration Strategy

### Automatic Gitignore Integration

The linting system automatically reads your `.gitignore` file(s) and excludes those patterns from linting. This includes both the root `.gitignore` and any subdirectory `.gitignore` files throughout your project tree.

**Automatically excluded:**
- All patterns from root `.gitignore` (build dirs, dependencies, caches, etc.)
- All patterns from subdirectory `.gitignore` files (e.g., `frontend/.gitignore`, `docs/.gitignore`)
- Git metadata (`.git/`, `.github/`, `.gitignore`, `.gitattributes`)
- Cache directories are intelligently skipped to avoid overly broad exclusion patterns

**Manual exclusions needed only for:**
- Project-specific naming conventions (e.g., legacy modules with different styles)
- External code/dependencies that follow different conventions
- Generated files that aren't in `.gitignore` but shouldn't be linted

```yaml
lint:
  # Only specify exclusions that .gitignore doesn't cover
  exclude_patterns:
    - "mcp-server/**"       # JavaScript subproject
    - "legacy-code/**"      # Old code with different conventions
    - "*.generated.*"       # Generated files
```

## Examples

### Naming Convention Issues
```bash
$ vibe lint project --type=naming_convention

📝 [WARNING] File name 'badCamelCase' doesn't follow snake_case convention for .py files
   📁 src/badCamelCase.py
   💡 Consider renaming to: bad_camel_case.py
```

### Language Quality Issues
```bash
$ vibe lint text "This is awesome! We gonna make it super cool!"

┏━━━━━━━━━━━━━━━━┳━━━━━━━━━━┳━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓
┃ Type           ┃ Severity ┃ Message                                 ┃
┡━━━━━━━━━━━━━━━━╇━━━━━━━━━━╇━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┩
│ unprofessional │ info     │ Potentially unprofessional language:   │
│                │          │ 'awesome'                               │
│ unprofessional │ info     │ Potentially unprofessional language:   │
│                │          │ 'gonna'                                 │
└────────────────┴──────────┴─────────────────────────────────────────┘
```

## Integration with TextDescriptives

When `textdescriptives` is installed, the linting system provides enhanced analysis:

- **Readability scoring**: Automated text complexity analysis
- **Quality metrics**: Advanced linguistic pattern detection
- **Graceful fallback**: Works without TextDescriptives installed

## Best Practices

### For Professional Projects
1. **Enable all checks**: Use comprehensive linting for client/production code
2. **Consistent naming**: Stick to one convention per file type
3. **Clean language**: Avoid informal expressions in professional contexts

### For UI/UX Code
1. **Strategic exclusions**: Allow emojis in CLI output and user interfaces
2. **Context awareness**: Different rules for user-facing vs. internal code
3. **Balance professionalism**: Maintain code quality while preserving user experience

### For Documentation
1. **Clarity over formality**: Allow some informal language in README files
2. **Emoji moderation**: Use emojis sparingly in technical documentation
3. **Consistent style**: Establish and follow project-wide documentation standards

## Architecture

The linting system consists of specialized components:

- **`NamingConventionLinter`**: File and directory naming analysis
- **`LanguageLinter`**: Text professionalism and emoji detection
- **`TextQualityLinter`**: Advanced text analysis with optional TextDescriptives
- **`ProjectLinter`**: Main orchestrator coordinating all linters

Each component operates independently and can be configured separately, allowing fine-grained control over code quality standards.
