"use client";

import { useMutation } from "@tanstack/react-query";
import { KeyRound, LogIn, ShieldCheck, UserRound } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { AnimatedSurface } from "@/components/animated-surface";
import { OJShell } from "@/components/oj-shell";
import { loginUser } from "@/lib/gateway";
import { useLocaleStore } from "@/lib/use-locale-store";
import { useSessionStore } from "@/lib/use-session-store";

export default function LoginPage() {
  const router = useRouter();
  const locale = useLocaleStore((state) => state.locale);
  const setAuthSession = useSessionStore((state) => state.setAuthSession);
  const [login, setLogin] = useState("");
  const [password, setPassword] = useState("");
  const [totpCode, setTotpCode] = useState("");
  const loginMutation = useMutation({
    mutationFn: () => loginUser({ login, password, totpCode: totpCode.trim() || undefined }),
  });

  useEffect(() => {
    if (!loginMutation.data) {
      return;
    }

    const params = new URLSearchParams(window.location.search);
    const rawNext = params.get("next");
    const nextPath = rawNext && rawNext.startsWith("/") && !rawNext.startsWith("//") ? rawNext : "/problems";

    setAuthSession(loginMutation.data, login);
    router.replace(nextPath);

    window.setTimeout(() => {
      if (nextPath === "/problems") {
        window.location.assign("/problems");
      } else {
        window.location.assign(nextPath);
      }
    }, 80);
  }, [login, loginMutation.data, router, setAuthSession]);

  return (
    <OJShell>
      <div className="mx-auto grid min-h-[calc(100vh-88px)] w-full max-w-[1040px] place-items-center px-4 py-10">
        <AnimatedSurface className="rin-card grid w-full overflow-hidden border border-slate-200/80 lg:grid-cols-[0.9fr_1.1fr]">
          <section className="border-b border-slate-200 bg-slate-50 px-8 py-10 lg:border-b-0 lg:border-r">
            <div className="flex min-h-[280px] flex-col justify-between">
              <div>
                <div className="flex items-center gap-2 text-sm font-bold text-slate-500">
                  <span className="rin-icon-tile">
                    <LogIn className="h-3.5 w-3.5" aria-hidden />
                  </span>
                  Rin OJ Login
                </div>
                <h1 className="mt-6 text-3xl font-black tracking-tight text-slate-950 sm:text-4xl">
                  {locale === "zh-CN" ? "登录 Rin OJ" : "Sign in to Rin OJ"}
                </h1>
                <p className="mt-4 text-[15px] leading-relaxed text-slate-600 sm:text-base">
                  {locale === "zh-CN"
                    ? "使用你的账号进入题库、提交记录和评测工作区。登录会通过 gateway 与 user-service 完成校验。"
                    : "Use your account to access problems, submissions, and judging workflows. Authentication is handled through gateway and user-service."}
                </p>
              </div>
              <Link className="rin-soft-button mt-8 w-fit px-4 py-2.5 text-sm" href="/register">
                {locale === "zh-CN" ? "没有账号？注册" : "Need an account? Register"}
              </Link>
            </div>
          </section>

          <section className="rin-auth-panel flex flex-col justify-center px-8 py-10">
            <div className="mx-auto w-full max-w-md">
              <div className="grid gap-5">
                <label className="grid gap-2 text-sm font-bold text-slate-700">
                  {locale === "zh-CN" ? "邮箱或用户名" : "Email or username"}
                  <div className="relative">
                    <UserRound className="pointer-events-none absolute left-3.5 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-slate-400" />
                    <input className="rin-auth-input" value={login} onChange={(event) => setLogin(event.target.value)} autoComplete="username" />
                  </div>
                </label>

                <label className="grid gap-2 text-sm font-bold text-slate-700">
                  {locale === "zh-CN" ? "密码" : "Password"}
                  <div className="relative">
                    <KeyRound className="pointer-events-none absolute left-3.5 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-slate-400" />
                    <input className="rin-auth-input" type="password" value={password} onChange={(event) => setPassword(event.target.value)} autoComplete="current-password" />
                  </div>
                </label>

                <label className="grid gap-2 text-sm font-bold text-slate-700">
                  {locale === "zh-CN" ? "2FA 验证码（可选）" : "2FA code (optional)"}
                  <div className="relative">
                    <ShieldCheck className="pointer-events-none absolute left-3.5 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-slate-400" />
                    <input className="rin-auth-input" inputMode="numeric" value={totpCode} onChange={(event) => setTotpCode(event.target.value)} autoComplete="one-time-code" />
                  </div>
                </label>

                <button
                  className="mt-1 rounded-md bg-blue-700 px-5 py-3.5 text-base font-black text-white shadow-sm transition hover:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-60"
                  disabled={loginMutation.isPending}
                  onClick={() => loginMutation.mutate()}
                  type="button"
                >
                  {loginMutation.isPending ? (locale === "zh-CN" ? "登录中..." : "Signing in...") : locale === "zh-CN" ? "登录" : "Sign in"}
                </button>
              </div>

              {loginMutation.data ? (
                <div className="mt-6 rounded-md border border-emerald-200 bg-emerald-50 p-4 text-sm font-bold text-emerald-900">
                  {locale === "zh-CN" ? "登录成功：" : "Signed in: "}
                  {loginMutation.data.userId}. Access token issued.
                </div>
              ) : null}
              {loginMutation.error ? (
                <div className="mt-6 rounded-md border border-rose-200 bg-rose-50 p-4 text-sm font-bold text-rose-900">{loginMutation.error.message}</div>
              ) : null}
            </div>
          </section>
        </AnimatedSurface>
      </div>
    </OJShell>
  );
}
