"""
Test the session monitoring system for detecting forgotten workflow completion.
"""

from datetime import datetime, timedelta
from unittest.mock import patch

import pytest

from vibe.config import VibeConfig
from vibe.orchestrator import WorkflowOrchestrator
from vibe.session import SessionManager, WorkflowFrame, WorkflowSession
from vibe.session_monitor import SessionAlert, SessionMonitor


@pytest.fixture
def mock_orchestrator():
    """Create a mock orchestrator for testing."""
    config = VibeConfig()
    orchestrator = WorkflowOrchestrator(config)
    return orchestrator


@pytest.fixture
def session_monitor(mock_orchestrator):
    """Create a session monitor for testing."""
    return SessionMonitor(mock_orchestrator)


@pytest.fixture
def sample_session():
    """Create a sample workflow session for testing."""
    frame = WorkflowFrame(
        workflow_name="test_workflow",
        steps=["Step 1", "Step 2", "Step 3"],
        current_step=1,
        context={},
    )

    session = WorkflowSession(
        session_id="test1234",
        prompt="Test workflow",
        workflow_stack=[frame],
        created_at=datetime.now() - timedelta(hours=1),
        last_accessed=datetime.now() - timedelta(minutes=15),
    )

    return session


class TestSessionMonitor:
    """Test the SessionMonitor class."""

    def test_detect_dormant_session(self, session_monitor, sample_session):
        """Test detection of dormant sessions."""
        # Make session dormant (inactive for 15 minutes, threshold is 10)
        assert session_monitor._is_session_dormant(sample_session)

    def test_detect_stale_session(self, session_monitor):
        """Test detection of stale sessions."""
        # Create a stale session (inactive for 45 minutes, threshold is 30)
        stale_session = WorkflowSession(
            session_id="stale123",
            prompt="Stale workflow",
            workflow_stack=[],
            created_at=datetime.now() - timedelta(hours=2),
            last_accessed=datetime.now() - timedelta(minutes=45),
        )

        assert session_monitor._is_session_stale(stale_session)

    def test_detect_completion_patterns(self, session_monitor):
        """Test detection of completion patterns in agent responses."""
        completion_responses = [
            (
                "That completes the implementation. We have successfully "
                "set up the authentication system."
            ),
            "In summary, the project is now ready for deployment.",
            "Final step: the tests are passing and everything looks good.",
            "This concludes our work on the feature.",
        ]

        for response in completion_responses:
            assert session_monitor._has_completion_pattern(response)

    def test_no_false_positive_completion_patterns(self, session_monitor):
        """Test that non-completion responses don't trigger patterns."""
        non_completion_responses = [
            "Let's continue with the next step.",
            "I'm working on implementing the feature.",
            "The current status shows progress.",
        ]

        for response in non_completion_responses:
            assert not session_monitor._has_completion_pattern(response)

    def test_detect_workflow_management(self, session_monitor):
        """Test detection of workflow management keywords."""
        workflow_responses = [
            "I'll use advance_workflow to move to the next step.",
            "Let me break_workflow since we're done.",
            "I should check workflow status first.",
        ]

        for response in workflow_responses:
            assert session_monitor._has_workflow_management(response)

    def test_analyze_forgotten_completion(self, session_monitor):
        """Test analysis of responses that indicate forgotten completion."""
        # Response with completion pattern but no workflow management
        response = "That completes the task. Everything is working perfectly now."
        alert = session_monitor.analyze_agent_response("test1234", response)

        assert alert is not None
        assert alert.alert_type == "forgotten_completion"
        assert alert.severity == "high"

    def test_no_alert_for_proper_workflow_management(self, session_monitor):
        """Test that proper workflow management doesn't trigger alerts."""
        # Response with both completion pattern and workflow management
        response = (
            "That completes the task. I'll use advance_workflow to move "
            "to the next step."
        )
        alert = session_monitor.analyze_agent_response("test1234", response)

        assert alert is None

    @patch.object(SessionMonitor, "_get_active_sessions")
    def test_check_session_health(
        self, mock_get_sessions, session_monitor, sample_session
    ):
        """Test the session health check functionality."""
        mock_get_sessions.return_value = [sample_session]

        alerts = session_monitor.check_session_health()

        # Should detect the dormant session
        assert len(alerts) >= 1
        assert any(alert.alert_type == "dormant_session" for alert in alerts)

    def test_generate_intervention_message(self, session_monitor, sample_session):
        """Test generation of intervention messages."""
        alert = SessionAlert(
            session_id="test1234",
            alert_type="forgotten_completion",
            message="Test alert",
            severity="high",
            timestamp=datetime.now(),
            suggested_actions=["advance_workflow", "break_workflow"],
        )

        with patch.object(
            session_monitor.session_manager, "load_session", return_value=sample_session
        ):
            message = session_monitor.generate_intervention_message(alert)

            assert "Workflow Management Reminder" in message
            assert "advance_workflow" in message
            assert "break_workflow" in message
            assert sample_session.session_id in message

    @patch.object(SessionMonitor, "_get_active_sessions")
    def test_get_session_status_summary(
        self, mock_get_sessions, session_monitor, sample_session
    ):
        """Test the session status summary functionality."""
        mock_get_sessions.return_value = [sample_session]

        summary = session_monitor.get_session_status_summary()

        assert "total_active_sessions" in summary
        assert "dormant_sessions" in summary
        assert "alerts" in summary
        assert "session_details" in summary

        # Should show 1 active session
        assert summary["total_active_sessions"] == 1

        # Should detect dormant session
        assert summary["dormant_sessions"] >= 1


class TestSessionMonitorIntegration:
    """Test integration with the orchestrator."""

    @patch.object(SessionManager, "list_sessions")
    @patch.object(SessionManager, "load_session")
    def test_orchestrator_monitor_sessions(
        self, mock_load, mock_list, mock_orchestrator
    ):
        """Test the orchestrator's monitor_sessions method."""
        # Setup mock session
        mock_list.return_value = ["test1234"]
        mock_session = WorkflowSession(
            session_id="test1234",
            prompt="Test",
            workflow_stack=[],
            created_at=datetime.now() - timedelta(hours=1),
            last_accessed=datetime.now() - timedelta(minutes=15),
        )
        mock_load.return_value = mock_session

        result = mock_orchestrator.monitor_sessions()

        assert result["success"] is True
        assert "monitoring_data" in result
        assert "recommendations" in result

    @patch.object(SessionManager, "list_sessions")
    @patch.object(SessionManager, "load_session")
    @patch.object(SessionManager, "archive_session")
    def test_orchestrator_cleanup_stale_sessions(
        self, mock_archive, mock_load, mock_list, mock_orchestrator
    ):
        """Test the orchestrator's cleanup_stale_sessions method."""
        # Setup mock stale session
        mock_list.return_value = ["stale123"]
        mock_session = WorkflowSession(
            session_id="stale123",
            prompt="Stale",
            workflow_stack=[],
            created_at=datetime.now() - timedelta(hours=7),  # Old enough to archive
            last_accessed=datetime.now() - timedelta(hours=7),
        )
        mock_load.return_value = mock_session

        result = mock_orchestrator.cleanup_stale_sessions()

        assert result["success"] is True
        assert "cleaned_sessions" in result
        mock_archive.assert_called_once_with("stale123")

    def test_orchestrator_analyze_agent_response(self, mock_orchestrator):
        """Test the orchestrator's analyze_agent_response method."""
        result = mock_orchestrator.analyze_agent_response(
            "test1234", "That completes the implementation task."
        )

        assert result["success"] is True
        assert "alert_detected" in result


if __name__ == "__main__":
    pytest.main([__file__])
