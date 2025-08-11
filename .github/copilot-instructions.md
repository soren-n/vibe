# Vibe Project — AI Agent Guide (Concise)

Goal: Use Vibe to develop Vibe while minimizing token usage and rate-limit hits.

## Core Loop (always)
1) Ask Vibe MCP tool "what workflow for [task]?"
2) Act on suggested guidance.
3) Validate via Vibe’s recommended checks.
4) If a pattern is reusable, capture it as a YAML workflow.

## Output Policy (token-thrifty)
- Default to concise mode: 150–250 words, ≤6 bullets, no repetition.
- Prefer links and references over quoting docs; avoid long code unless executable commands.
- Show commands only when to be run; otherwise summarize.
- Use delta updates instead of restating plans.
- Stream if available; chunk long work into short messages.

## MCP tools (minimal set)
- start_workflow, get_workflow_status, advance_workflow, back_workflow,
  restart_workflow, break_workflow, list_workflow_sessions.
Use them for step-wise execution and compact status.

## When uncertain
- Ask Vibe first. Examples: "run quality checks", "set up Python env", "create ADR", "start development session".

## Anti-patterns (avoid)
- Skipping Vibe guidance; long narrative replies; repeating unchanged sections; copying large docs; running tools without brief preamble and compact post-summary.

## Validation (fast path)
- Ask: "what quality checks should I run?" then run those commands.
- Keep outputs terse (summaries + PASS/FAIL and next step).

## Categories (where workflows live)
- core, python, frontend, documentation, development, session, automation, testing, media.

## Minimal examples
- Discovery: uv run vibe guide "help me test my Python code"
- Validation: uv run vibe guide "validate my recent changes"
- Docs: uv run vibe guide "create documentation for X"

## Rate-limit mitigation (design-time)
- Keep prompts short and structured; reuse context, avoid restating.
- Use concise mode; cap bullets; prefer references.
- Prefer single-source-of-truth links over inline manuals.
- Batch related tool calls; avoid high-frequency small calls.

## Success criteria
- Guidance-first behavior demonstrated; compact outputs; validation run; reusable patterns captured.

## Troubleshooting (short)
- If a workflow isn’t found: check YAML name/category.
- If guidance is noisy: enable/keep concise mode; summarize results.
- If rate-limited: pause/retry with backoff; split large outputs; reduce detail.
