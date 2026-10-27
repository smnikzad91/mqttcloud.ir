"use client";

import { useState } from "react";
import { Plus, Settings2 } from "lucide-react";
import { useTimeouts } from "@/components/public/shared/useLiveInterval";
import { fa } from "../signal";
import { CardHeader, SimButton, SpotlightCard, panelClass } from "./SpotlightCard";

const MAX_DEMO_DEVICES = 5;
const STEP_LABELS = ["افزودن دستگاه تستی", "ساخت رمز عبور…", "ثبت شناسهٔ کلاینت…", "دستگاه آماده شد ✓"];

/** Feature 4 — no-code management: "add device" walks through the same steps the dashboard does (credential → client id → ready). */
export function ProvisioningCard() {
  const later = useTimeouts();
  const [devices, setDevices] = useState(["sensor-hall-01", "valve-main-02"]);
  const [step, setStep] = useState(0);

  function addDevice() {
    if (step !== 0) return;
    setStep(1);
    later(() => setStep(2), 550);
    later(() => {
      setStep(3);
      setDevices((prev) => (prev.length >= MAX_DEMO_DEVICES ? ["sensor-hall-01"] : [...prev, `device-0${prev.length + 1}`]));
    }, 1150);
    later(() => setStep(0), 2100);
  }

  return (
    <SpotlightCard>
      <div>
        <CardHeader
          icon={<Settings2 className="h-6 w-6" aria-hidden="true" />}
          gradient="from-brand-600 to-theme-cyan-500"
          title="مدیریت بدون کدنویسی"
          action={
            <SimButton onClick={addDevice} active={step !== 0} disabled={step !== 0} icon={<Plus className="h-3.5 w-3.5" aria-hidden="true" />}>
              {STEP_LABELS[step]}
            </SimButton>
          }
        />
        <p className="text-sm leading-relaxed text-gray-600 dark:text-gray-300">
          اکانت و دستگاه جدید را از داشبورد در چند کلیک بسازید؛ بدون نیاز به تنظیم دستی سرور.
        </p>
      </div>

      <div className={`mt-6 space-y-3 p-3.5 text-xs ${panelClass}`}>
        <div className="flex items-center justify-between border-b border-white/10 pb-2.5">
          <span className="flex items-center gap-1.5 text-[11px] text-gray-300">
            <span className="h-2 w-2 animate-ping rounded-full bg-success-400" />
            دستگاه‌های ثبت‌شده
          </span>
          <span className="font-mono-signal text-[11px] text-gray-300">{fa(devices.length)}/{fa(MAX_DEMO_DEVICES)}</span>
        </div>

        <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/10">
          <div
            className="h-full rounded-full bg-gradient-to-l from-brand-500 to-theme-cyan-500 transition-[width] duration-500"
            style={{ width: `${step === 0 ? (devices.length / MAX_DEMO_DEVICES) * 100 : (step / 3) * 100}%` }}
          />
        </div>

        <div dir="ltr" className="flex flex-wrap gap-1.5 pt-1">
          {devices.map((id) => (
            <span key={id} className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/10 px-2.5 py-1 font-mono-signal text-[11px]">
              <span className="h-1.5 w-1.5 rounded-full bg-success-400" />
              {id}
              <span className="text-[9px] text-theme-cyan-500">TLS</span>
            </span>
          ))}
        </div>
      </div>
    </SpotlightCard>
  );
}
