"use client";

import Link from "next/link";
import {
  ArrowDownToLine,
  ArrowUpFromLine,
  BookOpen,
  Check,
  ClipboardCheck,
  ClipboardPaste,
  Clock3,
  Copy,
  Database,
  FileText,
  ListChecks,
  MessagesSquare,
  Star,
  Trophy,
} from "lucide-react";
import { notFound, useParams } from "next/navigation";
import { useState } from "react";
import { AnimatedSurface } from "@/components/animated-surface";
import { OJShell } from "@/components/oj-shell";
import { DifficultyBadge } from "@/components/problem-table";
import { SubmissionPanel } from "@/components/submission-panel";
import { VerdictBadge } from "@/components/verdict-badge";
import { contestProblems, contests, judgements, problems } from "@/lib/mock-oj-data";
import { formatProblemTag } from "@/lib/problem-tags";
import { useFavoritesStore } from "@/lib/use-favorites-store";
import { useTranslation } from "@/lib/use-translation";

function parseCompactCount(value: string) {
  const normalized = value.trim().toLowerCase();
  const numeric = Number.parseFloat(normalized);

  if (Number.isNaN(numeric)) {
    return 0;
  }

  if (normalized.endsWith("k")) {
    return Math.round(numeric * 1000);
  }

  if (normalized.endsWith("m")) {
    return Math.round(numeric * 1000 * 1000);
  }

  return Math.round(numeric);
}

function formatCompactCount(value: number) {
  if (value >= 1000 * 1000) {
    return `${(value / 1000 / 1000).toFixed(1).replace(/\.0$/, "")}m`;
  }

  if (value >= 1000) {
    return `${(value / 1000).toFixed(1).replace(/\.0$/, "")}k`;
  }

  return value.toString();
}

function estimateAcceptedCount(submissions: string, acceptedRate: string) {
  const total = parseCompactCount(submissions);
  const rate = Number.parseFloat(acceptedRate.replace("%", ""));

  if (total <= 0 || Number.isNaN(rate)) {
    return "-";
  }

  return formatCompactCount(Math.round(total * (rate / 100)));
}

export default function ProblemDetailPage() {
  const params = useParams<{ problemId: string }>();
  const { locale, t } = useTranslation();
  const problemId = params.problemId;
  const problem = problems.find((item) => item.id === problemId);
  const recentJudgements = judgements.filter((judgement) => judgement.problem === problemId);
  const relatedContest = contestProblems.find((entry) => entry.problemId === problemId);
  const contest = relatedContest ? contests.find((item) => item.id === relatedContest.contestId) : undefined;
  const [copiedSample, setCopiedSample] = useState<"input" | "output" | null>(null);
  const acceptedCount = problem ? estimateAcceptedCount(problem.submissions, problem.accepted) : "-";
  const isFavorite = useFavoritesStore((s) => s.has(problemId));
  const toggleFavorite = useFavoritesStore((s) => s.toggle);

  if (!problem) {
    notFound();
  }

  const copySample = async (kind: "input" | "output", value: string) => {
    await navigator.clipboard.writeText(value);
    setCopiedSample(kind);
    window.setTimeout(() => setCopiedSample(null), 1200);
  };

  return (
    <OJShell>
      <div className="grid w-full gap-4 px-3 py-4 sm:px-4 lg:grid-cols-[minmax(0,1fr)_minmax(680px,1fr)] lg:px-5 2xl:px-7">
        <AnimatedSurface className="rin-workbench-panel overflow-hidden rounded-xl text-base">
          <div className="rin-card-head px-7 py-6">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <div className="text-base font-bold text-sky-700">{problem.id}</div>
                <h1 className="mt-1 text-4xl font-black text-slate-950">{locale === "zh-CN" ? problem.titleZh : problem.title}</h1>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <button
                  type="button"
                  className={`rin-soft-button h-11 w-11 shrink-0 rounded-xl p-0 shadow-[0_6px_16px_rgba(58,45,88,0.06)] transition hover:border-amber-200/90 hover:bg-amber-50/80 ${isFavorite ? "border-amber-200 bg-amber-50/60" : ""}`}
                  aria-label={isFavorite ? t("problem.unfavorite") : t("problem.favorite")}
                  onClick={() => toggleFavorite(problemId)}
                >
                  <Star className={`mx-auto h-5 w-5 ${isFavorite ? "fill-amber-400 text-amber-600" : "text-slate-400"}`} aria-hidden />
                </button>
                <div className="scale-110">
                  <DifficultyBadge value={problem.difficulty} />
                </div>
              </div>
            </div>
            <div className="mt-4 flex flex-wrap gap-2 text-sm">
              <span className="rin-stat-pill">
                <Clock3 className="h-3.5 w-3.5 text-slate-400" aria-hidden />
                {problem.timeLimit}
              </span>
              <span className="rin-stat-pill">
                <Database className="h-3.5 w-3.5 text-slate-400" aria-hidden />
                {problem.memoryLimit}
              </span>
              <span className="rin-stat-pill rin-stat-pill--sky font-bold">
                <ListChecks className="h-3.5 w-3.5" aria-hidden />
                {problem.submissions} {locale === "zh-CN" ? "次提交" : "submissions"}
              </span>
              <span className="rin-stat-pill rin-stat-pill--emerald font-bold">
                <Check className="h-3.5 w-3.5" aria-hidden />
                {acceptedCount} AC
              </span>
              <span className="rin-stat-pill rin-stat-pill--emerald font-bold">
                {problem.accepted} {locale === "zh-CN" ? "通过率" : "AC rate"}
              </span>
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
            <div className="rin-problem-section mt-5 p-4">
              <div className="rin-section-title">{t("table.tags")}</div>
              <div className="mt-3 flex flex-wrap gap-2">
                {contest ? (
                  <Link
                    className="inline-flex items-center rounded-lg border border-pink-100 bg-pink-50/80 px-3 py-1.5 text-sm font-bold text-pink-700 transition hover:-translate-y-0.5 hover:text-pink-900"
                    href={`/contests/${contest.id}`}
                    aria-label={t("problem.relatedContest")}
                  >
                    <Trophy className="mr-1 h-4 w-4" />
                    {relatedContest?.alias}. {locale === "zh-CN" ? contest.titleZh : contest.title}
                  </Link>
                ) : null}
                {problem.tags.map((tag) => (
                  <span key={tag} className="rin-tag-outline">
                    {formatProblemTag(tag, locale)}
                  </span>
                ))}
              </div>
              <div className="mt-4 grid gap-2 sm:grid-cols-2">
                <Link className="rin-soft-button justify-center px-4 py-3 text-base font-bold" href={`/discuss?problemId=${problem.id}`}>
                  <MessagesSquare className="h-5 w-5" />
                  {locale === "zh-CN" ? "查看题解讨论" : "Discuss solutions"}
                </Link>
                <Link className="rin-soft-button justify-center px-4 py-3 text-base font-bold" href={`/status?problemId=${problem.id}`}>
                  <ListChecks className="h-5 w-5" />
                  {locale === "zh-CN" ? "本题提交记录" : "Submission log"}
                </Link>
              </div>
            </div>
          </div>

          <div className="grid gap-8 px-7 py-7">
            <section id="statement" className="scroll-mt-28">
              <div className="flex items-center gap-2 text-base font-bold text-slate-500">
                <span className="rin-icon-tile rin-icon-tile--pink">
                  <FileText className="h-3.5 w-3.5" aria-hidden />
                </span>
                {t("problem.statement")}
              </div>
              <div className="rin-problem-section mt-4 p-5">
                <p className="text-xl leading-9 text-slate-800">{locale === "zh-CN" ? problem.statementZh : problem.statement}</p>
              </div>
            </section>

            <section id="input-output" className="grid gap-5 scroll-mt-28 md:grid-cols-2">
              <div className="rin-problem-section p-5">
                <div className="flex items-center gap-2 text-base font-bold text-slate-500">
                  <span className="rin-icon-tile rin-icon-tile--sky">
                    <ArrowDownToLine className="h-3.5 w-3.5" aria-hidden />
                  </span>
                  {t("problem.input")}
                </div>
                <p className="mt-3 text-lg leading-8 text-slate-700">{t("problem.inputHelp")}</p>
              </div>
              <div className="rin-problem-section p-5">
                <div className="flex items-center gap-2 text-base font-bold text-slate-500">
                  <span className="rin-icon-tile rin-icon-tile--emerald">
                    <ArrowUpFromLine className="h-3.5 w-3.5" aria-hidden />
                  </span>
                  {t("problem.output")}
                </div>
                <p className="mt-3 text-lg leading-8 text-slate-700">{t("problem.outputHelp")}</p>
              </div>
            </section>

            <section id="samples" className="grid gap-4 scroll-mt-28 md:grid-cols-2">
              <div>
                <div className="flex items-center justify-between gap-3">
                  <div className="flex min-w-0 items-center gap-2">
                    <span className="rin-icon-tile rin-icon-tile--amber shrink-0">
                      <ClipboardPaste className="h-3.5 w-3.5" aria-hidden />
                    </span>
                    <h2 className="truncate text-2xl font-black text-slate-950">{t("problem.sampleInput")}</h2>
                  </div>
                  <button className="rin-soft-button px-3 py-2 text-sm font-bold" type="button" onClick={() => copySample("input", problem.input)}>
                    {copiedSample === "input" ? <Check className="h-4 w-4" aria-hidden /> : <Copy className="h-4 w-4" aria-hidden />}
                    {locale === "zh-CN" ? "复制输入" : "Copy input"}
                  </button>
                </div>
                <pre className="rin-sample-pre mt-3 overflow-x-auto p-4 font-mono text-lg leading-8 text-slate-100">{problem.input}</pre>
              </div>
              <div>
                <div className="flex items-center justify-between gap-3">
                  <div className="flex min-w-0 items-center gap-2">
                    <span className="rin-icon-tile rin-icon-tile--emerald shrink-0">
                      <ClipboardCheck className="h-3.5 w-3.5" aria-hidden />
                    </span>
                    <h2 className="truncate text-2xl font-black text-slate-950">{t("problem.sampleOutput")}</h2>
                  </div>
                  <button className="rin-soft-button px-3 py-2 text-sm font-bold" type="button" onClick={() => copySample("output", problem.output)}>
                    {copiedSample === "output" ? <Check className="h-4 w-4" aria-hidden /> : <Copy className="h-4 w-4" aria-hidden />}
                    {locale === "zh-CN" ? "复制输出" : "Copy output"}
                  </button>
                </div>
                <pre className="rin-sample-pre mt-3 overflow-x-auto p-4 font-mono text-lg leading-8 text-slate-100">{problem.output}</pre>
              </div>
            </section>
          </div>
        </AnimatedSurface>

        <AnimatedSurface delay={0.06} className="grid content-start gap-4">
          <SubmissionPanel initialProblemId={problem.id} />
          <section className="rin-workbench-panel overflow-hidden rounded-xl p-0">
            <div className="rin-card-head flex items-center justify-between gap-3 px-5 py-4">
              <div className="flex items-center gap-2 text-base font-bold text-slate-500">
                <span className="rin-icon-tile rin-icon-tile--sky">
                  <ListChecks className="h-3.5 w-3.5" aria-hidden />
                </span>
                {t("problem.recentSubmissions")}
              </div>
              <Link className="text-sm font-bold text-sky-700 hover:text-pink-700" href={`/status?problemId=${problem.id}`}>
                {t("home.viewStatus")}
              </Link>
            </div>
            <div className="grid gap-2 px-5 pb-5 pt-2 xl:grid-cols-2">
              {recentJudgements.length === 0 ? (
                <div className="rounded-xl border border-slate-200 bg-white/70 px-4 py-6 text-center text-sm font-medium text-slate-500 xl:col-span-2">
                  {t("status.noResults")}
                </div>
              ) : null}
              {recentJudgements.map((judgement) => (
                <div
                  key={`${judgement.when}-${judgement.user}`}
                  className="rin-problem-section grid grid-cols-[1fr_auto] items-center gap-2 p-3 transition hover:-translate-y-0.5 hover:shadow-[0_12px_28px_rgba(58,45,88,0.08)]"
                >
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
