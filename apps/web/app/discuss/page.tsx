"use client";

import Link from "next/link";
import { BookOpenText, Heart, MessageCircle, PenLine, Search, Sparkles } from "lucide-react";
import { useMemo, useState } from "react";
import { AnimatedSurface } from "@/components/animated-surface";
import { OJShell } from "@/components/oj-shell";
import { discussPosts, problems } from "@/lib/mock-oj-data";
import { useTranslation } from "@/lib/use-translation";

function escapeHTML(value: string) {
  return value.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;");
}

function linkProblemIds(value: string) {
  return value.replace(/\bP\d{4}\b/g, (problemId) => `<a class="font-black text-sky-700 hover:text-pink-700" href="/problems/${problemId}">${problemId}</a>`);
}

function renderInline(value: string) {
  return linkProblemIds(
    escapeHTML(value)
      .replace(/\*\*(.+?)\*\*/g, '<strong class="font-black text-slate-950">$1</strong>')
      .replace(/`([^`]+)`/g, '<code class="rounded bg-slate-100 px-1.5 py-0.5 font-mono text-pink-700">$1</code>')
      .replace(/\$([^$\n]+)\$/g, '<span class="rounded bg-pink-50 px-1.5 py-0.5 font-serif text-pink-700">$1</span>'),
  );
}

function renderMarkdownPreview(markdown: string) {
  const lines = markdown.split("\n");
  const html: string[] = [];
  let inCode = false;
  let codeLines: string[] = [];

  for (const line of lines) {
    if (line.startsWith("```")) {
      if (inCode) {
        html.push(`<pre class="my-3 overflow-x-auto rounded-xl bg-slate-950 p-4 text-base leading-7 text-slate-100"><code>${escapeHTML(codeLines.join("\n"))}</code></pre>`);
        codeLines = [];
      }
      inCode = !inCode;
      continue;
    }

    if (inCode) {
      codeLines.push(line);
      continue;
    }

    if (line.startsWith("## ")) {
      html.push(`<h3 class="mt-4 text-xl font-black text-slate-950">${renderInline(line.slice(3))}</h3>`);
      continue;
    }

    if (line.startsWith("$$") && line.endsWith("$$") && line.length > 4) {
      html.push(`<div class="my-3 rounded-xl border border-pink-100 bg-pink-50/80 p-4 text-center font-serif text-lg text-pink-800">${escapeHTML(line.slice(2, -2))}</div>`);
      continue;
    }

    if (line.trim() === "") {
      html.push('<div class="h-2"></div>');
      continue;
    }

    html.push(`<p class="text-base leading-8 text-slate-700">${renderInline(line)}</p>`);
  }

  if (codeLines.length > 0) {
    html.push(`<pre class="my-3 overflow-x-auto rounded-xl bg-slate-950 p-4 text-base leading-7 text-slate-100"><code>${escapeHTML(codeLines.join("\n"))}</code></pre>`);
  }

  return html.join("");
}

export default function DiscussPage() {
  const { locale } = useTranslation();
  const [query, setQuery] = useState("");
  const [selectedProblemId, setSelectedProblemId] = useState("P1001");
  const [problemQuery, setProblemQuery] = useState("P1001");
  const [draftTitle, setDraftTitle] = useState(locale === "zh-CN" ? "我的题解标题" : "My editorial title");
  const [draftBody, setDraftBody] = useState("## 思路\n这里写 Markdown，支持 `代码`、$a+b$ 和题号 P1001。\n\n```cpp\ncout << ans << '\\n';\n```");
  const previewHTML = useMemo(() => renderMarkdownPreview(draftBody), [draftBody]);
  const normalizedQuery = query.trim().toLowerCase();
  const visiblePosts = discussPosts.filter((post) => {
    const title = locale === "zh-CN" ? post.title : post.titleEn;
    const excerpt = locale === "zh-CN" ? post.excerpt : post.excerptEn;
    return !normalizedQuery || `${title} ${excerpt} ${post.problemId} ${post.author}`.toLowerCase().includes(normalizedQuery);
  });
  const problemMatches = problems
    .filter((problem) => {
      const title = locale === "zh-CN" ? problem.titleZh : problem.title;
      return `${problem.id} ${title} ${problem.tags.join(" ")}`.toLowerCase().includes(problemQuery.trim().toLowerCase());
    })
    .slice(0, 8);

  return (
    <OJShell>
      <div className="mx-auto grid w-full max-w-[1880px] gap-5 px-4 py-5 lg:px-8">
        <AnimatedSurface className="rin-workbench-panel rounded-xl p-6">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-pink-100 bg-white/70 px-3 py-1 text-sm font-black text-pink-700">
                <MessageCircle className="h-4 w-4" />
                Discuss
              </div>
              <h1 className="mt-3 text-4xl font-black text-slate-950">{locale === "zh-CN" ? "讨论版" : "Discussion Board"}</h1>
              <p className="mt-2 text-lg font-semibold text-slate-600">
                {locale === "zh-CN" ? "发布题解、提问、分享 Markdown / LaTeX 笔记，并把题号自动连到题面。" : "Post editorials, questions, and Markdown / LaTeX notes with problem links."}
              </p>
            </div>
            <div className="flex w-full flex-wrap items-center gap-3 lg:w-auto">
              <a className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-950 px-5 py-3 text-lg font-black text-white shadow-sm transition hover:-translate-y-0.5 hover:bg-pink-600" href="#new-editorial">
                <PenLine className="h-5 w-5" />
                {locale === "zh-CN" ? "发布题解" : "Write Editorial"}
              </a>
              <label className="relative w-full min-w-72 lg:w-96">
                <Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
                <input
                  className="w-full rounded-xl border border-slate-200 bg-white px-12 py-3 text-lg font-semibold outline-none focus:border-pink-300"
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder={locale === "zh-CN" ? "搜索题号 / 题解 / 用户" : "Search problem / editorial / user"}
                />
              </label>
            </div>
          </div>

          <div className="mt-6 grid gap-4 xl:grid-cols-2">
            {visiblePosts.map((post) => (
              <article key={post.id} className="rounded-xl border border-pink-100/80 bg-white/82 p-5 shadow-sm transition hover:-translate-y-1 hover:border-pink-200 hover:shadow-[0_18px_42px_rgba(58,45,88,0.10)]">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="rounded-lg bg-pink-50 px-2.5 py-1 text-sm font-black text-pink-700">{post.type === "editorial" ? (locale === "zh-CN" ? "题解" : "Editorial") : locale === "zh-CN" ? "提问" : "Question"}</span>
                      <Link className="rounded-lg bg-sky-50 px-2.5 py-1 text-sm font-black text-sky-700 hover:text-pink-700" href={`/problems/${post.problemId}`}>
                        {post.problemId}
                      </Link>
                    </div>
                    <h2 className="mt-3 text-2xl font-black text-slate-950">{locale === "zh-CN" ? post.title : post.titleEn}</h2>
                    <p className="mt-2 text-base leading-7 text-slate-600" dangerouslySetInnerHTML={{ __html: renderInline(locale === "zh-CN" ? post.excerpt : post.excerptEn) }} />
                  </div>
                  <div className="text-right text-sm font-bold text-slate-500">
                    <Link className="text-slate-950 hover:text-pink-700" href={`/users/${post.author}`}>
                      {post.author}
                    </Link>
                    <div>{locale === "zh-CN" ? post.createdAtZh : post.createdAt}</div>
                  </div>
                </div>
                <div className="mt-4 flex flex-wrap items-center gap-4 text-sm font-bold text-slate-500">
                  <span className="inline-flex items-center gap-1">
                    <MessageCircle className="h-4 w-4" />
                    {post.replies}
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <Heart className="h-4 w-4" />
                    {post.likes}
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <BookOpenText className="h-4 w-4" />
                    Markdown / LaTeX
                  </span>
                </div>
              </article>
            ))}
          </div>
        </AnimatedSurface>

        <AnimatedSurface id="new-editorial" delay={0.08} className="rin-workbench-panel scroll-mt-28 rounded-xl p-6">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 text-base font-black text-slate-500">
                <PenLine className="h-5 w-5" />
                {locale === "zh-CN" ? "发布题解 / 讨论" : "Create Post"}
              </div>
              <h2 className="mt-2 text-4xl font-black text-slate-950">{draftTitle}</h2>
              <p className="mt-2 text-lg font-semibold text-slate-600">
                {locale === "zh-CN" ? "搜索题号后关联题目，左侧写 Markdown，右侧实时预览。" : "Search a problem, write Markdown on the left, preview on the right."}
              </p>
            </div>
            <Link className="rounded-xl bg-sky-50 px-4 py-2 text-base font-black text-sky-700 hover:text-pink-700" href={`/problems/${selectedProblemId}`}>
              {selectedProblemId}
            </Link>
          </div>

          <div className="mt-5 grid gap-5 xl:grid-cols-[minmax(0,0.96fr)_minmax(0,1.04fr)]">
            <div className="grid content-start gap-4">
              <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)]">
                <label className="relative grid gap-2 text-base font-bold text-slate-700">
                  {locale === "zh-CN" ? "搜索题号" : "Search Problem"}
                  <Search className="pointer-events-none absolute left-4 top-[3.45rem] h-5 w-5 text-slate-400" />
                  <input
                    className="rounded-xl border border-slate-200 bg-white px-12 py-3 text-lg outline-none focus:border-pink-300"
                    value={problemQuery}
                    onChange={(event) => setProblemQuery(event.target.value)}
                    placeholder="P1001 / A+B / math"
                  />
                </label>
                <label className="grid gap-2 text-base font-bold text-slate-700">
                  {locale === "zh-CN" ? "标题" : "Title"}
                  <input className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-lg" value={draftTitle} onChange={(event) => setDraftTitle(event.target.value)} />
                </label>
              </div>

              <div className="grid gap-2 rounded-xl border border-slate-200 bg-white/70 p-3">
                {problemMatches.length === 0 ? (
                  <div className="px-3 py-2 text-base font-semibold text-slate-500">{locale === "zh-CN" ? "没有匹配的题目" : "No matching problems"}</div>
                ) : (
                  problemMatches.map((problem) => (
                    <button
                      key={problem.id}
                      className={`grid grid-cols-[auto_1fr_auto] items-center gap-3 rounded-lg px-3 py-2 text-left transition ${
                        selectedProblemId === problem.id ? "bg-pink-50 text-pink-800 shadow-sm" : "hover:-translate-y-0.5 hover:bg-slate-50"
                      }`}
                      type="button"
                      onClick={() => {
                        setSelectedProblemId(problem.id);
                        setProblemQuery(problem.id);
                      }}
                    >
                      <span className="font-black text-sky-700">{problem.id}</span>
                      <span className="truncate text-base font-bold text-slate-800">{locale === "zh-CN" ? problem.titleZh : problem.title}</span>
                      <span className="rounded-md bg-slate-100 px-2 py-1 text-xs font-black text-slate-500">{problem.difficulty}</span>
                    </button>
                  ))
                )}
              </div>

              <label className="grid gap-2 text-base font-bold text-slate-700">
                Markdown / LaTeX
                <textarea
                  className="min-h-[560px] rounded-xl border border-slate-200 bg-white px-5 py-4 font-mono text-lg leading-8 outline-none focus:border-pink-300"
                  value={draftBody}
                  onChange={(event) => setDraftBody(event.target.value)}
                />
              </label>
              <button className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-950 px-5 py-3 text-lg font-black text-white shadow-sm transition hover:-translate-y-0.5 hover:bg-pink-600" type="button">
                <Sparkles className="h-5 w-5" />
                {locale === "zh-CN" ? "发布预览" : "Preview Post"}
              </button>
            </div>

            <div className="rounded-xl border border-pink-100 bg-white/78 p-5">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-pink-100 pb-3">
                <div className="text-base font-black text-slate-500">{locale === "zh-CN" ? "实时预览" : "Live Preview"}</div>
                <Link className="rounded-lg bg-sky-50 px-3 py-1.5 text-sm font-black text-sky-700 hover:text-pink-700" href={`/problems/${selectedProblemId}`}>
                  {selectedProblemId}
                </Link>
              </div>
              <div className="mt-4" dangerouslySetInnerHTML={{ __html: previewHTML }} />
            </div>
          </div>
        </AnimatedSurface>
      </div>
    </OJShell>
  );
}
