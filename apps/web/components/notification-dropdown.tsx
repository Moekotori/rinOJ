"use client";

import { useEffect, useRef, useState } from "react";
import { Bell } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useTranslation } from "@/lib/use-translation";

const STORAGE_KEY = "rin-notifications-read";

type SeedItem = {
  id: string;
  icon: LucideIcon;
  tone: "pink" | "sky" | "amber";
};

function loadReadIds(): Set<string> {
  if (typeof window === "undefined") {
    return new Set();
  }
  try {
    const raw = JSON.parse(window.localStorage.getItem(STORAGE_KEY) ?? "[]") as string[];
    return new Set(Array.isArray(raw) ? raw : []);
  } catch {
    return new Set();
  }
}

export function NotificationDropdown() {
  const { locale, t } = useTranslation();
  const [open, setOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const [readIds, setReadIds] = useState<Set<string>>(loadReadIds);

  const seeds: Array<
    SeedItem & {
      title: string;
      titleEn: string;
      detail: string;
      detailEn: string;
      time: string;
      timeEn: string;
    }
  > = [];

  const unreadCount = seeds.filter((s) => !readIds.has(s.id)).length;

  useEffect(() => {
    if (!open) {
      return;
    }
    const onDoc = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);

  const markAllRead = () => {
    const next = new Set(readIds);
    seeds.forEach((s) => next.add(s.id));
    setReadIds(next);
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify([...next]));
  };

  const markOneRead = (id: string) => {
    if (readIds.has(id)) {
      return;
    }
    const next = new Set(readIds).add(id);
    setReadIds(next);
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify([...next]));
  };

  const tileTone = (tone: SeedItem["tone"]) =>
    tone === "pink" ? "rin-icon-tile--pink" : tone === "sky" ? "rin-icon-tile--sky" : "rin-icon-tile--amber";

  return (
    <div className="relative" ref={panelRef}>
      <button
        className="rin-shell-icon-btn relative"
        type="button"
        aria-expanded={open}
        aria-haspopup="true"
        aria-label={t("shell.notifications")}
        onClick={() => setOpen((o) => !o)}
      >
        <Bell className="h-[17px] w-[17px]" strokeWidth={2.25} />
        {unreadCount > 0 ? (
          <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-gradient-to-br from-pink-500 to-pink-600 px-1 text-[10px] font-black text-white shadow-sm ring-2 ring-white">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        ) : null}
      </button>

      {open ? (
        <div className="absolute right-0 top-[calc(100%+10px)] z-40 w-[min(100vw-2rem,380px)] overflow-hidden rounded-2xl border border-pink-100/65 bg-gradient-to-b from-white/[0.99] to-slate-50/95 shadow-[0_24px_56px_rgba(58,45,88,0.14)] ring-1 ring-white/90">
          <div className="flex items-center justify-between border-b border-pink-100/45 px-4 py-3">
            <span className="text-sm font-black text-slate-900">{t("notifications.title")}</span>
            <button className="text-xs font-bold text-sky-700 transition hover:text-pink-600" type="button" onClick={markAllRead}>
              {t("notifications.markAll")}
            </button>
          </div>
          <ul className="max-h-[min(70vh,420px)] divide-y divide-slate-100/90 overflow-y-auto">
            {seeds.length === 0 ? (
              <li className="px-4 py-10 text-center text-sm font-medium text-slate-500">
                {locale === "zh-CN" ? "暂无通知。" : "No notifications."}
              </li>
            ) : null}
            {seeds.map((item) => {
              const Icon = item.icon;
              const read = readIds.has(item.id);
              return (
                <li key={item.id}>
                  <button
                    type="button"
                    className={`flex w-full gap-3 px-4 py-3 text-left transition hover:bg-pink-50/50 ${read ? "opacity-75" : ""}`}
                    onClick={() => markOneRead(item.id)}
                  >
                    <span className={`rin-icon-tile ${tileTone(item.tone)} mt-0.5 h-10 w-10 shrink-0 [&>svg]:h-4 [&>svg]:w-4`}>
                      <Icon aria-hidden />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="flex items-start justify-between gap-2">
                        <span className="text-sm font-black text-slate-900">{locale === "zh-CN" ? item.title : item.titleEn}</span>
                        {!read ? <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-pink-500 shadow-[0_0_0_3px_rgba(236,72,153,0.15)]" /> : null}
                      </span>
                      <span className="mt-1 block text-xs font-medium leading-relaxed text-slate-600">{locale === "zh-CN" ? item.detail : item.detailEn}</span>
                      <span className="mt-2 block text-[11px] font-semibold text-slate-400">{locale === "zh-CN" ? item.time : item.timeEn}</span>
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
