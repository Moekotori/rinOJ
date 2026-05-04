"use client";

import { RinMascot } from "@rin-oj/rin-ui";
import { motion } from "framer-motion";
import { Github, LogOut, Search, UserCircle2 } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";
import { CommandMenu } from "@/components/command-menu";
import { LanguageSwitcher } from "@/components/language-switcher";
import { NotificationDropdown } from "@/components/notification-dropdown";
import { navItems } from "@/lib/mock-oj-data";
import { useCommandMenuStore } from "@/lib/use-command-menu-store";
import { useSessionStore } from "@/lib/use-session-store";
import { useTranslation } from "@/lib/use-translation";

export function OJShell({ children }: Readonly<{ children: React.ReactNode }>) {
  const { locale, t } = useTranslation();
  const pathname = usePathname();
  const router = useRouter();
  const setCommandOpen = useCommandMenuStore((s) => s.setOpen);
  const displayName = useSessionStore((state) => state.displayName);
  const avatarUrl = useSessionStore((state) => state.avatarUrl);
  const isAuthenticated = useSessionStore((state) => state.isAuthenticated);
  const signOut = useSessionStore((state) => state.signOut);
  const profileHref = displayName ? `/users/${displayName}` : "/users/me";

  const handleSearch = () => {
    setCommandOpen(true);
  };

  useEffect(() => {
    for (const item of navItems) {
      router.prefetch(item.href);
    }
  }, [router]);

  return (
    <main className="rin-page min-h-screen">
      <div className="rin-petal-field" aria-hidden="true" />
      <motion.header initial={false} className="sticky top-0 z-30 border-b border-slate-200 bg-white shadow-sm">
        <div className="mx-auto flex w-full max-w-[1920px] flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-6 lg:px-8">
          <Link className="group flex items-center gap-3" href="/">
            <span className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-slate-200 bg-slate-50">
              <RinMascot className="h-7 w-7" />
            </span>
            <div>
              <div className="text-[17px] font-black tracking-tight text-slate-900 transition-colors group-hover:text-blue-700">Rin OJ</div>
              <div className="mt-0.5 text-[11px] font-semibold text-slate-500">
                <span className="normal-case">{t("shell.product")}</span>
                <span className="sr-only">{t("shell.tagline")}</span>
              </div>
            </div>
          </Link>

          <nav className="order-3 flex w-full select-none flex-wrap items-center justify-center gap-1 rounded-md border border-slate-200 bg-slate-50 p-1 md:order-none md:w-auto md:flex-nowrap" aria-label="Primary navigation">
            {navItems.map((item) => {
              const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
              return (
                <Link
                  key={item.href}
                  aria-current={active ? "page" : undefined}
                  className={`grid h-9 min-w-14 touch-manipulation place-items-center whitespace-nowrap rounded px-3 text-[13px] font-bold tracking-tight transition-none ${
                    active ? "bg-slate-900 text-white" : "text-slate-600 hover:bg-white hover:text-slate-950"
                  }`}
                  href={item.href}
                  prefetch
                >
                  {t(item.labelKey)}
                </Link>
              );
            })}
          </nav>

          <div className="flex items-center gap-2">
            <LanguageSwitcher />
            <button className="rin-shell-icon-btn" type="button" aria-label={t("shell.search")} onClick={handleSearch}>
              <Search className="h-[17px] w-[17px]" strokeWidth={2.25} />
            </button>
            <NotificationDropdown />
            {isAuthenticated ? (
              <div className="inline-flex items-center gap-1">
                <Link
                  className={`inline-flex cursor-pointer items-center gap-2 rounded-md border px-2.5 py-1.5 text-[13px] font-semibold shadow-sm transition ${
                    pathname.startsWith("/users/")
                      ? "border-blue-200 bg-blue-50 text-blue-800"
                      : "border-slate-200 bg-white text-slate-800 hover:border-slate-300 hover:bg-slate-50 hover:text-slate-950"
                  }`}
                  href={profileHref}
                  title={locale === "zh-CN" ? "访问个人主页" : "View profile"}
                >
                  <span
                    className="inline-flex h-7 w-7 items-center justify-center overflow-hidden rounded-full border border-slate-200 bg-slate-100 text-slate-500"
                    aria-hidden="true"
                  >
                    {avatarUrl ? <img className="h-full w-full object-cover" src={avatarUrl} alt="" /> : <UserCircle2 className="h-5 w-5" />}
                  </span>
                  <span className="max-w-[140px] truncate">{displayName}</span>
                </Link>
                <button
                  type="button"
                  title={t("shell.logoutHint")}
                  aria-label={t("shell.logoutHint")}
                  className="rin-shell-icon-btn text-slate-500 transition hover:border-rose-300 hover:bg-rose-50 hover:text-rose-700"
                  onClick={() => {
                    signOut();
                    router.push("/");
                    router.refresh();
                  }}
                >
                  <LogOut className="h-[17px] w-[17px]" strokeWidth={2.25} />
                </button>
              </div>
            ) : (
              <Link
                className={`inline-flex items-center gap-2 rounded-md border px-2.5 py-1.5 text-[13px] font-semibold shadow-sm transition ${
                  pathname === "/login"
                    ? "border-blue-200 bg-blue-50 text-blue-800"
                    : "border-slate-200 bg-white text-slate-800 hover:border-slate-300 hover:bg-slate-50 hover:text-slate-950"
                }`}
                href="/login"
                title={locale === "zh-CN" ? "点击登录" : "Sign in"}
              >
                <span
                  className="inline-flex h-7 w-7 items-center justify-center overflow-hidden rounded-full border border-slate-200 bg-slate-100 text-slate-500"
                  aria-hidden="true"
                >
                  <UserCircle2 className="h-5 w-5" />
                </span>
                {t("shell.guest")}
              </Link>
            )}
            {isAuthenticated ? null : (
              <>
                <Link className="rounded-md border border-slate-300 bg-white px-3.5 py-2 text-[13px] font-bold text-slate-800 transition hover:bg-slate-50 hover:text-slate-950" href="/login">
                  {locale === "zh-CN" ? "登录" : "Login"}
                </Link>
                <Link className="rounded-md bg-blue-700 px-3.5 py-2 text-[13px] font-bold text-white shadow-sm transition hover:bg-blue-800" href="/register">
                  {locale === "zh-CN" ? "注册" : "Register"}
                </Link>
              </>
            )}
          </div>
        </div>
      </motion.header>

      <div className="flex min-h-[calc(100vh-88px)] flex-col">
        <div className="flex-1">{children}</div>
        <CommandMenu />

        <footer className="rin-footer mt-10">
          <div className="relative z-[1] mx-auto flex w-full max-w-[1920px] flex-wrap items-center justify-between gap-5 px-4 py-6 sm:px-6 lg:px-8">
            <div className="flex items-center gap-3">
              <span className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-slate-200 bg-slate-50">
                <RinMascot className="h-6 w-6" />
              </span>
              <div className="flex flex-col gap-0.5">
                <span className="text-sm font-black tracking-tight text-slate-700">Rin OJ</span>
                <span className="hidden text-[11px] font-medium text-slate-400 sm:inline">go-judge / open source</span>
              </div>
            </div>
            <nav className="flex flex-wrap items-center gap-x-5 gap-y-2 text-[12px] font-semibold tracking-wide text-slate-500">
              <Link className="transition-colors hover:text-blue-700" href="/problems">{locale === "zh-CN" ? "题库" : "Problems"}</Link>
              <Link className="transition-colors hover:text-blue-700" href="/status">{locale === "zh-CN" ? "评测" : "Status"}</Link>
              <Link className="transition-colors hover:text-blue-700" href="/discuss">{locale === "zh-CN" ? "讨论" : "Discuss"}</Link>
              <a className="inline-flex items-center gap-1.5 rounded px-2 py-1 transition-colors hover:bg-slate-100 hover:text-slate-900" href="https://github.com" target="_blank" rel="noopener noreferrer">
                <Github className="h-3.5 w-3.5 opacity-70" />
                GitHub
              </a>
            </nav>
            <div className="text-[11px] font-medium text-slate-400">Competitive programming workspace</div>
          </div>
        </footer>
      </div>
    </main>
  );
}
