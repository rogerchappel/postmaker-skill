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

Provide JSON with all four required fields:

- `project`: non-empty public project name string.
- `audience`: non-empty intended-readers string.
- `changes`: a non-empty array of non-empty shipped-change strings.
- `verification`: command/result objects. Passing results are `pass`, `passed`,
  `success`, `succeeded`, or `ok` (case-insensitive). Any other result is
  treated as failed; missing commands or results are malformed.
- `limitations`: optional array of non-empty caveat strings.
- `sources`: optional array of non-empty path strings or objects with a
  non-empty `path` and optional non-empty `summary`.
- `requestedClaims`: optional array of non-empty claim strings.

The JSON root must be an object. Wrong field types, empty strings, and invalid
array entries are rejected before a draft is rendered; the CLI exits non-zero
with field-specific diagnostics on stderr.

Library callers can use `validateEvidence(evidence)` to inspect untrusted or
incomplete evidence without throwing. Omitted optional collections are treated
as empty, while missing required collections and malformed collection types
produce deterministic warnings. It also reports field-specific warnings for
blank or mistyped `project` and `audience` values, invalid collection entries,
and malformed verification records. Warning order follows the input contract,
then verification results, so callers can compare diagnostics deterministically.
`normalizeEvidence` and `makeLaunchPack` remain strict and throw
`EvidenceValidationError` for inputs outside the JSON contract.

## Example

```sh
postmaker-skill fixtures/release-evidence.json --format markdown
```

The command prints a Markdown launch pack that can be reviewed before anything is posted externally.

The CLI renders that reviewable pack only after the evidence matches the input
contract. Invalid shapes exit with status `1` and a field-specific diagnostic,
without emitting a draft. Failed or malformed verification records still
render a review draft and then exit with status `1`. A complete record with
publishable verification exits with status `0`; warnings about optional
requested claims remain available for human review without changing the exit
status.
Only passing checks appear after `Verified with`. Failed or malformed checks
produce warnings, omit the unqualified verification claim, and make the CLI
exit non-zero after printing the draft for review.

Use `postmaker-skill --help` to print usage. `--format` requires either `json`
or `markdown`; a missing or unsupported value exits non-zero with an explicit
error.

## Safety Notes

This package does not post to social networks, send messages, call APIs, or open browser sessions. Treat its output as a draft. An agent should ask for approval before publishing or sending content outside the local workspace.

## Release Verification

Run the full release gate before opening a release PR or publishing a package:

```sh
npm run release:check
```

The gate runs syntax checks, fixture-backed tests, the maintained CLI smoke
command, and a package smoke that verifies the tarball includes the CLI, source,
skill instructions, fixture evidence, README, license, security policy,
changelog, and contribution guide.

## Limitations

- Evidence extraction is intentionally explicit; it does not crawl a repository by itself.
- Claim support uses deterministic substring checks, so reviewers should still inspect high-stakes language.
- It is optimized for small release notes, demos, and OSS launch material.

## Local Verification

Run the committed test suite before opening a PR:

```sh
npm test
```

The fixture-backed suite covers valid and invalid direct-validation evidence,
passing, failed, and malformed verification evidence, and CLI argument handling.
