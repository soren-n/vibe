# Cross-Platform Compatibility

Vibe is designed to work across Windows, macOS, and Linux. This document outlines how we ensure compatibility and how users can expect Vibe to behave on different platforms.

## Platform-Agnostic Design Philosophy

Vibe workflows provide **guidance** rather than exact commands. This approach allows AI agents to adapt the suggestions to their specific platform and environment.

### Example Transformations

| Generic Guidance (Vibe) | Windows Command | Unix/macOS Command |
|-------------------------|----------------|-------------------|
| "Find Python files in project" | `Get-ChildItem -Recurse -Include "*.py"` | `find . -name "*.py"` |
| "Count files matching pattern" | `(Get-ChildItem -Recurse -Include "*.py").Count` | `find . -name "*.py" \| wc -l` |
| "Activate virtual environment" | `.venv\Scripts\activate` | `source .venv/bin/activate` |
| "List directory contents" | `dir` or `Get-ChildItem` | `ls` |

## Workflow Design Principles

### ✅ Platform-Agnostic Patterns

- **Descriptive guidance**: "Find files matching pattern X"
- **Tool-agnostic commands**: Use `uv`, `git`, `python` (these work everywhere)
- **Relative paths**: Use `/` separators (Python and most tools handle this)
- **Generic descriptions**: "Use your platform's file search capabilities"

### ❌ Platform-Specific Patterns (Avoided)

- **Direct Unix commands**: `find . -name "*.py" | head -20`
- **Shell-specific features**: Complex pipe chains, grep patterns
- **Hard-coded path separators**: `\` or assumptions about `/`
- **OS-specific tools**: `ls`, `cat`, `grep` when not essential

## Python Code Compatibility

Vibe's Python codebase uses cross-platform patterns:

- **pathlib.Path** instead of os.path for all file operations
- **shutil.which()** for cross-platform executable detection
- **subprocess.run()** with careful argument handling
- **Relative imports** and proper package structure

## Environment Detection

Vibe automatically detects:
- Python executable location (`python` vs `python3`)
- Virtual environment activation methods
- Available package managers (`uv`, `pip`, `conda`)
- Platform-appropriate tool alternatives

## Agent Implementation Guidelines

When implementing Vibe workflows, AI agents should:

1. **Translate generic guidance** to platform-specific commands
2. **Use available tools** (prefer `uv` over `pip`, etc.)
3. **Handle path separators** appropriately for the platform
4. **Check tool availability** before using platform-specific commands

## Testing Strategy

Vibe is tested on:
- **macOS** (primary development platform)
- **Linux** (CI/CD pipelines)
- **Windows** (community testing and validation)

## Known Platform Differences

### Virtual Environment Activation
- **Windows**: `.venv\Scripts\activate.bat` or `.venv\Scripts\Activate.ps1`
- **Unix/macOS**: `source .venv/bin/activate`

### Path Handling
- **Windows**: Supports both `/` and `\`, case-insensitive
- **Unix/macOS**: Forward slashes only, case-sensitive

### Shell Differences
- **Windows**: PowerShell, Command Prompt, Git Bash
- **Unix/macOS**: bash, zsh, fish
- **Solution**: Vibe provides guidance, not exact shell commands

## Contributing Cross-Platform Improvements

When contributing to Vibe:

1. **Test on multiple platforms** when possible
2. **Use descriptive guidance** instead of exact commands in workflows
3. **Leverage Python's pathlib** for file operations
4. **Document platform-specific considerations**

## Future Enhancements

- **Platform detection**: Automatically suggest platform-appropriate commands
- **Tool availability checking**: Warn when platform-specific tools are missing
- **Environment-aware workflows**: Adapt suggestions based on detected environment
