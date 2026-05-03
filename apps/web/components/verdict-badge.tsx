import { CheckCircle2 } from "lucide-react";

export function VerdictBadge({ value }: Readonly<{ value: string }>) {
  const accepted = value === "Accepted";
  return (
    <span className={`inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-bold ${accepted ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-700"}`}>
      {accepted ? <CheckCircle2 className="h-3 w-3" /> : null}
      {value}
    </span>
  );
}
