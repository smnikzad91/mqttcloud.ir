"use client";

import { useState } from "react";
import { Lock } from "lucide-react";
import { useReducedMotionSafe } from "@/components/public/shared/motion";
import { useTimeouts } from "@/components/public/shared/useLiveInterval";
import { DEMO_USER, SIG, fa } from "../signal";
import { CardHeader, SimButton, SpotlightCard, panelClass } from "./SpotlightCard";

/**
 * Feature 3 — topic namespaces. Mirrors the broker's real rule
 * (broker-service `isOwnNamespace`): a client may only publish/subscribe to
 * topics starting with its own username + "/".
 */
export function NamespaceCard() {
  const reduceMotion = useReducedMotionSafe();
  const later = useTimeouts();
  const [firing, setFiring] = useState(false);
  const [blocked, setBlocked] = useState(0);

  function fire() {
    if (firing) return;
    setFiring(true);
    later(() => setBlocked((b) => b + 1), 600);
    later(() => setFiring(false), 1500);
  }

  return (
    <SpotlightCard accent="rgba(70, 95, 255, 0.18)" trace={SIG.brand}>
      <div className="min-w-0">
        <CardHeader
          icon={<Lock className="h-6 w-6" aria-hidden="true" />}
          gradient="from-brand-500 to-theme-purple-500"
          title="namespace امن برای تاپیک‌ها"
        />
        <p className="text-sm leading-relaxed text-gray-600 dark:text-gray-300">
          هر اکانت فقط به تاپیک‌های زیرمجموعهٔ نام‌کاربری خودش دسترسی دارد؛ داده کاربران کاملاً از هم جداست.
        </p>
      </div>

      <div className={`mt-6 w-full min-w-0 space-y-3 overflow-hidden p-3.5 ${panelClass}`}>
        <div dir="ltr" className="flex items-center justify-between gap-2 border-b border-white/10 pb-2 font-mono-signal text-[10px]">
          <span className="truncate font-bold text-theme-cyan-500">user: {DEMO_USER}</span>
          <span className="shrink-0 rounded bg-white/5 px-1.5 py-0.5 text-gray-400">ACL: STRICT</span>
        </div>

        <div dir="ltr" className="w-full space-y-2.5 overflow-hidden">
          <div className="rounded-xl border border-success-500/25 bg-success-500/[0.05] p-2.5">
            <div className="mb-1.5 flex items-center justify-between gap-2">
              <span className="truncate font-mono-signal text-[11px] font-bold text-success-300">{DEMO_USER}/factory/temp</span>
              <span className="shrink-0 rounded border border-success-500/40 bg-success-500/20 px-1.5 py-0.5 font-mono-signal text-[9px] font-black text-success-400">ALLOWED ✓</span>
            </div>
            <svg viewBox="0 0 260 22" className="block h-5 w-full overflow-hidden" aria-hidden="true">
              <line x1="8" y1="11" x2="252" y2="11" stroke="rgba(18,183,106,0.3)" strokeWidth="2.5" strokeLinecap="round" />
              <line x1="165" y1="2" x2="165" y2="20" stroke={SIG.success} strokeWidth="1.5" strokeDasharray="3 3" />
              {!reduceMotion && (
                <>
                  <circle r="4" fill={SIG.success}>
                    <animateMotion dur="1.75s" repeatCount="indefinite" path="M 10 11 L 250 11" />
                  </circle>
                  <circle r="2.5" fill="#ffffff">
                    <animateMotion dur="1.75s" begin="0.85s" repeatCount="indefinite" path="M 10 11 L 250 11" />
                  </circle>
                </>
              )}
            </svg>
          </div>

          <div className={`rounded-xl border p-2.5 transition-colors duration-300 ${firing ? "border-error-500 bg-error-500/15" : "border-error-500/25 bg-error-500/[0.05]"}`}>
            <div className="mb-1.5 flex items-center justify-between gap-2">
              <span className="truncate font-mono-signal text-[11px] font-bold text-error-400">other_co/secret/data</span>
              <span className="shrink-0 rounded border border-error-500/40 bg-error-500/20 px-1.5 py-0.5 font-mono-signal text-[9px] font-black text-error-400">DENIED ✕</span>
            </div>
            <svg viewBox="0 0 260 22" className="block h-5 w-full overflow-hidden" aria-hidden="true">
              <line x1="8" y1="11" x2="165" y2="11" stroke="rgba(240,68,56,0.45)" strokeWidth="2.5" strokeLinecap="round" />
              <line x1="165" y1="11" x2="252" y2="11" stroke="rgba(148,163,184,0.2)" strokeWidth="2" strokeDasharray="4 4" />
              <rect x="162" y="2" width="6" height="18" rx="2" fill={SIG.error} />
              {!reduceMotion && (
                <circle r="4.5" fill={SIG.error}>
                  <animateMotion dur={firing ? "0.55s" : "1.9s"} repeatCount="indefinite" path="M 10 11 L 158 11" />
                </circle>
              )}
              {firing && <circle cx="165" cy="11" r="9" fill="none" stroke={SIG.error} strokeWidth="2" className="animate-ping" />}
            </svg>
          </div>
        </div>

        <SimButton onClick={fire} active={firing} tone="error" className="w-full" icon={<Lock className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />}>
          {firing ? "پکت غیرمجاز مسدود شد ✕" : `تست دسترسی غیرمجاز${blocked ? ` (${fa(blocked)})` : ""}`}
        </SimButton>
      </div>
    </SpotlightCard>
  );
}
