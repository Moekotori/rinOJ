"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { CalendarClock, Trophy, UsersRound } from "lucide-react";
import { OJShell } from "@/components/oj-shell";
import { contests } from "@/lib/mock-oj-data";
import { useTranslation } from "@/lib/use-translation";

export default function ContestsPage() {
  const { locale, t } = useTranslation();

  return (
    <OJShell>
      <div className="mx-auto grid w-full max-w-7xl gap-5 px-4 py-5 sm:px-6 lg:px-8">
        <section className="rounded-lg border border-slate-200 bg-white shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 px-4 py-4">
            <div>
              <div className="flex items-center gap-2 text-sm font-semibold text-slate-500">
                <Trophy className="h-4 w-4" />
                {t("nav.contests")}
              </div>
              <h1 className="mt-1 text-2xl font-black text-slate-950">{t("contests.title")}</h1>
              <p className="mt-1 text-sm text-slate-600">{t("contests.subtitle")}</p>
            </div>
            <button className="rounded-lg bg-slate-950 px-4 py-2 text-sm font-bold text-white" type="button">
              {t("contests.register")}
            </button>
          </div>

          <div className="grid divide-y divide-slate-100">
            {contests.map((contest) => (
              <article key={contest.title} className="grid gap-3 px-4 py-4 md:grid-cols-[1fr_120px_160px_120px_auto] md:items-center">
                <div>
                  <h2 className="text-lg font-black text-slate-950">{locale === "zh-CN" ? contest.titleZh : contest.title}</h2>
                  <div className="mt-2 flex flex-wrap gap-2 text-xs font-semibold text-slate-500">
                    <span className="rounded-md bg-sky-50 px-2 py-1 text-sky-700">{contest.mode}</span>
                    <span className="rounded-md bg-pink-50 px-2 py-1 text-pink-700">{contest.status}</span>
                  </div>
                </div>
                <Metric icon={<Trophy className="h-4 w-4" />} label={t("contests.mode")} value={contest.mode} />
                <Metric icon={<CalendarClock className="h-4 w-4" />} label={t("contests.time")} value={locale === "zh-CN" ? contest.timeZh : contest.time} />
                <Metric icon={<UsersRound className="h-4 w-4" />} label={t("contests.registered")} value={contest.registered} />
                <Link className="inline-flex h-10 items-center justify-center rounded-lg border border-slate-200 px-4 text-sm font-bold text-slate-800 hover:border-sky-200 hover:bg-sky-50" href={`/contests/${contest.id}`}>
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
    <div className="flex items-center gap-2">
      <span className="text-slate-400">{icon}</span>
      <div>
        <div className="text-xs font-semibold text-slate-500">{label}</div>
        <div className="font-bold text-slate-900">{value}</div>
      </div>
    </div>
  );
}
