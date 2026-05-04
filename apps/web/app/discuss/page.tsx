"use client";

import Link from "next/link";
import { Bold, BookOpenText, CheckCircle2, Code2, Hash, Heart, MessageCircle, PenLine, Search, Send, Star } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { AnimatedSurface } from "@/components/animated-surface";
import { OJShell } from "@/components/oj-shell";
import { discussPosts, problems, type MockDiscussPost } from "@/lib/mock-oj-data";
import { useSessionStore } from "@/lib/use-session-store";
import { useTranslation } from "@/lib/use-translation";

type DiscussPost = MockDiscussPost;

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
      .replace(
        /`([^`]+)`/g,
        '<code class="rounded-md bg-slate-100/95 px-1.5 py-0.5 font-mono text-sm text-pink-800 ring-1 ring-slate-200/80">$1</code>',
      )
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
        html.push(`<pre class="rin-sample-pre rin-discuss-code my-3 overflow-x-auto p-4 text-base leading-7 text-slate-100"><code>${escapeHTML(codeLines.join("\n"))}</code></pre>`);
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
      html.push(
        `<div class="rin-problem-section my-3 border-pink-100/55 p-4 text-center font-serif text-lg text-pink-900 shadow-[inset_0_1px_0_rgba(255,255,255,0.92)]">${escapeHTML(line.slice(2, -2))}</div>`,
      );
      continue;
    }

    if (line.trim() === "") {
      html.push('<div class="h-2"></div>');
      continue;
    }

    html.push(`<p class="text-base leading-8 text-slate-700">${renderInline(line)}</p>`);
  }

  if (codeLines.length > 0) {
    html.push(`<pre class="rin-sample-pre rin-discuss-code my-3 overflow-x-auto p-4 text-base leading-7 text-slate-100"><code>${escapeHTML(codeLines.join("\n"))}</code></pre>`);
  }

  return html.join("");
}

function createExcerpt(markdown: string) {
  const line = markdown
    .split("\n")
    .map((item) => item.trim())
    .find((item) => item && !item.startsWith("#") && !item.startsWith("```"));
  return (line ?? markdown).slice(0, 120);
}

export default function DiscussPage() {
  const { locale, t } = useTranslation();
  const isAuthenticated = useSessionStore((s) => s.isAuthenticated);
  const sessionDisplay = useSessionStore((s) => s.displayName);
  const sessionActor = useSessionStore((s) => s.actorId);
  const [query, setQuery] = useState("");
  const [selectedProblemId, setSelectedProblemId] = useState("");
  const [problemQuery, setProblemQuery] = useState("");
  const [draftTitle, setDraftTitle] = useState("");
  const [draftBody, setDraftBody] = useState("");
  const [publishedPosts, setPublishedPosts] = useState<DiscussPost[]>([]);
  const [publishMessage, setPublishMessage] = useState("");
  const previewHTML = useMemo(() => renderMarkdownPreview(draftBody), [draftBody]);
  const allPosts = useMemo(() => [...publishedPosts, ...discussPosts], [publishedPosts]);
  const normalizedQuery = query.trim().toLowerCase();
  const visiblePosts = allPosts.filter((post) => {
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

  useEffect(() => {
    const requestedProblem = new URLSearchParams(window.location.search).get("problemId");
    if (requestedProblem) {
      setSelectedProblemId(requestedProblem);
      setProblemQuery(requestedProblem);
    }

    try {
      const savedPosts = window.localStorage.getItem("rin-discuss-posts");
      if (savedPosts) {
        setPublishedPosts(JSON.parse(savedPosts) as DiscussPost[]);
      }
    } catch {
      setPublishedPosts([]);
    }
  }, []);

  const insertSnippet = (snippet: string) => {
    setDraftBody((previous) => {
      const needsNl = previous.length > 0 && !previous.endsWith("\n");
      return `${previous}${needsNl ? "\n" : ""}${snippet}`;
    });
  };

  const publishPost = () => {
    if (!isAuthenticated) {
      setPublishMessage(t("discuss.loginToPublish"));
      return;
    }

    const title = draftTitle.trim();
    const body = draftBody.trim();
    const problemIdCandidate = selectedProblemId.trim() || problemQuery.trim();
    const problemId = /^P\d{4}$/i.test(problemIdCandidate) ? problemIdCandidate.toUpperCase() : "";

    if (!title || !body) {
      setPublishMessage(locale === "zh-CN" ? "标题和正文都要写喵。" : "Please add both a title and body.");
      return;
    }

    if (!problemId) {
      setPublishMessage(locale === "zh-CN" ? "请填写有效题号（如 P1001）。" : "Enter a valid problem id such as P1001.");
      return;
    }

    const authorLabel = (sessionDisplay.trim() || sessionActor).trim();

    const nextPost: DiscussPost = {
      id: `LOCAL-${Date.now()}`,
      type: "editorial",
      title,
      titleEn: title,
      author: authorLabel,
      problemId,
      createdAt: "just now",
      createdAtZh: "刚刚",
      replies: 0,
      likes: 0,
      excerpt: createExcerpt(body),
      excerptEn: createExcerpt(body),
      body,
    };
    const nextPosts = [nextPost, ...publishedPosts];
    setPublishedPosts(nextPosts);
    window.localStorage.setItem("rin-discuss-posts", JSON.stringify(nextPosts));
    setPublishMessage(locale === "zh-CN" ? "发布成功，已显示在讨论版顶部。" : "Published. It is now at the top of the board.");
    setQuery("");
    window.location.hash = "discussion-board";
  };

  return (
    <OJShell>
      <div className="mx-auto grid w-full max-w-[1880px] gap-5 px-4 py-5 lg:px-8">
        <AnimatedSurface id="discussion-board" className="rin-workbench-panel scroll-mt-28 overflow-hidden rounded-xl p-0">
          <div className="rin-card-head px-6 py-6 sm:px-8">
            <div className="flex flex-wrap items-end justify-between gap-4">
              <div>
                <div className="flex items-center gap-2 text-base font-bold text-slate-500">
                  <span className="rin-icon-tile rin-icon-tile--violet">
                    <MessageCircle className="h-3.5 w-3.5" aria-hidden />
                  </span>
                  Discuss
                </div>
                <h1 className="mt-3 text-4xl font-black tracking-tight text-slate-950">{locale === "zh-CN" ? "讨论版" : "Discussion Board"}</h1>
                <p className="mt-2 max-w-2xl text-lg font-semibold leading-relaxed text-slate-600">
                  {locale === "zh-CN" ? "发布题解、提问、分享 Markdown / LaTeX 笔记，题号会自动链接到题面。" : "Post editorials, questions, and Markdown / LaTeX notes with problem links."}
                </p>
              </div>
              <div className="flex w-full flex-wrap items-center gap-3 lg:w-auto lg:max-w-xl">
                <a
                  className="inline-flex flex-shrink-0 items-center justify-center gap-2 rounded-xl bg-gradient-to-b from-slate-900 to-slate-950 px-5 py-3 text-lg font-black text-white shadow-[0_8px_24px_rgba(15,10,30,0.22)] transition hover:-translate-y-0.5 hover:from-pink-600 hover:to-pink-700"
                  href="#new-editorial"
                >
                  <PenLine className="h-5 w-5" />
                  {locale === "zh-CN" ? "发布题解" : "Write Editorial"}
                </a>
                <label className="rin-filter-field min-h-[3rem] flex-1 py-1 text-lg font-semibold text-slate-700 lg:min-w-72">
                  <Search className="h-4 w-4 shrink-0 text-slate-400" aria-hidden />
                  <input
                    className="min-w-0 flex-1 py-2 placeholder:text-slate-400"
                    value={query}
                    onChange={(event) => setQuery(event.target.value)}
                    placeholder={locale === "zh-CN" ? "搜索题号 / 题解 / 用户" : "Search problem / editorial / user"}
                    aria-label={locale === "zh-CN" ? "搜索讨论" : "Search discussion"}
                  />
                </label>
              </div>
            </div>
          </div>

          <div className="grid gap-4 px-6 pb-8 pt-2 sm:px-8 xl:grid-cols-2">
            {visiblePosts.length === 0 ? (
              <div className="xl:col-span-2 rounded-2xl border border-dashed border-slate-200/90 bg-slate-50/60 px-6 py-14 text-center text-base font-semibold text-slate-500">
                {locale === "zh-CN" ? "暂无讨论帖。" : "No posts yet."}
              </div>
            ) : null}
            {visiblePosts.map((post) => (
              <article
                key={post.id}
                className="rin-problem-section p-5 transition hover:-translate-y-1 hover:shadow-[0_18px_42px_rgba(58,45,88,0.12)]"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      {post.type === "editorial" ? (
                        <span className="rin-chip">{locale === "zh-CN" ? "题解" : "Editorial"}</span>
                      ) : (
                        <span className="rin-chip-violet">{locale === "zh-CN" ? "提问" : "Question"}</span>
                      )}
                      <Link className="rin-pill-problem transition hover:text-pink-700" href={`/problems/${post.problemId}`}>
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

        <AnimatedSurface id="new-editorial" delay={0.08} className="rin-workbench-panel scroll-mt-28 overflow-hidden rounded-xl p-0">
          <div className="rin-card-head px-6 py-6 sm:px-8">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <div className="flex items-center gap-2 text-base font-black text-slate-500">
                  <span className="rin-icon-tile rin-icon-tile--pink">
                    <PenLine className="h-3.5 w-3.5" aria-hidden />
                  </span>
                  {locale === "zh-CN" ? "发布题解 / 讨论" : "Create Post"}
                </div>
                <h2 className="mt-2 text-3xl font-black tracking-tight text-slate-950 sm:text-4xl">{draftTitle}</h2>
                <p className="mt-2 max-w-2xl text-lg font-semibold text-slate-600">
                  {locale === "zh-CN" ? "搜索题号后关联题目，左侧写 Markdown，右侧实时预览。" : "Search a problem, write Markdown on the left, preview on the right."}
                </p>
              </div>
              <Link
                className="rounded-xl border border-sky-100 bg-gradient-to-b from-sky-50 to-white px-4 py-2 text-base font-black text-sky-700 shadow-sm ring-1 ring-sky-100/80 transition hover:-translate-y-px hover:text-pink-700"
                href={selectedProblemId ? `/problems/${selectedProblemId}` : "/problems"}
              >
                {selectedProblemId || "—"}
              </Link>
            </div>
          </div>

          {!isAuthenticated ? (
            <div className="border-b border-amber-100/80 bg-gradient-to-r from-amber-50/95 to-amber-50/40 px-6 py-3 text-sm font-semibold text-amber-950 sm:px-8">
              {t("discuss.loginToPublish")}{" "}
              <Link className="font-black text-sky-700 underline decoration-sky-200 underline-offset-2 hover:text-pink-700" href={`/login?next=${encodeURIComponent("/discuss")}`}>
                {locale === "zh-CN" ? "去登录" : "Sign in"}
              </Link>
            </div>
          ) : null}

          <div
            className={`grid gap-6 px-6 py-6 sm:px-8 xl:grid-cols-[minmax(0,0.96fr)_minmax(0,1.04fr)] ${!isAuthenticated ? "pointer-events-none select-none opacity-45" : ""}`}
          >
            <div className="grid content-start gap-4">
              <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)]">
                <label className="grid gap-2 text-base font-bold text-slate-700">
                  {locale === "zh-CN" ? "搜索题号" : "Search Problem"}
                  <span className="rin-filter-field min-h-[3rem] py-1 text-lg font-semibold">
                    <Search className="h-4 w-4 shrink-0 text-slate-400" aria-hidden />
                    <input
                      className="min-w-0 flex-1 py-2 placeholder:text-slate-400"
                      value={problemQuery}
                      onChange={(event) => setProblemQuery(event.target.value)}
                      placeholder={locale === "zh-CN" ? "题号或关键字" : "Problem id or keyword"}
                      aria-label={locale === "zh-CN" ? "搜索题目" : "Search problem"}
                      disabled={!isAuthenticated}
                    />
                  </span>
                </label>
                <label className="grid gap-2 text-base font-bold text-slate-700">
                  {locale === "zh-CN" ? "标题" : "Title"}
                  <input
                    className="w-full rounded-xl border border-slate-200/95 bg-gradient-to-b from-white to-slate-50/90 px-4 py-3 text-lg text-slate-900 shadow-[inset_0_1px_0_rgba(255,255,255,1),0_2px_10px_rgba(58,45,88,0.04)] outline-none transition focus:border-sky-300 focus:ring-4 focus:ring-sky-100/90"
                    value={draftTitle}
                    onChange={(event) => setDraftTitle(event.target.value)}
                    aria-label={locale === "zh-CN" ? "题解标题" : "Post title"}
                    disabled={!isAuthenticated}
                  />
                </label>
              </div>

              <div className="rin-problem-section grid gap-2 p-3">
                {problemMatches.length === 0 ? (
                  <div className="px-3 py-2 text-base font-semibold text-slate-500">{locale === "zh-CN" ? "没有匹配的题目" : "No matching problems"}</div>
                ) : (
                  problemMatches.map((problem) => (
                    <button
                      key={problem.id}
                      className={`grid grid-cols-[auto_1fr_auto] items-center gap-3 rounded-lg px-3 py-2 text-left transition ${
                        selectedProblemId === problem.id
                          ? "bg-pink-50/95 text-pink-900 shadow-sm ring-2 ring-pink-200/55"
                          : "hover:-translate-y-0.5 hover:bg-slate-50"
                      }`}
                      type="button"
                      disabled={!isAuthenticated}
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

              <div className="grid gap-2">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="text-base font-bold text-slate-700">Markdown / LaTeX</span>
                  <div className="flex flex-wrap gap-1.5">
                    <button
                      type="button"
                      className="rin-soft-button inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-black"
                      disabled={!isAuthenticated}
                      onClick={() => insertSnippet("**粗体**")}
                      title={locale === "zh-CN" ? "插入粗体" : "Insert bold"}
                    >
                      <Bold className="h-3.5 w-3.5" aria-hidden />
                      ** **
                    </button>
                    <button
                      type="button"
                      className="rin-soft-button inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-black"
                      disabled={!isAuthenticated}
                      onClick={() => insertSnippet("`code`")}
                      title={locale === "zh-CN" ? "插入行内代码" : "Inline code"}
                    >
                      <Code2 className="h-3.5 w-3.5" aria-hidden />
                      ` `
                    </button>
                    <button
                      type="button"
                      className="rin-soft-button inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-black"
                      disabled={!isAuthenticated}
                      onClick={() => insertSnippet("## ")}
                      title={locale === "zh-CN" ? "插入二级标题" : "Insert heading"}
                    >
                      <Hash className="h-3.5 w-3.5" aria-hidden />
                      ##
                    </button>
                  </div>
                </div>
                <textarea
                  className="rin-discuss-code min-h-[520px] rounded-xl border border-slate-200/95 bg-gradient-to-b from-white to-slate-50/40 px-5 py-4 text-lg leading-8 shadow-[inset_0_1px_0_rgba(255,255,255,1)] outline-none transition focus:border-sky-300 focus:ring-4 focus:ring-sky-100/90 sm:min-h-[560px]"
                  value={draftBody}
                  onChange={(event) => setDraftBody(event.target.value)}
                  aria-label={locale === "zh-CN" ? "Markdown 正文" : "Markdown body"}
                  disabled={!isAuthenticated}
                />
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <button
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-b from-slate-900 to-slate-950 px-5 py-3 text-lg font-black text-white shadow-[0_8px_24px_rgba(15,10,30,0.22)] transition hover:-translate-y-0.5 hover:from-pink-600 hover:to-pink-700 disabled:pointer-events-none disabled:opacity-40"
                  type="button"
                  disabled={!isAuthenticated}
                  onClick={publishPost}
                >
                  <Send className="h-5 w-5" aria-hidden />
                  {locale === "zh-CN" ? "发布题解" : "Publish Editorial"}
                </button>
                <a className="rin-soft-button px-4 py-3 text-base font-bold" href="#discussion-board">
                  <MessageCircle className="h-5 w-5" aria-hidden />
                  {locale === "zh-CN" ? "回到讨论版" : "Back to board"}
                </a>
                {publishMessage ? (
                  <span className="inline-flex items-center gap-2 rounded-xl border border-emerald-100 bg-emerald-50 px-4 py-3 text-base font-bold text-emerald-700">
                    <CheckCircle2 className="h-5 w-5" />
                    {publishMessage}
                  </span>
                ) : null}
              </div>
            </div>

            <div className="rin-problem-section flex flex-col overflow-hidden p-0">
              <div className="rin-card-head flex flex-wrap items-center justify-between gap-3 px-5 py-4">
                <div className="flex items-center gap-2 text-base font-black text-slate-500">
                  <span className="rin-icon-tile rin-icon-tile--pink">
                    <Star className="h-3.5 w-3.5" aria-hidden />
                  </span>
                  {locale === "zh-CN" ? "实时预览" : "Live Preview"}
                </div>
                <Link
                  className="rounded-lg border border-sky-100 bg-sky-50/90 px-3 py-1.5 text-sm font-black text-sky-700 ring-1 ring-sky-100/70 transition hover:text-pink-700"
                  href={selectedProblemId ? `/problems/${selectedProblemId}` : "/problems"}
                >
                  {selectedProblemId || "—"}
                </Link>
              </div>
              <div className="px-5 pb-6 pt-4 text-base leading-relaxed text-slate-800" dangerouslySetInnerHTML={{ __html: previewHTML }} />
            </div>
          </div>
        </AnimatedSurface>
      </div>
    </OJShell>
  );
}
