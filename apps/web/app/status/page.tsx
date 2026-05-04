"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Activity, ArrowLeft, Filter, RotateCw } from "lucide-react";
import { OJShell } from "@/components/oj-shell";
import { VerdictBadge } from "@/components/verdict-badge";
import { listSubmissions } from "@/lib/gateway";
import { displayLanguageName } from "@/lib/language-options";
import {
  formatMemoryMiB,
  formatSubmissionIdShort,
  formatSubmissionWhen,
  formatTimeMs,
  resolveActorDisplayName,
} from "@/lib/submission-display";
import type { SubmissionResponse } from "@/lib/types";
import { useTranslation } from "@/lib/use-translation";

function StatusPageInner() {
  const { locale, t } = useTranslation();
  const searchParams = useSearchParams();
  const problemFilter = searchParams.get("problemId") ?? "";
  const userFilter = searchParams.get("user") ?? "";
  const [verdict, setVerdict] = useState("all");
  const [language, setLanguage] = useState("all");
  const [submissions, setSubmissions] = useState<SubmissionResponse[]>([]);

  const refreshSubmissions = async () => {
    try {
      const remote = await listSubmissions({ pageSize: 50, problemId: problemFilter || undefined, actorId: userFilter || undefined });
      setSubmissions(remote.items);
    } catch {
      setSubmissions([]);
    }
  };

  useEffect(() => {
    void refreshSubmissions();
  }, [problemFilter, userFilter]);

  const backHref = userFilter ? `/users/${encodeURIComponent(userFilter)}` : problemFilter ? `/problems/${encodeURIComponent(problemFilter)}` : null;
  const backLabel = userFilter ? t("status.backToProfile") : problemFilter ? t("status.backToProblem") : "";
  const verdicts = useMemo(() => Array.from(new Set(submissions.map((submission) => submission.status))).sort(), [submissions]);
  const languages = useMemo(() => Array.from(new Set(submissions.map((submission) => displayLanguageName(submission.languageId)))).sort(), [submissions]);

  const filteredSubmissions = useMemo(
    () =>
      submissions.filter(
        (submission) =>
          (verdict === "all" || submission.status === verdict) &&
          (language === "all" || displayLanguageName(submission.languageId) === language) &&
          (!problemFilter || submission.problemId === problemFilter) &&
          (!userFilter || submission.actorId === userFilter),
      ),
    [language, problemFilter, submissions, userFilter, verdict],
  );

  return (
    <OJShell>
      <div className="mx-auto grid w-full max-w-7xl gap-5 px-4 py-5 sm:px-6 lg:px-8">
        <section className="rin-card overflow-hidden border border-slate-200/80">
          <div className="rin-card-head flex flex-wrap items-center justify-between gap-3 px-5 py-4">
            <div className="flex min-w-0 flex-1 items-start gap-3">
              {backHref ? (
                <Link href={backHref} className="rin-soft-button mt-0.5 inline-flex shrink-0 items-center gap-1.5 px-3 py-2 text-sm font-bold" aria-label={backLabel}>
                  <ArrowLeft className="h-4 w-4" aria-hidden />
                  <span className="hidden sm:inline">{backLabel}</span>
                </Link>
              ) : null}
              <div className="min-w-0">
                <div className="flex items-center gap-2 text-sm font-semibold text-slate-500">
                  <span className="rin-icon-tile">
                    <Activity className="h-3.5 w-3.5" />
                  </span>
                  {t("nav.status")}
                </div>
                <h1 className="mt-1 text-2xl font-black tracking-tight text-slate-950">{t("status.recentSubmissions")}</h1>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <label className="rin-filter-field text-sm font-semibold text-slate-700">
                <Filter className="h-3.5 w-3.5 shrink-0 text-slate-400" />
                <select aria-label={t("status.allVerdicts")} className="max-w-[12rem] cursor-pointer bg-transparent outline-none" onChange={(event) => setVerdict(event.target.value)} value={verdict}>
                  <option value="all">{t("status.allVerdicts")}</option>
                  {verdicts.map((item) => (
                    <option key={item} value={item}>
                      {item}
                    </option>
                  ))}
                </select>
              </label>
              <label className="rin-filter-field text-sm font-semibold text-slate-700">
                <select aria-label={t("status.allLanguages")} className="max-w-[12rem] cursor-pointer bg-transparent outline-none" onChange={(event) => setLanguage(event.target.value)} value={language}>
                  <option value="all">{t("status.allLanguages")}</option>
                  {languages.map((item) => (
                    <option key={item} value={item}>
                      {item}
                    </option>
                  ))}
                </select>
              </label>
              <button className="inline-flex h-9 items-center gap-2 rounded-md border border-slate-300 bg-white px-3.5 text-[13px] font-bold text-slate-700 shadow-sm transition hover:bg-slate-50 hover:text-slate-950" onClick={() => void refreshSubmissions()} type="button">
                <RotateCw className="h-3.5 w-3.5" />
                {t("status.refresh")}
              </button>
            </div>
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
                {filteredSubmissions.length === 0 ? (
                  <tr>
                    <td className="px-4 py-12 text-center text-sm font-medium text-slate-500" colSpan={8}>
                      <div className="mx-auto max-w-sm rounded-md border border-dashed border-slate-300 bg-slate-50 px-6 py-8">
                        {t("status.noResults")}
                      </div>
                    </td>
                  </tr>
                ) : null}
                {filteredSubmissions.map((submission) => (
                  <tr key={submission.submissionId}>
                    <td className="px-4 py-3 font-mono text-xs text-slate-500" title={submission.submissionId}>
                      {formatSubmissionIdShort(submission.submissionId)}
                    </td>
                    <td className="px-4 py-3 text-slate-500">{formatSubmissionWhen(submission, locale)}</td>
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
                    <td className="px-4 py-3 text-slate-600">{displayLanguageName(submission.languageId)}</td>
                    <td className="px-4 py-3">
                      <VerdictBadge value={submission.status} />
                    </td>
                    <td className="px-4 py-3 text-slate-600">{formatTimeMs(submission)}</td>
                    <td className="px-4 py-3 text-slate-600">{formatMemoryMiB(submission)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </OJShell>
  );
}

export default function StatusPage() {
  return (
    <Suspense fallback={<StatusLoadingFallback />}>
      <StatusPageInner />
    </Suspense>
  );
}

function StatusLoadingFallback() {
  return (
    <OJShell>
      <div className="mx-auto max-w-7xl px-4 py-16 text-center text-sm text-slate-500">Loading...</div>
    </OJShell>
  );
}
