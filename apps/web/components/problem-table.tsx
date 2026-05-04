"use client";

import { useEffect, useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, SearchX } from "lucide-react";
import Link from "next/link";
import { problems } from "@/lib/mock-oj-data";
import { formatProblemTag } from "@/lib/problem-tags";
import { useTranslation } from "@/lib/use-translation";

type ProblemSeed = (typeof problems)[number];

export function ProblemTable({ items = problems, pageSize = 7 }: Readonly<{ items?: ProblemSeed[]; pageSize?: number }>) {
  const { locale, t } = useTranslation();
  const [page, setPage] = useState(1);
  const totalPages = Math.max(1, Math.ceil(items.length / pageSize));
  const safePage = Math.min(page, totalPages);
  const pageItems = useMemo(() => {
    const start = (safePage - 1) * pageSize;
    return items.slice(start, start + pageSize);
  }, [items, pageSize, safePage]);

  useEffect(() => {
    setPage(1);
  }, [items, pageSize]);

  return (
    <div>
      <div className="overflow-x-auto">
        <table className="rin-table w-full min-w-[760px] border-collapse text-left text-sm">
          <thead>
            <tr>
              <th className="px-4 py-3">{t("table.id")}</th>
              <th className="px-4 py-3">{t("table.title")}</th>
              <th className="px-4 py-3">{t("table.difficulty")}</th>
              <th className="px-4 py-3">{t("table.tags")}</th>
              <th className="px-4 py-3">{t("table.accepted")}</th>
              <th className="px-4 py-3">{t("table.submissions")}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100/80">
            {items.length === 0 ? (
              <tr>
                <td className="px-4 py-12 text-center text-sm font-medium text-slate-500" colSpan={6}>
                  <div className="mx-auto flex max-w-sm flex-col items-center gap-3 rounded-md border border-dashed border-slate-300 bg-slate-50 px-6 py-8">
                    <span className="rin-icon-tile h-10 w-10 [&>svg]:h-5 [&>svg]:w-5">
                      <SearchX aria-hidden />
                    </span>
                    <span>{t("problems.noResults")}</span>
                  </div>
                </td>
              </tr>
            ) : null}
            {pageItems.map((problem) => {
              const acceptedNum = Number.parseFloat(problem.accepted.replace("%", ""));
              const acRate = !Number.isNaN(acceptedNum) && problem.accepted.endsWith("%") ? acceptedNum : null;

              return (
                <tr key={problem.id}>
                  <td className="px-4 py-3">
                    <Link className="rin-pill-problem text-xs font-black" href={`/problems/${problem.id}`}>
                      {problem.id}
                    </Link>
                  </td>
                  <td className="px-4 py-3">
                    <Link className="font-semibold text-slate-950 transition hover:text-blue-700" href={`/problems/${problem.id}`}>
                      {locale === "zh-CN" ? problem.titleZh : problem.title}
                    </Link>
                  </td>
                  <td className="px-4 py-3">
                    <DifficultyBadge value={problem.difficulty} />
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-1">
                      {problem.tags.map((tag) => (
                        <span key={tag} className="rin-tag-outline py-0.5 text-xs font-bold text-slate-600">
                          {formatProblemTag(tag, locale)}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1.5">
                      <span className="font-semibold text-emerald-700">{problem.accepted}</span>
                      {acRate !== null ? (
                        <span className="rounded bg-emerald-50 px-1.5 py-0.5 text-[10px] font-bold text-emerald-700">{acRate.toFixed(0)}%</span>
                      ) : null}
                    </div>
                  </td>
                  <td className="px-4 py-3 tabular-nums text-slate-500">{problem.submissions}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
        <span className="text-xs font-semibold tabular-nums text-slate-500">
          {items.length === 0 ? "0" : `${(safePage - 1) * pageSize + 1}-${Math.min(safePage * pageSize, items.length)}`}
          <span className="mx-1 text-slate-300">/</span>
          {items.length} {locale === "zh-CN" ? "题" : "problems"}
        </span>
        <div className="flex items-center gap-2">
          <button className="rin-pager-btn" type="button" disabled={safePage <= 1} onClick={() => setPage((current) => Math.max(1, current - 1))}>
            <ChevronLeft className="h-3.5 w-3.5" />
            {t("problems.previous")}
          </button>
          <span className="rin-pager-indicator tabular-nums">
            {safePage} / {totalPages}
          </span>
          <button className="rin-pager-btn" type="button" disabled={safePage >= totalPages} onClick={() => setPage((current) => Math.min(totalPages, current + 1))}>
            {t("problems.next")}
            <ChevronRight className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}

export function DifficultyBadge({ value }: Readonly<{ value: string }>) {
  const className =
    value === "Expert"
      ? "border border-rose-200 bg-rose-50 text-rose-700"
      : value === "Hard"
        ? "border border-amber-200 bg-amber-50 text-amber-700"
        : value === "Medium"
          ? "border border-blue-200 bg-blue-50 text-blue-700"
          : "border border-emerald-200 bg-emerald-50 text-emerald-700";

  return <span className={`rounded px-2 py-1 text-xs font-bold ${className}`}>{value}</span>;
}
