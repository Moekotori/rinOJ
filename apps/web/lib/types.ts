export type UpdateUserRoleResponse = {
  userId: string;
  role: "admin" | "teacher" | "student";
};

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
  ownerUserId?: string;
  visibility: "private" | "review" | "public" | "contest_only" | "unspecified";
};

export type FlatZIPMetadata = {
  title: string;
  timeLimit: number;
  memoryLimit: number;
  judgeType: "traditional" | "special_judge" | "interactive";
};

export type InlineDraftRequest = {
  title: string;
  timeLimit: number;
  memoryLimit: number;
  judgeType: "traditional" | "special_judge" | "interactive";
  locale: "zh-CN" | "en-US" | "ja-JP";
  statement: string;
  samples: Array<{
    input: string;
    output: string;
  }>;
  testCases: Array<{
    inputText?: string;
    outputText?: string;
    inputObjectKey?: string;
    outputObjectKey?: string;
  }>;
  classId?: string;
  noteToReviewer?: string;
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
  actorId?: string;
  problemId: string;
  contestId?: string;
  languageId: string;
  status: string;
  score: number;
  createdAtUnix?: number;
  timeMs?: number;
  memoryBytes?: number;
};

export type SubmissionListResponse = {
  items: SubmissionResponse[];
  nextCursor?: string;
};

export type AuthSessionResponse = {
  userId: string;
  /** Canonical role from user-service (e.g. student, admin). */
  role?: string;
  accessToken: string;
  refreshToken: string;
  accessExpiresAtUnix: number;
  refreshExpiresAtUnix: number;
};

export type UserProfileResponse = {
  userId: string;
  username: string;
  displayName: string;
  avatarUrl?: string;
  bannerUrl?: string;
  bio?: string;
  locale?: string;
  acceptedCount?: number;
  rating?: number;
  role?: string;
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
