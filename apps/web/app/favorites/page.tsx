"use client";

import Link from "next/link";
import { Heart, Star } from "lucide-react";
import { useMemo } from "react";
import { AnimatedSurface } from "@/components/animated-surface";
import { OJShell } from "@/components/oj-shell";
import { ProblemTable } from "@/components/problem-table";
import { problems } from "@/lib/mock-oj-data";
import { useFavoritesStore } from "@/lib/use-favorites-store";
import { useTranslation } from "@/lib/use-translation";

export default function FavoritesPage() {
  const { locale, t } = useTranslation();
  const ids = useFavoritesStore((s) => s.ids);

  const favoriteProblems = useMemo(() => {
    const order = new Map(ids.map((id, index) => [id, index]));
    return problems
      .filter((p) => ids.includes(p.id))
      .sort((a, b) => (order.get(a.id) ?? 0) - (order.get(b.id) ?? 0));
  }, [ids]);

  return (
    <OJShell>
      <div className="mx-auto grid w-full max-w-7xl gap-5 px-4 py-5 sm:px-6 lg:px-8">
        <AnimatedSurface className="rin-card overflow-hidden border border-slate-200/80">
          <div className="rin-card-head flex flex-wrap items-center justify-between gap-3 px-5 py-4">
            <div>
              <div className="flex items-center gap-2 text-sm font-semibold text-slate-500">
                <span className="rin-icon-tile">
                  <Star className="h-3.5 w-3.5" aria-hidden />
                </span>
                {t("nav.favorites")}
              </div>
              <h1 className="mt-1 text-2xl font-black tracking-tight text-slate-950">{t("favorites.title")}</h1>
              <p className="mt-1 text-sm font-medium text-slate-500">{t("favorites.subtitle")}</p>
            </div>
            <Link
              className="rin-soft-button px-4 py-2 text-sm"
              href="/problems"
            >
              <Heart className="h-4 w-4" aria-hidden />
              {t("favorites.browse")}
            </Link>
          </div>

          {favoriteProblems.length === 0 ? (
            <div className="px-5 pb-10 pt-2">
              <div className="rin-problem-section mx-auto max-w-md border-dashed px-6 py-14 text-center">
                <span className="rin-icon-tile mx-auto h-12 w-12 [&>svg]:h-6 [&>svg]:w-6">
                  <Heart aria-hidden />
                </span>
                <p className="mt-4 text-base font-semibold text-slate-700">{t("favorites.empty")}</p>
                <p className="mt-2 text-sm font-medium text-slate-500">{t("favorites.emptyHint")}</p>
                <Link
                  className="mt-6 inline-flex rounded-md bg-blue-700 px-5 py-3 text-sm font-black text-white shadow-sm transition hover:bg-blue-800"
                  href="/problems"
                >
                  {t("favorites.goProblems")}
                </Link>
              </div>
            </div>
          ) : (
            <ProblemTable items={favoriteProblems} pageSize={10} />
          )}
        </AnimatedSurface>
      </div>
    </OJShell>
  );
}
