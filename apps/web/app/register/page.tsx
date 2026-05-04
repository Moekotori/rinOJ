"use client";

import { useMutation } from "@tanstack/react-query";
import { KeyRound, Mail, UserPlus, UserRound } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { AnimatedSurface } from "@/components/animated-surface";
import { OJShell } from "@/components/oj-shell";
import { registerUser } from "@/lib/gateway";
import { useLocaleStore } from "@/lib/use-locale-store";
import { useSessionStore } from "@/lib/use-session-store";

export default function RegisterPage() {
  const router = useRouter();
  const locale = useLocaleStore((state) => state.locale);
  const setAuthSession = useSessionStore((state) => state.setAuthSession);
  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const registerMutation = useMutation({
    mutationFn: () => registerUser({ email, username, password, locale }),
  });

  useEffect(() => {
    if (!registerMutation.data) {
      return;
    }

    setAuthSession(registerMutation.data, username);
    router.replace("/problems");
    window.setTimeout(() => window.location.assign("/problems"), 80);
  }, [registerMutation.data, router, setAuthSession, username]);

  return (
    <OJShell>
      <div className="mx-auto grid min-h-[calc(100vh-88px)] w-full max-w-[1040px] place-items-center px-4 py-10">
        <AnimatedSurface className="rin-card grid w-full overflow-hidden border border-slate-200/80 lg:grid-cols-[0.9fr_1.1fr]">
          <section className="border-b border-slate-200 bg-slate-50 px-8 py-10 lg:border-b-0 lg:border-r">
            <div className="flex min-h-[280px] flex-col justify-between">
              <div>
                <div className="flex items-center gap-2 text-sm font-bold text-slate-500">
                  <span className="rin-icon-tile">
                    <UserPlus className="h-3.5 w-3.5" aria-hidden />
                  </span>
                  Rin OJ Account
                </div>
                <h1 className="mt-6 text-3xl font-black tracking-tight text-slate-950 sm:text-4xl">
                  {locale === "zh-CN" ? "创建 Rin OJ 账号" : "Create your Rin OJ account"}
                </h1>
                <p className="mt-4 text-[15px] leading-relaxed text-slate-600 sm:text-base">
                  {locale === "zh-CN"
                    ? "账号会通过 gateway 写入 user-service，并持久化到 PostgreSQL。后续提交、题解和后台操作都会归属到该用户。"
                    : "Accounts go through gateway, user-service, and PostgreSQL. Submissions, editorials, and operations are tied to this identity."}
                </p>
              </div>
              <Link className="rin-soft-button mt-8 w-fit px-4 py-2.5 text-sm" href="/login">
                {locale === "zh-CN" ? "已有账号？登录" : "Have an account? Sign in"}
              </Link>
            </div>
          </section>

          <section className="rin-auth-panel flex flex-col justify-center px-8 py-10">
            <div className="mx-auto w-full max-w-md">
              <div className="grid gap-5">
                <label className="grid gap-2 text-sm font-bold text-slate-700">
                  Email
                  <div className="relative">
                    <Mail className="pointer-events-none absolute left-3.5 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-slate-400" />
                    <input className="rin-auth-input" type="email" value={email} onChange={(event) => setEmail(event.target.value)} autoComplete="email" />
                  </div>
                </label>
                <label className="grid gap-2 text-sm font-bold text-slate-700">
                  Username
                  <div className="relative">
                    <UserRound className="pointer-events-none absolute left-3.5 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-slate-400" />
                    <input className="rin-auth-input" value={username} onChange={(event) => setUsername(event.target.value)} autoComplete="username" />
                  </div>
                </label>
                <label className="grid gap-2 text-sm font-bold text-slate-700">
                  Password
                  <div className="relative">
                    <KeyRound className="pointer-events-none absolute left-3.5 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-slate-400" />
                    <input className="rin-auth-input" type="password" value={password} onChange={(event) => setPassword(event.target.value)} autoComplete="new-password" />
                  </div>
                </label>
                <button
                  className="mt-1 rounded-md bg-blue-700 px-5 py-3.5 text-base font-black text-white shadow-sm transition hover:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-60"
                  disabled={registerMutation.isPending}
                  onClick={() => registerMutation.mutate()}
                  type="button"
                >
                  {registerMutation.isPending ? (locale === "zh-CN" ? "创建中..." : "Creating...") : locale === "zh-CN" ? "创建账号" : "Create account"}
                </button>
              </div>

              {registerMutation.data ? (
                <div className="mt-6 rounded-md border border-emerald-200 bg-emerald-50 p-4 text-sm font-bold text-emerald-900">
                  {locale === "zh-CN" ? "注册成功，已自动登录。" : "Account created. You are signed in automatically."}
                </div>
              ) : null}
              {registerMutation.error ? (
                <div className="mt-6 rounded-md border border-rose-200 bg-rose-50 p-4 text-sm font-bold text-rose-900">{registerMutation.error.message}</div>
              ) : null}
            </div>
          </section>
        </AnimatedSurface>
      </div>
    </OJShell>
  );
}
