"""Quality tools for YAML workflow files (validation and normalization)."""

from __future__ import annotations

from collections import OrderedDict
from pathlib import Path
from typing import Any

import yaml

try:
    import spacy

    # Cache spaCy pipeline for efficiency
    _nlp_pipeline = None

    def _get_nlp_pipeline() -> Any | None:
        global _nlp_pipeline
        if _nlp_pipeline is None:
            try:
                _nlp_pipeline = spacy.load("en_core_web_sm")
                _nlp_pipeline.add_pipe(
                    "textdescriptives/emoji", config={"remove_emoji": False}
                )
                _nlp_pipeline.add_pipe("textdescriptives/readability")
            except (OSError, ImportError):
                # Fallback if model not available
                _nlp_pipeline = spacy.blank("en")
                try:
                    _nlp_pipeline.add_pipe(
                        "textdescriptives/emoji", config={"remove_emoji": False}
                    )
                except Exception:
                    pass
        return _nlp_pipeline

    HAS_TEXTDESCRIPTIVES = True
except ImportError:
    HAS_TEXTDESCRIPTIVES = False

    def _get_nlp_pipeline() -> Any | None:
        return None


try:  # Runtime-safe imports; avoid type resolution issues in some analyzers
    from yaml.nodes import MappingNode as _MappingNode
    from yaml.nodes import Node as _Node
    from yaml.nodes import ScalarNode as _ScalarNode
    from yaml.nodes import SequenceNode as _SequenceNode
except Exception:  # pragma: no cover
    _MappingNode = type("MappingNode", (), {})  # type: ignore
    _ScalarNode = type("ScalarNode", (), {})  # type: ignore
    _SequenceNode = type("SequenceNode", (), {})  # type: ignore
    _Node = object  # type: ignore


DATA_DIR = Path(__file__).parent / "data"

# Allowed keys in workflow YAMLs (others are preserved but flagged unless whitelisted)
ALLOWED_KEYS = {
    "name",
    "description",
    "triggers",
    "steps",
    "dependencies",
    "project_types",
    "conditions",
    # Legacy supported during migration
    "commands",
}

# Extra keys that are allowed in specific cases (metadata used by docs/UX)
ALLOWED_EXTRA_KEYS = {"display_name", "category", "guidance"}


def _iter_yaml_files(root: Path | None) -> list[Path]:
    base = root or DATA_DIR
    return sorted(p for p in base.rglob("*.yaml") if p.is_file())


def _collect_duplicate_keys_from_text(text: str) -> list[str]:
    """Return a flat list of duplicate mapping keys found via YAML AST traversal."""
    try:
        root_node = yaml.compose(text)
    except yaml.YAMLError:
        return []

    def _walk(node: Any | None) -> list[str]:
        if node is None:
            return []
        dups: list[str] = []
        if isinstance(node, _MappingNode):
            seen: set[str] = set()
            for key_node, value_node in node.value:
                key_str = (
                    key_node.value
                    if isinstance(key_node, _ScalarNode)
                    else str(key_node)
                )
                if key_str in seen:
                    dups.append(key_str)
                else:
                    seen.add(key_str)
                dups.extend(_walk(value_node))
        elif isinstance(node, _SequenceNode):
            for item in node.value:
                dups.extend(_walk(item))
        return dups

    return _walk(root_node)


def _load_yaml(path: Path) -> tuple[dict[str, Any] | None, str | None]:
    try:
        text = path.read_text(encoding="utf-8")
    except UnicodeDecodeError as e:
        return None, f"{path}: not UTF-8 encoded ({e})"

    try:
        data = yaml.safe_load(text)
    except yaml.YAMLError as e:
        return None, f"{path}: YAML parse error: {e}"

    if not isinstance(data, dict):
        return None, f"{path}: YAML root must be a mapping/object"

    return data, None


def _analyze_text_quality(message: str) -> dict[str, Any]:
    """Analyze text quality using built-in Python features."""
    import re

    # Basic metrics
    words = message.split()
    sentences = re.split(r"[.!?]+", message)
    sentences = [s.strip() for s in sentences if s.strip()]

    # Word complexity (average syllables per word - rough estimate)
    def count_syllables(word: str) -> int:
        vowels = "aeiouyAEIOUY"
        word = re.sub(r"[^a-zA-Z]", "", word)
        if len(word) <= 3:
            return 1
        syllable_count = 0
        prev_was_vowel = False
        for char in word:
            is_vowel = char in vowels
            if is_vowel and not prev_was_vowel:
                syllable_count += 1
            prev_was_vowel = is_vowel
        return max(1, syllable_count)

    syllables = sum(count_syllables(word) for word in words)
    avg_syllables_per_word = syllables / len(words) if words else 0

    # Simple readability estimate (Flesch formula approximation)
    avg_sentence_length = len(words) / len(sentences) if sentences else 0

    # Action word detection (commands/verbs)
    action_words = {
        "run",
        "execute",
        "create",
        "build",
        "install",
        "configure",
        "setup",
        "check",
        "verify",
        "validate",
        "test",
        "deploy",
        "update",
        "add",
        "remove",
        "delete",
        "modify",
        "edit",
        "start",
        "stop",
        "restart",
        "enable",
        "disable",
        "activate",
        "deactivate",
        "load",
        "save",
        "download",
        "upload",
        "sync",
        "backup",
        "restore",
        "clean",
        "fix",
    }

    first_word = words[0].lower().strip("`*.,()[]{}:;!?") if words else ""
    starts_with_action = first_word in action_words

    return {
        "word_count": len(words),
        "sentence_count": len(sentences),
        "avg_syllables_per_word": avg_syllables_per_word,
        "avg_sentence_length": avg_sentence_length,
        "starts_with_action": starts_with_action,
        "complexity_score": avg_syllables_per_word * avg_sentence_length,
    }


def _manual_emoji_detection(message: str) -> bool:
    """Fallback emoji detection using Unicode ranges."""
    emoji_ranges = [
        (0x1F600, 0x1F64F),  # Emoticons
        (0x1F300, 0x1F5FF),  # Misc symbols
        (0x1F680, 0x1F6FF),  # Transport symbols
        (0x1F1E0, 0x1F1FF),  # Regional indicators
        (0x2600, 0x26FF),  # Misc symbols
        (0x2700, 0x27BF),  # Dingbats
        (0xFE00, 0xFE0F),  # Variation selectors
        (0x1F900, 0x1F9FF),  # Supplemental symbols
    ]

    return any(
        any(start <= ord(char) <= end for start, end in emoji_ranges)
        for char in message
    )


def _validate_step_messages(
    steps: list[Any], file_path: Path, *, strict_mode: bool = False
) -> list[str]:
    """Validate step messages follow conventions.

    Conventions:
    - No emojis (professional messaging) - only enforced in strict mode
    - Reasonable length (10-120 chars for readability)
    - No excessive punctuation/caps
    - Start with action words or descriptions
    - Enhanced NLP analysis when TextDescriptives is available

    Args:
        steps: List of step definitions
        file_path: Path to the workflow file for error reporting
        strict_mode: If True, enforces stricter rules like no emojis
    """
    issues: list[str] = []

    for i, step in enumerate(steps):
        message = _extract_step_message(step)
        if message is None:
            continue

        step_num = i + 1
        step_issues = _validate_single_step_message(
            message, file_path, step_num, strict_mode
        )
        issues.extend(step_issues)

    return issues


def _extract_step_message(step: Any) -> str | None:
    """Extract the message text from a step definition."""
    if isinstance(step, dict):
        # For object steps, check step_text
        step_text = step.get("step_text")
        if isinstance(step_text, str):
            return step_text
    elif isinstance(step, str):
        return step
    return None


def _validate_single_step_message(
    message: str, file_path: Path, step_num: int, strict_mode: bool
) -> list[str]:
    """Validate a single step message."""
    issues: list[str] = []

    # Enhanced emoji and quality analysis
    issues.extend(_validate_step_content_quality(message, file_path, step_num))

    # Check emoji usage in strict mode
    if strict_mode:
        issues.extend(_validate_step_emoji_usage(message, file_path, step_num))

    # Check message length
    issues.extend(_validate_step_length(message, file_path, step_num))

    # Check punctuation and formatting
    issues.extend(_validate_step_formatting(message, file_path, step_num))

    return issues


def _validate_step_content_quality(
    message: str, file_path: Path, step_num: int
) -> list[str]:
    """Validate content quality using NLP if available."""
    issues: list[str] = []

    try:
        if HAS_TEXTDESCRIPTIVES:
            issues.extend(_validate_with_textdescriptives(message, file_path, step_num))

        # Built-in text quality analysis (always available)
        quality = _analyze_text_quality(message)
        issues.extend(_validate_builtin_quality(quality, message, file_path, step_num))

    except Exception:
        # Continue with basic validation if NLP fails
        pass

    return issues


def _validate_with_textdescriptives(
    message: str, file_path: Path, step_num: int
) -> list[str]:
    """Validate using TextDescriptives NLP pipeline."""
    issues: list[str] = []

    nlp = _get_nlp_pipeline()
    if nlp is not None:
        doc = nlp(message)

        # Additional readability check
        grade_level = getattr(doc._, "flesch_kincaid_grade_level", None)
        if grade_level is not None and grade_level > 12:
            issues.append(
                f"{file_path}: step {step_num} may be too complex "
                f"(grade level {grade_level:.1f}) - "
                "consider simpler language"
            )

    return issues


def _validate_builtin_quality(
    quality: dict[str, Any], message: str, file_path: Path, step_num: int
) -> list[str]:
    """Validate using built-in quality analysis."""
    issues: list[str] = []

    # Check for overly complex language
    if quality["complexity_score"] > 50:  # Heuristic threshold
        issues.append(
            f"{file_path}: step {step_num} may be complex - "
            "consider shorter sentences and simpler words"
        )

    # Encourage action-oriented language
    if not quality["starts_with_action"] and quality["word_count"] > 3:
        issues.extend(_validate_action_oriented_language(message, file_path, step_num))

    return issues


def _validate_action_oriented_language(
    message: str, file_path: Path, step_num: int
) -> list[str]:
    """Validate that longer messages start with action words."""
    issues: list[str] = []

    common_starters = [
        "the",
        "this",
        "that",
        "a",
        "an",
        "if",
        "when",
        "how",
    ]
    first_word = (
        message.split()[0].lower().strip("`*.,()[]{}:;!?") if message.split() else ""
    )
    if first_word in common_starters:
        issues.append(
            f"{file_path}: step {step_num} consider starting with "
            "action word (e.g., 'run', 'create', 'check') for clarity"
        )

    return issues


def _validate_step_emoji_usage(
    message: str, file_path: Path, step_num: int
) -> list[str]:
    """Validate emoji usage in strict mode."""
    issues: list[str] = []

    has_emoji = _manual_emoji_detection(message)
    if has_emoji:
        issues.append(
            f"{file_path}: step {step_num} contains emojis - "
            "use professional text instead"
        )

    return issues


def _validate_step_length(message: str, file_path: Path, step_num: int) -> list[str]:
    """Validate message length after cleaning markdown."""
    issues: list[str] = []

    # Remove common markdown for accurate length count
    clean_message = _clean_markdown(message)

    if len(clean_message) < 10:
        issues.append(
            f"{file_path}: step {step_num} too short - "
            "should be descriptive (10+ chars)"
        )
    elif len(clean_message) > 120:  # Reduced from 150 for better readability
        issues.append(
            f"{file_path}: step {step_num} too long - keep concise (120 chars max)"
        )

    return issues


def _clean_markdown(message: str) -> str:
    """Remove markdown formatting for accurate character counting."""
    import re

    clean_message = message
    # Remove common markdown: **bold**, `code`, [links](url)
    clean_message = re.sub(r"\*\*(.*?)\*\*", r"\1", clean_message)
    clean_message = re.sub(r"`([^`]*)`", r"\1", clean_message)
    clean_message = re.sub(r"\[([^\]]*)\]\([^)]*\)", r"\1", clean_message)
    return clean_message.strip()


def _validate_step_formatting(
    message: str, file_path: Path, step_num: int
) -> list[str]:
    """Validate punctuation and formatting."""
    issues: list[str] = []

    # Check for excessive punctuation
    if message.count("!") > 2:
        issues.append(
            f"{file_path}: step {step_num} excessive exclamation marks - "
            "keep professional"
        )

    # Check for all caps words (except common abbreviations)
    issues.extend(_validate_caps_usage(message, file_path, step_num))

    return issues


def _validate_caps_usage(message: str, file_path: Path, step_num: int) -> list[str]:
    """Validate usage of all-caps words."""
    issues: list[str] = []

    words = message.split()
    all_caps_words = [
        w.strip("`*.,()[]{}:;!?")
        for w in words
        if w.strip("`*.,()[]{}:;!?").isupper() and len(w.strip("`*.,()[]{}:;!?")) > 2
    ]

    common_abbrevs = {
        "API",
        "CLI",
        "URL",
        "HTTP",
        "JSON",
        "XML",
        "CSS",
        "HTML",
        "SQL",
        "MCP",
        "ADR",
        "README",
        "YAML",
        "TOML",
        "CI",
        "CD",
        "GIT",
        "VSCODE",
        "IDE",
        "TDD",
        "PASS",
        "FAIL",
        "HEAD",
        "PAT",
        "VSCE",
        "VSIX",
        "CHANGELOG",
    }

    excessive_caps = [
        w for w in all_caps_words if w not in common_abbrevs and len(w) > 2
    ]

    if excessive_caps:
        issues.append(
            f"{file_path}: step {step_num} excessive caps: "
            f"{', '.join(excessive_caps)} - use normal case"
        )

    return issues


def get_step_message_quality_report(root: Path | None = None) -> dict[str, Any]:
    """Generate a quality report for step messages across all workflows.

    Returns:
        Dictionary with quality metrics and insights.
    """
    report = _initialize_quality_report()
    metrics = _collect_step_metrics(root)

    if metrics["step_count"] > 0:
        _populate_quality_report(report, metrics)
        _generate_quality_recommendations(report, metrics)

    return report


def _initialize_quality_report() -> dict[str, Any]:
    """Initialize the quality report structure."""
    return {
        "files_analyzed": 0,
        "steps_analyzed": 0,
        "quality_metrics": {
            "avg_word_count": 0,
            "avg_complexity_score": 0,
            "action_word_percentage": 0,
            "emoji_count": 0,
        },
        "recommendations": [],
        "textdescriptives_available": HAS_TEXTDESCRIPTIVES,
    }


def _collect_step_metrics(root: Path | None) -> dict[str, Any]:
    """Collect metrics from all workflow step messages."""
    metrics = {
        "files_analyzed": 0,
        "step_count": 0,
        "total_word_count": 0,
        "total_complexity": 0,
        "action_word_count": 0,
        "emoji_count": 0,
    }

    for file in _iter_yaml_files(root):
        file_metrics = _analyze_file_steps(file)
        if file_metrics:
            _accumulate_metrics(metrics, file_metrics)

    return metrics


def _analyze_file_steps(file: Path) -> dict[str, Any] | None:
    """Analyze all steps in a single workflow file."""
    data, err = _load_yaml(file)
    if err or data is None:
        return None

    file_metrics = {
        "files_analyzed": 1,
        "step_count": 0,
        "total_word_count": 0,
        "total_complexity": 0,
        "action_word_count": 0,
        "emoji_count": 0,
    }

    steps = data.get("steps", [])
    for step in steps:
        step_metrics = _analyze_single_step(step)
        if step_metrics:
            _accumulate_step_metrics(file_metrics, step_metrics)

    return file_metrics


def _analyze_single_step(step: Any) -> dict[str, Any] | None:
    """Analyze a single step and return its metrics."""
    message = _extract_step_message(step)
    if message is None:
        return None

    quality = _analyze_text_quality(message)

    return {
        "word_count": quality["word_count"],
        "complexity_score": quality["complexity_score"],
        "starts_with_action": quality["starts_with_action"],
        "has_emoji": _manual_emoji_detection(message),
    }


def _accumulate_metrics(target: dict[str, Any], source: dict[str, Any]) -> None:
    """Accumulate metrics from source into target."""
    target["files_analyzed"] += source["files_analyzed"]
    target["step_count"] += source["step_count"]
    target["total_word_count"] += source["total_word_count"]
    target["total_complexity"] += source["total_complexity"]
    target["action_word_count"] += source["action_word_count"]
    target["emoji_count"] += source["emoji_count"]


def _accumulate_step_metrics(
    file_metrics: dict[str, Any], step_metrics: dict[str, Any]
) -> None:
    """Accumulate metrics from a single step into file metrics."""
    file_metrics["step_count"] += 1
    file_metrics["total_word_count"] += step_metrics["word_count"]
    file_metrics["total_complexity"] += step_metrics["complexity_score"]

    if step_metrics["starts_with_action"]:
        file_metrics["action_word_count"] += 1

    if step_metrics["has_emoji"]:
        file_metrics["emoji_count"] += 1


def _populate_quality_report(report: dict[str, Any], metrics: dict[str, Any]) -> None:
    """Populate the quality report with calculated metrics."""
    step_count = metrics["step_count"]

    report["files_analyzed"] = metrics["files_analyzed"]
    report["steps_analyzed"] = step_count

    quality_metrics = report["quality_metrics"]
    assert isinstance(quality_metrics, dict)

    quality_metrics["avg_word_count"] = metrics["total_word_count"] / step_count
    quality_metrics["avg_complexity_score"] = metrics["total_complexity"] / step_count
    quality_metrics["action_word_percentage"] = (
        metrics["action_word_count"] / step_count
    ) * 100
    quality_metrics["emoji_count"] = metrics["emoji_count"]


def _generate_quality_recommendations(
    report: dict[str, Any], metrics: dict[str, Any]
) -> None:
    """Generate quality recommendations based on metrics."""
    quality_metrics = report["quality_metrics"]
    recommendations = report["recommendations"]

    assert isinstance(quality_metrics, dict)
    assert isinstance(recommendations, list)

    # Complexity recommendation
    if quality_metrics["avg_complexity_score"] > 30:
        recommendations.append(
            "Consider simplifying step messages - use shorter sentences "
            "and common words"
        )

    # Action word recommendation
    if quality_metrics["action_word_percentage"] < 60:
        recommendations.append(
            "Consider starting more steps with action words (run, create, check, etc.)"
        )

    # Emoji recommendation
    emoji_count = metrics["emoji_count"]
    if emoji_count > 0:
        recommendations.append(
            f"Found {emoji_count} steps with emojis - consider "
            "professional text alternatives"
        )


def validate_workflow_yamls(
    root: Path | None = None, *, strict_mode: bool = False
) -> list[str]:
    """Validate all workflow YAML files. Returns a list of issue messages.

    Args:
        root: Directory to scan for YAML files. Defaults to workflows/data.
        strict_mode: If True, enforces stricter rules like no emojis in step messages.

    Returns:
        List of validation issue messages.
    """
    issues: list[str] = []
    names: dict[str, Path] = {}

    for file in _iter_yaml_files(root):
        file_issues = _validate_single_yaml_file(file, names, strict_mode)
        issues.extend(file_issues)

    return issues


def _validate_single_yaml_file(
    file: Path, names: dict[str, Path], strict_mode: bool
) -> list[str]:
    """Validate a single YAML workflow file."""
    issues: list[str] = []

    # Check encoding and detect duplicate keys
    text_for_dups, encoding_issue = _read_file_safely(file)
    if encoding_issue:
        return [encoding_issue]

    # Check for duplicate keys
    dup_keys = _collect_duplicate_keys_from_text(text_for_dups)
    if dup_keys:
        uniq = ", ".join(sorted(set(dup_keys)))
        issues.append(f"{file}: duplicate keys detected: {uniq}")

    # Load and validate YAML content
    data, err = _load_yaml(file)
    if err:
        issues.append(err)
        return issues

    if data is None:
        issues.append(f"{file}: empty or invalid YAML content")
        return issues

    # Validate structure and content
    issues.extend(_validate_yaml_structure(file, data))
    issues.extend(_validate_workflow_name(file, data, names))
    issues.extend(_validate_field_types(file, data))
    issues.extend(_validate_unicode_content(file, data))
    issues.extend(_validate_step_content(file, data, strict_mode))
    issues.extend(_validate_unknown_keys(file, data))

    return issues


def _read_file_safely(file: Path) -> tuple[str, str | None]:
    """Read file safely, returning content and any encoding issue."""
    try:
        text = file.read_text(encoding="utf-8")
        return text, None
    except UnicodeDecodeError as e:
        return "", f"{file}: not UTF-8 encoded ({e})"


def _validate_yaml_structure(file: Path, data: dict[str, Any]) -> list[str]:
    """Validate required YAML structure."""
    issues: list[str] = []

    # Required fields
    for key in ("name", "description", "triggers", "steps"):
        if key not in data:
            issues.append(f"{file}: missing required key '{key}'")

    return issues


def _validate_workflow_name(
    file: Path, data: dict[str, Any], names: dict[str, Path]
) -> list[str]:
    """Validate workflow name uniqueness."""
    issues: list[str] = []

    name = data.get("name")
    if isinstance(name, str):
        if name in names:
            issues.append(
                f"{file}: duplicate workflow name '{name}' also in {names[name]}"
            )
        else:
            names[name] = file
    else:
        issues.append(f"{file}: 'name' must be a string")

    return issues


def _validate_field_types(file: Path, data: dict[str, Any]) -> list[str]:
    """Validate field types."""
    issues: list[str] = []

    # Types
    if "triggers" in data and not isinstance(data["triggers"], list):
        issues.append(f"{file}: 'triggers' must be a list of strings")
    if "steps" in data and not isinstance(data["steps"], list):
        issues.append(f"{file}: 'steps' must be a list of strings")

    return issues


def _validate_unicode_content(file: Path, data: dict[str, Any]) -> list[str]:
    """Validate Unicode content for replacement characters."""
    issues: list[str] = []
    replacement = "\ufffd"

    def _contains_repl(val: Any) -> bool:
        if isinstance(val, str):
            return replacement in val
        if isinstance(val, list):
            return any(_contains_repl(v) for v in val)
        if isinstance(val, dict):
            return any(_contains_repl(v) for v in val.values())
        return False

    if _contains_repl(data):
        issues.append(
            f"{file}: contains Unicode replacement character (�); fix UTF-8 content"
        )

    return issues


def _validate_step_content(
    file: Path, data: dict[str, Any], strict_mode: bool
) -> list[str]:
    """Validate step message content."""
    issues: list[str] = []

    # Step message conventions
    steps = data.get("steps", [])
    if isinstance(steps, list):
        step_issues = _validate_step_messages(steps, file, strict_mode=strict_mode)
        issues.extend(step_issues)

    return issues


def _validate_unknown_keys(file: Path, data: dict[str, Any]) -> list[str]:
    """Validate for unknown keys."""
    issues: list[str] = []

    # Unknown keys
    unknown = set(data.keys()) - ALLOWED_KEYS - ALLOWED_EXTRA_KEYS
    if unknown:
        pretty = ", ".join(sorted(unknown))
        issues.append(f"{file}: unknown keys: {pretty}")

    return issues


def _normalize_data(data: dict[str, Any]) -> dict[str, Any]:
    """Return a normalized mapping with preferred keys order and legacy migrations."""
    # Migrate legacy commands -> steps
    if "steps" not in data and isinstance(data.get("commands"), list):
        data["steps"] = list(data["commands"])  # copy
        del data["commands"]

    # Coerce expected list fields to lists
    for key in ("triggers", "steps", "dependencies", "project_types", "conditions"):
        if key in data and data[key] is None:
            data[key] = []

    # Build ordered output
    ordered = OrderedDict()
    for key in (
        "name",
        "description",
        "triggers",
        "steps",
        "dependencies",
        "project_types",
        "conditions",
    ):
        if key in data:
            ordered[key] = data[key]
    # Preserve known extra metadata next
    for key in sorted(ALLOWED_EXTRA_KEYS):
        if key in data:
            ordered[key] = data[key]
    # Append any remaining keys to avoid destructive changes
    for key in data:
        if key not in ordered:
            ordered[key] = data[key]
    return ordered


def format_workflow_yamls(
    root: Path | None = None, *, write: bool = False
) -> list[str]:
    """Normalize workflow YAMLs and optionally write back.

    Returns list of change summaries.
    """
    changes: list[str] = []
    for file in _iter_yaml_files(root):
        original_text = file.read_text(encoding="utf-8", errors="replace")
        try:
            data = yaml.safe_load(original_text)
        except yaml.YAMLError:
            # Skip files with syntax errors (validator will report)
            continue
        if not isinstance(data, dict):
            continue

        normalized = _normalize_data(dict(data))

        # Serialize with stable formatting (no key sorting; keep our order)
        new_text = yaml.safe_dump(
            normalized,
            sort_keys=False,
            allow_unicode=True,
            width=100,
        )

        if new_text != original_text:
            change_msg = (
                f"{file}: will reformat ({len(original_text)} -> {len(new_text)} chars)"
            )
            changes.append(change_msg)
            if write:
                file.write_text(new_text, encoding="utf-8")

    return changes
