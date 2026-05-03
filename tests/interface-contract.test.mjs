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

const protoFiles = [
  "packages/proto/rin/user/v1/user.proto",
  "packages/proto/rin/problem/v1/problem.proto",
  "packages/proto/rin/submission/v1/submission.proto",
  "packages/proto/rin/contest/v1/contest.proto",
  "packages/proto/rin/judge/v1/judge.proto",
  "packages/proto/rin/event/v1/event.proto",
];

for (const protoFile of protoFiles) {
  const content = readRequired(protoFile);
  assertIncludes(protoFile, content, ["syntax = \"proto3\";", "package rin."]);
}

const problemProto = readRequired("packages/proto/rin/problem/v1/problem.proto");
assertIncludes("packages/proto/rin/problem/v1/problem.proto", problemProto, [
  "service ProblemService",
  "CreateProblemDraft",
  "ValidateProblemImport",
  "TeacherQuickUpload",
  "StudentDraftSubmission",
  "ImportWizard",
  "PresignedUploadPart",
]);

const judgeProto = readRequired("packages/proto/rin/judge/v1/judge.proto");
assertIncludes("packages/proto/rin/judge/v1/judge.proto", judgeProto, [
  "service JudgeDispatcherService",
  "Submit",
  "stream JudgeResult",
  "HealthCheck",
]);

const submissionProto = readRequired("packages/proto/rin/submission/v1/submission.proto");
assertIncludes("packages/proto/rin/submission/v1/submission.proto", submissionProto, [
  "ReportJudgeResult",
  "ReportJudgeResultRequest",
  "bool final",
]);

const eventProto = readRequired("packages/proto/rin/event/v1/event.proto");
assertIncludes("packages/proto/rin/event/v1/event.proto", eventProto, [
  "submission.judged",
  "problem.import_validated",
  "webhook",
]);

const openapi = readRequired("packages/openapi/openapi.yaml");
assertIncludes("packages/openapi/openapi.yaml", openapi, [
  "openapi: 3.1.0",
  "/v1/problem-intake/imports:validate",
  "/v1/problem-intake/teacher-quick-upload",
  "/v1/problem-intake/student-drafts",
  "/v1/submissions",
  "/v1/submissions/{submissionId}",
  "/v1/submissions/{submissionId}/events",
  "SubmissionEvent",
  "JudgeLanguageId",
  "cpp23",
  "java",
  "kotlin",
  "golang",
  "nodejs20",
  "cursor",
]);

console.log("Interface contract passed.");
