import type { AuthSessionResponse, FlatZIPMetadata, ImportWizardResponse, InlineDraftRequest, ProblemDraftResponse, ProblemUploadRequest, ProblemUploadResponse, SubmissionListResponse, SubmissionResponse, UpdateUserRoleResponse, UserProfileResponse } from "./types";

const gatewayBaseURL = process.env.NEXT_PUBLIC_RIN_GATEWAY_URL ?? "http://127.0.0.1:8080";
const mockSubmissionsEnabled = process.env.NEXT_PUBLIC_RIN_MOCK_SUBMISSIONS === "true";

type RequestOptions = {
  actorId: string;
};

async function requestJSON<TResponse, TBody>(path: string, body: TBody, options: RequestOptions): Promise<TResponse> {
  const response = await fetch(`${gatewayBaseURL}${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Rin-Actor-ID": options.actorId,
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    throw new Error(await readGatewayError(response));
  }

  return (await response.json()) as TResponse;
}

async function getJSON<TResponse>(path: string): Promise<TResponse> {
  const response = await fetch(`${gatewayBaseURL}${path}`, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
    },
  });

  if (!response.ok) {
    throw new Error(await readGatewayError(response));
  }

  return (await response.json()) as TResponse;
}

async function readGatewayError(response: Response) {
  const text = await response.text();
  let message = text || `Gateway request failed with ${response.status}`;
  try {
    const payload = JSON.parse(text) as { message?: string };
    message = payload.message || message;
  } catch {
    // Some upstream failures are plain text. Keep the original response body.
  }
  return humanizeGatewayError(message, response.status);
}

function humanizeGatewayError(message: string, status: number) {
  const normalized = message.toLowerCase();
  if (normalized.includes("email is already registered")) {
    return "这个邮箱已经注册过啦，请换一个邮箱，或者直接去登录。";
  }
  if (normalized.includes("username is already registered")) {
    return "这个用户名已经被占用啦，试试加上数字或下划线。";
  }
  if (normalized.includes("email is invalid")) {
    return "邮箱格式不太对，请检查一下有没有少写 @ 或域名。";
  }
  if (normalized.includes("password must be at least 12 characters")) {
    return "密码至少需要 12 个字符，这样账号会安全很多。";
  }
  if (normalized.includes("username must be at least 3 characters")) {
    return "用户名至少需要 3 个字符。";
  }
  if (normalized.includes("email/username or password is incorrect")) {
    return "账号或密码不正确，请检查后再试。";
  }
  if (status >= 500) {
    return "服务暂时有点忙，请稍后再试。";
  }
  return message;
}

export function createProblemIntakeUpload(body: ProblemUploadRequest, options: RequestOptions) {
  return requestJSON<ProblemUploadResponse, ProblemUploadRequest>("/v1/problem-intake/uploads", body, options);
}

export function registerUser(body: { email: string; username: string; password: string; locale: string }) {
  return requestJSON<AuthSessionResponse, typeof body>("/v1/auth/register", body, { actorId: "anonymous" });
}

export function loginUser(body: { login: string; password: string; totpCode?: string }) {
  return requestJSON<AuthSessionResponse, typeof body>("/v1/auth/login", body, { actorId: "anonymous" });
}

export function getUserProfile(userId: string) {
  return getJSON<UserProfileResponse>(`/v1/users/${encodeURIComponent(userId)}`);
}

export function validateProblemImport(body: { uploadObjectKey: string; sourceFilename: string; flatMetadata?: FlatZIPMetadata }, options: RequestOptions) {
  return requestJSON<ImportWizardResponse, typeof body>("/v1/problem-intake/imports:validate", body, options);
}

export function createInlineDraft(body: InlineDraftRequest, options: RequestOptions) {
  return requestJSON<ProblemDraftResponse, InlineDraftRequest>("/v1/problem-intake/inline-draft", body, options);
}

export function teacherQuickUpload(body: { classId: string; uploadObjectKey: string; requestAdminReview: boolean }, options: RequestOptions) {
  return requestJSON<ProblemDraftResponse, typeof body>("/v1/problem-intake/teacher-quick-upload", body, options);
}

export function studentDraftSubmission(body: { classId: string; uploadObjectKey: string; noteToReviewer: string }, options: RequestOptions) {
  return requestJSON<ProblemDraftResponse, typeof body>("/v1/problem-intake/student-drafts", body, options);
}

export function createSubmission(
  body: { problemId: string; languageId: string; sourceCode: string; contestId?: string },
  options: RequestOptions,
) {
  return requestJSON<SubmissionResponse, typeof body>("/v1/submissions", body, options)
    .then((submission) => {
      rememberLocalSubmission({
        ...submission,
        actorId: submission.actorId ?? options.actorId,
        createdAtUnix: submission.createdAtUnix ?? Math.floor(Date.now() / 1000),
      });
      return submission;
    })
    .catch((error) => {
      if (!mockSubmissionsEnabled) {
        throw error;
      }

      // Local dev should still demonstrate the judge UX when the Go gateway is not running.
      const submission = {
        submissionId: `local_${Date.now().toString(36)}`,
        actorId: options.actorId,
        problemId: body.problemId,
        contestId: body.contestId,
        languageId: body.languageId,
        status: "queued",
        score: 0,
        createdAtUnix: Math.floor(Date.now() / 1000),
      } satisfies SubmissionResponse;
      rememberLocalSubmission(submission);
      return submission;
    });
}

export function listSubmissions(params: { actorId?: string; problemId?: string; contestId?: string; pageSize?: number } = {}) {
  const searchParams = new URLSearchParams();
  if (params.actorId) {
    searchParams.set("actorId", params.actorId);
  }
  if (params.problemId) {
    searchParams.set("problemId", params.problemId);
  }
  if (params.contestId) {
    searchParams.set("contestId", params.contestId);
  }
  if (params.pageSize) {
    searchParams.set("pageSize", String(params.pageSize));
  }
  const query = searchParams.toString();
  return getJSON<SubmissionListResponse>(`/v1/submissions${query ? `?${query}` : ""}`).then((result) => ({
    ...result,
    items: result.items.filter(isPublicSubmission),
  }));
}

function isPublicSubmission(submission: SubmissionResponse) {
  const submissionId = submission.submissionId.toLowerCase();
  const actorId = (submission.actorId ?? "").toLowerCase();
  const problemId = submission.problemId.toLowerCase();

  return (
    !submissionId.startsWith("sub_integration_") &&
    !submissionId.startsWith("demo-") &&
    !submissionId.startsWith("local_") &&
    actorId !== "usr_1" &&
    actorId !== "usr_teacher" &&
    actorId !== "usr_codex_smoke" &&
    problemId !== "prob_1"
  );
}

export function submissionEventURL(submissionId: string) {
  const url = new URL(gatewayBaseURL);
  url.protocol = url.protocol === "https:" ? "wss:" : "ws:";
  url.pathname = `/v1/submissions/${submissionId}/events`;
  url.search = "";
  return url.toString();
}

export function createSubmissionEventSocket(submissionId: string) {
  return new WebSocket(submissionEventURL(submissionId));
}

export async function updateUserRole(
  targetUserId: string,
  role: "admin" | "teacher" | "student",
  options: RequestOptions,
): Promise<UpdateUserRoleResponse> {
  const response = await fetch(
    `${gatewayBaseURL}/v1/admin/users/${encodeURIComponent(targetUserId)}/role`,
    {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        "X-Rin-Actor-ID": options.actorId,
      },
      body: JSON.stringify({ role }),
    },
  );
  if (!response.ok) {
    throw new Error(await readGatewayError(response));
  }
  return (await response.json()) as UpdateUserRoleResponse;
}

const localSubmissionHistoryKey = "rin-oj:submission-history";

export function readLocalSubmissions() {
  if (typeof window === "undefined") {
    return [] satisfies SubmissionResponse[];
  }

  try {
    const parsed = JSON.parse(window.localStorage.getItem(localSubmissionHistoryKey) ?? "[]") as SubmissionResponse[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function rememberLocalSubmission(submission: SubmissionResponse) {
  if (typeof window === "undefined") {
    return;
  }

  const current = readLocalSubmissions();
  const next = [
    {
      ...current.find((item) => item.submissionId === submission.submissionId),
      ...submission,
    },
    ...current.filter((item) => item.submissionId !== submission.submissionId),
  ].slice(0, 60);
  window.localStorage.setItem(localSubmissionHistoryKey, JSON.stringify(next));
}
