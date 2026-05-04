import Link from "next/link";
import { BookOpen, Home } from "lucide-react";
import { OJShell } from "@/components/oj-shell";

export default function NotFound() {
  return (
    <OJShell>
      <div className="mx-auto flex min-h-[calc(100vh-88px)] w-full max-w-lg flex-col items-center justify-center px-4 py-20 text-center">
        <div className="rin-problem-section w-full max-w-md border-pink-100/60 p-8 shadow-[0_20px_50px_rgba(58,45,88,0.08)]">
          <p className="text-sm font-black uppercase tracking-[0.2em] text-pink-600/90">404</p>
          <h1 className="mt-3 text-balance text-3xl font-black tracking-tight text-slate-950 sm:text-4xl">找不到这一页</h1>
          <p className="mt-3 text-base font-medium leading-relaxed text-slate-600">链接可能过期了，或者题目/比赛还没上线。从下面挑一个入口继续吧。</p>
          <div className="mt-8 grid gap-3 sm:grid-cols-2">
            <Link
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-b from-slate-900 to-slate-950 px-4 py-3 text-sm font-black text-white shadow-[0_6px_22px_rgba(15,10,30,0.2)] transition hover:-translate-y-0.5 hover:from-pink-600 hover:to-pink-800"
              href="/"
            >
              <Home className="h-4 w-4" aria-hidden />
              回首页
            </Link>
            <Link
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200/90 bg-gradient-to-b from-white to-slate-50/95 px-4 py-3 text-sm font-bold text-slate-800 shadow-[inset_0_1px_0_rgba(255,255,255,1)] ring-1 ring-white/90 transition hover:-translate-y-0.5 hover:border-pink-200 hover:from-pink-50 hover:text-pink-800"
              href="/problems"
            >
              <BookOpen className="h-4 w-4" aria-hidden />
              题库
            </Link>
          </div>
        </div>
        <p className="mt-8 text-xs font-medium text-slate-400">Rin OJ</p>
      </div>
    </OJShell>
  );
}
