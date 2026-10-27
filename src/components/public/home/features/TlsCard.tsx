"use client";

import { useRef, useState } from "react";
import { ShieldCheck } from "lucide-react";
import { useReducedMotionSafe } from "@/components/public/shared/motion";
import { useLiveInterval, useTimeouts } from "@/components/public/shared/useLiveInterval";
import { SIG, fa } from "../signal";
import { CardHeader, SimButton, SpotlightCard, panelClass } from "./SpotlightCard";

const HEX = "0123456789ABCDEF";
const randomBytes = () =>
  Array.from({ length: 4 }, () => `0x${HEX[Math.floor(Math.random() * 16)]}${HEX[Math.floor(Math.random() * 16)]}`).join(" ");

/** Feature 2 — TLS: a plaintext packet enters an encrypted tunnel and leaves as ciphertext; the button fires a fake MITM probe at it. */
export function TlsCard() {
  const ref = useRef<HTMLDivElement>(null);
  const reduceMotion = useReducedMotionSafe();
  const later = useTimeouts();
  const [attacking, setAttacking] = useState(false);
  const [blocked, setBlocked] = useState(0);
  const [cipher, setCipher] = useState("0x9F 0xA4 0xE1 0x7C");

  useLiveInterval(() => setCipher(randomBytes()), 700, ref);

  function probe() {
    if (attacking) return;
    setAttacking(true);
    later(() => setBlocked((c) => c + 1), 550);
    later(() => setAttacking(false), 1700);
  }

  return (
    <SpotlightCard accent="rgba(122, 90, 248, 0.18)" trace={SIG.purple}>
      <div ref={ref}>
        <CardHeader
          icon={<ShieldCheck className="h-6 w-6" aria-hidden="true" />}
          gradient="from-theme-purple-500 to-theme-pink-500"
          title="اتصال امن با TLS"
          subtitle="رمزنگاری کل مسیر دستگاه تا بروکر"
          action={
            <SimButton onClick={probe} active={attacking} tone="error" icon={<ShieldCheck className="h-3.5 w-3.5" aria-hidden="true" />}>
              {attacking ? "حمله دفع شد!" : "شبیه‌سازی حمله MITM"}
            </SimButton>
          }
        />
        <p className="text-sm leading-relaxed text-gray-600 dark:text-gray-300 sm:text-base">
          هر اتصال با گواهی TLS رمزنگاری می‌شود و احراز هویت هر دستگاه با اکانت اختصاصی خودش انجام می‌گیرد.
        </p>
      </div>

      <div className={`mt-6 overflow-hidden p-3 sm:p-4 ${panelClass}`}>
        <div className="mb-2 flex flex-wrap items-center justify-between gap-2 text-[11px]">
          <span dir="ltr" className="font-mono-signal font-bold text-violet-300">{cipher}</span>
          <span className="font-bold text-success-400">مسدودشده در این دمو: {fa(blocked)}</span>
        </div>

        <svg viewBox="0 0 380 135" style={{ direction: "ltr" }} className="h-32 w-full overflow-visible" aria-hidden="true">
          <line x1="25" y1="68" x2="355" y2="68" stroke="rgba(122,90,248,0.35)" strokeWidth="16" strokeLinecap="round" />
          <line x1="25" y1="68" x2="355" y2="68" stroke={SIG.cyan} strokeWidth="2" strokeDasharray="6 6" />

          {!reduceMotion && (
            <>
              <circle r="5" fill={SIG.cyan}>
                <animateMotion dur="2.4s" repeatCount="indefinite" path="M 25 68 L 190 68" />
              </circle>
              <rect x="-6" y="-6" width="12" height="12" rx="3" fill={SIG.success}>
                <animateMotion dur="2.4s" begin="1.2s" repeatCount="indefinite" path="M 190 68 L 355 68" />
              </rect>
            </>
          )}

          <g transform="translate(190, 68)">
            <circle r="44" fill="none" stroke={SIG.purple} strokeWidth="2" strokeDasharray="18 10" className="origin-center animate-[orbit_12s_linear_infinite] [transform-box:fill-box]" />
            <circle r="34" fill="none" stroke={SIG.cyan} strokeWidth="1.8" strokeDasharray="12 8" className="origin-center animate-[orbit_9s_linear_infinite_reverse] [transform-box:fill-box]" />
            <circle r="22" fill={SIG.ink} stroke={attacking ? SIG.error : SIG.success} strokeWidth="2.5" />
            <text y="3.5" textAnchor="middle" fill="#ffffff" fontSize="9" fontWeight="900" className="font-mono-signal">TLS</text>
            {attacking && (
              <>
                <circle r="32" fill="none" stroke={SIG.error} strokeWidth="3" className="animate-ping" />
                <circle r="48" fill="none" stroke={SIG.cyan} strokeWidth="2" className="animate-pulse" />
              </>
            )}
          </g>

          {attacking && (
            <g>
              {!reduceMotion && (
                <circle r="6" fill={SIG.error}>
                  <animateMotion dur="0.65s" fill="freeze" path="M 190 2 L 190 36 L 145 8" />
                </circle>
              )}
              <text x="190" y="16" textAnchor="middle" fill={SIG.error} fontSize="9" fontWeight="900" className="font-mono-signal">MITM BLOCKED ✕</text>
            </g>
          )}

          <text x="45" y="118" textAnchor="middle" fill={SIG.muted} fontSize="9" className="font-mono-signal">{'{"c":24.8}'}</text>
          <text x="330" y="118" textAnchor="middle" fill={SIG.success} fontSize="9" fontWeight="700" className="font-mono-signal">ENCRYPTED ✓</text>
        </svg>
      </div>
    </SpotlightCard>
  );
}
