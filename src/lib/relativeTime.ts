"use client";

import { useEffect, useState } from "react";

const UNITS: [Intl.RelativeTimeFormatUnit, number][] = [
  ["year", 365 * 864e5], ["month", 30 * 864e5], ["week", 7 * 864e5],
  ["day", 864e5], ["hour", 36e5], ["minute", 6e4], ["second", 1e3],
];

/** "2 minutes ago" / "۲ دقیقه پیش" — `now` is passed in so callers can re-render on a tick. */
export function formatRelative(iso: string, lang: "fa" | "en", now: number = Date.now()): string {
  const diff = new Date(iso).getTime() - now;
  const rtf = new Intl.RelativeTimeFormat(lang === "fa" ? "fa" : "en", { numeric: "auto" });
  if (Math.abs(diff) < 45e3) return rtf.format(0, "second");
  for (const [unit, ms] of UNITS) {
    if (Math.abs(diff) >= ms || unit === "second") return rtf.format(Math.round(diff / ms), unit);
  }
  return "";
}

/** Current time that re-renders the caller every `intervalMs` (for relative timestamps). */
export function useNow(intervalMs = 30_000) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), intervalMs);
    return () => clearInterval(id);
  }, [intervalMs]);
  return now;
}
