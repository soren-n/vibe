# Project Detection API Reference

The project detection system automatically identifies project types, frameworks, and technology stacks based on file presence, dependencies, and project structure.

## Core Classes

### ProjectDetector

Primary class for project type detection with comprehensive framework support.

```python
class ProjectDetector:
    """Project type detection based on files, dependencies, and structure."""

    def __init__(self, project_path: str = "."):
        """Initialize the project detector with a given path."""
```

**Constructor Parameters:**

- `project_path: str` - Path to project directory (default: current directory)

**Properties:**

- `project_path: Path` - Path object for the project directory

**Methods:**

#### detect_project_type()

Detects the primary project type using priority-based selection.

**Returns:**

- `str` - Primary project type identifier

**Priority Order:**

1. **Specific Frameworks**: vue, react, next, nuxt, svelte, angular
2. **Backend Frameworks**: django, fastapi, flask, rails
3. **Languages**: typescript, javascript, python, rust, go
4. **General Types**: web, node
5. **Fallback**: generic

**Algorithm:**

1. Get all detected project types
2. Apply priority ordering (specific → general)
3. Return first match in priority order
4. Return "generic" if no matches

**Implementation:**

```python
def detect_project_type(self) -> str:
    detections = self.detect_all_project_types()

    priority_order = [
        "vue", "react", "next", "nuxt", "svelte", "angular",
        "django", "fastapi", "flask", "rails",
        "typescript", "javascript", "python", "rust", "go",
        "web", "node", "generic"
    ]

    for project_type in priority_order:
        if project_type in detections:
            return project_type

    return "generic"
```

#### detect_all_project_types()

Detects all applicable project types and frameworks.

**Returns:**

- `list[str]` - List of all detected project types (deduplicated)

**Algorithm:**

1. Detect frontend frameworks and their tech stacks
2. Detect Python frameworks and language
3. Detect other programming languages
4. Detect general project characteristics
5. Deduplicate while preserving order

**Implementation:**

```python
def detect_all_project_types(self) -> list[str]:
    types = []

    types.extend(self._detect_frontend_frameworks())
    types.extend(self._detect_python_stack())
    types.extend(self._detect_other_languages())
    types.extend(self._detect_general_types())

    # Remove duplicates while preserving order
    return list(dict.fromkeys(types))
```

## Detection Methods

### Frontend Framework Detection

#### \_detect_frontend_frameworks()

Detects frontend frameworks and their complete tech stacks.

**Returns:**

- `list[str]` - Frontend frameworks and associated technologies

**Detected Combinations:**

- **Vue**: `["vue", "javascript", "web", "node"]`
- **React**: `["react", "javascript", "web", "node"]`
- **Next.js**: `["next", "react", "javascript", "web", "node"]`
- **Nuxt**: `["nuxt", "vue", "javascript", "web", "node"]`
- **Svelte**: `["svelte", "javascript", "web", "node"]`
- **Angular**: `["angular", "typescript", "web", "node"]`
- **TypeScript**: `["typescript", "javascript", "node"]`
- **JavaScript**: `["javascript", "node"]`

#### \_is_vue_project()

Detects Vue.js projects.

**Returns:**

- `bool` - True if Vue project detected

**Detection Criteria:**

- `package.json` contains `vue` dependency
- OR `vue.config.js` exists
- OR `src/main.js` contains Vue imports
- OR `.vue` files exist in `src/`

**Implementation:**

```python
def _is_vue_project(self) -> bool:
    # Check package.json for Vue dependency
    if self._check_package_json_dependency("vue"):
        return True

    # Check for Vue config files
    vue_files = ["vue.config.js", "vite.config.js"]
    if any((self.project_path / f).exists() for f in vue_files):
        return True

    # Check for Vue files
    if list(self.project_path.rglob("*.vue")):
        return True

    # Check main.js for Vue imports
    main_js = self.project_path / "src" / "main.js"
    if main_js.exists():
        try:
            content = main_js.read_text()
            return "vue" in content.lower()
        except (OSError, UnicodeDecodeError):
            pass

    return False
```

#### \_is_react_project()

Detects React projects.

**Detection Criteria:**

- `package.json` contains `react` dependency
- OR JSX files exist (`.jsx`, `.tsx`)
- OR React imports in JavaScript files

#### \_is_next_project()

Detects Next.js projects.

**Detection Criteria:**

- `package.json` contains `next` dependency
- OR `next.config.js` exists
- OR `pages/` directory exists

#### \_is_typescript_project()

Detects TypeScript projects.

**Detection Criteria:**

- `tsconfig.json` exists
- OR TypeScript files exist (`.ts`, `.tsx`)
- OR `package.json` contains TypeScript dependencies

### Python Framework Detection

#### \_detect_python_stack()

Detects Python and its frameworks.

**Returns:**

- `list[str]` - Python frameworks and language

**Detected Frameworks:**

- **Django**: `["django", "python"]`
- **FastAPI**: `["fastapi", "python"]`
- **Flask**: `["flask", "python"]`
- **Python**: `["python"]`

#### \_is_python_project()

Detects Python projects.

**Detection Criteria:**

- `pyproject.toml` exists
- OR `requirements.txt` exists
- OR `setup.py` exists
- OR `Pipfile` exists
- OR `.py` files exist

#### \_is_django_project()

Detects Django projects.

**Detection Criteria:**

- Python project AND:
  - `manage.py` exists
  - OR `django` in requirements/dependencies
  - OR `settings.py` exists

#### \_is_fastapi_project()

Detects FastAPI projects.

**Detection Criteria:**

- Python project AND:
  - `fastapi` in dependencies
  - OR FastAPI imports in Python files

### Other Language Detection

#### \_detect_other_languages()

Detects other programming languages.

**Returns:**

- `list[str]` - Detected programming languages

**Supported Languages:**

- **Rust**: `Cargo.toml` exists
- **Go**: `go.mod` exists OR `.go` files exist
- **Ruby**: `Gemfile` exists OR `.rb` files exist
- **Java**: `.java` files exist OR `pom.xml` exists

### General Type Detection

#### \_detect_general_types()

Detects general project characteristics.

**Returns:**

- `list[str]` - General project types

**Detected Types:**

- **web**: HTML/CSS files exist
- **node**: `package.json` exists
- **git**: `.git` directory exists

## Utility Methods

### \_check_package_json_dependency(dependency)

Checks if package.json contains a specific dependency.

**Parameters:**

- `dependency: str` - Dependency name to check

**Returns:**

- `bool` - True if dependency found in any section

**Searched Sections:**

- `dependencies`
- `devDependencies`
- `peerDependencies`
- `optionalDependencies`

**Implementation:**

```python
def _check_package_json_dependency(self, dependency: str) -> bool:
    package_json = self.project_path / "package.json"
    if not package_json.exists():
        return False

    try:
        with open(package_json) as f:
            data = json.load(f)

        sections = ["dependencies", "devDependencies",
                   "peerDependencies", "optionalDependencies"]

        for section in sections:
            if dependency in data.get(section, {}):
                return True
    except (json.JSONDecodeError, OSError):
        pass

    return False
```

### \_check_python_dependency(dependency)

Checks if Python project contains a specific dependency.

**Parameters:**

- `dependency: str` - Python package name to check

**Returns:**

- `bool` - True if dependency found

**Checked Files:**

- `requirements.txt` (and variants)
- `pyproject.toml` dependencies
- `setup.py` install_requires
- `Pipfile` packages

**Implementation:**

```python
def _check_python_dependency(self, dependency: str) -> bool:
    # Check requirements files
    req_files = [
        "requirements.txt", "requirements-dev.txt",
        "requirements/base.txt", "requirements/production.txt"
    ]

    for req_file in req_files:
        req_path = self.project_path / req_file
        if req_path.exists():
            try:
                content = req_path.read_text()
                if dependency in content:
                    return True
            except (OSError, UnicodeDecodeError):
                pass

    # Check pyproject.toml
    pyproject = self.project_path / "pyproject.toml"
    if pyproject.exists():
        try:
            import tomllib
            with open(pyproject, "rb") as f:
                data = tomllib.load(f)

            # Check various dependency sections
            deps = data.get("project", {}).get("dependencies", [])
            if any(dependency in dep for dep in deps):
                return True

        except (ImportError, OSError, tomllib.TOMLDecodeError):
            pass

    return False
```

### \_has_file_with_content(pattern, content_pattern)

Checks if files matching pattern contain specific content.

**Parameters:**

- `pattern: str` - File glob pattern (e.g., "\*.py")
- `content_pattern: str` - Content to search for

**Returns:**

- `bool` - True if any matching file contains the content

## Framework-Specific Detection Logic

### Vue.js Detection

**Files Checked:**

- `package.json` → vue dependency
- `vue.config.js` → Vue CLI config
- `vite.config.js` → Vite + Vue config
- `src/main.js` → Vue imports/createApp
- `*.vue` → Single File Components

### React Detection

**Files Checked:**

- `package.json` → react dependency
- `*.jsx`, `*.tsx` → JSX files
- JavaScript files → React imports

### Next.js Detection

**Files Checked:**

- `package.json` → next dependency
- `next.config.js` → Next.js config
- `pages/` → Next.js routing convention
- `app/` → App Router (Next.js 13+)

### Django Detection

**Files Checked:**

- `manage.py` → Django management script
- `settings.py` → Django settings
- Dependencies → django package
- `apps/` → Django apps structure

### FastAPI Detection

**Files Checked:**

- Dependencies → fastapi package
- Python files → FastAPI imports
- `main.py` → Common FastAPI entry point

## Usage Examples

### Basic Detection

```python
# Initialize detector
detector = ProjectDetector("/path/to/project")

# Get primary project type
primary_type = detector.detect_project_type()
print(f"Primary type: {primary_type}")

# Get all detected types
all_types = detector.detect_all_project_types()
print(f"All types: {all_types}")
```

### Extended Usage

```python
# Detect specific frameworks
detector = ProjectDetector()

if detector._is_vue_project():
    print("Vue.js project detected")

if detector._is_python_project():
    print("Python project detected")

    if detector._is_django_project():
        print("Django framework detected")

# Check dependencies
has_react = detector._check_package_json_dependency("react")
has_django = detector._check_python_dependency("django")
```

### Integration with Configuration

```python
from vibe.config import VibeConfig
from vibe.project_types import ProjectDetector

# Auto-detect project type
detector = ProjectDetector()
detected_type = detector.detect_project_type()

# Load config with detected type
config = VibeConfig.load_from_file()
if config.project_type == "auto":
    config.project_type = detected_type
```

## Detection Results

### Common Detection Patterns

| Project Type       | Files/Dependencies                                               | Result                                                 |
| ------------------ | ---------------------------------------------------------------- | ------------------------------------------------------ |
| Vue 3 + Vite       | `package.json` with vue, `vite.config.js`                        | `["vue", "javascript", "web", "node"]`                 |
| React + TypeScript | `package.json` with react, `.tsx` files                          | `["react", "typescript", "javascript", "web", "node"]` |
| Next.js            | `package.json` with next, `pages/` dir                           | `["next", "react", "javascript", "web", "node"]`       |
| Django + REST      | `manage.py`, `requirements.txt` with django, djangorestframework | `["django", "python"]`                                 |
| FastAPI            | `pyproject.toml` with fastapi                                    | `["fastapi", "python"]`                                |
| Python CLI         | `pyproject.toml`, `src/*.py`                                     | `["python"]`                                           |
| Rust               | `Cargo.toml`                                                     | `["rust"]`                                             |

### Priority Resolution

When multiple types are detected, the system uses priority ordering:

1. **Framework-specific** (vue, react, django) takes precedence over language (javascript, python)
2. **Meta-frameworks** (next, nuxt) take precedence over base frameworks (react, vue)
3. **Typed languages** (typescript) take precedence over untyped (javascript)
4. **Specific tools** take precedence over general categories (web, node)

## Error Handling

The detector handles errors gracefully:

- **File not found**: Returns False/empty results
- **JSON parse errors**: Silently continues with other detection methods
- **Permission errors**: Skips inaccessible files
- **Unicode errors**: Handles binary files gracefully

All detection methods use try/catch blocks to prevent failures from stopping the entire detection process.
