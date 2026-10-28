"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { Check, Clock, X } from "lucide-react";
import { useT } from "@/i18n/useT";
import { useLanguage } from "@/context/LanguageContext";
import { PLAN_DEFS, type PlanKey } from "@/lib/plans";
import { getJson } from "@/lib/getJson";
import { PageHeader, Panel, QuotaMeter, StatusBadge, SkeletonRows, buttonClass, cn, useFormatNumber } from "@/components/dashboard/ui";

interface PlanData {
  plan: PlanKey;
  planExpiresAt: string | null;
  limits: { maxUsers: number; clientsPerUser: number };
  usage: { mqttUsers: number; clients: { mqttUserId: string; username: string; count: number }[] };
}

const PLAN_ORDER: PlanKey[] = ["free", "basic", "starter", "enterprise"];
const PLAN_LABEL_KEY = { free: "planLabelFree", basic: "planLabelBasic", starter: "planLabelStarter", enterprise: "planLabelEnterprise" } as const;

// Set right before handing off to nodepass, so that coming back to this page
// can say "payment being confirmed" until the webhook actually flips the plan.
const PENDING_KEY = "pending-plan-checkout";
const PENDING_TTL_MS = 30 * 60 * 1000; // nodepass payment links expire after 30 minutes

type Pending = { plan: PlanKey; at: number };

function readPending(): Pending | null {
  try {
    const p = JSON.parse(sessionStorage.getItem(PENDING_KEY) ?? "null") as Pending | null;
    return p && Date.now() - p.at < PENDING_TTL_MS ? p : null;
  } catch {
    return null;
  }
}

export default function SubscriptionPage() {
  const t = useT();
  const { lang } = useLanguage();
  const fmt = useFormatNumber();
  const [data, setData] = useState<PlanData | null | undefined>(undefined);
  const [switching, setSwitching] = useState<PlanKey | null>(null);
  const [pending, setPending] = useState<Pending | null>(null);

  const load = useCallback(() => getJson<PlanData>("/api/user/plan").then(setData), []);
  useEffect(() => {
    queueMicrotask(() => { load(); setPending(readPending()); });
  }, [load]);

  // Clear the pending notice once the plan has actually switched.
  useEffect(() => {
    if (pending && data && data.plan === pending.plan) {
      try { sessionStorage.removeItem(PENDING_KEY); } catch {}
      queueMicrotask(() => setPending(null));
    }
  }, [pending, data]);

  const dismissPending = () => {
    try { sessionStorage.removeItem(PENDING_KEY); } catch {}
    setPending(null);
  };

  const currentPlan = data?.plan ?? "free";
  const totalClients = data?.usage.clients.reduce((s, c) => s + c.count, 0) ?? 0;

  /** Reasons current usage wouldn't fit `plan` — mirrors assertUsageFitsPlan on the server. */
  const blockers = (plan: PlanKey): string[] => {
    const def = PLAN_DEFS[plan];
    if (!data || def.maxUsers === null || def.clientsPerUser === null) return [];
    const out: string[] = [];
    if (data.usage.mqttUsers > def.maxUsers) out.push(`${fmt(data.usage.mqttUsers)} ${t("subTooManyCreds")} ${fmt(def.maxUsers)})`);
    for (const c of data.usage.clients) {
      if (c.count > def.clientsPerUser) out.push(`${c.username} ${t("subTooManyDevices")} ${fmt(def.clientsPerUser)})`);
    }
    return out;
  };

  const handleSwitch = async (plan: PlanKey) => {
    setSwitching(plan);
    try {
      const paid = (PLAN_DEFS[plan].priceToman ?? 0) > 0;
      const res = await fetch(paid ? "/api/user/plan/checkout" : "/api/user/plan", {
        method: paid ? "POST" : "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(json.error ?? t("subSwitchFailed"));
        return;
      }
      if (paid) {
        // Hand off to nodepass's hosted payment page — the plan itself only
        // actually changes once the webhook confirms payment.
        try { sessionStorage.setItem(PENDING_KEY, JSON.stringify({ plan, at: Date.now() } satisfies Pending)); } catch {}
        toast.info(t("subPayRedirect"));
        window.location.href = json.statusUrl;
        return;
      }
      toast.success(t("subSwitched"));
      load();
    } finally {
      setSwitching(null);
    }
  };

  const limitsLine = (plan: PlanKey) => {
    const def = PLAN_DEFS[plan];
    if (def.maxUsers === null || def.clientsPerUser === null) return [t("subCustomLimits")];
    if (def.maxUsers === 1) return [`${fmt(1)} ${t("subCredSets")}`, `${fmt(def.clientsPerUser)} ${t("subDevicesTotal")}`];
    return [
      `${fmt(def.maxUsers)} ${t("subCredSets")}`,
      `${fmt(def.clientsPerUser)} ${t("subDevicesEach")}`,
      `${fmt(def.maxUsers * def.clientsPerUser)} ${t("subDevicesTotal")}`,
    ];
  };

  return (
    <div className="space-y-6">
      <PageHeader title={t("subscriptionTitle")} description={t("subscriptionDesc")} />

      {pending && (
        <div role="status" className="flex items-start gap-3 rounded-2xl border border-brand-200 bg-brand-25 p-4 dark:border-brand-500/25 dark:bg-brand-500/10">
          <Clock className="mt-0.5 h-5 w-5 shrink-0 text-brand-600 dark:text-brand-400" aria-hidden />
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-gray-900 dark:text-white">{t("subPendingTitle")} — {t(PLAN_LABEL_KEY[pending.plan])}</p>
            <p className="mt-0.5 text-sm text-gray-600 dark:text-gray-300">{t("subPendingDesc")}</p>
          </div>
          <button type="button" onClick={dismissPending} aria-label={t("subDismiss")} className="rounded-lg p-1 text-gray-400 hover:bg-white/60 hover:text-gray-700 dark:hover:bg-white/10"><X className="h-4 w-4" /></button>
        </div>
      )}

      {/* Current plan + usage */}
      <Panel
        title={t("currentPlan")}
        actions={data && <StatusBadge status="active" label={t("planActive")} />}
      >
        {data === undefined ? <SkeletonRows rows={3} /> : data === null ? (
          <p className="text-sm text-error-600 dark:text-error-400">{t("ovLoadFailed")}</p>
        ) : (
          <div className="grid gap-6 lg:grid-cols-3">
            <div>
              <p className="text-3xl font-bold tracking-tight text-gray-900 dark:text-white">{t(PLAN_LABEL_KEY[currentPlan])}</p>
              {data.planExpiresAt && (
                <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                  {t("subRenewal")}: {new Date(data.planExpiresAt).toLocaleDateString(lang === "fa" ? "fa-IR" : "en-US", { year: "numeric", month: "long", day: "numeric" })}
                </p>
              )}
              <p className="mt-3 text-sm text-gray-500 dark:text-gray-400">
                {t("subTotalClients")}: <span className="font-semibold text-gray-800 dark:text-gray-100">{fmt(totalClients)}</span>
              </p>
            </div>
            <div className="space-y-4 lg:col-span-2">
              <QuotaMeter used={data.usage.mqttUsers} limit={data.limits.maxUsers} label={t("ovCredentialSets")} />
              {data.usage.clients.map((c) => (
                <QuotaMeter key={c.mqttUserId} used={c.count} limit={data.limits.clientsPerUser} label={<>{t("mqttClients")} · <span dir="ltr" className="font-mono-signal">{c.username}</span></>} />
              ))}
            </div>
          </div>
        )}
      </Panel>

      {/* Plan picker */}
      <section>
        <div className="mb-4 flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="text-base font-semibold text-gray-900 dark:text-white">{t("subPlans")}</h2>
          <p className="text-xs text-gray-500 dark:text-gray-400">{t("subPaidVia")}</p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {PLAN_ORDER.map((plan) => {
            const def = PLAN_DEFS[plan];
            const isCurrent = !!data && plan === currentPlan;
            const isUp = PLAN_ORDER.indexOf(plan) > PLAN_ORDER.indexOf(currentPlan);
            const blocked = !isCurrent && def.selfService ? blockers(plan) : [];
            const price = def.priceToman;
            return (
              <div
                key={plan}
                className={cn(
                  "flex flex-col rounded-2xl border bg-white p-5 dark:bg-gray-900/60",
                  isCurrent ? "border-brand-500 ring-4 ring-brand-500/10" : "border-gray-200 dark:border-gray-800",
                )}
              >
                <div className="flex items-center justify-between gap-2">
                  <p className="font-semibold text-gray-900 dark:text-white">{t(PLAN_LABEL_KEY[plan])}</p>
                  {isCurrent && <StatusBadge tone="brand" label={t("subCurrent")} />}
                </div>
                <p className="mt-3 text-2xl font-bold tracking-tight text-gray-900 dark:text-white">
                  {price === null ? t("subCustom") : price === 0 ? t("subFree") : (
                    <>{fmt(price)} <span className="text-sm font-medium text-gray-500">{t("walletUnit")} {t("subPerMonth")}</span></>
                  )}
                </p>
                <ul className="mt-4 flex-1 space-y-2 text-sm text-gray-600 dark:text-gray-300">
                  {limitsLine(plan).map((l) => (
                    <li key={l} className="flex items-start gap-2"><Check className="mt-0.5 h-4 w-4 shrink-0 text-success-500" aria-hidden />{l}</li>
                  ))}
                </ul>

                {blocked.length > 0 && (
                  <div className="mt-4 rounded-xl bg-warning-50 p-3 text-xs text-warning-800 dark:bg-warning-500/10 dark:text-warning-300">
                    <p className="font-semibold">{t("subDowngradeBlocked")}</p>
                    <ul className="mt-1 list-inside list-disc space-y-0.5">{blocked.map((b) => <li key={b}>{b}</li>)}</ul>
                  </div>
                )}

                <div className="mt-5">
                  {isCurrent ? null : def.selfService ? (
                    <button
                      type="button"
                      onClick={() => handleSwitch(plan)}
                      disabled={!data || switching !== null || blocked.length > 0}
                      className={cn(buttonClass(isUp ? "primary" : "secondary"), "w-full")}
                    >
                      {switching === plan ? t("subSwitching") : isUp ? t("subUpgrade") : t("subSwitch")}
                    </button>
                  ) : (
                    <Link href="/contact" className={cn(buttonClass("secondary"), "w-full")}>{t("subContactSales")}</Link>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}
