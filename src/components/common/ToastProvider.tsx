"use client";

import { Toaster } from "sonner";
import { useLanguage } from "@/context/LanguageContext";
import { useTheme } from "@/context/ThemeContext";

export default function ToastProvider() {
  const { lang } = useLanguage();
  const { theme } = useTheme();
  return (
    <Toaster
      richColors
      closeButton
      visibleToasts={4}
      theme={theme}
      dir={lang === "fa" ? "rtl" : "ltr"}
      position={lang === "fa" ? "bottom-left" : "bottom-right"}
    />
  );
}
