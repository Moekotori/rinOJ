# Rin OJ — 简化题目上传开发 Prompt

将此文件作为上下文提供给 AI 编程助手（Cursor / Claude Code），用于实现方案 A（在线表单）和方案 B（极简 ZIP）两种简化上传路径。

---

## 背景

当前 Problem Intake 只支持一种上传方式：上传一个有严格目录结构的 ZIP（需要 `problem.json` + `statements/` + `samples/` + `tests/`），对于简单题目太繁琐。

需要新增两种更简单的上传路径，与现有 ZIP 路径**并存，互不干扰**：

- **方案 B（极简 ZIP）**：ZIP 里只放 `statement.md` 和 `1.in / 1.out`，标题/时限/内存在页面表单填，不需要 `problem.json`
- **方案 A（在线表单）**：完全不需要 ZIP，在网页上直接填写题面、样例、上传测试数据文件

---

## 总体约束

- **不要动现有的"完整 ZIP"路径**，三种方式共存
- **接口优先**：所有新 HTTP 接口先改 `packages/openapi/openapi.yaml`，所有新 gRPC 消息先改 `packages/proto/`，再写实现
- **Go 模块版本保持 `1.23.0`**，`go mod tidy` 后如有变动需还原
- **新测试**写在与实现相邻的 `_test.go` 文件里
- **不要引入新的第三方依赖**，除非确实必要

---

## 方案 B：极简 ZIP

### 目标格式

```
problem.zip
├─ statement.md        ← 必须，题面 Markdown（单语言）
├─ 1.in
├─ 1.out
├─ 2.in
├─ 2.out
└─ ...（更多测试点，直接放根目录）
```

- 文件名规则：`<任意名>.in` 和 `<同名>.out`，按文件名排序即为测试点顺序
- 不需要 `problem.json`、不需要 `samples/` 目录、不需要 `statements/` 目录
- 标题、时限、内存、judgeType 通过 HTTP 表单字段传入（不写在 ZIP 里）
- 如果 ZIP 根目录同时存在 `problem.json` → 当作现有完整格式处理，忽略方案 B 逻辑

### 检测逻辑（zip.go）

在 `ParseProblemPackageZIP` 开始时自动检测格式：

```go
// 伪代码
func detectZIPFormat(archive *zip.Reader) zipFormat {
    for _, f := range archive.File {
        if path.Base(f.Name) == "problem.json" {
            return zipFormatStructured  // 现有完整格式
        }
    }
    return zipFormatFlat  // 方案 B 极简格式
}
```

### 新增函数（zip.go）

```go
// ParseFlatProblemPackageZIP 解析方案 B 极简 ZIP。
// metadata 由调用方从 HTTP 表单传入，不从 ZIP 内读取。
func ParseFlatProblemPackageZIP(
    sourceFilename string,
    reader io.ReaderAt,
    size int64,
    metadata FlatZIPMetadata,
) (ProblemPackage, error)

type FlatZIPMetadata struct {
    Title       string      // 必填，来自表单
    TimeLimit   int         // ms，默认 1000
    MemoryLimit int         // MB，默认 256
    JudgeType   ProblemType // 默认 traditional
}
```

解析规则：
- 根目录的 `statement.md` → `pkg.Statements["zh-CN"]`（单语言，locale 固定 zh-CN，后续可扩展）
- 根目录的 `*.in` / `*.out` 配对 → `pkg.TestFiles`
- `pkg.ProblemJSON` 由 `metadata` 填充，`Title` / `TimeLimit` / `MemoryLimit` / `Type` 对应字段
- 遇到子目录直接跳过（`strings.Contains(name, "/")` 则跳过）
- 路径安全检查沿用现有 `safeZipPath`

### HTTP 接口改动（openapi.yaml）

在 `ValidateImportRequest`（`/v1/problem-intake/imports:validate` 的请求体）增加可选字段：

```yaml
FlatZIPMetadata:
  type: object
  properties:
    title:
      type: string
    timeLimit:
      type: integer
      description: ms, default 1000
    memoryLimit:
      type: integer
      description: MB, default 256
    judgeType:
      type: string
      enum: [traditional, special_judge, interactive]
      default: traditional
```

`ValidateImportRequest` 增加：
```yaml
flatMetadata:
  $ref: '#/components/schemas/FlatZIPMetadata'
  description: 仅方案 B 极简 ZIP 时使用，完整 ZIP 忽略此字段
```

### Gateway 改动

`/v1/problem-intake/imports:validate` handler 从请求体读出 `flatMetadata`，传给 `problem-service` gRPC 调用。

对应的 Protobuf `ValidateImportRequest` 消息增加：
```protobuf
message FlatZIPMetadata {
  string title        = 1;
  int32  time_limit   = 2;  // ms
  int32  memory_limit = 3;  // MB
  string judge_type   = 4;
}

// 在 ValidateImportRequest 里加：
optional FlatZIPMetadata flat_metadata = 4;
```

### 前端改动（problem-intake-panel.tsx）

在现有上传表单里，当用户选择了文件之后，**若文件名不含 `problem.json` 迹象**（前端无法解包，只能靠提示），显示一组可折叠的"简化模式元数据"字段：

```
[标题]         ← 必填 input
[时间限制 ms]  ← number input，默认 1000
[内存限制 MB]  ← number input，默认 256
[题目类型]     ← select: 传统题 / Special Judge / 交互题
```

这些字段的值在调用 `validateProblemImport` 时作为 `flatMetadata` 传入。

UI 提示文案建议（加到 `messages/` 的 i18n 文件里）：
- `intake.flatMode` = `"极简模式：ZIP 里放 statement.md 和 *.in/*.out 即可，无需 problem.json"`
- `intake.flatTitle` = `"题目标题（必填）"`
- `intake.flatTimeLimit` = `"时间限制（ms）"`
- `intake.flatMemoryLimit` = `"内存限制（MB）"`

---

## 方案 A：在线表单

### 目标体验

用户在网页上直接填写，**完全不上传 ZIP**：
1. 填写标题、时限、内存、judgeType
2. 在 Markdown 编辑器里写题面
3. 添加若干样例（每个样例：粘贴输入文本 + 粘贴输出文本）
4. 添加测试数据：**两种方式共存**
   - 粘贴文本（小数据）：输入框直接粘 .in 内容 + .out 内容
   - 上传文件（大数据）：每个测试点上传一对 .in / .out 文件，走 MinIO 预签名上传
5. 点击"保存草稿" → 创建 ProblemDraft

### 新增 HTTP 接口（openapi.yaml）

```
POST /v1/problem-intake/inline-draft
```

**请求体 `InlineDraftRequest`**：

```yaml
InlineDraftRequest:
  type: object
  required: [title, statement]
  properties:
    title:
      type: string
    timeLimit:
      type: integer
      default: 1000
    memoryLimit:
      type: integer
      default: 256
    judgeType:
      type: string
      enum: [traditional, special_judge, interactive]
      default: traditional
    locale:
      type: string
      enum: [zh-CN, en-US, ja-JP]
      default: zh-CN
    statement:
      type: string
      description: Markdown 题面正文
    samples:
      type: array
      items:
        $ref: '#/components/schemas/InlineSample'
    testCases:
      type: array
      items:
        $ref: '#/components/schemas/InlineTestCase'
    classId:
      type: string
    noteToReviewer:
      type: string

InlineSample:
  type: object
  required: [input, output]
  properties:
    input:
      type: string
    output:
      type: string

InlineTestCase:
  type: object
  description: inputText/outputText 和 inputObjectKey/outputObjectKey 二选一或混用
  properties:
    inputText:
      type: string
      description: 直接粘贴的输入内容（小数据）
    outputText:
      type: string
    inputObjectKey:
      type: string
      description: 已通过预签名上传到 MinIO 的 .in 文件 object key
    outputObjectKey:
      type: string
      description: 已通过预签名上传到 MinIO 的 .out 文件 object key
```

**响应**：复用现有 `ProblemDraftResponse`

### 新增 Gateway handler

`POST /v1/problem-intake/inline-draft` → 调用 problem-service gRPC `CreateInlineDraft`

### 新增 Protobuf 消息（packages/proto/problem.proto 或新文件）

```protobuf
message InlineSample {
  string input  = 1;
  string output = 2;
}

message InlineTestCase {
  string input_text       = 1;
  string output_text      = 2;
  string input_object_key  = 3;
  string output_object_key = 4;
}

message CreateInlineDraftRequest {
  string actor_id     = 1;
  string title        = 2;
  int32  time_limit   = 3;
  int32  memory_limit = 4;
  string judge_type   = 5;
  string locale       = 6;
  string statement    = 7;
  repeated InlineSample   samples    = 8;
  repeated InlineTestCase test_cases = 9;
  string class_id           = 10;
  string note_to_reviewer   = 11;
}

message CreateInlineDraftResponse {
  string draft_id   = 1;
  string problem_id = 2;
  string visibility = 3;
}
```

### 新增 Service 方法（intake.go）

```go
type InlineDraftInput struct {
    ActorID        string
    Title          string
    TimeLimit      int         // ms，默认 1000
    MemoryLimit    int         // MB，默认 256
    JudgeType      ProblemType
    Locale         string      // 默认 "zh-CN"
    Statement      string      // Markdown 正文，不能为空
    Samples        []SampleCase
    TestCases      []InlineTestCase
    ClassID        string
    NoteToReviewer string
}

type InlineTestCase struct {
    InputText       string  // 粘贴文本，与 InputObjectKey 二选一
    OutputText      string
    InputObjectKey  string  // MinIO object key，与 InputText 二选一
    OutputObjectKey string
}

func (s *Service) CreateInlineDraft(input InlineDraftInput) (ProblemDraft, error)
```

校验规则：
- `Title` 不能为空
- `Statement` 不能为空
- 每个 `InlineTestCase`：`InputText` 和 `InputObjectKey` 至少有一个不为空，Output 同理
- `TimeLimit` < 1 → 设为 1000；`MemoryLimit` < 1 → 设为 256
- `Locale` 为空 → 设为 `"zh-CN"`

实现逻辑：
1. 校验字段
2. 将 `Statement` 存入 `ProblemPackage.Statements[locale]`
3. 将 `Samples` 直接映射到 `ProblemPackage.Samples`
4. 将 `TestCases` 中 `InputText` 不为空的条目，写成临时 object（通过 `objectstore.PutText`）存入 MinIO，得到 object key 后放入 `TestFiles`；`InputObjectKey` 不为空的直接放入 `TestFiles`
5. 运行 `ValidateProblemImport(pkg)` 得到 `ImportWizard`
6. 保存 `ProblemDraft`，返回

### 前端新增（apps/web）

新建组件 `InlineIntakeForm`（或在 `ProblemIntakePanel` 里加 tab），包含：

**Tab 切换**（在现有 ZIP 上传入口旁边）：
```
[📎 ZIP 上传]  [✏️ 在线填写]
```

**在线填写 tab 内容**：

```
标题 *          [___________________________]
时间限制 (ms)   [1000]   内存限制 (MB)  [256]
题目类型        [传统题 ▾]   语言        [zh-CN ▾]

题面（Markdown）
┌─────────────────────────────────────────┐
│  <textarea / CodeMirror lite>           │
└─────────────────────────────────────────┘

样例
  [+ 添加样例]
  ┌ 样例 1 ──────────────────────────────────┐
  │ 输入  [___]   输出  [___]                 │
  │                                [× 删除]   │
  └──────────────────────────────────────────┘

测试数据
  [+ 添加测试点]
  ┌ 测试点 1 ────────────────────────────────┐
  │ ○ 粘贴文本                               │
  │   输入 [___]   输出 [___]                │
  │ ○ 上传文件                               │
  │   [选择 .in 文件]  [选择 .out 文件]      │
  └──────────────────────────────────────────┘

[保存草稿]  [提交审核]
```

文件上传测试点的流程：
1. 用户选择 .in / .out 文件
2. 前端调用现有 `createProblemIntakeUpload` 为每个文件分别获取预签名 URL
3. PUT 上传
4. 将 objectKey 存入 component state
5. 提交时把 objectKey 填入 `testCases[i].inputObjectKey` / `outputObjectKey`

状态管理用 `useState`，不需要引入新状态库。

i18n 新增 key（`messages/zh-CN.json` 等）：
```json
"intake.tabZip": "ZIP 上传",
"intake.tabForm": "在线填写",
"intake.formTitle": "题目标题",
"intake.formTimeLimit": "时间限制 (ms)",
"intake.formMemoryLimit": "内存限制 (MB)",
"intake.formJudgeType": "题目类型",
"intake.formStatement": "题面（Markdown）",
"intake.formSamples": "样例",
"intake.formAddSample": "+ 添加样例",
"intake.formTestCases": "测试数据",
"intake.formAddTestCase": "+ 添加测试点",
"intake.formPasteText": "粘贴文本",
"intake.formUploadFile": "上传文件",
"intake.formSaveDraft": "保存草稿",
"intake.formSubmitReview": "提交审核"
```

---

## 实现顺序（建议）

1. **packages/proto/** — 加 `FlatZIPMetadata`、`CreateInlineDraftRequest/Response`
2. **packages/openapi/openapi.yaml** — 加 `flatMetadata` 字段、`InlineDraftRequest`、`POST /v1/problem-intake/inline-draft`
3. **services/problem-service/internal/intake/zip.go** — 加 `detectZIPFormat`、`ParseFlatProblemPackageZIP`，写单元测试
4. **services/problem-service/internal/intake/intake.go** — 加 `InlineDraftInput`、`CreateInlineDraft`，写单元测试
5. **services/problem-service/internal/grpcserver/server.go** — 实现新 gRPC handler
6. **services/gateway** — 加两个 HTTP handler（validate 透传 flatMetadata、新增 inline-draft）
7. **apps/web/lib/gateway.ts** — 加 `createInlineDraft` 函数，补 types
8. **apps/web/components/InlineIntakeForm.tsx** — 实现在线填写组件
9. **apps/web/components/problem-intake-panel.tsx** — 加 tab 切换，引入 `InlineIntakeForm`
10. **apps/web/messages/** — 补全所有新 i18n key

---

## 验收标准

### 方案 B
- [ ] 上传只含 `statement.md` + `1.in` + `1.out` 的 ZIP，填写表单元数据，能成功创建草稿
- [ ] 上传含 `problem.json` 的完整 ZIP，行为与改动前完全一致（回归）
- [ ] `ParseFlatProblemPackageZIP` 有单元测试，覆盖：正常解析、无 statement.md 报错、有子目录时子目录内文件被跳过

### 方案 A
- [ ] 在网页上填写题面 + 粘贴样例 + 粘贴测试数据，能创建草稿
- [ ] 测试数据选择"上传文件"模式，上传 .in/.out 文件对，能创建草稿
- [ ] 混用（部分粘贴 + 部分上传文件）能正常工作
- [ ] `CreateInlineDraft` 有单元测试，覆盖：必填项缺失报错、默认值填充、文本测试点和对象存储测试点
- [ ] 现有完整 ZIP 上传路径回归测试通过（`npm test`）

---

## 关键文件路径速查

| 文件 | 说明 |
|---|---|
| `services/problem-service/internal/intake/zip.go` | ZIP 解析，加 flat 格式支持 |
| `services/problem-service/internal/intake/intake.go` | 业务逻辑，加 `CreateInlineDraft` |
| `services/problem-service/internal/grpcserver/server.go` | gRPC handler |
| `services/gateway/` | HTTP handler，透传 flatMetadata，加 inline-draft 路由 |
| `packages/openapi/openapi.yaml` | HTTP 合约，先改这里 |
| `packages/proto/` | gRPC 合约，先改这里 |
| `apps/web/lib/gateway.ts` | 前端 API 调用封装 |
| `apps/web/lib/types.ts` | 前端类型定义 |
| `apps/web/components/problem-intake-panel.tsx` | 现有 Intake UI，加 tab |
| `apps/web/messages/zh-CN.json` | 中文 i18n |
