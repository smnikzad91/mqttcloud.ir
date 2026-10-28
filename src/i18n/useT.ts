"use client";

import { useCallback } from "react";
import { useLanguage } from "@/context/LanguageContext";
import translations, { TranslationKey } from "./translations";

export function useT() {
  const { lang } = useLanguage();
  // Stable per language, so components can safely list `t` in memo/effect deps.
  return useCallback(
    (key: TranslationKey) => {
      const dict = translations[lang] ?? translations.en;
      return dict[key] ?? translations.en[key];
    },
    [lang],
  );
}
