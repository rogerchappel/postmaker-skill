# Changelog

## Unreleased

- Treat only explicit passing verification results as publishable evidence.
- Warn and return a non-zero CLI status for failed or malformed verification
  records instead of presenting them as `Verified with`.
- Handle standalone help and invalid `--format` arguments explicitly.

## 0.1.0

- Initial pre-release package for turning explicit repository evidence into reviewable launch post drafts.
- Includes the CLI, reusable skill instructions, fixtures, tests, and package smoke checks.
