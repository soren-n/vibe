#!/usr/bin/env python3
"""Quick test to verify suffix configuration loading."""

from pathlib import Path

from vibe.config import VibeConfig

# Test loading the suffix configuration
config_path = Path("test_suffix.yaml")
config = VibeConfig.load_from_file(config_path)

print("Configuration loaded successfully!")
print(f"AI Agent Prefix: {config.session.ai_agent_prefix}")
print(f"AI Agent Suffix: {config.session.ai_agent_suffix}")
