# services/user-service

Owner: Identity domain.

Boundary: Users, auth sessions, OAuth bindings, TOTP, profile metadata, RBAC/ABAC decisions, and account audit events.

## Current Skeleton

- Registration validates email, username, and minimum password strength.
- Login validates normalized email and password hash.
- Permission skeleton supports admin and resource-owner decisions before Casbin wiring lands.

## Local Test

```powershell
go test ./...
```

## Future curl Example

```powershell
curl -X POST http://localhost:8080/v1/auth/register `
  -H "Content-Type: application/json" `
  -d "{\"email\":\"rin@example.com\",\"username\":\"rin\",\"password\":\"correct horse battery staple\",\"locale\":\"zh-CN\"}"
```
