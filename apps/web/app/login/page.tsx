"use client";

import { useMutation } from "@tanstack/react-query";
import { KeyRound, LogIn, ShieldCheck, UserRound } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { AnimatedSurface } from "@/components/animated-surface";
import { OJShell } from "@/components/oj-shell";
import { loginUser } from "@/lib/gateway";
import { useLocaleStore } from "@/lib/use-locale-store";

export default function LoginPage() {
  const locale = useLocaleStore((state) => state.locale);
  const [login, setLogin] = useState("rin@example.com");
  const [password, setPassword] = useState("very-secure-password");
  const [totpCode, setTotpCode] = useState("");
  const loginMutation = useMutation({
    mutationFn: () => loginUser({ login, password, totpCode: totpCode.trim() || undefined }),
  });

  return (
    <OJShell>
      <div className="mx-auto grid min-h-[calc(100vh-88px)] w-full max-w-[1280px] place-items-center px-4 py-10">
        <AnimatedSurface className="rin-workbench-panel grid w-full overflow-hidden rounded-2xl lg:grid-cols-[0.92fr_1.08fr]">
          <section className="bg-[linear-gradient(135deg,rgba(168,216,234,0.66),rgba(255,211,220,0.76))] p-8">
            <div className="inline-flex items-center gap-2 rounded-full border border-white/80 bg-white/72 px-3 py-1 text-sm font-black text-sky-700">
              <LogIn className="h-4 w-4" />
              Rin OJ Login
            </div>
            <h1 className="mt-6 text-4xl font-black leading-tight text-slate-950">
              {locale === "zh-CN" ? "欢迎回来，继续刷题吧" : "Welcome back to Rin OJ"}
            </h1>
            <p className="mt-4 text-lg font-semibold leading-8 text-slate-700">
              {locale === "zh-CN"
                ? "登录会走 gateway 到 user-service，并校验 PostgreSQL 里的账号密码。下一步会把 token 接进全站会话，让提交、题解和后台操作都归属到真实用户。"
                : "Login goes through gateway, user-service, and PostgreSQL. Next we can wire the issued token into the whole app session."}
            </p>
            <Link className="mt-6 inline-flex rounded-xl border border-white/80 bg-white/72 px-4 py-3 text-base font-black text-slate-900 shadow-sm transition hover:-translate-y-0.5 hover:bg-white" href="/register">
              {locale === "zh-CN" ? "还没有账号？去注册" : "Need an account? Register"}
            </Link>
          </section>

          <section className="p-8">
            <div className="grid gap-5">
              <label className="grid gap-2 text-base font-bold text-slate-700">
                {locale === "zh-CN" ? "邮箱或用户名" : "Email or username"}
                <div className="relative">
                  <UserRound className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
                  <input
                    className="w-full rounded-xl border border-slate-200 bg-white px-12 py-3 text-lg outline-none transition focus:border-sky-300 focus:ring-4 focus:ring-sky-100"
                    value={login}
                    onChange={(event) => setLogin(event.target.value)}
                  />
                </div>
              </label>

              <label className="grid gap-2 text-base font-bold text-slate-700">
                {locale === "zh-CN" ? "密码" : "Password"}
                <div className="relative">
                  <KeyRound className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
                  <input
                    className="w-full rounded-xl border border-slate-200 bg-white px-12 py-3 text-lg outline-none transition focus:border-sky-300 focus:ring-4 focus:ring-sky-100"
                    type="password"
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                  />
                </div>
              </label>

              <label className="grid gap-2 text-base font-bold text-slate-700">
                {locale === "zh-CN" ? "2FA 验证码（可选）" : "2FA code (optional)"}
                <div className="relative">
                  <ShieldCheck className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
                  <input
                    className="w-full rounded-xl border border-slate-200 bg-white px-12 py-3 text-lg outline-none transition focus:border-sky-300 focus:ring-4 focus:ring-sky-100"
                    inputMode="numeric"
                    value={totpCode}
                    onChange={(event) => setTotpCode(event.target.value)}
                  />
                </div>
              </label>

              <button
                className="rounded-xl bg-slate-950 px-5 py-3 text-lg font-black text-white shadow-sm transition hover:-translate-y-0.5 hover:bg-sky-600 disabled:opacity-60"
                disabled={loginMutation.isPending}
                onClick={() => loginMutation.mutate()}
                type="button"
              >
                {loginMutation.isPending ? (locale === "zh-CN" ? "登录中..." : "Signing in...") : locale === "zh-CN" ? "登录" : "Sign in"}
              </button>
            </div>

            {loginMutation.data ? (
              <div className="mt-5 rounded-xl border border-emerald-100 bg-emerald-50 p-4 text-base font-bold text-emerald-800">
                {locale === "zh-CN" ? "登录成功：" : "Signed in: "}
                {loginMutation.data.userId}. Access token issued.
              </div>
            ) : null}
            {loginMutation.error ? (
              <div className="mt-5 rounded-xl border border-rose-100 bg-rose-50 p-4 text-base font-bold text-rose-800">{loginMutation.error.message}</div>
            ) : null}
          </section>
        </AnimatedSurface>
      </div>
    </OJShell>
  );
}
