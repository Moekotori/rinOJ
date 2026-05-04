import { AlertTriangle, Ban, Bug, CheckCircle2, Clock3, ServerCrash, Terminal, XCircle, type LucideIcon } from "lucide-react";

const VERDICT_LABEL: Record<string, string> = {
  accepted: "AC",
  ac: "AC",
  wrong_answer: "WA",
  time_limit_exceeded: "TLE",
  memory_limit_exceeded: "MLE",
  runtime_error: "RE",
  compile_error: "CE",
  system_error: "SE",
  queued: "Queued",
  running: "Running",
  pending: "Pending",
  judging: "Judging",
};

function displayVerdict(value: string) {
  const key = value.trim().toLowerCase();
  if (VERDICT_LABEL[key]) {
    return VERDICT_LABEL[key];
  }
  if (key.includes("_")) {
    return key
      .split("_")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ");
  }
  return value;
}

function verdictIcon(normalized: string): LucideIcon {
  if (normalized === "accepted" || normalized === "ac") {
    return CheckCircle2;
  }
  if (normalized.includes("queued") || normalized.includes("running") || normalized.includes("pending")) {
    return Clock3;
  }
  if (normalized.includes("compile")) {
    return Terminal;
  }
  if (normalized.includes("system")) {
    return ServerCrash;
  }
  if (normalized.includes("wrong")) {
    return Ban;
  }
  if (normalized.includes("runtime")) {
    return Bug;
  }
  if (normalized.includes("time") || normalized.includes("memory")) {
    return AlertTriangle;
  }
  return XCircle;
}

export function VerdictBadge({ value }: Readonly<{ value: string }>) {
  const normalized = value.toLowerCase();
  const accepted = normalized === "accepted" || normalized === "ac";
  const pending = normalized.includes("queued") || normalized.includes("running") || normalized.includes("pending");
  const warning = normalized.includes("time") || normalized.includes("memory");
  const Icon = verdictIcon(normalized);
  const tone = accepted
    ? "border-emerald-100 bg-emerald-50 text-emerald-800"
    : pending
      ? "border-sky-200 bg-sky-50 text-sky-800"
      : warning
        ? "border-amber-200 bg-amber-50 text-amber-900"
        : "border-rose-200 bg-rose-50 text-rose-800";
  const label = displayVerdict(value);

  return (
    <span
      className={`inline-flex items-center gap-1 rounded border px-2 py-1 text-xs font-bold ${tone}`}
      title={value}
    >
      <Icon className="h-3 w-3 shrink-0" aria-hidden />
      {label}
    </span>
  );
}
