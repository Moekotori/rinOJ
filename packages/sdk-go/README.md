# packages/sdk-go

Owner: Go SDK generation.

Boundary: Generated Go clients and Protobuf types for service-to-service communication. Source of truth remains packages/proto.

Regenerate with:

```powershell
cd packages/proto
go run github.com/bufbuild/buf/cmd/buf@v1.57.2 generate
```
