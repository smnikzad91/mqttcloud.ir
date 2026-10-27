"use client";

import { useState } from "react";
import { ArrowLeft, Check } from "lucide-react";
import { Reveal } from "@/components/public/shared/Reveal";
import { Button } from "@/components/public/shared/Button";

const highlights = ["بدون کدنویسی", "بروکر MQTT امن با TLS", "پشتیبانی ۲۴ ساعته", "رایگان شروع کنید"];

export default function CtaSection() {
  // Usernames are stored lowercased (MqttUser schema); the broker then only allows topics under `<username>/`.
  const [username, setUsername] = useState("smart_factory");

  return (
    <section className="py-12 sm:py-24">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <Reveal>
          <div className="relative overflow-hidden rounded-3xl border border-white/15 bg-gradient-to-br from-gray-950 via-brand-950 to-brand-600 px-5 py-12 text-center text-white shadow-2xl sm:px-12 sm:py-20">
            <div aria-hidden="true" className="pointer-events-none absolute -top-24 left-1/2 h-96 w-96 -translate-x-1/2 rounded-full bg-theme-cyan-500/25 blur-[120px]" />

            <div className="relative z-10 mx-auto max-w-2xl">
              <span className="mb-6 inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 py-1.5 text-xs font-bold backdrop-blur-md sm:text-sm">
                <span className="h-2 w-2 animate-ping rounded-full bg-success-400" />
                بدون نیاز به کارت بانکی
              </span>

              <h2 className="text-3xl font-black tracking-tight sm:text-5xl">همین الان شروع کنید</h2>
              <p className="mt-4 text-base leading-relaxed text-gray-200 sm:text-lg">
                اولین اکانت MQTT خود را در کمتر از یک دقیقه بسازید. پلن رایگان برای همیشه رایگان است.
              </p>

              <div className="mx-auto mt-8 max-w-md rounded-2xl border border-white/20 bg-gray-950/60 p-3 text-right backdrop-blur-md">
                <label htmlFor="namespace-preview" className="mb-2 block text-[11px] font-bold text-gray-300">
                  نام‌کاربری دلخواه — همهٔ تاپیک‌هایتان با آن شروع می‌شوند:
                </label>
                <div dir="ltr" className="flex items-center rounded-xl bg-white/10 px-3 py-2.5 font-mono-signal text-sm focus-within:ring-2 focus-within:ring-theme-cyan-500/50">
                  <input
                    id="namespace-preview"
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ""))}
                    placeholder="username"
                    maxLength={24}
                    autoComplete="off"
                    spellCheck={false}
                    className="min-w-0 flex-1 bg-transparent font-bold text-theme-cyan-500 placeholder:text-gray-500 focus:outline-none"
                  />
                  <span className="shrink-0 text-success-400">/#</span>
                </div>
              </div>

              <div className="mt-8 flex flex-col items-stretch justify-center gap-3 sm:flex-row sm:items-center sm:gap-4">
                <Button
                  href="/signup"
                  size="lg"
                  endIcon={<ArrowLeft className="h-5 w-5" />}
                  className="rounded-2xl bg-white bg-none font-black text-brand-950 shadow-xl hover:bg-theme-cyan-500 hover:text-gray-950"
                >
                  ثبت‌نام رایگان
                </Button>
                <Button
                  href="/pricing"
                  variant="secondary"
                  size="lg"
                  className="rounded-2xl border-white/25 bg-white/10 text-white backdrop-blur-md hover:border-white/40 hover:bg-white/20 dark:border-white/25 dark:bg-white/10 dark:text-white dark:hover:bg-white/20"
                >
                  مشاهده تعرفه‌ها
                </Button>
              </div>

              <div className="mt-10 grid grid-cols-2 gap-x-4 gap-y-3 border-t border-white/15 pt-8 text-xs font-bold text-gray-200 sm:flex sm:flex-wrap sm:items-center sm:justify-center sm:gap-x-6 sm:text-sm">
                {highlights.map((h) => (
                  <span key={h} className="inline-flex items-center gap-1.5">
                    <Check className="h-4 w-4 shrink-0 text-theme-cyan-500" aria-hidden="true" />
                    {h}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
