"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { BookMarked, Check, Plus, Search, Star } from "lucide-react";
import { OJShell } from "@/components/oj-shell";
import { useSessionStore } from "@/lib/use-session-store";
import { useTranslation } from "@/lib/use-translation";

type ProblemSet = {
  id: string;
  title: string;
  description: string;
  author: string;
  problemIds: string[];
  createdAt: string;
};

const storageKey = "rin-public-problemsets";
const defaultProblemSets: ProblemSet[] = [];

function readProblemSets() {
  if (typeof window === "undefined") {
    return defaultProblemSets;
  }

  try {
    return JSON.parse(window.localStorage.getItem(storageKey) ?? "[]") as ProblemSet[];
  } catch {
    return defaultProblemSets;
  }
}

function writeProblemSets(nextProblemSets: ProblemSet[]) {
  window.localStorage.setItem(storageKey, JSON.stringify(nextProblemSets));
}

function parseProblemIds(rawValue: string) {
  const tokens = rawValue
    .toUpperCase()
    .split(/[\s,，、]+/)
    .map((item) => item.trim())
    .filter(Boolean);
  return Array.from(new Set(tokens.filter((item) => /^P\d{4}$/.test(item))));
}

export default function ProblemSetsPage() {
  const { locale, t } = useTranslation();
  const isAuthenticated = useSessionStore((state) => state.isAuthenticated);
  const displayName = useSessionStore((state) => state.displayName);
  const [problemSets, setProblemSets] = useState<ProblemSet[]>([]);
  const [query, setQuery] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [problemIdText, setProblemIdText] = useState("");
  const selectedProblemIds = parseProblemIds(problemIdText);

  useEffect(() => {
    setProblemSets(readProblemSets());
  }, []);

  const filteredProblemSets = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    if (!normalizedQuery) {
      return problemSets;
    }

    return problemSets.filter((problemSet) =>
      [problemSet.title, problemSet.description, problemSet.author, ...problemSet.problemIds].join(" ").toLowerCase().includes(normalizedQuery),
    );
  }, [problemSets, query]);

  const createProblemSet = () => {
    if (!isAuthenticated) {
      return;
    }

    const normalizedTitle = title.trim();
    if (!normalizedTitle || selectedProblemIds.length === 0) {
      return;
    }

    const nextProblemSet: ProblemSet = {
      id: `set_${Date.now().toString(36)}`,
      title: normalizedTitle,
      description: description.trim(),
      author: displayName || "anonymous",
      problemIds: selectedProblemIds,
      createdAt: new Date().toLocaleDateString(locale === "zh-CN" ? "zh-CN" : "en-US"),
    };
    const nextProblemSets = [nextProblemSet, ...problemSets];
    setProblemSets(nextProblemSets);
    writeProblemSets(nextProblemSets);
    setTitle("");
    setDescription("");
    setProblemIdText("");
  };

  return (
    <OJShell>
      <div className="mx-auto grid w-full max-w-[1500px] gap-5 px-4 py-5 sm:px-6 lg:grid-cols-[minmax(0,1fr)_420px] lg:px-8">
        <section className="rin-hero-strip px-6 py-7 sm:px-8 lg:col-span-2">
          <div className="rin-hero-inner flex flex-wrap items-end justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="rin-icon-tile rin-icon-tile--violet">
                  <BookMarked className="h-3.5 w-3.5" aria-hidden />
                </span>
                <span className="text-xs font-black uppercase tracking-[0.12em] text-violet-800/90">Problem Sets</span>
              </div>
              <h1 className="mt-3 text-balance text-3xl font-black tracking-tight text-slate-950 sm:text-4xl">{locale === "zh-CN" ? "公开题单" : "Public Problem Sets"}</h1>
              <p className="mt-2 max-w-3xl text-[15px] font-medium leading-relaxed text-slate-600 sm:text-base">
                {locale === "zh-CN" ? "用户可以把题目整理成训练路线，创建后所有人都能看到。" : "Create training lists from problems. Once created, everyone on this site can see them."}
              </p>
            </div>
            <div className="rin-stat-pill rin-stat-pill--emerald px-5 py-3 text-sm font-black shadow-[0_6px_18px_rgba(58,45,88,0.06)]">
              {problemSets.length} {locale === "zh-CN" ? "个题单" : "sets"}
            </div>
          </div>
        </section>

        <section className="rin-card overflow-hidden border border-slate-200/80">
          <div className="rin-card-head flex flex-wrap items-center justify-between gap-3 px-4 py-3.5">
            <div className="flex items-center gap-2 text-sm font-bold text-slate-500">
              <span className="rin-icon-tile rin-icon-tile--violet">
                <BookMarked className="h-3.5 w-3.5" />
              </span>
              {locale === "zh-CN" ? "题单广场" : "Set Square"}
            </div>
            <label className="rin-filter-field min-h-[2.5rem] text-sm text-slate-600">
              <Search className="h-4 w-4 shrink-0 text-slate-400" />
              <input
                className="w-52 placeholder:text-slate-400"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder={locale === "zh-CN" ? "搜索题单/题号/作者" : "Search sets, IDs, authors"}
              />
            </label>
          </div>

          <div className="grid gap-3 p-4">
            {filteredProblemSets.length === 0 ? (
              <div className="rounded-xl border border-dashed border-slate-300/75 bg-gradient-to-b from-slate-50/90 to-white/85 px-4 py-12 text-center text-sm font-semibold text-slate-500 shadow-[inset_0_1px_0_rgba(255,255,255,0.85)]">
                {locale === "zh-CN" ? "还没有题单，右侧创建第一个吧。" : "No problem sets yet. Create the first one on the right."}
              </div>
            ) : null}
            {filteredProblemSets.map((problemSet) => (
              <article
                key={problemSet.id}
                className="rin-problem-section p-4 transition hover:-translate-y-0.5 hover:border-pink-200/70 hover:shadow-[0_14px_36px_rgba(58,45,88,0.09)]"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h2 className="text-xl font-black text-slate-950">{problemSet.title}</h2>
                    <p className="mt-1 text-sm font-semibold text-slate-500">
                      {problemSet.author} · {problemSet.createdAt} · {problemSet.problemIds.length} {locale === "zh-CN" ? "题" : "problems"}
                    </p>
                  </div>
                  <span className="rounded-full bg-pink-50 px-3 py-1 text-xs font-black text-pink-700">{locale === "zh-CN" ? "公开" : "Public"}</span>
                </div>
                {problemSet.description ? <p className="mt-3 text-sm font-medium leading-6 text-slate-600">{problemSet.description}</p> : null}
                <div className="mt-4 flex flex-wrap gap-2">
                  {problemSet.problemIds.map((problemId) => (
                    <Link key={problemId} className="rin-pill-problem text-sm transition hover:border-pink-200/90" href={`/problems/${problemId}`}>
                      {problemId}
                    </Link>
                  ))}
                </div>
              </article>
            ))}
          </div>
        </section>

        <aside className="rin-workbench-panel h-fit overflow-hidden rounded-xl p-0">
          <div className="rin-card-head px-5 py-4">
            <div className="flex items-center gap-2 text-sm font-black text-slate-600">
              <span className="rin-icon-tile rin-icon-tile--pink">
                <Star className="h-3.5 w-3.5" aria-hidden />
              </span>
              {locale === "zh-CN" ? "创建题单" : "Create Set"}
            </div>
          </div>
          <div className="p-5 pt-2">
            {!isAuthenticated ? (
              <div className="rounded-xl border border-amber-100/90 bg-amber-50/90 px-4 py-6 text-center text-sm font-semibold leading-relaxed text-amber-950 shadow-[inset_0_1px_0_rgba(255,255,255,0.85)]">
                <p>{t("problemsets.loginToCreate")}</p>
                <Link
                  className="mt-4 inline-flex rounded-xl bg-gradient-to-b from-slate-900 to-slate-950 px-5 py-2.5 text-sm font-black text-white shadow-md transition hover:from-pink-600 hover:to-pink-700"
                  href={`/login?next=${encodeURIComponent("/problemsets")}`}
                >
                  {locale === "zh-CN" ? "去登录" : "Sign in"}
                </Link>
              </div>
            ) : (
              <>
                <h2 className="mt-2 text-2xl font-black text-slate-950">{locale === "zh-CN" ? "整理一条训练路线" : "Build a training path"}</h2>
                <div className="mt-5 grid gap-4">
                  <label className="grid gap-2 text-sm font-bold text-slate-700">
                    {locale === "zh-CN" ? "题单名称" : "Title"}
                    <input
                      className="rounded-xl border border-slate-200/95 bg-gradient-to-b from-white to-slate-50/90 px-4 py-3 text-slate-900 shadow-[inset_0_1px_0_rgba(255,255,255,1),0_2px_10px_rgba(58,45,88,0.04)] outline-none transition focus:border-pink-300 focus:ring-4 focus:ring-pink-100/90"
                      value={title}
                      onChange={(event) => setTitle(event.target.value)}
                    />
                  </label>
                  <label className="grid gap-2 text-sm font-bold text-slate-700">
                    {locale === "zh-CN" ? "简介" : "Description"}
                    <textarea
                      className="min-h-28 rounded-xl border border-slate-200/95 bg-gradient-to-b from-white to-slate-50/90 px-4 py-3 text-slate-900 shadow-[inset_0_1px_0_rgba(255,255,255,1)] outline-none transition focus:border-pink-300 focus:ring-4 focus:ring-pink-100/90"
                      value={description}
                      onChange={(event) => setDescription(event.target.value)}
                    />
                  </label>
                  <label className="grid gap-2 text-sm font-bold text-slate-700">
                    {locale === "zh-CN" ? "题号" : "Problem IDs"}
                    <textarea
                      className="rin-discuss-code min-h-24 rounded-xl border border-slate-200/95 bg-gradient-to-b from-white to-slate-50/90 px-4 py-3 outline-none transition focus:border-sky-300 focus:ring-4 focus:ring-sky-100/90"
                      value={problemIdText}
                      onChange={(event) => setProblemIdText(event.target.value)}
                      placeholder="P1001 P1024 P2048"
                    />
                  </label>
                  <div className="rounded-xl border border-slate-200/70 bg-slate-50/90 px-4 py-3 text-sm font-semibold text-slate-600 shadow-[inset_0_1px_0_rgba(255,255,255,0.85)]">
                    {locale === "zh-CN" ? "已识别" : "Detected"}: {selectedProblemIds.length > 0 ? selectedProblemIds.join(", ") : locale === "zh-CN" ? "暂无有效题号" : "no valid problem IDs"}
                  </div>
                  <button
                    className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-b from-slate-900 via-slate-900 to-slate-950 px-5 py-3 text-base font-black text-white shadow-[0_6px_22px_rgba(15,10,30,0.22)] transition hover:-translate-y-0.5 hover:from-pink-600 hover:via-pink-700 hover:to-pink-800 hover:shadow-[0_10px_28px_rgba(219,39,119,0.28)] disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:translate-y-0"
                    type="button"
                    disabled={!title.trim() || selectedProblemIds.length === 0}
                    onClick={createProblemSet}
                  >
                    {title.trim() && selectedProblemIds.length > 0 ? <Check className="h-5 w-5" aria-hidden /> : <Plus className="h-5 w-5" aria-hidden />}
                    {locale === "zh-CN" ? "发布公开题单" : "Publish public set"}
                  </button>
                </div>
              </>
            )}
          </div>
        </aside>
      </div>
    </OJShell>
  );
}
