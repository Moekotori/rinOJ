# services/submission-service

Owner: Submission domain.

Boundary: Submission lifecycle, status persistence, result aggregation, rejudge requests, and status streams consumed by gateway WebSocket clients.

## Current Skeleton

- gRPC `SubmissionService` using generated Protobuf types.
- In-memory repository by default, optional PostgreSQL repository with partitioned `submissions`.
- Redis/Asynq enqueuer for `judge.submit.v1` tasks.
- `ReportJudgeResult` endpoint for judge-dispatcher status write-back.
- `ListSubmissions` uses opaque cursor pagination over `(created_at, submission_id)`.

## Local Run

```powershell
docker compose -f ..\..\deploy\docker-compose.yml up -d redis
go test ./...
go run .
```

## PostgreSQL Repository

The default repository is in-memory for fast local development. To use PostgreSQL:

```powershell
$env:RIN_SUBMISSION_POSTGRES_DSN="postgres://rin:rin_dev_password@127.0.0.1:5432/rin_oj?sslmode=disable"
```

Apply migrations first:

```powershell
psql $env:RIN_SUBMISSION_POSTGRES_DSN -f migrations/001_create_submissions.sql
```

For local development only, the service can apply embedded migrations at startup:

```powershell
$env:RIN_SUBMISSION_AUTO_MIGRATE="true"
go run .
```

Run the optional integration test:

```powershell
$env:RIN_TEST_POSTGRES_DSN=$env:RIN_SUBMISSION_POSTGRES_DSN
go test ./internal/postgres
```

## Listing Performance

Submission lists never use `OFFSET`. The service encodes the last row boundary
into `nextCursor`, then PostgreSQL continues with:

```sql
created_at < cursor.created_at
OR (created_at = cursor.created_at AND submission_id < cursor.submission_id)
```

This keeps user, problem, contest, and global submission feeds stable when the
table grows to millions of rows.
