"""Workflow loader for YAML-based workflow definitions."""

from pathlib import Path

import yaml

from .models import Workflow


class WorkflowLoader:
    """Loads workflows from YAML files with fallback to Python definitions."""

    def __init__(self):
        self.data_dir = Path(__file__).parent / "data"
        self._cache: dict[str, Workflow] = {}
        self._loaded = False

    def load_workflows(self) -> dict[str, Workflow]:
        """Load all workflows from YAML files, with fallback to Python definitions."""
        if self._loaded:
            return self._cache

        workflows = {}

        # Load YAML workflows from data directory (recursively scan subdirectories)
        if self.data_dir.exists():
            for yaml_file in self.data_dir.rglob("*.yaml"):
                try:
                    workflow = self._load_workflow_from_yaml(yaml_file)
                    if workflow:
                        workflows[workflow.name] = workflow
                except Exception as e:
                    print(f"Warning: Failed to load workflow from {yaml_file}: {e}")

        self._cache = workflows
        self._loaded = True
        return workflows

    def _load_workflow_from_yaml(self, yaml_file: Path) -> Workflow | None:
        """Load a single workflow from a YAML file."""
        with open(yaml_file, encoding="utf-8") as f:
            data = yaml.safe_load(f)

        if not data:
            return None

        # Convert YAML data to Workflow instance
        # Support both 'steps' (preferred format) and 'commands' (legacy format)
        # 'steps' reflects that these are guidance suggestions, not just executable commands
        steps = data.get("steps") or data.get("commands", [])

        return Workflow(
            name=data["name"],
            description=data["description"],
            triggers=data.get("triggers", []),
            steps=steps,
            dependencies=data.get("dependencies"),
            project_types=data.get("project_types"),
            conditions=data.get("conditions"),
        )

    def get_workflow(self, name: str) -> Workflow | None:
        """Get a specific workflow by name."""
        workflows = self.load_workflows()
        return workflows.get(name)

    def load_workflow(self, name: str) -> Workflow | None:
        """Load a specific workflow by name (alias for get_workflow)."""
        return self.get_workflow(name)

    def reload(self):
        """Clear cache and reload workflows."""
        self._cache.clear()
        self._loaded = False
        return self.load_workflows()


# Global loader instance
_loader = WorkflowLoader()


def get_workflows() -> dict[str, Workflow]:
    """Get all available workflows."""
    return _loader.load_workflows()


def get_workflow(name: str) -> Workflow | None:
    """Get a specific workflow by name."""
    return _loader.get_workflow(name)


def reload_workflows() -> dict[str, Workflow]:
    """Reload workflows from files."""
    return _loader.reload()
