"use client";

import { localeLabels, type Locale } from "@/lib/i18n";
import { useLocaleStore } from "@/lib/use-locale-store";

const locales: Locale[] = ["zh-CN", "en-US"];

export function LanguageSwitcher() {
  const { locale, setLocale } = useLocaleStore();

  return (
    <div className="inline-flex rounded-lg border border-slate-200 bg-white p-1" aria-label="Language">
      {locales.map((item) => (
        <button
          key={item}
          className={`rounded-md px-2 py-1 text-xs font-bold ${locale === item ? "bg-slate-950 text-white" : "text-slate-600 hover:bg-slate-100"}`}
          onClick={() => setLocale(item)}
          type="button"
        >
          {localeLabels[item]}
        </button>
      ))}
    </div>
  );
}
