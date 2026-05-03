"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Activity, Filter, RotateCw } from "lucide-react";
import { OJShell } from "@/components/oj-shell";
import { VerdictBadge } from "@/components/verdict-badge";
import { judgements } from "@/lib/mock-oj-data";
import { useTranslation } from "@/lib/use-translation";

export default function StatusPage() {
  const { locale, t } = useTranslation();
  const [verdict, setVerdict] = useState("all");
  const [language, setLanguage] = useState("all");
  const verdicts = useMemo(() => Array.from(new Set(judgements.map((judgement) => judgement.verdict))), []);
  const languages = useMemo(() => Array.from(new Set(judgements.map((judgement) => judgement.lang))).sort(), []);

  // Keep this filtering local for now; the same shape maps cleanly to future cursor API params.
  const filteredJudgements = useMemo(
    () =>
      judgements.filter(
        (judgement) => (verdict === "all" || judgement.verdict === verdict) && (language === "all" || judgement.lang === language),
      ),
    [language, verdict],
  );

  return (
    <OJShell>
      <div className="mx-auto grid w-full max-w-7xl gap-5 px-4 py-5 sm:px-6 lg:px-8">
        <section className="rounded-lg border border-slate-200 bg-white shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 px-4 py-3">
            <div>
              <div className="flex items-center gap-2 text-sm font-semibold text-slate-500">
                <Activity className="h-4 w-4" />
                {t("nav.status")}
              </div>
              <h1 className="mt-1 text-2xl font-black text-slate-950">{t("status.recentSubmissions")}</h1>
            </div>
            <div className="flex flex-wrap gap-2">
              <label className="inline-flex h-10 items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700">
                <Filter className="h-4 w-4" />
                <select className="bg-transparent outline-none" onChange={(event) => setVerdict(event.target.value)} value={verdict}>
                  <option value="all">{t("status.allVerdicts")}</option>
                  {verdicts.map((item) => (
                    <option key={item} value={item}>
                      {item}
                    </option>
                  ))}
                </select>
              </label>
              <label className="inline-flex h-10 items-center rounded-lg border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700">
                <select className="bg-transparent outline-none" onChange={(event) => setLanguage(event.target.value)} value={language}>
                  <option value="all">{t("status.allLanguages")}</option>
                  {languages.map((item) => (
                    <option key={item} value={item}>
                      {item}
                    </option>
                  ))}
                </select>
              </label>
              <button className="inline-flex h-10 items-center gap-2 rounded-lg bg-slate-950 px-3 text-sm font-semibold text-white" type="button">
                <RotateCw className="h-4 w-4" />
                {t("status.refresh")}
              </button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[840px] border-collapse text-left text-sm">
              <thead className="bg-slate-50 text-xs font-bold text-slate-500">
                <tr>
                  <th className="px-4 py-3">{t("status.when")}</th>
                  <th className="px-4 py-3">{t("status.user")}</th>
                  <th className="px-4 py-3">{t("status.problem")}</th>
                  <th className="px-4 py-3">{t("status.language")}</th>
                  <th className="px-4 py-3">{t("status.verdict")}</th>
                  <th className="px-4 py-3">{t("status.time")}</th>
                  <th className="px-4 py-3">{t("status.memory")}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredJudgements.length === 0 ? (
                  <tr>
                    <td className="px-4 py-8 text-center text-sm font-medium text-slate-500" colSpan={7}>
                      {t("status.noResults")}
                    </td>
                  </tr>
                ) : null}
                {filteredJudgements.map((judgement) => (
                  <tr key={`${judgement.when}-${judgement.user}`} className="hover:bg-sky-50/70">
                    <td className="px-4 py-3 text-slate-500">{locale === "zh-CN" ? judgement.whenZh : judgement.when}</td>
                    <td className="px-4 py-3">
                      <Link className="font-semibold text-slate-900 hover:text-pink-600" href={`/users/${judgement.user}`}>
                        {judgement.user}
                      </Link>
                    </td>
                    <td className="px-4 py-3">
                      <Link className="font-bold text-sky-700 hover:text-pink-600" href={`/problems/${judgement.problem}`}>
                        {judgement.problem}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-slate-600">{judgement.lang}</td>
                    <td className="px-4 py-3">
                      <VerdictBadge value={judgement.verdict} />
                    </td>
                    <td className="px-4 py-3 text-slate-600">{judgement.time}</td>
                    <td className="px-4 py-3 text-slate-600">{judgement.memory}</td>
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
