# Sprint 01 Plan

Sprint goal: establish the interface-first foundation and one vertical smoke path using mock judging.

## Day 1

- Create monorepo skeleton and workspace files.
- Land `docs/ARCHITECTURE.md`.
- Land ADR-0001 judge backend, ADR-0002 event bus, ADR-0003 `rin-ui` theme.
- Document `Problem Intake`, including Teacher Quick Upload and Student Draft Submission.

## Day 2

- Write contract tests for Protobuf and OpenAPI files.
- Create `packages/proto` for user, problem, submission, contest, judge, and event domains.
- Create `packages/openapi/openapi.yaml` for gateway-facing HTTP contracts.

## Day 3

- Create Go workspace service directories.
- Add gateway, user-service, and problem-service health contracts.
- Add GitHub Actions lint/test/build skeleton.

## Day 4

- Write auth tests first: register, login, refresh, permission denial.
- Implement user-service domain model, PostgreSQL migration skeleton, JWT access/refresh token shape, and Casbin policy skeleton.

## Day 5

- Write problem-service contract tests first.
- Implement problem metadata, multilingual statements, and MinIO pre-signed upload skeleton.
- Implement Teacher Quick Upload draft creation API and Student Draft Submission API surface.

## Day 6

- Write JudgeProvider mock stream tests first.
- Implement judge-dispatcher queue consumer skeleton and go-judge provider adapter boundary.
- Define submission queued, running, and judged events.

## Day 7

- Build smoke path: register user, create problem draft, submit to mock judge, receive WebSocket result.
- Add README and curl examples for each completed module.
- Review architecture drift before real go-judge integration.
