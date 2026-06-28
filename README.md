# postmaker-skill

`postmaker-skill` is a local-first agent skill for turning repository evidence into launch-ready posts. It produces a short launch post, technical post, demo caption, follow-up checklist, limitations, source references, and warnings for unsupported claims.

## Quickstart

```sh
npm install
npm run smoke
npm run release:check
node bin/postmaker-skill.js fixtures/release-evidence.json --format json
node bin/postmaker-skill.js fixtures/release-evidence.json --format markdown
```

## Evidence Input

Provide JSON with:

- `project`: public project name.
- `audience`: intended readers.
- `changes`: shipped changes or features.
- `verification`: commands and results.
- `limitations`: caveats that should stay near the draft.
- `sources`: paths and short summaries.
- `requestedClaims`: optional claims the user wants included.

## Example

```sh
postmaker-skill fixtures/release-evidence.json --format markdown
```

The command prints a Markdown launch pack that can be reviewed before anything is posted externally.

## Safety Notes

This package does not post to social networks, send messages, call APIs, or open browser sessions. Treat its output as a draft. An agent should ask for approval before publishing or sending content outside the local workspace.

## Limitations

- Evidence extraction is intentionally explicit; it does not crawl a repository by itself.
- Claim support uses deterministic substring checks, so reviewers should still inspect high-stakes language.
- It is optimized for small release notes, demos, and OSS launch material.
