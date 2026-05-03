# ADR-0001: Judge Backend Selection

Status: Proposed  
Date: 2026-05-02

## Decision

Rin OJ will use `criyle/go-judge` as the default sandbox execution backend. It will be wrapped by `services/judge-dispatcher` through a `JudgeProvider` interface so Judge0 and syzoj/judge-v3 can be added later without changing submission or contest business logic.

## Context

Rin OJ must support 200 submissions per second at peak, streaming status updates, subtask aggregation, rejudge, language hot updates, and strict sandboxing. The main backend stack is Go 1.23, gRPC, Protobuf, Redis, and Asynq, so the judge backend should integrate cleanly with Go services and isolated workers.

Repository metadata was checked on 2026-05-02:

| Candidate | Performance | Ecosystem | Maintenance | License | Decision |
| --- | --- | --- | --- | --- | --- |
| `criyle/go-judge` | High. Go implementation, lightweight sandbox service, HTTP/gRPC surface, Linux namespace/cgroup/seccomp model. | Used in modern OJ stacks and easy to embed behind our dispatcher. | Not archived, recently pushed on 2026-04-27. | MIT | Default |
| `judge0/judge0` | Medium-high. Production-ready but heavier service stack, Docker-based deployment shape, REST-first. | Largest public ecosystem, broad language support, hosted/SaaS familiarity. | Not archived, recently pushed on 2026-04-20. | GPL-3.0 | Backup provider |
| `syzoj/judge-v3` | Medium. Familiar OI/OJ shape but older Node/TypeScript daemon. | Useful compatibility reference for SYZOJ-style workloads. | Not archived, last observed push on 2023-10-04. | GPL-3.0 | Compatibility reference |

## Rationale

- Performance: go-judge keeps the worker path small and fits the target dispatch latency better than a heavier all-in-one judge service.
- Ecosystem: Judge0 has a broader public ecosystem, but Rin OJ needs custom OJ semantics in its own services. go-judge is a better low-level execution engine.
- Maintenance: go-judge is active enough for a new platform and has a permissive MIT license. syzoj/judge-v3 is less active and GPL-3.0.
- Architecture: a `JudgeProvider` boundary keeps the core submission flow independent from backend-specific APIs.

## Consequences

- Rin OJ must implement language configuration, compile templates, test point aggregation, SPJ, interactive protocol handling, and result normalization itself.
- Production worker nodes must be Linux hosts with cgroup v2 and sandbox prerequisites.
- The provider contract must be tested with a mock provider before wiring real go-judge.

## Initial Interface

```go
type JudgeProvider interface {
    Submit(ctx context.Context, req JudgeRequest) (<-chan JudgeResult, error)
    Languages(ctx context.Context) ([]JudgeLanguage, error)
    HealthCheck(ctx context.Context) error
}
```
