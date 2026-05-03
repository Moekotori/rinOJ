# Contributing to Rin OJ

Rin OJ uses an interface-first workflow. For any module, write or update the contract and tests before implementation.

## Commit Style

Use Conventional Commits:

- `feat: add problem intake draft api`
- `fix: normalize judge status mapping`
- `docs: add judge backend adr`
- `test: cover submission stream contract`

## Architecture Impact Checklist

Every pull request should state:

- Which domain owns the change.
- Which OpenAPI or Protobuf contract changed.
- Which event types changed.
- Which data migrations are required.
- Whether the change affects judge sandboxing, auth, rate limits, or large object handling.

## Problem Intake UX Rule

Problem authoring must stay friendly for teachers and students. A feature is not complete if it only works through internal scripts. Prefer guided forms, drag/drop import, clear validation messages, preview before publish, and reviewable drafts.
