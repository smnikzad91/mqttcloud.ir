"use client";

import { useRef, useState } from "react";
import { Zap } from "lucide-react";
import { useReducedMotionSafe } from "@/components/public/shared/motion";
import { useLiveInterval, useTimeouts } from "@/components/public/shared/useLiveInterval";
import { SIG, fa } from "../signal";
import { CardHeader, SimButton, SpotlightCard, panelClass } from "./SpotlightCard";

const SUBS = [
  { y: 25, label: "SUB_1", color: SIG.violet, path: "M 265 65 C 330 65, 360 25, 445 25", dur: [1.4, 0.5] },
  { y: 65, label: "SUB_2", color: SIG.cyan, path: "M 265 65 C 340 65, 370 65, 445 65", dur: [1.2, 0.4] },
  { y: 105, label: "SUB_3", color: SIG.success, path: "M 265 65 C 330 65, 360 105, 445 105", dur: [1.5, 0.55] },
];

/** Feature 1 — real-time pub/sub: oscilloscope + one publisher fanning out to three subscribers, with a "burst" button. */
export function MessagingCard() {
  const ref = useRef<HTMLDivElement>(null);
  const reduceMotion = useReducedMotionSafe();
  const later = useTimeouts();
  const [bursting, setBursting] = useState(false);
  const [throughput, setThroughput] = useState(12450);
  const [latency, setLatency] = useState(15);

  useLiveInterval(() => {
    setThroughput(Math.floor(bursting ? 48200 + Math.random() * 4500 : 12100 + Math.random() * 750));
    setLatency(Math.floor(bursting ? 12 + Math.random() * 4 : 14 + Math.random() * 5));
  }, 900, ref);

  function burst() {
    if (bursting) return;
    setBursting(true);
    setThroughput(51840);
    setLatency(12);
    later(() => setBursting(false), 3600);
  }

  return (
    <SpotlightCard>
      <div ref={ref}>
        <CardHeader
          icon={<Zap className="h-6 w-6" aria-hidden="true" />}
          gradient="from-brand-500 to-theme-cyan-500"
          title="پیام‌رسانی بی‌درنگ"
          subtitle={<>تأخیر لحظه‌ای: <span dir="ltr">{fa(latency)}ms</span></>}
          action={
            <SimButton onClick={burst} active={bursting} icon={<Zap className="h-3.5 w-3.5" aria-hidden="true" />}>
              {bursting ? "در حال ارسال انبوه…" : "تست بار (Burst)"}
            </SimButton>
          }
        />
        <p className="text-sm leading-relaxed text-gray-600 dark:text-gray-300 sm:text-base">
          بروکر Aedes با تأخیر بسیار پایین، پیام‌های شما را در کسری از ثانیه بین دستگاه‌ها منتشر می‌کند.
        </p>
      </div>

      <div className={`mt-6 overflow-hidden p-3 sm:p-4 ${panelClass}`}>
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2 border-b border-white/10 pb-2 text-[11px]">
          <span dir="ltr" className="inline-flex items-center gap-1.5 font-mono-signal font-bold text-theme-cyan-500">
            <span className="h-2 w-2 animate-ping rounded-full bg-theme-cyan-500" />
            {bursting ? "BURST_MODE" : "STREAM_ACTIVE"}
          </span>
          <span className="font-bold text-success-400">
            {fa(throughput.toLocaleString("en-US"))} پیام/ثانیه
          </span>
        </div>

        <div dir="ltr" className="relative h-32 w-full overflow-hidden rounded-xl border border-white/5 bg-black/40 sm:h-36">
          <div
            aria-hidden="true"
            className="absolute inset-0 opacity-20"
            style={{
              backgroundImage: "linear-gradient(to right, rgba(0,240,255,0.2) 1px, transparent 1px), linear-gradient(to bottom, rgba(0,240,255,0.2) 1px, transparent 1px)",
              backgroundSize: "24px 24px",
            }}
          />

          <svg viewBox="0 0 600 130" className="absolute inset-y-0 left-0 h-full w-[140%] overflow-visible" preserveAspectRatio="none" aria-hidden="true">
            <g className={bursting ? "animate-[wave-slide_1.1s_linear_infinite]" : "animate-[wave-slide_4.5s_linear_infinite]"}>
              <path
                d="M 0 65 Q 25 15, 50 65 T 100 65 T 150 65 Q 175 15, 200 65 T 250 65 T 300 65 Q 325 15, 350 65 T 400 65 T 450 65 Q 475 15, 500 65 T 550 65 T 600 65 Q 625 15, 650 65 T 700 65 T 750 65 T 800 65"
                fill="none" stroke={bursting ? SIG.success : SIG.cyan} strokeWidth={bursting ? 3 : 2.2} strokeOpacity="0.85"
              />
              <path
                d="M 0 65 Q 35 110, 70 65 T 140 65 T 210 65 Q 245 110, 280 65 T 350 65 T 420 65 Q 455 110, 490 65 T 560 65 T 630 65 T 700 65 T 770 65"
                fill="none" stroke={SIG.purple} strokeWidth="1.8" strokeOpacity="0.65"
              />
            </g>
          </svg>

          <svg viewBox="0 0 500 130" className="relative z-10 h-full w-full" aria-label="یک ناشر، بروکر و سه مشترک">
            <g className="animate-[laser-scan-x_4.2s_ease-in-out_infinite]">
              <line x1="30" y1="0" x2="30" y2="130" stroke={SIG.cyan} strokeWidth="1.5" strokeOpacity="0.6" />
            </g>

            <path d="M 55 65 C 120 65, 160 65, 235 65" stroke="rgba(0,240,255,0.35)" strokeWidth="2" fill="none" />
            {SUBS.map((s) => (
              <path key={s.label} d={s.path} stroke={s.color} strokeOpacity="0.4" strokeWidth="1.8" fill="none" />
            ))}

            {!reduceMotion && (
              <>
                <circle r={bursting ? 5 : 3.5} fill={SIG.cyan}>
                  <animateMotion dur={bursting ? "0.45s" : "1.3s"} repeatCount="indefinite" path="M 55 65 C 120 65, 160 65, 235 65" />
                </circle>
                {SUBS.map((s) => (
                  <circle key={s.label} r={bursting ? 4.5 : 3} fill={s.color}>
                    <animateMotion dur={`${bursting ? s.dur[1] : s.dur[0]}s`} repeatCount="indefinite" path={s.path} />
                  </circle>
                ))}
              </>
            )}

            <g transform="translate(42, 65)">
              <rect x="-34" y="-16" width="68" height="32" rx="8" fill={SIG.raised} stroke={SIG.cyan} strokeWidth="1.5" />
              <text y="4" textAnchor="middle" fill={SIG.cyan} fontSize="9.5" fontWeight="800" className="font-mono-signal">PUB</text>
            </g>
            <g transform="translate(250, 65)">
              <circle r="24" fill={SIG.ink} stroke={SIG.cyan} strokeWidth="2" />
              <text y="3" textAnchor="middle" fill="#ffffff" fontSize="8.5" fontWeight="900" className="font-mono-signal">AEDES</text>
            </g>
            {SUBS.map((s) => (
              <g key={s.label} transform={`translate(458, ${s.y})`}>
                <rect x="-28" y="-12" width="56" height="24" rx="6" fill={SIG.raised} stroke={s.color} strokeWidth="1.4" />
                <text y="3.5" textAnchor="middle" fill={s.color} fontSize="8.5" fontWeight="800" className="font-mono-signal">{s.label}</text>
              </g>
            ))}
          </svg>
        </div>
      </div>
    </SpotlightCard>
  );
}
