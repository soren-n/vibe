#!/usr/bin/env bash

# Vibe Self-Hosting Demonstration
# This script shows vibe managing its own development lifecycle

echo "🎯 VIBE SELF-HOSTING DEMONSTRATION"
echo "=================================="
echo ""
echo "This demonstrates vibe using itself for its own development process."
echo "Each command shows vibe analyzing prompts and executing appropriate workflows."
echo ""

# Function to run vibe with a prompt and show what it does
demo_vibe() {
    local prompt="$1"
    local description="$2"

    echo "📋 $description"
    echo "Prompt: \"$prompt\""
    echo "----------------------------------------"
    uv run vibe "$prompt"
    echo ""
    echo "Press Enter to continue..."
    read -r
    echo ""
}

# Change to vibe directory
cd "$(dirname "$0")"

echo "🚀 Starting vibe self-hosting demonstration..."
echo ""

# 1. Project Analysis
demo_vibe "analyze the project structure and dependencies" \
          "STEP 1: Project Analysis - Vibe examining itself"

# 2. Development Environment
demo_vibe "set up development environment and validate build" \
          "STEP 2: Development Setup - Vibe preparing its own dev environment"

# 3. Code Quality
demo_vibe "format code and check quality standards" \
          "STEP 3: Code Quality - Vibe improving its own code"

# 4. Documentation Generation
demo_vibe "generate documentation and workflow reference" \
          "STEP 4: Documentation - Vibe documenting itself"

# 5. Repository Management
demo_vibe "check git status and repository health" \
          "STEP 5: Repository Management - Vibe managing its own git repo"

# 6. Session Completion
demo_vibe "complete development session with final validation" \
          "STEP 6: Session Completion - Vibe finishing its own development session"

echo "🎉 DEMONSTRATION COMPLETE!"
echo "========================="
echo ""
echo "Vibe has successfully demonstrated its ability to:"
echo "  ✅ Analyze its own project structure"
echo "  ✅ Set up its own development environment"
echo "  ✅ Format and improve its own code"
echo "  ✅ Generate its own documentation"
echo "  ✅ Manage its own git repository"
echo "  ✅ Complete its own development sessions"
echo ""
echo "This is true 'eating your own dog food' - vibe is now"
echo "capable of managing its own development lifecycle!"
echo ""
echo "🌟 Try it yourself:"
echo "  vibe \"implement a new feature for workflow analysis\""
echo "  vibe \"run comprehensive quality checks\""
echo "  vibe \"prepare for release with full validation\""
