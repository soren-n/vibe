#!/usr/bin/env python3
"""
Test script to verify the monitoring system is working correctly.
"""

import sys

from vibe.config import VibeConfig
from vibe.orchestrator import WorkflowOrchestrator
from vibe.session_monitor import SessionMonitor


def test_monitoring_system():
    """Test the complete monitoring system"""
    print("🔍 Testing Vibe Monitoring System")
    print("=" * 50)

    # Initialize components
    config = VibeConfig.load_from_file()  # Load default config
    orchestrator = WorkflowOrchestrator(config)
    monitor = SessionMonitor(orchestrator)

    # Test 1: Check monitoring methods exist
    print("\n1. Verifying monitoring methods...")
    methods = ["monitor_sessions", "cleanup_stale_sessions", "analyze_agent_response"]
    for method in methods:
        if hasattr(orchestrator, method):
            print(f"   ✅ {method}")
        else:
            print(f"   ❌ {method}")
            return False

    # Test 2: Test session monitoring
    print("\n2. Testing session monitoring...")
    try:
        result = orchestrator.monitor_sessions()
        print("   ✅ Monitor sessions method succeeded")

        if "monitoring_data" in result:
            monitoring_data = result["monitoring_data"]
            sessions_count = monitoring_data.get("total_active_sessions", 0)
            print(f"   📊 Found {sessions_count} active sessions")

            alerts = monitoring_data.get("alerts", [])
            print(f"   � Found {len(alerts)} alerts")

            if alerts:
                for alert in alerts[:3]:  # Show first 3 alerts
                    print(f"     - {alert['type']}: {alert['message']}")
        else:
            print("   ℹ️  No monitoring data in result")

    except Exception as e:
        print(f"   ❌ Error: {e}")
        import traceback

        traceback.print_exc()
        return False

    # Test 3: Test agent response analysis
    print("\n3. Testing agent response analysis...")
    test_responses = [
        "I've completed the analysis. The project structure looks good.",
        "Here's my summary of the findings: ...",
        "The linting checks passed successfully.",
        "I need to check the dependencies first.",
    ]

    for i, response in enumerate(test_responses, 1):
        try:
            # Use a dummy session ID for testing
            result = orchestrator.analyze_agent_response("test_session", response)
            completion_indicators = result.get("analysis", {}).get(
                "completion_indicators", []
            )
            print(
                f"   Response {i}: {len(completion_indicators)} completion indicators"
            )
        except Exception as e:
            print(f"   ❌ Error analyzing response {i}: {e}")
            return False

    # Test 4: Test SessionMonitor class
    print("\n4. Testing SessionMonitor class...")
    try:
        health_report = monitor.check_session_health()
        print(f"   ✅ Health report generated: {len(health_report)} alerts")

        # Test status summary
        status_summary = monitor.get_session_status_summary()
        print(
            f"   📊 Status summary: {status_summary['total_active_sessions']} sessions"
        )

        # Test pattern detection by analyzing agent response
        test_text = "I've completed the analysis and found no issues."
        alert = monitor.analyze_agent_response("test_session", test_text)
        if alert:
            print(f"   🔍 Agent response analysis detected pattern: {alert.alert_type}")
        else:
            print("   🔍 Agent response analysis: no patterns detected")

    except Exception as e:
        print(f"   ❌ Error: {e}")
        import traceback

        traceback.print_exc()
        return False

    print("\n" + "=" * 50)
    print("🎉 All monitoring system tests passed!")
    return True


if __name__ == "__main__":
    success = test_monitoring_system()
    sys.exit(0 if success else 1)
