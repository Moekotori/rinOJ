# deploy

Owner: Platform operations.

Boundary: Local docker compose, Helm charts, Kustomize overlays, optional Terraform, observability defaults, backup jobs, and production deployment documentation.

## Quick Start

Use [LOCAL_DEPLOYMENT.md](LOCAL_DEPLOYMENT.md) for a friendly local deployment path.

```powershell
Copy-Item deploy\.env.example deploy\.env
docker compose --env-file deploy\.env -f deploy\docker-compose.yml up -d postgres redis meilisearch minio
npm run web:dev
```

To run the web app in Docker:

```powershell
docker compose --env-file deploy\.env -f deploy\docker-compose.yml --profile web up --build web
```
