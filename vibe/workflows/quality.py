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
        if isinstance(step, dict):
            # For object steps, check step_text
            step_text = step.get("step_text")
            if not isinstance(step_text, str):
                continue
            message = step_text
        elif isinstance(step, str):
            message = step
        else:
            continue

        step_num = i + 1

        # Enhanced emoji detection and text quality analysis
        try:
            if HAS_TEXTDESCRIPTIVES:
                nlp = _get_nlp_pipeline()
                if nlp is not None:
                    doc = nlp(message)
                    # Use TextDescriptives emoji detection if available
                    emoji_count = getattr(doc._, "emoji_count", 0)
                    has_emoji = emoji_count > 0

                    # Additional readability check
                    grade_level = getattr(doc._, "flesch_kincaid_grade_level", None)
                    if grade_level is not None and grade_level > 12:
                        issues.append(
                            f"{file_path}: step {step_num} may be too complex "
                            f"(grade level {grade_level:.1f}) - "
                            "consider simpler language"
                        )
                else:
                    has_emoji = _manual_emoji_detection(message)
            else:
                has_emoji = _manual_emoji_detection(message)

            # Built-in text quality analysis (always available)
            quality = _analyze_text_quality(message)

            # Check for overly complex language using built-in analysis
            if quality["complexity_score"] > 50:  # Heuristic threshold
                issues.append(
                    f"{file_path}: step {step_num} may be complex - "
                    "consider shorter sentences and simpler words"
                )

            # Encourage action-oriented language
            if not quality["starts_with_action"] and quality["word_count"] > 3:
                # Only suggest for longer messages that don't start with action words
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
                    message.split()[0].lower().strip("`*.,()[]{}:;!?")
                    if message.split()
                    else ""
                )
                if first_word in common_starters:
                    issues.append(
                        f"{file_path}: step {step_num} consider starting with "
                        "action word (e.g., 'run', 'create', 'check') for clarity"
                    )

        except Exception:
            # Fallback to manual detection if anything goes wrong
            has_emoji = _manual_emoji_detection(message)

        if has_emoji and strict_mode:
            issues.append(
                f"{file_path}: step {step_num} contains emojis - "
                "use professional text instead"
            )

        # Check length (after stripping markdown formatting for accurate count)
        clean_message = message
        # Remove common markdown: **bold**, `code`, [links](url)
        import re

        clean_message = re.sub(r"\*\*(.*?)\*\*", r"\1", clean_message)
        clean_message = re.sub(r"`([^`]*)`", r"\1", clean_message)
        clean_message = re.sub(r"\[([^\]]*)\]\([^)]*\)", r"\1", clean_message)
        clean_message = clean_message.strip()

        if len(clean_message) < 10:
            issues.append(
                f"{file_path}: step {step_num} too short - "
                "should be descriptive (10+ chars)"
            )
        elif len(clean_message) > 120:  # Reduced from 150 for better readability
            issues.append(
                f"{file_path}: step {step_num} too long - keep concise (120 chars max)"
            )

        # Check for excessive punctuation
        if message.count("!") > 2:
            issues.append(
                f"{file_path}: step {step_num} excessive exclamation marks - "
                "keep professional"
            )

        # Check for all caps words (except common abbreviations)
        words = message.split()
        all_caps_words = [
            w.strip("`*.,()[]{}:;!?")
            for w in words
            if w.strip("`*.,()[]{}:;!?").isupper()
            and len(w.strip("`*.,()[]{}:;!?")) > 2
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
    report = {
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

    total_word_count = 0
    total_complexity = 0
    action_word_count = 0
    emoji_count = 0
    step_count = 0

    for file in _iter_yaml_files(root):
        data, err = _load_yaml(file)
        if err or data is None:
            continue

        files_analyzed = report["files_analyzed"]
        assert isinstance(files_analyzed, int)
        report["files_analyzed"] = files_analyzed + 1
        steps = data.get("steps", [])

        for step in steps:
            if isinstance(step, dict):
                message = step.get("step_text")
                if not isinstance(message, str):
                    continue
            elif isinstance(step, str):
                message = step
            else:
                continue

            step_count += 1
            quality = _analyze_text_quality(message)

            total_word_count += quality["word_count"]
            total_complexity += quality["complexity_score"]
            if quality["starts_with_action"]:
                action_word_count += 1

            if _manual_emoji_detection(message):
                emoji_count += 1

    if step_count > 0:
        report["steps_analyzed"] = step_count
        quality_metrics = report["quality_metrics"]
        recommendations = report["recommendations"]

        assert isinstance(quality_metrics, dict)
        assert isinstance(recommendations, list)

        quality_metrics["avg_word_count"] = total_word_count / step_count
        quality_metrics["avg_complexity_score"] = total_complexity / step_count
        quality_metrics["action_word_percentage"] = (
            action_word_count / step_count
        ) * 100
        quality_metrics["emoji_count"] = emoji_count

        # Generate recommendations
        if quality_metrics["avg_complexity_score"] > 30:
            recommendations.append(
                "Consider simplifying step messages - use shorter sentences "
                "and common words"
            )

        if quality_metrics["action_word_percentage"] < 60:
            recommendations.append(
                "Consider starting more steps with action words "
                "(run, create, check, etc.)"
            )

        if emoji_count > 0:
            recommendations.append(
                f"Found {emoji_count} steps with emojis - consider "
                "professional text alternatives"
            )

    return report


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
        # Detect duplicate keys by traversing the YAML AST before/alongside loading
        try:
            text_for_dups = file.read_text(encoding="utf-8")
        except UnicodeDecodeError as e:
            issues.append(f"{file}: not UTF-8 encoded ({e})")
            continue

        dup_keys = _collect_duplicate_keys_from_text(text_for_dups)
        if dup_keys:
            uniq = ", ".join(sorted(set(dup_keys)))
            issues.append(f"{file}: duplicate keys detected: {uniq}")

        data, err = _load_yaml(file)
        if err:
            issues.append(err)
            continue

        if data is None:
            issues.append(f"{file}: empty or invalid YAML content")
            continue

        # Required fields
        for key in ("name", "description", "triggers", "steps"):
            if key not in data:
                issues.append(f"{file}: missing required key '{key}'")

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

        # Types
        if "triggers" in data and not isinstance(data["triggers"], list):
            issues.append(f"{file}: 'triggers' must be a list of strings")
        if "steps" in data and not isinstance(data["steps"], list):
            issues.append(f"{file}: 'steps' must be a list of strings")

        # Encoding sanity (replacement character indicates prior decode issues)
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

        # Step message conventions
        steps = data.get("steps", [])
        if isinstance(steps, list):
            step_issues = _validate_step_messages(steps, file, strict_mode=strict_mode)
            issues.extend(step_issues)

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
