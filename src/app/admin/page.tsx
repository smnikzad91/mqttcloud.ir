"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Users, BadgeDollarSign, Radio, Crown, CheckCircle2 } from "lucide-react";
import { useT } from "@/i18n/useT";
import { useLanguage } from "@/context/LanguageContext";
import { getJson } from "@/lib/getJson";
import DailyBars from "@/components/dashboard/DailyBars";
import { AgeBadge, RelTime } from "@/components/admin/AdminParts";
import { PageHeader, Panel, StatTile, StatusBadge, EmptyState, SkeletonRows, useFormatNumber } from "@/components/dashboard/ui";

type PlanKey = "free" | "basic" | "starter" | "enterprise";
type AdminUser = { id: string; role: "admin" | "user"; plan: PlanKey; createdAt: string };
type Deposit = { id: string; amount: number; status: "pending" | "approved" | "rejected"; createdAt: string; user: { name: string; email: string } | null };
type TicketRow = { id: string; subject: string; status: "open" | "answered" | "closed"; updatedAt: string; user: { name: string; email: string } | null };
type Contact = { _id: string; name: string; subject: string; status: "new" | "read" | "replied"; createdAt: string };
type Client = { id: string; isOnline: boolean };
type ActivityRow = { id: string; clientName: string; event: "connect" | "disconnect"; createdAt: string; user: { name: string } | null };

const PLAN_ORDER: PlanKey[] = ["free", "basic", "starter", "enterprise"];
const PLAN_LABEL_KEY = { free: "planLabelFree", basic: "planLabelBasic", starter: "planLabelStarter", enterprise: "planLabelEnterprise" } as const;
const DAYS = 14;
const oldestFirst = <T,>(list: T[], key: (x: T) => string) => [...list].sort((a, b) => key(a).localeCompare(key(b)));

export default function AdminOverviewPage() {
  const t = useT();
  const fmt = useFormatNumber();
  const { lang } = useLanguage();

  const [users, setUsers] = useState<AdminUser[] | null>(null);
  const [deposits, setDeposits] = useState<Deposit[] | null>(null);
  const [tickets, setTickets] = useState<TicketRow[] | null>(null);
  const [contacts, setContacts] = useState<Contact[] | null>(null);
  const [clients, setClients] = useState<Client[] | null>(null);
  const [activity, setActivity] = useState<ActivityRow[] | null>(null);

  useEffect(() => {
    getJson<AdminUser[]>("/api/admin/users").then((d) => setUsers(d ?? []));
    getJson<Deposit[]>("/api/admin/finance/deposits").then((d) => setDeposits(d ?? []));
    getJson<TicketRow[]>("/api/admin/tickets").then((d) => setTickets(d ?? []));
    getJson<Contact[]>("/api/admin/contact").then((d) => setContacts(d ?? []));
    getJson<Client[]>("/api/admin/mqtt/clients").then((d) => setClients(d ?? []));
    getJson<ActivityRow[]>("/api/admin/mqtt/activity").then((d) => setActivity(d ?? []));
  }, []);

  const monthStart = useMemo(() => { const d = new Date(); return new Date(d.getFullYear(), d.getMonth(), 1).getTime(); }, []);
  const inMonth = (iso: string) => new Date(iso).getTime() >= monthStart;
  const newThisMonth = users?.filter((u) => inMonth(u.createdAt)).length ?? 0;
  const paying = users?.filter((u) => u.plan !== "free").length ?? 0;
  const approvedMonth = (deposits ?? []).filter((d) => d.status === "approved" && inMonth(d.createdAt));
  const online = clients?.filter((c) => c.isOnline).length ?? 0;

  // The three queues, oldest first — that's the order they should be worked in.
  const pending = useMemo(() => oldestFirst((deposits ?? []).filter((d) => d.status === "pending"), (d) => d.createdAt), [deposits]);
  const pendingSum = pending.reduce((s, d) => s + d.amount, 0);
  const awaiting = useMemo(() => oldestFirst((tickets ?? []).filter((x) => x.status === "open"), (x) => x.updatedAt), [tickets]);
  const unread = useMemo(() => oldestFirst((contacts ?? []).filter((c) => c.status === "new"), (c) => c.createdAt), [contacts]);
  const queuesLoaded = deposits !== null && tickets !== null && contacts !== null;
  const allClear = queuesLoaded && !pending.length && !awaiting.length && !unread.length;

  // Sign-ups per day for the last 14 days, computed from the user list.
  const signups = useMemo(() => {
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const days = Array.from({ length: DAYS }, (_, i) => ({ date: new Date(today.getTime() - (DAYS - 1 - i) * 864e5), value: 0 }));
    for (const u of users ?? []) {
      const d = new Date(u.createdAt); d.setHours(0, 0, 0, 0);
      const idx = Math.round((d.getTime() - days[0].date.getTime()) / 864e5);
      if (idx >= 0 && idx < DAYS) days[idx].value++;
    }
    return days;
  }, [users]);
  const signupTotal = signups.reduce((s, d) => s + d.value, 0);

  const planCounts = PLAN_ORDER.map((p) => ({ plan: p, count: users?.filter((u) => u.plan === p).length ?? 0 }));
  const planMax = Math.max(1, ...planCounts.map((p) => p.count));
  const dots = (v: unknown) => (v === null ? "…" : null);
  const pct = (n: number, of: number) => (of ? (n / of).toLocaleString(lang === "fa" ? "fa-IR" : "en-US", { style: "percent", maximumFractionDigits: 0 }) : "");

  const viewAll = (href: string) => <Link href={href} className="text-sm font-medium text-brand-600 hover:underline dark:text-brand-400">{t("ovViewAll")}</Link>;
  const queueTitle = (label: string, n: number) => (
    <span className="flex items-center gap-2">{label}{n > 0 && <span className="rounded-full bg-warning-50 px-2 py-0.5 text-xs font-semibold text-warning-700 dark:bg-warning-500/10 dark:text-warning-400">{fmt(n)}</span>}</span>
  );
  const row = "flex items-center justify-between gap-3 px-5 py-3 transition hover:bg-gray-50 dark:hover:bg-white/[0.02]";

  return (
    <div className="space-y-6">
      <PageHeader title={t("aovTitle")} description={t("aovDesc")} />

      {/* Needs attention */}
      {allClear ? (
        <div className="flex items-center gap-3 rounded-2xl border border-success-200 bg-success-50/60 px-5 py-4 text-sm text-success-800 dark:border-success-500/20 dark:bg-success-500/5 dark:text-success-300">
          <CheckCircle2 className="h-5 w-5 shrink-0" aria-hidden />{t("aovAllClear")}
        </div>
      ) : (
        <div className="grid gap-6 lg:grid-cols-3">
          <Panel title={queueTitle(t("aovDepositQueue"), pending.length)} description={pending.length > 0 ? <>{fmt(pendingSum)} {t("walletUnit")} {t("afPendingSum")}</> : undefined} bodyClassName="p-0" actions={viewAll("/admin/finance")}>
            {deposits === null ? <div className="p-5"><SkeletonRows rows={3} /></div> : pending.length === 0 ? <EmptyState title={t("aovQueueEmpty")} /> : (
              <ul className="divide-y divide-gray-100 dark:divide-gray-800">
                {pending.slice(0, 5).map((d) => (
                  <li key={d.id}>
                    <Link href={`/admin/finance?review=${d.id}`} className={row}>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-gray-800 dark:text-gray-100">{d.user?.name || d.user?.email || "—"}</p>
                        <p className="mt-0.5 text-sm font-semibold text-gray-900 dark:text-white">{fmt(d.amount)} <span className="text-xs font-normal text-gray-400">{t("walletUnit")}</span></p>
                      </div>
                      <AgeBadge iso={d.createdAt} />
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </Panel>

          <Panel title={queueTitle(t("aovTicketQueue"), awaiting.length)} bodyClassName="p-0" actions={viewAll("/admin/tickets")}>
            {tickets === null ? <div className="p-5"><SkeletonRows rows={3} /></div> : awaiting.length === 0 ? <EmptyState title={t("aovQueueEmpty")} /> : (
              <ul className="divide-y divide-gray-100 dark:divide-gray-800">
                {awaiting.slice(0, 5).map((x) => (
                  <li key={x.id}>
                    <Link href={`/admin/tickets/${x.id}`} className={row}>
                      <div className="min-w-0">
                        <p dir="auto" className="truncate text-sm font-medium text-gray-800 dark:text-gray-100">{x.subject}</p>
                        <p className="truncate text-xs text-gray-500 dark:text-gray-400">{x.user?.name || x.user?.email}</p>
                      </div>
                      <AgeBadge iso={x.updatedAt} />
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </Panel>

          <Panel title={queueTitle(t("aovNewMessages"), unread.length)} bodyClassName="p-0" actions={viewAll("/admin/contact")}>
            {contacts === null ? <div className="p-5"><SkeletonRows rows={3} /></div> : unread.length === 0 ? <EmptyState title={t("aovQueueEmpty")} /> : (
              <ul className="divide-y divide-gray-100 dark:divide-gray-800">
                {unread.slice(0, 5).map((c) => (
                  <li key={c._id}>
                    <Link href={`/admin/contact?open=${c._id}`} className={row}>
                      <div className="min-w-0">
                        <p dir="auto" className="truncate text-sm font-medium text-gray-800 dark:text-gray-100">{c.subject}</p>
                        <p dir="auto" className="truncate text-xs text-gray-500 dark:text-gray-400">{c.name}</p>
                      </div>
                      <AgeBadge iso={c.createdAt} />
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </Panel>
        </div>
      )}

      {/* Business at a glance */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatTile href="/admin/users" icon={<Users className="h-5 w-5" />} label={t("aovUsers")} value={dots(users) ?? fmt(users!.length)} hint={users && <>+{fmt(newThisMonth)} {t("aovNewThisMonth")}</>} />
        <StatTile href="/admin/users" icon={<Crown className="h-5 w-5" />} label={t("aovPaying")} value={dots(users) ?? fmt(paying)} hint={users && users.length > 0 && <>{pct(paying, users.length)} {t("aovOfUsers")}</>} />
        <StatTile href="/admin/finance" icon={<BadgeDollarSign className="h-5 w-5" />} label={t("aovTopUpsMonth")} value={dots(deposits) ?? <>{fmt(approvedMonth.reduce((s, d) => s + d.amount, 0))} <span className="text-sm font-medium text-gray-500">{t("walletUnit")}</span></>} hint={deposits && <>{fmt(approvedMonth.length)} × {t("statusApproved")}</>} />
        <StatTile href="/admin/mqtt" icon={<Radio className="h-5 w-5" />} label={t("aovDevicesOnline")} value={dots(clients) ?? <span dir="ltr">{fmt(online)} <span className="text-base font-medium text-gray-400">/ {fmt(clients!.length)}</span></span>} />
      </div>

      <div className="grid gap-6 xl:grid-cols-3">
        <Panel title={t("aovSignups")} className="xl:col-span-2" actions={users && <span className="text-sm text-gray-500 dark:text-gray-400">{t("aovSignupsTotal")}: <strong className="text-gray-900 dark:text-white">{fmt(signupTotal)}</strong></span>}>
          {users === null ? <SkeletonRows rows={4} /> : <DailyBars points={signups} valueLabel={t("aovCount")} dayLabel={t("aovDay")} />}
        </Panel>

        <Panel title={t("aovPlans")}>
          {users === null ? <SkeletonRows rows={4} /> : (
            <ul className="space-y-4">
              {planCounts.map(({ plan, count }) => (
                <li key={plan}>
                  <div className="mb-1.5 flex justify-between text-sm">
                    <span className="text-gray-600 dark:text-gray-300">{t(PLAN_LABEL_KEY[plan])}</span>
                    <span className="font-semibold text-gray-900 dark:text-white">{fmt(count)}</span>
                  </div>
                  <div className="h-1.5 rounded-full bg-gray-100 dark:bg-white/5">
                    <div className="h-full rounded-full bg-brand-500" style={{ width: `${(count / planMax) * 100}%` }} />
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </div>

      <Panel title={t("aovBrokerActivity")} bodyClassName="p-0" actions={viewAll("/admin/mqtt")}>
        {activity === null ? <div className="p-5"><SkeletonRows rows={3} /></div> : activity.length === 0 ? <EmptyState title={t("noMqttActivity")} /> : (
          <ul className="grid divide-y divide-gray-100 md:grid-cols-2 md:divide-y-0 dark:divide-gray-800">
            {activity.slice(0, 8).map((a) => (
              <li key={a.id} className="flex items-center justify-between gap-3 border-gray-100 px-5 py-3 md:border-b dark:border-gray-800">
                <div className="min-w-0">
                  <p dir="ltr" className="truncate text-start font-mono-signal text-sm text-gray-800 dark:text-gray-100">{a.clientName}</p>
                  <p className="truncate text-xs text-gray-500 dark:text-gray-400">{a.user?.name} · <RelTime iso={a.createdAt} /></p>
                </div>
                <StatusBadge status={a.event} label={a.event === "connect" ? t("eventConnect") : t("eventDisconnect")} />
              </li>
            ))}
          </ul>
        )}
      </Panel>
    </div>
  );
}
