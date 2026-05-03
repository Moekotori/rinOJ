import { existsSync, statSync, readFileSync } from "node:fs";
import { join } from "node:path";
import assert from "node:assert/strict";

const root = process.cwd();

const requiredFiles = [
  "package.json",
  "pnpm-workspace.yaml",
  "go.work",
  "README.md",
  ".github/pull_request_template.md",
  ".gitignore",
  "deploy/docker-compose.yml",
  "deploy/web.Dockerfile",
  "deploy/go-judge.Dockerfile",
  "deploy/.env.example",
  "deploy/LOCAL_DEPLOYMENT.md",
  "deploy/helm/README.md",
  "deploy/terraform/README.md",
];

const requiredReadmes = [
  "apps/web/README.md",
  "apps/admin/README.md",
  "apps/docs/README.md",
  "services/gateway/README.md",
  "services/user-service/README.md",
  "services/problem-service/README.md",
  "services/submission-service/README.md",
  "services/contest-service/README.md",
  "services/discuss-service/README.md",
  "services/notification-service/README.md",
  "services/rating-service/README.md",
  "services/judge-dispatcher/README.md",
  "packages/rin-ui/README.md",
  "packages/sdk-ts/README.md",
  "packages/sdk-go/README.md",
  "deploy/README.md",
];

const dispatcherProvider = readFileSync(
  join(root, "services/judge-dispatcher/internal/dispatcher/gojudge_provider.go"),
  "utf8",
);
assert.ok(dispatcherProvider.includes("GoJudgeHTTPProvider"), "judge-dispatcher should include go-judge provider");
assert.ok(dispatcherProvider.includes("/run"), "go-judge provider should call /run");

const compose = readFileSync(join(root, "deploy/docker-compose.yml"), "utf8");
assert.ok(compose.includes("deploy/go-judge.Dockerfile"), "compose should build Rin go-judge image");
assert.ok(compose.includes("profiles: [\"judge\"]"), "go-judge should be behind judge profile");

const judgeDockerfile = readFileSync(join(root, "deploy/go-judge.Dockerfile"), "utf8");
assert.ok(judgeDockerfile.includes("criyle/go-judge:v1.12.0"), "go-judge Dockerfile should pin upstream image");
assert.ok(judgeDockerfile.includes("g++"), "go-judge Dockerfile should install C++ compiler");

for (const file of requiredFiles) {
  const fullPath = join(root, file);
  assert.ok(existsSync(fullPath), `${file} should exist`);
  assert.ok(statSync(fullPath).isFile(), `${file} should be a file`);
}

for (const file of requiredReadmes) {
  const fullPath = join(root, file);
  assert.ok(existsSync(fullPath), `${file} should exist`);
  const content = readFileSync(fullPath, "utf8");
  assert.ok(content.includes("Owner"), `${file} should name its Owner`);
  assert.ok(content.includes("Boundary"), `${file} should name its Boundary`);
}

console.log("Workspace contract passed.");
