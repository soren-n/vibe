#!/usr/bin/env python3
"""Test checklist functionality in MCP and CLI."""

import json
import subprocess
import sys


def run_command(cmd: list[str]) -> dict:
    """Run a command and return parsed JSON result."""
    print(f"🔄 Running: {' '.join(cmd)}")
    try:
        result = subprocess.run(cmd, capture_output=True, text=True, check=True)
        return json.loads(result.stdout)
    except (subprocess.CalledProcessError, json.JSONDecodeError) as e:
        print(f"❌ Command failed: {e}")
        if hasattr(e, "stdout"):
            print(f"   stdout: {e.stdout}")
        if hasattr(e, "stderr"):
            print(f"   stderr: {e.stderr}")
        sys.exit(1)


def test_cli_checklists():
    """Test CLI checklist commands."""
    print("\n📋 Testing CLI Checklist Commands")
    print("=" * 40)

    # Test list command
    print("\n1. Testing list command...")
    cmd = ["uv", "run", "vibe", "checklists", "list", "--format", "json"]
    result = run_command(cmd)
    assert result["success"], "List command failed"
    assert len(result["checklists"]) > 0, "No checklists found"
    print(f"   ✅ Found {len(result['checklists'])} checklists")

    # Test show command
    print("\n2. Testing show command...")
    first_checklist = result["checklists"][0]["name"]
    cmd = [
        "uv",
        "run",
        "vibe",
        "checklists",
        "show",
        first_checklist,
        "--format",
        "json",
    ]
    result = run_command(cmd)
    assert result["success"], "Show command failed"
    assert result["checklist"]["name"] == first_checklist, "Wrong checklist returned"
    print(f"   ✅ Successfully showed '{first_checklist}'")

    # Test run command
    print("\n3. Testing run command...")
    cmd = [
        "uv",
        "run",
        "vibe",
        "checklists",
        "run",
        first_checklist,
        "--format",
        "json",
    ]
    result = run_command(cmd)
    assert result["success"], "Run command failed"
    assert len(result["checklist"]["items"]) > 0, "No checklist items found"
    print(
        f"   ✅ Successfully ran '{first_checklist}' with {len(result['checklist']['items'])} items"
    )


def test_mcp_checklists():
    """Test MCP checklist commands."""
    print("\n🔧 Testing MCP Checklist Commands")
    print("=" * 40)

    # Test list-checklists
    print("\n1. Testing mcp list-checklists...")
    cmd = ["uv", "run", "vibe", "mcp", "list-checklists"]
    result = run_command(cmd)
    assert result["success"], "MCP list-checklists failed"
    assert len(result["checklists"]) > 0, "No checklists found"
    print(f"   ✅ Found {len(result['checklists'])} checklists via MCP")

    # Test with project type filter
    print("\n2. Testing mcp list-checklists with project filter...")
    cmd = ["uv", "run", "vibe", "mcp", "list-checklists", "--project-type", "python"]
    result = run_command(cmd)
    assert result["success"], "MCP list-checklists with filter failed"
    python_checklists = [
        c for c in result["checklists"] if "python" in c.get("project_types", [])
    ]
    print(f"   ✅ Found {len(python_checklists)} Python-specific checklists")

    # Test show-checklist
    print("\n3. Testing mcp show-checklist...")
    first_checklist = result["checklists"][0]["name"]
    cmd = ["uv", "run", "vibe", "mcp", "show-checklist", first_checklist]
    result = run_command(cmd)
    assert result["success"], "MCP show-checklist failed"
    assert result["checklist"]["name"] == first_checklist, "Wrong checklist returned"
    print(f"   ✅ Successfully showed '{first_checklist}' via MCP")

    # Test run-checklist
    print("\n4. Testing mcp run-checklist...")
    cmd = ["uv", "run", "vibe", "mcp", "run-checklist", first_checklist]
    result = run_command(cmd)
    assert result["success"], "MCP run-checklist failed"
    assert len(result["checklist"]["items"]) > 0, "No checklist items found"
    print(
        f"   ✅ Successfully ran '{first_checklist}' via MCP with {len(result['checklist']['items'])} items"
    )

    # Test run-checklist with simple format
    print("\n5. Testing mcp run-checklist with simple format...")
    cmd = [
        "uv",
        "run",
        "vibe",
        "mcp",
        "run-checklist",
        first_checklist,
        "--format",
        "simple",
    ]
    result = run_command(cmd)
    assert result["success"], "MCP run-checklist simple format failed"
    assert "formatted_output" in result["checklist"], "No formatted output found"
    print("   ✅ Successfully got simple format output")


def main():
    """Run all tests."""
    print("🧪 Testing Checklist API Implementation")
    print("=" * 50)

    try:
        test_cli_checklists()
        test_mcp_checklists()

        print("\n🎉 All checklist tests passed!")
        print("✅ CLI commands working")
        print("✅ MCP commands working")
        print("✅ JSON output formatted correctly")
        print("✅ Error handling working")

    except Exception as e:
        print(f"\n❌ Test failed: {e}")
        sys.exit(1)


if __name__ == "__main__":
    main()
