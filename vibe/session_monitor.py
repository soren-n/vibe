"""
Session Monitor - Detects and intervenes when agents forget workflow completion.

This module implements multiple strategies to catch agents when they:
1. Start workflows but forget to advance/break them
2. Summarize and stop without checking workflow status
3. Leave sessions in dormant states

Based on research from LangGraph (checkpointing, state persistence) and
Dapr Agents (workflow monitoring, completion tracking).
"""

import logging
import re
from dataclasses import dataclass, field
from datetime import datetime, timedelta
from typing import Any

from .orchestrator import WorkflowOrchestrator
from .session import WorkflowSession

logger = logging.getLogger(__name__)


@dataclass
class SessionAlert:
    """Represents an alert about a session that needs attention."""
    session_id: str
    alert_type: str
    message: str
    severity: str  # 'low', 'medium', 'high'
    timestamp: datetime
    suggested_actions: list[str] = field(default_factory=list)


class SessionMonitor:
    """
    Monitors workflow sessions and intervenes when agents forget to complete them.

    Features:
    - Detects dormant sessions based on inactivity
    - Analyzes response patterns for completion indicators
    - Provides automated reminders and suggestions
    - Tracks session health metrics
    """

    def __init__(self, orchestrator: WorkflowOrchestrator):
        self.orchestrator = orchestrator
        self.session_manager = orchestrator.session_manager

        # Configuration
        self.dormant_threshold_minutes = 10  # Sessions inactive for 10+ minutes
        self.stale_threshold_minutes = 30    # Sessions inactive for 30+ minutes
        self.max_session_age_hours = 6       # Auto-archive after 6 hours

        # Pattern detection for completion indicators
        self.completion_patterns = [
            r'\b(summary|conclusion|final|complete|done|finished|ready)\b',
            r'\b(that should|this completes|we have|i have)\b',
            r'\b(in summary|to summarize|to conclude)\b',
            r'\b(next steps?|follow.?up|moving forward)\b',
        ]

        # Pattern detection for workflow continuation indicators
        self.continuation_patterns = [
            r'\b(next|continue|proceed|advance|step)\b',
            r'\b(workflow|checklist|session)\b',
            r'\b(let me|i will|shall we)\b',
        ]

        # Track recent agent responses for pattern analysis
        self._response_history: dict[str, list[tuple[str, datetime]]] = {}

    def check_session_health(self) -> list[SessionAlert]:
        """
        Check all active sessions for health issues and return alerts.

        Returns:
            List of alerts requiring attention
        """
        alerts = []
        active_sessions = self._get_active_sessions()

        for session in active_sessions:
            # Check for dormant sessions
            if self._is_session_dormant(session):
                alerts.append(self._create_dormant_alert(session))

            # Check for stale sessions
            if self._is_session_stale(session):
                alerts.append(self._create_stale_alert(session))

            # Check for sessions that should be auto-archived
            if self._should_auto_archive(session):
                alerts.append(self._create_archive_alert(session))

        return alerts

    def analyze_agent_response(self, session_id: str, response: str) -> SessionAlert | None:
        """
        Analyze an agent response for patterns indicating forgotten workflow completion.

        Args:
            session_id: ID of the session
            response: Agent's response text

        Returns:
            Alert if intervention is needed, None otherwise
        """
        # Store response in history
        if session_id not in self._response_history:
            self._response_history[session_id] = []

        self._response_history[session_id].append((response, datetime.now()))

        # Keep only recent responses (last 5)
        self._response_history[session_id] = self._response_history[session_id][-5:]

        # Check for completion patterns without workflow management
        if self._has_completion_pattern(response) and not self._has_workflow_management(response):
            return self._create_forgotten_completion_alert(session_id, response)

        return None

    def generate_intervention_message(self, alert: SessionAlert) -> str:
        """
        Generate an intervention message to remind the agent about workflow management.

        Args:
            alert: The alert requiring intervention

        Returns:
            Formatted message to remind the agent
        """
        session = self.session_manager.load_session(alert.session_id)
        if not session:
            return ""

        current_step = session.get_current_step()

        if alert.alert_type == "forgotten_completion":
            return self._format_completion_reminder(session, current_step)
        elif alert.alert_type == "dormant_session":
            return self._format_dormant_reminder(session, current_step)
        elif alert.alert_type == "stale_session":
            return self._format_stale_reminder(session, current_step)

        return ""

    def get_session_status_summary(self) -> dict[str, Any]:
        """
        Get a summary of all session statuses for monitoring dashboard.

        Returns:
            Dictionary with session statistics and status information
        """
        active_sessions = self._get_active_sessions()
        alerts = self.check_session_health()

        return {
            "total_active_sessions": len(active_sessions),
            "dormant_sessions": len([a for a in alerts if a.alert_type == "dormant_session"]),
            "stale_sessions": len([a for a in alerts if a.alert_type == "stale_session"]),
            "forgotten_completions": len([a for a in alerts if a.alert_type == "forgotten_completion"]),
            "alerts": [
                {
                    "session_id": a.session_id,
                    "type": a.alert_type,
                    "severity": a.severity,
                    "message": a.message,
                    "timestamp": a.timestamp.isoformat(),
                    "suggested_actions": a.suggested_actions
                }
                for a in alerts
            ],
            "session_details": [
                {
                    "session_id": s.session_id,
                    "created_at": s.created_at.isoformat(),
                    "last_accessed": s.last_accessed.isoformat(),
                    "current_workflow": s.current_frame.workflow_name if s.current_frame else None,
                    "current_step": s.current_frame.current_step if s.current_frame else None,
                    "total_steps": len(s.current_frame.steps) if s.current_frame else 0,
                    "is_complete": s.is_complete
                }
                for s in active_sessions
            ]
        }

    def cleanup_stale_sessions(self) -> list[str]:
        """
        Automatically clean up sessions that have been stale for too long.

        Returns:
            List of session IDs that were cleaned up
        """
        cleaned_sessions = []
        active_sessions = self._get_active_sessions()

        for session in active_sessions:
            if self._should_auto_archive(session):
                logger.info(f"Auto-archiving stale session {session.session_id}")
                self.session_manager.archive_session(session.session_id)
                cleaned_sessions.append(session.session_id)

        return cleaned_sessions

    # Private helper methods

    def _get_active_sessions(self) -> list[WorkflowSession]:
        """Get all currently active workflow sessions."""
        sessions = []
        for session_id in self.session_manager.list_active_sessions():
            session = self.session_manager.load_session(session_id)
            if session and not session.is_complete:
                sessions.append(session)
        return sessions

    def _is_session_dormant(self, session: WorkflowSession) -> bool:
        """Check if a session is dormant (inactive for dormant_threshold_minutes)."""
        threshold = datetime.now() - timedelta(minutes=self.dormant_threshold_minutes)
        return session.last_accessed < threshold

    def _is_session_stale(self, session: WorkflowSession) -> bool:
        """Check if a session is stale (inactive for stale_threshold_minutes)."""
        threshold = datetime.now() - timedelta(minutes=self.stale_threshold_minutes)
        return session.last_accessed < threshold

    def _should_auto_archive(self, session: WorkflowSession) -> bool:
        """Check if a session should be automatically archived."""
        threshold = datetime.now() - timedelta(hours=self.max_session_age_hours)
        return session.created_at < threshold

    def _has_completion_pattern(self, text: str) -> bool:
        """Check if text contains patterns indicating completion."""
        text_lower = text.lower()
        return any(re.search(pattern, text_lower) for pattern in self.completion_patterns)

    def _has_workflow_management(self, text: str) -> bool:
        """Check if text contains workflow management keywords."""
        workflow_keywords = [
            'advance_workflow', 'break_workflow', 'get_workflow_status',
            'list_workflow_sessions', 'workflow status', 'next step',
            'continue workflow', 'complete workflow'
        ]
        text_lower = text.lower()
        return any(keyword in text_lower for keyword in workflow_keywords)

    def _create_dormant_alert(self, session: WorkflowSession) -> SessionAlert:
        """Create an alert for a dormant session."""
        minutes_inactive = (datetime.now() - session.last_accessed).total_seconds() / 60

        return SessionAlert(
            session_id=session.session_id,
            alert_type="dormant_session",
            message=f"Session has been inactive for {minutes_inactive:.1f} minutes",
            severity="medium",
            timestamp=datetime.now(),
            suggested_actions=[
                "Check if workflow should be advanced",
                "Consider breaking out of workflow if complete",
                "Verify if session is still needed"
            ]
        )

    def _create_stale_alert(self, session: WorkflowSession) -> SessionAlert:
        """Create an alert for a stale session."""
        minutes_inactive = (datetime.now() - session.last_accessed).total_seconds() / 60

        return SessionAlert(
            session_id=session.session_id,
            alert_type="stale_session",
            message=f"Session has been inactive for {minutes_inactive:.1f} minutes and may be abandoned",
            severity="high",
            timestamp=datetime.now(),
            suggested_actions=[
                "Archive session if no longer needed",
                "Break out of workflow to clean up",
                "Check if session was forgotten"
            ]
        )

    def _create_archive_alert(self, session: WorkflowSession) -> SessionAlert:
        """Create an alert for a session that should be archived."""
        hours_old = (datetime.now() - session.created_at).total_seconds() / 3600

        return SessionAlert(
            session_id=session.session_id,
            alert_type="auto_archive",
            message=f"Session is {hours_old:.1f} hours old and will be auto-archived",
            severity="low",
            timestamp=datetime.now(),
            suggested_actions=[
                "Session will be automatically archived",
                "No action required unless session is still active"
            ]
        )

    def _create_forgotten_completion_alert(self, session_id: str, response: str) -> SessionAlert:
        """Create an alert for forgotten workflow completion."""
        return SessionAlert(
            session_id=session_id,
            alert_type="forgotten_completion",
            message="Agent provided completion-like response without managing workflow",
            severity="high",
            timestamp=datetime.now(),
            suggested_actions=[
                "Remind agent to call advance_workflow",
                "Check if workflow should be completed with break_workflow",
                "Verify workflow status with get_workflow_status"
            ]
        )

    def _format_completion_reminder(self, session: WorkflowSession, current_step: dict[str, Any]) -> str:
        """Format a reminder message for forgotten completion."""
        step_info = ""
        if current_step:
            step_info = f"You are currently on step {current_step['step_number']} of {len(session.current_frame.steps)} in the '{current_step['workflow']}' workflow."

        return f"""
⚠️ **Workflow Management Reminder**

I notice you may have completed a task, but there's an active workflow session that needs attention.

{step_info}

**Please choose one of the following actions:**
- `advance_workflow` - Mark current step complete and move to next step
- `break_workflow` - Exit the current workflow (if task is complete)
- `get_workflow_status` - Check current workflow status

**Session ID:** `{session.session_id}`

This ensures proper workflow completion and prevents orphaned sessions.
"""

    def _format_dormant_reminder(self, session: WorkflowSession, current_step: dict[str, Any]) -> str:
        """Format a reminder message for dormant sessions."""
        step_info = ""
        if current_step:
            step_info = f"Current step: {current_step['step_text']}"

        return f"""
🔄 **Active Workflow Session Detected**

You have a workflow session that's been inactive.

**Session:** `{session.session_id}`
**Workflow:** `{session.current_frame.workflow_name if session.current_frame else 'Unknown'}`
{step_info}

**Consider:**
- `get_workflow_status` - Check what step you're on
- `advance_workflow` - Continue to next step if current is complete
- `break_workflow` - Exit if workflow is no longer needed
"""

    def _format_stale_reminder(self, session: WorkflowSession, current_step: dict[str, Any]) -> str:
        """Format a reminder message for stale sessions."""
        return f"""
⏰ **Stale Workflow Session**

Session `{session.session_id}` has been inactive for a significant time.

**Recommended action:**
- `break_workflow` - Clean up if workflow is complete/abandoned
- `list_workflow_sessions` - Review all active sessions

**Note:** Sessions inactive for {self.max_session_age_hours} hours will be auto-archived.
"""
