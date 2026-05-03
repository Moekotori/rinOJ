# Codex CLI Prompt — 实现 user-service 后端

> 这是一份给 Codex CLI(agent 模式)的一次性任务 prompt。直接整段复制粘贴即可。
> 模式假设:Codex 拥有读写仓库、运行 shell 和测试的能力,可以在 `D:\rinOJ` 下自主迭代。

---

## 复制以下内容给 Codex

你是一名 Go 后端工程师,在 monorepo `D:\rinOJ`(Rin OJ —— 在线判题平台)上工作。本次任务是把 `services/user-service` 从只有 domain 骨架补全为可运行的 gRPC 服务,具备 PostgreSQL 持久化、JWT access/refresh token、基础 RBAC,并通过 `services/gateway` 暴露 `/v1/auth/register` 和 `/v1/auth/login`。

整个仓库采用 **interface-first** 方法论:proto 和 OpenAPI 是不可改动的契约,你只补实现。

---

### 1. 必读上下文(动手前先读完)

按这个顺序读,理解约束:

1. `D:\rinOJ\README.md` — 项目总览。注意末尾 **Toolchain Note**:Go directive 必须保持 `1.23.0`,如果 `go mod tidy` 改写了就还原。
2. `D:\rinOJ\docs\ARCHITECTURE.md` — 关注 user-service 边界(identity、auth session、RBAC/ABAC)和 §"API auth uses short access tokens, long refresh tokens..."。
3. `D:\rinOJ\docs\SPRINT-01.md` — Day 4 写明 user-service 范围:auth tests first → domain → PostgreSQL migration → JWT access/refresh → Casbin policy skeleton。
4. **契约**(只读不改):
   - `D:\rinOJ\packages\proto\rin\user\v1\user.proto` — gRPC 接口定义。
   - `D:\rinOJ\packages\sdk-go\rin\user\v1\` — 已生成的 Go 绑定,作为依赖直接导入 `github.com/rin-oj/rin-oj/packages/sdk-go/rin/user/v1`。
   - `D:\rinOJ\packages\openapi\openapi.yaml` 中 `/v1/auth/register`、`/v1/auth/login` — gateway 边界的 HTTP shape。
5. **现有 domain 骨架**(可改、可重构,但要保留依赖注入风格):
   - `D:\rinOJ\services\user-service\internal\domain\auth.go`
   - `D:\rinOJ\services\user-service\internal\domain\permission.go`
   - `D:\rinOJ\services\user-service\internal\domain\auth_test.go`
6. **参考实现模式**(对着抄,不要重新发明):
   - `D:\rinOJ\services\problem-service\main.go` — 标准 main.go 模式。
   - `D:\rinOJ\services\problem-service\internal\grpcserver\server.go` — grpcserver 把 proto 请求适配到 domain。
   - `D:\rinOJ\services\submission-service\internal\postgres\repository.go` — pgxpool 仓储模式。
   - `D:\rinOJ\services\submission-service\migrations\apply.go` + `001_create_submissions.sql` — `embed.FS` 嵌入 SQL 迁移的模式。
   - `D:\rinOJ\services\submission-service\main.go` — 多依赖装配 + 内存/Postgres 仓储切换的模式。

---

### 2. 范围 & 不许做的事

**做这些**:补全 user-service 后端、迁移、测试,并在 gateway 里把 `/v1/auth/register`、`/v1/auth/login`、`/v1/auth/refresh` 接到 user-service 的 gRPC client 上。

**不做这些**:
- 不要修改任何 `.proto` 或 `openapi.yaml`。如果觉得契约不够用,在 PR 描述里提出而不是私自改。
- 不要新建 service 或动其它 service 的内部包。
- 不要落地 OAuth、TOTP、邮箱验证邮件、密码重置(留 stub 即可)。
- 不要引入完整 Casbin 策略文件 —— 这次只做 admin / resource-owner skeleton 通过 RPC 暴露,policy DSL 留下一 sprint。
- 不要写前端代码。
- 不要在仓库里嵌入任何真实的 secret 或 JWT private key。

---

### 3. 任务分解(按顺序提交)

#### 3.1 重构 domain 层,准备接外部依赖

- 在 `services/user-service/internal/domain/` 下:
  - 把 `AuthService` 内的 `usersByEmail` 内存 map 抽出来,定义一个 `UserRepository` interface(方法至少:`CreateUser(ctx, NewUserRecord) (User, error)`、`FindByLogin(ctx, normalizedLogin) (StoredUser, error)`、`SaveSession(ctx, Session) error`、`FindSessionByRefresh(ctx, refreshToken) (Session, error)`、`RevokeSession(ctx, sessionID) error`)。具体方法名/签名你定,但要测试友好。
  - `hashPassword` 当前是 SHA256 dev 占位。新建 `PasswordHasher` interface,默认实现用 `golang.org/x/crypto/argon2`(argon2id,参数 time=1, memory=64*1024, threads=4, keyLen=32, saltLen=16,前缀 `argon2id$`)。保留旧的 SHA256 dev hasher 仅用于既有测试,但默认装配走 argon2id。
  - `TokenGenerator` 替换为 `TokenIssuer` interface:`IssueAccess(userID, ...claims)` 返回 `(token string, expiresAt time.Time, err error)`,`IssueRefresh(...)` 同理,`ParseAccess(token) (Claims, error)`,`ParseRefresh(...)` 同理。保留 `StaticTokenGenerator` 改名为 `staticTokenIssuer` 仅供测试用。
  - 给 `AuthService` 加 `Refresh(ctx, refreshToken) (AuthSession, error)`:校验 refresh token 签名 + 在仓储里查 session 未撤销 → 签发新的 access(可选 rotate refresh)。
  - `PermissionService.CheckPermission` 保留现有 admin / owner 逻辑,但签名改成接 ctx 并返回 error,留 TODO 接 Casbin 的位置。
- 所有改动**先写/改测试再实现**。已有的 `auth_test.go` 必须仍然通过;新增 table-driven 测试覆盖:
  - 重复邮箱注册被拒。
  - 弱密码 / 非法 username / 非法 email。
  - 登录成功 / 登录失败统一错误信息(不泄露邮箱是否存在)。
  - Refresh:有效 token、过期 token、被撤销 token、伪造签名 token。
  - PasswordHasher 的 hash/verify 双向 + 不同盐生成不同 hash。
  - TokenIssuer 的签发 + 解析 round-trip。

#### 3.2 JWT 实现

- 新增包 `services/user-service/internal/auth/jwt`(或类似)实现 `TokenIssuer`,使用 `github.com/golang-jwt/jwt/v5`(HS256,从 env `RIN_USER_JWT_SECRET` 读 secret,长度 < 32 字节时 `main.go` 启动时 fail-fast)。
- Access token 默认 TTL 15 分钟,refresh 默认 30 天,可由 env `RIN_USER_ACCESS_TTL`、`RIN_USER_REFRESH_TTL`(time.Duration 字符串)覆盖。
- Claims 至少包含:`sub`(userID)、`iat`、`exp`、`typ`(`access` 或 `refresh`)、`sid`(session ID)、`role`(默认 `student`)。
- 单元测试不依赖时间真值:在测试里注入 `clock func() time.Time`。

#### 3.3 PostgreSQL 仓储 + 迁移

- 在 `services/user-service/internal/postgres/` 实现 `UserRepository`,使用 `github.com/jackc/pgx/v5/pgxpool`,镜像 submission-service 的代码风格(`Open(ctx, dsn)`、`New(pool)`、`Close()`)。
- 在 `services/user-service/migrations/` 用 `embed.FS` 模式提供:
  - `001_create_users.sql`:`users` 表(`user_id` text PK、`email` text unique、`username` text unique、`locale` text、`email_verified` bool、`created_at`、`updated_at`)、`auth_credentials` 表(`user_id` FK、`password_hash` text、`hash_algo` text、`updated_at`)、`auth_sessions` 表(`session_id` text PK、`user_id` FK、`refresh_token_hash` text not null、`access_jti` text、`issued_at`、`refresh_expires_at`、`revoked_at` nullable、合理索引)。
  - migration 应用器仿照 `services/submission-service/migrations/apply.go`(`Apply(ctx, executor)` + `embed.FS`)。
- 新增集成测试 `repository_test.go`:沿用 submission-service 的做法,通过 `RIN_TEST_POSTGRES_DSN` env 触发,未设置时 `t.Skip`。常规单元测试不要求真 DB。

#### 3.4 grpcserver 适配层

- 新增 `services/user-service/internal/grpcserver/server.go`,实现 `userv1.UnimplementedUserServiceServer` 的全部 5 个 RPC。把 proto 请求 → domain input → 调 AuthService/PermissionService → 转回 proto response。
- domain 错误映射成合适的 gRPC status code(`InvalidArgument`、`Unauthenticated`、`PermissionDenied`、`AlreadyExists`、`Unimplemented`)。`GetProfile` 当前没有 profile 仓储,可以返回从 `users` 表读到的最小 `UserProfile`(空头像、空 bio,rating 和 accepted_count 暂为 0)。
- 不要泄漏内部错误文本 —— 用统一的 `domain` sentinel error → status code 映射。

#### 3.5 main.go 装配

- 写 `services/user-service/main.go`:
  - 监听地址 env `RIN_USER_GRPC_ADDR`,默认 `:50051`。
  - JWT secret 从 `RIN_USER_JWT_SECRET` 读;长度不足直接 `log.Fatal`。
  - 仓储:`RIN_USER_POSTGRES_DSN` 提供时走 PostgreSQL,`RIN_USER_AUTO_MIGRATE=true` 时启动期跑迁移;否则走内存仓储(用于本地 dev / `gateway` 单跑场景)。这一切都模仿 submission-service main.go 的 if-else 结构。
  - `grpc.NewServer()` 注册 `UserService` 后阻塞 Serve。

#### 3.6 gateway 接线

- 在 `services/gateway/internal/userclient/grpc.go`(类似 `internal/problemclient/grpc.go`)新建 user gRPC client wrapper 和 interface(`Register`、`Login`、`Refresh`、`CheckPermission`)。
- `services/gateway/internal/httpserver/server.go` 加 `UserClient` 字段,新增 `registerAuthRoutes` 注册 3 个端点:
  - `POST /v1/auth/register` → 201 + `AuthSession` JSON。
  - `POST /v1/auth/login` → 200 + `AuthSession` JSON,失败 401。
  - `POST /v1/auth/refresh` → 200 + `AuthSession` JSON,失败 401。
- JSON 字段命名遵循 OpenAPI(camelCase),不是 proto 的 snake_case。失败映射:`InvalidArgument` → 400 `validation_error`、`Unauthenticated` → 401 `invalid_credentials`、`AlreadyExists` → 409 `email_taken`,响应体形如 `{ "error": { "code": "invalid_credentials", "message": "..." } }`。
- 新增 `auth_routes_test.go` 用一个 fake `UserClient` 跑端到端 HTTP 测试。
- 更新 `services/gateway/main.go` 通过 env `RIN_USER_GRPC_ADDR` dial user-service,只有 dial 成功才启用 auth 路由。

---

### 4. 依赖管理

允许新增以下依赖(在对应 module 的 `go.mod` 里):

```
github.com/golang-jwt/jwt/v5
github.com/jackc/pgx/v5
golang.org/x/crypto              // for argon2
```

不要引入 ORM(没有 GORM、没有 ent)。手写 SQL,沿用 pgx。

跑 `go mod tidy` 后检查 `go.mod` 顶部 `go` directive,若被改成 `1.24` 之类务必还原为 `go 1.23.0`(README Toolchain Note 已说明)。

---

### 5. 验收标准 / 自检命令

依次跑通,全部通过才算完成:

```powershell
# user-service module
cd D:\rinOJ\services\user-service
go vet ./...
go test ./...
go test -bench=. -benchtime=1x ./...

# gateway module(确保 auth 路由编译通过 + 测试通过)
cd D:\rinOJ\services\gateway
go vet ./...
go test ./...

# 整体冒烟(可选,需要 Postgres + Redis):
docker compose -f D:\rinOJ\deploy\docker-compose.yml up -d redis postgres
$env:RIN_USER_POSTGRES_DSN = "postgres://rin:rin_dev@localhost:5432/rin?sslmode=disable"
$env:RIN_USER_AUTO_MIGRATE = "true"
$env:RIN_USER_JWT_SECRET   = "dev-secret-32-bytes-minimum-aaaaa"
go run D:\rinOJ\services\user-service
# 另开终端:
$env:RIN_USER_GRPC_ADDR = "127.0.0.1:50051"
go run D:\rinOJ\services\gateway
curl.exe -X POST http://localhost:8080/v1/auth/register `
  -H "Content-Type: application/json" `
  -d "{`"email`":`"rin@example.com`",`"username`":`"rin`",`"password`":`"correct horse battery staple`",`"locale`":`"zh-CN`"}"
# 期望 201 + accessToken / refreshToken JSON
```

最后,`README.md`(user-service 的)更新一段:列出新 env vars、本地 curl 示例(注册→登录→refresh 三步)、PostgreSQL DSN 示例。

---

### 6. 工作风格要求

- **TDD**:每个新文件先写测试,后写实现。提交前所有测试都要绿。
- **小步提交**:逻辑分步骤的 git commit,顺序大致是 (1) domain 重构 (2) JWT (3) PasswordHasher (4) Postgres 仓储 + 迁移 (5) grpcserver (6) main.go (7) gateway 接线 (8) README/迁移命令。每条 commit 信息一行总结 + 一段说明(中文或英文皆可,与仓库风格一致)。
- **代码注释**:对外暴露的 type/method 写中性英文 godoc(参考 `services/submission-service/internal/postgres/repository.go` 风格,不要写废话注释)。
- **错误处理**:外部输入不可信,统一在 domain 入口校验;sentinel error 集中在 `internal/domain/errors.go`(若不存在则新建)。
- 不要 panic 在生产路径(测试里用 `t.Fatal` 是 OK 的)。
- 任何新增 secret/默认值都要让 fail-fast(env 缺失时启动期 `log.Fatal`,而不是运行时 nil panic)。
- 完成后简要在响应里报告:改了哪些文件、跑了哪些命令、哪些测试加了、剩余明确 TODO(比如 Casbin policy DSL、邮箱验证邮件)。

---

完成上面所有 7 个步骤即视为本次任务完成。如果中途发现 proto 契约或 OpenAPI 字段实际无法实现,**停下来在响应里指出**,不要私自改契约。

## Prompt 结尾
