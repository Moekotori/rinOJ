# services/gateway

Owner: API edge.

Boundary: HTTP BFF and WebSocket fanout. It exposes OpenAPI endpoints, verifies edge auth, applies rate limits, and calls domain services through gRPC. It does not own persistent domain models.

## Dependency Choice

Echo is selected over Fiber for the first gateway because:

- Performance: Echo is fast enough for the API edge while keeping standard `net/http` compatibility.
- Ecosystem: Echo middleware integrates cleanly with OpenTelemetry, Prometheus, JWT, CSRF, and request validation.
- Maintenance: Echo is mature, widely used, and actively maintained.

## Local Run

```powershell
go test ./...
go run .
curl http://localhost:8080/healthz
```

## Submission Routes

```powershell
curl -X POST http://localhost:8080/v1/submissions `
  -H "Content-Type: application/json" `
  -H "X-Rin-Actor-ID: usr_1" `
  -d "{\"problemId\":\"prob_1\",\"languageId\":\"cpp17\",\"sourceCode\":\"int main(){return 0;}\"}"

curl "http://localhost:8080/v1/submissions?actorId=usr_1&pageSize=30"

curl "http://localhost:8080/v1/submissions?actorId=usr_1&pageSize=30&cursor=<nextCursor>"

curl "ws://localhost:8080/v1/submissions/<submissionId>/events"
```

`GET /v1/submissions` is cursor-paginated. Pass the returned `nextCursor`
verbatim; do not build cursors in clients.

## Problem Intake Routes

```powershell
curl -X POST http://localhost:8080/v1/problem-intake/uploads `
  -H "Content-Type: application/json" `
  -H "X-Rin-Actor-ID: usr_teacher" `
  -d "{\"filename\":\"Two Sum.zip\",\"contentType\":\"application/zip\",\"sizeBytes\":1048576,\"partCount\":1}"

curl -X POST "http://localhost:8080/v1/problem-intake/imports:validate" `
  -H "Content-Type: application/json" `
  -H "X-Rin-Actor-ID: usr_teacher" `
  -d "{\"uploadObjectKey\":\"problem-intake/usr_teacher/upload.zip\",\"sourceFilename\":\"Two Sum.zip\"}"

curl -X POST http://localhost:8080/v1/problem-intake/teacher-quick-upload `
  -H "Content-Type: application/json" `
  -H "X-Rin-Actor-ID: usr_teacher" `
  -d "{\"classId\":\"class_1\",\"uploadObjectKey\":\"problem-intake/usr_teacher/upload.zip\",\"requestAdminReview\":true}"

curl -X POST http://localhost:8080/v1/problem-intake/student-drafts `
  -H "Content-Type: application/json" `
  -H "X-Rin-Actor-ID: usr_student" `
  -d "{\"classId\":\"class_1\",\"uploadObjectKey\":\"problem-intake/usr_student/upload.zip\",\"noteToReviewer\":\"please review\"}"
```
