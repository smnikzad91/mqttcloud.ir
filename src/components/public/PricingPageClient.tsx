"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { Check, CreditCard, Headset, RefreshCw, ShieldCheck } from "lucide-react";
import { Reveal } from "@/components/public/shared/Reveal";
import { Stagger, StaggerItem } from "@/components/public/shared/Stagger";
import { SectionHeading } from "@/components/public/shared/SectionHeading";
import { Container } from "@/components/public/shared/Container";
import { Button } from "@/components/public/shared/Button";
import { AmbientGlow } from "@/components/public/shared/AmbientGlow";
import { Accordion, type AccordionItemData } from "@/components/public/shared/Accordion";

const trustItems = [
  { icon: ShieldCheck, text: "پرداخت امن شاپرک" },
  { icon: RefreshCw, text: "لغو هر زمان" },
  { icon: CreditCard, text: "بدون کارت بانکی برای پلن رایگان" },
  { icon: Headset, text: "پشتیبانی واکنش‌گرا" },
];

type PlanId = "free" | "basic" | "starter" | "enterprise";

const plans: {
  id: PlanId;
  name: string;
  badge?: string;
  monthlyPrice: string;
  yearlyPrice: string;
  period: string;
  description: string;
  quota: string;
  features: string[];
  cta: string;
  highlight: boolean;
  accent: string;
}[] = [
  {
    id: "free",
    name: "پلن رایگان",
    monthlyPrice: "۰",
    yearlyPrice: "۰",
    period: "همیشه رایگان",
    description: "برای شروع و آزمایش بروکر با پروژه‌های کوچک.",
    quota: "۱ اکانت MQTT · حداکثر ۲ کلاینت",
    features: [
      "۱ اکانت MQTT (sub-user)",
      "حداکثر ۲ کلاینت متصل در مجموع",
      "اتصال امن با TLS و WebSocket",
      "۷ روز تاریخچه فعالیت اتصال",
    ],
    cta: "شروع رایگان",
    highlight: false,
    accent: "border-t-gray-200 dark:border-t-gray-700",
  },
  {
    id: "basic",
    name: "پلن پایه",
    badge: "مناسب پروژه‌های کوچک",
    monthlyPrice: "۹۹,۰۰۰",
    yearlyPrice: "۷۹,۰۰۰",
    period: "تومان در ماه",
    description: "برای پروژه‌هایی که به چند اکانت و دستگاه بیشتر نیاز دارند.",
    quota: "تا ۳ اکانت MQTT · هر اکانت حداکثر ۳ کلاینت (حداکثر ۹ کلاینت کل)",
    features: [
      "تا ۳ اکانت MQTT (sub-user)",
      "هر اکانت حداکثر ۳ کلاینت — حداکثر ۹ کلاینت در مجموع",
      "۳۰ روز تاریخچه فعالیت اتصال",
      "پشتیبانی ایمیلی",
    ],
    cta: "فعال‌سازی پلن پایه",
    highlight: false,
    accent: "border-t-blue-400 dark:border-t-blue-500",
  },
  {
    id: "starter",
    name: "پلن استارتر",
    badge: "محبوب‌ترین پلن",
    monthlyPrice: "۲۴۹,۰۰۰",
    yearlyPrice: "۱۹۹,۰۰۰",
    period: "تومان در ماه",
    description: "برای استارتاپ‌ها و پروژه‌های IoT با مقیاس رو‌به‌رشد.",
    quota: "تا ۵ اکانت MQTT · هر اکانت حداکثر ۵ کلاینت (حداکثر ۲۵ کلاینت کل)",
    features: [
      "تا ۵ اکانت MQTT (sub-user)",
      "هر اکانت حداکثر ۵ کلاینت — حداکثر ۲۵ کلاینت در مجموع",
      "۳۰ روز تاریخچه فعالیت اتصال",
      "دسترسی API برای مدیریت اکانت‌ها",
      "پشتیبانی اولویت‌دار",
    ],
    cta: "فعال‌سازی پلن استارتر",
    highlight: true,
    accent: "border-t-brand-500",
  },
  {
    id: "enterprise",
    name: "پلن پیشرفته",
    badge: "سفارشی",
    monthlyPrice: "تماس بگیرید",
    yearlyPrice: "تماس بگیرید",
    period: "",
    description: "تعداد اکانت و کلاینت دلخواه، متناسب با نیاز سازمان شما.",
    quota: "تعداد اکانت و کلاینت به‌صورت سفارشی و توافقی",
    features: [
      "تعداد اکانت MQTT دلخواه",
      "تعداد کلاینت به‌ازای هر اکانت دلخواه",
      "بروکر اختصاصی (Dedicated Cluster) در صورت نیاز",
      "SLA تضمینی و پشتیبانی اختصاصی",
    ],
    cta: "تماس با فروش",
    highlight: false,
    accent: "border-t-purple-500 dark:border-t-purple-400",
  },
];

function PlanCheck({ bright }: { bright?: boolean }) {
  return <Check className={`mt-0.5 h-4 w-4 shrink-0 ${bright ? "text-brand-100" : "text-brand-500"}`} strokeWidth={3} aria-hidden="true" />;
}

function ctaHref(planId: PlanId, loggedIn: boolean): string {
  if (planId === "enterprise") return "/contact";
  return loggedIn ? "/dashboard/subscription" : "/signup";
}

export default function PricingPageClient() {
  const { data: session } = useSession();
  const loggedIn = !!session?.user;
  const [yearly, setYearly] = useState(false);
  const [faqs, setFaqs] = useState<AccordionItemData[]>([]);

  useEffect(() => {
    fetch("/api/public/faqs").then((r) => r.json()).then((data) => {
      if (Array.isArray(data)) {
        setFaqs(data.map((f) => ({ id: f._id, question: f.question, answer: f.answer })));
      }
    }).catch(() => {});
  }, []);

  return (
    <div className="relative overflow-hidden">
      {/* Background */}
      <div className="pointer-events-none absolute inset-x-0 top-0 h-[480px] bg-gradient-to-b from-brand-50/60 via-white to-white dark:from-brand-950/15 dark:via-gray-900 dark:to-gray-900" />
      <AmbientGlow className="-left-24 -top-24 h-[380px] w-[380px] bg-brand-500/15 blur-[110px] dark:bg-brand-500/15" duration={20} />
      <AmbientGlow className="left-[calc(50%-150px)] -top-10 h-[300px] w-[300px] bg-theme-purple-500/10 blur-[110px] dark:bg-theme-purple-500/10" duration={25} />

      <Container className="relative pb-24 pt-20">

        {/* ─── Header ─── */}
        <Reveal className="text-center">
          <span className="inline-block rounded-full border border-white/60 bg-white/70 px-4 py-1.5 text-xs font-semibold tracking-wide text-brand-600 shadow-theme-xs backdrop-blur-md dark:border-white/10 dark:bg-white/5 dark:text-brand-400">
            شفاف، بدون هزینه پنهان
          </span>
          <h1 className="mt-5 text-4xl font-extrabold tracking-tight text-gray-900 dark:text-white sm:text-5xl">
            تعرفه‌های ساده و شفاف
          </h1>
          <p className="mt-4 text-lg text-gray-500 dark:text-gray-400">
            هر زمان که خواستید ارتقا یا کاهش دهید. بدون قرارداد بلندمدت.
          </p>

          {/* Billing toggle */}
          <div className="mt-8 inline-flex items-center gap-3 rounded-xl border border-gray-200 bg-white p-1.5 shadow-sm dark:border-gray-700 dark:bg-gray-900">
            <button
              onClick={() => setYearly(false)}
              className={`rounded-lg px-4 py-2 text-sm font-semibold transition-all ${!yearly ? "bg-gradient-to-r from-brand-500 to-theme-purple-500 text-white shadow-sm" : "text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"}`}
            >
              ماهانه
            </button>
            <button
              onClick={() => setYearly(true)}
              className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold transition-all ${yearly ? "bg-gradient-to-r from-brand-500 to-theme-purple-500 text-white shadow-sm" : "text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"}`}
            >
              سالانه
              <span className={`rounded-md px-1.5 py-0.5 text-[10px] font-bold ${yearly ? "bg-white/20 text-white" : "bg-success-100 text-success-700 dark:bg-success-500/15 dark:text-success-400"}`}>
                ۲۰٪ تخفیف
              </span>
            </button>
          </div>
        </Reveal>

        {/* ─── Plans ─── */}
        <Stagger className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-4 lg:items-start" stagger={0.1}>
          {plans.map((plan) => {
            const isFree = plan.id === "free";
            const isCustom = plan.id === "enterprise";
            return (
              <StaggerItem
                key={plan.id}
                className={`relative flex flex-col overflow-hidden rounded-2xl border-t-4 ${plan.accent} ${
                  plan.highlight
                    ? "border border-brand-500 bg-gradient-to-br from-brand-500 to-theme-purple-500 shadow-2xl shadow-brand-500/25 lg:-translate-y-5"
                    : "border border-gray-200/80 bg-white shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-lg dark:border-gray-800 dark:bg-gray-900"
                }`}
              >
                {/* Badge */}
                {plan.badge && (
                  <div className="flex justify-center pt-4">
                    <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold backdrop-blur-sm ${
                      plan.highlight
                        ? "bg-white/20 text-white"
                        : "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300"
                    }`}>
                      <span className={`h-1.5 w-1.5 rounded-full ${plan.highlight ? "bg-success-400" : "bg-brand-500"}`} />
                      {plan.badge}
                    </span>
                  </div>
                )}

                <div className={`flex flex-1 flex-col p-8 ${plan.badge && "pt-5"}`}>
                  {/* Plan name + desc */}
                  <h2 className={`text-lg font-bold ${plan.highlight ? "text-white" : "text-gray-900 dark:text-white"}`}>
                    {plan.name}
                  </h2>
                  <p className={`mt-1.5 text-sm leading-relaxed ${plan.highlight ? "text-brand-100" : "text-gray-500 dark:text-gray-400"}`}>
                    {plan.description}
                  </p>

                  {/* Quota breakdown */}
                  <p className={`mt-3 rounded-lg px-3 py-2 text-xs font-semibold ${
                    plan.highlight
                      ? "bg-white/10 text-brand-50"
                      : "bg-gray-50 text-gray-600 dark:bg-gray-800 dark:text-gray-300"
                  }`}>
                    {plan.quota}
                  </p>

                  {/* Price */}
                  <div className="mt-6 flex items-end gap-1.5">
                    <span className={`${isCustom ? "text-2xl" : "text-4xl"} font-extrabold leading-none tracking-tight ${plan.highlight ? "text-white" : "text-gray-900 dark:text-white"}`}>
                      {isCustom ? plan.monthlyPrice : (yearly ? plan.yearlyPrice : plan.monthlyPrice)}
                    </span>
                    {!isCustom && (
                      <span className={`mb-1 text-sm font-medium ${plan.highlight ? "text-brand-100" : "text-gray-500 dark:text-gray-400"}`}>
                        {isFree ? plan.period : "تومان / ماه"}
                      </span>
                    )}
                  </div>
                  {yearly && !isFree && !isCustom && (
                    <p className={`mt-1 text-xs ${plan.highlight ? "text-brand-200" : "text-gray-400 dark:text-gray-500"}`}>
                      پرداخت سالانه — در مقابل {plan.monthlyPrice} ماهانه
                    </p>
                  )}

                  {/* Divider */}
                  <div className={`my-7 h-px ${plan.highlight ? "bg-white/15" : "bg-gray-100 dark:bg-gray-800"}`} />

                  {/* Features */}
                  <ul className="flex-1 space-y-3.5">
                    {plan.features.map((f) => (
                      <li key={f} className="flex items-start gap-2.5 text-sm">
                        <PlanCheck bright={plan.highlight} />
                        <span className={plan.highlight ? "text-brand-50" : "text-gray-600 dark:text-gray-300"}>
                          {f}
                        </span>
                      </li>
                    ))}
                  </ul>

                  {/* CTA */}
                  <Button
                    href={ctaHref(plan.id, loggedIn)}
                    size="lg"
                    className={`mt-8 w-full ${plan.highlight ? "bg-none bg-white text-brand-600 hover:bg-brand-50" : ""}`}
                  >
                    {plan.cta}
                  </Button>
                </div>
              </StaggerItem>
            );
          })}
        </Stagger>

        {/* Trust strip */}
        <Reveal delay={0.15} className="mt-12 flex flex-wrap items-center justify-center gap-6 text-sm text-gray-500 dark:text-gray-400">
          {trustItems.map((item) => (
            <span key={item.text} className="flex items-center gap-2">
              <item.icon className="h-4 w-4 text-gray-400 dark:text-gray-500" aria-hidden="true" />
              {item.text}
            </span>
          ))}
        </Reveal>

        {/* ─── FAQ ─── */}
        <div className="mt-28">
          <SectionHeading
            eyebrow="پرسش و پاسخ"
            title="سوالات متداول"
            description={
              <>
                پاسخ سوال خود را نیافتید؟{" "}
                <Link href="/contact" className="font-semibold text-brand-600 hover:underline dark:text-brand-400">
                  با ما در تماس باشید
                </Link>
              </>
            }
          />

          {faqs.length > 0 && (
            <Reveal delay={0.1} className="mx-auto mt-10 max-w-3xl">
              <Accordion items={faqs} variant="compact" />
            </Reveal>
          )}
        </div>
      </Container>
    </div>
  );
}
