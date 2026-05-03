"use client";

import { useMemo, useState } from "react";
import { BookOpen, Filter, Search } from "lucide-react";
import { OJShell } from "@/components/oj-shell";
import { ProblemTable } from "@/components/problem-table";
import { problems } from "@/lib/mock-oj-data";
import { formatProblemTag, searchableProblemTagText } from "@/lib/problem-tags";
import { useTranslation } from "@/lib/use-translation";

export default function ProblemsPage() {
  const { locale, t } = useTranslation();
  const [query, setQuery] = useState("");
  const [difficulty, setDifficulty] = useState("all");
  const [tag, setTag] = useState("all");

  const difficulties = useMemo(() => Array.from(new Set(problems.map((problem) => problem.difficulty))), []);
  const tags = useMemo(() => Array.from(new Set(problems.flatMap((problem) => problem.tags))).sort(), []);
  const filteredProblems = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    return problems.filter((problem) => {
      const localizedTitle = locale === "zh-CN" ? problem.titleZh : problem.title;
      const searchable = [problem.id, problem.title, problem.titleZh, problem.difficulty, ...problem.tags.map(searchableProblemTagText)]
        .join(" ")
        .toLowerCase();

      return (
        (normalizedQuery.length === 0 || searchable.includes(normalizedQuery) || localizedTitle.toLowerCase().includes(normalizedQuery)) &&
        (difficulty === "all" || problem.difficulty === difficulty) &&
        (tag === "all" || problem.tags.includes(tag))
      );
    });
  }, [difficulty, locale, query, tag]);

  return (
    <OJShell>
      <div className="mx-auto grid w-full max-w-7xl gap-5 px-4 py-5 sm:px-6 lg:px-8">
        <section className="rounded-lg border border-slate-200 bg-white shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 px-4 py-3">
            <div>
              <div className="flex items-center gap-2 text-sm font-semibold text-slate-500">
                <BookOpen className="h-4 w-4" />
                {t("problems.problemSet")}
              </div>
              <h1 className="mt-1 text-2xl font-black text-slate-950">{t("problems.allProblems")}</h1>
            </div>
            <div className="flex flex-wrap gap-2">
              <label className="flex h-10 items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-600">
                <Search className="h-4 w-4" />
                <input
                  className="w-48 border-0 bg-transparent outline-none"
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder={t("problems.searchPlaceholder")}
                  value={query}
                />
              </label>
              <label className="inline-flex h-10 items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700">
                <Filter className="h-4 w-4" />
                <select className="bg-transparent outline-none" onChange={(event) => setDifficulty(event.target.value)} value={difficulty}>
                  <option value="all">{t("problems.difficultyAll")}</option>
                  {difficulties.map((item) => (
                    <option key={item} value={item}>
                      {item}
                    </option>
                  ))}
                </select>
              </label>
              <label className="inline-flex h-10 items-center rounded-lg border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700">
                <select className="bg-transparent outline-none" onChange={(event) => setTag(event.target.value)} value={tag}>
                  <option value="all">{t("problems.tagAll")}</option>
                  {tags.map((item) => (
                    <option key={item} value={item}>
                      {formatProblemTag(item, locale)}
                    </option>
                  ))}
                </select>
              </label>
            </div>
          </div>
          <ProblemTable items={filteredProblems} />
          <div className="flex items-center justify-between border-t border-slate-200 px-4 py-3 text-sm text-slate-600">
            <span>{t("problems.showingSeed", { count: filteredProblems.length, total: problems.length })}</span>
            <div className="flex gap-2">
              <button className="rounded-lg border border-slate-200 bg-white px-3 py-2 font-semibold" type="button">
                {t("problems.previous")}
              </button>
              <button className="rounded-lg border border-slate-200 bg-white px-3 py-2 font-semibold" type="button">
                {t("problems.next")}
              </button>
            </div>
          </div>
        </section>
      </div>
    </OJShell>
  );
}
