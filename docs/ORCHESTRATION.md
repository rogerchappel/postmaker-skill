# Orchestration

## Agent Use

1. Gather local evidence from repo docs and verification output.
2. Create a small evidence JSON file.
3. Run the CLI in Markdown mode.
4. Inspect warnings.
5. Keep the output local unless the user approves publishing.

## Approval Requirements

- No approval is needed for local reads and local draft generation.
- Approval is required before posting, sending, scheduling, or uploading content.

## Failure Modes

- Missing verification: regenerate evidence after running checks.
- Unsupported claim: remove the claim or attach a source.
- Empty source list: keep draft internal until source references are added.
