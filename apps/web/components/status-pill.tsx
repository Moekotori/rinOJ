import { cx } from "@rin-oj/rin-ui";

export function StatusPill({ children, tone = "neutral" }: Readonly<{ children: React.ReactNode; tone?: "neutral" | "good" | "warn" }>) {
  return (
    <span
      className={cx(
        "inline-flex h-7 items-center rounded-full border px-3 text-xs font-semibold",
        tone === "good" && "border-emerald-300 bg-emerald-50 text-emerald-700",
        tone === "warn" && "border-amber-300 bg-amber-50 text-amber-700",
        tone === "neutral" && "border-slate-200 bg-white/70 text-slate-600",
      )}
    >
      {children}
    </span>
  );
}
