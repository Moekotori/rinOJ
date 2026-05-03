"use client";

import Link from "next/link";
import { BookOpen, Clock3, Database, FileText, ListChecks, Trophy } from "lucide-react";
import { notFound, useParams } from "next/navigation";
import { AnimatedSurface } from "@/components/animated-surface";
import { OJShell } from "@/components/oj-shell";
import { DifficultyBadge } from "@/components/problem-table";
import { SubmissionPanel } from "@/components/submission-panel";
import { VerdictBadge } from "@/components/verdict-badge";
import { contestProblems, contests, judgements, problems } from "@/lib/mock-oj-data";
import { formatProblemTag } from "@/lib/problem-tags";
import { useTranslation } from "@/lib/use-translation";

export default function ProblemDetailPage() {
  const params = useParams<{ problemId: string }>();
  const { locale, t } = useTranslation();
  const problemId = params.problemId;
  const problem = problems.find((item) => item.id === problemId);
  const recentJudgements = judgements.filter((judgement) => judgement.problem === problemId);
  const relatedContest = contestProblems.find((entry) => entry.problemId === problemId);
  const contest = relatedContest ? contests.find((item) => item.id === relatedContest.contestId) : undefined;

  if (!problem) {
    notFound();
  }

  return (
    <OJShell>
      <div className="grid w-full gap-4 px-3 py-4 sm:px-4 lg:grid-cols-[minmax(470px,0.82fr)_minmax(760px,1.18fr)] lg:px-5 2xl:px-7">
        <AnimatedSurface className="rin-workbench-panel overflow-hidden rounded-xl text-base">
          <div className="border-b border-pink-100/80 px-7 py-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <div className="text-base font-bold text-sky-700">{problem.id}</div>
                <h1 className="mt-1 text-4xl font-black text-slate-950">{locale === "zh-CN" ? problem.titleZh : problem.title}</h1>
              </div>
              <div className="scale-110">
                <DifficultyBadge value={problem.difficulty} />
              </div>
            </div>
            <div className="mt-4 flex flex-wrap gap-2 text-base text-slate-600">
              <span className="inline-flex items-center gap-1 rounded-lg bg-slate-100 px-3 py-1.5 font-semibold">
                <Clock3 className="h-4 w-4" />
                {problem.timeLimit}
              </span>
              <span className="inline-flex items-center gap-1 rounded-lg bg-slate-100 px-3 py-1.5 font-semibold">
                <Database className="h-4 w-4" />
                {problem.memoryLimit}
              </span>
              <span className="rounded-lg bg-emerald-50 px-3 py-1.5 font-bold text-emerald-700">AC {problem.accepted}</span>
            </div>
            <div className="mt-4 flex flex-wrap gap-2 text-sm font-bold">
              <a className="rin-soft-button px-3 py-2" href="#statement">
                <BookOpen className="h-4 w-4" />
                {t("problem.statement")}
              </a>
              <a className="rin-soft-button px-3 py-2" href="#input-output">
                <FileText className="h-4 w-4" />
                {t("problem.input")} / {t("problem.output")}
              </a>
              <a className="rin-soft-button px-3 py-2" href="#samples">
                <ListChecks className="h-4 w-4" />
                {t("problem.sampleInput")}
              </a>
            </div>
          </div>

          <div className="grid gap-8 px-7 py-7">
            <section id="statement" className="scroll-mt-28">
              <div className="flex items-center gap-2 text-base font-bold text-slate-500">
                <FileText className="h-5 w-5" />
                {t("problem.statement")}
              </div>
              <p className="mt-3 text-xl leading-9 text-slate-800">{locale === "zh-CN" ? problem.statementZh : problem.statement}</p>
            </section>

            <section id="input-output" className="grid gap-5 scroll-mt-28 md:grid-cols-2">
              <div className="rounded-xl border border-slate-200 bg-white/72 p-4">
                <h2 className="text-2xl font-black text-slate-950">{t("problem.input")}</h2>
                <p className="mt-2 text-lg leading-8 text-slate-700">{t("problem.inputHelp")}</p>
              </div>
              <div className="rounded-xl border border-slate-200 bg-white/72 p-4">
                <h2 className="text-2xl font-black text-slate-950">{t("problem.output")}</h2>
                <p className="mt-2 text-lg leading-8 text-slate-700">{t("problem.outputHelp")}</p>
              </div>
            </section>

            <section id="samples" className="grid gap-3 scroll-mt-28 md:grid-cols-2">
              <div>
                <h2 className="text-2xl font-black text-slate-950">{t("problem.sampleInput")}</h2>
                <pre className="mt-2 overflow-x-auto rounded-lg border border-slate-200 bg-slate-950 p-4 text-lg leading-8 text-slate-100">{problem.input}</pre>
              </div>
              <div>
                <h2 className="text-2xl font-black text-slate-950">{t("problem.sampleOutput")}</h2>
                <pre className="mt-2 overflow-x-auto rounded-lg border border-slate-200 bg-slate-950 p-4 text-lg leading-8 text-slate-100">{problem.output}</pre>
              </div>
            </section>
          </div>
        </AnimatedSurface>

        <AnimatedSurface delay={0.06} className="grid content-start gap-4">
          <section className="rin-workbench-panel rounded-xl p-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <div className="rin-section-title">{t("table.tags")}</div>
                {contest ? (
                  <Link
                    className="mt-2 inline-flex rounded-lg border border-pink-100 bg-pink-50/80 px-3 py-1.5 text-sm font-bold text-pink-700 transition hover:-translate-y-0.5 hover:text-pink-900"
                    href={`/contests/${contest.id}`}
                    aria-label={t("problem.relatedContest")}
                  >
                    <Trophy className="mr-1 h-4 w-4" />
                    {relatedContest?.alias}. {locale === "zh-CN" ? contest.titleZh : contest.title}
                  </Link>
                ) : null}
              </div>
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              {problem.tags.map((tag) => (
                <span key={tag} className="rounded-lg bg-slate-100 px-3 py-1.5 text-sm font-bold text-slate-600">
                  {formatProblemTag(tag, locale)}
                </span>
              ))}
            </div>
          </section>
          <SubmissionPanel initialProblemId={problem.id} />
          <section className="rin-workbench-panel rounded-xl p-5">
            <div className="flex items-center justify-between gap-3">
              <div className="text-base font-bold text-slate-500">{t("problem.recentSubmissions")}</div>
              <Link className="text-sm font-bold text-sky-700 hover:text-pink-700" href={`/status?problemId=${problem.id}`}>
                {t("home.viewStatus")}
              </Link>
            </div>
            <div className="mt-3 grid gap-2 xl:grid-cols-2">
              {recentJudgements.map((judgement) => (
                <div key={`${judgement.when}-${judgement.user}`} className="grid grid-cols-[1fr_auto] items-center gap-2 rounded-xl border border-white/80 bg-white/70 px-4 py-3 transition hover:-translate-y-0.5 hover:border-pink-100 hover:bg-white">
                  <div>
                    <Link className="text-base font-bold text-slate-950 transition hover:text-pink-600" href={`/users/${judgement.user}`}>
                      {judgement.user}
                    </Link>
                    <div className="text-sm text-slate-500">
                      {judgement.lang} · {locale === "zh-CN" ? judgement.whenZh : judgement.when}
                    </div>
                  </div>
                  <VerdictBadge value={judgement.verdict} />
                </div>
              ))}
            </div>
          </section>
        </AnimatedSurface>
      </div>
    </OJShell>
  );
}
