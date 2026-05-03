"use client";

import Link from "next/link";
import { Activity, BookOpen, Clock3, Trophy, UploadCloud, UsersRound } from "lucide-react";
import { AnimatedSurface } from "@/components/animated-surface";
import { OJShell } from "@/components/oj-shell";
import { ProblemTable } from "@/components/problem-table";
import { ProblemIntakePanel } from "@/components/problem-intake-panel";
import { SubmissionPanel } from "@/components/submission-panel";
import { VerdictBadge } from "@/components/verdict-badge";
import { WorkspaceControls } from "@/components/workspace-controls";
import { contests, judgements, ratingRows } from "@/lib/mock-oj-data";
import { useTranslation } from "@/lib/use-translation";

export default function HomePage() {
  const { locale, t } = useTranslation();

  return (
    <OJShell>
      <div className="mx-auto grid w-full max-w-[1600px] gap-5 px-4 py-5 sm:px-6 lg:grid-cols-[minmax(0,1fr)_380px] lg:px-8">
        <AnimatedSurface className="rin-hero-strip rounded-xl px-6 py-6 lg:col-span-2">
          <span className="rin-kana-badge">Rin Online Judge</span>
          <div className="mt-3 grid gap-2 lg:grid-cols-[1fr_auto] lg:items-end">
            <div>
              <h1 className="text-3xl font-black text-slate-950 sm:text-4xl">{t("home.heroTitle")}</h1>
              <p className="mt-2 max-w-3xl text-base font-semibold leading-7 text-slate-700">{t("home.heroSubtitle")}</p>
            </div>
            <div className="grid grid-cols-3 gap-2 text-center text-sm font-black text-slate-700">
              <span className="rounded-xl border border-white/80 bg-white/72 px-4 py-3">5k+ Problems</span>
              <span className="rounded-xl border border-white/80 bg-white/72 px-4 py-3">200/s Submit</span>
              <span className="rounded-xl border border-white/80 bg-white/72 px-4 py-3">go-judge</span>
            </div>
          </div>
        </AnimatedSurface>

        <AnimatedSurface delay={0.04} className="rin-card rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 px-4 py-3">
            <div>
              <div className="flex items-center gap-2 text-sm font-semibold text-slate-500">
                <BookOpen className="h-4 w-4" />
                {t("problems.problemSet")}
              </div>
              <h1 className="mt-1 text-2xl font-black text-slate-950">{t("home.practiceProblems")}</h1>
            </div>
            <div className="flex flex-wrap gap-2">
              <button className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 transition hover:-translate-y-0.5 hover:border-pink-200 hover:bg-pink-50 hover:text-pink-700" type="button">
                {t("home.tags")}
              </button>
              <button className="rounded-lg bg-slate-950 px-3 py-2 text-sm font-semibold text-white shadow-sm transition hover:-translate-y-0.5 hover:bg-pink-600" type="button">
                {t("home.randomProblem")}
              </button>
            </div>
          </div>

          <ProblemTable />
        </AnimatedSurface>

        <AnimatedSurface delay={0.08} className="grid gap-5" id="contests">
          <section className="rin-card rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex items-center gap-2 text-sm font-semibold text-slate-500">
              <Trophy className="h-4 w-4" />
              {t("home.upcomingContests")}
            </div>
            <div className="mt-3 grid gap-3">
              {contests.map((contest) => (
                <a key={contest.title} className="block rounded-lg border border-slate-100 bg-slate-50 px-3 py-3 transition hover:-translate-y-0.5 hover:border-sky-200 hover:bg-sky-50 hover:shadow-sm" href="/contests">
                  <div className="font-bold text-slate-950">{locale === "zh-CN" ? contest.titleZh : contest.title}</div>
                  <div className="mt-1 flex flex-wrap items-center gap-2 text-xs font-medium text-slate-500">
                    <span>{contest.mode}</span>
                    <span>{locale === "zh-CN" ? contest.timeZh : contest.time}</span>
                    <span>
                      {contest.registered} {t("home.joined")}
                    </span>
                  </div>
                </a>
              ))}
            </div>
          </section>

          <section className="rin-card rounded-lg border border-slate-200 bg-white p-4 shadow-sm" id="ranking">
            <div className="flex items-center gap-2 text-sm font-semibold text-slate-500">
              <UsersRound className="h-4 w-4" />
              {t("home.ratingBoard")}
            </div>
            <div className="mt-3 grid gap-2">
              {ratingRows.map((row) => (
                <div key={row.name} className="grid grid-cols-[32px_1fr_auto] items-center gap-2 rounded-lg bg-white px-2 py-2">
                  <span className="font-bold text-slate-400">#{row.rank}</span>
                  <span className="font-semibold text-slate-900">{row.name}</span>
                  <span className="rounded-md bg-pink-50 px-2 py-1 text-xs font-bold text-pink-700">{row.rating}</span>
                </div>
              ))}
            </div>
          </section>

          <section className="rin-card rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex items-center gap-2 text-sm font-semibold text-slate-500">
              <Clock3 className="h-4 w-4" />
              {t("home.announcements")}
            </div>
            <ul className="mt-3 grid gap-2 text-sm text-slate-700">
              <li>{t("home.announcementWorkers")}</li>
              <li>{t("home.announcementImport")}</li>
              <li>{t("home.announcementTraining")}</li>
            </ul>
          </section>
        </AnimatedSurface>

        <AnimatedSurface delay={0.12} className="rin-card rounded-lg border border-slate-200 bg-white shadow-sm lg:col-span-2" id="discuss">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 px-4 py-3">
            <div className="flex items-center gap-2 text-sm font-semibold text-slate-500">
              <Activity className="h-4 w-4" />
              {t("home.recentJudgements")}
            </div>
            <a className="text-sm font-semibold text-sky-700" href="/status">
              {t("home.viewStatus")}
            </a>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] border-collapse text-left text-sm">
              <tbody className="divide-y divide-slate-100">
                {judgements.map((judgement) => (
                  <tr key={`${judgement.when}-${judgement.user}`}>
                    <td className="px-4 py-3 text-slate-500">{locale === "zh-CN" ? judgement.whenZh : judgement.when}</td>
                    <td className="px-4 py-3">
                      <Link className="font-semibold text-slate-900 hover:text-pink-600" href={`/users/${judgement.user}`}>
                        {judgement.user}
                      </Link>
                    </td>
                    <td className="px-4 py-3">
                      <Link className="font-bold text-sky-700 hover:text-pink-600" href={`/problems/${judgement.problem}`}>
                        {judgement.problem}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-slate-600">{judgement.lang}</td>
                    <td className="px-4 py-3">
                      <VerdictBadge value={judgement.verdict} />
                    </td>
                    <td className="px-4 py-3 text-slate-600">{judgement.time}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </AnimatedSurface>

        <AnimatedSurface delay={0.16} className="grid gap-5 lg:col-span-2">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2 text-sm font-semibold text-slate-500">
                <UploadCloud className="h-4 w-4" />
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
