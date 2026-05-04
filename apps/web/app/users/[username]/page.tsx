"use client";

import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  Activity,
  Award,
  CalendarDays,
  Eye,
  Flame,
  Heart,
  MessageCircle,
  PencilLine,
  Save,
  Shield,
  Trophy,
  UserPlus,
} from "lucide-react";
import { RinMascot } from "@rin-oj/rin-ui";
import { OJShell } from "@/components/oj-shell";
import { VerdictBadge } from "@/components/verdict-badge";
import { getUserProfile } from "@/lib/gateway";
import { judgements, userProfiles } from "@/lib/mock-oj-data";
import { useSessionStore } from "@/lib/use-session-store";
import { useTranslation } from "@/lib/use-translation";

export default function UserProfilePage() {
  const params = useParams<{ username: string }>();
  const { locale, t } = useTranslation();
  const seededProfile = userProfiles.find((item) => item.username === params.username);
  const profile = seededProfile ?? createDefaultProfile(params.username);
  const sessionDisplayName = useSessionStore((state) => state.displayName);
  const sessionActorId = useSessionStore((state) => state.actorId);
  const isAuthenticated = useSessionStore((state) => state.isAuthenticated);
  const accountRole = useSessionStore((state) => state.accountRole);
  const currentAvatarUrl = useSessionStore((state) => state.avatarUrl);
  const setAccountProfile = useSessionStore((state) => state.setAccountProfile);
  const setSessionAvatarUrl = useSessionStore((state) => state.setAvatarUrl);
  const [sessionProfile, setSessionProfile] = useState<{
    userId?: string;
    username?: string;
    displayName?: string;
    role?: string;
  } | null>(null);
  const [viewedProfileRole, setViewedProfileRole] = useState<string | null>(null);
  const isOwnProfile =
    isAuthenticated &&
    (!seededProfile ||
      profile.username === sessionDisplayName ||
      profile.username === sessionActorId ||
      profile.username === sessionProfile?.userId ||
      profile.username === sessionProfile?.username ||
      profile.username === sessionProfile?.displayName);
  const profileExtras = profile as { showAdminTag?: boolean };
  const syncedAccountRole = sessionProfile?.role?.toLowerCase().trim() === "admin" ? "admin" : accountRole;
  const showAdminTag =
    viewedProfileRole?.toLowerCase().trim() === "admin" ||
    (isOwnProfile && syncedAccountRole === "admin") ||
    profileExtras.showAdminTag === true;

  const recentJudgements = judgements.filter((judgement) => judgement.user === profile.username);

  useEffect(() => {
    if (!isAuthenticated || !sessionActorId.trim()) {
      return;
    }

    let cancelled = false;
    getUserProfile(sessionActorId)
      .then((remoteProfile) => {
        if (cancelled) {
          return;
        }
        setSessionProfile({
          userId: remoteProfile.userId,
          username: remoteProfile.username,
          displayName: remoteProfile.displayName,
          role: remoteProfile.role,
        });
        setAccountProfile({
          displayName: remoteProfile.displayName || remoteProfile.username || sessionActorId,
          accountRole: remoteProfile.role,
          avatarUrl: remoteProfile.avatarUrl,
        });
      })
      .catch(() => {
        // Keep the cached session if the gateway is offline.
      });
    return () => {
      cancelled = true;
    };
  }, [isAuthenticated, sessionActorId, setAccountProfile]);

  useEffect(() => {
    if (!params.username.trim()) {
      return;
    }

    let cancelled = false;
    getUserProfile(params.username)
      .then((remoteProfile) => {
        if (cancelled) {
          return;
        }
        setViewedProfileRole(remoteProfile.role ?? null);
      })
      .catch(() => {
        if (!cancelled) {
          setViewedProfileRole(null);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [params.username]);

  return (
    <OJShell>
      <div className="mx-auto grid w-full max-w-7xl gap-5 px-4 py-5 sm:px-6 lg:grid-cols-[minmax(0,1fr)_360px] lg:px-8">
        <section className="relative overflow-hidden rounded-3xl border border-pink-100/80 bg-gradient-to-br from-pink-50/90 via-white to-sky-50/50 shadow-[0_24px_64px_rgba(58,45,88,0.07),inset_0_1px_0_rgba(255,255,255,0.95)] ring-1 ring-white/90 lg:col-span-2">
          <div
            className="pointer-events-none absolute -right-24 -top-24 h-64 w-64 rounded-full bg-gradient-to-br from-fuchsia-200/40 to-sky-200/30 blur-3xl"
            aria-hidden
          />
          <div
            className="pointer-events-none absolute -bottom-16 -left-12 h-48 w-48 rounded-full bg-gradient-to-tr from-pink-200/35 to-transparent blur-2xl"
            aria-hidden
          />
          <div className="relative rin-hero-strip border-0 bg-transparent px-5 py-7 shadow-none sm:px-8 sm:py-8">
            <div className="rin-hero-inner flex flex-wrap items-end justify-between gap-6">
              <div className="flex min-w-0 flex-1 flex-col gap-5 sm:flex-row sm:items-start">
                <ProfileAvatar
                  username={profile.username}
                  isOwnProfile={isOwnProfile}
                  sessionAvatarUrl={currentAvatarUrl}
                  setSessionAvatarUrl={setSessionAvatarUrl}
                  locale={locale}
                />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rin-icon-tile rin-icon-tile--amber">
                      <Award className="h-3.5 w-3.5" aria-hidden />
                    </span>
                    <span className="text-xs font-black uppercase tracking-[0.12em] text-pink-800/80">{t("profile.title")}</span>
                    {showAdminTag ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-gradient-to-r from-violet-600 via-fuchsia-600 to-pink-600 px-2.5 py-0.5 text-[10px] font-black uppercase tracking-[0.14em] text-white shadow-[0_2px_12px_rgba(139,92,246,0.35)]">
                        <Shield className="h-3 w-3 opacity-95" aria-hidden />
                        {t("profile.adminTag")}
                      </span>
                    ) : null}
                  </div>
                  <h1 className="mt-2.5 text-balance text-3xl font-black tracking-tight text-slate-950 sm:text-[2.15rem] sm:leading-tight">
                    {profile.displayName}
                  </h1>
                  <p className="mt-1.5 text-[15px] font-semibold text-pink-700/95">{locale === "zh-CN" ? profile.titleZh : profile.title}</p>
                </div>
              </div>
              <div className="grid w-full max-w-xl gap-4 sm:w-auto sm:min-w-[280px]">
                {(locale === "zh-CN" ? profile.signatureZh : profile.signature) ? (
                  <p className="rin-problem-section border-white/80 bg-white/55 px-4 py-3 text-sm font-medium leading-relaxed text-slate-700 shadow-[inset_0_1px_0_rgba(255,255,255,0.9)] backdrop-blur-sm">
                    {locale === "zh-CN" ? profile.signatureZh : profile.signature}
                  </p>
                ) : null}
                <div className="flex flex-wrap gap-2">
                  <button className="rin-soft-button px-3 py-2 text-sm" type="button">
                    <UserPlus className="h-4 w-4" />
                    {locale === "zh-CN" ? "关注" : "Follow"}
                  </button>
                  {isOwnProfile ? (
                    <button className="rin-soft-button cursor-not-allowed px-3 py-2 text-sm opacity-50" disabled type="button" title={locale === "zh-CN" ? "不能私信自己" : "Cannot message yourself"}>
                      <MessageCircle className="h-4 w-4" />
                      {locale === "zh-CN" ? "私信" : "Message"}
                    </button>
                  ) : (
                    <Link
                      className="rin-soft-button inline-flex items-center gap-1.5 px-3 py-2 text-sm"
                      href={`/messages?with=${encodeURIComponent(profile.username)}`}
                    >
                      <MessageCircle className="h-4 w-4" />
                      {locale === "zh-CN" ? "私信" : "Message"}
                    </Link>
                  )}
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

        <section className="rin-card border border-slate-200/80 p-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <ProfileMetric icon={<Trophy className="h-4 w-4" />} label={t("profile.rating")} value={profile.rating} />
            <ProfileMetric icon={<Award className="h-4 w-4" />} label={t("profile.solved")} value={profile.solved} />
            <ProfileMetric icon={<Heart className="h-4 w-4" />} label={t("profile.followers")} value={profile.followers} />
            <ProfileMetric icon={<Flame className="h-4 w-4" />} label={t("profile.streak")} value={`${profile.streak}d`} />
          </div>
        </section>

        <section className="rin-card border border-slate-200/80 p-4">
          <div className="text-sm font-bold text-slate-500">{t("profile.badges")}</div>
          <div className="mt-3 flex flex-wrap gap-2">
            {profile.badges.map((badge) => (
              <span key={badge} className="rin-chip">
                {badge}
              </span>
            ))}
          </div>
        </section>

        <section className="rin-card border border-slate-200/80 p-4 lg:col-span-2">
          <MarkdownProfileBio username={profile.username} displayName={profile.displayName} locale={locale} canEdit={isOwnProfile} />
        </section>

        <section className="rin-card border border-slate-200/80 p-4 lg:col-span-2">
          <GitHubStyleHeatmap levels={profile.heatmap} locale={locale} lessLabel={t("profile.heatmapLess")} moreLabel={t("profile.heatmapMore")} />
        </section>

        <section className="rin-card overflow-hidden border border-slate-200/80 lg:col-span-2">
          <div className="rin-card-head px-4 py-3.5">
            <div className="flex items-center gap-2 text-sm font-bold text-slate-500">
              <span className="rin-icon-tile rin-icon-tile--pink">
                <Activity className="h-3.5 w-3.5" aria-hidden />
              </span>
              {t("profile.recentSubmissions")}
            </div>
          </div>
          <div className="grid gap-2 p-4 md:grid-cols-2">
            {recentJudgements.length === 0 ? (
              <div className="rin-problem-section border-dashed border-slate-200/90 bg-slate-50/50 px-4 py-8 text-center text-sm font-medium text-slate-500 md:col-span-2">
                {t("status.noResults")}
              </div>
            ) : null}
            {recentJudgements.map((judgement) => (
              <div
                key={`${judgement.when}-${judgement.problem}`}
                className="rin-problem-section grid grid-cols-[1fr_auto] items-center gap-2 border-slate-200/70 p-3 transition hover:border-pink-200/60 hover:shadow-[0_10px_28px_rgba(58,45,88,0.07)]"
              >
                <div>
                  <Link className="rin-pill-problem text-xs font-black" href={`/problems/${judgement.problem}`}>
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

function createDefaultProfile(username: string) {
  return {
    username,
    displayName: username,
    title: "New Solver",
    titleZh: "新晋刷题者",
    rating: 1500,
    solved: 0,
    followers: 0,
    streak: 0,
    signature: "",
    signatureZh: "",
    badges: [],
    heatmap: Array.from({ length: 28 }, () => 0),
  };
}

function ProfileAvatar({
  username,
  isOwnProfile,
  sessionAvatarUrl,
  setSessionAvatarUrl,
  locale,
}: Readonly<{
  username: string;
  isOwnProfile: boolean;
  sessionAvatarUrl: string;
  setSessionAvatarUrl: (avatarUrl: string) => void;
  locale: string;
}>) {
  const storageKey = `rin-profile-avatar:${username}`;
  const [avatarUrl, setAvatarUrl] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const storedAvatar = window.localStorage.getItem(storageKey) ?? "";
    const nextAvatar = isOwnProfile ? sessionAvatarUrl || storedAvatar : storedAvatar;
    setAvatarUrl(nextAvatar);
  }, [isOwnProfile, sessionAvatarUrl, storageKey]);

  const saveAvatar = (nextAvatarUrl: string) => {
    const trimmed = nextAvatarUrl.trim();
    setAvatarUrl(trimmed);
    window.localStorage.setItem(storageKey, trimmed);
    if (isOwnProfile) {
      setSessionAvatarUrl(trimmed);
    }
  };

  const handleAvatarFile = (file: File | undefined) => {
    if (!file) {
      return;
    }

    const reader = new FileReader();
    reader.addEventListener("load", () => {
      if (typeof reader.result === "string") {
        saveAvatar(reader.result);
      }
    });
    reader.readAsDataURL(file);
  };

  const changeAvatarLabel = locale === "zh-CN" ? "点击更换头像" : "Click to change avatar";

  const avatarInner = (
    <>
      {avatarUrl ? <img className="h-full w-full rounded-xl object-cover" src={avatarUrl} alt={`${username} avatar`} /> : <RinMascot className="h-16 w-16" />}
    </>
  );

  return (
    <div className="grid gap-3">
      <input
        ref={fileInputRef}
        aria-label={changeAvatarLabel}
        className="sr-only"
        accept="image/*"
        type="file"
        tabIndex={-1}
        onChange={(event) => {
          handleAvatarFile(event.target.files?.[0]);
          event.target.value = "";
        }}
      />
      {isOwnProfile ? (
        <button
          type="button"
          className="rin-avatar-frame flex h-24 w-24 cursor-pointer items-center justify-center overflow-hidden rounded-2xl border border-white/90 bg-white/75 p-2 shadow-sm ring-pink-300/40 transition hover:border-pink-200/90 hover:shadow-md hover:ring-2 focus:outline-none focus-visible:ring-2 focus-visible:ring-pink-400"
          title={changeAvatarLabel}
          aria-label={changeAvatarLabel}
          onClick={() => fileInputRef.current?.click()}
        >
          {avatarInner}
        </button>
      ) : (
        <div className="rin-avatar-frame flex h-24 w-24 items-center justify-center overflow-hidden rounded-2xl border border-white/90 bg-white/75 p-2">{avatarInner}</div>
      )}
    </div>
  );
}

function MarkdownProfileBio({
  username,
  displayName,
  locale,
  canEdit,
}: Readonly<{ username: string; displayName: string; locale: string; canEdit: boolean }>) {
  const storageKey = `rin-profile-bio:${username}`;
  const defaultBio = "";
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

  useEffect(() => {
    if (!canEdit) {
      setIsEditing(false);
    }
  }, [canEdit]);

  return (
    <div>
        <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 text-sm font-bold text-slate-500">
            <span className="rin-icon-tile rin-icon-tile--pink">
              <PencilLine className="h-3.5 w-3.5" aria-hidden />
            </span>
            {locale === "zh-CN" ? "个人简介" : "Profile Bio"}
          </div>
          <h2 className="mt-1 text-2xl font-black text-slate-950">{locale === "zh-CN" ? "Markdown 简介" : "Markdown Bio"}</h2>
        </div>
        {canEdit ? (
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
              className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-b from-slate-900 to-slate-950 px-3 py-2 text-sm font-black text-white shadow-[0_4px_16px_rgba(15,10,30,0.22)] transition hover:-translate-y-0.5 hover:from-pink-600 hover:to-pink-700"
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
        ) : null}
      </div>

      <div className={`mt-4 grid gap-4 ${canEdit && isEditing ? "xl:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)]" : ""}`}>
        {canEdit && isEditing ? (
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

        <div className="rin-problem-section min-h-[180px] border-pink-100/50 p-4">
          <div className="mb-3 text-sm font-black text-slate-500">{locale === "zh-CN" ? "预览" : "Preview"}</div>
          {savedBio.trim() ? (
            <div dangerouslySetInnerHTML={{ __html: previewHTML }} />
          ) : (
            <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50/80 px-4 py-8 text-center text-sm font-semibold text-slate-500">
              {canEdit
                ? locale === "zh-CN"
                  ? "还没有个人简介，点击“编辑简介”来写一点东西。"
                  : "No bio yet. Click Edit bio to add one."
                : locale === "zh-CN"
                  ? "暂无简介。"
                  : "No bio yet."}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function ProfileMetric({ icon, label, value }: Readonly<{ icon: ReactNode; label: string; value: string | number }>) {
  return (
    <div className="rounded-xl border border-pink-100/55 bg-gradient-to-b from-white/98 to-pink-50/35 px-3 py-3 shadow-[inset_0_1px_0_rgba(255,255,255,1),0_6px_20px_rgba(58,45,88,0.05)] ring-1 ring-white/80 transition hover:-translate-y-px hover:shadow-[0_10px_28px_rgba(236,72,153,0.08)]">
      <div className="flex items-start gap-2.5">
        <span className="rin-icon-tile rin-icon-tile--sky mt-0.5 h-8 w-8 shrink-0 rounded-xl [&>svg]:h-3.5 [&>svg]:w-3.5">{icon}</span>
        <div className="min-w-0 flex-1">
          <div className="text-[11px] font-bold uppercase tracking-wide text-slate-500">{label}</div>
          <div className="mt-1 text-xl font-black tabular-nums tracking-tight text-slate-950">{value}</div>
        </div>
      </div>
    </div>
  );
}

/** Product timeline starts at 2026; no selector entries for earlier calendar years. */
const HEATMAP_FIRST_YEAR = 2026;

function heatmapSelectableYears(): number[] {
  const now = new Date().getUTCFullYear();
  if (now < HEATMAP_FIRST_YEAR) {
    return [HEATMAP_FIRST_YEAR];
  }
  return Array.from({ length: now - HEATMAP_FIRST_YEAR + 1 }, (_, index) => HEATMAP_FIRST_YEAR + index);
}

function GitHubStyleHeatmap({ levels, locale, lessLabel, moreLabel }: Readonly<{ levels: number[]; locale: string; lessLabel: string; moreLabel: string }>) {
  const weeks = buildHeatmapWeeks(levels, locale);
  const monthLabels = heatmapMonthLabels(weeks, locale);
  const totalAC = weeks.flatMap((week) => week).reduce((sum, day) => sum + (day.inRange ? day.count : 0), 0);
  const years = useMemo(() => heatmapSelectableYears(), []);
  const [selectedYear, setSelectedYear] = useState(() => years[years.length - 1] ?? HEATMAP_FIRST_YEAR);
  const showYearRail = years.length > 1;

  return (
    <div className={`grid gap-4 ${showYearRail ? "xl:grid-cols-[minmax(0,1fr)_120px]" : ""}`}>
      <div>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2 text-sm font-bold text-slate-500">
              <span className="rin-icon-tile rin-icon-tile--emerald">
                <CalendarDays className="h-3.5 w-3.5" aria-hidden />
              </span>
              {locale === "zh-CN" ? "AC 热力图" : "AC Heatmap"}
            </div>
            <h2 className="mt-1 text-2xl font-black text-slate-950">{locale === "zh-CN" ? `过去一年 ${totalAC} 次 AC` : `${totalAC} accepted submissions in the last year`}</h2>
          </div>
          <div className="text-sm font-semibold text-slate-500">{heatmapDateRange(locale)}</div>
        </div>

        <div className="rin-problem-section mt-4 overflow-x-auto px-4 py-4">
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

      {showYearRail ? (
        <div className="flex gap-2 overflow-x-auto xl:grid xl:content-start">
          {years.map((year) => (
            <button
              key={year}
              className={`rounded-lg px-4 py-3 text-left text-base font-semibold transition ${
                year === selectedYear
                  ? "bg-gradient-to-b from-slate-900 to-slate-950 text-white shadow-[0_2px_10px_rgba(15,10,30,0.22),inset_0_1px_0_rgba(255,255,255,0.12)]"
                  : "text-slate-600 hover:bg-slate-100"
              }`}
              type="button"
              onClick={() => setSelectedYear(year)}
            >
              {year}
            </button>
          ))}
        </div>
      ) : null}
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

const heatmapDayCount = 365;

/** Rolling window ends on today's calendar date (UTC), so the range label never reads backwards across year boundaries. */
function getHeatmapEndDate(): Date {
  const n = new Date();
  return new Date(Date.UTC(n.getUTCFullYear(), n.getUTCMonth(), n.getUTCDate()));
}

function buildHeatmapWeeks(levels: number[], locale: string): HeatmapDay[][] {
  const heatmapEndDate = getHeatmapEndDate();
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
  const endDate = getHeatmapEndDate();
  const startDate = addUTCDate(endDate, -(heatmapDayCount - 1));
  if (locale === "zh-CN") {
    return `${startDate.getUTCFullYear()}年${startDate.getUTCMonth() + 1}月${startDate.getUTCDate()}日 – ${endDate.getUTCFullYear()}年${endDate.getUTCMonth() + 1}月${endDate.getUTCDate()}日`;
  }
  const opts: Intl.DateTimeFormatOptions = { year: "numeric", month: "short", day: "numeric", timeZone: "UTC" };
  return `${new Intl.DateTimeFormat(locale, opts).format(startDate)} – ${new Intl.DateTimeFormat(locale, opts).format(endDate)}`;
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
    year: "numeric",
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
