"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { Check, CreditCard, Headset, RefreshCw, ShieldCheck } from "lucide-react";
import { Reveal } from "@/components/public/shared/Reveal";
import { HeroRise } from "@/components/public/shared/HeroRise";
import { SectionHeading } from "@/components/public/shared/SectionHeading";
import { Container } from "@/components/public/shared/Container";
import { Button } from "@/components/public/shared/Button";
import { AmbientGlow } from "@/components/public/shared/AmbientGlow";
import { Accordion, type AccordionItemData } from "@/components/public/shared/Accordion";
import { PLAN_DEFS } from "@/lib/plans";

const trustItems = [
  { icon: ShieldCheck, text: "پرداخت امن کارت‌به‌کارت" },
  { icon: RefreshCw, text: "بدون تمدید خودکار؛ فقط وقتی بخواهید پرداخت می‌کنید" },
  { icon: CreditCard, text: "بدون کارت بانکی برای پلن رایگان" },
  { icon: Headset, text: "پشتیبانی واکنش‌گرا" },
];

type PlanId = "free" | "basic" | "starter" | "enterprise";

// The only real prices customers are ever charged — src/lib/plans.ts is the
// single source of truth, used both here and by the actual nodepass
// checkout. No separate "yearly" price exists: nothing in checkout bills
// yearly, so showing one here would quote a discount nobody actually gets.
const fmtToman = (n: number) => n.toLocaleString("fa-IR");

const plans: {
  id: PlanId;
  name: string;
  badge?: string;
  monthlyPrice: string;
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
    monthlyPrice: "رایگان",
    period: "برای همیشه",
    description: "برای شروع و آزمایش بروکر با پروژه‌های کوچک.",
    quota: "۱ اکانت MQTT · حداکثر ۲ کلاینت",
    features: [
      "اتصال امن با TLS و WebSocket",
      "وضعیت زنده دستگاه‌ها و ۳۰ روز تاریخچه اتصال",
      "مشاهده پیام‌های ۷ روز اخیر برای عیب‌یابی",
      "پشتیبانی از طریق تیکت",
    ],
    cta: "شروع رایگان",
    highlight: false,
    accent: "border-t-gray-200 dark:border-t-gray-700",
  },
  {
    id: "basic",
    name: "پلن پایه",
    badge: "مناسب پروژه‌های کوچک",
    monthlyPrice: fmtToman(PLAN_DEFS.basic.priceToman ?? 0),
    period: "تومان در ماه",
    description: "برای پروژه‌هایی که به چند اکانت و دستگاه بیشتر نیاز دارند.",
    quota: "تا ۳ اکانت MQTT · هر اکانت حداکثر ۳ کلاینت (حداکثر ۹ کلاینت کل)",
    features: [
      "همه امکانات پلن رایگان",
      "۳ اکانت جدا برای پروژه‌ها یا مشتریان مختلف",
      "تا ۹ دستگاه در مجموع",
      "اعتبار ۳۰ روزه؛ تمدید زودهنگام روزهای باقی‌مانده را حفظ می‌کند",
    ],
    cta: "فعال‌سازی پلن پایه",
    highlight: false,
    accent: "border-t-blue-400 dark:border-t-blue-500",
  },
  {
    id: "starter",
    name: "پلن استارتر",
    badge: "محبوب‌ترین پلن",
    monthlyPrice: fmtToman(PLAN_DEFS.starter.priceToman ?? 0),
    period: "تومان در ماه",
    description: "برای استارتاپ‌ها و پروژه‌های IoT با مقیاس رو‌به‌رشد.",
    quota: "تا ۵ اکانت MQTT · هر اکانت حداکثر ۵ کلاینت (حداکثر ۲۵ کلاینت کل)",
    features: [
      "همه امکانات پلن رایگان",
      "۵ اکانت جدا برای پروژه‌ها یا مشتریان مختلف",
      "تا ۲۵ دستگاه در مجموع",
      "اعتبار ۳۰ روزه؛ تمدید زودهنگام روزهای باقی‌مانده را حفظ می‌کند",
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

// FAQs come from the server (pricing/page.tsx) so they are in the HTML crawlers read.
export default function PricingPageClient({ faqs }: { faqs: AccordionItemData[] }) {
  const { data: session } = useSession();
  const loggedIn = !!session?.user;
  // Signed-in visitors see which card is their current plan.
  const [currentPlan, setCurrentPlan] = useState<PlanId | null>(null);
  useEffect(() => {
    if (!loggedIn) return;
    fetch("/api/user/plan").then((r) => (r.ok ? r.json() : null)).then((d) => d?.plan && setCurrentPlan(d.plan)).catch(() => {});
  }, [loggedIn]);

  return (
    <div className="relative overflow-hidden">
      {/* Background */}
      <div className="pointer-events-none absolute inset-x-0 top-0 h-[480px] bg-gradient-to-b from-brand-50/60 via-white to-white dark:from-brand-950/15 dark:via-gray-900 dark:to-gray-900" />
      <AmbientGlow className="-left-24 -top-24 h-[380px] w-[380px] bg-brand-500/15 blur-[110px] dark:bg-brand-500/15" duration={20} />
      <AmbientGlow className="left-[calc(50%-150px)] -top-10 h-[300px] w-[300px] bg-theme-purple-500/10 blur-[110px] dark:bg-theme-purple-500/10" duration={25} />

      <Container className="relative pb-24 pt-20">

        {/* ─── Header ─── */}
        <HeroRise className="text-center">
          <span className="inline-block rounded-full border border-white/60 bg-white/70 px-4 py-1.5 text-xs font-semibold tracking-wide text-brand-600 shadow-theme-xs backdrop-blur-md dark:border-white/10 dark:bg-white/5 dark:text-brand-400">
            شفاف، بدون هزینه پنهان
          </span>
          <h1 className="mt-5 text-4xl font-extrabold tracking-tight text-gray-900 dark:text-white sm:text-5xl">
            تعرفه بروکر MQTT؛ ساده و شفاف
          </h1>
          <p className="mt-4 text-lg text-gray-500 dark:text-gray-400">
            هر زمان که خواستید ارتقا یا کاهش دهید. بدون قرارداد بلندمدت.
          </p>
        </HeroRise>

        {/* ─── Plans ─── */}
        <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-4 lg:items-start">
          {plans.map((plan, index) => {
            const isFree = plan.id === "free";
            const isCustom = plan.id === "enterprise";
            const isCurrent = currentPlan === plan.id;
            return (
              <HeroRise key={plan.id} delay={0.1 + index * 0.1}>
              <div
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
                      {plan.monthlyPrice}
                    </span>
                    {!isCustom && (
                      <span className={`mb-1 text-sm font-medium ${plan.highlight ? "text-brand-100" : "text-gray-500 dark:text-gray-400"}`}>
                        {isFree ? plan.period : "تومان / ماه"}
                      </span>
                    )}
                  </div>

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
                    {isCurrent ? "پلن فعلی شما · مدیریت اشتراک" : plan.cta}
                  </Button>
                </div>
              </div>
              </HeroRise>
            );
          })}
        </div>

        <Reveal delay={0.1} className="mt-8 text-center text-sm text-gray-500 dark:text-gray-400">
          قیمت‌ها به تومان و برای ۳۰ روز است. پرداخت با همه کارت‌های بانکی از طریق درگاه nodepass انجام می‌شود و پلن بلافاصله فعال می‌شود.
        </Reveal>

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
        {faqs.length > 0 && <div className="mt-28">
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

          <Reveal delay={0.1} className="mx-auto mt-10 max-w-3xl">
            <Accordion items={faqs} variant="compact" />
          </Reveal>
        </div>}
      </Container>
    </div>
  );
}
