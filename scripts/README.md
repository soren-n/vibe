# Emoji Check Script

The `scripts/check-emojis.py` script enforces code quality standards by preventing emoji usage in source code files.

## Purpose

This script ensures that no emojis escape into source code, maintaining professional coding standards and preventing potential encoding issues across different platforms and tools.

## Features

- **Comprehensive emoji detection**: Uses Unicode ranges to detect all types of emojis
- **File type filtering**: Only checks source code files (skips documentation, text files)
- **Exclude patterns**: Supports glob patterns to exclude specific file types
- **Git integration**: Works with staged files in pre-commit hooks

## Usage

### Command Line

```bash
# Check current directory
uv run python scripts/check-emojis.py

# Check specific directory
uv run python scripts/check-emojis.py src/

# Exclude certain file types
uv run python scripts/check-emojis.py --exclude "*.md" --exclude "*.txt" .

# Verbose output
uv run python scripts/check-emojis.py --verbose src/
```

### Git Integration

The script is automatically run during pre-commit hooks via husky. It will:

1. Extract staged file content to temporary directory
2. Run emoji check on staged content only
3. Fail the commit if emojis are found in source code
4. Allow commits if only documentation files contain emojis

## Supported File Types

The script checks these source code file extensions:

- Rust: `.rs`
- Config: `.toml`, `.json`, `.yml`, `.yaml`
- Scripts: `.sh`, `.py`
- Web: `.js`, `.ts`, `.html`, `.css`, `.xml`, `.svg`
- Systems: `.c`, `.cpp`, `.h`, `.hpp`, `.java`, `.go`
- Other: `.rb`, `.php`, `.swift`, `.kt`

## Exit Codes

- `0`: No emojis found or only found in excluded files
- `1`: Emojis found in source code files

## Integration

This script is integrated into the development workflow via:

- **Husky pre-commit hook**: Automatically runs on `git commit`
- **UV Python environment**: Uses isolated Python environment for execution
- **Selective checking**: Only scans staged files for efficient operation
