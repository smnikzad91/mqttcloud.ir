"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { Wallet, Radio, KeyRound, CreditCard, Check, ArrowLeft, ArrowRight, Cpu, Plus, Code2, TriangleAlert } from "lucide-react";
import { useT } from "@/i18n/useT";
import { useLanguage } from "@/context/LanguageContext";
import { useWallet } from "@/context/WalletContext";
import { useMqttLive, type MqttActivityEvent } from "@/context/MqttLiveContext";
import { getJson } from "@/lib/getJson";
import { formatRelative, useNow } from "@/lib/relativeTime";
import { PLAN_REMINDER_DAYS_BEFORE } from "@/lib/plans";
import { MQTT_HOST, MQTT_PORT_TCP, MQTT_PORT_TLS, MQTT_WS_URL } from "@/lib/mqttEndpoints";
import {
  PageHeader, Panel, StatTile, QuotaMeter, StatusBadge, CopyField, EmptyState, SkeletonRows,
  buttonClass, cn, useFormatNumber,
} from "@/components/dashboard/ui";

type PlanKey = "free" | "basic" | "starter" | "enterprise";
type PlanInfo = {
  plan: PlanKey;
  planExpiresAt: string | null;
  limits: { maxUsers: number; clientsPerUser: number };
  usage: { mqttUsers: number; clients: { mqttUserId: string; username: string; count: number }[] };
};
type Client = { id: string; clientName: string; isOnline: boolean; lastSeenAt: string | null };
type Profile = { phoneVerified?: boolean };

const PLAN_LABEL_KEY = { free: "planLabelFree", basic: "planLabelBasic", starter: "planLabelStarter", enterprise: "planLabelEnterprise" } as const;

export default function UserDashboardPage() {
  const t = useT();
  const { lang } = useLanguage();
  const isRTL = lang === "fa";
  const fmt = useFormatNumber();
  const { data: session } = useSession();
  const { balance } = useWallet();
  const firstName = (session?.user?.name ?? "").split(" ")[0];

  // `undefined` = still loading, `null` = failed.
  const [plan, setPlan] = useState<PlanInfo | null | undefined>(undefined);
  const [clients, setClients] = useState<Client[] | null | undefined>(undefined);
  const [profile, setProfile] = useState<Profile | null | undefined>(undefined);

  useEffect(() => {
    getJson<PlanInfo>("/api/user/plan").then(setPlan);
    getJson<Client[]>("/api/user/mqtt/clients").then(setClients);
    getJson<Profile>("/api/user/profile").then(setProfile);
  }, []);

  // Keep device status live.
  const onLive = useCallback((e: MqttActivityEvent) => {
    setClients((prev) => prev?.map((c) => (c.clientName === e.clientName ? { ...c, isOnline: e.event === "connect", lastSeenAt: e.createdAt } : c)) ?? prev);
  }, []);
  useMqttLive(onLive);

  const Arrow = isRTL ? ArrowLeft : ArrowRight;
  const totalDevices = clients?.length ?? 0;
  const onlineDevices = clients?.filter((c) => c.isOnline).length ?? 0;
  const dateFmt = (v: string, opts: Intl.DateTimeFormatOptions) => new Date(v).toLocaleString(isRTL ? "fa-IR" : "en-US", opts);
  const now = useNow(30_000);
  const daysLeft = plan?.planExpiresAt ? Math.max(0, Math.ceil((new Date(plan.planExpiresAt).getTime() - now) / 864e5)) : null;
  // Online first, then most recently seen; never-connected last.
  const deviceList = [...(clients ?? [])].sort((a, b) =>
    Number(b.isOnline) - Number(a.isOnline) || (b.lastSeenAt ?? "").localeCompare(a.lastSeenAt ?? ""));

  const steps = [
    { done: profile?.phoneVerified !== false, label: t("ovStepPhone"),      href: "/dashboard/profile" },
    { done: (plan?.usage.mqttUsers ?? 0) > 0,  label: t("ovStepCredential"), href: "/dashboard/mqtt" },
    { done: totalDevices > 0,                  label: t("ovStepDevice"),     href: "/dashboard/mqtt" },
    { done: !!clients?.some((c) => c.lastSeenAt), label: t("ovStepConnect"), href: "/dashboard/mqtt" },
  ];
  const stepsLoaded = plan !== undefined && clients !== undefined && profile !== undefined;
  const stepsDone = steps.filter((s) => s.done).length;

  return (
    <div className="space-y-6">
      <PageHeader
        title={<>{t("welcomeBack")}{firstName ? `${isRTL ? " " : ", "}${firstName}` : ""} 👋</>}
        description={t("accountSummary")}
        actions={<Link href="/dashboard/mqtt" className={buttonClass("primary")}><Plus className="h-4 w-4" />{t("ovAddDevice")}</Link>}
      />

      {daysLeft !== null && daysLeft <= PLAN_REMINDER_DAYS_BEFORE && plan && (
        <div role="status" className="flex flex-wrap items-center gap-3 rounded-2xl border border-warning-200 bg-warning-50 p-4 dark:border-warning-500/20 dark:bg-warning-500/10">
          <TriangleAlert className="h-5 w-5 shrink-0 text-warning-600 dark:text-warning-400" aria-hidden />
          <p className="min-w-0 flex-1 text-sm text-gray-800 dark:text-gray-100">
            <strong>{t(PLAN_LABEL_KEY[plan.plan] ?? "planLabelFree")} · {daysLeft === 0 ? t("subEndsToday") : t("subDaysLeft").replace("{n}", fmt(daysLeft))}</strong>
            <span className="text-gray-600 dark:text-gray-300"> — {t("subExpiryWarn")}</span>
          </p>
          <Link href="/dashboard/subscription" className={buttonClass("primary", "sm")}>{t("subRenewShort")}</Link>
        </div>
      )}

      {/* Getting started — only until every step is done. */}
      {stepsLoaded && stepsDone < steps.length && (
        <Panel
          title={t("ovGettingStarted")}
          description={t("ovGettingStartedDesc")}
          actions={<span dir="ltr" className="font-mono-signal text-sm font-semibold text-brand-600 dark:text-brand-400">{fmt(stepsDone)}/{fmt(steps.length)}</span>}
          className="border-brand-200 bg-gradient-to-br from-brand-25 to-white dark:border-brand-500/20 dark:from-brand-500/[0.07] dark:to-gray-900/60"
        >
          <ol className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {steps.map((s, i) => (
              <li key={s.label}>
                <Link
                  href={s.href}
                  className={cn(
                    "flex h-full items-center gap-3 rounded-xl border p-3 text-sm transition",
                    s.done
                      ? "border-success-200 bg-success-50/60 text-gray-500 dark:border-success-500/20 dark:bg-success-500/5 dark:text-gray-400"
                      : "border-gray-200 bg-white font-medium text-gray-800 hover:border-brand-300 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-100 dark:hover:border-brand-700",
                  )}
                >
                  <span className={cn("flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold", s.done ? "bg-success-500 text-white" : "bg-brand-50 text-brand-600 dark:bg-brand-500/15 dark:text-brand-300")}>
                    {s.done ? <Check className="h-4 w-4" aria-label={t("ovStepsDone")} /> : fmt(i + 1)}
                  </span>
                  <span className={cn(s.done && "line-through decoration-gray-300 dark:decoration-gray-600")}>{s.label}</span>
                </Link>
              </li>
            ))}
          </ol>
        </Panel>
      )}

      {/* KPIs */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatTile
          href="/dashboard/finance"
          icon={<Wallet className="h-5 w-5" />}
          label={t("walletBalanceLabel")}
          value={balance === null ? "—" : <>{fmt(balance)} <span className="text-sm font-medium text-gray-500">{t("walletUnit")}</span></>}
          hint={<span className="text-brand-600 dark:text-brand-400">{t("topUp")}</span>}
        />
        <StatTile
          href="/dashboard/mqtt"
          icon={<Radio className="h-5 w-5" />}
          label={t("ovDevicesOnline")}
          value={clients === undefined ? "…" : <span dir="ltr">{fmt(onlineDevices)} <span className="text-base font-medium text-gray-400">/ {fmt(totalDevices)}</span></span>}
        />
        <StatTile
          href="/dashboard/mqtt"
          icon={<KeyRound className="h-5 w-5" />}
          label={t("ovCredentialSets")}
          value={!plan ? "…" : <span dir="ltr">{fmt(plan.usage.mqttUsers)} <span className="text-base font-medium text-gray-400">/ {fmt(plan.limits.maxUsers)}</span></span>}
        />
        <StatTile
          href="/dashboard/subscription"
          icon={<CreditCard className="h-5 w-5" />}
          label={t("currentPlan")}
          value={!plan ? "…" : t(PLAN_LABEL_KEY[plan.plan] ?? "planLabelFree")}
          hint={plan?.planExpiresAt ? <>{t("ovRenewsOn")} {dateFmt(plan.planExpiresAt, { year: "numeric", month: "long", day: "numeric" })}</> : undefined}
        />
      </div>

      <div className="grid gap-6 xl:grid-cols-5">
        {/* Plan usage */}
        <Panel
          title={t("ovPlanUsage")}
          className="xl:col-span-2"
          actions={
            <Link href="/dashboard/subscription" className={buttonClass(plan && plan.plan !== "enterprise" && plan.plan !== "starter" ? "primary" : "secondary", "sm")}>
              {plan && plan.plan !== "enterprise" && plan.plan !== "starter" ? t("upgradePlan") : t("manageSubscription")}
            </Link>
          }
        >
          {plan === undefined ? <SkeletonRows rows={3} /> : plan === null ? (
            <p className="text-sm text-error-600 dark:text-error-400">{t("ovLoadFailed")}</p>
          ) : (
            <div className="space-y-5">
              <QuotaMeter used={plan.usage.mqttUsers} limit={plan.limits.maxUsers} label={t("ovCredentialSets")} />
              {plan.usage.clients.map((c) => (
                <QuotaMeter
                  key={c.mqttUserId}
                  used={c.count}
                  limit={plan.limits.clientsPerUser}
                  label={<>{t("mqttClients")} · <span dir="ltr" className="font-mono-signal">{c.username}</span></>}
                />
              ))}
              <Link href="/pricing" className="inline-flex items-center gap-1 text-sm font-medium text-brand-600 hover:underline dark:text-brand-400">
                {t("comparePlans")} <Arrow className="h-3.5 w-3.5" />
              </Link>
            </div>
          )}
        </Panel>

        {/* Devices, live */}
        <Panel
          title={t("ovYourDevices")}
          className="xl:col-span-3"
          bodyClassName="p-0"
          actions={<Link href="/dashboard/mqtt/activity" className="text-sm font-medium text-brand-600 hover:underline dark:text-brand-400">{t("ovSeeActivity")}</Link>}
        >
          {clients === undefined ? <div className="p-5"><SkeletonRows rows={5} /></div> : clients === null ? (
            <p className="p-5 text-sm text-error-600 dark:text-error-400">{t("ovLoadFailed")}</p>
          ) : clients.length === 0 ? (
            <EmptyState icon={<Cpu className="h-6 w-6" />} title={t("noMqttClients")} action={<Link href="/dashboard/mqtt" className={buttonClass("primary", "sm")}><Plus className="h-4 w-4" />{t("ovAddDevice")}</Link>} />
          ) : (
            <>
              <ul className="divide-y divide-gray-100 dark:divide-gray-800">
                {deviceList.slice(0, 6).map((c) => (
                  <li key={c.id} className="flex items-center justify-between gap-3 px-5 py-3">
                    <span className="flex min-w-0 items-center gap-2.5">
                      <span className={cn("h-2 w-2 shrink-0 rounded-full", c.isOnline ? "bg-success-500" : "bg-gray-300 dark:bg-gray-600")} aria-hidden />
                      <span dir="ltr" className="truncate font-mono-signal text-sm text-gray-800 dark:text-gray-100">{c.clientName}</span>
                    </span>
                    <span className="flex shrink-0 items-center gap-3">
                      <span className="hidden text-xs text-gray-500 sm:block dark:text-gray-400">
                        {c.isOnline ? t("mqttOnline") : c.lastSeenAt ? <>{t("ovSeen")} {formatRelative(c.lastSeenAt, lang, now)}</> : t("av2NeverConnected")}
                      </span>
                      <StatusBadge status={c.isOnline ? "online" : "offline"} label={c.isOnline ? t("mqttOnline") : t("mqttOffline")} pulse={c.isOnline} />
                    </span>
                  </li>
                ))}
              </ul>
              {deviceList.length > 6 && (
                <Link href="/dashboard/mqtt" className="block border-t border-gray-100 px-5 py-3 text-sm font-medium text-brand-600 hover:underline dark:border-gray-800 dark:text-brand-400">
                  {t("ovMoreDevices").replace("{n}", fmt(deviceList.length - 6))}
                </Link>
              )}
            </>
          )}
        </Panel>
      </div>

      {/* Connection info */}
      <Panel
        title={t("mqttConnectionInfo")}
        description={t("mqttConnectionInfoDesc")}
        actions={
          <Link href="/dashboard/mqtt" className="inline-flex items-center gap-1.5 text-sm font-medium text-brand-600 hover:underline dark:text-brand-400">
            <Code2 className="h-4 w-4" />{t("ovCodeSamples")}
          </Link>
        }
      >
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <CopyField label={t("mqttHost")} value={MQTT_HOST} />
          <CopyField label={t("mqttPortTls")} value={MQTT_PORT_TLS} />
          <CopyField label={t("mqttPortPlain")} value={MQTT_PORT_TCP} />
          <CopyField label={t("mqttWsUrl")} value={MQTT_WS_URL} />
        </div>
      </Panel>
    </div>
  );
}
