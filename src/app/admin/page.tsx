"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Users, BadgeDollarSign, Ticket, Mail, Radio } from "lucide-react";
import { useT } from "@/i18n/useT";
import { useLanguage } from "@/context/LanguageContext";
import { getJson } from "@/lib/getJson";
import DailyBars from "@/components/dashboard/DailyBars";
import { PageHeader, Panel, StatTile, StatusBadge, EmptyState, SkeletonRows, useFormatNumber } from "@/components/dashboard/ui";

type PlanKey = "free" | "basic" | "starter" | "enterprise";
type AdminUser = { id: string; role: "admin" | "user"; plan: PlanKey; createdAt: string };
type Deposit = { id: string; amount: number; status: "pending" | "approved" | "rejected"; createdAt: string; user: { name: string; email: string } | null };
type TicketRow = { id: string; subject: string; status: "open" | "answered" | "closed"; updatedAt: string; user: { name: string; email: string } | null };
type Contact = { _id: string; status: "new" | "read" | "replied" };
type Client = { id: string; isOnline: boolean };
type ActivityRow = { id: string; clientName: string; event: "connect" | "disconnect"; createdAt: string; user: { name: string } | null };

const PLAN_ORDER: PlanKey[] = ["free", "basic", "starter", "enterprise"];
const PLAN_LABEL_KEY = { free: "planLabelFree", basic: "planLabelBasic", starter: "planLabelStarter", enterprise: "planLabelEnterprise" } as const;
const DAYS = 14;

export default function AdminOverviewPage() {
  const t = useT();
  const { lang } = useLanguage();
  const isRTL = lang === "fa";
  const fmt = useFormatNumber();

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
  const newThisMonth = users?.filter((u) => new Date(u.createdAt).getTime() >= monthStart).length ?? 0;
  const pending = useMemo(() => (deposits ?? []).filter((d) => d.status === "pending"), [deposits]);
  const pendingSum = pending.reduce((s, d) => s + d.amount, 0);
  const awaiting = useMemo(() => (tickets ?? []).filter((x) => x.status === "open"), [tickets]);
  const newMessages = contacts?.filter((c) => c.status === "new").length ?? 0;
  const online = clients?.filter((c) => c.isOnline).length ?? 0;

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

  const when = (iso: string) => new Date(iso).toLocaleString(isRTL ? "fa-IR" : "en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
  const dots = (v: unknown) => (v === null ? "…" : null);

  return (
    <div className="space-y-6">
      <PageHeader title={t("aovTitle")} description={t("aovDesc")} />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <StatTile href="/admin/users" icon={<Users className="h-5 w-5" />} label={t("aovUsers")} value={dots(users) ?? fmt(users!.length)} hint={users && <>+{fmt(newThisMonth)} {t("aovNewThisMonth")}</>} />
        <StatTile href="/admin/finance" icon={<BadgeDollarSign className="h-5 w-5" />} label={t("aovPendingDeposits")} value={dots(deposits) ?? fmt(pending.length)} hint={deposits && pending.length > 0 && <>{fmt(pendingSum)} {t("walletUnit")}</>} />
        <StatTile href="/admin/tickets" icon={<Ticket className="h-5 w-5" />} label={t("aovOpenTickets")} value={dots(tickets) ?? fmt(awaiting.length)} />
        <StatTile href="/admin/contact" icon={<Mail className="h-5 w-5" />} label={t("aovNewMessages")} value={dots(contacts) ?? fmt(newMessages)} />
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

      <div className="grid gap-6 xl:grid-cols-3">
        <Panel title={t("aovDepositQueue")} bodyClassName="p-0" actions={<Link href="/admin/finance" className="text-sm font-medium text-brand-600 hover:underline dark:text-brand-400">{t("ovViewAll")}</Link>}>
          {deposits === null ? <div className="p-5"><SkeletonRows rows={3} /></div> : pending.length === 0 ? <EmptyState title={t("aovQueueEmpty")} /> : (
            <ul className="divide-y divide-gray-100 dark:divide-gray-800">
              {pending.slice(0, 5).map((d) => (
                <li key={d.id} className="flex items-center justify-between gap-3 px-5 py-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-gray-800 dark:text-gray-100">{d.user?.name || d.user?.email || "—"}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">{when(d.createdAt)}</p>
                  </div>
                  <span className="shrink-0 text-sm font-semibold text-gray-900 dark:text-white">{fmt(d.amount)} <span className="text-xs font-normal text-gray-400">{t("walletUnit")}</span></span>
                </li>
              ))}
            </ul>
          )}
        </Panel>

        <Panel title={t("aovTicketQueue")} bodyClassName="p-0" actions={<Link href="/admin/tickets" className="text-sm font-medium text-brand-600 hover:underline dark:text-brand-400">{t("ovViewAll")}</Link>}>
          {tickets === null ? <div className="p-5"><SkeletonRows rows={3} /></div> : awaiting.length === 0 ? <EmptyState title={t("aovQueueEmpty")} /> : (
            <ul className="divide-y divide-gray-100 dark:divide-gray-800">
              {awaiting.slice(0, 5).map((x) => (
                <li key={x.id}>
                  <Link href={`/admin/tickets/${x.id}`} className="block px-5 py-3 transition hover:bg-gray-50 dark:hover:bg-white/[0.02]">
                    <p dir="auto" className="truncate text-sm font-medium text-gray-800 dark:text-gray-100">{x.subject}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">{x.user?.name || x.user?.email} · {when(x.updatedAt)}</p>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Panel>

        <Panel title={t("aovBrokerActivity")} bodyClassName="p-0" actions={<Link href="/admin/mqtt" className="text-sm font-medium text-brand-600 hover:underline dark:text-brand-400">{t("ovViewAll")}</Link>}>
          {activity === null ? <div className="p-5"><SkeletonRows rows={3} /></div> : activity.length === 0 ? <EmptyState title={t("noMqttActivity")} /> : (
            <ul className="divide-y divide-gray-100 dark:divide-gray-800">
              {activity.slice(0, 6).map((a) => (
                <li key={a.id} className="flex items-center justify-between gap-3 px-5 py-3">
                  <div className="min-w-0">
                    <p dir="ltr" className="truncate text-start font-mono-signal text-sm text-gray-800 dark:text-gray-100">{a.clientName}</p>
                    <p className="truncate text-xs text-gray-500 dark:text-gray-400">{a.user?.name} · {when(a.createdAt)}</p>
                  </div>
                  <StatusBadge status={a.event} label={a.event === "connect" ? t("eventConnect") : t("eventDisconnect")} />
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </div>
    </div>
  );
}
