"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { notFound, useParams } from "next/navigation";
import { CalendarClock, ListChecks, Trophy, UsersRound } from "lucide-react";
import { OJShell } from "@/components/oj-shell";
import { DifficultyBadge } from "@/components/problem-table";
import { contestProblems, contests, contestStandings, problems } from "@/lib/mock-oj-data";
import { useTranslation } from "@/lib/use-translation";

export default function ContestDetailPage() {
  const params = useParams<{ contestId: string }>();
  const { locale, t } = useTranslation();
  const contest = contests.find((item) => item.id === params.contestId);

  if (!contest) {
    notFound();
  }

  const entries = contestProblems
    .filter((entry) => entry.contestId === contest.id)
    .map((entry) => ({
      ...entry,
      problem: problems.find((problem) => problem.id === entry.problemId),
    }))
    .filter((entry) => entry.problem);
  const standings = contestStandings.filter((row) => row.contestId === contest.id);

  return (
    <OJShell>
      <div className="mx-auto grid w-full max-w-7xl gap-5 px-4 py-5 sm:px-6 lg:px-8">
        <section className="rin-card overflow-hidden border border-slate-200/80">
          <div className="rin-card-head grid gap-5 px-5 py-5 lg:grid-cols-[1fr_auto] lg:items-center">
            <div>
              <div className="flex items-center gap-2 text-sm font-semibold text-slate-500">
                <span className="rin-icon-tile rin-icon-tile--amber">
                  <Trophy className="h-3.5 w-3.5" />
                </span>
                {t("contest.overview")}
              </div>
              <h1 className="mt-2 text-balance text-2xl font-black tracking-tight text-slate-950 sm:text-[1.65rem]">{locale === "zh-CN" ? contest.titleZh : contest.title}</h1>
            </div>
            <div className="grid gap-2 text-sm sm:grid-cols-3">
              <SummaryItem tone="amber" icon={<Trophy className="h-3.5 w-3.5" aria-hidden />} label={t("contests.mode")} value={contest.mode} />
              <SummaryItem tone="sky" icon={<CalendarClock className="h-3.5 w-3.5" aria-hidden />} label={t("contests.time")} value={locale === "zh-CN" ? contest.timeZh : contest.time} />
              <SummaryItem tone="violet" icon={<UsersRound className="h-3.5 w-3.5" aria-hidden />} label={t("contests.registered")} value={contest.registered} />
            </div>
          </div>
        </section>

        <section className="grid gap-5 lg:grid-cols-[minmax(0,1.05fr)_minmax(360px,0.95fr)]">
          <div className="rin-card overflow-hidden border border-slate-200/80">
            <div className="rin-card-head flex items-center gap-2 px-4 py-3.5 text-sm font-semibold text-slate-500">
              <span className="rin-icon-tile rin-icon-tile--sky">
                <ListChecks className="h-3.5 w-3.5" />
              </span>
              {t("contest.problemList")}
            </div>
            <div className="overflow-x-auto">
              <table className="rin-table w-full min-w-[640px] border-collapse text-left text-sm">
                <thead>
                  <tr className="bg-gradient-to-r from-slate-50 to-slate-50/60 text-xs font-bold uppercase tracking-wide text-slate-500">
                    <th className="px-4 py-3">{t("contest.alias")}</th>
                    <th className="px-4 py-3">{t("table.title")}</th>
                    <th className="px-4 py-3">{t("table.difficulty")}</th>
                    <th className="px-4 py-3">{t("contest.points")}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100/80">
                  {entries.map((entry) => (
                    <tr key={`${entry.contestId}-${entry.problemId}`}>
                      <td className="px-4 py-3">
                        <Link className="rin-pill-problem font-mono text-xs font-black" href={`/problems/${entry.problemId}`}>
                          {entry.alias}
                        </Link>
                      </td>
                      <td className="px-4 py-3">
                        <Link className="font-bold text-slate-950 hover:text-pink-600" href={`/problems/${entry.problemId}`}>
                          {locale === "zh-CN" ? entry.problem?.titleZh : entry.problem?.title}
                        </Link>
                      </td>
                      <td className="px-4 py-3">{entry.problem ? <DifficultyBadge value={entry.problem.difficulty} /> : null}</td>
                      <td className="px-4 py-3 font-semibold text-slate-700">{entry.points}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="rin-card overflow-hidden border border-slate-200/80">
            <div className="rin-card-head flex items-center gap-2 px-4 py-3.5 text-sm font-semibold text-slate-500">
              <span className="rin-icon-tile rin-icon-tile--amber">
                <Trophy className="h-3.5 w-3.5" />
              </span>
              {t("contest.standings")}
            </div>
            <div className="overflow-x-auto">
              <table className="rin-table w-full min-w-[520px] border-collapse text-left text-sm">
                <thead>
                  <tr className="bg-gradient-to-r from-slate-50 to-slate-50/60 text-xs font-bold uppercase tracking-wide text-slate-500">
                    <th className="px-4 py-3">{t("ranking.rank")}</th>
                    <th className="px-4 py-3">{t("ranking.user")}</th>
                    <th className="px-4 py-3">{t("contest.solved")}</th>
                    <th className="px-4 py-3">{t("contest.penalty")}</th>
                    <th className="px-4 py-3">{t("contest.score")}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100/80">
                  {standings.length === 0 ? (
                    <tr>
                      <td className="px-4 py-10 text-center text-sm font-medium text-slate-400" colSpan={5}>
                        {t("contest.noRows")}
                      </td>
                    </tr>
                  ) : null}
                  {standings.map((row) => (
                    <tr key={`${row.contestId}-${row.user}`}>
                      <td className="px-4 py-3 font-black text-slate-900">#{row.rank}</td>
                      <td className="px-4 py-3">
                        <Link className="font-bold text-slate-950 hover:text-pink-600" href={`/users/${row.user}`}>
                          {row.user}
                        </Link>
                      </td>
                      <td className="px-4 py-3 font-semibold text-emerald-700">{row.solved}</td>
                      <td className="px-4 py-3 text-slate-600">{row.penalty}</td>
                      <td className="px-4 py-3 font-bold text-pink-700">{row.score}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>
      </div>
    </OJShell>
  );
}

function SummaryItem({
  tone = "sky",
  icon,
  label,
  value,
}: Readonly<{ tone?: "sky" | "amber" | "violet"; icon: ReactNode; label: string; value: string | number }>) {
  const tile =
    tone === "amber" ? "rin-icon-tile--amber" : tone === "violet" ? "rin-icon-tile--violet" : "rin-icon-tile--sky";
  return (
    <div className="rounded-xl border border-white/90 bg-gradient-to-b from-white to-slate-50/92 px-3 py-2.5 shadow-[inset_0_1px_0_rgba(255,255,255,1),0_6px_18px_rgba(58,45,88,0.06)] ring-1 ring-slate-200/50 transition hover:ring-pink-100/80">
      <div className="flex items-center gap-2.5">
        <span className={`rin-icon-tile ${tile} h-9 w-9 rounded-xl [&>svg]:shrink-0`}>{icon}</span>
        <div className="min-w-0 flex-1">
          <div className="text-[11px] font-bold uppercase tracking-wide text-slate-500">{label}</div>
          <div className="mt-0.5 truncate font-black tabular-nums text-slate-950">{value}</div>
        </div>
      </div>
    </div>
  );
}
