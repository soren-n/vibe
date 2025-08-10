"""
Workflow orchestrator that plans and provides execution guidance.
"""

from typing import Any

from rich.console import Console
from rich.panel import Panel
from rich.table import Table

from .config import VibeConfig
from .workflows import get_workflow_registry


class WorkflowOrchestrator:
    """Orchestrates workflow planning and provides execution guidance for AI agents."""

    def __init__(self, config: VibeConfig):
        self.config = config
        self.console = Console()
        self.workflow_registry = get_workflow_registry()

    def plan_workflows(
        self, workflows: list[str], prompt: str, show_display: bool = True
    ) -> dict[str, Any]:
        """Plan workflows and return execution guidance."""
        if not workflows:
            return {
                "success": True,
                "workflows": [],
                "guidance": "No workflows needed.",
            }

        # Plan execution order
        execution_order = self._plan_execution_order(workflows)

        # Generate execution plan
        execution_plan = self._generate_execution_plan(execution_order, prompt)

        # Display the plan only if requested
        if show_display:
            self._display_execution_guidance(execution_plan, prompt)

        return {
            "success": True,
            "workflows": execution_order,
            "execution_plan": execution_plan,
            "guidance": self._format_guidance_for_agent(execution_plan),
        }

    def _generate_execution_plan(
        self, workflows: list[str], prompt: str
    ) -> list[dict[str, Any]]:
        """Generate detailed execution plan for each workflow."""
        plan = []

        for workflow_name in workflows:
            workflow_step = self._plan_workflow_step(workflow_name, prompt)
            if workflow_step:
                plan.append(workflow_step)

        return plan

    def _plan_workflow_step(
        self, workflow_name: str, prompt: str
    ) -> dict[str, Any] | None:
        """Plan a single workflow step."""
        # Try to get built-in workflow first
        built_in_workflow = self.workflow_registry.get_workflow(workflow_name)

        # Get config workflow
        workflow_config = self.config.workflows.get(workflow_name)

        if not built_in_workflow and not workflow_config:
            return None

        # Determine which workflow to use and get commands
        commands = []
        description = ""
        source = ""

        if built_in_workflow:
            # Use built-in workflow
            commands = built_in_workflow.commands
            description = built_in_workflow.description
            source = "built-in"
        elif workflow_config:
            # Use config workflow
            # Get project type and project-specific commands
            project_type = self.config.detect_project_type()
            project_config = self.config.project_types.get(project_type)

            if project_config and workflow_name in project_config.workflows:
                commands = project_config.workflows[workflow_name].commands
            else:
                commands = workflow_config.commands

            description = (
                workflow_config.description or f"{workflow_name.title()} workflow"
            )
            source = "custom"

        return {
            "name": workflow_name,
            "description": description,
            "commands": commands,
            "source": source,
            "reasoning": self._get_workflow_reasoning(workflow_name, prompt),
        }

    def _get_workflow_reasoning(self, workflow_name: str, prompt: str) -> str:
        """Generate reasoning for why this workflow is needed."""
        reasoning_map = {
            "analysis": f"To understand the project structure and identify what needs to be done for: '{prompt}'",
            "python_quality": "To ensure code quality with formatting, linting, and style checks",
            "python_test": "To validate that all tests pass and code works correctly",
            "python_build": "To create distribution packages ready for release",
            "git_status": "To check the current state of the repository",
            "git_commit": "To save the current work state",
            "documentation": "To ensure project documentation is up to date",
            "cleanup": "To remove temporary files and clean up the workspace",
            "security": "To check for security vulnerabilities and sensitive files",
            "dependencies": "To verify and update project dependencies",
        }

        return reasoning_map.get(
            workflow_name, f"To complete the {workflow_name} workflow as requested"
        )

    def _display_execution_guidance(
        self, execution_plan: list[dict[str, Any]], prompt: str
    ) -> None:
        """Display execution guidance for AI agents."""
        self.console.print()

        # Show the original prompt
        self.console.print(
            Panel(
                f"[bold blue]{prompt}[/bold blue]",
                title="🎯 User Request",
                border_style="blue",
            )
        )

        # Show the execution guidance
        self.console.print(
            Panel(
                self._format_guidance_text(execution_plan),
                title="🤖 AI Agent Execution Guidance",
                border_style="green",
            )
        )

        # Show detailed steps table
        self._display_steps_table(execution_plan)

    def _format_guidance_text(self, execution_plan: list[dict[str, Any]]) -> str:
        """Format guidance text for AI agents."""
        if not execution_plan:
            return (
                "No specific workflows needed. Proceed with general project analysis."
            )

        guidance_parts = [
            "Based on the request, I recommend the following workflow execution:",
            "",
        ]

        for i, step in enumerate(execution_plan, 1):
            guidance_parts.append(f"{i}. **{step['description']}**")
            guidance_parts.append(f"   Reasoning: {step['reasoning']}")
            guidance_parts.append("")

        guidance_parts.append("Execute these workflows in order for best results.")
        return "\n".join(guidance_parts)

    def _display_steps_table(self, execution_plan: list[dict[str, Any]]) -> None:
        """Display detailed steps in a table format."""
        if not execution_plan:
            return

        table = Table(title="📋 Detailed Execution Steps")
        table.add_column("Step", style="cyan", no_wrap=True)
        table.add_column("Workflow", style="magenta")
        table.add_column("Source", style="yellow")
        table.add_column("Commands", style="green")

        for i, step in enumerate(execution_plan, 1):
            commands_text = "\n".join(step["commands"][:3])  # Show first 3 commands
            if len(step["commands"]) > 3:
                commands_text += f"\n... and {len(step['commands']) - 3} more"

            table.add_row(str(i), step["description"], step["source"], commands_text)

        self.console.print(table)

    def _format_guidance_for_agent(self, execution_plan: list[dict[str, Any]]) -> str:
        """Format guidance as plain text for AI agent consumption."""
        if not execution_plan:
            return "No specific workflows needed."

        guidance_lines = []
        guidance_lines.append("WORKFLOW EXECUTION GUIDANCE:")
        guidance_lines.append("=" * 40)

        for i, step in enumerate(execution_plan, 1):
            guidance_lines.append(f"\nSTEP {i}: {step['name'].upper()}")
            guidance_lines.append(f"Description: {step['description']}")
            guidance_lines.append(f"Reasoning: {step['reasoning']}")
            guidance_lines.append(f"Source: {step['source']}")
            guidance_lines.append("Commands to execute:")

            for j, command in enumerate(step["commands"], 1):
                guidance_lines.append(f"  {j}. {command}")

            if i < len(execution_plan):
                guidance_lines.append("-" * 40)

        return "\n".join(guidance_lines)

    def _plan_execution_order(self, workflows: list[str]) -> list[str]:
        """Plan workflow execution order based on dependencies."""
        # Define execution priorities (lower number = higher priority)
        priority_order = [
            "mcp",  # MCP setup should come first
            "analysis",  # Analysis before implementation
            "implementation",  # Implementation before testing
            "quality",  # Quality checks after implementation
            "testing",  # Testing after quality checks
            "documentation",  # Documentation after implementation
            "git",  # Git operations near the end
            "session",  # Session management last
        ]

        # Sort workflows by priority order
        ordered_workflows = []

        # Add workflows in priority order
        for priority_workflow in priority_order:
            if priority_workflow in workflows:
                ordered_workflows.append(priority_workflow)

        # Add any workflows not in priority list
        for workflow in workflows:
            if workflow not in ordered_workflows:
                ordered_workflows.append(workflow)

        return ordered_workflows

    def _display_execution_plan(self, execution_order: list[str]) -> None:
        """Display the execution plan."""
        plan_items = []
        for i, workflow_name in enumerate(execution_order, 1):
            workflow_config = self.config.workflows.get(workflow_name)
            if workflow_config and workflow_config.description:
                description = workflow_config.description
            else:
                description = f"📋 {workflow_name.title()} workflow"

            plan_items.append(f"  {i}. {description}")

        self.console.print(
            Panel("\n".join(plan_items), title="📋 Execution Plan", border_style="cyan")
        )
        self.console.print()
