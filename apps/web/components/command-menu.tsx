"use client";

import { useRouter } from "next/navigation";
import { Building2, Calendar, Flag, Home, LayoutGrid, ListChecks, MessageCircle, Search, Star, Trophy } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { contests, navItems, problems } from "@/lib/mock-oj-data";
import { useCommandMenuStore } from "@/lib/use-command-menu-store";
import { useTranslation } from "@/lib/use-translation";

type RouteRow = {
  id: string;
  label: string;
  href: string;
  icon: typeof Home;
};

export function CommandMenu() {
  const router = useRouter();
  const { locale, t } = useTranslation();
  const open = useCommandMenuStore((s) => s.open);
  const setOpen = useCommandMenuStore((s) => s.setOpen);
  const [query, setQuery] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const [active, setActive] = useState(0);

  const routeEntries = useMemo<RouteRow[]>(() => {
    const iconMap: Record<string, typeof Home> = {
      "/problems": LayoutGrid,
      "/favorites": Star,
      "/problemsets": Building2,
      "/contests": Trophy,
      "/status": ListChecks,
      "/ranking": Flag,
      "/discuss": MessageCircle,
    };
    const home: RouteRow = {
      id: "route-home",
      label: locale === "zh-CN" ? "首页" : "Home",
      href: "/",
      icon: Home,
    };
    const navMapped = navItems.map((item) => ({
      id: `route-${item.href}`,
      label: t(item.labelKey),
      href: item.href,
      icon: iconMap[item.href] ?? LayoutGrid,
    }));
    return [home, ...navMapped];
  }, [locale, t]);

  const problemEntries = useMemo(() => {
    const q = query.trim().toLowerCase();
    return problems
      .map((p) => ({
        id: p.id,
        title: locale === "zh-CN" ? p.titleZh : p.title,
        href: `/problems/${p.id}`,
        problemId: p.id,
        tags: p.tags.join(" "),
      }))
      .filter((p) => {
        if (!q) {
          return true;
        }
        return `${p.problemId} ${p.title} ${p.tags}`.toLowerCase().includes(q);
      })
      .slice(0, 12);
  }, [locale, query]);

  const contestEntries = useMemo(() => {
    const q = query.trim().toLowerCase();
    return contests
      .map((c) => ({
        id: c.id,
        title: locale === "zh-CN" ? c.titleZh : c.title,
        href: `/contests/${c.id}`,
      }))
      .filter((c) => !q || `${c.id} ${c.title}`.toLowerCase().includes(q))
      .slice(0, 6);
  }, [locale, query]);

  const routeCount = routeEntries.length;
  const problemCount = problemEntries.length;
  const totalFlat = routeCount + problemCount + contestEntries.length;

  const navigateTo = useCallback(
    (href: string) => {
      setOpen(false);
      setQuery("");
      router.push(href);
    },
    [router, setOpen],
  );

  const navigateFlat = useCallback(
    (flatIndex: number) => {
      if (flatIndex < routeCount) {
        navigateTo(routeEntries[flatIndex]?.href ?? "/");
        return;
      }
      const pi = flatIndex - routeCount;
      if (pi < problemCount) {
        navigateTo(problemEntries[pi]?.href ?? "/problems");
        return;
      }
      const ci = flatIndex - routeCount - problemCount;
      navigateTo(contestEntries[ci]?.href ?? "/contests");
    },
    [contestEntries, navigateTo, problemCount, problemEntries, routeCount, routeEntries],
  );

  useEffect(() => {
    setActive(0);
  }, [query, open]);

  useEffect(() => {
    if (!open) {
      return;
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        setOpen(false);
        setQuery("");
      }
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setActive((i) => Math.min(i + 1, Math.max(0, totalFlat - 1)));
      }
      if (e.key === "ArrowUp") {
        e.preventDefault();
        setActive((i) => Math.max(0, i - 1));
      }
      if (e.key === "Enter" && totalFlat > 0) {
        e.preventDefault();
        navigateFlat(active);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [active, navigateFlat, open, setOpen, totalFlat]);

  useEffect(() => {
    const openPalette = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        useCommandMenuStore.getState().toggle();
      }
    };
    window.addEventListener("keydown", openPalette);
    return () => window.removeEventListener("keydown", openPalette);
  }, []);

  useEffect(() => {
    if (open) {
      window.setTimeout(() => inputRef.current?.focus(), 10);
    }
  }, [open]);

  if (!open) {
    return null;
  }

  const flatIdxRoute = (i: number) => i;
  const flatIdxProblem = (i: number) => routeCount + i;
  const flatIdxContest = (i: number) => routeCount + problemCount + i;

  return (
    <div className="fixed inset-0 z-[80] flex items-start justify-center px-3 pt-[min(12vh,120px)] sm:px-4" role="dialog" aria-modal="true" aria-label={t("command.title")}>
      <button type="button" className="absolute inset-0 bg-slate-900/40 backdrop-blur-[2px]" aria-label="Close" onClick={() => setOpen(false)} />
      <div className="relative z-[1] w-full max-w-xl overflow-hidden rounded-2xl border border-pink-100/70 bg-gradient-to-b from-white/[0.99] to-slate-50/95 shadow-[0_28px_80px_rgba(58,45,88,0.18)] ring-1 ring-white/90">
        <label className="flex items-center gap-3 border-b border-pink-100/50 px-4 py-3">
          <Search className="h-5 w-5 shrink-0 text-slate-400" aria-hidden />
          <input
            ref={inputRef}
            className="min-w-0 flex-1 bg-transparent text-base font-semibold text-slate-900 outline-none placeholder:text-slate-400"
            placeholder={t("command.placeholder")}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <kbd className="hidden shrink-0 rounded-md border border-slate-200 bg-slate-50 px-2 py-1 text-[11px] font-bold text-slate-500 sm:inline-block">Esc</kbd>
        </label>

        <div className="max-h-[min(60vh,520px)] overflow-y-auto px-2 py-3">
          {routeEntries.length > 0 ? (
            <div className="mb-4">
              <div className="px-3 pb-2 text-[11px] font-black uppercase tracking-[0.14em] text-slate-400">{t("command.section.routes")}</div>
              <ul className="grid gap-1">
                {routeEntries.map((entry, i) => {
                  const idx = flatIdxRoute(i);
                  const isActive = idx === active;
                  const Icon = entry.icon;
                  return (
                    <li key={entry.id}>
                      <button
                        type="button"
                        className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-bold transition ${
                          isActive ? "bg-pink-50 text-pink-900 ring-2 ring-pink-200/50" : "text-slate-800 hover:bg-slate-50"
                        }`}
                        onMouseEnter={() => setActive(idx)}
                        onClick={() => navigateTo(entry.href)}
                      >
                        <span className="rin-icon-tile rin-icon-tile--sky h-9 w-9 shrink-0 [&>svg]:h-4 [&>svg]:w-4">
                          <Icon aria-hidden />
                        </span>
                        <span className="min-w-0">{entry.label}</span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            </div>
          ) : null}

          {problemEntries.length > 0 ? (
            <div className="mb-4">
              <div className="px-3 pb-2 text-[11px] font-black uppercase tracking-[0.14em] text-slate-400">{t("command.section.problems")}</div>
              <ul className="grid gap-1">
                {problemEntries.map((p, i) => {
                  const idx = flatIdxProblem(i);
                  const isActive = idx === active;
                  return (
                    <li key={p.id}>
                      <button
                        type="button"
                        className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition ${
                          isActive ? "bg-pink-50 ring-2 ring-pink-200/50" : "hover:bg-slate-50"
                        }`}
                        onMouseEnter={() => setActive(idx)}
                        onClick={() => navigateTo(p.href)}
                      >
                        <span className="rin-pill-problem shrink-0 text-xs font-black">{p.problemId}</span>
                        <span className="min-w-0 truncate text-sm font-bold text-slate-900">{p.title}</span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            </div>
          ) : null}

          {contestEntries.length > 0 ? (
            <div>
              <div className="px-3 pb-2 text-[11px] font-black uppercase tracking-[0.14em] text-slate-400">{t("command.section.contests")}</div>
              <ul className="grid gap-1">
                {contestEntries.map((c, i) => {
                  const idx = flatIdxContest(i);
                  const isActive = idx === active;
                  return (
                    <li key={c.id}>
                      <button
                        type="button"
                        className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition ${
                          isActive ? "bg-pink-50 ring-2 ring-pink-200/50" : "hover:bg-slate-50"
                        }`}
                        onMouseEnter={() => setActive(idx)}
                        onClick={() => navigateTo(c.href)}
                      >
                        <span className="rin-icon-tile rin-icon-tile--amber h-9 w-9 shrink-0 [&>svg]:h-4 [&>svg]:w-4">
                          <Calendar aria-hidden />
                        </span>
                        <span className="min-w-0 truncate text-sm font-bold text-slate-900">{c.title}</span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            </div>
          ) : null}

          {problemEntries.length === 0 && contestEntries.length === 0 && query.trim() ? (
            <div className="px-4 py-10 text-center text-sm font-semibold text-slate-500">{t("command.noMatch")}</div>
          ) : null}
        </div>

        <div className="border-t border-pink-100/45 bg-slate-50/80 px-4 py-2 text-center text-[11px] font-semibold text-slate-500">{t("command.footer")}</div>
      </div>
    </div>
  );
}
