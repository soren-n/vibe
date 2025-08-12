"""Project linting system for vibe."""

import re
from dataclasses import dataclass
from pathlib import Path
from typing import Any, TypedDict

from .config import LintConfig, VibeConfig


class LintReport(TypedDict):
    """Type for lint report structure."""

    total_issues: int
    issues_by_type: dict[str, int]
    issues_by_severity: dict[str, int]
    files_with_issues: list[str]
    suggestions: list[str]


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


class NamingConventionLinter:
    """Lints file and directory naming conventions."""

    def __init__(self, config: LintConfig):
        self.config = config

    def lint_file_naming(
        self, file_path: Path, skip_exclusion_check: bool = False
    ) -> list[LintIssue]:
        """Check if file follows naming convention for its extension."""
        issues: list[LintIssue] = []

        # Skip exclusion check if already done upstream
        if not skip_exclusion_check and self._should_exclude(file_path):
            return issues

        extension = file_path.suffix.lower()
        if extension not in self.config.naming_conventions:
            return issues

        expected_convention = self.config.naming_conventions[extension]
        file_stem = file_path.stem

        if not self._follows_convention(file_stem, expected_convention):
            suggestion = self._convert_to_convention(file_stem, expected_convention)
            issues.append(
                LintIssue(
                    file_path=file_path,
                    issue_type="naming_convention",
                    severity="warning",
                    message=(
                        f"File name '{file_stem}' doesn't follow "
                        f"{expected_convention} convention for {extension} files"
                    ),
                    suggestion=f"Consider renaming to: {suggestion}{extension}",
                )
            )

        return issues

    def lint_directory_naming(
        self, dir_path: Path, skip_exclusion_check: bool = False
    ) -> list[LintIssue]:
        """Check if directory follows naming convention."""
        issues: list[LintIssue] = []

        # Skip exclusion check if already done upstream
        if not skip_exclusion_check and self._should_exclude(dir_path):
            return issues

        dir_name = dir_path.name
        convention = self.config.directory_naming

        if not self._follows_convention(dir_name, convention):
            suggestion = self._convert_to_convention(dir_name, convention)
            issues.append(
                LintIssue(
                    file_path=dir_path,
                    issue_type="naming_convention",
                    severity="warning",
                    message=(
                        f"Directory name '{dir_name}' doesn't follow "
                        f"{convention} convention"
                    ),
                    suggestion=f"Consider renaming to: {suggestion}",
                )
            )

        return issues

    def _should_exclude(self, path: Path) -> bool:
        """Check if path should be excluded from linting."""
        import fnmatch

        # Convert path to string relative to current directory for pattern matching
        try:
            relative_path = path.relative_to(Path.cwd())
            path_str = str(relative_path)
        except ValueError:
            path_str = str(path)

        for pattern in self.config.exclude_patterns:
            # Handle different types of gitignore patterns
            if fnmatch.fnmatch(path_str, pattern):
                return True
            if fnmatch.fnmatch(str(path.name), pattern):
                return True
            # Check if any parent directory matches
            for parent in path.parents:
                try:
                    parent_relative = parent.relative_to(Path.cwd())
                    if fnmatch.fnmatch(str(parent_relative), pattern):
                        return True
                    if fnmatch.fnmatch(parent.name, pattern):
                        return True
                except ValueError:
                    if fnmatch.fnmatch(parent.name, pattern):
                        return True
        return False

    def _follows_convention(self, name: str, convention: str) -> bool:
        """Check if name follows the specified convention."""
        if convention == "snake_case":
            return re.match(r"^[a-z][a-z0-9_]*$", name) is not None
        elif convention == "camelCase":
            return re.match(r"^[a-z][a-zA-Z0-9]*$", name) is not None
        elif convention == "kebab-case":
            return re.match(r"^[a-z][a-z0-9-]*$", name) is not None
        return True

    def _convert_to_convention(self, name: str, convention: str) -> str:
        """Convert name to follow the specified convention."""
        # First, normalize to words
        words = re.findall(r"[A-Z]*[a-z]+|[A-Z]+(?=[A-Z][a-z]|\b)|[0-9]+", name)
        words = [word.lower() for word in words if word]

        if convention == "snake_case":
            return "_".join(words)
        elif convention == "camelCase":
            if not words:
                return name
            return words[0] + "".join(word.capitalize() for word in words[1:])
        elif convention == "kebab-case":
            return "-".join(words)
        return name


class LanguageLinter:
    """Lints source code for professional language and emoji usage."""

    def __init__(self, config: LintConfig):
        self.config = config

        # Compile patterns for performance
        # Use a more comprehensive emoji pattern that catches common emojis
        self.emoji_pattern = re.compile(
            r"[\U0001F600-\U0001F64F]|"  # emoticons
            r"[\U0001F300-\U0001F5FF]|"  # symbols & pictographs
            r"[\U0001F680-\U0001F6FF]|"  # transport & map symbols
            r"[\U0001F1E0-\U0001F1FF]|"  # flags (iOS)
            r"[\U00002600-\U000027BF]|"  # miscellaneous symbols
            r"[\U0001F900-\U0001F9FF]|"  # supplemental symbols and pictographs
            r"[🔍📁📋👀🌐🔒📈📖✨⚡🤖🔧✅🔗🎯📦🔑🏪🔐🚀📝📚🧪⚙️🔤🧹🛠️🔄⚠️]"
        )
        self.unprofessional_patterns = [
            re.compile(pattern, re.IGNORECASE)
            for pattern in self.config.unprofessional_patterns
        ]

    def lint_file_content(
        self, file_path: Path, skip_exclusion_check: bool = False
    ) -> list[LintIssue]:
        """Lint file content for language issues."""
        issues: list[LintIssue] = []

        # Skip exclusion check if already done upstream
        if not skip_exclusion_check and self._should_exclude(file_path):
            return issues

        try:
            content = file_path.read_text(encoding="utf-8")
        except (UnicodeDecodeError, OSError):
            return issues

        lines = content.split("\n")

        for line_num, line in enumerate(lines, 1):
            issues.extend(self._check_line(file_path, line, line_num))

        return issues

    def _check_line(self, file_path: Path, line: str, line_num: int) -> list[LintIssue]:
        """Check a single line for language issues."""
        issues = []

        # Check for emojis
        if self.config.check_emojis:
            emoji_matches = list(self.emoji_pattern.finditer(line))
            for match in emoji_matches:
                issues.append(
                    LintIssue(
                        file_path=file_path,
                        issue_type="emoji_usage",
                        severity="warning",
                        message=f"Emoji '{match.group()}' found in source code",
                        line_number=line_num,
                        column=match.start(),
                        suggestion="Consider using descriptive text instead "
                        "of emojis for professional code",
                    )
                )

        # Check for unprofessional language
        if self.config.check_professional_language:
            for pattern in self.unprofessional_patterns:
                matches = list(pattern.finditer(line))
                for match in matches:
                    issues.append(
                        LintIssue(
                            file_path=file_path,
                            issue_type="unprofessional_language",
                            severity="info",
                            message=f"Potentially unprofessional language: "
                            f"'{match.group()}'",
                            line_number=line_num,
                            column=match.start(),
                            suggestion="Consider using more formal language "
                            "in professional code",
                        )
                    )

        return issues

    def _should_exclude(self, path: Path) -> bool:
        """Check if path should be excluded from language linting."""
        path_str = self._get_relative_path_string(path)

        # Check general exclude patterns
        if self._matches_exclude_patterns(path, path_str):
            return True

        # Check patterns for files that can use informal language and emojis
        if self._matches_informal_patterns(path, path_str):
            return True

        return False

    def _get_relative_path_string(self, path: Path) -> str:
        """Get the relative path string for pattern matching."""
        try:
            relative_path = path.relative_to(Path.cwd())
            return str(relative_path)
        except ValueError:
            return str(path)

    def _matches_exclude_patterns(self, path: Path, path_str: str) -> bool:
        """Check if path matches any general exclude patterns."""
        import fnmatch

        for pattern in self.config.exclude_patterns:
            if self._path_matches_pattern(path, path_str, pattern, fnmatch):
                return True
        return False

    def _matches_informal_patterns(self, path: Path, path_str: str) -> bool:
        """Check if path matches patterns allowing informal language."""
        import fnmatch

        for pattern in self.config.allow_informal_language:
            if self._path_matches_pattern(path, path_str, pattern, fnmatch):
                return True
        return False

    def _path_matches_pattern(
        self, path: Path, path_str: str, pattern: str, fnmatch: Any
    ) -> bool:
        """Check if a path matches a specific pattern."""
        # Check full path
        if fnmatch.fnmatch(path_str, pattern):
            return True

        # Check filename only
        if fnmatch.fnmatch(str(path.name), pattern):
            return True

        # Check parent directories
        return self._parent_matches_pattern(path, pattern, fnmatch)

    def _parent_matches_pattern(self, path: Path, pattern: str, fnmatch: Any) -> bool:
        """Check if any parent directory matches the pattern."""
        for parent in path.parents:
            try:
                parent_relative = parent.relative_to(Path.cwd())
                if fnmatch.fnmatch(str(parent_relative), pattern):
                    return True
                if fnmatch.fnmatch(parent.name, pattern):
                    return True
            except ValueError:
                if fnmatch.fnmatch(parent.name, pattern):
                    return True
        return False


class TextQualityLinter:
    """Lints text quality using TextDescriptives if available."""

    def __init__(self, config: LintConfig):
        self.config = config
        self.textdescriptives_available = False

        try:
            import spacy  # type: ignore
            import textdescriptives as td  # type: ignore

            self.nlp = spacy.load("en_core_web_sm")
            # Add textdescriptives pipeline
            td.add_to_pipe(self.nlp, "quality")
            self.textdescriptives_available = True
        except (ImportError, OSError):
            pass

    def lint_text_quality(
        self, text: str, context: str = "general"
    ) -> list[dict[str, Any]]:
        """Analyze text quality and return metrics."""
        issues = []

        # Run all quality checks
        issues.extend(self._check_text_length(text, context))
        issues.extend(self._check_professional_language(text))
        issues.extend(self._check_emoji_usage(text))
        issues.extend(self._check_text_readability(text))

        return issues

    def _check_text_length(self, text: str, context: str) -> list[dict[str, Any]]:
        """Check if text length exceeds recommended limits."""
        issues: list[dict[str, Any]] = []

        if (
            len(text) > self.config.max_step_message_length
            and context == "step_message"
        ):
            issues.append(
                {
                    "type": "length",
                    "severity": "warning",
                    "message": f"Text length ({len(text)}) exceeds "
                    f"recommended maximum "
                    f"({self.config.max_step_message_length})",
                    "suggestion": "Consider breaking into shorter, "
                    "more focused statements",
                }
            )

        return issues

    def _check_professional_language(self, text: str) -> list[dict[str, Any]]:
        """Check for unprofessional language patterns."""
        issues: list[dict[str, Any]] = []

        if not self.config.check_professional_language:
            return issues

        import re

        for pattern_str in self.config.unprofessional_patterns:
            pattern = re.compile(pattern_str, re.IGNORECASE)
            matches = list(pattern.finditer(text))
            for match in matches:
                issues.append(
                    {
                        "type": "unprofessional_language",
                        "severity": "info",
                        "message": f"Potentially unprofessional language: "
                        f"'{match.group()}'",
                        "suggestion": "Consider using more formal language",
                    }
                )

        return issues

    def _check_emoji_usage(self, text: str) -> list[dict[str, Any]]:
        """Check for emoji usage in text."""
        issues: list[dict[str, Any]] = []

        if not self.config.check_emojis:
            return issues

        import re

        # Use comprehensive emoji pattern
        emoji_pattern = re.compile(
            r"[\U0001F600-\U0001F64F]|"  # emoticons
            r"[\U0001F300-\U0001F5FF]|"  # symbols & pictographs
            r"[\U0001F680-\U0001F6FF]|"  # transport & map symbols
            r"[\U0001F1E0-\U0001F1FF]|"  # flags (iOS)
            r"[\U00002600-\U000027BF]|"  # miscellaneous symbols
            r"[\U0001F900-\U0001F9FF]|"  # supplemental symbols and pictographs
            r"[🔍📁📋👀🌐🔒📈📖✨⚡🤖🔧✅🔗🎯📦🔑🏪🔐🚀📝📚🧪⚙️🔤🧹🛠️🔄⚠️]"
        )
        emoji_matches = list(emoji_pattern.finditer(text))
        for match in emoji_matches:
            issues.append(
                {
                    "type": "emoji_usage",
                    "severity": "warning",
                    "message": f"Emoji '{match.group()}' found in text",
                    "suggestion": "Consider using descriptive text instead "
                    "of emojis for professional communication",
                }
            )

        return issues

    def _check_text_readability(self, text: str) -> list[dict[str, Any]]:
        """Check text readability using TextDescriptives if available."""
        issues: list[dict[str, Any]] = []

        if not self.textdescriptives_available:
            return issues

        try:
            doc = self.nlp(text)

            # Extract quality metrics
            quality_score = getattr(doc._, "quality", 0)
            if quality_score < 0.5:  # Arbitrary threshold
                issues.append(
                    {
                        "type": "readability",
                        "severity": "info",
                        "message": f"Text readability score "
                        f"({quality_score:.2f}) could be improved",
                        "suggestion": "Consider simplifying sentence "
                        "structure and word choice",
                    }
                )
        except Exception:
            pass  # Fallback gracefully

        return issues


class ProjectLinter:
    """Main project linting orchestrator."""

    def __init__(self, config: LintConfig | None = None):
        if config is None:
            vibe_config = VibeConfig.load_from_file()
            config = vibe_config.lint

        self.config = config
        self.naming_linter = NamingConventionLinter(config)
        self.language_linter = LanguageLinter(config)
        self.text_quality_linter = TextQualityLinter(config)

    def lint_project(self, project_path: Path | None = None) -> list[LintIssue]:
        """Lint entire project and return all issues found."""
        if project_path is None:
            project_path = Path.cwd()

        issues = []

        # Build a set of excluded directories for fast lookup
        excluded_dirs = self._build_excluded_dirs(project_path)

        # Pre-filter files and directories to avoid redundant exclusion checks
        for item in project_path.rglob("*"):
            # Fast check: skip if any parent is in excluded_dirs
            if any(parent in excluded_dirs for parent in item.parents):
                continue

            # Skip if excluded by patterns - use language linter for exclusions
            if self.language_linter._should_exclude(item):
                continue

            if item.is_file():
                # Check file naming (skip exclusion check since we already did it)
                issues.extend(
                    self.naming_linter.lint_file_naming(item, skip_exclusion_check=True)
                )

                # Check file content for language issues (with file type filter)
                if item.suffix in [".py", ".js", ".ts", ".vue", ".yaml", ".yml", ".md"]:
                    issues.extend(
                        self.language_linter.lint_file_content(
                            item, skip_exclusion_check=True
                        )
                    )

            elif item.is_dir():
                # Check directory naming (skip exclusion check since we already did it)
                issues.extend(
                    self.naming_linter.lint_directory_naming(
                        item, skip_exclusion_check=True
                    )
                )

        return issues

    def _build_excluded_dirs(self, project_path: Path) -> set[Path]:
        """Build a set of directories that should be completely excluded."""
        import fnmatch

        excluded_dirs = set()

        # Common patterns that represent entire directories to skip
        dir_patterns = [
            ".venv",
            "node_modules",
            "__pycache__",
            ".git",
            "dist",
            "build",
            ".tox",
            ".coverage",
            ".pytest_cache",
        ]

        # Add patterns from config that look like directory patterns
        for pattern in self.config.exclude_patterns:
            if pattern.endswith("/**") or pattern in dir_patterns:
                dir_patterns.append(pattern.rstrip("/**"))

        # Find all directories matching these patterns
        for item in project_path.rglob("*"):
            if item.is_dir():
                for pattern in dir_patterns:
                    if fnmatch.fnmatch(item.name, pattern) or fnmatch.fnmatch(
                        str(item.relative_to(project_path)), pattern
                    ):
                        excluded_dirs.add(item)
                        break

        return excluded_dirs

    def _should_exclude_fast(self, path: Path) -> bool:
        """Fast exclusion check for remaining patterns."""
        import fnmatch

        # Only check file-level patterns, not directory patterns
        file_patterns = []
        for pattern in self.config.exclude_patterns:
            if not pattern.endswith("/**") and "*/" not in pattern:
                file_patterns.append(pattern)

        try:
            relative_path = path.relative_to(Path.cwd())
            path_str = str(relative_path)
        except ValueError:
            path_str = str(path)

        for pattern in file_patterns:
            if fnmatch.fnmatch(path_str, pattern) or fnmatch.fnmatch(
                str(path.name), pattern
            ):
                return True

        return False

    def lint_text(self, text: str, context: str = "general") -> list[dict[str, Any]]:
        """Lint text quality and return suggestions."""
        return self.text_quality_linter.lint_text_quality(text, context)

    def generate_report(self, issues: list[LintIssue]) -> LintReport:
        """Generate a comprehensive linting report."""
        report: LintReport = {
            "total_issues": len(issues),
            "issues_by_type": {},
            "issues_by_severity": {},
            "files_with_issues": [],
            "suggestions": [],
        }
        files_with_issues: set[str] = set()

        for issue in issues:
            # Count by type
            issue_type = issue.issue_type
            if issue_type not in report["issues_by_type"]:
                report["issues_by_type"][issue_type] = 0
            report["issues_by_type"][issue_type] += 1

            # Count by severity
            severity = issue.severity
            if severity not in report["issues_by_severity"]:
                report["issues_by_severity"][severity] = 0
            report["issues_by_severity"][severity] += 1

            # Track files with issues
            files_with_issues.add(str(issue.file_path))

            # Collect suggestions
            if issue.suggestion:
                report["suggestions"].append(issue.suggestion)

        # Convert set to list for JSON serialization
        report["files_with_issues"] = list(files_with_issues)

        return report
