# Rin OJ Performance Notes

Rin OJ is still in skeleton stage, so current benchmark numbers only describe tiny in-memory code paths. They do not yet prove production OJ performance. The value of benchmarking now is to create a habit and a guardrail before PostgreSQL, Redis, MinIO, WebSocket fanout, and go-judge enter the hot path.

## Performance Target

Rin OJ should feel like a high-end competitive programming platform:

- Problem statement API P99 under 80ms.
- Submission API P99 under 150ms.
- Queue-to-dispatch latency under 200ms.
- Scoreboard update latency under 1s.
- Frontend LCP under 1.8s on domestic hosting.
- Peak intake target: 200 submissions/s.

## Hot Paths

1. Submission create: gateway auth, rate limit, source encryption, PostgreSQL insert, Asynq enqueue.
2. Judge dispatch: Redis queue consume, language config lookup, MinIO test data access, go-judge request, result stream.
3. Result fanout: submission-service persistence, event publish, WebSocket push, contest scoreboard update.
4. Problem reads: CDN/browser cache, Redis cache, PostgreSQL read replica, MeiliSearch for search-only queries.
5. Contest scoreboard: Redis ZSet updates, snapshot persistence, cursor pagination.
6. Problem Intake uploads: browser directly uploads ZIP/test packages to MinIO with pre-signed URLs; the API stores metadata and validation state only.

## Performance Rules

- Measure first. Every hot path gets a Go benchmark or k6 scenario before optimization work.
- Keep gateway thin. The gateway should authenticate, validate, rate-limit, and route; domain work belongs in services.
- Use cursor pagination only. OFFSET pagination is banned for user-facing lists.
- Keep large objects out of the API. Statements can be cached through the API; test data and attachments use MinIO pre-signed URLs.
- Make judge queues isolated. General jobs and judge jobs must not share one queue.
- Apply backpressure. If judge queues are saturated, submission create should return a clear queued state instead of blocking request threads.
- Cache by ownership. Problem statements, language config, permissions, and scoreboard slices can use different TTLs.
- Prefer streaming for long work. Submissions and imports should expose progress instead of making the browser wait on one long request.

## Benchmark Commands

```powershell
npm run bench:go
```

For a stable run during tuning:

```powershell
go test -bench=. -benchmem -count=5 ./services/gateway/... ./services/problem-service/... ./services/user-service/...
```

## Current Benchmark Scope

The current benchmarks cover:

- `BenchmarkHealthz`: gateway HTTP handler overhead.
- `BenchmarkRegister` and `BenchmarkLogin`: in-memory auth skeleton.
- `BenchmarkValidateProblemImport`: normalized problem intake validation.
- `BenchmarkStudentDraftSubmission`: student draft creation skeleton.
- Submission-service and judge-dispatcher tests now cover the first Redis/Asynq-oriented submission lifecycle; deeper enqueue and dispatch benchmarks will be tightened as persistence and go-judge land.
- Submission-service now has a PostgreSQL repository boundary and partitioned submissions migration; integration tests are opt-in through `RIN_TEST_POSTGRES_DSN`.
- Problem-service now has a pre-signed upload boundary and draft repository; MinIO integration is isolated behind `intake.UploadSigner`.
- Gateway now exposes Problem Intake HTTP routes while keeping large ZIP payloads off the API process.

These are useful for regression detection, but the real performance proof will come after:

- PostgreSQL repositories are exercised under CI with partition-aware fixtures.
- Redis/Asynq queues are wired against live Redis in CI/local smoke tests.
- MinIO pre-signed upload and object metadata are wired.
- go-judge provider integration exists.
- k6 can simulate concurrent submissions.

## Commenting Policy

Rin OJ code should be readable for learners. Comments should explain why a boundary exists, why a tradeoff was chosen, or why a security/performance rule matters. Comments should not repeat obvious syntax.
