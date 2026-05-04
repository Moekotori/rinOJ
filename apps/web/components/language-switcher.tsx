"use client";

import { localeLabels, type Locale } from "@/lib/i18n";
import { useLocaleStore } from "@/lib/use-locale-store";

const locales: Locale[] = ["zh-CN", "en-US"];

export function LanguageSwitcher() {
  const { locale, setLocale } = useLocaleStore();

  return (
    <div
      className="inline-flex rounded-md border border-slate-200 bg-slate-50 p-0.5"
      aria-label="Language"
    >
      {locales.map((item) => (
        <button
          key={item}
          className={`rounded px-2.5 py-1.5 text-[11px] font-bold tracking-wide transition duration-150 ${
            locale === item
              ? "bg-slate-900 text-white shadow-sm"
              : "text-slate-500 hover:bg-white/95 hover:text-slate-800"
          }`}
          onClick={() => setLocale(item)}
          type="button"
        >
          {localeLabels[item]}
        </button>
      ))}
    </div>
  );
}
