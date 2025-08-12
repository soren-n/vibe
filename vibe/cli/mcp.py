"""MCP (Model Context Protocol) commands for step-by-step workflow execution."""

import json
import sys
from pathlib import Path

import click

from ..config import VibeConfig
from ..guidance.loader import get_checklist, get_checklists
from ..orchestrator import WorkflowOrchestrator
from .validation import check


@click.group()
def mcp() -> None:
    """MCP server commands for step-by-step workflow execution.

    These commands are designed to be called by MCP servers to provide
    token-efficient workflow orchestration for AI agents.
    """
    pass


@mcp.command("start")
@click.argument("prompt")
@click.option("--config", "-c", type=click.Path(exists=True), help="Config file path")
@click.option("--project-type", "-t", help="Override project type detection")
def mcp_start(prompt: str, config: str | None, project_type: str | None) -> None:
    """Start a new workflow session for step-by-step execution.

    Args:
        prompt: The original prompt that triggered workflows
        config: Optional path to configuration file
        project_type: Optional override for project type detection

    Returns JSON with session info and first step.

    """
    try:
        # Load configuration
        config_obj = VibeConfig.load_from_file(Path(config) if config else None)

        # Override project type if specified
        if project_type:
            config_obj.project_type = project_type

        # Start session
        orchestrator = WorkflowOrchestrator(config_obj)
        result = orchestrator.start_session(prompt)

        # Output JSON
        print(json.dumps(result, indent=2))

        if not result["success"]:
            sys.exit(1)

    except Exception as e:
        error_result = {"success": False, "error": f"Failed to start session: {str(e)}"}
        print(json.dumps(error_result, indent=2))
        sys.exit(1)


@mcp.command("status")
@click.argument("session_id")
def mcp_status(session_id: str) -> None:
    """Get current status of a workflow session.

    Args:
        session_id: ID of the session to check

    Returns JSON with session status and current step.

    """
    try:
        # Use default config for session operations
        config = VibeConfig.load_from_file()
        orchestrator = WorkflowOrchestrator(config)
        result = orchestrator.get_session_status(session_id)

        # Output JSON
        print(json.dumps(result, indent=2))

        if not result["success"]:
            sys.exit(1)

    except Exception as e:
        error_result = {
            "success": False,
            "error": f"Failed to get session status: {str(e)}",
        }
        print(json.dumps(error_result, indent=2))
        sys.exit(1)


@mcp.command("next")
@click.argument("session_id")
def mcp_next(session_id: str) -> None:
    """Mark current step as complete and advance to next step.

    Args:
        session_id: ID of the session to advance

    Returns JSON with next step info or completion status.

    """
    try:
        # Use default config for session operations
        config = VibeConfig.load_from_file()
        orchestrator = WorkflowOrchestrator(config)
        result = orchestrator.advance_session(session_id)

        # Output JSON
        print(json.dumps(result, indent=2))

        if not result["success"]:
            sys.exit(1)

    except Exception as e:
        error_result = {
            "success": False,
            "error": f"Failed to advance session: {str(e)}",
        }
        print(json.dumps(error_result, indent=2))
        sys.exit(1)


@mcp.command("break")
@click.argument("session_id")
def mcp_break(session_id: str) -> None:
    """Break out of current workflow and return to parent workflow.

    Args:
        session_id: ID of the session

    Returns JSON with parent workflow step info.

    """
    try:
        # Use default config for session operations
        config = VibeConfig.load_from_file()
        orchestrator = WorkflowOrchestrator(config)
        result = orchestrator.break_session(session_id)

        # Output JSON
        print(json.dumps(result, indent=2))

        if not result["success"]:
            sys.exit(1)

    except Exception as e:
        error_result = {"success": False, "error": f"Failed to break session: {str(e)}"}
        print(json.dumps(error_result, indent=2))
        sys.exit(1)


@mcp.command("back")
@click.argument("session_id")
def mcp_back(session_id: str) -> None:
    """Go back to the previous step in the current workflow.

    Args:
        session_id: ID of the session

    Returns JSON with previous step info.

    """
    try:
        # Use default config for session operations
        config = VibeConfig.load_from_file()
        orchestrator = WorkflowOrchestrator(config)
        result = orchestrator.back_session(session_id)

        # Output JSON
        print(json.dumps(result, indent=2))

        if not result["success"]:
            sys.exit(1)

    except Exception as e:
        error_result = {"success": False, "error": f"Failed to go back: {str(e)}"}
        print(json.dumps(error_result, indent=2))
        sys.exit(1)


@mcp.command("restart")
@click.argument("session_id")
def mcp_restart(session_id: str) -> None:
    """Restart the session from the beginning.

    Args:
        session_id: ID of the session to restart

    Returns JSON with first step info.

    """
    try:
        # Use default config for session operations
        config = VibeConfig.load_from_file()
        orchestrator = WorkflowOrchestrator(config)
        result = orchestrator.restart_session(session_id)

        # Output JSON
        print(json.dumps(result, indent=2))

        if not result["success"]:
            sys.exit(1)

    except Exception as e:
        error_result = {
            "success": False,
            "error": f"Failed to restart session: {str(e)}",
        }
        print(json.dumps(error_result, indent=2))
        sys.exit(1)


@mcp.command("list")
def mcp_list() -> None:
    """List all active workflow sessions.

    Returns JSON with list of active sessions.
    """
    try:
        # Use default config for session operations
        config = VibeConfig.load_from_file()
        orchestrator = WorkflowOrchestrator(config)
        result = orchestrator.list_sessions()

        # Output JSON
        print(json.dumps(result, indent=2))

        if not result["success"]:
            sys.exit(1)

    except Exception as e:
        error_result = {"success": False, "error": f"Failed to list sessions: {str(e)}"}
        print(json.dumps(error_result, indent=2))
        sys.exit(1)


@mcp.command("init")
@click.option(
    "--project-type",
    "-t",
    help="Project type (python, vue_typescript, generic)",
)
def mcp_init(project_type: str | None) -> None:
    """Initialize vibe project configuration with JSON output for MCP.

    Args:
        project_type: Optional project type override

    Returns JSON with initialization result.
    """
    try:
        from pathlib import Path

        # Check if .vibe.yaml already exists
        vibe_config_path = Path.cwd() / ".vibe.yaml"

        if vibe_config_path.exists():
            result = {
                "success": True,
                "already_initialized": True,
                "message": "Vibe project already initialized",
                "config_path": str(vibe_config_path),
                "next_steps": ["vibe check", 'vibe run "what can I do?"'],
            }
        else:
            # Initialize new project using the init workflow
            config = VibeConfig.load_from_file()
            if project_type:
                config.project_type = project_type

            orchestrator = WorkflowOrchestrator(config)
            result = orchestrator.plan_workflows(
                ["init"], "initialize vibe project", show_display=False
            )

        print(json.dumps(result, indent=2))

        if not result.get("success", True):
            sys.exit(1)

    except Exception as e:
        error_result = {
            "success": False,
            "error": f"Failed to initialize project: {str(e)}",
        }
        print(json.dumps(error_result, indent=2))
        sys.exit(1)


@mcp.command("check")
def mcp_check() -> None:
    """Validate vibe environment and configuration with JSON output for MCP.

    Returns JSON with validation results.
    """
    try:
        # Reuse the existing validation logic with JSON output
        check(output_json=True)
    except SystemExit:
        # check() may call sys.exit, but we want to handle it gracefully for MCP
        pass
    except Exception as e:
        error_result = {
            "success": False,
            "error": f"Failed to validate environment: {str(e)}",
        }
        print(json.dumps(error_result, indent=2))
        sys.exit(1)


@mcp.command("list-checklists")
@click.option("--project-type", help="Filter checklists by project type")
def mcp_list_checklists(project_type: str | None) -> None:
    """List available checklists with JSON output for MCP.

    Returns JSON with checklist information.
    """
    try:
        all_checklists = get_checklists()

        # Filter by project type if specified
        if project_type:
            filtered_checklists = {
                name: checklist
                for name, checklist in all_checklists.items()
                if (
                    not checklist.project_types
                    or project_type in checklist.project_types
                )
            }
        else:
            filtered_checklists = all_checklists

        result = {
            "success": True,
            "checklists": [
                {
                    "name": name,
                    "description": checklist.description,
                    "triggers": checklist.triggers,
                    "project_types": checklist.project_types,
                    "item_count": len(checklist.items)
                }
                for name, checklist in filtered_checklists.items()
            ]
        }
        print(json.dumps(result, indent=2))

    except Exception as e:
        error_result = {
            "success": False,
            "error": f"Failed to list checklists: {str(e)}",
        }
        print(json.dumps(error_result, indent=2))
        sys.exit(1)


@mcp.command("show-checklist")
@click.argument("name")
def mcp_show_checklist(name: str) -> None:
    """Show checklist details with JSON output for MCP.

    Returns JSON with full checklist information.
    """
    try:
        checklist = get_checklist(name)

        if not checklist:
            error_result = {
                "success": False,
                "error": f"Checklist '{name}' not found"
            }
            print(json.dumps(error_result, indent=2))
            sys.exit(1)

        result = {
            "success": True,
            "checklist": {
                "name": checklist.name,
                "description": checklist.description,
                "triggers": checklist.triggers,
                "project_types": checklist.project_types,
                "conditions": checklist.conditions,
                "dependencies": checklist.dependencies,
                "items": checklist.items
            }
        }
        print(json.dumps(result, indent=2))

    except Exception as e:
        error_result = {
            "success": False,
            "error": f"Failed to show checklist: {str(e)}",
        }
        print(json.dumps(error_result, indent=2))
        sys.exit(1)


@mcp.command("run-checklist")
@click.argument("name")
@click.option(
    "--format",
    type=click.Choice(["json", "simple"]),
    default="json",
    help="Output format for MCP compatibility"
)
def mcp_run_checklist(name: str, format: str) -> None:
    """Run checklist with JSON output for MCP.

    Returns JSON with checklist execution format.
    """
    try:
        checklist = get_checklist(name)

        if not checklist:
            error_result = {
                "success": False,
                "error": f"Checklist '{name}' not found"
            }
            print(json.dumps(error_result, indent=2))
            sys.exit(1)

        if format == "simple":
            # Simple text format for MCP display
            name_sep = "=" * len(checklist.name)
            header = f"\n{checklist.name}\n{name_sep}\n{checklist.description}\n\n"
            items = "\n".join(
                f"[ ] {i}. {item}" for i, item in enumerate(checklist.items, 1)
            )
            result = {
                "success": True,
                "checklist": {
                    "name": checklist.name,
                    "description": checklist.description,
                    "formatted_output": header + items
                }
            }
        else:
            # Structured JSON format
            result = {
                "success": True,
                "checklist": {
                    "name": checklist.name,
                    "description": checklist.description,
                    "items": [
                        {
                            "index": i + 1,
                            "text": item,
                            "completed": False  # Default state
                        }
                        for i, item in enumerate(checklist.items)
                    ]
                }
            }

        print(json.dumps(result, indent=2))

    except Exception as e:
        error_result = {
            "success": False,
            "error": f"Failed to run checklist: {str(e)}",
        }
        print(json.dumps(error_result, indent=2))
        sys.exit(1)


@mcp.command("monitor-sessions")
@click.option("--config", "-c", type=click.Path(exists=True), help="Config file path")
def mcp_monitor_sessions(config: str | None) -> None:
    """Get session health monitoring data including alerts for dormant workflows.

    Returns JSON with session statistics, alerts, and recommendations.
    """
    try:
        # Load configuration
        config_obj = VibeConfig.load_from_file(Path(config) if config else None)

        # Get monitoring data
        orchestrator = WorkflowOrchestrator(config_obj)
        result = orchestrator.monitor_sessions()

        print(json.dumps(result, indent=2))

    except Exception as e:
        error_result = {
            "success": False,
            "error": f"Failed to monitor sessions: {str(e)}",
        }
        print(json.dumps(error_result, indent=2))
        sys.exit(1)


@mcp.command("cleanup-sessions")
@click.option("--config", "-c", type=click.Path(exists=True), help="Config file path")
def mcp_cleanup_sessions(config: str | None) -> None:
    """Automatically clean up sessions that have been inactive for too long.

    Returns JSON with list of cleaned session IDs.
    """
    try:
        # Load configuration
        config_obj = VibeConfig.load_from_file(Path(config) if config else None)

        # Clean up stale sessions
        orchestrator = WorkflowOrchestrator(config_obj)
        result = orchestrator.cleanup_stale_sessions()

        print(json.dumps(result, indent=2))

    except Exception as e:
        error_result = {
            "success": False,
            "error": f"Failed to cleanup sessions: {str(e)}",
        }
        print(json.dumps(error_result, indent=2))
        sys.exit(1)


@mcp.command("analyze-response")
@click.argument("session_id")
@click.argument("response_text")
@click.option("--config", "-c", type=click.Path(exists=True), help="Config file path")
def mcp_analyze_response(session_id: str, response_text: str, config: str | None) -> None:
    """Analyze an agent response for patterns indicating forgotten workflow completion.

    Args:
        session_id: The session ID to analyze
        response_text: The agent response text to analyze

    Returns JSON with alert information if patterns are detected.
    """
    try:
        # Load configuration
        config_obj = VibeConfig.load_from_file(Path(config) if config else None)

        # Analyze response
        orchestrator = WorkflowOrchestrator(config_obj)
        result = orchestrator.analyze_agent_response(session_id, response_text)

        print(json.dumps(result, indent=2))

    except Exception as e:
        error_result = {
            "success": False,
            "error": f"Failed to analyze response: {str(e)}",
        }
        print(json.dumps(error_result, indent=2))
        sys.exit(1)
