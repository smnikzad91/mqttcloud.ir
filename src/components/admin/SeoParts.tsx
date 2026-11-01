"use client";

// Shared by the page SEO settings and the blog post editor's SEO panel.

import { useT } from "@/i18n/useT";
import { cn, useFormatNumber } from "@/components/dashboard/ui";

/** Length counter that turns amber outside the recommended range. */
export function SeoCounter({ n, min, max }: { n: number; min: number; max: number }) {
  const fmt = useFormatNumber();
  const t = useT();
  const ok = n >= min && n <= max;
  return <span className={cn("text-xs", ok ? "text-success-600 dark:text-success-400" : "text-warning-600 dark:text-warning-400")}>{fmt(n)} {t("seoChars")}</span>;
}

/** Approximates how Google renders the result; it cuts titles at ~60 and descriptions at ~160 characters. */
export function GooglePreview({ path, title, description }: { path: string; title: string; description: string }) {
  const crumbs = path === "/" ? "" : ` › ${path.replace(/^\//, "").split("/").join(" › ")}`;
  return (
    <div dir="rtl" className="space-y-1 rounded-xl border border-gray-100 bg-white p-4 font-sans dark:border-gray-800 dark:bg-gray-950">
      <p dir="ltr" className="truncate text-end text-xs text-gray-600 dark:text-gray-400">mqttcloud.ir{crumbs}</p>
      <p className="line-clamp-1 text-lg leading-snug text-[#1a0dab] dark:text-[#8ab4f8]">{title || "…"}</p>
      <p className="line-clamp-2 text-sm leading-relaxed text-gray-700 dark:text-gray-300">{description || "…"}</p>
    </div>
  );
}
