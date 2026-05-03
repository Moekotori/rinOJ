# services/problem-service

Owner: Problem domain.

Boundary: Problem metadata, multilingual statements, test data metadata, versioning, tags, visibility, and Problem Intake. Teacher Quick Upload and Student Draft Submission are first-class workflows here.

## Current Skeleton

- `ImportWizard` validates simple problem packages with friendly messages.
- `ValidateProblemImport` returns a metadata-level wizard immediately after upload.
- `Teacher Quick Upload` creates review/public drafts from one guided upload.
- `Student Draft Submission` creates private drafts for teacher/admin review.
- `CreatePresignedUpload` returns pre-signed upload URLs for drag/drop ZIP packages.
- gRPC `ProblemService` exposes the first Problem Intake methods.

## Dependency Choice

MinIO Go SDK is used for object storage signing because:

- Performance: pre-signed uploads keep large ZIP/test data packages out of the API process.
- Ecosystem: it is the official MinIO-compatible Go client and works with S3-style object stores.
- Maintenance: `github.com/minio/minio-go/v7` is actively versioned; this service currently pins `v7.1.0`.

## Local Test

```powershell
go test ./...
```

## Local Run

By default the service runs without object storage signing. To enable MinIO pre-signed uploads:

```powershell
$env:RIN_MINIO_ENDPOINT="127.0.0.1:9000"
$env:RIN_MINIO_ACCESS_KEY="rin"
$env:RIN_MINIO_SECRET_KEY="rin_dev_minio_password"
$env:RIN_MINIO_PROBLEM_BUCKET="rin-problems"
go run .
```

The current skeleton signs each planned part as a separate object key. A later MinIO compose/multipart pass will merge parts into a final package object without changing the `intake.UploadSigner` interface.

`ValidateProblemImport` currently performs the synchronous metadata pass: it checks request shape, derives a friendly title from the uploaded filename, and returns a non-blocking parser-pending warning. The future ZIP parser will enrich the same `ImportWizard` contract with real statements, samples, and test validations.

The domain parser already recognizes this common ZIP layout:

```text
problem.json
statements/zh-CN.md
samples/1.in
samples/1.out
tests/001.in
tests/001.out
```

It reads directly from the ZIP stream and rejects unsafe paths such as `../`.

## Future curl Example

```powershell
curl -X POST http://localhost:8080/v1/problem-intake/teacher-quick-upload `
  -H "Authorization: Bearer <token>" `
  -H "Content-Type: application/json" `
  -d "{\"classId\":\"class_1\",\"uploadObjectKey\":\"problem-intake/two-sum.zip\",\"requestAdminReview\":true}"
```
