"use client";

import { RinMascot } from "@rin-oj/rin-ui";
import { motion } from "framer-motion";
import { Bell, Search } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { LanguageSwitcher } from "@/components/language-switcher";
import { navItems } from "@/lib/mock-oj-data";
import { useTranslation } from "@/lib/use-translation";

export function OJShell({ children }: Readonly<{ children: React.ReactNode }>) {
  const { locale, t } = useTranslation();
  const pathname = usePathname();

  return (
    <main className="rin-page min-h-screen bg-transparent">
      <div className="rin-petal-field" aria-hidden="true">
        <span className="rin-petal" />
        <span className="rin-petal" />
        <span className="rin-petal" />
        <span className="rin-petal" />
      </div>

      <motion.header
        initial={{ y: -18, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.34, ease: [0.22, 1, 0.36, 1] }}
        className="sticky top-0 z-30 border-b border-pink-100/80 bg-white/86 shadow-[0_10px_32px_rgba(58,45,88,0.08)] backdrop-blur-xl"
      >
        <div className="mx-auto flex w-full max-w-[1920px] flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-6 lg:px-8">
          <Link className="group flex items-center gap-3" href="/">
            <RinMascot className="h-10 w-10" />
            <div>
              <div className="text-lg font-black text-slate-950 transition-colors group-hover:text-pink-700">Rin OJ</div>
              <div className="flex flex-wrap items-center gap-2 text-xs font-medium text-slate-500">
                <span>{t("shell.product")}</span>
                <span className="rin-kana-badge">{t("shell.tagline")}</span>
              </div>
            </div>
          </Link>

          <nav className="order-3 flex w-full items-center gap-1 overflow-x-auto rounded-xl border border-slate-200/80 bg-white/70 p-1 shadow-sm md:order-none md:w-auto" aria-label="Primary navigation">
            {navItems.map((item) => {
              const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
              return (
                <Link
                  key={item.label}
                  aria-current={active ? "page" : undefined}
                  className={`whitespace-nowrap rounded-lg px-3 py-2 text-sm font-bold transition hover:-translate-y-0.5 ${
                    active ? "bg-slate-950 text-white shadow-sm" : "text-slate-700 hover:bg-pink-50 hover:text-pink-700"
                  }`}
                  href={item.href}
                >
                  {t(item.labelKey)}
                </Link>
              );
            })}
          </nav>

          <div className="flex items-center gap-2">
            <LanguageSwitcher />
            <button className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-pink-100 bg-white/80 text-slate-600 shadow-sm transition hover:-translate-y-0.5 hover:border-pink-200 hover:bg-pink-50 hover:text-pink-700" type="button" aria-label={t("shell.search")}>
              <Search className="h-4 w-4" />
            </button>
            <button className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-pink-100 bg-white/80 text-slate-600 shadow-sm transition hover:-translate-y-0.5 hover:border-pink-200 hover:bg-pink-50 hover:text-pink-700" type="button" aria-label={t("shell.notifications")}>
              <Bell className="h-4 w-4" />
            </button>
            <Link
              aria-current={pathname.startsWith("/users/") ? "page" : undefined}
              className={`rounded-lg border px-3 py-2 text-sm font-semibold shadow-sm transition hover:-translate-y-0.5 ${
                pathname.startsWith("/users/") ? "border-pink-300 bg-pink-50 text-pink-700" : "border-pink-100 bg-white/80 text-slate-800 hover:bg-pink-50 hover:text-pink-700"
              }`}
              href="/users/rin_admin"
            >
              usr_teacher
            </Link>
            <Link className="rounded-lg border border-sky-100 bg-white/80 px-3 py-2 text-sm font-bold text-slate-800 shadow-sm transition hover:-translate-y-0.5 hover:bg-sky-50 hover:text-sky-700" href="/login">
              {locale === "zh-CN" ? "登录" : "Login"}
            </Link>
            <Link className="rounded-lg bg-slate-950 px-3 py-2 text-sm font-bold text-white shadow-sm transition hover:-translate-y-0.5 hover:bg-pink-600" href="/register">
              {locale === "zh-CN" ? "注册" : "Register"}
            </Link>
          </div>
        </div>
      </motion.header>

      {children}
    </main>
  );
}
