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
   The root must be an object. `project` and `audience` are non-empty strings;
   `changes` is a non-empty string array. Optional `limitations` and
   `requestedClaims` are non-empty string arrays. Optional `sources` contains
   non-empty strings or objects with a non-empty `path` and optional non-empty
   `summary`.
3. Record each verification as an object with a non-empty `command` and
   `result`. Use `passed`, `success`, or another documented passing result only
   when the check actually succeeded.
4. Run `postmaker-skill <file> --format markdown`.
5. Review warnings and remove unsupported claims. A non-zero exit after draft
   output means required evidence is absent, verification failed, or
   verification was malformed, so the draft is not publishable.
6. Ask for approval before using drafts externally.

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

Do not ship a draft while warnings mention missing, failed, or malformed
verification or unsupported claims. Only passing checks may be described as
`Verified with` in generated copy.
