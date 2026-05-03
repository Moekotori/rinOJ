"use client";

import { translate, type TranslationKey } from "./i18n";
import { useLocaleStore } from "./use-locale-store";

export function useTranslation() {
  const locale = useLocaleStore((state) => state.locale);
  return {
    locale,
    t: (key: TranslationKey, values?: Record<string, string | number>) => {
      let text = translate(locale, key);

      if (values) {
        for (const [name, value] of Object.entries(values)) {
          text = text.replaceAll(`{${name}}`, String(value));
        }
      }

      return text;
    },
  };
}
