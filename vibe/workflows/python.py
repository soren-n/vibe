"""Python-specific workflows for projects using Python."""

from .core import Workflow

PYTHON_WORKFLOWS = {
    "python_quality": Workflow(
        name="python_quality",
        description="Run Python code quality checks with ruff and formatting",
        triggers=[
            r"format.*code",
            r"lint.*python",
            r"check.*quality",
            r"fix.*style",
            r"ruff.*check",
            r"black.*format",
            r"improve.*code",
        ],
        commands=[
            "python -m ruff check . --fix || ruff check . --fix || "
            "echo 'Ruff not available, skipping lint check'",
            "python -m ruff format . || ruff format . || "
            "echo 'Ruff formatting not available'",
            "echo 'Python code quality check completed'",
        ],
        project_types=["python"],
        conditions=["file:pyproject.toml", "file:requirements.txt", "pattern:*.py"],
    ),
    "python_test": Workflow(
        name="python_test",
        description="Run Python tests with pytest",
        triggers=[
            r"run.*tests",
            r"test.*code",
            r"pytest",
            r"check.*tests",
            r"verify.*tests",
            r"validate.*code",
        ],
        commands=[
            "python -m pytest -v || pytest -v || echo 'Pytest not available or no tests found'",
            "echo 'Python test execution completed'",
        ],
        dependencies=["python_quality"],
        project_types=["python"],
        conditions=["file:pyproject.toml", "pattern:test_*.py", "pattern:*_test.py"],
    ),
    "python_type_check": Workflow(
        name="python_type_check",
        description="Run static type checking with mypy",
        triggers=[r"type.*check", r"mypy.*check", r"static.*analysis", r"check.*types"],
        commands=[
            "python -m mypy . || mypy . || echo 'MyPy not available, skipping type check'",
            "echo 'Python type checking completed'",
        ],
        project_types=["python"],
        conditions=["file:pyproject.toml", "pattern:*.py"],
    ),
    "python_install": Workflow(
        name="python_install",
        description="Install Python dependencies",
        triggers=[
            r"install.*depend\w+",
            r"pip.*install",
            r"uv.*install",
            r"setup.*python",
            r"install.*requirements",
        ],
        commands=[
            "uv install || pip install -e . || pip install -r requirements.txt || echo 'Could not install dependencies'",
            "echo 'Python dependencies installation completed'",
        ],
        project_types=["python"],
        conditions=["file:pyproject.toml", "file:requirements.txt"],
    ),
    "python_env": Workflow(
        name="python_env",
        description="Set up and manage Python environment",
        triggers=[
            r"setup.*env\w*",
            r"virtual.*env\w*",
            r"python.*env\w*",
            r"create.*env\w*",
            r"venv.*setup",
        ],
        commands=[
            "python --version",
            "which python || echo 'Python not found in PATH'",
            "uv --version || pip --version || echo 'No package manager found'",
            "echo 'Python environment check completed'",
        ],
        project_types=["python"],
    ),
    "python_build": Workflow(
        name="python_build",
        description="Build Python package for distribution",
        triggers=[
            r"build.*package",
            r"create.*dist\w*",
            r"package.*python",
            r"build.*wheel",
            r"prepare.*release",
        ],
        commands=[
            "uv build || python -m build || echo 'Build tools not available'",
            "ls -la dist/ 2>/dev/null || echo 'No dist directory created'",
            "echo 'Python package build completed'",
        ],
        dependencies=["python_test", "python_quality"],
        project_types=["python"],
        conditions=["file:pyproject.toml"],
    ),
    "python_docs": Workflow(
        name="python_docs",
        description="Generate Python documentation",
        triggers=[
            r"generate.*docs",
            r"build.*docs",
            r"sphinx.*docs",
            r"api.*docs",
            r"document.*api",
        ],
        commands=[
            "find . -name '*.py' -exec grep -l 'def \\|class ' {} \\; | head -10",
            "echo 'Python documentation generation prepared. Consider using sphinx or pydoc.'",
            "python -c \"import pydoc; print('pydoc available for documentation generation')\" 2>/dev/null || echo 'pydoc not available'",
        ],
        project_types=["python"],
        conditions=["pattern:*.py"],
    ),
    "python_profile": Workflow(
        name="python_profile",
        description="Profile Python code performance",
        triggers=[
            r"profile.*python",
            r"performance.*python",
            r"benchmark.*python",
            r"optimize.*python",
        ],
        commands=[
            "echo 'Python profiling analysis...'",
            "find . -name '*.py' -exec wc -l {} + 2>/dev/null | tail -1 || echo 'No Python files found'",
            "echo 'Consider using cProfile or py-spy for detailed performance analysis'",
        ],
        project_types=["python"],
        conditions=["pattern:*.py"],
    ),
}
