"""Configuration management for vibe."""

from pathlib import Path
from typing import Literal

import yaml
from pydantic import BaseModel, Field

from .project_types import ProjectDetector


def _read_gitignore_patterns(project_root: Path) -> list[str]:
    """Read patterns from all .gitignore files in the project tree."""
    gitignore_files = _find_gitignore_files(project_root)
    all_patterns = []

    for gitignore_path, relative_dir in gitignore_files:
        patterns = _process_gitignore_file(gitignore_path, relative_dir)
        all_patterns.extend(patterns)

    return _remove_duplicate_patterns(all_patterns)


def _find_gitignore_files(project_root: Path) -> list[tuple[Path, str]]:
    """Find all .gitignore files in the project, excluding cache directories."""
    gitignore_files = []

    try:
        # Add root .gitignore
        root_gitignore = project_root / ".gitignore"
        if root_gitignore.exists():
            gitignore_files.append((root_gitignore, ""))

        # Find subdirectory .gitignore files
        for gitignore_path in project_root.rglob(".gitignore"):
            if gitignore_path != root_gitignore and _should_include_gitignore(
                gitignore_path, project_root
            ):
                rel_dir = gitignore_path.parent.relative_to(project_root)
                gitignore_files.append((gitignore_path, str(rel_dir)))
    except (OSError, ValueError):
        pass

    return gitignore_files


def _should_include_gitignore(gitignore_path: Path, project_root: Path) -> bool:
    """Check if a .gitignore file should be included (not in cache directories)."""
    rel_path = gitignore_path.relative_to(project_root)
    path_parts = rel_path.parts[:-1]  # exclude .gitignore filename

    skip_dirs = {
        "__pycache__",
        ".pytest_cache",
        ".mypy_cache",
        ".ruff_cache",
        "node_modules",
        "dist",
        "build",
        ".venv",
        "venv",
        "coverage",
        ".git",
        ".github",
    }
    return not any(part in skip_dirs for part in path_parts)


def _process_gitignore_file(gitignore_path: Path, relative_dir: str) -> list[str]:
    """Process a single .gitignore file and return its patterns."""
    patterns = []

    try:
        content = gitignore_path.read_text(encoding="utf-8")
        for line in content.split("\n"):
            line = line.strip()

            if _should_skip_line(line):
                continue

            pattern = _normalize_pattern(line, relative_dir)
            patterns.extend(_expand_pattern(pattern))

    except (OSError, UnicodeDecodeError):
        pass  # Skip unreadable .gitignore files

    return patterns


def _should_skip_line(line: str) -> bool:
    """Check if a gitignore line should be skipped."""
    if not line or line.startswith("#"):
        return True

    # Skip overly broad patterns that would exclude everything
    return line in ["*", "**", "*/**"]


def _normalize_pattern(line: str, relative_dir: str) -> str:
    """Normalize a gitignore pattern based on its location."""
    if relative_dir:
        # For subdirectory .gitignore, prefix patterns with the directory path
        if line.startswith("/"):
            # Absolute pattern (relative to .gitignore location)
            return f"{relative_dir}/{line[1:]}"
        else:
            # Relative pattern applies within that subdirectory
            return f"{relative_dir}/{line}"
    else:
        # Root .gitignore patterns
        return line[1:] if line.startswith("/") else line


def _expand_pattern(pattern: str) -> list[str]:
    """Expand a gitignore pattern to include directory variants."""
    patterns = []

    if pattern.endswith("/"):
        # Directory patterns
        dir_pattern = pattern[:-1]
        patterns.extend([dir_pattern, f"{dir_pattern}/**"])
    else:
        patterns.append(pattern)
        # For potential directories, also exclude contents
        if "." not in pattern.split("/")[-1] and "*" not in pattern:
            patterns.append(f"{pattern}/**")

    return patterns


def _remove_duplicate_patterns(all_patterns: list[str]) -> list[str]:
    """Remove duplicates while preserving order."""
    seen = set()
    unique_patterns = []
    for pattern in all_patterns:
        if pattern not in seen:
            seen.add(pattern)
            unique_patterns.append(pattern)
    return unique_patterns


class LintConfig(BaseModel):
    """Configuration for project linting."""

    # Language and tone linting
    check_emojis: bool = True
    check_professional_language: bool = True
    allow_informal_language: list[str] = Field(
        default_factory=lambda: ["*cli*", "*ui*", "*frontend*"]
    )

    # File naming conventions by extension
    naming_conventions: dict[str, Literal["snake_case", "camelCase", "kebab-case"]] = (
        Field(
            default_factory=lambda: {
                ".py": "snake_case",
                ".js": "camelCase",
                ".ts": "camelCase",
                ".vue": "kebab-case",
                ".yaml": "snake_case",
                ".yml": "snake_case",
                ".md": "kebab-case",
                ".json": "snake_case",
            }
        )
    )

    # Directory naming conventions
    directory_naming: Literal["snake_case", "camelCase", "kebab-case"] = "snake_case"

    # File patterns to exclude from linting
    exclude_patterns: list[str] = Field(
        default_factory=lambda: [
            "node_modules/**",
            ".git/**",
            "__pycache__/**",
            "*.pyc",
            ".venv/**",
            "venv/**",
            "dist/**",
            "build/**",
            ".next/**",
            "coverage/**",
        ]
    )

    # Text quality thresholds
    max_step_message_length: int = 100
    min_action_word_percentage: float = 5.0  # 5% minimum action words

    # Professional language patterns to flag
    unprofessional_patterns: list[str] = Field(
        default_factory=lambda: [
            # Removed 'super' to avoid conflicts with Python super()
            r"\b(awesome|cool|amazing|epic)\b",
            r"\b(gonna|wanna|gotta)\b",
            r"\b(omg|lol|btw|fyi)\b",
            r"!!+",  # Multiple exclamation marks
            r"\?\?+",  # Multiple question marks
        ]
    )


class WorkflowConfig(BaseModel):
    """Configuration for a specific workflow."""

    triggers: list[str] = Field(default_factory=list)
    steps: list[str] = Field(default_factory=list)  # Guidance steps (preferred)
    commands: list[str] = Field(default_factory=list)  # Legacy format, maps to steps
    description: str = ""
    dependencies: list[str] = Field(default_factory=list)

    def __post_init__(self) -> None:
        """Convert legacy commands to steps if needed."""
        # If commands are provided but steps are empty, use commands as steps
        if self.commands and not self.steps:
            self.steps = self.commands


class ProjectTypeConfig(BaseModel):
    """Configuration for a project type."""

    name: str
    detection_files: list[str] = Field(default_factory=list)
    workflows: dict[str, WorkflowConfig] = Field(default_factory=dict)


class SessionConfig(BaseModel):
    """Configuration for workflow session behavior."""

    ai_agent_prefix: bool = Field(
        default=True,
        description="Add prefixes to workflow steps for AI agent optimization",
    )
    ai_agent_suffix: bool = Field(
        default=True,
        description="Add suffix reminders to workflow steps for AI agent optimization",
    )


class VibeConfig(BaseModel):
    """Main vibe configuration."""

    project_type: str = "auto"
    workflows: dict[str, WorkflowConfig] = Field(default_factory=dict)
    project_types: dict[str, ProjectTypeConfig] = Field(default_factory=dict)
    lint: LintConfig = Field(default_factory=LintConfig)
    session: SessionConfig = Field(default_factory=SessionConfig)

    @classmethod
    def load_from_file(cls, config_path: Path | None = None) -> "VibeConfig":
        """Load configuration from file."""
        if config_path is None:
            config_path = cls._find_config_file()

        project_root = config_path.parent if config_path else Path.cwd()

        if config_path and config_path.exists():
            with open(config_path) as f:
                data = yaml.safe_load(f) or {}

            # Merge with defaults
            config = cls(**data)

            # Add gitignore patterns to lint exclude_patterns
            gitignore_patterns = _read_gitignore_patterns(project_root)
            # Add essential patterns that might not be in gitignore
            essential_patterns = [
                ".git",
                ".git/**",  # Git metadata
                ".github",
                ".github/**",  # GitHub workflows
                ".gitignore",  # Git ignore file itself
                ".gitattributes",  # Git attributes
            ]

            all_patterns = gitignore_patterns + essential_patterns

            if all_patterns:
                # Merge with existing exclude patterns, avoiding duplicates
                existing_patterns = set(config.lint.exclude_patterns)
                for pattern in all_patterns:
                    if pattern not in existing_patterns:
                        config.lint.exclude_patterns.append(pattern)

            config._load_defaults()
            return config

        # Return default config with gitignore patterns
        config = cls()
        gitignore_patterns = _read_gitignore_patterns(project_root)
        essential_patterns = [
            ".git",
            ".git/**",
            ".github",
            ".github/**",
            ".gitignore",
            ".gitattributes",
        ]
        all_patterns = gitignore_patterns + essential_patterns
        if all_patterns:
            config.lint.exclude_patterns.extend(all_patterns)
        config._load_defaults()
        return config

    @classmethod
    def _find_config_file(cls) -> Path | None:
        """Find vibe configuration file."""
        current_dir = Path.cwd()

        # Look for config files in current directory and parents
        for path in [current_dir] + list(current_dir.parents):
            for config_name in [".vibe.yaml", "vibe.yaml", ".vibe.yml", "vibe.yml"]:
                config_path = path / config_name
                if config_path.exists():
                    return config_path

        return None

    def _load_defaults(self) -> None:
        """Load default workflow and project type configurations."""
        # Merge default workflows (do not overwrite user-defined)
        default_workflows = self._get_default_workflows()
        if not self.workflows:
            self.workflows = default_workflows
        else:
            for key, wf in default_workflows.items():
                if key not in self.workflows:
                    self.workflows[key] = wf

        # Merge default project types and their workflows
        default_pt = self._get_default_project_types()
        if not self.project_types:
            self.project_types = default_pt
        else:
            for pt_name, pt_cfg in default_pt.items():
                if pt_name not in self.project_types:
                    self.project_types[pt_name] = pt_cfg
                else:
                    # Ensure default workflows exist for the project type
                    # without overriding
                    existing = self.project_types[pt_name]
                    for wf_name, wf_cfg in pt_cfg.workflows.items():
                        if wf_name not in existing.workflows:
                            existing.workflows[wf_name] = wf_cfg

    def _get_default_workflows(self) -> dict[str, WorkflowConfig]:
        """Get default workflow configurations."""
        return {
            "analysis": WorkflowConfig(
                triggers=[
                    "analyze",
                    "explore",
                    "understand",
                    "investigate",
                    "research",
                    "review",
                    "examine",
                    "study",
                ],
                description=(
                    "🔍 Codebase exploration, pattern identification, and research"
                ),
                commands=["echo 'Analyzing project structure...'"],
            ),
            "implementation": WorkflowConfig(
                triggers=[
                    "implement",
                    "add",
                    "create",
                    "build",
                    "develop",
                    "code",
                    "make",
                    "generate",
                    "fix",
                    "refactor",
                ],
                description="🛠️ Feature development, bug fixes, and code changes",
                dependencies=["analysis"],
            ),
            "testing": WorkflowConfig(
                triggers=[
                    "test",
                    "validate",
                    "check",
                    "verify",
                    "ensure",
                    "coverage",
                    "spec",
                    "unit",
                    "integration",
                    "e2e",
                ],
                description="🧪 Test execution, validation, and quality verification",
                dependencies=["implementation"],
            ),
            "documentation": WorkflowConfig(
                triggers=[
                    "document",
                    "explain",
                    "guide",
                    "readme",
                    "docs",
                    "adr",
                    "comment",
                    "describe",
                ],
                description="📚 Documentation updates, guides, and explanations",
            ),
            "quality": WorkflowConfig(
                triggers=[
                    "lint",
                    "format",
                    "type",
                    "audit",
                    "security",
                    "compliance",
                    "standards",
                    "quality",
                ],
                description="✨ Code quality, linting, formatting, and compliance",
                dependencies=["implementation"],
            ),
            "git": WorkflowConfig(
                triggers=[
                    "commit",
                    "push",
                    "pull",
                    "merge",
                    "branch",
                    "pr",
                    "git",
                    "repository",
                    "version",
                ],
                description=(
                    "🔄 Git operations, commits, PRs, and repository management"
                ),
            ),
            "mcp": WorkflowConfig(
                triggers=[
                    "context7",
                    "github.*mcp",
                    "playwright",
                    "sequential.*thinking",
                    "mcp.*tools",
                ],
                description="🤖 MCP tools integration and AI-enhanced workflows",
            ),
            "session": WorkflowConfig(
                triggers=[
                    "complete",
                    "finish",
                    "cleanup",
                    "session",
                    "workflow",
                    "orchestrat",
                ],
                description="🎯 Session management, completion, and cleanup",
            ),
        }

    def _get_default_project_types(self) -> dict[str, ProjectTypeConfig]:
        """Get default project type configurations."""
        return {
            "python": ProjectTypeConfig(
                name="python",
                detection_files=[
                    "pyproject.toml",
                    "setup.py",
                    "requirements.txt",
                    "Pipfile",
                ],
                workflows={
                    "testing": WorkflowConfig(
                        commands=["python -m pytest", "ruff check"]
                    ),
                    "quality": WorkflowConfig(commands=["ruff format", "mypy ."]),
                    "analysis": WorkflowConfig(
                        commands=["find . -name '*.py' -type f | head -20"]
                    ),
                },
            ),
            "vue_typescript": ProjectTypeConfig(
                name="vue_typescript",
                detection_files=["package.json", "vite.config.ts", "vue.config.js"],
                workflows={
                    "testing": WorkflowConfig(
                        commands=["bun run test", "bun run type-check"]
                    ),
                    "quality": WorkflowConfig(
                        commands=["bun run lint", "bun run format"]
                    ),
                    "analysis": WorkflowConfig(
                        commands=["find src/ -name '*.vue' -o -name '*.ts' | head -20"]
                    ),
                },
            ),
            "generic": ProjectTypeConfig(
                name="generic",
                detection_files=[],
                workflows={
                    "analysis": WorkflowConfig(
                        commands=["ls -la", "find . -type f -name '*.md' | head -10"]
                    ),
                    "git": WorkflowConfig(
                        commands=["git status", "git log --oneline -10"]
                    ),
                },
            ),
        }

    def detect_project_type(self, project_path: Path | None = None) -> str:
        """Detect project type based on intelligent analysis."""
        if self.project_type != "auto":
            return self.project_type

        if project_path is None:
            project_path = Path.cwd()

        # Use the intelligent project detector
        detector = ProjectDetector(str(project_path))
        return detector.detect_project_type()
