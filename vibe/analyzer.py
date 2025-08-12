"""Prompt analysis engine for determining appropriate workflows and checklists."""

import re

from rich.console import Console
from rich.panel import Panel

from .config import VibeConfig
from .workflows import get_workflow_registry
from .workflows.loader import get_checklists


class PromptAnalyzer:
    """Analyzes prompts to determine appropriate workflows and checklists."""

    def __init__(self, config: VibeConfig):
        """Initialize the prompt analyzer with configuration."""
        self.config = config
        self.console = Console()
        self.workflow_registry = get_workflow_registry()
        self.checklists = get_checklists()

    def analyze(self, prompt: str, show_analysis: bool = True) -> list[str]:
        """Analyze prompt and return list of relevant workflows and checklists."""
        # First try built-in workflows
        built_in_workflows = self._match_built_in_workflows(prompt)

        # Then try config-based workflows
        config_workflows = self._match_config_workflows(prompt)

        # Check for relevant checklists
        matching_checklists = self._match_checklists(prompt)

        # Combine and deduplicate
        all_items = list(
            dict.fromkeys(built_in_workflows + config_workflows + matching_checklists)
        )

        if show_analysis:
            self._display_analysis(
                prompt,
                all_items,
                built_in_workflows,
                config_workflows,
                matching_checklists,
            )

        return all_items

    def _match_built_in_workflows(self, prompt: str) -> list[str]:
        """Match prompt against built-in workflows in the registry."""
        matching_workflows = self.workflow_registry.get_workflows_by_triggers(prompt)
        return [workflow.name for workflow in matching_workflows]

    def _match_config_workflows(self, prompt: str) -> list[str]:
        """Match prompt against workflow trigger patterns."""
        prompt_lower = prompt.lower()
        matched_workflows: set[str] = set()

        # Get project-specific workflows first
        project_type = self.config.detect_project_type()
        project_config = self.config.project_types.get(project_type, None)

        # Check project-specific workflows
        if project_config:
            for workflow_name, workflow_config in project_config.workflows.items():
                if self._matches_triggers(prompt_lower, workflow_config.triggers):
                    matched_workflows.add(workflow_name)

        # Check global workflows
        for workflow_name, workflow_config in self.config.workflows.items():
            if self._matches_triggers(prompt_lower, workflow_config.triggers):
                matched_workflows.add(workflow_name)

        # Default to research guidance if no matches
        if not matched_workflows:
            matched_workflows.add("Research Guidance for Agents")

        return list(matched_workflows)

    def _match_checklists(self, prompt: str) -> list[str]:
        """Match prompt against checklist trigger patterns."""
        prompt_lower = prompt.lower()
        matched_checklists: list[str] = []

        for checklist_name, checklist in self.checklists.items():
            if self._matches_triggers(prompt_lower, checklist.triggers):
                # Check if the checklist applies to current project type
                project_type = self.config.detect_project_type()
                if (
                    not checklist.project_types
                    or project_type in checklist.project_types
                ):
                    matched_checklists.append(f"checklist:{checklist_name}")

        return matched_checklists

    def _matches_triggers(self, prompt: str, triggers: list[str]) -> bool:
        """Check if prompt matches any of the trigger patterns."""
        for trigger in triggers:
            # Support both simple word matching and regex patterns
            try:
                if re.search(r"\b" + trigger.replace("*", r"\w*") + r"\b", prompt):
                    return True
            except re.error:
                # Fallback to simple substring matching
                if trigger in prompt:
                    return True
        return False

    def _display_analysis(
        self,
        prompt: str,
        all_items: list[str],
        built_in_workflows: list[str],
        config_workflows: list[str],
        matching_checklists: list[str],
    ) -> None:
        """Display analysis results with rich formatting."""
        self.console.print()

        # Show sections of the analysis
        self._display_prompt_panel(prompt)
        self._display_workflow_results(
            all_items, built_in_workflows, config_workflows, matching_checklists
        )

        self.console.print()

    def _display_prompt_panel(self, prompt: str) -> None:
        """Display the prompt being analyzed."""
        self.console.print(
            Panel(
                f"[bold blue]{prompt}[/bold blue]",
                title="Analyzing Prompt",
                border_style="blue",
            )
        )

    def _display_workflow_results(
        self,
        all_items: list[str],
        built_in_workflows: list[str],
        config_workflows: list[str],
        matching_checklists: list[str],
    ) -> None:
        """Display detected workflows and checklists."""
        if all_items:
            item_descriptions = self._build_item_descriptions(
                built_in_workflows, config_workflows, matching_checklists
            )
            self._display_detected_items_panel(item_descriptions)
        else:
            self._display_no_detection_panel()

    def _build_item_descriptions(
        self,
        built_in_workflows: list[str],
        config_workflows: list[str],
        matching_checklists: list[str],
    ) -> list[str]:
        """Build description list for detected workflows and checklists."""
        item_descriptions = []

        # Add built-in workflows with their descriptions
        item_descriptions.extend(
            self._get_builtin_workflow_descriptions(built_in_workflows)
        )

        # Add config workflows
        item_descriptions.extend(
            self._get_config_workflow_descriptions(config_workflows, built_in_workflows)
        )

        # Add checklists
        item_descriptions.extend(self._get_checklist_descriptions(matching_checklists))

        return item_descriptions

    def _get_builtin_workflow_descriptions(
        self, built_in_workflows: list[str]
    ) -> list[str]:
        """Get descriptions for built-in workflows."""
        descriptions = []
        for workflow_name in built_in_workflows:
            workflow = self.workflow_registry.get_workflow(workflow_name)
            if workflow:
                description = workflow.description
                descriptions.append(f"  [built-in workflow] {description}")
        return descriptions

    def _get_config_workflow_descriptions(
        self, config_workflows: list[str], built_in_workflows: list[str]
    ) -> list[str]:
        """Get descriptions for config workflows."""
        descriptions = []
        for workflow_name in config_workflows:
            if workflow_name not in built_in_workflows:  # Avoid duplicates
                workflow_config = self.config.workflows.get(workflow_name)
                if workflow_config and workflow_config.description:
                    description = workflow_config.description
                else:
                    description = f"{workflow_name.title()} workflow"
                descriptions.append(f"  [custom workflow] {description}")
        return descriptions

    def _get_checklist_descriptions(self, matching_checklists: list[str]) -> list[str]:
        """Get descriptions for checklists."""
        descriptions = []
        for checklist_item in matching_checklists:
            if checklist_item.startswith("checklist:"):
                checklist_name = checklist_item.replace("checklist:", "")
                checklist = self.checklists.get(checklist_name)
                if checklist:
                    descriptions.append(f"  [checklist] {checklist.description}")
        return descriptions

    def _display_detected_items_panel(self, item_descriptions: list[str]) -> None:
        """Display panel with detected workflows and checklists."""
        self.console.print(
            Panel(
                "\n".join(item_descriptions),
                title="Detected Workflow and Checklist Needs",
                border_style="green",
            )
        )

    def _display_no_detection_panel(self) -> None:
        """Display panel when no workflows are detected."""
        self.console.print(
            Panel(
                "  → Defaulting to analysis workflow",
                title="⚠️ No Specific Workflows or Checklists Detected",
                border_style="yellow",
            )
        )
