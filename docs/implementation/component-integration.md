# Component Integration Implementation

This document describes how Vibe's core components integrate and communicate.

## System Architecture Overview

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   CLI Handler   │ -> │  PromptAnalyzer  │ -> │ WorkflowOrches- │
│                 │    │                  │    │     trator      │
└─────────────────┘    └──────────────────┘    └─────────────────┘
         │                       │                       │
         v                       v                       v
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│ SessionManager  │    │ WorkflowRegistry │    │ SessionMonitor  │
│                 │    │                  │    │                 │
└─────────────────┘    └──────────────────┘    └─────────────────┘
```

## Component Initialization

### Bootstrap Sequence

1. **Configuration Loading**

```python
# Load project configuration
config = VibeConfig.load(config_path)

# Detect project type if not specified
if not config.project_type:
    detector = ProjectDetector(config.project_root)
    config.project_type = detector.detect_project_type()
```

2. **Component Creation**

```python
# Initialize core components with configuration
analyzer = PromptAnalyzer(config)
orchestrator = WorkflowOrchestrator(config)
session_manager = orchestrator.session_manager
monitor = SessionMonitor(orchestrator)
```

3. **Registry Loading**

```python
# Load workflow and checklist registries
workflow_registry = get_workflow_registry()
checklists = get_checklists()
```

## Data Flow Patterns

### Request Processing Flow

```
User Input -> CLI Parser -> PromptAnalyzer -> WorkflowOrchestrator -> SessionManager
     │             │             │                    │                    │
     v             v             v                    v                    v
  Command      Parsed Args   Matched Items      Execution Plan       Active Session
```

### Implementation:

```python
def process_user_request(prompt: str, config: VibeConfig) -> dict:
    """Complete request processing pipeline."""

    # 1. Analyze prompt for relevant workflows
    analyzer = PromptAnalyzer(config)
    matched_items = analyzer.analyze(prompt)

    # 2. Plan execution order and generate guidance
    orchestrator = WorkflowOrchestrator(config)
    execution_plan = orchestrator.plan_workflows(matched_items, prompt)

    # 3. Create session for step-by-step execution
    session = orchestrator.session_manager.create_session(
        prompt=prompt,
        workflows=execution_plan["workflows"],
        checklists=execution_plan["checklists"]
    )

    # 4. Return session ID and guidance
    return {
        "session_id": session.session_id,
        "guidance": execution_plan["guidance"],
        "next_step": session.current_step_text
    }
```

## Inter-Component Communication

### Configuration Sharing

All components receive the same `VibeConfig` instance:

```python
class ComponentBase:
    """Base class for Vibe components."""

    def __init__(self, config: VibeConfig):
        self.config = config
        self.project_type = config.project_type
        self.project_root = config.project_root
```

### Registry Access

Components access shared registries through singleton patterns:

```python
# Workflow registry (singleton with caching)
workflow_registry = get_workflow_registry()
workflow = workflow_registry.get_workflow("debug_workflow")

# Checklist registry (lazy-loaded)
checklists = get_checklists()
checklist = checklists.get("feature_completion")
```

### Session State Sharing

Session state is managed centrally but accessed by multiple components:

```python
class WorkflowOrchestrator:
    def __init__(self, config: VibeConfig):
        self.session_manager = SessionManager()

class SessionMonitor:
    def __init__(self, orchestrator: WorkflowOrchestrator):
        self.session_manager = orchestrator.session_manager  # Shared reference
```

## Error Propagation

### Graceful Degradation Pattern

Components implement graceful degradation when dependencies fail:

```python
def get_workflows_with_fallback(config: VibeConfig) -> list[Workflow]:
    """Get workflows with fallback to built-in definitions."""
    try:
        # Try YAML-based workflows first
        return yaml_loader.load_workflows()
    except Exception as e:
        logger.warning(f"YAML loading failed: {e}")
        # Fallback to Python-defined workflows
        return get_builtin_workflows()
```

### Error Context Preservation

Errors maintain context about the operation and affected components:

```python
class VibeError(Exception):
    """Base exception with component context."""

    def __init__(self, message: str, component: str, context: dict = None):
        self.component = component
        self.context = context or {}
        super().__init__(f"[{component}] {message}")
```

## Lifecycle Management

### Component Lifecycle

1. **Initialization** - Components created with shared configuration
2. **Registration** - Components register with central registries
3. **Execution** - Components collaborate on request processing
4. **Cleanup** - Components handle resource cleanup

### Session Lifecycle

```python
def session_lifecycle_example():
    """Example of complete session lifecycle."""

    # 1. Create session
    session = SessionManager().create_session(
        prompt="fix authentication bug",
        workflows=["debug_workflow", "test_workflow"]
    )

    # 2. Execute steps
    while not session.is_complete:
        current_step = session.current_step_text
        # AI agent executes step
        session.advance()

    # 3. Monitor and alert
    monitor.check_session_health(session)

    # 4. Cleanup
    SessionManager().cleanup_completed_session(session.session_id)
```

## Dependency Injection

### Configuration Injection

```python
class ServiceContainer:
    """Simple dependency injection for Vibe components."""

    def __init__(self, config: VibeConfig):
        self.config = config
        self._instances = {}

    def get_analyzer(self) -> PromptAnalyzer:
        if 'analyzer' not in self._instances:
            self._instances['analyzer'] = PromptAnalyzer(self.config)
        return self._instances['analyzer']

    def get_orchestrator(self) -> WorkflowOrchestrator:
        if 'orchestrator' not in self._instances:
            self._instances['orchestrator'] = WorkflowOrchestrator(self.config)
        return self._instances['orchestrator']
```

### Usage in CLI

```python
def main_cli_handler(args):
    """Main CLI entry point with dependency injection."""

    config = VibeConfig.load()
    container = ServiceContainer(config)

    if args.command == "run":
        analyzer = container.get_analyzer()
        orchestrator = container.get_orchestrator()
        # Process request...
```

## Performance Optimization

### Lazy Loading

Components use lazy loading for expensive operations:

```python
class PromptAnalyzer:
    def __init__(self, config: VibeConfig):
        self.config = config
        self._workflow_registry = None  # Lazy-loaded
        self._checklists = None         # Lazy-loaded

    @property
    def workflow_registry(self):
        if self._workflow_registry is None:
            self._workflow_registry = get_workflow_registry()
        return self._workflow_registry
```

### Caching Strategy

```python
class WorkflowRegistry:
    def __init__(self):
        self._cache = {}
        self._cache_timestamps = {}

    def get_workflow(self, name: str) -> Workflow:
        if self._is_cache_valid(name):
            return self._cache[name]

        workflow = self._load_workflow(name)
        self._cache[name] = workflow
        self._cache_timestamps[name] = datetime.now()
        return workflow
```

This integration pattern ensures loose coupling between components while maintaining efficient communication and shared state management.
