#!/usr/bin/env python3

import tempfile
from pathlib import Path

from vibe.workflows.quality import validate_workflow_yamls

with tempfile.TemporaryDirectory() as tmp:
    tmp_path = Path(tmp)
    data_dir = tmp_path / "data"
    data_dir.mkdir()

    yaml_content = """name: step_test
description: Test step message validation
triggers: ["test"]
steps:
  - "🎯 Emoji step should be flagged"
  - "Short"
  - "This is a very long step message that exceeds the reasonable length limit and should be flagged as too verbose for clear guidance messages"
  - "TOO MANY CAPS WORDS HERE"
  - "Multiple!!! exclamation!!! marks!!!"
  - "Proper step without emoji and reasonable length"
"""

    (data_dir / "step_test.yaml").write_text(yaml_content.strip())
    issues = validate_workflow_yamls(root=tmp_path)
    print(f"Found {len(issues)} issues:")
    for issue in issues:
        print(f"  - {issue}")
