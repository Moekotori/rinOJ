import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import assert from "node:assert/strict";

const root = process.cwd();

function readRequired(path) {
  const fullPath = join(root, path);
  assert.ok(existsSync(fullPath), `${path} should exist`);
  return readFileSync(fullPath, "utf8");
}

function assertIncludes(file, content, required) {
  for (const token of required) {
    assert.ok(
      content.includes(token),
      `${file} should include required token: ${token}`,
    );
  }
}

const architecture = readRequired("docs/ARCHITECTURE.md");
assertIncludes("docs/ARCHITECTURE.md", architecture, [
  "C4Context",
  "C4Container",
  "Problem Intake",
  "Teacher Quick Upload",
  "Student Draft Submission",
  "ImportWizard",
  "cursor pagination",
  "JudgeProvider",
]);

const judgeAdr = readRequired("docs/adr/0001-judge-backend.md");
assertIncludes("docs/adr/0001-judge-backend.md", judgeAdr, [
  "criyle/go-judge",
  "judge0/judge0",
  "syzoj/judge-v3",
  "JudgeProvider",
  "MIT",
  "GPL-3.0",
]);

const eventAdr = readRequired("docs/adr/0002-event-bus.md");
assertIncludes("docs/adr/0002-event-bus.md", eventAdr, [
  "Redis Streams",
  "NATS",
  "submission.judged",
  "webhook",
  "HMAC",
]);

const themeAdr = readRequired("docs/adr/0003-rin-ui-theme.md");
assertIncludes("docs/adr/0003-rin-ui-theme.md", themeAdr, [
  "rin-ui",
  "TailwindCSS 4",
  "shadcn/ui",
  "design tokens",
  "prefers-reduced-motion",
]);

const sprint = readRequired("docs/SPRINT-01.md");
assertIncludes("docs/SPRINT-01.md", sprint, [
  "Day 1",
  "Day 7",
  "Teacher Quick Upload",
  "Student Draft Submission",
]);

const deployGuide = readRequired("deploy/LOCAL_DEPLOYMENT.md");
assertIncludes("deploy/LOCAL_DEPLOYMENT.md", deployGuide, [
  "Requirements",
  "docker compose",
  "NEXT_PUBLIC_RIN_MOCK_SUBMISSIONS",
  "rin-oj/go-judge:dev",
  "--profile judge",
  "--profile web",
  "go-judge",
]);

const deployReadme = readRequired("deploy/README.md");
assertIncludes("deploy/README.md", deployReadme, [
  "LOCAL_DEPLOYMENT.md",
  "deploy\\.env.example",
  "--profile web",
]);

const rootReadme = readRequired("README.md");
assertIncludes("README.md", rootReadme, [
  "Friendly Local Deployment",
  "deploy/LOCAL_DEPLOYMENT.md",
  "--profile web",
]);

console.log("Documentation contract passed.");
