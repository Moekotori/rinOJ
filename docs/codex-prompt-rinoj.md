# Rin OJ — AI Assistant Prompt

Use this prompt as context when asking an AI coding assistant to work on this project.

---

## Project Overview

**Rin OJ** is a modular online judge platform for school and community training, targeting 1k–10k DAU and peak 200 submissions/second.

Monorepo layout:
- `apps/web` — Next.js 15 + React 19, main PWA
- `apps/admin` — Next.js 15 + React 19, admin console
- `services/` — Go 1.23 microservices communicating over gRPC
- `packages/proto` — Protobuf contracts (source of truth for internal APIs)
- `packages/openapi/openapi.yaml` — OpenAPI 3.1 (source of truth for external HTTP API)
- `packages/rin-ui` — shared design-token component library (Rin anime theme)
- `deploy/` — Docker Compose, Helm, Terraform

## Fixed Tech Stack

Do not suggest replacing these. All decisions are intentional:
- **Frontend**: Next.js 15, React 19, TypeScript, pnpm workspaces
- **Backend**: Go 1.23, gRPC, Echo/Fiber gateway
- **Database**: PostgreSQL 16 (primary), Redis 7 (cache/queue/streams)
- **Search**: MeiliSearch (zh-CN / en-US / ja-JP)
- **Object storage**: MinIO (test data, attachments, avatars)
- **Judge sandbox**: criyle/go-judge (cgroup v2 + seccomp-bpf + PID/network namespace isolation)
- **Queue**: Asynq on Redis
- **Observability**: OpenTelemetry, Prometheus, Grafana, Loki, Jaeger

## Architecture Principles

1. **Interface-first**: Protobuf and OpenAPI contracts must be updated before changing service behavior.
2. **No large payloads through gateway**: Use MinIO pre-signed multipart URLs for test data and ZIP uploads.
3. **Cursor pagination everywhere**: Never use OFFSET.
4. **Judge is replaceable**: Always call `JudgeProvider` interface, never go-judge directly.
5. **Events are immutable versioned envelopes** — see `docs/ARCHITECTURE.md` for the event schema.
6. **Source code encrypted at rest**: Admin source-view requires step-up auth.

## Services and Responsibilities

| Service | Owns |
|---|---|
| `gateway` | BFF, OpenAPI HTTP, WebSocket fanout, edge auth |
| `user-service` | Identity, profile, RBAC/ABAC (Casbin), OAuth, TOTP |
| `problem-service` | Problem metadata, multilingual statements, Problem Intake, test data metadata |
| `submission-service` | Submission lifecycle, status stream, rejudge |
| `contest-service` | Contest lifecycle, registration, scoreboard (Redis ZSet) |
| `judge-dispatcher` | JudgeProvider abstraction, Asynq consumer, go-judge adapter |
| `discuss-service` | Discussions, editorials, comments, moderation |
| `notification-service` | Inbox, email, webhooks (HMAC signed) |
| `rating-service` | RatingAlgorithm jobs |

## Problem Intake — ZIP Format

Teachers and students upload problems as a ZIP with this exact layout:

```
problem.zip
├─ problem.json          # required, see schema below
├─ statements/
│  ├─ zh-CN.md
│  ├─ en-US.md
│  └─ ja-JP.md
├─ samples/
│  ├─ 1.in
│  └─ 1.out
├─ tests/
│  ├─ 001.in
│  └─ 001.out
├─ checker/              # optional, for special judge
│  └─ checker.cpp        # testlib-based checker
└─ solutions/
   └─ reference.cpp
```

`problem.json` schema (current):
```json
{
  "title": "string",
  "timeLimit": 1000,
  "memoryLimit": 256,
  "judgeType": "normal | special | interactive",
  "languages": ["cpp17", "java21", "python3"],
  "tags": ["string"],
  "difficulty": 1,
  "locale": "zh-CN | en-US | ja-JP",
  "testDataChecksums": {
    "tests/001.in": "sha256hex",
    "tests/001.out": "sha256hex"
  }
}
```

- `judgeType: "special"` requires `checker/checker.cpp` in the ZIP.
- `testDataChecksums` is used by problem-service to verify upload integrity.
- Large test files (>10MB) are uploaded separately via pre-signed MinIO multipart URLs; the ZIP only contains files ≤10MB.

## Key Extension Interfaces

```go
type JudgeProvider interface {
    Submit(ctx context.Context, req JudgeRequest) (<-chan JudgeResult, error)
    Languages(ctx context.Context) ([]JudgeLanguage, error)
    HealthCheck(ctx context.Context) error
}

type RatingAlgorithm interface {
    Name() string
    Compute(ctx context.Context, req RatingRequest) (RatingResult, error)
}

type EventBus interface {
    Publish(ctx context.Context, event EventEnvelope) error
    Subscribe(ctx context.Context, topic string) (<-chan EventEnvelope, error)
}
```

## Event Envelope

```json
{
  "id": "evt_01J...",
  "type": "submission.judged",
  "version": 1,
  "occurredAt": "2026-05-02T10:00:00Z",
  "actorId": "usr_...",
  "subjectId": "sub_...",
  "traceId": "trace_...",
  "payload": {}
}
```

## Performance Targets

- LCP < 1.8s
- Problem statement API P99 < 80ms
- Submission API P99 < 150ms
- Judge dispatch latency < 200ms
- Scoreboard update < 1s

## Judge Security Requirements

go-judge workers must run with:
- cgroup v2 CPU/memory limits (default: 1 core, 256MB)
- seccomp-bpf syscall filter
- PID + network namespace isolation
- tmpfs workdir, read-only rootfs
- No default network
- Max wall time 1s, output 64MB, stack 64MB

## Coding Conventions

- All Go errors must be wrapped with `fmt.Errorf("...: %w", err)`
- All new gRPC methods need a corresponding entry in `packages/proto` first
- All new HTTP endpoints need a corresponding entry in `packages/openapi/openapi.yaml` first
- Tests go next to the code they test (`*_test.go`)
- Go module version must stay at `1.23.0` — do not bump during `go mod tidy`
- Frontend components that are shared go in `packages/rin-ui`, not in `apps/web`

## Current Sprint Status (Sprint 01)

Done:
- Monorepo skeleton, ARCHITECTURE.md, ADRs
- Protobuf and OpenAPI contracts
- Gateway, user-service, problem-service health endpoints
- Problem Intake upload-signing skeleton and draft repository
- Submission smoke path (mock judge via queue)

In progress / next:
- user-service: JWT auth, Casbin RBAC, OAuth binding
- problem-service: real ZIP parse, MeiliSearch indexing
- judge-dispatcher: real go-judge adapter
- Web UI: problem list, submission page, Problem Intake wizard
- Special Judge: checker compilation and execution in go-judge
