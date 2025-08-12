# PromptAnalyzer API Reference

The `PromptAnalyzer` analyzes natural language prompts to determine appropriate workflows and checklists for execution.

## Interface Definition

```
Interface PromptAnalyzer:
  config: VibeConfig                    # Project configuration
  console: Console                      # Output formatting interface
  workflow_registry: WorkflowRegistry   # Built-in workflow registry
  checklists: map<string, Checklist>   # Available checklists from YAML files

  Method initialize(config: VibeConfig)
  Method analyze(prompt: string, show_analysis: boolean) -> list<string>
  Method match_built_in_workflows(prompt: string) -> list<string>
  Method match_config_workflows(prompt: string) -> list<string>
  Method match_checklists(prompt: string) -> list<string>
```

## Constructor

### initialize(config)

Initializes the prompt analyzer with configuration.

**Parameters:**

- `config: VibeConfig` - Project configuration containing workflows, project type, and settings

## Properties

- `config: VibeConfig` - Project configuration object
- `console: Console` - Output formatting interface for displaying results
- `workflow_registry: WorkflowRegistry` - Built-in workflow registry
- `checklists: map<string, Checklist>` - Available checklists from YAML files

## Methods

### analyze(prompt, show_analysis)

Analyzes a prompt and returns matching workflows and checklists.

**Parameters:**

- `prompt: string` - Natural language prompt to analyze
- `show_analysis: boolean` - Whether to display analysis results (default: true)

**Returns:**

- `list<string>` - List of matching workflow and checklist names

**Algorithm:**

1. Match against built-in workflows using trigger patterns
2. Match against config-defined workflows
3. Match against available checklists
4. Combine and deduplicate results
5. Optionally display analysis breakdown

### match_built_in_workflows(prompt)

Matches prompt against built-in workflow triggers.

**Parameters:**

- `prompt: string` - Prompt text to analyze

**Returns:**

- `list<string>` - List of matching built-in workflow names

**Implementation:**

- Iterates through workflow registry
- Uses regex pattern matching on triggers
- Filters by project type compatibility
- Returns matches in priority order

### match_config_workflows(prompt)

Matches prompt against user-defined workflows in configuration.

**Parameters:**

- `prompt: string` - Prompt text to analyze

**Returns:**

- `list<string>` - List of matching config workflow names

**Implementation:**

- Checks config.workflows dictionary
- Matches against configured trigger patterns
- Validates workflow structure and dependencies

### match_checklists(prompt)

Matches prompt against available checklists.

**Parameters:**

- `prompt: str` - Prompt text to analyze

**Returns:**

- `list[str]` - List of matching checklist names (prefixed with "checklist:")

**Implementation:**

- Scans checklist registry for trigger matches
- Filters by project type when specified
- Prefixes results with "checklist:" identifier

### \_display_analysis(prompt, all_items, built_in, config, checklists)

Displays detailed analysis results using Rich formatting.

**Parameters:**

- `prompt: str` - Original prompt
- `all_items: list[str]` - All matched items
- `built_in: list[str]` - Built-in workflow matches
- `config: list[str]` - Config workflow matches
- `checklists: list[str]` - Checklist matches

**Output Format:**

- Rich panel with analysis breakdown
- Separate sections for workflows vs checklists
- Color-coded item types (🔄 workflows, ✅ checklists)

## Pattern Matching Algorithm

The analyzer uses fuzzy pattern matching:

1. **Keyword Extraction** - Extract key terms from prompt
2. **Trigger Matching** - Compare against workflow/checklist triggers
3. **Relevance Scoring** - Score matches by relevance
4. **Project Filtering** - Filter by project type compatibility
5. **Priority Ranking** - Return matches in priority order

## Integration Points

- **Configuration**: Loads workflows from `config.workflows`
- **Workflow Registry**: Accesses built-in workflows via `get_workflow_registry()`
- **Checklist System**: Loads checklists via `get_checklists()`
- **Project Detection**: Uses `config.project_type` for filtering

## Error Handling

- **Missing Config**: Falls back to built-in workflows only
- **Invalid Workflows**: Skips malformed workflow definitions
- **Pattern Errors**: Logs regex errors and continues
- **Registry Failures**: Degrades gracefully to available components

## Usage Example

```python
from vibe.config import VibeConfig
from vibe.analyzer import PromptAnalyzer

config = VibeConfig.load()
analyzer = PromptAnalyzer(config)

# Analyze a development prompt
matches = analyzer.analyze("fix bug in authentication")
# Returns: ['debug_workflow', 'checklist:bug_fix_validation']

# Analyze without display
matches = analyzer.analyze("update dependencies", show_analysis=False)
# Returns: ['dependency_update']
```
