import type { SubmissionResponse } from "@/lib/types";

function coercePositiveInt(value: unknown): number | undefined {
  if (value === undefined || value === null) {
    return undefined;
  }
  const n = typeof value === "number" ? value : Number(String(value).trim());
  if (!Number.isFinite(n) || n <= 0) {
    return undefined;
  }
  return Math.floor(n);
}

function hashToUint(input: string): number {
  let hash = 2166136261;
  for (let i = 0; i < input.length; i += 1) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

/** When gateway omits createdAtUnix, derive a stable pseudo-timestamp for sorting / display. */
export function effectiveCreatedAtUnix(submission: SubmissionResponse): number {
  const fromApi = coercePositiveInt((submission as Record<string, unknown>).createdAtUnix);
  if (fromApi !== undefined) {
    return fromApi;
  }

  const localMatch = /^local_([a-z0-9]+)$/i.exec(submission.submissionId);
  if (localMatch?.[1]) {
    const parsed = Number.parseInt(localMatch[1], 36);
    if (!Number.isNaN(parsed) && parsed > 1_000_000_000_000 && parsed < 10_000_000_000_000_000) {
      return Math.floor(parsed / 1000);
    }
  }

  const spread = hashToUint(submission.submissionId) % 86_400;
  return Math.floor(Date.now() / 1000) - spread;
}

export function formatSubmissionWhen(submission: SubmissionResponse, locale: string): string {
  const unix = effectiveCreatedAtUnix(submission);
  const date = new Date(unix * 1000);
  if (Number.isNaN(date.getTime())) {
    return "—";
  }
  return date.toLocaleString(locale === "zh-CN" ? "zh-CN" : "en-US", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function formatSubmissionIdShort(submissionId: string): string {
  if (submissionId.length <= 14) {
    return submissionId;
  }
  return `…${submissionId.slice(-10)}`;
}

export function formatTimeMs(submission: SubmissionResponse): string {
  const ms = coercePositiveInt((submission as Record<string, unknown>).timeMs ?? submission.timeMs);
  return ms !== undefined ? `${ms} ms` : "—";
}

export function formatMemoryMiB(submission: SubmissionResponse): string {
  const bytes = coercePositiveInt((submission as Record<string, unknown>).memoryBytes ?? submission.memoryBytes);
  return bytes !== undefined ? `${(bytes / 1024 / 1024).toFixed(1)} MiB` : "—";
}

export function resolveActorDisplayName(
  actorId: string | undefined,
  locale: string,
  profiles: ReadonlyArray<{ username: string; displayName: string }> = [],
): string {
  if (!actorId) {
    return "—";
  }

  const seeded = profiles.find((profile) => profile.username === actorId);
  if (seeded) {
    return seeded.displayName;
  }

  if (actorId.startsWith("usr_") && actorId.length > 12) {
    const tail = actorId.slice(-6);
    return locale === "zh-CN" ? `访客·${tail}` : `Guest·${tail}`;
  }

  return actorId;
}

export function mergeSubmissionSources(...groups: SubmissionResponse[][]): SubmissionResponse[] {
  const byId = new Map<string, SubmissionResponse>();

  for (const group of groups) {
    for (const submission of group) {
      const previous = byId.get(submission.submissionId);
      byId.set(submission.submissionId, previous ? { ...previous, ...submission } : submission);
    }
  }

  return [...byId.values()].sort((left, right) => {
    const leftTime = effectiveCreatedAtUnix(left);
    const rightTime = effectiveCreatedAtUnix(right);
    if (leftTime !== rightTime) {
      return rightTime - leftTime;
    }
    return right.submissionId.localeCompare(left.submissionId);
  });
}
