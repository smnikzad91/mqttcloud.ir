"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { useT } from "@/i18n/useT";
import { PLAN_DEFS, type PlanKey } from "@/lib/plans";

interface PlanData {
  plan: PlanKey;
  limits: { maxUsers: number; clientsPerUser: number };
  usage: {
    mqttUsers: number;
    clients: { mqttUserId: string; username: string; count: number }[];
  };
}

const PLAN_ORDER: PlanKey[] = ["free", "basic", "starter", "enterprise"];

const PLAN_QUOTA_TEXT: Record<PlanKey, { maxUsers: string; clientsPerUser: string }> = {
  free:       { maxUsers: "۱", clientsPerUser: "۲ (در مجموع)" },
  basic:      { maxUsers: "۳", clientsPerUser: "۳ به‌ازای هر اکانت (حداکثر ۹ کل)" },
  starter:    { maxUsers: "۵", clientsPerUser: "۵ به‌ازای هر اکانت (حداکثر ۲۵ کل)" },
  enterprise: { maxUsers: "سفارشی", clientsPerUser: "سفارشی" },
};

const PLAN_DISPLAY: Record<PlanKey, { name: string; maxUsers: string; clientsPerUser: string; selfService: boolean; priceToman: number }> =
  Object.fromEntries(
    PLAN_ORDER.map((key) => [
      key,
      {
        name: PLAN_DEFS[key].nameFa,
        maxUsers: PLAN_QUOTA_TEXT[key].maxUsers,
        clientsPerUser: PLAN_QUOTA_TEXT[key].clientsPerUser,
        selfService: PLAN_DEFS[key].selfService,
        priceToman: PLAN_DEFS[key].priceToman ?? 0,
      },
    ])
  ) as Record<PlanKey, { name: string; maxUsers: string; clientsPerUser: string; selfService: boolean; priceToman: number }>;

export default function SubscriptionPage() {
  const t = useT();
  const [data, setData] = useState<PlanData | null>(null);
  const [loading, setLoading] = useState(true);
  const [switching, setSwitching] = useState<PlanKey | null>(null);

  const fetchPlan = () => {
    setLoading(true);
    fetch("/api/user/plan")
      .then((r) => r.json())
      .then((d) => setData(d))
      .finally(() => setLoading(false));
  };

  useEffect(() => { queueMicrotask(fetchPlan); }, []);

  const handleSwitch = async (plan: PlanKey) => {
    setSwitching(plan);
    try {
      const paid = PLAN_DISPLAY[plan].priceToman > 0;
      const res = await fetch(paid ? "/api/user/plan/checkout" : "/api/user/plan", {
        method: paid ? "POST" : "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan }),
      });
      const json = await res.json();
      if (!res.ok) {
        toast.error(json.error ?? "خطا در تغییر پلن");
        return;
      }
      if (paid) {
        // Hand off to nodepass's hosted payment page — the plan itself only
        // actually changes once the webhook confirms payment.
        window.location.href = json.statusUrl;
        return;
      }
      toast.success("پلن شما با موفقیت تغییر کرد.");
      fetchPlan();
    } finally {
      setSwitching(null);
    }
  };

  const currentPlan = data?.plan ?? "free";
  const totalClients = data?.usage.clients.reduce((sum, c) => sum + c.count, 0) ?? 0;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          {t("subscriptionTitle")}
        </h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          {t("subscriptionDesc")}
        </p>
      </div>

      {/* Current plan + usage */}
      <div className="rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-700 dark:bg-gray-900">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h2 className="text-base font-semibold text-gray-800 dark:text-white">
              {t("currentPlan")}
            </h2>
            <div className="mt-3 flex items-center gap-2">
              <span className="text-2xl font-bold text-gray-900 dark:text-white">
                {loading ? "…" : PLAN_DISPLAY[currentPlan].name}
              </span>
              <span className="rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-600 dark:bg-gray-700 dark:text-gray-300">
                {t("planActive")}
              </span>
            </div>
          </div>
        </div>

        <hr className="my-6 border-gray-100 dark:border-gray-800" />

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="rounded-xl border border-gray-100 p-4 dark:border-gray-800">
            <p className="text-xs text-gray-500 dark:text-gray-400">اکانت‌های MQTT استفاده‌شده</p>
            <p className="mt-1 text-lg font-bold text-gray-900 dark:text-white" dir="ltr">
              {loading ? "…" : `${data?.usage.mqttUsers ?? 0} / ${PLAN_DISPLAY[currentPlan].maxUsers}`}
            </p>
          </div>
          <div className="rounded-xl border border-gray-100 p-4 dark:border-gray-800">
            <p className="text-xs text-gray-500 dark:text-gray-400">کلاینت‌های متصل (مجموع)</p>
            <p className="mt-1 text-lg font-bold text-gray-900 dark:text-white" dir="ltr">
              {loading ? "…" : totalClients}
            </p>
          </div>
        </div>

        {!loading && data && data.usage.clients.length > 0 && (
          <div className="mt-4 space-y-2">
            {data.usage.clients.map((c) => (
              <div key={c.mqttUserId} className="flex items-center justify-between rounded-lg bg-gray-50 px-3 py-2 text-sm dark:bg-gray-800">
                <span className="font-mono text-gray-700 dark:text-gray-300">{c.username}</span>
                <span className="text-gray-500 dark:text-gray-400" dir="ltr">
                  {c.count} / {PLAN_DISPLAY[currentPlan].clientsPerUser.split(" ")[0]}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Plan picker */}
      <div className="rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-700 dark:bg-gray-900">
        <h2 className="mb-4 text-base font-semibold text-gray-800 dark:text-white">تعرفه‌ها</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {PLAN_ORDER.map((plan) => {
            const isCurrent = plan === currentPlan;
            const display = PLAN_DISPLAY[plan];
            return (
              <div
                key={plan}
                className={`rounded-xl border p-4 ${
                  isCurrent ? "border-brand-500 ring-1 ring-brand-500/30" : "border-gray-200 dark:border-gray-700"
                }`}
              >
                <p className="font-semibold text-gray-900 dark:text-white">{display.name}</p>
                <p className="mt-1 text-xs font-medium text-gray-700 dark:text-gray-300">
                  {display.priceToman > 0 ? `${display.priceToman.toLocaleString("fa-IR")} تومان / ماه` : plan === "enterprise" ? "سفارشی" : "رایگان"}
                </p>
                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                  {display.maxUsers} اکانت · {display.clientsPerUser}
                </p>
                {isCurrent ? (
                  <span className="mt-3 inline-block rounded-lg bg-brand-50 px-3 py-1.5 text-xs font-semibold text-brand-600 dark:bg-brand-500/10 dark:text-brand-400">
                    پلن فعلی شما
                  </span>
                ) : display.selfService ? (
                  <button
                    onClick={() => handleSwitch(plan)}
                    disabled={switching !== null}
                    className="mt-3 w-full rounded-lg bg-brand-500 px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-brand-600 disabled:opacity-60"
                  >
                    {switching === plan ? "در حال تغییر…" : PLAN_ORDER.indexOf(plan) > PLAN_ORDER.indexOf(currentPlan) ? "ارتقا" : "تغییر به این پلن"}
                  </button>
                ) : (
                  <Link
                    href="/contact"
                    className="mt-3 inline-block w-full rounded-lg border border-gray-200 px-3 py-1.5 text-center text-xs font-semibold text-gray-700 transition-colors hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"
                  >
                    تماس با فروش
                  </Link>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
