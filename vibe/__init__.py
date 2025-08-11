"""Vibe: Intelligent workflow orchestrator for vibe coding."""

__version__ = "0.1.0"
__author__ = "Soren N"
__description__ = "A CLI tool for vibe coding with intelligent workflow orchestration"

from .analyzer import PromptAnalyzer
from .config import VibeConfig
from .orchestrator import WorkflowOrchestrator

__all__ = ["PromptAnalyzer", "VibeConfig", "WorkflowOrchestrator"]
