"use client";

import { useEffect } from "react";
import Link from "next/link";
import { AlertTriangle, Home, RefreshCw } from "lucide-react";
import { OJShell } from "@/components/oj-shell";

export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <OJShell>
      <div className="mx-auto flex min-h-[calc(100vh-88px)] w-full max-w-lg flex-col items-center justify-center px-4 py-20 text-center">
        <div className="rin-problem-section w-full border-rose-100/60 p-8 shadow-[0_20px_50px_rgba(58,45,88,0.08)]">
          <span className="rin-icon-tile rin-icon-tile--amber mx-auto h-12 w-12 rounded-2xl [&>svg]:h-6 [&>svg]:w-6">
            <AlertTriangle aria-hidden />
          </span>
          <h1 className="mt-4 text-balance text-2xl font-black tracking-tight text-slate-950">页面出了点问题</h1>
          <p className="mt-2 text-sm font-medium leading-relaxed text-slate-600">
            前端渲染失败。你可以刷新重试，或返回首页继续浏览。
          </p>
          {error.digest ? <p className="mt-2 font-mono text-xs text-slate-400">ref: {error.digest}</p> : null}
          <div className="mt-8 grid gap-3 sm:grid-cols-2">
            <button
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-b from-slate-900 to-slate-950 px-4 py-3 text-sm font-black text-white shadow-[0_6px_22px_rgba(15,10,30,0.2)] transition hover:-translate-y-0.5 hover:from-pink-600 hover:to-pink-800"
              type="button"
              onClick={() => reset()}
            >
              <RefreshCw className="h-4 w-4" aria-hidden />
              重试
            </button>
            <Link
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200/90 bg-gradient-to-b from-white to-slate-50/95 px-4 py-3 text-sm font-bold text-slate-800 ring-1 ring-white/90 transition hover:-translate-y-0.5 hover:border-pink-200"
              href="/"
            >
              <Home className="h-4 w-4" aria-hidden />
              回首页
            </Link>
          </div>
        </div>
      </div>
    </OJShell>
  );
}
