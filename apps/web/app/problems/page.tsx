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
        <section className="rin-card overflow-hidden border border-slate-200/80">
          <div className="rin-card-head flex flex-wrap items-center justify-between gap-3 px-5 py-4">
            <div>
              <div className="flex items-center gap-2 text-sm font-semibold text-slate-500">
                <span className="rin-icon-tile rin-icon-tile--sky">
                  <BookOpen className="h-3.5 w-3.5" />
                </span>
                {t("problems.problemSet")}
              </div>
              <h1 className="mt-1 text-2xl font-black tracking-tight text-slate-950">{t("problems.allProblems")}</h1>
            </div>
            <div className="flex flex-wrap gap-2">
              <label className="rin-filter-field text-sm text-slate-600">
                <Search className="h-3.5 w-3.5 shrink-0 text-slate-400" />
                <input
                  className="w-44 placeholder:text-slate-400"
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder={t("problems.searchPlaceholder")}
                  value={query}
                />
              </label>
              <label className="rin-filter-field text-sm font-semibold text-slate-700">
                <Filter className="h-3.5 w-3.5 shrink-0 text-slate-400" />
                <select aria-label={t("problems.difficultyAll")} className="max-w-[10rem] cursor-pointer bg-transparent outline-none" onChange={(event) => setDifficulty(event.target.value)} value={difficulty}>
                  <option value="all">{t("problems.difficultyAll")}</option>
                  {difficulties.map((item) => (
                    <option key={item} value={item}>
                      {item}
                    </option>
                  ))}
                </select>
              </label>
              <label className="rin-filter-field text-sm font-semibold text-slate-700">
                <select aria-label={t("problems.tagAll")} className="max-w-[11rem] cursor-pointer bg-transparent outline-none" onChange={(event) => setTag(event.target.value)} value={tag}>
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
        </section>
      </div>
    </OJShell>
  );
}
