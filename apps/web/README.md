# apps/web

Owner: Frontend platform.

Boundary: Main Next.js 15 PWA for students, teachers, and public community pages. It owns user-facing flows such as login, problem browsing, problem solving, contests, profiles, and the guided Problem Intake UI.

## Current Skeleton

- App Router first screen for Problem Intake and quick submissions.
- React Query wraps gateway mutations.
- Zustand stores the temporary actor/role until real auth lands.
- Monaco powers the source editor surface.
- `next-intl` provides the initial Chinese message bundle.

## Local Run

```powershell
npx --yes pnpm@10.10.0 --filter @rin-oj/web dev
```

Set the gateway target when it is not on `127.0.0.1:8080`:

```powershell
$env:NEXT_PUBLIC_RIN_GATEWAY_URL="http://127.0.0.1:8080"
```

Submission mock mode is opt-in. Leave it disabled when testing the real
go-judge pipeline:

```powershell
$env:NEXT_PUBLIC_RIN_MOCK_SUBMISSIONS="false"
```
