"use client";

import { useRef, useState, type ReactNode } from "react";
import { KeyRound, Play, Plug, Radio, RefreshCw, Send, Sparkles, type LucideIcon } from "lucide-react";
import { Reveal } from "@/components/public/shared/Reveal";
import { useReducedMotionSafe } from "@/components/public/shared/motion";
import { useLiveInterval, useTimeouts } from "@/components/public/shared/useLiveInterval";
import { DEMO_USER, MQTT_PORT_TLS, SIG, fa } from "./signal";

const STEP_TITLES = ["اکانت بسازید", "دستگاه را متصل کنید", "فعالیت را دنبال کنید"];

interface FeedEvent {
  id: number;
  title: string;
  topic: string;
  qos: string;
  time: string;
}

const SAMPLE_EVENTS = [
  { title: "فشار شیر: ۱.۸ bar دریافت شد", topic: `${DEMO_USER}/valve-02`, qos: "QoS 1" },
  { title: "پینگ KeepAlive از device-03 ✓", topic: `${DEMO_USER}/gateway`, qos: "QoS 0" },
  { title: "رطوبت: ۴۴٪ منتشر شد", topic: `${DEMO_USER}/humidity`, qos: "QoS 1" },
  { title: "device-01 متصل شد ✓", topic: `${DEMO_USER}/status`, qos: "QoS 1" },
];

const PW_CHARS = "abcdefghjkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const randomPassword = () => Array.from({ length: 12 }, () => PW_CHARS[Math.floor(Math.random() * PW_CHARS.length)]).join("");

/**
 * Three-step pipeline. Desktop shows all three cards on a shared conduit;
 * below lg only the active step is shown and the step pills act as tabs —
 * three tall interactive cards stacked on a phone was a lot of scrolling.
 */
export default function HowItWorks() {
  const reduceMotion = useReducedMotionSafe();
  const later = useTimeouts();
  const sectionRef = useRef<HTMLElement>(null);
  const [active, setActive] = useState(0);
  const [autoRunning, setAutoRunning] = useState(false);

  // Step 1 — credential
  const [forging, setForging] = useState(false);
  const [password, setPassword] = useState("q7Rm2xKp9wTd");
  const [pwVersion, setPwVersion] = useState(1);
  const [flash, setFlash] = useState(false);

  // Step 2 — devices
  const [phase, setPhase] = useState<0 | 1 | 2>(2);
  const [devices, setDevices] = useState([
    { id: "device-01", hw: "ESP32", rtt: 12, bars: [85, 100, 75, 95] },
    { id: "device-02", hw: "RPi-4", rtt: 18, bars: [70, 90, 100, 80] },
    { id: "device-03", hw: "PLC", rtt: 15, bars: [95, 80, 90, 100] },
  ]);

  // Step 3 — activity feed
  const [rate, setRate] = useState(42);
  const [ripple, setRipple] = useState(false);
  const [feed, setFeed] = useState<FeedEvent[]>([
    { id: 1, title: "device-01 متصل شد ✓", topic: `${DEMO_USER}/status`, qos: "QoS 1", time: "همین الان" },
    { id: 2, title: "دمای ۲۴.۸ درجه منتشر شد", topic: `${DEMO_USER}/temp`, qos: "QoS 1", time: "۲ ثانیه پیش" },
    { id: 3, title: "اشتراک تاپیک تأیید شد ✓", topic: `${DEMO_USER}/factory/#`, qos: "QoS 1", time: "۵ ثانیه پیش" },
  ]);

  useLiveInterval(() => {
    setDevices((prev) =>
      prev.map((d) => ({
        ...d,
        rtt: Math.max(9, Math.min(24, d.rtt + Math.floor(Math.random() * 5) - 2)),
        bars: d.bars.map(() => Math.floor(55 + Math.random() * 45)),
      })),
    );
  }, 1300, sectionRef);

  function regeneratePassword() {
    if (forging) return;
    setActive(0);
    setForging(true);
    for (let i = 1; i <= 7; i++) later(() => setPassword(randomPassword()), i * 80);
    later(() => {
      setForging(false);
      setPwVersion((v) => v + 1);
      setFlash(true);
    }, 600);
    later(() => setFlash(false), 1800);
  }

  function reconnectAll() {
    if (phase !== 2) return;
    setActive(1);
    setPhase(0);
    later(() => setPhase(1), 550);
    later(() => setPhase(2), 1250);
  }

  function emitEvent() {
    setActive(2);
    setRipple(true);
    setRate((r) => Math.min(98, r + Math.floor(Math.random() * 14) + 5));
    const sample = SAMPLE_EVENTS[Math.floor(Math.random() * SAMPLE_EVENTS.length)];
    setFeed((prev) => [{ ...sample, id: Date.now(), time: "همین الان" }, ...prev.slice(0, 2)]);
    later(() => setRipple(false), 750);
  }

  function autoRun() {
    if (autoRunning) return;
    setAutoRunning(true);
    regeneratePassword();
    later(reconnectAll, 2000);
    later(emitEvent, 3900);
    later(() => setAutoRunning(false), 5600);
  }

  const reconnecting = phase !== 2;

  return (
    <section ref={sectionRef} id="how-it-works" className="relative scroll-mt-24 overflow-hidden border-y border-gray-200 bg-gray-100/70 py-16 dark:border-white/10 dark:bg-gray-900 sm:py-28">
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute top-12 right-1/4 h-80 w-80 rounded-full bg-brand-500/10 blur-[130px] dark:bg-brand-500/15" />
        <div className="absolute bottom-10 left-1/4 h-80 w-80 rounded-full bg-theme-cyan-500/5 blur-[130px] dark:bg-theme-cyan-500/15" />
      </div>

      <div className="relative z-10 mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <Reveal className="mx-auto mb-8 max-w-2xl text-center sm:mb-10">
          <span className="mb-3 inline-flex items-center gap-2 rounded-full border border-brand-500/30 bg-brand-500/10 px-4 py-1.5 text-xs font-extrabold text-brand-600 dark:text-theme-cyan-500">
            <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
            نحوه کار
          </span>
          <h2 className="text-3xl font-black tracking-tight text-gray-900 dark:text-white sm:text-4xl lg:text-5xl">چطور کار می‌کند؟</h2>
          <p className="mt-3 text-base text-gray-600 dark:text-gray-300 sm:text-lg">
            در سه قدم ساده، دستگاه‌های خود را به بروکر MQTT وصل کنید.
          </p>
        </Reveal>

        {/* Controller: step tabs + auto-run */}
        <Reveal delay={0.05} className="mb-8 sm:mb-12">
          <div className="mx-auto max-w-5xl rounded-2xl border border-gray-200 bg-white/90 p-3 shadow-lg backdrop-blur-xl dark:border-white/10 dark:bg-gray-950/90 sm:p-4">
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div className="flex items-center gap-3">
                <span className="relative flex h-3 w-3 shrink-0">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-brand-400 opacity-75 dark:bg-theme-cyan-500" />
                  <span className="relative inline-flex h-3 w-3 rounded-full bg-brand-500 dark:bg-theme-cyan-500" />
                </span>
                <span className="text-sm font-extrabold text-gray-800 dark:text-white">
                  مرحله {fa(active + 1)}: {STEP_TITLES[active]}
                </span>
              </div>

              <div className="grid grid-cols-3 gap-1.5 rounded-xl border border-gray-200 bg-gray-100 p-1 dark:border-white/10 dark:bg-white/[0.04]" role="tablist" aria-label="مراحل">
                {STEP_TITLES.map((title, i) => (
                  <button
                    key={title}
                    type="button"
                    role="tab"
                    aria-selected={active === i}
                    onClick={() => setActive(i)}
                    className={`min-h-9 cursor-pointer rounded-lg px-3 py-1.5 text-xs font-extrabold transition-colors ${
                      active === i
                        ? "bg-gradient-to-l from-brand-500 to-theme-purple-500 text-white shadow-sm"
                        : "text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white"
                    }`}
                  >
                    گام {fa(i + 1)}
                  </button>
                ))}
              </div>

              <button
                type="button"
                onClick={autoRun}
                disabled={autoRunning}
                className={`inline-flex min-h-10 cursor-pointer items-center justify-center gap-2 rounded-xl px-4 py-2 text-xs font-black shadow-md transition-all disabled:cursor-default ${
                  autoRunning
                    ? "bg-success-400 text-gray-950"
                    : "bg-gradient-to-l from-brand-500 via-theme-purple-500 to-theme-cyan-500 text-white hover:brightness-110 active:scale-95"
                }`}
              >
                {autoRunning ? <RefreshCw className="h-3.5 w-3.5 animate-spin" aria-hidden="true" /> : <Play className="h-3.5 w-3.5 fill-current" aria-hidden="true" />}
                {autoRunning ? "در حال اجرای ۳ مرحله…" : "اجرای خودکار هر ۳ مرحله"}
              </button>
            </div>

            <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-gray-200 dark:bg-white/10">
              <div className="h-full rounded-full bg-gradient-to-l from-brand-500 via-theme-purple-500 to-theme-cyan-500 transition-[width] duration-500" style={{ width: `${((active + 1) / 3) * 100}%` }} />
            </div>
          </div>
        </Reveal>

        <div className="relative">
          {/* Desktop conduit behind the cards, flowing right→left (step 1 → 3) */}
          <div aria-hidden="true" className="pointer-events-none absolute inset-x-8 top-1/2 z-0 hidden -translate-y-1/2 lg:block">
            <svg viewBox="0 0 1100 120" className="h-28 w-full overflow-visible">
              <defs>
                <linearGradient id="conduit-grad" x1="100%" y1="0%" x2="0%" y2="0%">
                  <stop offset="0%" stopColor={SIG.brand} stopOpacity="0.85" />
                  <stop offset="50%" stopColor={SIG.purple} stopOpacity="0.85" />
                  <stop offset="100%" stopColor={SIG.cyan} stopOpacity="0.95" />
                </linearGradient>
              </defs>
              <line x1="960" y1="60" x2="140" y2="60" stroke="url(#conduit-grad)" strokeWidth="6" strokeOpacity="0.2" strokeLinecap="round" />
              <path d="M 960 45 L 140 45" stroke="url(#conduit-grad)" strokeWidth="2" strokeDasharray="8 6" fill="none" />
              <path d="M 960 75 L 140 75" stroke="rgba(0,240,255,0.35)" strokeWidth="1.5" strokeDasharray="4 8" fill="none" />
              {!reduceMotion && (
                <>
                  <circle r="6" fill={SIG.cyan}>
                    <animateMotion dur={autoRunning ? "1.4s" : "3.2s"} repeatCount="indefinite" path="M 960 45 L 140 45" />
                  </circle>
                  <circle r="5" fill={SIG.violet}>
                    <animateMotion dur={autoRunning ? "1.4s" : "3.2s"} begin="1.1s" repeatCount="indefinite" path="M 960 45 L 140 45" />
                  </circle>
                  <rect x="-6" y="-4" width="12" height="8" rx="3" fill={SIG.success}>
                    <animateMotion dur={autoRunning ? "1.6s" : "3.8s"} begin="0.5s" repeatCount="indefinite" path="M 960 75 L 140 75" />
                  </rect>
                </>
              )}
            </svg>
          </div>

          <div className="relative z-10 grid grid-cols-1 items-stretch gap-7 lg:grid-cols-3">
            <StepCard index={0} active={active} onSelect={setActive} icon={KeyRound} gradient="from-brand-500 to-theme-purple-500"
              desc="از داشبورد یک اکانت MQTT با نام‌کاربری و رمز عبور اختصاصی بسازید. بدون کدنویسی.">
              <div className="flex items-center justify-between gap-2 border-b border-white/10 pb-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span dir="ltr" className="font-mono-signal text-sm font-black">{DEMO_USER}</span>
                    <span className="inline-flex items-center gap-1 rounded-full border border-success-500/40 bg-success-500/20 px-2 py-0.5 text-[10px] font-extrabold text-success-400">
                      <span className="h-1.5 w-1.5 rounded-full bg-success-400" />
                      فعال
                    </span>
                  </div>
                  <span dir="ltr" className="mt-0.5 block truncate text-end font-mono-signal text-[11px] text-theme-cyan-500">topics: {DEMO_USER}/#</span>
                </div>
                <svg viewBox="0 0 64 64" className="h-14 w-14 shrink-0 overflow-visible" aria-hidden="true">
                  <circle cx="32" cy="32" r="27" fill="none" stroke={SIG.brand} strokeWidth="1.5" strokeDasharray="10 6" className="origin-center animate-[orbit_12s_linear_infinite] [transform-box:fill-box]" />
                  <circle cx="32" cy="32" r="21" fill="none" stroke={SIG.cyan} strokeWidth="1.4" strokeDasharray="6 6" className="origin-center animate-[orbit_9s_linear_infinite_reverse] [transform-box:fill-box]" />
                  <path d="M32 14 L46 20 V31 C46 41 39.5 47.5 32 50 C24.5 47.5 18 41 18 31 V20 L32 14 Z" fill={flash ? "rgba(18,183,106,0.35)" : SIG.ink} stroke={flash ? SIG.success : SIG.cyan} strokeWidth="1.8" />
                  <text x="32" y="35" textAnchor="middle" fill="#ffffff" fontSize="8.5" fontWeight="900" className="font-mono-signal">TLS</text>
                  <line x1="16" y1="14" x2="48" y2="14" stroke={SIG.cyan} strokeWidth="1.5" className="animate-[laser-scan-y_2.6s_ease-in-out_infinite]" />
                </svg>
              </div>

              <div className="flex items-center justify-between gap-2 rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2">
                <div className="min-w-0">
                  <span className="block text-[10px] text-gray-400">رمز عبور (نسخه {fa(pwVersion)})</span>
                  <span dir="ltr" className={`block truncate text-end font-mono-signal text-xs font-bold transition-colors ${forging ? "text-warning-400" : flash ? "text-success-400" : "text-theme-cyan-500"}`}>
                    {password}
                  </span>
                </div>
                <span className={`shrink-0 rounded-md px-2 py-0.5 font-mono-signal text-[10px] font-bold transition-colors ${flash ? "bg-success-500 text-gray-950" : "bg-success-500/15 text-success-400"}`}>
                  {flash ? "SAVED ✓" : "bcrypt"}
                </span>
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-[11px] font-bold">
                  <span className="text-gray-300">سقف دستگاه: ۳</span>
                  <span className="text-theme-cyan-500">۲ از ۳ ثبت‌شده</span>
                </div>
                <div className="relative h-2.5 w-full overflow-hidden rounded-full bg-white/10">
                  <div className="relative h-full w-2/3 overflow-hidden rounded-full bg-gradient-to-l from-brand-500 via-theme-purple-500 to-theme-cyan-500">
                    <div className="absolute inset-0 w-1/2 animate-[shimmer-sweep_2.4s_linear_infinite] bg-gradient-to-r from-transparent via-white/50 to-transparent" />
                  </div>
                </div>
              </div>

              <PanelButton onClick={regeneratePassword} tone="brand" icon={<RefreshCw className={`h-3.5 w-3.5 ${forging ? "animate-spin" : ""}`} aria-hidden="true" />}>
                {forging ? "در حال ساخت رمز جدید…" : "ساخت رمز عبور جدید"}
              </PanelButton>
            </StepCard>

            <StepCard index={1} active={active} onSelect={setActive} icon={Plug} gradient="from-brand-600 to-theme-cyan-500"
              desc="دستگاه یا اپلیکیشن خود را با آدرس بروکر و اطلاعات اکانت به mqttcloud.ir متصل کنید.">
              <div className="flex items-center justify-between border-b border-white/10 pb-2 text-xs">
                <span className="font-bold text-gray-300">وضعیت اتصال</span>
                <span className="inline-flex items-center gap-1.5 rounded-full bg-success-500/15 px-2.5 py-0.5 text-[11px] font-extrabold text-success-400">
                  <span className="h-1.5 w-1.5 animate-ping rounded-full bg-success-400" />
                  فعال · <span dir="ltr">:{MQTT_PORT_TLS}</span>
                </span>
              </div>

              <div dir="ltr" className="relative h-20 w-full overflow-hidden rounded-xl border border-white/5 bg-black/40 px-2 py-1">
                <svg viewBox="0 0 320 74" className="h-full w-full overflow-visible" aria-hidden="true">
                  {[
                    { d: "M 48 14 C 135 14, 165 37, 255 37", c: SIG.cyan, dur: [1.6, 0.55], begin: "0s" },
                    { d: "M 48 37 L 255 37", c: SIG.violet, dur: [1.8, 0.6], begin: "0.3s" },
                    { d: "M 48 60 C 135 60, 165 37, 255 37", c: SIG.success, dur: [1.5, 0.5], begin: "0.6s" },
                  ].map((p) => (
                    <g key={p.d}>
                      <path d={p.d} stroke={p.c} strokeOpacity="0.4" strokeWidth="1.6" fill="none" />
                      {!reduceMotion && (
                        <circle r="3.5" fill={p.c}>
                          <animateMotion dur={`${reconnecting ? p.dur[1] : p.dur[0]}s`} begin={p.begin} repeatCount="indefinite" path={p.d} />
                        </circle>
                      )}
                    </g>
                  ))}
                  {devices.map((d, i) => (
                    <g key={d.id} transform={`translate(26, ${14 + i * 23})`}>
                      <rect x="-22" y="-9" width="44" height="18" rx="4" fill={SIG.raised} stroke={[SIG.cyan, SIG.violet, SIG.success][i]} strokeWidth="1.2" />
                      <text y="3" textAnchor="middle" fill="#ffffff" fontSize="8" fontWeight="800" className="font-mono-signal">{d.hw}</text>
                    </g>
                  ))}
                  <g transform="translate(272, 37)">
                    <circle r="20" fill={SIG.ink} stroke={reconnecting ? SIG.success : SIG.cyan} strokeWidth="2" />
                    <text y="-2" textAnchor="middle" fill="#ffffff" fontSize="7.5" fontWeight="900" className="font-mono-signal">BROKER</text>
                    <text y="8" textAnchor="middle" fill={SIG.cyan} fontSize="7" fontWeight="700" className="font-mono-signal">:{MQTT_PORT_TLS}</text>
                  </g>
                </svg>
              </div>

              <div className="space-y-1.5">
                {devices.map((d) => (
                  <div key={d.id} className="flex items-center justify-between rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2">
                    <div dir="ltr" className="flex items-center gap-2.5">
                      <div className="flex h-3.5 w-4 items-end gap-0.5" aria-hidden="true">
                        {d.bars.map((b, i) => (
                          <span key={i} className="w-0.5 rounded-t bg-theme-cyan-500 transition-[height] duration-300" style={{ height: `${b}%` }} />
                        ))}
                      </div>
                      <span className="font-mono-signal text-xs font-bold">{d.id}</span>
                    </div>
                    <div className="flex items-center gap-2 text-[11px]">
                      <span dir="ltr" className="font-mono-signal text-gray-400">{fa(d.rtt)}ms</span>
                      {phase === 0 && <span className="font-mono-signal font-bold text-warning-400">CONNECT…</span>}
                      {phase === 1 && <span className="font-mono-signal font-bold text-theme-cyan-500">TLS…</span>}
                      {phase === 2 && <span className="font-bold text-success-400">متصل ✓</span>}
                    </div>
                  </div>
                ))}
              </div>

              <PanelButton onClick={reconnectAll} tone="cyan" icon={<RefreshCw className={`h-3.5 w-3.5 ${reconnecting ? "animate-spin" : ""}`} aria-hidden="true" />}>
                {reconnecting ? "در حال برقراری اتصال TLS…" : "شبیه‌سازی اتصال مجدد"}
              </PanelButton>
            </StepCard>

            <StepCard index={2} active={active} onSelect={setActive} icon={Radio} gradient="from-success-500 to-theme-cyan-500"
              desc="اتصال، قطع اتصال و وضعیت هر دستگاه را به‌صورت لحظه‌ای در داشبورد مشاهده کنید.">
              <div className={`flex items-center justify-between gap-2 rounded-xl border p-2.5 transition-all ${ripple ? "border-success-400 bg-success-500/20 shadow-[0_0_20px_rgba(18,183,106,0.4)]" : "border-white/10 bg-white/[0.04]"}`}>
                <div className="flex items-center gap-2.5">
                  <div className="relative flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-tr from-brand-500 to-theme-cyan-500 text-sm font-black text-gray-950">
                    M
                    <span className="absolute -top-1 -right-1 h-2.5 w-2.5 rounded-full bg-success-400 ring-2 ring-gray-950" />
                  </div>
                  <div>
                    <div className="text-xs font-extrabold">گزارش mqttcloud.ir</div>
                    <div className="text-[10px] font-bold text-success-400">همین الان · اتصال</div>
                  </div>
                </div>
                <span dir="ltr" className="rounded-lg border border-theme-cyan-500/30 bg-theme-cyan-500/15 px-2 py-1 font-mono-signal text-[10px] font-extrabold text-theme-cyan-500">
                  {fa(rate)} msg/s
                </span>
              </div>

              <div className="space-y-1.5" aria-live="polite">
                {feed.map((ev, i) => (
                  <div key={ev.id} className={`animate-[event-enter_0.4s_cubic-bezier(0.16,1,0.3,1)] rounded-xl border px-3 py-2 text-xs ${i === 0 ? "border-success-500/40 bg-success-500/10" : "border-white/5 bg-white/[0.03]"}`}>
                    <div className="flex items-center justify-between gap-2">
                      <span className="truncate font-bold">{ev.title}</span>
                      <span className="shrink-0 text-[10px] text-gray-400">{ev.time}</span>
                    </div>
                    <div dir="ltr" className="mt-1 flex items-center justify-between gap-2 font-mono-signal text-[10px] text-gray-400">
                      <span className="truncate text-theme-cyan-500">{ev.topic}</span>
                      <span className="shrink-0 font-bold text-success-400">{ev.qos}</span>
                    </div>
                  </div>
                ))}
              </div>

              <PanelButton onClick={emitEvent} tone="success" icon={<Send className="h-3.5 w-3.5" aria-hidden="true" />}>
                ارسال رویداد تستی
              </PanelButton>
            </StepCard>
          </div>
        </div>
      </div>
    </section>
  );
}

function StepCard({
  index,
  active,
  onSelect,
  icon: Icon,
  gradient,
  desc,
  children,
}: {
  index: number;
  active: number;
  onSelect: (i: number) => void;
  icon: LucideIcon;
  gradient: string;
  desc: string;
  children: ReactNode;
}) {
  const isActive = active === index;
  return (
    // Below lg only the active step is rendered as visible; the tabs above switch it.
    <Reveal delay={0.08 + index * 0.1} className={`h-full ${isActive ? "" : "hidden lg:block"}`}>
      <div
        onClick={() => onSelect(index)}
        className={`group relative flex h-full flex-col justify-between rounded-3xl border p-5 transition-all duration-300 sm:p-7 lg:cursor-pointer ${
          isActive
            ? "border-brand-500 bg-white shadow-[0_24px_60px_-15px_rgba(70,95,255,0.35)] dark:border-theme-cyan-500 dark:bg-gray-950 lg:-translate-y-1"
            : "border-gray-200 bg-white/90 hover:-translate-y-0.5 hover:border-brand-500/50 dark:border-white/10 dark:bg-gray-950/90"
        }`}
      >
        <div>
          <div className="mb-5 flex items-center justify-between gap-3">
            <div className={`flex h-13 w-13 items-center justify-center rounded-2xl bg-gradient-to-tr text-white shadow-[0_10px_25px_-5px_rgba(70,95,255,0.5)] transition-transform duration-300 group-hover:scale-105 group-hover:rotate-3 ${gradient}`}>
              <Icon className="h-6 w-6" aria-hidden="true" />
            </div>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-brand-500/30 bg-brand-500/10 px-3.5 py-1 text-xs font-extrabold text-brand-600 dark:text-theme-cyan-500">
              مرحله {fa(index + 1)}
            </span>
          </div>
          <h3 className="text-xl font-black text-gray-900 dark:text-white sm:text-2xl">{STEP_TITLES[index]}</h3>
          <p className="mt-2.5 text-sm leading-relaxed text-gray-600 dark:text-gray-300 sm:text-base">{desc}</p>
        </div>
        <div className="mt-6 space-y-3 rounded-2xl border border-gray-800 bg-gray-950 p-4 text-white shadow-inner dark:bg-black/40">{children}</div>
      </div>
    </Reveal>
  );
}

function PanelButton({
  onClick,
  tone,
  icon,
  children,
}: {
  onClick: () => void;
  tone: "brand" | "cyan" | "success";
  icon: ReactNode;
  children: ReactNode;
}) {
  const tones = {
    brand: "border-brand-500/40 bg-brand-500/20 text-theme-cyan-500 hover:bg-brand-500 hover:text-white",
    cyan: "border-theme-cyan-500/35 bg-theme-cyan-500/15 text-theme-cyan-500 hover:bg-theme-cyan-500 hover:text-gray-950",
    success: "border-success-500/40 bg-success-500/20 text-success-300 hover:bg-success-500 hover:text-gray-950",
  };
  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
      className={`flex min-h-10 w-full cursor-pointer items-center justify-center gap-1.5 rounded-xl border py-2 text-xs font-extrabold transition-all active:scale-[0.98] ${tones[tone]}`}
    >
      {icon}
      <span>{children}</span>
    </button>
  );
}
