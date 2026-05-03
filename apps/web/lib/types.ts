export type ProblemUploadRequest = {
  filename: string;
  contentType: string;
  sizeBytes: number;
  partCount: number;
};

export type ProblemUploadResponse = {
  objectKey: string;
  expiresAtUnix: number;
  parts: Array<{
    partNumber: number;
    uploadUrl: string;
    headers?: Record<string, string>;
  }>;
};

export type ProblemDraftResponse = {
  draftId: string;
  problemId?: string;
  ownerUserId: string;
  visibility: "private" | "review" | "public" | "contest_only" | "unspecified";
};

export type ImportWizardResponse = {
  importId: string;
  detectedTitle: string;
  detectedType: string;
  statements: Array<{
    locale: string;
    title: string;
    markdown: string;
  }>;
  samples: Array<{
    name: string;
    input: string;
    output: string;
  }>;
  validations: Array<{
    code: string;
    severity: string;
    message: string;
    path: string;
  }>;
  nextActions: string[];
};

export type SubmissionResponse = {
  submissionId: string;
  problemId: string;
  languageId: string;
  status: string;
  score: number;
};

export type AuthSessionResponse = {
  userId: string;
  accessToken: string;
  refreshToken: string;
  accessExpiresAtUnix: number;
  refreshExpiresAtUnix: number;
};

export type SubmissionEventResponse = {
  submissionId: string;
  status: string;
  testCaseIndex: number;
  message: string;
  timeMs: number;
  memoryBytes: number;
  final: boolean;
};
