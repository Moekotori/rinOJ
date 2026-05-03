import type { AuthSessionResponse, ImportWizardResponse, ProblemDraftResponse, ProblemUploadRequest, ProblemUploadResponse, SubmissionResponse } from "./types";

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

export function validateProblemImport(body: { uploadObjectKey: string; sourceFilename: string }, options: RequestOptions) {
  return requestJSON<ImportWizardResponse, typeof body>("/v1/problem-intake/imports:validate", body, options);
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
  return requestJSON<SubmissionResponse, typeof body>("/v1/submissions", body, options).catch((error) => {
    if (!mockSubmissionsEnabled) {
      throw error;
    }

    // Local dev should still demonstrate the judge UX when the Go gateway is not running.
    return {
      submissionId: `local_${Date.now().toString(36)}`,
      problemId: body.problemId,
      languageId: body.languageId,
      status: "queued",
      score: 0,
    } satisfies SubmissionResponse;
  });
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
