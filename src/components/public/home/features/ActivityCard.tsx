"use client";

import { useRef, useState } from "react";
import { BarChart3 } from "lucide-react";
import { useLiveInterval } from "@/components/public/shared/useLiveInterval";
import { SIG, fa } from "../signal";
import { CardHeader, SpotlightCard, panelClass } from "./SpotlightCard";

/** Feature 5 — live connection activity: radar sweep + a pulse line + a scrolling messages-per-second sparkline. */
export function ActivityCard() {
  const ref = useRef<HTMLDivElement>(null);
  const [bars, setBars] = useState([38, 62, 48, 84, 70, 92, 56, 78, 95, 66, 82, 88]);
  const [online, setOnline] = useState(24);

  useLiveInterval(() => {
    setBars((prev) => [...prev.slice(1), Math.floor(40 + Math.random() * 58)]);
    setOnline(23 + Math.floor(Math.random() * 3));
  }, 1100, ref);

  return (
    <SpotlightCard accent="rgba(18, 183, 106, 0.16)" trace={SIG.success}>
      <div ref={ref}>
        <CardHeader
          icon={<BarChart3 className="h-6 w-6" aria-hidden="true" />}
          gradient="from-success-500 to-theme-cyan-500"
          title="فعالیت اتصال لحظه‌ای"
          action={
            <span className="inline-flex shrink-0 items-center gap-1.5 self-start rounded-full border border-success-500/30 bg-success-500/15 px-2.5 py-1 text-[11px] font-extrabold text-success-600 dark:text-success-400">
              <span className="h-1.5 w-1.5 animate-ping rounded-full bg-success-400" />
              {fa(online)} دستگاه آنلاین
            </span>
          }
        />
        <p className="text-sm leading-relaxed text-gray-600 dark:text-gray-300">
          وضعیت آنلاین یا آفلاین هر دستگاه و تاریخچه اتصال آن را به‌صورت زنده در داشبورد دنبال کنید.
        </p>
      </div>

      <div dir="ltr" className={`mt-6 flex items-center justify-between gap-3 p-3.5 ${panelClass}`}>
        <div className="relative h-20 w-20 shrink-0 sm:h-24 sm:w-24">
          <svg viewBox="0 0 180 180" className="h-full w-full" aria-hidden="true">
            <circle cx="90" cy="90" r="80" fill="#091122" stroke="rgba(18,183,106,0.35)" strokeWidth="2" />
            <circle cx="90" cy="90" r="54" fill="none" stroke="rgba(18,183,106,0.2)" strokeDasharray="4 4" />
            <circle cx="90" cy="90" r="28" fill="none" stroke="rgba(18,183,106,0.2)" />
            <line x1="10" y1="90" x2="170" y2="90" stroke="rgba(18,183,106,0.15)" />
            <line x1="90" y1="10" x2="90" y2="170" stroke="rgba(18,183,106,0.15)" />
            <g className="origin-[90px_90px] animate-[orbit_4.8s_linear_infinite]">
              <path d="M 90 90 L 90 10 A 80 80 0 0 1 158 48 Z" fill="rgba(18,183,106,0.28)" />
              <line x1="90" y1="90" x2="90" y2="10" stroke={SIG.success} strokeWidth="2.5" />
            </g>
            <circle cx="125" cy="52" r="4" fill={SIG.success} className="animate-ping" />
            <circle cx="125" cy="52" r="3.5" fill={SIG.cyan} />
            <circle cx="52" cy="68" r="3.5" fill={SIG.success} />
            <circle cx="112" cy="128" r="3.5" fill={SIG.success} />
            <circle cx="65" cy="130" r="3" fill={SIG.cyan} className="animate-pulse" />
          </svg>
        </div>

        <div className="min-w-0 flex-1 space-y-2.5 overflow-hidden">
          <svg viewBox="0 0 160 42" className="h-10 w-full overflow-visible" aria-hidden="true">
            <path
              d="M 0 24 L 30 24 L 40 10 L 50 36 L 62 4 L 74 38 L 84 20 L 96 24 L 160 24"
              fill="none" stroke={SIG.success} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"
              strokeDasharray="320" className="animate-[ecg-dash_2.8s_linear_infinite]"
            />
          </svg>
          <div className="flex h-8 items-end gap-1 pt-1" aria-hidden="true">
            {bars.map((v, i) => (
              <div key={i} className="flex-1 rounded-t bg-gradient-to-t from-success-500/40 to-theme-cyan-500 transition-[height] duration-500" style={{ height: `${v}%` }} />
            ))}
          </div>
        </div>
      </div>
    </SpotlightCard>
  );
}
