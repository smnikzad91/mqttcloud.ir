"use client";

import Link from "next/link";
import Image from "next/image";
import { useCallback, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { toast } from "sonner";
import { useT } from "@/i18n/useT";
import { useLanguage } from "@/context/LanguageContext";
import { getJson } from "@/lib/getJson";
import TicketThread, { type TicketData } from "@/components/dashboard/TicketThread";
import { ConfirmDialog, EmptyState, Panel, SkeletonRows, buttonClass } from "@/components/dashboard/ui";

type TicketUser = { firstName?: string; lastName?: string; email?: string; avatar?: string } | null;
type AdminTicket = TicketData & { userId: TicketUser };

export default function AdminTicketDetailPage() {
  const t = useT();
  const { lang } = useLanguage();
  const { id } = useParams<{ id: string }>();
  const [ticket, setTicket] = useState<AdminTicket | null | undefined>(undefined);
  const [confirmClose, setConfirmClose] = useState(false);
  const [busy, setBusy] = useState(false);

  const load = useCallback(() => getJson<AdminTicket>(`/api/admin/tickets/${id}`).then((d) => setTicket(d?._id ? d : null)), [id]);
  useEffect(() => { queueMicrotask(load); }, [load]);

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
            <dl className="mt-4 space-y-2 text-sm">
              <div className="flex justify-between gap-2"><dt className="text-gray-500 dark:text-gray-400">{t("ticketReplyCount")}</dt><dd className="font-medium text-gray-900 dark:text-white">{ticket.replies.length.toLocaleString(lang === "fa" ? "fa-IR" : "en-US")}</dd></div>
            </dl>
            {u?.email && (
              <Link href={`/admin/users`} className="mt-4 inline-block text-sm font-medium text-brand-600 hover:underline dark:text-brand-400">{t("navUsers")}</Link>
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
