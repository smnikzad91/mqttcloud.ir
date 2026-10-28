"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { toast } from "sonner";
import { useT } from "@/i18n/useT";
import { getJson } from "@/lib/getJson";
import TicketThread, { type TicketData } from "@/components/dashboard/TicketThread";
import { ConfirmDialog, EmptyState, SkeletonRows, buttonClass } from "@/components/dashboard/ui";

export default function TicketDetailPage() {
  const t = useT();
  const { id } = useParams<{ id: string }>();
  const [ticket, setTicket] = useState<TicketData | null | undefined>(undefined);
  const [confirmClose, setConfirmClose] = useState(false);
  const [closing, setClosing] = useState(false);

  const load = useCallback(() => getJson<TicketData>(`/api/user/tickets/${id}`).then((d) => setTicket(d?._id ? d : null)), [id]);
  useEffect(() => { queueMicrotask(load); }, [load]);

  const reply = async (message: string, images: string[]) => {
    const res = await fetch(`/api/user/tickets/${id}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ message, images }) });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) { toast.error(data.error || t("saveError")); return false; }
    toast.success(t("replySent"));
    load();
    return true;
  };

  const close = async () => {
    setClosing(true);
    const res = await fetch(`/api/user/tickets/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status: "closed" }) });
    setClosing(false);
    if (!res.ok) return toast.error(t("saveError"));
    toast.success(t("ticketClosed"));
    setConfirmClose(false);
    load();
  };

  if (ticket === undefined) return <SkeletonRows rows={6} />;
  if (ticket === null) {
    return <EmptyState title={t("notFound")} action={<Link href="/dashboard/support" className={buttonClass("secondary", "sm")}>{t("backToTickets")}</Link>} />;
  }

  return (
    <>
      <TicketThread
        ticket={ticket}
        viewer="user"
        backHref="/dashboard/support"
        onReply={reply}
        headerActions={ticket.status !== "closed" && (
          <button type="button" onClick={() => setConfirmClose(true)} className={buttonClass("secondary", "sm")}>{t("closeTicket")}</button>
        )}
      />
      <ConfirmDialog
        open={confirmClose}
        onClose={() => setConfirmClose(false)}
        onConfirm={close}
        busy={closing}
        title={t("tkCloseTitle")}
        warning={t("tkCloseDesc")}
        confirmLabel={t("closeTicket")}
        cancelLabel={t("cancel")}
      />
    </>
  );
}
