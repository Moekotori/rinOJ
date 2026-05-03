"use client";

import { useMutation } from "@tanstack/react-query";
import { KeyRound, Mail, UserRound } from "lucide-react";
import { AnimatedSurface } from "@/components/animated-surface";
import { OJShell } from "@/components/oj-shell";
import { registerUser } from "@/lib/gateway";
import { useLocaleStore } from "@/lib/use-locale-store";
import { useState } from "react";

export default function RegisterPage() {
  const locale = useLocaleStore((state) => state.locale);
  const [email, setEmail] = useState("rin@example.com");
  const [username, setUsername] = useState("rin_user");
  const [password, setPassword] = useState("very-secure-password");
  const registerMutation = useMutation({
    mutationFn: () => registerUser({ email, username, password, locale }),
  });

  return (
    <OJShell>
      <div className="mx-auto grid min-h-[calc(100vh-88px)] w-full max-w-[1280px] place-items-center px-4 py-10">
        <AnimatedSurface className="rin-workbench-panel grid w-full overflow-hidden rounded-2xl lg:grid-cols-[0.9fr_1.1fr]">
          <section className="bg-[linear-gradient(135deg,rgba(255,211,220,0.78),rgba(168,216,234,0.56))] p-8">
            <div className="inline-flex rounded-full border border-white/80 bg-white/72 px-3 py-1 text-sm font-black text-pink-700">Rin OJ Account</div>
            <h1 className="mt-6 text-4xl font-black leading-tight text-slate-950">{locale === "zh-CN" ? "创建你的 Rin OJ 账号" : "Create your Rin OJ account"}</h1>
            <p className="mt-4 text-lg font-semibold leading-8 text-slate-700">
              {locale === "zh-CN" ? "账号会通过 gateway 写入 user-service，再持久化到 PostgreSQL。后续登录、题解、提交归属都从这里展开。" : "Accounts go through gateway, user-service, and PostgreSQL. Login, editorials, and submission ownership build on this."}
            </p>
          </section>

          <section className="p-8">
            <div className="grid gap-5">
              <label className="grid gap-2 text-base font-bold text-slate-700">
                Email
                <div className="relative">
                  <Mail className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
                  <input className="w-full rounded-xl border border-slate-200 bg-white px-12 py-3 text-lg outline-none focus:border-pink-300" value={email} onChange={(event) => setEmail(event.target.value)} />
                </div>
              </label>
              <label className="grid gap-2 text-base font-bold text-slate-700">
                Username
                <div className="relative">
                  <UserRound className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
                  <input className="w-full rounded-xl border border-slate-200 bg-white px-12 py-3 text-lg outline-none focus:border-pink-300" value={username} onChange={(event) => setUsername(event.target.value)} />
                </div>
              </label>
              <label className="grid gap-2 text-base font-bold text-slate-700">
                Password
                <div className="relative">
                  <KeyRound className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
                  <input className="w-full rounded-xl border border-slate-200 bg-white px-12 py-3 text-lg outline-none focus:border-pink-300" type="password" value={password} onChange={(event) => setPassword(event.target.value)} />
                </div>
              </label>
              <button className="rounded-xl bg-slate-950 px-5 py-3 text-lg font-black text-white shadow-sm transition hover:-translate-y-0.5 hover:bg-pink-600 disabled:opacity-60" disabled={registerMutation.isPending} onClick={() => registerMutation.mutate()} type="button">
                {registerMutation.isPending ? "Creating..." : "Create account"}
              </button>
            </div>

            {registerMutation.data ? (
              <div className="mt-5 rounded-xl border border-emerald-100 bg-emerald-50 p-4 text-base font-bold text-emerald-800">
                Created user {registerMutation.data.userId}. Access token issued.
              </div>
            ) : null}
            {registerMutation.error ? (
              <div className="mt-5 rounded-xl border border-rose-100 bg-rose-50 p-4 text-base font-bold text-rose-800">{registerMutation.error.message}</div>
            ) : null}
          </section>
        </AnimatedSurface>
      </div>
    </OJShell>
  );
}
