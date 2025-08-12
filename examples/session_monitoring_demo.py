#!/usr/bin/env python3
"""
Example script demonstrating the Vibe session monitoring system.

This script shows how the monitoring system detects and intervenes when
agents forget to complete workflow sessions.
"""

from datetime import datetime, timedelta

from rich.console import Console
from rich.panel import Panel
from rich.table import Table

from vibe.config import VibeConfig
from vibe.orchestrator import WorkflowOrchestrator
from vibe.session import WorkflowFrame, WorkflowSession


def main():
    """Demonstrate the session monitoring system."""
    console = Console()

    console.print(Panel.fit(
        "[bold blue]Vibe Session Monitoring System Demo[/bold blue]\n"
        "This demo shows how to catch agents when they forget workflow completion.",
        border_style="blue"
    ))

    # Initialize the system
    config = VibeConfig()
    orchestrator = WorkflowOrchestrator(config)

    console.print("\n[bold green]1. Creating a sample workflow session...[/bold green]")

    # Create a sample session
    frame = WorkflowFrame(
        workflow_name="demo_workflow",
        steps=[
            "Analyze the requirements",
            "Design the solution",
            "Implement the features",
            "Test the implementation",
            "Deploy to production"
        ],
        current_step=2,
        context={"demo": True}
    )

    session = WorkflowSession(
        session_id="demo1234",
        prompt="Implement a user authentication system",
        workflow_stack=[frame],
        created_at=datetime.now() - timedelta(minutes=20),  # Created 20 minutes ago
        last_accessed=datetime.now() - timedelta(minutes=12)  # Last accessed 12 minutes ago (dormant)
    )

    # Save the session
    orchestrator.session_manager.save_session(session)

    console.print(f"✓ Created session: {session.session_id}")
    console.print(f"✓ Current step: {frame.current_step + 1}/{len(frame.steps)}")
    console.print(f"✓ Last accessed: {session.last_accessed.strftime('%H:%M:%S')}")

    console.print("\n[bold yellow]2. Checking session health...[/bold yellow]")

    # Monitor session health
    result = orchestrator.monitor_sessions()

    if result["success"]:
        data = result["monitoring_data"]

        # Display session statistics
        stats_table = Table(title="Session Statistics")
        stats_table.add_column("Metric", style="cyan")
        stats_table.add_column("Count", style="magenta")

        stats_table.add_row("Total Active Sessions", str(data["total_active_sessions"]))
        stats_table.add_row("Dormant Sessions", str(data["dormant_sessions"]))
        stats_table.add_row("Stale Sessions", str(data["stale_sessions"]))
        stats_table.add_row("Forgotten Completions", str(data["forgotten_completions"]))

        console.print(stats_table)

        # Display alerts
        if data["alerts"]:
            console.print("\n[bold red]🚨 Alerts Detected:[/bold red]")
            for alert in data["alerts"]:
                console.print(f"  • {alert['type']}: {alert['message']}")
                console.print(f"    Severity: {alert['severity']}")
                if "intervention_message" in alert:
                    console.print(Panel(
                        alert["intervention_message"],
                        title="Intervention Message",
                        border_style="yellow"
                    ))

        # Display recommendations
        if result["recommendations"]:
            console.print("\n[bold blue]💡 Recommendations:[/bold blue]")
            for rec in result["recommendations"]:
                console.print(f"  • {rec}")

    console.print("\n[bold yellow]3. Simulating agent response analysis...[/bold yellow]")

    # Simulate an agent response that indicates completion without workflow management
    agent_responses = [
        "That completes the authentication implementation. The system is now ready to use.",
        "I'll continue with the next step in the workflow using advance_workflow.",
        "In summary, we have successfully finished the user authentication feature."
    ]

    for i, response in enumerate(agent_responses, 1):
        console.print(f"\n[cyan]Agent Response {i}:[/cyan] {response}")

        result = orchestrator.analyze_agent_response(session.session_id, response)

        if result["alert_detected"]:
            console.print("[red]⚠️  Alert: Forgotten completion pattern detected![/red]")
            alert = result["alert"]
            console.print(Panel(
                alert["intervention_message"],
                title=f"Intervention Required ({alert['severity']} priority)",
                border_style="red"
            ))
        else:
            console.print("[green]✓ No issues detected - proper workflow management[/green]")

    console.print("\n[bold yellow]4. Demonstrating cleanup...[/bold yellow]")

    # Create an old stale session for cleanup demo
    old_frame = WorkflowFrame(
        workflow_name="old_workflow",
        steps=["Old step 1", "Old step 2"],
        current_step=0,
        context={}
    )

    old_session = WorkflowSession(
        session_id="old12345",
        prompt="Old abandoned workflow",
        workflow_stack=[old_frame],
        created_at=datetime.now() - timedelta(hours=8),  # Very old
        last_accessed=datetime.now() - timedelta(hours=8)
    )

    orchestrator.session_manager.save_session(old_session)
    console.print(f"✓ Created old session for cleanup demo: {old_session.session_id}")

    # Clean up stale sessions
    result = orchestrator.cleanup_stale_sessions()

    if result["success"]:
        console.print(f"✓ Cleaned up {len(result['cleaned_sessions'])} stale sessions")
        for session_id in result["cleaned_sessions"]:
            console.print(f"  • Archived: {session_id}")

    console.print("\n[bold green]5. Final session check...[/bold green]")

    # Final health check
    result = orchestrator.monitor_sessions()
    if result["success"]:
        data = result["monitoring_data"]
        console.print(f"✓ Active sessions remaining: {data['total_active_sessions']}")
        console.print(f"✓ Alerts remaining: {len(data['alerts'])}")

    # Clean up demo session
    orchestrator.session_manager.archive_session(session.session_id)
    console.print(f"✓ Cleaned up demo session: {session.session_id}")

    console.print(Panel.fit(
        "[bold green]Demo Complete![/bold green]\n\n"
        "The monitoring system successfully:\n"
        "• Detected dormant sessions\n"
        "• Identified completion patterns without workflow management\n"
        "• Generated intervention messages\n"
        "• Provided cleanup recommendations\n"
        "• Automatically archived stale sessions\n\n"
        "[bold cyan]Integration:[/bold cyan] These features are available in VS Code via MCP tools:\n"
        "• monitor_sessions\n"
        "• analyze_agent_response\n"
        "• cleanup_stale_sessions",
        border_style="green"
    ))


if __name__ == "__main__":
    main()
