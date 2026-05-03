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
        <section className="rounded-lg border border-slate-200 bg-white shadow-sm">
          <div className="grid gap-4 border-b border-slate-200 px-4 py-4 lg:grid-cols-[1fr_auto] lg:items-center">
            <div>
              <div className="flex items-center gap-2 text-sm font-semibold text-slate-500">
                <Trophy className="h-4 w-4" />
                {t("contest.overview")}
              </div>
              <h1 className="mt-1 text-2xl font-black text-slate-950">{locale === "zh-CN" ? contest.titleZh : contest.title}</h1>
            </div>
            <div className="grid gap-2 text-sm sm:grid-cols-3">
              <SummaryItem icon={<Trophy className="h-4 w-4" />} label={t("contests.mode")} value={contest.mode} />
              <SummaryItem icon={<CalendarClock className="h-4 w-4" />} label={t("contests.time")} value={locale === "zh-CN" ? contest.timeZh : contest.time} />
              <SummaryItem icon={<UsersRound className="h-4 w-4" />} label={t("contests.registered")} value={contest.registered} />
            </div>
          </div>
        </section>

        <section className="grid gap-5 lg:grid-cols-[minmax(0,1.05fr)_minmax(360px,0.95fr)]">
          <div className="rounded-lg border border-slate-200 bg-white shadow-sm">
            <div className="flex items-center gap-2 border-b border-slate-200 px-4 py-3 text-sm font-semibold text-slate-500">
              <ListChecks className="h-4 w-4" />
              {t("contest.problemList")}
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[640px] border-collapse text-left text-sm">
                <thead className="bg-slate-50 text-xs font-bold text-slate-500">
                  <tr>
                    <th className="px-4 py-3">{t("contest.alias")}</th>
                    <th className="px-4 py-3">{t("table.title")}</th>
                    <th className="px-4 py-3">{t("table.difficulty")}</th>
                    <th className="px-4 py-3">{t("contest.points")}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {entries.map((entry) => (
                    <tr key={`${entry.contestId}-${entry.problemId}`} className="hover:bg-sky-50/70">
                      <td className="px-4 py-3 font-black text-sky-700">{entry.alias}</td>
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

          <div className="rounded-lg border border-slate-200 bg-white shadow-sm">
            <div className="flex items-center gap-2 border-b border-slate-200 px-4 py-3 text-sm font-semibold text-slate-500">
              <Trophy className="h-4 w-4" />
              {t("contest.standings")}
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[520px] border-collapse text-left text-sm">
                <thead className="bg-slate-50 text-xs font-bold text-slate-500">
                  <tr>
                    <th className="px-4 py-3">{t("ranking.rank")}</th>
                    <th className="px-4 py-3">{t("ranking.user")}</th>
                    <th className="px-4 py-3">{t("contest.solved")}</th>
                    <th className="px-4 py-3">{t("contest.penalty")}</th>
                    <th className="px-4 py-3">{t("contest.score")}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {standings.length === 0 ? (
                    <tr>
                      <td className="px-4 py-8 text-center text-sm font-medium text-slate-500" colSpan={5}>
                        {t("contest.noRows")}
                      </td>
                    </tr>
                  ) : null}
                  {standings.map((row) => (
                    <tr key={`${row.contestId}-${row.user}`} className="hover:bg-sky-50/70">
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

function SummaryItem({ icon, label, value }: Readonly<{ icon: ReactNode; label: string; value: string | number }>) {
  return (
    <div className="rounded-lg border border-slate-100 bg-slate-50 px-3 py-2">
      <div className="flex items-center gap-2 text-xs font-semibold text-slate-500">
        {icon}
        {label}
      </div>
      <div className="mt-1 font-black text-slate-950">{value}</div>
    </div>
  );
}
