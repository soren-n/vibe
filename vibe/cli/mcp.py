"""MCP (Model Context Protocol) commands for step-by-step workflow execution."""

import json
import sys
from pathlib import Path

import click

from ..config import VibeConfig
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
