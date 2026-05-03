"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import Link from "next/link";
import { notFound, useParams } from "next/navigation";
import { Award, CalendarDays, Eye, Flame, Heart, MessageCircle, PencilLine, Save, Trophy, UserPlus } from "lucide-react";
import { RinMascot } from "@rin-oj/rin-ui";
import { OJShell } from "@/components/oj-shell";
import { VerdictBadge } from "@/components/verdict-badge";
import { judgements, userProfiles } from "@/lib/mock-oj-data";
import { useTranslation } from "@/lib/use-translation";

export default function UserProfilePage() {
  const params = useParams<{ username: string }>();
  const { locale, t } = useTranslation();
  const profile = userProfiles.find((item) => item.username === params.username);

  if (!profile) {
    notFound();
  }

  const recentJudgements = judgements.filter((judgement) => judgement.user === profile.username);

  return (
    <OJShell>
      <div className="mx-auto grid w-full max-w-7xl gap-5 px-4 py-5 sm:px-6 lg:grid-cols-[minmax(0,1fr)_360px] lg:px-8">
        <section className="rin-card overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm lg:col-span-2">
          <div className="rin-hero-strip px-5 py-5">
            <div className="flex flex-wrap items-end justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="rounded-2xl border border-white/80 bg-white/70 p-2 shadow-sm">
                  <RinMascot className="h-16 w-16" />
                </div>
                <div>
                  <div className="rin-kana-badge">{t("profile.title")}</div>
                  <h1 className="mt-2 text-3xl font-black text-slate-950">{profile.displayName}</h1>
                  <p className="mt-1 text-sm font-semibold text-pink-700">{locale === "zh-CN" ? profile.titleZh : profile.title}</p>
                </div>
              </div>
              <div className="grid gap-3">
                <p className="max-w-lg rounded-lg bg-white/65 px-3 py-2 text-sm font-medium text-slate-700">{locale === "zh-CN" ? profile.signatureZh : profile.signature}</p>
                <div className="flex flex-wrap gap-2">
                  <button className="rin-soft-button px-3 py-2 text-sm" type="button">
                    <UserPlus className="h-4 w-4" />
                    {locale === "zh-CN" ? "关注" : "Follow"}
                  </button>
                  <button className="rin-soft-button px-3 py-2 text-sm" type="button">
                    <MessageCircle className="h-4 w-4" />
                    {locale === "zh-CN" ? "私信" : "Message"}
                  </button>
                  <Link className="rin-soft-button px-3 py-2 text-sm" href={`/status?user=${profile.username}`}>
                    {locale === "zh-CN" ? "提交记录" : "Submissions"}
                  </Link>
                  <Link className="rin-soft-button px-3 py-2 text-sm" href="/discuss">
                    {locale === "zh-CN" ? "讨论与题解" : "Discuss"}
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="rin-card rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
          <div className="grid gap-3 sm:grid-cols-2">
            <ProfileMetric icon={<Trophy className="h-4 w-4" />} label={t("profile.rating")} value={profile.rating} />
            <ProfileMetric icon={<Award className="h-4 w-4" />} label={t("profile.solved")} value={profile.solved} />
            <ProfileMetric icon={<Heart className="h-4 w-4" />} label={t("profile.followers")} value={profile.followers} />
            <ProfileMetric icon={<Flame className="h-4 w-4" />} label={t("profile.streak")} value={`${profile.streak}d`} />
          </div>
        </section>

        <section className="rin-card rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
          <div className="text-sm font-bold text-slate-500">{t("profile.badges")}</div>
          <div className="mt-3 flex flex-wrap gap-2">
            {profile.badges.map((badge) => (
              <span key={badge} className="rounded-md border border-pink-100 bg-pink-50 px-2 py-1 text-xs font-bold text-pink-700">
                {badge}
              </span>
            ))}
          </div>
        </section>

        <section className="rin-card rounded-lg border border-slate-200 bg-white p-4 shadow-sm lg:col-span-2">
          <MarkdownProfileBio username={profile.username} displayName={profile.displayName} locale={locale} />
        </section>

        <section className="rin-card rounded-lg border border-slate-200 bg-white p-4 shadow-sm lg:col-span-2">
          <GitHubStyleHeatmap levels={profile.heatmap} locale={locale} lessLabel={t("profile.heatmapLess")} moreLabel={t("profile.heatmapMore")} />
        </section>

        <section className="rin-card rounded-lg border border-slate-200 bg-white p-4 shadow-sm lg:col-span-2">
          <div className="text-sm font-bold text-slate-500">{t("profile.recentSubmissions")}</div>
          <div className="mt-3 grid gap-2 md:grid-cols-2">
            {recentJudgements.map((judgement) => (
              <div key={`${judgement.when}-${judgement.problem}`} className="grid grid-cols-[1fr_auto] items-center gap-2 rounded-lg bg-white/70 px-3 py-2">
                <div>
                  <Link className="text-sm font-bold text-sky-700 hover:text-pink-600" href={`/problems/${judgement.problem}`}>
                    {judgement.problem}
                  </Link>
                  <div className="text-xs text-slate-500">
                    {judgement.lang} · {locale === "zh-CN" ? judgement.whenZh : judgement.when}
                  </div>
                </div>
                <VerdictBadge value={judgement.verdict} />
              </div>
            ))}
          </div>
        </section>
      </div>
    </OJShell>
  );
}

function MarkdownProfileBio({ username, displayName, locale }: Readonly<{ username: string; displayName: string; locale: string }>) {
  const storageKey = `rin-profile-bio:${username}`;
  const defaultBio =
    locale === "zh-CN"
      ? `## 关于 ${displayName}\n喜欢刷题、写题解和研究评测系统。\n\n- 常用语言：\`C++17\` / \`Go\`\n- 最近目标：稳定 AC 图论和 DP\n- 推荐入门题：P1001\n- 公式也可以写：$O(n \\log n)$`
      : `## About ${displayName}\nI enjoy problem solving, editorials, and judge systems.\n\n- Main languages: \`C++17\` / \`Go\`\n- Current goal: stable graph and DP practice\n- Starter problem: P1001\n- Inline math works: $O(n \\log n)$`;
  const [isEditing, setIsEditing] = useState(false);
  const [savedBio, setSavedBio] = useState(defaultBio);
  const [draftBio, setDraftBio] = useState(defaultBio);
  const previewHTML = useMemo(() => renderProfileMarkdown(savedBio), [savedBio]);

  useEffect(() => {
    const stored = window.localStorage.getItem(storageKey);
    if (stored) {
      setSavedBio(stored);
      setDraftBio(stored);
      return;
    }
    setSavedBio(defaultBio);
    setDraftBio(defaultBio);
  }, [defaultBio, storageKey]);

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 text-sm font-bold text-slate-500">
            <PencilLine className="h-4 w-4" />
            {locale === "zh-CN" ? "个人简介" : "Profile Bio"}
          </div>
          <h2 className="mt-1 text-2xl font-black text-slate-950">{locale === "zh-CN" ? "Markdown 简介" : "Markdown Bio"}</h2>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-black text-slate-700 shadow-sm hover:-translate-y-0.5 hover:bg-slate-50"
            onClick={() => setIsEditing((value) => !value)}
            type="button"
          >
            <Eye className="h-4 w-4" />
            {isEditing ? (locale === "zh-CN" ? "只看预览" : "Preview only") : locale === "zh-CN" ? "编辑简介" : "Edit bio"}
          </button>
          <button
            className="inline-flex items-center gap-2 rounded-lg bg-slate-950 px-3 py-2 text-sm font-black text-white shadow-sm hover:-translate-y-0.5 hover:bg-pink-600"
            onClick={() => {
              setSavedBio(draftBio);
              window.localStorage.setItem(storageKey, draftBio);
              setIsEditing(false);
            }}
            type="button"
          >
            <Save className="h-4 w-4" />
            {locale === "zh-CN" ? "保存" : "Save"}
          </button>
        </div>
      </div>

      <div className={`mt-4 grid gap-4 ${isEditing ? "xl:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)]" : ""}`}>
        {isEditing ? (
          <label className="grid gap-2 text-sm font-black text-slate-700">
            Markdown
            <textarea
              className="min-h-[260px] rounded-xl border border-slate-200 bg-white px-4 py-3 font-mono text-base leading-7 outline-none focus:border-pink-300 focus:ring-4 focus:ring-pink-100"
              value={draftBio}
              onChange={(event) => setDraftBio(event.target.value)}
            />
            <span className="text-xs font-semibold text-slate-500">{locale === "zh-CN" ? "支持标题、列表、粗体、代码块、行内公式和题号链接，例如 P1001。" : "Supports headings, lists, bold text, code blocks, inline math, and problem links such as P1001."}</span>
          </label>
        ) : null}

        <div className="min-h-[180px] rounded-xl border border-pink-100 bg-white/78 p-4">
          <div className="mb-3 text-sm font-black text-slate-500">{locale === "zh-CN" ? "预览" : "Preview"}</div>
          <div dangerouslySetInnerHTML={{ __html: previewHTML }} />
        </div>
      </div>
    </div>
  );
}

function ProfileMetric({ icon, label, value }: Readonly<{ icon: ReactNode; label: string; value: string | number }>) {
  return (
    <div className="rounded-lg border border-pink-100 bg-white/72 px-3 py-3">
      <div className="flex items-center gap-2 text-xs font-bold text-slate-500">
        {icon}
        {label}
      </div>
      <div className="mt-1 text-xl font-black text-slate-950">{value}</div>
    </div>
  );
}

function GitHubStyleHeatmap({ levels, locale, lessLabel, moreLabel }: Readonly<{ levels: number[]; locale: string; lessLabel: string; moreLabel: string }>) {
  const weeks = buildHeatmapWeeks(levels, locale);
  const monthLabels = heatmapMonthLabels(weeks, locale);
  const totalAC = weeks.flatMap((week) => week).reduce((sum, day) => sum + (day.inRange ? day.count : 0), 0);
  const years = [2026, 2025, 2024, 2023, 2022];

  return (
    <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_120px]">
      <div>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2 text-sm font-bold text-slate-500">
              <CalendarDays className="h-4 w-4" />
              {locale === "zh-CN" ? "AC 热力图" : "AC Heatmap"}
            </div>
            <h2 className="mt-1 text-2xl font-black text-slate-950">{locale === "zh-CN" ? `过去一年 ${totalAC} 次 AC` : `${totalAC} accepted submissions in the last year`}</h2>
          </div>
          <div className="text-sm font-semibold text-slate-500">{heatmapDateRange(locale)}</div>
        </div>

        <div className="mt-4 overflow-x-auto rounded-xl border border-slate-200 bg-white px-4 py-4">
          <div className="min-w-[850px]">
            <div className="grid grid-cols-[48px_1fr]">
              <div />
              <div className="relative h-5 text-sm font-medium text-slate-700">
                {monthLabels.map((month) => (
                  <span key={`${month.label}-${month.weekIndex}`} className="absolute top-0" style={{ left: `${month.weekIndex * 16}px` }}>
                    {month.label}
                  </span>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-[48px_1fr] gap-2">
              <div className="grid grid-rows-7 gap-[3px] pt-[1px] text-sm font-medium leading-[13px] text-slate-700">
                {weekdayLabels(locale).map((label, index) => (
                  <span key={`${label}-${index}`} className="h-[13px]">
                    {label}
                  </span>
                ))}
              </div>

              <div className="grid grid-flow-col grid-rows-7 gap-[3px]" style={{ gridTemplateColumns: `repeat(${weeks.length}, 13px)` }}>
                {weeks.flatMap((week) =>
                  week.map((day) => (
                    <span
                      key={day.date}
                      aria-label={day.label}
                      className={`h-[13px] w-[13px] rounded-[3px] border ${day.inRange ? "border-slate-200" : "border-transparent"}`}
                      style={{ backgroundColor: day.inRange ? heatColor(day.level) : "transparent" }}
                      title={day.label}
                    />
                  )),
                )}
              </div>
            </div>

            <div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-sm font-medium text-slate-500">
              <span>{locale === "zh-CN" ? "每个格子代表一天，悬停可查看日期和 AC 数。" : "Each square is one day. Hover to inspect the date and AC count."}</span>
              <div className="flex items-center gap-1">
                <span>{lessLabel}</span>
                {[0, 1, 2, 3, 4].map((level) => (
                  <span key={level} className="h-[13px] w-[13px] rounded-[3px] border border-slate-200" style={{ backgroundColor: heatColor(level) }} />
                ))}
                <span>{moreLabel}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="flex gap-2 overflow-x-auto xl:grid xl:content-start">
        {years.map((year) => (
          <button key={year} className={`rounded-lg px-4 py-3 text-left text-base font-semibold transition ${year === 2026 ? "bg-blue-600 text-white shadow-sm" : "text-slate-600 hover:bg-slate-100"}`} type="button">
            {year}
          </button>
        ))}
      </div>
    </div>
  );
}

function escapeProfileHTML(value: string) {
  return value.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;");
}

function linkProfileProblemIds(value: string) {
  return value.replace(/\bP\d{4}\b/g, (problemId) => `<a class="font-black text-sky-700 hover:text-pink-700" href="/problems/${problemId}">${problemId}</a>`);
}

function renderProfileInline(value: string) {
  return linkProfileProblemIds(
    escapeProfileHTML(value)
      .replace(/\*\*(.+?)\*\*/g, '<strong class="font-black text-slate-950">$1</strong>')
      .replace(/`([^`]+)`/g, '<code class="rounded bg-slate-100 px-1.5 py-0.5 font-mono text-pink-700">$1</code>')
      .replace(/\$([^$\n]+)\$/g, '<span class="rounded bg-pink-50 px-1.5 py-0.5 font-serif text-pink-700">$1</span>'),
  );
}

function renderProfileMarkdown(markdown: string) {
  const lines = markdown.split("\n");
  const html: string[] = [];
  let inCode = false;
  let codeLines: string[] = [];
  let inList = false;

  const closeList = () => {
    if (inList) {
      html.push("</ul>");
      inList = false;
    }
  };

  for (const line of lines) {
    if (line.startsWith("```")) {
      closeList();
      if (inCode) {
        html.push(`<pre class="my-3 overflow-x-auto rounded-xl bg-slate-950 p-4 text-sm leading-6 text-slate-100"><code>${escapeProfileHTML(codeLines.join("\n"))}</code></pre>`);
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
      closeList();
      html.push(`<h3 class="mt-3 text-xl font-black text-slate-950">${renderProfileInline(line.slice(3))}</h3>`);
      continue;
    }
    if (line.startsWith("- ")) {
      if (!inList) {
        html.push('<ul class="my-3 grid gap-1 pl-5 text-base leading-7 text-slate-700">');
        inList = true;
      }
      html.push(`<li class="list-disc">${renderProfileInline(line.slice(2))}</li>`);
      continue;
    }
    closeList();
    if (line.trim() === "") {
      html.push('<div class="h-2"></div>');
      continue;
    }
    html.push(`<p class="text-base leading-8 text-slate-700">${renderProfileInline(line)}</p>`);
  }

  closeList();
  if (codeLines.length > 0) {
    html.push(`<pre class="my-3 overflow-x-auto rounded-xl bg-slate-950 p-4 text-sm leading-6 text-slate-100"><code>${escapeProfileHTML(codeLines.join("\n"))}</code></pre>`);
  }
  return html.join("");
}

function heatColor(level: number) {
  return ["#ebedf0", "#9be9a8", "#40c463", "#30a14e", "#216e39"][level] ?? "#ebedf0";
}

type HeatmapDay = {
  date: string;
  label: string;
  level: number;
  count: number;
  inRange: boolean;
};

const heatmapEndDate = new Date(Date.UTC(2026, 4, 3));
const heatmapDayCount = 365;

function buildHeatmapWeeks(levels: number[], locale: string): HeatmapDay[][] {
  const rangeStart = addUTCDate(heatmapEndDate, -(heatmapDayCount - 1));
  const gridStart = addUTCDate(rangeStart, -rangeStart.getUTCDay());
  const gridEnd = addUTCDate(heatmapEndDate, 6 - heatmapEndDate.getUTCDay());
  const totalDays = daysBetweenUTC(gridStart, gridEnd) + 1;
  const days = Array.from({ length: totalDays }, (_, index) => {
    const date = addUTCDate(gridStart, index);
    const inRange = date >= rangeStart && date <= heatmapEndDate;
    const rangeIndex = Math.max(0, daysBetweenUTC(rangeStart, date));
    const level = inRange ? normalizedHeatLevel(levels, rangeIndex) : 0;
    const count = heatCount(level);
    const dateText = formatHeatmapDate(date, locale);
    const countText = locale === "zh-CN" ? `${count} 次 AC` : `${count} AC`;

    return {
      date: date.toISOString().slice(0, 10),
      label: `${dateText}: ${countText}`,
      level,
      count,
      inRange,
    };
  });

  const weeks: HeatmapDay[][] = [];
  for (let index = 0; index < days.length; index += 7) {
    weeks.push(days.slice(index, index + 7));
  }
  return weeks;
}

function heatmapDateRange(locale: string) {
  const startDate = addUTCDate(heatmapEndDate, -(heatmapDayCount - 1));
  return `${formatHeatmapDate(startDate, locale)} - ${formatHeatmapDate(heatmapEndDate, locale)}`;
}

function heatmapMonthLabels(weeks: HeatmapDay[][], locale: string) {
  return weeks.flatMap((week, weekIndex) => {
    const firstInMonth = week.find((day) => day.inRange && new Date(`${day.date}T00:00:00.000Z`).getUTCDate() <= 7);
    if (!firstInMonth) {
      return [];
    }
    const date = new Date(`${firstInMonth.date}T00:00:00.000Z`);
    const monthNumber = date.getUTCMonth();
    const previousWeekHasSameMonth = weeks[weekIndex - 1]?.some((day) => day.inRange && new Date(`${day.date}T00:00:00.000Z`).getUTCMonth() === monthNumber);
    if (previousWeekHasSameMonth) {
      return [];
    }
    return [{ weekIndex, label: new Intl.DateTimeFormat(locale, { month: "short", timeZone: "UTC" }).format(date) }];
  });
}

function normalizedHeatLevel(levels: number[], rangeIndex: number) {
  const source = levels[rangeIndex % levels.length] ?? 0;
  if ((rangeIndex + source) % 5 === 0) {
    return Math.min(4, source);
  }
  if ((rangeIndex + source) % 17 === 0) {
    return Math.min(4, source + 1);
  }
  return 0;
}

function heatCount(level: number) {
  return [0, 1, 2, 4, 7][level] ?? 0;
}

function weekdayLabels(locale: string) {
  return locale === "zh-CN" ? ["", "周一", "", "周三", "", "周五", ""] : ["", "Mon", "", "Wed", "", "Fri", ""];
}

function formatHeatmapDate(date: Date, locale: string) {
  return new Intl.DateTimeFormat(locale, {
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  }).format(date);
}

function addUTCDate(date: Date, days: number) {
  const next = new Date(date);
  next.setUTCDate(next.getUTCDate() + days);
  return next;
}

function daysBetweenUTC(start: Date, end: Date) {
  return Math.round((Date.UTC(end.getUTCFullYear(), end.getUTCMonth(), end.getUTCDate()) - Date.UTC(start.getUTCFullYear(), start.getUTCMonth(), start.getUTCDate())) / 86_400_000);
}
