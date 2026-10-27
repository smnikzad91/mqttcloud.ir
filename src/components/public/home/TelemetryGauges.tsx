import { Activity, ShieldCheck, Wifi, Zap } from "lucide-react";
import { Stagger, StaggerItem } from "@/components/public/shared/Stagger";
import { CountUp } from "@/components/public/shared/CountUp";
import { SIG } from "./signal";

const metrics = [
  { icon: Zap, value: "۵۰ms", label: "میانگین تأخیر پیام", sub: "هستهٔ سبک Aedes", percent: 94, color: SIG.cyan, animate: true },
  { icon: ShieldCheck, value: "TLS", label: "اتصال رمزنگاری‌شده", sub: "روی پورت ۸۸۸۳", percent: 100, color: SIG.purple, animate: false },
  { icon: Activity, value: "۹۹.۹٪", label: "پایداری بروکر", sub: "در دسترس در تمام ساعات", percent: 99, color: SIG.success, animate: true },
  { icon: Wifi, value: "۲۴/۷", label: "بروکر همیشه فعال", sub: "پایش لحظه‌ای اتصال‌ها", percent: 100, color: SIG.brand, animate: false },
];

const RADIUS = 26;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

export default function TelemetryGauges() {
  return (
    <section aria-label="شاخص‌های سرویس" className="relative border-y border-gray-200 bg-white/80 py-8 dark:border-white/10 dark:bg-gray-900 sm:py-10">
      <Stagger className="mx-auto grid max-w-7xl grid-cols-2 gap-3 px-4 sm:gap-5 sm:px-6 lg:grid-cols-4 lg:px-8" stagger={0.07}>
        {metrics.map((m) => (
          <StaggerItem
            key={m.label}
            className="group flex flex-col-reverse items-start gap-3 rounded-2xl border border-gray-200 bg-gray-50/70 p-4 transition-colors duration-300 hover:border-brand-500/50 dark:border-white/10 dark:bg-white/[0.02] dark:hover:border-theme-cyan-500/40 sm:flex-row sm:items-center sm:justify-between sm:gap-4 sm:p-5"
          >
            <div className="min-w-0 space-y-1">
              <div className="text-xl font-black text-gray-900 dark:text-white sm:text-3xl">
                {m.animate ? <CountUp value={m.value} /> : m.value}
              </div>
              <div className="text-xs font-extrabold text-gray-700 dark:text-gray-200 sm:text-sm">{m.label}</div>
              <div className="hidden text-xs text-gray-500 dark:text-gray-400 sm:block">{m.sub}</div>
            </div>

            <div className="relative flex h-11 w-11 shrink-0 items-center justify-center sm:h-16 sm:w-16">
              <svg className="h-full w-full -rotate-90" viewBox="0 0 64 64" aria-hidden="true">
                <circle cx="32" cy="32" r={RADIUS} fill="none" stroke="currentColor" strokeWidth="4" className="text-gray-200 dark:text-white/10" />
                <circle
                  cx="32" cy="32" r={RADIUS} fill="none" stroke={m.color} strokeWidth="4" strokeLinecap="round"
                  strokeDasharray={CIRCUMFERENCE}
                  strokeDashoffset={CIRCUMFERENCE - (m.percent / 100) * CIRCUMFERENCE}
                />
              </svg>
              <m.icon className="absolute h-4 w-4 transition-transform duration-300 group-hover:scale-110 sm:h-5 sm:w-5" style={{ color: m.color }} aria-hidden="true" />
            </div>
          </StaggerItem>
        ))}
      </Stagger>
    </section>
  );
}
