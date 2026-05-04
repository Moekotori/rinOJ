import { cx } from "@rin-oj/rin-ui";

export function StatusPill({ children, tone = "neutral" }: Readonly<{ children: React.ReactNode; tone?: "neutral" | "good" | "warn" }>) {
  return (
    <span
      className={cx(
        "inline-flex h-7 items-center rounded-full border px-3 text-[11px] font-bold tracking-wide shadow-[inset_0_1px_0_rgba(255,255,255,0.65)]",
        tone === "good" && "border-emerald-200 bg-emerald-50 text-emerald-800",
        tone === "warn" && "border-amber-200 bg-amber-50 text-amber-900",
        tone === "neutral" && "border-slate-200 bg-slate-50 text-slate-600",
      )}
    >
      {children}
    </span>
  );
}
