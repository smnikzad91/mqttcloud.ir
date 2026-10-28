"use client";

// Single-series daily column chart (one hue, brand-500 — validated against
// both chart surfaces). Columns ≤24px with a 4px rounded top, square at the
// baseline; hover/focus shows a tooltip; an sr-only table carries the data.

import { useState } from "react";
import { useLanguage } from "@/context/LanguageContext";

export type DayPoint = { date: Date; value: number };

export default function DailyBars({ points, valueLabel, dayLabel, height = 140 }: { points: DayPoint[]; valueLabel: string; dayLabel: string; height?: number }) {
  const { lang } = useLanguage();
  const locale = lang === "fa" ? "fa-IR" : "en-US";
  const [hover, setHover] = useState<number | null>(null);
  const max = Math.max(1, ...points.map((p) => p.value));
  const day = (d: Date, opts: Intl.DateTimeFormatOptions = { month: "short", day: "numeric" }) => d.toLocaleDateString(locale, opts);
  const num = (n: number) => n.toLocaleString(locale);

  return (
    <figure>
      <div className="relative" style={{ height }}>
        {/* Recessive gridlines at 0 / ½ / max */}
        {[0, 0.5, 1].map((f) => (
          <div key={f} className="absolute inset-x-0 border-t border-dashed border-gray-100 dark:border-white/5" style={{ bottom: `${f * 100}%` }}>
            {f > 0 && <span className="absolute -top-2 end-0 bg-white ps-1 text-[10px] text-gray-400 dark:bg-gray-900">{num(Math.round(max * f))}</span>}
          </div>
        ))}
        <div className="absolute inset-0 flex items-end gap-[2px] pe-8">
          {points.map((p, i) => (
            <button
              key={i}
              type="button"
              aria-label={`${day(p.date)}: ${num(p.value)} ${valueLabel}`}
              onMouseEnter={() => setHover(i)}
              onMouseLeave={() => setHover(null)}
              onFocus={() => setHover(i)}
              onBlur={() => setHover(null)}
              className="group relative flex h-full flex-1 items-end justify-center outline-none"
            >
              <span
                className="w-full max-w-6 rounded-t bg-brand-500 transition-opacity group-hover:opacity-80 group-focus-visible:ring-2 group-focus-visible:ring-brand-300"
                style={{ height: p.value ? `${Math.max(3, (p.value / max) * 100)}%` : 0 }}
              />
              {hover === i && (
                <span role="tooltip" className="pointer-events-none absolute bottom-full z-10 mb-1 whitespace-nowrap rounded-lg bg-gray-900 px-2.5 py-1.5 text-xs text-white shadow-theme-lg dark:bg-gray-800">
                  <span className="block text-gray-300">{day(p.date, { weekday: "short", month: "short", day: "numeric" })}</span>
                  <span className="font-semibold">{num(p.value)} {valueLabel}</span>
                </span>
              )}
            </button>
          ))}
        </div>
      </div>
      {/* Baseline + sparse day labels (first, middle, last) */}
      <div className="mt-1 flex border-t border-gray-200 pe-8 pt-1.5 text-[10px] text-gray-400 dark:border-gray-800">
        {points.map((p, i) => (
          <span key={i} className="flex-1 text-center">{i === 0 || i === points.length - 1 || i === Math.floor(points.length / 2) ? day(p.date) : ""}</span>
        ))}
      </div>
      <table className="sr-only">
        <thead><tr><th>{dayLabel}</th><th>{valueLabel}</th></tr></thead>
        <tbody>{points.map((p, i) => <tr key={i}><td>{day(p.date)}</td><td>{p.value}</td></tr>)}</tbody>
      </table>
    </figure>
  );
}
