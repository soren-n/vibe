"""Workflow and checklist loader for YAML-based definitions."""

from __future__ import annotations

from collections.abc import Callable
from pathlib import Path
from typing import Any

import yaml

from .models import Checklist, Workflow
from .validation import WorkflowValidationError, validate_workflow_data

# Try to import watchdog, gracefully handle if not available
try:
    from watchdog.events import FileSystemEvent, FileSystemEventHandler
    from watchdog.observers import Observer

    WATCHDOG_AVAILABLE = True
except ImportError:
    FileSystemEvent = None  # type: ignore
    FileSystemEventHandler = None  # type: ignore
    Observer = None  # type: ignore
    WATCHDOG_AVAILABLE = False


if WATCHDOG_AVAILABLE:

    class WorkflowFileHandler(FileSystemEventHandler):  # type: ignore
        """Handles file system events for workflow YAML files."""

        def __init__(self, callback: Callable[[], None]) -> None:
            self.callback = callback
            super().__init__()

        def on_modified(self, event: Any) -> None:
            if event.is_directory:
                return
            if str(event.src_path).endswith(".yaml"):
                self.callback()

        def on_created(self, event: Any) -> None:
            if event.is_directory:
                return
            if str(event.src_path).endswith(".yaml"):
                self.callback()

        def on_deleted(self, event: Any) -> None:
            if event.is_directory:
                return
            if str(event.src_path).endswith(".yaml"):
                self.callback()
else:
    # Fallback handler when watchdog is not available
    class WorkflowFileHandler:  # type: ignore[no-redef]
        def __init__(self, callback: Callable[[], None]) -> None:
            self.callback = callback


class WorkflowLoader:
    """Loads workflows and checklists from YAML files with dynamic discovery."""

    def __init__(self, *, enable_validation: bool = True) -> None:
        self.data_dir = Path(__file__).parent / "data"
        self.checklists_dir = self.data_dir / "checklists"
        self._workflow_cache: dict[str, Workflow] = {}
        self._checklist_cache: dict[str, Checklist] = {}
        self._file_timestamps: dict[Path, float] = {}
        self._loaded = False
        self.enable_validation = enable_validation
        # Hot reloading support
        self._observer = None
        self._watching = False
        self._reload_callbacks: list[Callable[[], None]] = []

    def _get_file_timestamp(self, file_path: Path) -> float:
        """Get the modification timestamp of a file."""
        try:
            return file_path.stat().st_mtime
        except OSError:
            return 0.0

    def _is_cache_valid(self) -> bool:
        """Check if the cache is still valid by comparing file timestamps."""
        if not self._loaded:
            return False

        # Check if any workflow files have been modified, added, or removed
        current_workflow_files = set(self.data_dir.rglob("*.yaml")) - set(
            self.checklists_dir.rglob("*.yaml")
        )
        current_checklist_files = (
            set(self.checklists_dir.rglob("*.yaml"))
            if self.checklists_dir.exists()
            else set()
        )
        current_files = current_workflow_files | current_checklist_files
        cached_files = set(self._file_timestamps.keys())

        # If file set changed, cache is invalid
        if current_files != cached_files:
            return False

        # Check if any existing files have been modified
        for file_path in current_files:
            current_timestamp = self._get_file_timestamp(file_path)
            cached_timestamp = self._file_timestamps.get(file_path, 0.0)
            if current_timestamp > cached_timestamp:
                return False

        return True

    def load_workflows(self, force_reload: bool = False) -> dict[str, Workflow]:
        """Load all workflows from YAML files with dynamic discovery.

        Args:
            force_reload: Force reload even if cache appears valid
        """
        if not force_reload and self._is_cache_valid():
            return self._workflow_cache

        # Load all workflow data
        workflows, checklists, timestamps = self._load_all_workflow_data()

        # Update caches
        self._update_caches(workflows, checklists, timestamps)

        return workflows

    def _load_all_workflow_data(
        self,
    ) -> tuple[dict[str, Workflow], dict[str, Any], dict[Path, float]]:
        """Load all workflow and checklist data from YAML files."""
        workflows = {}
        checklists = {}
        timestamps = {}

        # Load workflows from data directory
        workflow_data = self._load_workflows_from_data_dir()
        workflows.update(workflow_data["workflows"])
        timestamps.update(workflow_data["timestamps"])

        # Load checklists from checklists directory
        checklist_data = self._load_checklists_from_dir()
        checklists.update(checklist_data["checklists"])
        timestamps.update(checklist_data["timestamps"])

        return workflows, checklists, timestamps

    def _load_workflows_from_data_dir(self) -> dict[str, Any]:
        """Load workflows from the data directory, excluding checklists."""
        workflows: dict[str, Workflow] = {}
        timestamps: dict[Path, float] = {}

        if not self.data_dir.exists():
            return {"workflows": workflows, "timestamps": timestamps}

        for yaml_file in self.data_dir.rglob("*.yaml"):
            # Skip checklist files
            if self._is_checklist_file(yaml_file):
                continue

            workflow, timestamp = self._load_single_workflow(yaml_file)
            if workflow:
                workflows[workflow.name] = workflow
                timestamps[yaml_file] = timestamp

        return {"workflows": workflows, "timestamps": timestamps}

    def _load_checklists_from_dir(self) -> dict[str, Any]:
        """Load checklists from the checklists directory."""
        checklists: dict[str, Any] = {}
        timestamps: dict[Path, float] = {}

        if not self.checklists_dir.exists():
            return {"checklists": checklists, "timestamps": timestamps}

        for yaml_file in self.checklists_dir.rglob("*.yaml"):
            checklist, timestamp = self._load_single_checklist(yaml_file)
            if checklist:
                checklists[checklist.name] = checklist
                timestamps[yaml_file] = timestamp

        return {"checklists": checklists, "timestamps": timestamps}

    def _is_checklist_file(self, yaml_file: Path) -> bool:
        """Check if a YAML file is in the checklists directory."""
        return self.checklists_dir.exists() and self.checklists_dir in yaml_file.parents

    def _load_single_workflow(self, yaml_file: Path) -> tuple[Workflow | None, float]:
        """Load a single workflow from YAML file with error handling."""
        try:
            workflow = self._load_workflow_from_yaml(yaml_file)
            timestamp = self._get_file_timestamp(yaml_file) if workflow else 0.0
            return workflow, timestamp
        except Exception as e:
            print(f"Warning: Failed to load workflow from {yaml_file}: {e}")
            return None, 0.0

    def _load_single_checklist(self, yaml_file: Path) -> tuple[Any | None, float]:
        """Load a single checklist from YAML file with error handling."""
        try:
            checklist = self._load_checklist_from_yaml(yaml_file)
            timestamp = self._get_file_timestamp(yaml_file) if checklist else 0.0
            return checklist, timestamp
        except Exception as e:
            print(f"Warning: Failed to load checklist from {yaml_file}: {e}")
            return None, 0.0

    def _update_caches(
        self,
        workflows: dict[str, Workflow],
        checklists: dict[str, Any],
        timestamps: dict[Path, float],
    ) -> None:
        """Update all internal caches with loaded data."""
        self._workflow_cache = workflows
        self._checklist_cache = checklists
        self._file_timestamps = timestamps
        self._loaded = True

    def _load_workflow_from_yaml(self, yaml_file: Path) -> Workflow | None:
        """Load a single workflow from a YAML file with schema validation."""
        with open(yaml_file, encoding="utf-8") as f:
            data = yaml.safe_load(f)

        if not data:
            return None

        # Validate the workflow data against schema
        if self.enable_validation:
            try:
                validate_workflow_data(data)
            except WorkflowValidationError as e:
                print(f"Warning: Schema validation failed for {yaml_file}:")
                print(f"  {e}")
                return None

        # Convert YAML data to Workflow instance
        # Support both 'steps' (preferred format) and 'commands' (legacy format)
        # 'steps' reflects that these are guidance suggestions,
        # not just executable commands
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

    def _load_checklist_from_yaml(self, yaml_file: Path) -> Checklist | None:
        """Load a single checklist from a YAML file with schema validation."""
        with open(yaml_file, encoding="utf-8") as f:
            data = yaml.safe_load(f)

        if not data:
            return None

        # Note: Using workflow validation for now since checklist schema is similar
        # Could create separate validation if needed
        if self.enable_validation:
            try:
                # For checklists, validate the basic structure
                # (name, description, triggers)
                # Items are similar to steps, so workflow validation works
                checklist_data = data.copy()
                # Map 'items' to 'steps' for validation
                if "items" in checklist_data:
                    checklist_data["steps"] = checklist_data["items"]
                validate_workflow_data(checklist_data)
            except WorkflowValidationError as e:
                print(f"Warning: Schema validation failed for {yaml_file}:")
                print(f"  {e}")
                return None

        # Convert YAML data to Checklist instance
        items = data.get("items", [])

        return Checklist(
            name=data["name"],
            description=data["description"],
            triggers=data.get("triggers", []),
            items=items,
            dependencies=data.get("dependencies"),
            project_types=data.get("project_types"),
            conditions=data.get("conditions"),
        )

    def get_workflow(self, name: str) -> Workflow | None:
        """Get a specific workflow by name with automatic discovery."""
        workflows = self.load_workflows()
        return workflows.get(name)

    def load_workflow(self, name: str) -> Workflow | None:
        """Load a specific workflow by name (alias for get_workflow)."""
        return self.get_workflow(name)

    def reload(self) -> dict[str, Workflow]:
        """Force cache clear and reload all workflows."""
        self._workflow_cache.clear()
        self._checklist_cache.clear()
        self._file_timestamps.clear()
        self._loaded = False
        return self.load_workflows(force_reload=True)

    def get_all_workflows(self) -> dict[str, Workflow]:
        """Get all available workflows with automatic discovery."""
        return self.load_workflows()

    def load_checklists(self, force_reload: bool = False) -> dict[str, Checklist]:
        """Load all checklists from YAML files with dynamic discovery.

        Args:
            force_reload: Force reload even if cache appears valid
        """
        if not force_reload and self._is_cache_valid():
            return self._checklist_cache

        # Load workflows first to ensure cache is populated
        self.load_workflows(force_reload)
        return self._checklist_cache

    def get_checklist(self, name: str) -> Checklist | None:
        """Get a specific checklist by name with automatic discovery."""
        checklists = self.load_checklists()
        return checklists.get(name)

    def get_all_checklists(self) -> dict[str, Checklist]:
        """Get all available checklists with automatic discovery."""
        return self.load_checklists()

    def _on_file_change(self) -> None:
        """Internal callback for file system changes."""
        # Clear cache to force reload on next access
        self._workflow_cache.clear()
        self._checklist_cache.clear()
        self._file_timestamps.clear()
        self._loaded = False

        # Notify any registered callbacks
        for callback in self._reload_callbacks:
            try:
                callback()
            except Exception as e:
                print(f"Warning: Reload callback failed: {e}")

    def start_watching(self) -> None:
        """Start watching for file system changes for hot reloading."""
        if self._watching or not self.data_dir.exists():
            return

        if not WATCHDOG_AVAILABLE:
            print("Warning: watchdog not available, hot reloading disabled")
            return

        try:
            self._observer = Observer()  # type: ignore
            event_handler = WorkflowFileHandler(self._on_file_change)
            self._observer.schedule(event_handler, str(self.data_dir), recursive=True)  # type: ignore
            self._observer.start()  # type: ignore
            self._watching = True
        except Exception as e:
            print(f"Warning: Could not start file watching: {e}")

    def stop_watching(self) -> None:
        """Stop watching for file system changes."""
        if self._observer and self._watching:
            self._observer.stop()
            self._observer.join()
            self._observer = None
            self._watching = False

    def add_reload_callback(self, callback: Callable[[], None]) -> None:
        """Add a callback function to be called when workflows are reloaded."""
        self._reload_callbacks.append(callback)

    def remove_reload_callback(self, callback: Callable[[], None]) -> None:
        """Remove a previously added reload callback."""
        if callback in self._reload_callbacks:
            self._reload_callbacks.remove(callback)

    def is_watching(self) -> bool:
        """Check if file watching is currently active."""
        return self._watching


# Global loader instance
_loader = WorkflowLoader(enable_validation=True)


def get_workflows() -> dict[str, Workflow]:
    """Get all available workflows with automatic discovery."""
    return _loader.load_workflows()


def get_workflow(name: str) -> Workflow | None:
    """Get a specific workflow by name with automatic discovery."""
    return _loader.get_workflow(name)


def reload_workflows() -> dict[str, Workflow]:
    """Force reload all workflows from disk."""
    return _loader.reload()


def start_hot_reloading() -> None:
    """Enable hot reloading of workflow files."""
    _loader.start_watching()


def stop_hot_reloading() -> None:
    """Disable hot reloading of workflow files."""
    _loader.stop_watching()


def add_reload_callback(callback: Callable[[], None]) -> None:
    """Add a callback to be called when workflows are hot-reloaded."""
    _loader.add_reload_callback(callback)


def is_hot_reloading() -> bool:
    """Check if hot reloading is currently enabled."""
    return _loader.is_watching()


def set_validation_enabled(enabled: bool) -> None:
    """Enable or disable schema validation for workflows."""
    _loader.enable_validation = enabled


def is_validation_enabled() -> bool:
    """Check if schema validation is currently enabled."""
    return _loader.enable_validation


def get_checklists() -> dict[str, Checklist]:
    """Get all available checklists with automatic discovery."""
    return _loader.load_checklists()


def get_checklist(name: str) -> Checklist | None:
    """Get a specific checklist by name with automatic discovery."""
    return _loader.get_checklist(name)


def reload_checklists() -> dict[str, Checklist]:
    """Force reload all checklists from disk."""
    _loader.reload()
    return _loader.load_checklists()
