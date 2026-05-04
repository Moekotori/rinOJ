"use client";

import { Medal, Trophy } from "lucide-react";
import Link from "next/link";
import { OJShell } from "@/components/oj-shell";
import { ratingRows } from "@/lib/mock-oj-data";
import { useTranslation } from "@/lib/use-translation";

function medalIcon(rank: number) {
  if (rank === 1) return "🥇";
  if (rank === 2) return "🥈";
  if (rank === 3) return "🥉";
  return null;
}

function ratingColor(rating: number) {
  if (rating >= 2400) return "bg-rose-50 text-rose-700";
  if (rating >= 2100) return "bg-amber-50 text-amber-700";
  if (rating >= 1900) return "bg-violet-50 text-violet-700";
  if (rating >= 1600) return "bg-sky-50 text-sky-700";
  return "bg-emerald-50 text-emerald-700";
}

export default function RankingPage() {
  const { locale, t } = useTranslation();

  return (
    <OJShell>
      <div className="mx-auto grid w-full max-w-7xl gap-5 px-4 py-5 sm:px-6 lg:px-8">
        <section className="rin-card overflow-hidden border border-slate-200/80">
          <div className="rin-card-head flex flex-wrap items-center justify-between gap-3 px-5 py-4">
            <div>
              <div className="flex items-center gap-2 text-sm font-semibold text-slate-500">
                <span className="rin-icon-tile rin-icon-tile--amber">
                  <Trophy className="h-3.5 w-3.5" />
                </span>
                {t("nav.ranking")}
              </div>
              <h1 className="mt-1 text-2xl font-black text-slate-950">{t("ranking.title")}</h1>
              <p className="mt-1 text-sm text-slate-500">{t("ranking.subtitle")}</p>
            </div>
            <div className="rin-stat-pill rin-stat-pill--sky gap-1.5 font-bold">
              <Medal className="h-3.5 w-3.5" aria-hidden />
              {ratingRows.length} {locale === "zh-CN" ? "条" : "rows"}
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="rin-table w-full min-w-[760px] border-collapse text-left text-sm">
              <thead>
                <tr className="bg-gradient-to-r from-slate-50 to-slate-50/60 text-xs font-bold uppercase tracking-wide text-slate-500">
                  <th className="px-4 py-3">{t("ranking.rank")}</th>
                  <th className="px-4 py-3">{t("ranking.user")}</th>
                  <th className="px-4 py-3">{t("ranking.rating")}</th>
                  <th className="px-4 py-3">{t("ranking.solved")}</th>
                  <th className="px-4 py-3">{t("ranking.motto")}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100/80">
                {ratingRows.length === 0 ? (
                  <tr>
                    <td className="px-4 py-12 text-center text-sm font-medium text-slate-500" colSpan={5}>
                      {t("home.noRatings")}
                    </td>
                  </tr>
                ) : null}
                {ratingRows.map((row) => {
                  const medal = medalIcon(row.rank);
                  return (
                    <tr key={row.name}>
                      <td className="px-4 py-3">
                        <span className="inline-flex items-center gap-2 font-black text-slate-900">
                          {medal ? (
                            <span className="text-lg leading-none">{medal}</span>
                          ) : (
                            <span className="inline-flex h-6 w-6 items-center justify-center">
                              <Medal className="h-4 w-4 text-slate-400" />
                            </span>
                          )}
                          <span className="text-slate-500">#{row.rank}</span>
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <Link className="font-bold text-slate-950 hover:text-blue-700" href={`/users/${row.name}`}>
                          {row.name}
                        </Link>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`rounded-md px-2 py-1 text-xs font-black ${ratingColor(row.rating)}`}>{row.rating}</span>
                      </td>
                      <td className="px-4 py-3 font-semibold tabular-nums text-emerald-700">{row.solved}</td>
                      <td className="px-4 py-3 text-slate-500 italic">{row.motto}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </OJShell>
  );
}
