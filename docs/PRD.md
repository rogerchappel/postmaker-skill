# postmaker-skill PRD

## Problem

Agents complete useful repository work but often leave launch posts and demo captions detached from actual evidence. This causes inflated claims, missing limitations, and manual rework.

## Goal

Provide a local-first skill and CLI that turns structured repository evidence into reviewable launch content with warnings for unsupported claims.

## MVP

- JSON evidence input.
- Deterministic launch, technical, and demo post generation.
- Follow-up checklist and limitations.
- Unsupported claim warnings.
- CLI and library API.
- Fixture-backed tests and smoke command.

## Success

An agent builder can run the fixture smoke command locally, inspect the Markdown output, and understand what needs approval before external publishing.
