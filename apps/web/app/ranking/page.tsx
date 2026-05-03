"use client";

import { Medal, Sparkles, Trophy } from "lucide-react";
import Link from "next/link";
import { OJShell } from "@/components/oj-shell";
import { ratingRows } from "@/lib/mock-oj-data";
import { useTranslation } from "@/lib/use-translation";

export default function RankingPage() {
  const { t } = useTranslation();

  return (
    <OJShell>
      <div className="mx-auto grid w-full max-w-7xl gap-5 px-4 py-5 sm:px-6 lg:px-8">
        <section className="rounded-lg border border-slate-200 bg-white shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 px-4 py-4">
            <div>
              <div className="flex items-center gap-2 text-sm font-semibold text-slate-500">
                <Trophy className="h-4 w-4" />
                {t("nav.ranking")}
              </div>
              <h1 className="mt-1 text-2xl font-black text-slate-950">{t("ranking.title")}</h1>
              <p className="mt-1 text-sm text-slate-600">{t("ranking.subtitle")}</p>
            </div>
            <div className="rounded-lg border border-pink-100 bg-pink-50 px-3 py-2 text-sm font-bold text-pink-700">
              <Sparkles className="mr-1 inline h-4 w-4" />
              Live seed board
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] border-collapse text-left text-sm">
              <thead className="bg-slate-50 text-xs font-bold text-slate-500">
                <tr>
                  <th className="px-4 py-3">{t("ranking.rank")}</th>
                  <th className="px-4 py-3">{t("ranking.user")}</th>
                  <th className="px-4 py-3">{t("ranking.rating")}</th>
                  <th className="px-4 py-3">{t("ranking.solved")}</th>
                  <th className="px-4 py-3">{t("ranking.motto")}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {ratingRows.map((row) => (
                  <tr key={row.name} className="hover:bg-sky-50/70">
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center gap-2 font-black text-slate-900">
                        <Medal className="h-4 w-4 text-amber-500" />
                        #{row.rank}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <Link className="font-bold text-slate-950 hover:text-pink-600" href={`/users/${row.name}`}>
                        {row.name}
                      </Link>
                    </td>
                    <td className="px-4 py-3">
                      <span className="rounded-md bg-pink-50 px-2 py-1 text-xs font-black text-pink-700">{row.rating}</span>
                    </td>
                    <td className="px-4 py-3 font-semibold text-emerald-700">{row.solved}</td>
                    <td className="px-4 py-3 text-slate-600">{row.motto}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </OJShell>
  );
}
