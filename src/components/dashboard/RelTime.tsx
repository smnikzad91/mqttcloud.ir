"use client";

import { useLanguage } from "@/context/LanguageContext";
import { formatRelative, useNow } from "@/lib/relativeTime";
import { cn } from "@/components/dashboard/ui";

/** "3 hours ago" that keeps itself current; the exact time is in the tooltip. */
export function RelTime({ iso, className }: { iso: string; className?: string }) {
  const { lang } = useLanguage();
  const now = useNow(60_000);
  const exact = new Date(iso).toLocaleString(lang === "fa" ? "fa-IR" : "en-US", { dateStyle: "medium", timeStyle: "short", hour12: false });
  return <time dateTime={iso} title={exact} className={cn("whitespace-nowrap", className)}>{formatRelative(iso, lang, now)}</time>;
}

/** AG Grid cell for a relative timestamp; `context.neverLabel` covers null. */
export function RelativeCell({ value, context }: { value: string | null; context: { neverLabel?: string } }) {
  if (!value) return <span className="text-gray-400">{context.neverLabel ?? "—"}</span>;
  return <RelTime iso={value} className="text-xs text-gray-500 dark:text-gray-400" />;
}
