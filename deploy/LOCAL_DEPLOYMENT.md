# Rin OJ Local Deployment

This guide is for teachers, club admins, and contributors who want a predictable local setup before moving to Helm or a cloud VM.

## 1. Requirements

- Node.js 24+
- pnpm 10+
- Go 1.23+
- Docker Desktop or Docker Engine with Compose

## 2. Configure

Copy the example environment file:

```powershell
Copy-Item deploy\.env.example deploy\.env
```

The defaults are development-only credentials. Change them before exposing the stack to a LAN or public host.

`NEXT_PUBLIC_RIN_MOCK_SUBMISSIONS=true` keeps the Web UI usable even when the Go gateway is not running: submissions show a local deterministic judging preview. Set it to `false` when validating the real gateway and judge-dispatcher path.

## 3. Start Data Services

```powershell
docker compose --env-file deploy\.env -f deploy\docker-compose.yml up -d postgres redis meilisearch minio
```

Health checks:

```powershell
docker compose -f deploy\docker-compose.yml ps
```

## 4. Run The Web App For Development

```powershell
npm install
npm run web:dev
```

Open:

- Web UI: http://127.0.0.1:3000
- MinIO console: http://127.0.0.1:9001
- MeiliSearch: http://127.0.0.1:7700

## 5. Run The Web App In Docker

The `web` service is behind a Compose profile so dependency-only development stays fast.

```powershell
docker compose --env-file deploy\.env -f deploy\docker-compose.yml --profile web up --build web
```

Open http://127.0.0.1:3000.

## 6. Run API Services Locally

Start each service in a separate terminal while the data services are running:

```powershell
cd services\problem-service
go run .
```

```powershell
cd services\submission-service
go run .
```

```powershell
cd services\judge-dispatcher
go run .
```

```powershell
cd services\gateway
go run .
```

Gateway health check:

```powershell
curl http://127.0.0.1:8080/healthz
```

## 7. Run A Real Judge Backend

Rin OJ uses `criyle/go-judge` as the default sandbox backend. It must run on Linux with cgroup support; Docker Desktop Linux containers work for local experiments, but production workers should be dedicated Linux hosts. If Docker Desktop is not running, Compose validation can still pass but image pull/start will fail until the Docker daemon is available.

Start go-judge:

```powershell
docker compose --env-file deploy\.env -f deploy\docker-compose.yml --profile judge up --build -d go-judge
```

Rin OJ builds `rin-oj/go-judge:dev` from `deploy/go-judge.Dockerfile`. It extends `criyle/go-judge:v1.12.0` with common compilers, including `g++`, so C++17 submissions can compile locally.

Run the dispatcher against go-judge:

```powershell
$env:RIN_JUDGE_PROVIDER="gojudge"
$env:RIN_GO_JUDGE_ENDPOINT="http://127.0.0.1:5050"
cd services\judge-dispatcher
go run .
```

For Web-only UI demos you can keep `NEXT_PUBLIC_RIN_MOCK_SUBMISSIONS=true`. For the real path, set it to `false`, then run gateway, submission-service, judge-dispatcher, Redis, and go-judge together.

## 8. Production Notes

- Replace all values in `deploy\.env`.
- Put PostgreSQL, Redis, MinIO, and MeiliSearch on private networking.
- Terminate TLS at a reverse proxy or ingress controller.
- Run go-judge workers on Linux hosts with cgroup v2 and seccomp enabled.
- Prefer Helm for multi-node deployments; Compose is for local development and small demos.
