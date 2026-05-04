"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { CalendarClock, Trophy, UsersRound } from "lucide-react";
import { OJShell } from "@/components/oj-shell";
import { contests } from "@/lib/mock-oj-data";
import { useTranslation } from "@/lib/use-translation";

function statusBadge(status: string) {
  if (status === "Registering") return "bg-emerald-50 text-emerald-700 border-emerald-200";
  if (status === "Running") return "bg-sky-50 text-sky-700 border-sky-200";
  if (status === "Ended") return "bg-slate-50 text-slate-500 border-slate-200";
  return "bg-amber-50 text-amber-700 border-amber-200";
}

export default function ContestsPage() {
  const { locale, t } = useTranslation();

  return (
    <OJShell>
      <div className="mx-auto grid w-full max-w-7xl gap-5 px-4 py-5 sm:px-6 lg:px-8">
        <section className="rin-card overflow-hidden border border-slate-200/80">
          <div className="rin-card-head flex flex-wrap items-center justify-between gap-3 px-5 py-4">
            <div>
              <div className="flex items-center gap-2 text-sm font-semibold text-slate-500">
                <span className="rin-icon-tile rin-icon-tile--amber">
                  <Trophy className="h-3.5 w-3.5" />
                </span>
                {t("nav.contests")}
              </div>
              <h1 className="mt-1 text-2xl font-black text-slate-950">{t("contests.title")}</h1>
              <p className="mt-1 text-sm text-slate-500">{t("contests.subtitle")}</p>
            </div>
            <button
              className="rounded-xl bg-gradient-to-b from-slate-900 to-slate-950 px-4 py-2.5 text-sm font-bold text-white shadow-[0_4px_16px_rgba(15,10,30,0.2)] transition hover:-translate-y-0.5 hover:from-pink-600 hover:to-pink-700 hover:shadow-[0_8px_22px_rgba(219,39,119,0.28)]"
              type="button"
            >
              {t("contests.register")}
            </button>
          </div>

          <div className="grid divide-y divide-slate-100/80">
            {contests.map((contest) => (
              <article
                key={contest.id}
                className="grid gap-4 px-5 py-4 transition hover:bg-gradient-to-r hover:from-white hover:to-sky-50/40 md:grid-cols-[1fr_120px_180px_120px_auto] md:items-center"
              >
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="text-base font-black text-slate-950">{locale === "zh-CN" ? contest.titleZh : contest.title}</h2>
                    <span className={`rounded-full border px-2 py-0.5 text-xs font-black ${statusBadge(contest.status)}`}>{contest.status}</span>
                  </div>
                  <div className="mt-1.5 flex flex-wrap gap-2 text-xs font-semibold">
                    <span className="rounded bg-sky-50 px-1.5 py-0.5 text-sky-700">{contest.mode}</span>
                  </div>
                </div>
                <Metric icon={<Trophy className="h-4 w-4" />} label={t("contests.mode")} value={contest.mode} />
                <Metric icon={<CalendarClock className="h-4 w-4" />} label={t("contests.time")} value={locale === "zh-CN" ? contest.timeZh : contest.time} />
                <Metric icon={<UsersRound className="h-4 w-4" />} label={t("contests.registered")} value={`${contest.registered} 人`} />
                <Link className="inline-flex h-9 items-center justify-center rounded-xl border border-slate-200/90 bg-gradient-to-b from-white to-slate-50/95 px-4 text-[13px] font-bold text-slate-800 shadow-[inset_0_1px_0_rgba(255,255,255,1),0_2px_10px_rgba(58,45,88,0.05)] ring-1 ring-white/80 transition hover:-translate-y-px hover:border-sky-200 hover:from-sky-50 hover:to-white hover:text-sky-800" href={`/contests/${contest.id}`}>
                  {t("contests.open")}
                </Link>
              </article>
            ))}
          </div>
        </section>
      </div>
    </OJShell>
  );
}

function Metric({ icon, label, value }: Readonly<{ icon: ReactNode; label: string; value: string | number }>) {
  return (
    <div className="flex items-center gap-2.5">
      <span className="rin-icon-tile rin-icon-tile--sky h-9 w-9 rounded-xl text-sky-600 [&>svg]:h-4 [&>svg]:w-4">{icon}</span>
      <div className="min-w-0">
        <div className="text-[11px] font-bold uppercase tracking-wide text-slate-500">{label}</div>
        <div className="truncate font-bold text-slate-900">{value}</div>
      </div>
    </div>
  );
}
