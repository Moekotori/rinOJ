# Rin OJ

Rin OJ is a modular online judge platform designed for school and community training. The stack is intentionally fixed around Next.js 15, React 19, Go 1.23, gRPC, OpenAPI, PostgreSQL, Redis, MeiliSearch, MinIO, and go-judge.

The first milestone is interface-first: architecture docs, ADRs, Protobuf contracts, and OpenAPI contracts land before service implementation.

## Local Validation

```powershell
npm test
```

## Friendly Local Deployment

For a one-machine setup, start with the deployment guide:

- [Local deployment guide](deploy/LOCAL_DEPLOYMENT.md)
- [Example environment file](deploy/.env.example)
- [Compose stack](deploy/docker-compose.yml)

```powershell
Copy-Item deploy\.env.example deploy\.env
docker compose --env-file deploy\.env -f deploy\docker-compose.yml up -d postgres redis meilisearch minio
npm run web:dev
```

The web app can also be built and run through Docker:

```powershell
docker compose --env-file deploy\.env -f deploy\docker-compose.yml --profile web up --build web
```

## Current Scope

- Architecture draft with C4 diagrams
- ADRs for judge backend, event bus, and `rin-ui`
- Initial Protobuf/OpenAPI surface for user, problem intake, submission, contest, judge, and events
- Go service skeletons for gateway, user-service, and problem-service
- Performance notes and Go benchmark entrypoint
- Problem Intake upload signing and draft repository skeletons

## First Local Endpoint

```powershell
cd services/gateway
go run .
curl http://localhost:8080/healthz
```

## Submission Smoke Path

Start Redis, problem-service, submission-service, judge-dispatcher, then gateway:

```powershell
docker compose -f deploy/docker-compose.yml up -d redis

cd services/problem-service
go run .

cd services/submission-service
go run .

cd ..\judge-dispatcher
go run .

cd ..\gateway
go run .
```

Create a mock submission:

```powershell
curl -X POST http://localhost:8080/v1/submissions `
  -H "Content-Type: application/json" `
  -H "X-Rin-Actor-ID: usr_1" `
  -d "{\"problemId\":\"prob_1\",\"languageId\":\"cpp17\",\"sourceCode\":\"int main(){return 0;}\"}"
```

Create a teacher problem package upload:

```powershell
curl -X POST http://localhost:8080/v1/problem-intake/uploads `
  -H "Content-Type: application/json" `
  -H "X-Rin-Actor-ID: usr_teacher" `
  -d "{\"filename\":\"Two Sum.zip\",\"contentType\":\"application/zip\",\"sizeBytes\":1048576,\"partCount\":1}"
```

## Performance Benchmarks

```powershell
npm run bench:go
```

## Toolchain Note

Rin OJ targets Go 1.23 for service modules. If a newer local Go tool rewrites a module to a newer `go` directive during `go mod tidy`, restore it to `1.23.0` before committing.
