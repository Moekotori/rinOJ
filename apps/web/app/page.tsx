"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Activity, BookOpen, Clock3, Shuffle, Trophy, UploadCloud, UsersRound } from "lucide-react";
import { AnimatedSurface } from "@/components/animated-surface";
import { OJShell } from "@/components/oj-shell";
import { ProblemTable } from "@/components/problem-table";
import { ProblemIntakePanel } from "@/components/problem-intake-panel";
import { SubmissionPanel } from "@/components/submission-panel";
import { VerdictBadge } from "@/components/verdict-badge";
import { WorkspaceControls } from "@/components/workspace-controls";
import { listSubmissions } from "@/lib/gateway";
import { displayLanguageName } from "@/lib/language-options";
import { contests, problems, ratingRows } from "@/lib/mock-oj-data";
import {
  formatMemoryMiB,
  formatSubmissionIdShort,
  formatSubmissionWhen,
  formatTimeMs,
  resolveActorDisplayName,
} from "@/lib/submission-display";
import type { SubmissionResponse } from "@/lib/types";
import { useTranslation } from "@/lib/use-translation";

export default function HomePage() {
  const { locale, t } = useTranslation();
  const router = useRouter();
  const [recentSubmissions, setRecentSubmissions] = useState<SubmissionResponse[]>([]);

  useEffect(() => {
    listSubmissions({ pageSize: 24 })
      .then((result) => setRecentSubmissions(result.items.slice(0, 8)))
      .catch(() => setRecentSubmissions([]));
  }, []);

  const openRandomProblem = () => {
    if (problems.length === 0) {
      return;
    }
    const randomProblem = problems[Math.floor(Math.random() * problems.length)];
    if (randomProblem) {
      router.push(`/problems/${randomProblem.id}`);
    }
  };

  return (
    <OJShell>
      <div className="mx-auto grid w-full max-w-[1600px] gap-5 px-4 py-5 sm:px-6 lg:grid-cols-[minmax(0,1fr)_380px] lg:px-8">
        <AnimatedSurface className="rin-card rin-hero-strip overflow-hidden lg:col-span-2">
          <div className="grid gap-5 p-5 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center">
            <div>
              <div className="flex items-center gap-2 text-sm font-bold text-slate-500">
                <span className="rin-icon-tile">
                  <Activity className="h-3.5 w-3.5" aria-hidden />
                </span>
                Rin Online Judge
              </div>
              <h1 className="mt-2 text-2xl font-black tracking-tight text-slate-950 sm:text-3xl">{t("home.heroTitle")}</h1>
              <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600 sm:text-base">{t("home.heroSubtitle")}</p>
            </div>
            <div className="grid grid-cols-3 gap-2 text-center sm:gap-3">
              <div className="rin-stat-chip">
                <span className="text-xl font-black text-slate-950 sm:text-2xl">{problems.length}</span>
                <span className="mt-1 text-[11px] font-bold uppercase tracking-wide text-slate-500">{locale === "zh-CN" ? "题目" : "Problems"}</span>
              </div>
              <div className="rin-stat-chip">
                <span className="text-xl font-black text-slate-950 sm:text-2xl">{recentSubmissions.length}</span>
                <span className="mt-1 text-[11px] font-bold uppercase tracking-wide text-slate-500">{locale === "zh-CN" ? "近期提交" : "Recent"}</span>
              </div>
              <div className="rin-stat-chip">
                <span className="text-xl font-black text-slate-950 sm:text-2xl">{contests.length}</span>
                <span className="mt-1 text-[11px] font-bold uppercase tracking-wide text-slate-500">{locale === "zh-CN" ? "比赛" : "Contests"}</span>
              </div>
            </div>
          </div>
        </AnimatedSurface>

        <AnimatedSurface delay={0.02} className="rin-card overflow-hidden border border-slate-200/80">
          <div className="rin-card-head flex flex-wrap items-center justify-between gap-3 px-5 py-4">
            <div>
              <div className="flex items-center gap-2 text-sm font-semibold text-slate-500">
                <span className="rin-icon-tile">
                  <BookOpen className="h-3.5 w-3.5" />
                </span>
                {t("problems.problemSet")}
              </div>
              <h2 className="mt-1 text-xl font-black text-slate-950">{t("home.practiceProblems")}</h2>
            </div>
            <div className="flex flex-wrap gap-2">
              <Link className="rin-soft-button px-3.5 py-2 text-[13px]" href="/problems">
                {t("home.tags")}
              </Link>
              <button className="inline-flex items-center gap-2 rounded-md bg-blue-700 px-3.5 py-2 text-[13px] font-bold text-white shadow-sm transition hover:bg-blue-800" type="button" onClick={openRandomProblem}>
                <Shuffle className="h-3.5 w-3.5" />
                {t("home.randomProblem")}
              </button>
            </div>
          </div>

          <ProblemTable />
        </AnimatedSurface>

        <AnimatedSurface delay={0.04} className="grid gap-5" id="contests">
          <section className="rin-card overflow-hidden border border-slate-200/80">
            <div className="rin-card-head flex items-center justify-between gap-2 px-4 py-3.5">
              <div className="flex items-center gap-2 text-sm font-semibold text-slate-500">
                <span className="rin-icon-tile">
                  <Trophy className="h-3.5 w-3.5" />
                </span>
                {t("home.upcomingContests")}
              </div>
              <Link className="text-xs font-bold text-blue-700 transition hover:text-blue-900" href="/contests">{locale === "zh-CN" ? "全部 ->" : "All ->"}</Link>
            </div>
            <div className="grid gap-2 p-4 pt-3">
              {contests.slice(0, 3).map((contest) => (
                <Link key={contest.id} href={`/contests/${contest.id}`} className="flex items-center justify-between gap-3 rounded-md border border-slate-200 bg-white px-3 py-2.5 text-sm transition hover:border-blue-200 hover:bg-blue-50">
                  <div className="min-w-0">
                    <div className="truncate font-bold text-slate-900">{locale === "zh-CN" ? contest.titleZh : contest.title}</div>
                    <div className="mt-0.5 flex items-center gap-2 text-xs font-semibold text-slate-500">
                      <span className="rounded bg-slate-100 px-1.5 py-0.5 text-slate-700">{contest.mode}</span>
                      <span>{locale === "zh-CN" ? contest.timeZh : contest.time}</span>
                    </div>
                  </div>
                  <span className={`shrink-0 rounded px-2 py-0.5 text-xs font-black ${contest.status === "Registering" ? "bg-emerald-50 text-emerald-700" : "bg-blue-50 text-blue-700"}`}>
                    {contest.status}
                  </span>
                </Link>
              ))}
            </div>
          </section>

          <section className="rin-card overflow-hidden border border-slate-200/80" id="ranking">
            <div className="rin-card-head flex items-center justify-between gap-2 px-4 py-3.5">
              <div className="flex items-center gap-2 text-sm font-semibold text-slate-500">
                <span className="rin-icon-tile">
                  <UsersRound className="h-3.5 w-3.5" />
                </span>
                {t("home.ratingBoard")}
              </div>
              <Link className="text-xs font-bold text-blue-700 transition hover:text-blue-900" href="/ranking">{locale === "zh-CN" ? "全部 ->" : "All ->"}</Link>
            </div>
            <div className="grid gap-1.5 p-4 pt-3">
              {ratingRows.slice(0, 5).map((row) => (
                <Link key={row.name} href={`/users/${row.name}`} className="flex items-center gap-3 rounded-md border border-slate-200 bg-white px-3 py-2 text-sm transition hover:border-blue-200 hover:bg-blue-50">
                  <span className="w-7 shrink-0 text-center text-xs font-black text-slate-500">#{row.rank}</span>
                  <span className="min-w-0 flex-1 truncate font-bold text-slate-900">{row.name}</span>
                  <span className="shrink-0 rounded bg-slate-100 px-1.5 py-0.5 text-xs font-black text-slate-700">{row.rating}</span>
                  <span className="shrink-0 text-xs font-semibold text-emerald-700">{row.solved} AC</span>
                </Link>
              ))}
            </div>
          </section>

          <section className="rin-card overflow-hidden border border-slate-200/80">
            <div className="rin-card-head px-4 py-3.5">
              <div className="flex items-center gap-2 text-sm font-semibold text-slate-500">
                <span className="rin-icon-tile">
                  <Clock3 className="h-3.5 w-3.5" />
                </span>
                {t("home.announcements")}
              </div>
            </div>
            <ul className="grid gap-2 p-4 pt-2">
              <li className="rounded-md border border-dashed border-slate-300 bg-slate-50 px-3 py-6 text-center text-sm font-medium text-slate-500">
                {t("home.noAnnouncements")}
              </li>
            </ul>
          </section>
        </AnimatedSurface>

        <AnimatedSurface delay={0.06} className="rin-card overflow-hidden border border-slate-200/80 lg:col-span-2" id="discuss">
          <div className="rin-card-head flex flex-wrap items-center justify-between gap-3 px-5 py-4">
            <div className="flex items-center gap-2 text-sm font-semibold text-slate-500">
              <span className="rin-icon-tile">
                <Activity className="h-3.5 w-3.5" />
              </span>
              {t("home.recentJudgements")}
            </div>
            <Link className="rin-soft-button px-3 py-1.5 text-xs" href="/status">
              {t("home.viewStatus")} -&gt;
            </Link>
          </div>
          <div className="overflow-x-auto">
            <table className="rin-table w-full min-w-[900px] border-collapse text-left text-sm">
              <thead>
                <tr>
                  <th className="px-4 py-3">{t("status.submission")}</th>
                  <th className="px-4 py-3">{t("status.when")}</th>
                  <th className="px-4 py-3">{t("status.user")}</th>
                  <th className="px-4 py-3">{t("status.problem")}</th>
                  <th className="px-4 py-3">{t("status.language")}</th>
                  <th className="px-4 py-3">{t("status.verdict")}</th>
                  <th className="px-4 py-3">{t("status.time")}</th>
                  <th className="px-4 py-3">{t("status.memory")}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100/80">
                {recentSubmissions.length === 0 ? (
                  <tr>
                    <td className="px-4 py-12 text-center text-sm font-medium text-slate-500" colSpan={8}>
                      <div className="mx-auto max-w-sm rounded-md border border-dashed border-slate-300 bg-slate-50 px-6 py-8">
                        {t("status.noResults")}
                      </div>
                    </td>
                  </tr>
                ) : null}
                {recentSubmissions.map((submission) => (
                  <tr key={submission.submissionId}>
                    <td className="px-4 py-3 font-mono text-xs text-slate-500" title={submission.submissionId}>
                      {formatSubmissionIdShort(submission.submissionId)}
                    </td>
                    <td className="px-4 py-3 tabular-nums text-slate-500">{formatSubmissionWhen(submission, locale)}</td>
                    <td className="px-4 py-3">
                      <Link className="font-semibold text-slate-900 hover:text-blue-700" href={`/users/${submission.actorId ?? "anonymous"}`}>
                        {resolveActorDisplayName(submission.actorId, locale)}
                      </Link>
                    </td>
                    <td className="px-4 py-3">
                      <Link className="rin-pill-problem text-xs font-black" href={`/problems/${submission.problemId}`}>
                        {submission.problemId}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-slate-500">{displayLanguageName(submission.languageId)}</td>
                    <td className="px-4 py-3">
                      <VerdictBadge value={submission.status} />
                    </td>
                    <td className="px-4 py-3 tabular-nums text-slate-500">{formatTimeMs(submission)}</td>
                    <td className="px-4 py-3 tabular-nums text-slate-500">{formatMemoryMiB(submission)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </AnimatedSurface>

        <AnimatedSurface delay={0.08} className="grid gap-5 lg:col-span-2">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2 text-sm font-semibold text-slate-500">
                <span className="rin-icon-tile">
                  <UploadCloud className="h-3.5 w-3.5" />
                </span>
                {t("home.workspace")}
              </div>
              <h2 className="mt-1 text-xl font-black text-slate-950">{t("home.workspaceTitle")}</h2>
            </div>
            <WorkspaceControls />
          </div>
          <div className="grid gap-5 xl:grid-cols-[0.92fr_1.08fr]">
            <ProblemIntakePanel />
            <SubmissionPanel />
          </div>
        </AnimatedSurface>
      </div>
    </OJShell>
  );
}
