import { Layers } from "lucide-react";
import { Reveal } from "@/components/public/shared/Reveal";
import { MessagingCard } from "./features/MessagingCard";
import { TlsCard } from "./features/TlsCard";
import { NamespaceCard } from "./features/NamespaceCard";
import { ProvisioningCard } from "./features/ProvisioningCard";
import { ActivityCard } from "./features/ActivityCard";
import { DeveloperCard } from "./features/DeveloperCard";

/**
 * Bento grid — 1 column on phones, 2 on tablets (big cards span both), and
 * the asymmetric 7/5 · 4/4/4 · 12 layout from lg up. Each card owns its own
 * simulator state, so one card's ticking timer never re-renders the others.
 */
export default function Features() {
  return (
    <section id="features" className="relative scroll-mt-24 overflow-hidden py-16 sm:py-28">
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute top-1/4 right-1/3 h-96 w-96 rounded-full bg-brand-500/10 blur-[140px] dark:bg-brand-500/15" />
        <div className="absolute bottom-1/4 left-1/4 h-96 w-96 rounded-full bg-theme-cyan-500/5 blur-[140px] dark:bg-theme-cyan-500/15" />
      </div>

      <div className="relative z-10 mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <Reveal className="mx-auto mb-10 max-w-2xl text-center sm:mb-16">
          <span className="mb-3 inline-flex items-center gap-2 rounded-full border border-brand-500/30 bg-brand-500/10 px-4 py-1.5 text-xs font-extrabold text-brand-600 dark:text-theme-cyan-500">
            <Layers className="h-3.5 w-3.5" aria-hidden="true" />
            امکانات
          </span>
          <h2 className="text-3xl leading-tight font-black tracking-tight text-gray-900 dark:text-white sm:text-4xl lg:text-5xl" style={{ textWrap: "balance" }}>
            همه چیزی که برای پیام‌رسانی IoT نیاز دارید
          </h2>
          <p className="mt-4 text-base text-gray-600 dark:text-gray-300 sm:text-lg">
            mqttcloud.ir را یک‌بار راه‌اندازی کنید و با خیال راحت روی محصول خودتان تمرکز کنید. کارت‌های زیر شبیه‌سازی تعاملی‌اند؛ دکمه‌هایشان را امتحان کنید.
          </p>
        </Reveal>

        <div className="grid grid-cols-1 gap-4 sm:gap-6 md:grid-cols-2 lg:grid-cols-12">
          <Reveal delay={0.05} className="min-w-0 md:col-span-2 lg:col-span-7"><MessagingCard /></Reveal>
          <Reveal delay={0.1} className="min-w-0 md:col-span-2 lg:col-span-5"><TlsCard /></Reveal>
          <Reveal delay={0.14} className="min-w-0 lg:col-span-4"><NamespaceCard /></Reveal>
          <Reveal delay={0.18} className="min-w-0 lg:col-span-4"><ProvisioningCard /></Reveal>
          <Reveal delay={0.22} className="min-w-0 md:col-span-2 lg:col-span-4"><ActivityCard /></Reveal>
          <Reveal delay={0.26} className="min-w-0 md:col-span-2 lg:col-span-12"><DeveloperCard /></Reveal>
        </div>
      </div>
    </section>
  );
}
