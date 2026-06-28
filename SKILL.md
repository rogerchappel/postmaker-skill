# postmaker-skill

Use this skill when an agent has repository evidence and needs launch or social draft material without publishing anything.

## Required Inputs

- Project name and audience.
- Shipped changes.
- Verification commands and results.
- Limitations or caveats.
- Source paths or summaries.
- Optional requested claims to check.

## Tools

- Local filesystem read access for the evidence JSON.
- Node.js 18 or newer.

## Side-effect Boundaries

The skill is read-only except for optional local output redirection chosen by the operator. It must not post, send, schedule, or publish content. Any external action requires separate explicit approval.

## Workflow

1. Collect evidence from README, task files, release notes, and verification logs.
2. Write or update an evidence JSON file.
3. Run `postmaker-skill <file> --format markdown`.
4. Review warnings and remove unsupported claims.
5. Ask for approval before using drafts externally.

## Example

```sh
node bin/postmaker-skill.js fixtures/release-evidence.json --format markdown
```

## Validation

Run:

```sh
npm test
npm run check
npm run build
npm run smoke
```

Do not ship a draft while warnings mention missing verification or unsupported claims.
