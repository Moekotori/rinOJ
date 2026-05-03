"use client";

import Link from "next/link";
import { problems } from "@/lib/mock-oj-data";
import { formatProblemTag } from "@/lib/problem-tags";
import { useTranslation } from "@/lib/use-translation";

type ProblemSeed = (typeof problems)[number];

export function ProblemTable({ items = problems }: Readonly<{ items?: ProblemSeed[] }>) {
  const { locale, t } = useTranslation();

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[760px] border-collapse text-left text-sm">
        <thead className="bg-slate-50 text-xs font-bold text-slate-500">
          <tr>
            <th className="px-4 py-3">{t("table.id")}</th>
            <th className="px-4 py-3">{t("table.title")}</th>
            <th className="px-4 py-3">{t("table.difficulty")}</th>
            <th className="px-4 py-3">{t("table.tags")}</th>
            <th className="px-4 py-3">{t("table.accepted")}</th>
            <th className="px-4 py-3">{t("table.submissions")}</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {items.length === 0 ? (
            <tr>
              <td className="px-4 py-8 text-center text-sm font-medium text-slate-500" colSpan={6}>
                {t("problems.noResults")}
              </td>
            </tr>
          ) : null}
          {items.map((problem) => (
            <tr key={problem.id} className="transition hover:bg-sky-50/70">
              <td className="px-4 py-3 font-bold text-sky-700">{problem.id}</td>
              <td className="px-4 py-3">
                <Link className="font-semibold text-slate-950 transition hover:text-pink-600" href={`/problems/${problem.id}`}>
                  {locale === "zh-CN" ? problem.titleZh : problem.title}
                </Link>
              </td>
              <td className="px-4 py-3">
                <DifficultyBadge value={problem.difficulty} />
              </td>
              <td className="px-4 py-3">
                <div className="flex flex-wrap gap-1">
                  {problem.tags.map((tag) => (
                    <span key={tag} className="rounded-md bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-600">
                      {formatProblemTag(tag, locale)}
                    </span>
                  ))}
                </div>
              </td>
              <td className="px-4 py-3 font-medium text-emerald-700">{problem.accepted}</td>
              <td className="px-4 py-3 text-slate-600">{problem.submissions}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function DifficultyBadge({ value }: Readonly<{ value: string }>) {
  const className =
    value === "Expert"
      ? "bg-rose-50 text-rose-700"
      : value === "Hard"
        ? "bg-amber-50 text-amber-700"
        : value === "Medium"
          ? "bg-violet-50 text-violet-700"
          : "bg-emerald-50 text-emerald-700";

  return <span className={`rounded-md px-2 py-1 text-xs font-bold ${className}`}>{value}</span>;
}
