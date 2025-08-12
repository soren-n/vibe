# Workflow Registry API Reference

The workflow registry system loads, caches, and manages YAML-based workflow definitions with hot reloading support.

## Core Classes

### WorkflowLoader

Primary class for loading workflows and checklists from YAML files with dynamic discovery and hot reloading.

```python
class WorkflowLoader:
    """Loads workflows and checklists from YAML files with dynamic discovery."""

    def __init__(self, *, enable_validation: bool = True):
        """Initialize workflow loader with validation control."""
```

**Constructor Parameters:**

- `enable_validation: bool` - Enable YAML validation (default: True)

**Properties:**

- `data_dir: Path` - Base data directory (`vibe/data`)
- `workflows_dir: Path` - Workflows directory (`data/workflows`)
- `checklists_dir: Path` - Checklists directory (`data/checklists`)
- `_workflow_cache: dict[str, Workflow]` - In-memory workflow cache
- `_checklist_cache: dict[str, Checklist]` - In-memory checklist cache
- `_file_timestamps: dict[Path, float]` - File modification timestamps
- `_loaded: bool` - Cache loading state
- `_observer: Observer | None` - File system watcher (if watchdog available)
- `_watching: bool` - Hot reloading state
- `_reload_callbacks: list[Callable[[], None]]` - Reload event callbacks

**Methods:**

#### load_workflows()

Loads all workflows from YAML files with caching and validation.

**Returns:**

- `dict[str, Workflow]` - Dictionary mapping workflow names to Workflow objects

**Algorithm:**

1. Check cache validity using file timestamps
2. If cache invalid, scan workflows directory recursively
3. Load and validate each YAML file
4. Create Workflow objects from validated data
5. Update cache and timestamps
6. Return workflow dictionary

**Implementation:**

```python
def load_workflows(self) -> dict[str, Workflow]:
    if self._is_cache_valid():
        return self._workflow_cache.copy()

    self._workflow_cache.clear()

    if not self.workflows_dir.exists():
        return {}

    for yaml_file in self.workflows_dir.rglob("*.yaml"):
        try:
            workflows = self._load_workflow_file(yaml_file)
            self._workflow_cache.update(workflows)
            self._file_timestamps[yaml_file] = self._get_file_timestamp(yaml_file)
        except Exception as e:
            print(f"Error loading {yaml_file}: {e}")

    self._loaded = True
    return self._workflow_cache.copy()
```

#### load_checklists()

Loads all checklists from YAML files with caching and validation.

**Returns:**

- `dict[str, Checklist]` - Dictionary mapping checklist names to Checklist objects

**Algorithm:**

1. Check cache validity using file timestamps
2. If cache invalid, scan checklists directory recursively
3. Load and validate each YAML file
4. Create Checklist objects from validated data
5. Update cache and timestamps
6. Return checklist dictionary

#### get_workflow(name)

Retrieves a specific workflow by name.

**Parameters:**

- `name: str` - Workflow name to retrieve

**Returns:**

- `Workflow | None` - Workflow object or None if not found

#### get_checklist(name)

Retrieves a specific checklist by name.

**Parameters:**

- `name: str` - Checklist name to retrieve

**Returns:**

- `Checklist | None` - Checklist object or None if not found

#### start_watching()

Starts file system watching for hot reloading (requires watchdog).

**Implementation:**

```python
def start_watching(self) -> None:
    if not WATCHDOG_AVAILABLE or self._watching:
        return

    self._observer = Observer()
    handler = WorkflowFileHandler(self._on_file_change)

    if self.workflows_dir.exists():
        self._observer.schedule(handler, str(self.workflows_dir), recursive=True)
    if self.checklists_dir.exists():
        self._observer.schedule(handler, str(self.checklists_dir), recursive=True)

    self._observer.start()
    self._watching = True
```

#### stop_watching()

Stops file system watching and cleanup.

**Implementation:**

```python
def stop_watching(self) -> None:
    if self._observer and self._watching:
        self._observer.stop()
        self._observer.join()
        self._observer = None
        self._watching = False
```

#### add_reload_callback(callback)

Adds callback function for reload events.

**Parameters:**

- `callback: Callable[[], None]` - Function to call on reload

#### \_load_workflow_file(yaml_file)

Loads workflows from a single YAML file.

**Parameters:**

- `yaml_file: Path` - Path to YAML file

**Returns:**

- `dict[str, Workflow]` - Workflows loaded from file

**Algorithm:**

1. Read YAML file with safe_load
2. Validate structure (requires "workflows" key)
3. Validate each workflow if validation enabled
4. Create Workflow objects from data
5. Return workflow dictionary

**File Format:**

```yaml
workflows:
  workflow_name:
    description: 'Workflow description'
    triggers:
      - 'trigger pattern 1'
      - 'trigger pattern 2'
    steps:
      - 'Step 1 description'
      - 'Step 2 description'
    project_types:
      - 'python'
      - 'javascript'
    dependencies:
      - 'git'
      - 'python'
```

#### \_load_checklist_file(yaml_file)

Loads checklists from a single YAML file.

**Parameters:**

- `yaml_file: Path` - Path to YAML file

**Returns:**

- `dict[str, Checklist]` - Checklists loaded from file

**File Format:**

```yaml
checklists:
  checklist_name:
    description: 'Checklist description'
    triggers:
      - 'validation pattern 1'
      - 'quality check pattern'
    items:
      - 'Check item 1'
      - 'Verify item 2'
    project_types:
      - 'python'
```

#### \_is_cache_valid()

Checks if cache is still valid by comparing file timestamps.

**Returns:**

- `bool` - True if cache is valid, False if reload needed

**Algorithm:**

1. Return False if never loaded
2. Scan current YAML files in directories
3. Compare with cached file timestamps
4. Return False if any file changed, added, or removed
5. Return True if all files unchanged

#### \_get_file_timestamp(file_path)

Gets modification timestamp for a file.

**Parameters:**

- `file_path: Path` - File to check

**Returns:**

- `float` - Modification timestamp or 0.0 if error

#### \_on_file_change()

Internal callback for file system events.

**Implementation:**

```python
def _on_file_change(self) -> None:
    """Handle file system change events."""
    # Invalidate cache
    self._loaded = False
    self._workflow_cache.clear()
    self._checklist_cache.clear()
    self._file_timestamps.clear()

    # Notify callbacks
    for callback in self._reload_callbacks:
        try:
            callback()
        except Exception as e:
            print(f"Error in reload callback: {e}")
```

### WorkflowFileHandler

File system event handler for hot reloading (when watchdog available).

```python
class WorkflowFileHandler(FileSystemEventHandler):
    """Handles file system events for workflow YAML files."""

    def __init__(self, callback: Callable[[], None]):
        """Initialize with reload callback."""
```

**Event Methods:**

- `on_modified(event)` - Handles file modification events
- `on_created(event)` - Handles file creation events
- `on_deleted(event)` - Handles file deletion events

**Implementation:**

```python
def on_modified(self, event: Any) -> None:
    if event.is_directory:
        return
    if str(event.src_path).endswith(".yaml"):
        self.callback()
```

## Registry Functions

### get_workflow_registry()

Returns global workflow registry instance.

**Returns:**

- `dict[str, Workflow]` - All available workflows

**Implementation:**

```python
_workflow_loader = WorkflowLoader()

def get_workflow_registry() -> dict[str, Workflow]:
    """Get workflow registry with all loaded workflows."""
    return _workflow_loader.load_workflows()
```

### get_checklists()

Returns global checklist registry.

**Returns:**

- `dict[str, Checklist]` - All available checklists

### get_checklist(name)

Retrieves specific checklist by name.

**Parameters:**

- `name: str` - Checklist name

**Returns:**

- `Checklist | None` - Checklist or None if not found

### reload_workflows()

Forces reload of all workflows from disk.

**Returns:**

- `dict[str, Workflow]` - Reloaded workflows

## Directory Structure

The workflow loader expects this directory structure:

```
vibe/data/
├── workflows/
│   ├── core/
│   │   ├── development.yaml
│   │   ├── testing.yaml
│   │   └── documentation.yaml
│   ├── python/
│   │   ├── setup.yaml
│   │   └── packaging.yaml
│   └── frontend/
│       └── react.yaml
└── checklists/
    ├── core/
    │   └── quality.yaml
    ├── python/
    │   └── code_standards.yaml
    └── testing/
        └── coverage.yaml
```

## YAML File Format

### Workflow Files

```yaml
workflows:
  setup_python_project:
    description: 'Set up a new Python project with best practices'
    triggers:
      - 'set up.*python.*project'
      - 'create.*python.*environment'
      - 'initialize.*python'
    steps:
      - 'Create project directory structure'
      - 'Set up virtual environment with `python -m venv venv`'
      - 'Activate virtual environment'
      - 'Create requirements.txt with initial dependencies'
      - 'Initialize git repository'
      - 'Create .gitignore for Python projects'
      - 'Set up basic package structure'
    project_types:
      - 'python'
    dependencies:
      - 'python'
      - 'git'

  code_review:
    description: 'Perform comprehensive code review'
    triggers:
      - 'review.*code'
      - 'check.*code.*quality'
    steps:
      - 'Review code style and formatting'
      - 'Check for security vulnerabilities'
      - 'Verify test coverage'
      - 'Review documentation completeness'
    project_types: [] # Applies to all project types
    dependencies: []
```

### Checklist Files

```yaml
checklists:
  python_quality:
    description: 'Python code quality checklist'
    triggers:
      - 'quality.*check'
      - 'validate.*python'
    items:
      - 'All functions have type hints'
      - 'Code follows PEP 8 style guidelines'
      - 'All public functions have docstrings'
      - 'No unused imports or variables'
      - 'Test coverage is above 80%'
      - 'No security vulnerabilities detected'
    project_types:
      - 'python'
    dependencies:
      - 'pylint'
      - 'mypy'
      - 'pytest'
```

## Error Handling

### WorkflowValidationError

Raised when YAML workflow validation fails.

```python
class WorkflowValidationError(Exception):
    """Raised when workflow validation fails."""
    pass
```

**Common Validation Errors:**

- Missing required fields (name, triggers, steps/items)
- Invalid field types (e.g., steps not a list)
- Empty trigger lists
- Invalid project type specifications

### Graceful Degradation

The loader handles errors gracefully:

1. **Missing watchdog**: Falls back to manual reloading
2. **Invalid YAML files**: Skips problematic files, continues loading others
3. **Validation errors**: Reports errors but continues processing
4. **File system errors**: Handles permissions and I/O errors silently

## Performance Considerations

### Caching Strategy

- **In-memory caching**: Workflows cached after first load
- **Timestamp checking**: Only reload when files change
- **Lazy loading**: Load on first access, not initialization
- **Incremental updates**: Hot reloading only affects changed files

### Optimization Features

- **Recursive discovery**: Automatically finds YAML files in subdirectories
- **Batch loading**: Processes all files in single scan
- **Memory efficiency**: Clears old cache before loading new data
- **Fast validation**: Optional validation can be disabled for performance

## Usage Examples

### Basic Usage

```python
# Initialize loader
loader = WorkflowLoader()

# Load all workflows
workflows = loader.load_workflows()

# Get specific workflow
setup_workflow = loader.get_workflow("setup_python_project")

# Load checklists
checklists = loader.load_checklists()
```

### Hot Reloading

```python
# Start watching for file changes
loader.start_watching()

# Add reload callback
def on_reload():
    print("Workflows reloaded!")

loader.add_reload_callback(on_reload)

# Files will automatically reload when changed
# Stop watching when done
loader.stop_watching()
```

### Global Registry

```python
from vibe.guidance import get_workflow_registry, get_checklists

# Get all workflows
workflows = get_workflow_registry()

# Get all checklists
checklists = get_checklists()

# Force reload
from vibe.guidance.core import reload_workflows
updated_workflows = reload_workflows()
```
