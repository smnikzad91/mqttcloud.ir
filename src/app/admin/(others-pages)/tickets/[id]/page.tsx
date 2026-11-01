"use client";

import Link from "next/link";
import Image from "next/image";
import { useCallback, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { toast } from "sonner";
import { useT } from "@/i18n/useT";
import { getJson } from "@/lib/getJson";
import TicketThread, { useTicketStatusLabels, type TicketData } from "@/components/dashboard/TicketThread";
import { ConfirmDialog, EmptyState, Panel, SkeletonRows, StatusBadge, buttonClass, useFormatNumber } from "@/components/dashboard/ui";
import { RelTime, userHref } from "@/components/admin/AdminParts";

type TicketUser = { firstName?: string; lastName?: string; email?: string; avatar?: string } | null;
type AdminTicket = TicketData & { userId: TicketUser };
type PlanKey = "free" | "basic" | "starter" | "enterprise";
type Account = { email: string; plan: PlanKey; walletBalance: number; phone: string; createdAt: string };
type OtherTicket = { id: string; subject: string; status: "open" | "answered" | "closed"; updatedAt: string; user: { email: string } | null };
type Device = { id: string; isOnline: boolean; user: { email: string } | null };
type Customer = { account: Account | null; tickets: OtherTicket[]; devices: Device[] };
const PLAN_LABEL_KEY = { free: "planLabelFree", basic: "planLabelBasic", starter: "planLabelStarter", enterprise: "planLabelEnterprise" } as const;

export default function AdminTicketDetailPage() {
  const t = useT();
  const { id } = useParams<{ id: string }>();
  const [ticket, setTicket] = useState<AdminTicket | null | undefined>(undefined);
  const [confirmClose, setConfirmClose] = useState(false);
  const [busy, setBusy] = useState(false);

  const [customer, setCustomer] = useState<Customer | null>(null);
  const fmt = useFormatNumber();
  const statusLabels = useTicketStatusLabels();

  const load = useCallback(() => getJson<AdminTicket>(`/api/admin/tickets/${id}`).then((d) => setTicket(d?._id ? d : null)), [id]);
  useEffect(() => { queueMicrotask(load); }, [load]);

  // Who's asking: their account, devices and other tickets (the list endpoints identify owners by email).
  const email = ticket?.userId?.email;
  useEffect(() => {
    if (!email) return;
    Promise.all([
      getJson<Account[]>("/api/admin/users"),
      getJson<OtherTicket[]>("/api/admin/tickets"),
      getJson<Device[]>("/api/admin/mqtt/clients"),
    ]).then(([users, tickets, devices]) => setCustomer({
      account: (users ?? []).find((u) => u.email === email) ?? null,
      tickets: (tickets ?? []).filter((x) => x.user?.email === email && x.id !== id),
      devices: (devices ?? []).filter((d) => d.user?.email === email),
    }));
  }, [email, id]);

  const reply = async (message: string, images: string[]) => {
    const res = await fetch(`/api/admin/tickets/${id}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ message, images }) });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) { toast.error(data.error || t("saveError")); return false; }
    toast.success(t("replySent"));
    load();
    return true;
  };

  const setStatus = async (status: "open" | "closed") => {
    setBusy(true);
    const res = await fetch(`/api/admin/tickets/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status }) });
    setBusy(false);
    if (!res.ok) return toast.error(t("saveError"));
    toast.success(t("ticketStatusUpdated"));
    setConfirmClose(false);
    load();
  };

  if (ticket === undefined) return <SkeletonRows rows={6} />;
  if (ticket === null) {
    return <EmptyState title={t("notFound")} action={<Link href="/admin/tickets" className={buttonClass("secondary", "sm")}>{t("backToTickets")}</Link>} />;
  }

  const u = ticket.userId;
  const name = `${u?.firstName ?? ""} ${u?.lastName ?? ""}`.trim();

  return (
    <>
      <TicketThread
        ticket={ticket}
        viewer="admin"
        backHref="/admin/tickets"
        onReply={reply}
        customerName={name || u?.email}
        headerActions={ticket.status !== "closed"
          ? <button type="button" onClick={() => setConfirmClose(true)} disabled={busy} className={buttonClass("secondary", "sm")}>{t("closeTicket")}</button>
          : <button type="button" onClick={() => setStatus("open")} disabled={busy} className={buttonClass("primary", "sm")}>{t("reopenTicket")}</button>}
        aside={
          <Panel title={t("ticketFrom")} className="h-fit">
            <div className="flex items-center gap-3">
              <Image src={u?.avatar || "/images/user/user-01.jpg"} alt="" width={40} height={40} className="h-10 w-10 rounded-full object-cover" />
              <div className="min-w-0">
                <p className="truncate font-medium text-gray-900 dark:text-white">{name || "—"}</p>
                <p dir="ltr" className="truncate text-start text-sm text-gray-500 dark:text-gray-400">{u?.email}</p>
              </div>
            </div>
            {!customer ? <div className="mt-4"><SkeletonRows rows={3} /></div> : (
              <>
                <dl className="mt-4 space-y-2.5 border-t border-gray-100 pt-4 text-sm dark:border-gray-800">
                  {customer.account && (
                    <>
                      <div className="flex items-center justify-between gap-2"><dt className="text-gray-500 dark:text-gray-400">{t("colPlan")}</dt><dd className="font-medium text-gray-900 dark:text-white">{t(PLAN_LABEL_KEY[customer.account.plan] ?? "planLabelFree")}</dd></div>
                      <div className="flex items-center justify-between gap-2"><dt className="text-gray-500 dark:text-gray-400">{t("colWallet")}</dt><dd className="font-medium text-gray-900 dark:text-white">{fmt(customer.account.walletBalance ?? 0)} <span className="text-xs font-normal text-gray-400">{t("walletUnit")}</span></dd></div>
                      {customer.account.phone && <div className="flex items-center justify-between gap-2"><dt className="text-gray-500 dark:text-gray-400">{t("colPhone")}</dt><dd dir="ltr" className="font-mono-signal text-[13px] text-gray-900 dark:text-white">{customer.account.phone}</dd></div>}
                      <div className="flex items-center justify-between gap-2"><dt className="text-gray-500 dark:text-gray-400">{t("colJoined")}</dt><dd className="text-gray-900 dark:text-white"><RelTime iso={customer.account.createdAt} /></dd></div>
                    </>
                  )}
                  <div className="flex items-center justify-between gap-2">
                    <dt className="text-gray-500 dark:text-gray-400">{t("auDevices")}</dt>
                    <dd className="flex items-center gap-2 font-medium text-gray-900 dark:text-white">
                      {fmt(customer.devices.length)}
                      {customer.devices.some((d) => d.isOnline) && <StatusBadge status="online" label={`${fmt(customer.devices.filter((d) => d.isOnline).length)} ${t("amOnlineNow")}`} />}
                    </dd>
                  </div>
                </dl>
                {customer.tickets.length > 0 && (
                  <section className="mt-4 border-t border-gray-100 pt-4 dark:border-gray-800">
                    <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">{t("tkOtherTickets")}</h3>
                    <ul className="space-y-1">
                      {customer.tickets.slice(0, 5).map((x) => (
                        <li key={x.id}>
                          <Link href={`/admin/tickets/${x.id}`} className="-mx-2 flex items-center justify-between gap-2 rounded-lg px-2 py-1.5 transition hover:bg-gray-50 dark:hover:bg-white/[0.03]">
                            <span dir="auto" className="min-w-0 truncate text-sm text-gray-800 dark:text-gray-200">{x.subject}</span>
                            <StatusBadge status={x.status} label={statusLabels[x.status]} />
                          </Link>
                        </li>
                      ))}
                    </ul>
                  </section>
                )}
              </>
            )}
            {u?.email && (
              <Link href={userHref(u.email)} className={`${buttonClass("secondary", "sm")} mt-4 w-full`}>{t("tkOpenProfile")}</Link>
            )}
          </Panel>
        }
      />
      <ConfirmDialog
        open={confirmClose}
        onClose={() => setConfirmClose(false)}
        onConfirm={() => setStatus("closed")}
        busy={busy}
        title={t("tkCloseTitle")}
        confirmLabel={t("closeTicket")}
        cancelLabel={t("cancel")}
      />
    </>
  );
}
