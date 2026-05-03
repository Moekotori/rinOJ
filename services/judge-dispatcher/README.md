# services/judge-dispatcher

Owner: Judge dispatch domain.

Boundary: Asynq judge queue consumers, JudgeProvider implementations, go-judge integration, language runtime mapping, and streaming normalized JudgeResult events.

## Current Skeleton

- Consumes `judge.submit.v1` from the isolated `judge` Asynq queue.
- Uses `MockJudgeProvider` by default for deterministic queue tests.
- Can switch to `GoJudgeHTTPProvider` through `RIN_JUDGE_PROVIDER=gojudge`.
- Reports results back to submission-service over gRPC.

## Local Run

```powershell
docker compose -f ..\..\deploy\docker-compose.yml up -d redis
go test ./...
go run .
```

## Real go-judge Backend

Start the sandbox service on a Linux Docker host:

```powershell
docker compose --env-file ..\..\deploy\.env.example -f ..\..\deploy\docker-compose.yml --profile judge up --build -d go-judge
```

The Compose service builds `rin-oj/go-judge:dev`, which extends `criyle/go-judge:v1.12.0` with `g++` and other common runtimes. The upstream image alone can start the sandbox, but it does not include the C++ compiler needed by the current C++17 provider.

Then run the dispatcher with the real provider:

```powershell
$env:RIN_JUDGE_PROVIDER="gojudge"
$env:RIN_GO_JUDGE_ENDPOINT="http://127.0.0.1:5050"
go run .
```

The first implementation runs the configured sample tests for seed problems and maps these `languageId` values through `go-judge`: `c11`, `c17`, `cpp17`, `cpp20`, `cpp23`, `go`, `golang`, `java`, `java17`, `kotlin`, `nodejs20`, `php83`, `pypy3`, `python3`, `ruby33`, and `rust`. It still keeps the provider boundary narrow so full test-data loading can replace the sample map without touching queue or reporting code.
