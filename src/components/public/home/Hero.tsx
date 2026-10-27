"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, Check, Copy, Sparkles, Terminal } from "lucide-react";
import { Reveal } from "@/components/public/shared/Reveal";
import { Button } from "@/components/public/shared/Button";
import { CountUp } from "@/components/public/shared/CountUp";
import { BrokerTopology } from "./BrokerTopology";
import { CLI_COMMAND } from "./signal";
import type { FeaturedBlog, FeaturedNews } from "./types";

const stats = [
  { value: "۵۰ms", label: "میانگین تأخیر پیام", animate: true, accent: false },
  { value: "۹۹.۹٪", label: "پایداری بروکر", animate: true, accent: true },
  { value: "۲۴/۷", label: "بروکر همیشه فعال", animate: false, accent: false },
];

/**
 * The hero's motion is purely decorative marketing flourish, so it
 * intentionally ignores prefers-reduced-motion (via forceMotion props +
 * the .force-motion-* classes in globals.css) rather than going still.
 * Every other animated section on the site still respects that preference.
 */
export default function Hero({
  featuredBlog,
  featuredNews,
}: {
  featuredBlog?: FeaturedBlog | null;
  featuredNews?: FeaturedNews | null;
}) {
  const [copied, setCopied] = useState(false);

  function copyCommand() {
    navigator.clipboard?.writeText(CLI_COMMAND).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }).catch(() => {});
  }

  const featured = featuredBlog
    ? { href: `/blog/${featuredBlog.slug}`, label: `پست ویژه: ${featuredBlog.title}` }
    : featuredNews
      ? { href: `/news/${featuredNews.id}`, label: `تازه‌ترین: ${featuredNews.title}` }
      : null;

  return (
    <section className="relative overflow-hidden pt-8 pb-16 sm:pt-14 sm:pb-24">
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden">
        <div
          className="absolute inset-0 opacity-35 dark:opacity-25"
          style={{
            backgroundImage:
              "linear-gradient(to right, rgba(70,95,255,0.14) 1px, transparent 1px), linear-gradient(to bottom, rgba(70,95,255,0.14) 1px, transparent 1px)",
            backgroundSize: "48px 48px",
            maskImage: "radial-gradient(ellipse 80% 70% at 50% 35%, black 40%, transparent 100%)",
            WebkitMaskImage: "radial-gradient(ellipse 80% 70% at 50% 35%, black 40%, transparent 100%)",
          }}
        />
        <div className="absolute -top-32 right-1/4 h-[28rem] w-[28rem] rounded-full bg-brand-500/20 blur-[130px] dark:bg-brand-500/25" />
        <div className="absolute top-1/3 left-10 h-[24rem] w-[24rem] rounded-full bg-theme-cyan-500/10 blur-[130px] dark:bg-theme-cyan-500/20" />
        <div className="absolute right-10 bottom-0 h-[22rem] w-[22rem] rounded-full bg-theme-purple-500/20 blur-[120px]" />
      </div>

      <div className="relative z-10 mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 items-center gap-10 lg:grid-cols-12 lg:gap-8">
          {/* min-w-0: the CLI line is nowrap, and without this it would widen the grid column past a phone's viewport. */}
          <div className="min-w-0 space-y-6 lg:col-span-6">
            <Reveal forceMotion>
              <div className="flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center gap-2 rounded-full border border-brand-500/30 bg-white/80 px-3.5 py-1.5 text-xs font-extrabold text-brand-600 backdrop-blur-md dark:border-theme-cyan-500/30 dark:bg-white/[0.04] dark:text-theme-cyan-500">
                  <span className="relative flex h-2 w-2">
                    <span className="force-motion-ping absolute inline-flex h-full w-full animate-ping rounded-full bg-brand-400 opacity-75 dark:bg-theme-cyan-500" />
                    <span className="relative inline-flex h-2 w-2 rounded-full bg-brand-500 dark:bg-theme-cyan-500" />
                  </span>
                  بروکر MQTT ابری
                </span>
                {featured && (
                  <Link
                    href={featured.href}
                    className="inline-flex max-w-full min-w-0 items-center gap-1.5 rounded-full border border-success-500/30 bg-success-500/10 px-3 py-1.5 text-xs font-bold text-success-700 transition-colors hover:bg-success-500/20 dark:text-success-300 sm:max-w-xs"
                  >
                    <Sparkles className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                    <span className="truncate">{featured.label}</span>
                  </Link>
                )}
              </div>
            </Reveal>

            <Reveal forceMotion delay={0.08}>
              <h1 className="text-4xl leading-[1.25] font-black tracking-tight text-gray-900 dark:text-white sm:text-5xl xl:text-6xl" style={{ textWrap: "balance" }}>
                <span className="block">بروکر MQTT خود را</span>
                <span className="force-motion-gradient-text mt-2 block animate-[gradient-text_6s_ease_infinite] bg-gradient-to-l from-brand-500 via-theme-cyan-500 to-theme-purple-500 bg-[length:200%_auto] bg-clip-text pb-1 text-transparent">
                  در چند ثانیه راه‌اندازی کنید
                </span>
              </h1>
            </Reveal>

            <Reveal forceMotion delay={0.14}>
              <p className="max-w-xl text-base leading-relaxed text-gray-600 dark:text-gray-300 sm:text-lg">
                در <strong className="font-extrabold text-gray-900 dark:text-white">mqttcloud.ir</strong> یک اکانت و دستگاه بسازید، با اتصال رمزنگاری‌شدهٔ{" "}
                <span className="rounded bg-brand-500/10 px-1.5 py-0.5 font-mono-signal text-xs text-brand-600 dark:text-theme-cyan-500">TLS</span>{" "}
                به بروکر وصل شوید و پیام‌هایتان را بدون راه‌اندازی زیرساخت، بی‌درنگ بین دستگاه‌ها منتشر و دریافت کنید.
              </p>
            </Reveal>

            <Reveal forceMotion delay={0.18}>
              <div className="max-w-xl rounded-2xl border border-gray-200 bg-gray-900 p-3.5 shadow-xl dark:border-white/10 dark:bg-gray-950">
                <div className="mb-2 flex items-center justify-between gap-2 border-b border-white/10 pb-2 text-[11px] text-gray-400">
                  <span className="inline-flex items-center gap-1.5 font-mono-signal text-theme-cyan-500">
                    <Terminal className="h-3.5 w-3.5" aria-hidden="true" />
                    mosquitto_pub
                  </span>
                  <button
                    type="button"
                    onClick={copyCommand}
                    className="inline-flex min-h-8 cursor-pointer items-center gap-1 rounded-md bg-white/10 px-2.5 py-1 text-xs font-bold text-white transition-colors hover:bg-brand-500"
                  >
                    {copied ? <Check className="h-3 w-3" aria-hidden="true" /> : <Copy className="h-3 w-3" aria-hidden="true" />}
                    {copied ? "کپی شد" : "کپی دستور"}
                  </button>
                </div>
                <div dir="ltr" className="overflow-x-auto py-1 font-mono-signal text-xs whitespace-nowrap text-gray-200 [scrollbar-width:none]">
                  <span className="text-success-400">$</span> {CLI_COMMAND}
                </div>
              </div>
            </Reveal>

            <Reveal forceMotion delay={0.22}>
              <div className="flex flex-col gap-3 pt-1 sm:flex-row sm:items-center">
                <Button href="/signup" size="lg" className="w-full rounded-2xl sm:w-auto" endIcon={<ArrowLeft className="h-5 w-5" />}>
                  رایگان شروع کنید
                </Button>
                <Button href="/pricing" variant="secondary" size="lg" className="w-full rounded-2xl bg-white/80 backdrop-blur-md sm:w-auto dark:bg-white/[0.04]">
                  مشاهده تعرفه‌ها
                </Button>
              </div>
            </Reveal>

            <Reveal forceMotion delay={0.28}>
              <div className="grid max-w-lg grid-cols-3 gap-3 border-t border-gray-200 pt-5 dark:border-white/10 sm:gap-4">
                {stats.map((s) => (
                  <div key={s.label} className="min-w-0">
                    <div className={`text-xl font-black sm:text-3xl ${s.accent ? "text-success-600 dark:text-theme-cyan-500" : "text-gray-900 dark:text-white"}`}>
                      {s.animate ? <CountUp forceMotion value={s.value} /> : s.value}
                    </div>
                    <div className="mt-0.5 text-[11px] font-medium text-gray-500 dark:text-gray-400 sm:text-xs">{s.label}</div>
                  </div>
                ))}
              </div>
            </Reveal>
          </div>

          <div className="min-w-0 lg:col-span-6">
            <Reveal forceMotion delay={0.12}>
              <BrokerTopology forceMotion />
            </Reveal>
          </div>
        </div>
      </div>
    </section>
  );
}
