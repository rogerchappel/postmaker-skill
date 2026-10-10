# postmaker-skill Tasks

- [x] Scaffold package metadata and CLI.
- [x] Add local evidence parser and launch-pack generator.
- [x] Add unsupported-claim and missing-evidence warnings.
- [x] Add fixture-backed tests.
- [x] Add README, skill instructions, and orchestration docs.
- [x] Add smoke, build, and check scripts.
- [ ] Add optional repository scanner in a future release.

## Optional repository scanner (deferred)

A repository scanner is not part of the current package: evidence collection is
explicit, and the existing CLI accepts a user-supplied evidence JSON file. Do
not infer project facts by crawling files or invoking repository commands in the
current implementation. If a scanner is proposed later, first define its
allowlisted inputs and deterministic output format, including source paths,
observed facts, skipped inputs, and warnings; it must be read-only and must not
follow links or write to the repository. Keep collection separate from draft
generation and require human review of extracted evidence. Until that design is
reviewed and implemented with tests, users should provide evidence explicitly.
