"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import type { ColDef, ICellRendererParams } from "ag-grid-community";
import { Search, Check, X, Trash2, Receipt, Clock, BadgeCheck, Ban } from "lucide-react";
import { useT } from "@/i18n/useT";
import { useLanguage } from "@/context/LanguageContext";
import { getJson } from "@/lib/getJson";
import DataGrid, { AmountCell, DateTimeCell, StatusCell } from "@/components/dashboard/DataGrid";
import {
  PageHeader, Panel, StatTile, EmptyState, SkeletonRows, FilterPills, CopyChip, Dialog, ConfirmDialog, Field,
  inputClass, buttonClass, cn, useFormatNumber,
} from "@/components/dashboard/ui";

type Deposit = {
  id: string;
  amount: number;
  receiptImage: string;
  status: "pending" | "approved" | "rejected";
  adminNote: string;
  interceptionCode: string;
  createdAt: string;
  user: { name: string; email: string } | null;
  card: { cardNumber: string; bankName: string } | null;
  payment: { trackingCode: string; payableRial: string; statusUrl: string } | null;
};
type Filter = "all" | Deposit["status"];

type Ctx = {
  isRTL: boolean;
  unit: string;
  t: ReturnType<typeof useT>;
  neverLabel: string;
  statusLabels: Record<string, string>;
  busyId: string | null;
  onApprove: (d: Deposit) => void;
  onReject: (d: Deposit) => void;
  onDelete: (d: Deposit) => void;
};

function UserCell({ value }: { value: Deposit["user"] }) {
  if (!value) return <span className="text-gray-400">—</span>;
  return (
    <div className="flex h-full flex-col justify-center leading-tight">
      <span className="truncate text-sm text-gray-900 dark:text-white">{value.name || "—"}</span>
      <span dir="ltr" className="truncate text-start text-xs text-gray-500 dark:text-gray-400">{value.email}</span>
    </div>
  );
}

function TrackingCell({ data }: ICellRendererParams<Deposit>) {
  const code = data?.interceptionCode || data?.payment?.trackingCode;
  return <div className="flex h-full items-center">{code ? <CopyChip value={code} /> : <span className="text-gray-400">—</span>}</div>;
}

function NoteCell({ data, context }: ICellRendererParams<Deposit> & { context: Ctx }) {
  if (!data) return null;
  if (data.receiptImage) return <a href={data.receiptImage} target="_blank" rel="noopener noreferrer" className="text-xs font-medium text-brand-600 hover:underline dark:text-brand-400">{context.t("finReceipt")}</a>;
  if (data.adminNote) return <span className="text-xs text-gray-600 dark:text-gray-300">{data.adminNote}</span>;
  return data.payment ? <span className="text-xs text-gray-400">nodepass</span> : <span className="text-gray-400">—</span>;
}

function ActionsCell({ data, context }: ICellRendererParams<Deposit> & { context: Ctx }) {
  if (!data) return null;
  const busy = context.busyId === data.id;
  // Mirrors what the API allows and keeps money moves to pending rows only:
  // approve/reject pending, delete rejected.
  if (data.status === "pending") {
    return (
      <div className="flex h-full items-center justify-end gap-1.5">
        <button type="button" disabled={busy} onClick={() => context.onApprove(data)} className={cn(buttonClass("primary", "sm"), "!bg-success-600 hover:!bg-success-700")}>
          <Check className="h-3.5 w-3.5" />{context.t("approve")}
        </button>
        <button type="button" disabled={busy} onClick={() => context.onReject(data)} className={buttonClass("secondary", "sm")}>
          <X className="h-3.5 w-3.5" />{context.t("reject")}
        </button>
      </div>
    );
  }
  if (data.status === "rejected") {
    return (
      <div className="flex h-full items-center justify-end">
        <button type="button" disabled={busy} onClick={() => context.onDelete(data)} aria-label={context.t("delete")} title={context.t("delete")} className="flex h-8 w-8 items-center justify-center rounded-lg text-gray-400 transition hover:bg-error-50 hover:text-error-600 dark:hover:bg-error-500/10">
          <Trash2 className="h-4 w-4" />
        </button>
      </div>
    );
  }
  return null;
}

export default function AdminFinancePage() {
  const t = useT();
  const { lang } = useLanguage();
  const isRTL = lang === "fa";
  const fmt = useFormatNumber();

  const [deposits, setDeposits] = useState<Deposit[] | null>(null);
  const [failed, setFailed] = useState(false);
  // The approval queue is the default view.
  const [filter, setFilter] = useState<Filter>("pending");
  const [query, setQuery] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(() => getJson<Deposit[]>("/api/admin/finance/deposits").then((d) => { setFailed(!d); setDeposits(d ?? []); }), []);
  useEffect(() => { queueMicrotask(load); }, [load]);

  const patch = async (d: Deposit, body: { status: "approved" | "rejected"; adminNote?: string }) => {
    setBusyId(d.id);
    const res = await fetch(`/api/admin/finance/deposits/${d.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    const data = await res.json().catch(() => ({}));
    setBusyId(null);
    if (!res.ok) { toast.error(data.error || t("saveError")); return false; }
    toast.success(body.status === "approved" ? t("depositApproved") : t("depositRejected"));
    load();
    return true;
  };

  const [approving, setApproving] = useState<Deposit | null>(null);
  const [rejecting, setRejecting] = useState<Deposit | null>(null);
  const [rejectNote, setRejectNote] = useState("");
  const [deleting, setDeleting] = useState<Deposit | null>(null);

  const confirmApprove = async () => { if (approving && (await patch(approving, { status: "approved" }))) setApproving(null); };
  const confirmReject = async (e: React.FormEvent) => { e.preventDefault(); if (rejecting && (await patch(rejecting, { status: "rejected", adminNote: rejectNote }))) setRejecting(null); };
  const confirmDelete = async () => {
    if (!deleting) return;
    setBusyId(deleting.id);
    const res = await fetch(`/api/admin/finance/deposits/${deleting.id}`, { method: "DELETE" });
    const data = await res.json().catch(() => ({}));
    setBusyId(null);
    if (!res.ok) return toast.error(data.error || t("saveError"));
    toast.success(t("depositDeleted"));
    setDeleting(null);
    load();
  };

  const q = query.trim().toLowerCase();
  const rows = useMemo(() => (deposits ?? []).filter((d) =>
    (filter === "all" || d.status === filter) &&
    (!q || (d.user?.name ?? "").toLowerCase().includes(q) || (d.user?.email ?? "").toLowerCase().includes(q) ||
      (d.interceptionCode ?? "").toLowerCase().includes(q) || (d.payment?.trackingCode ?? "").toLowerCase().includes(q))), [deposits, filter, q]);
  const count = (f: Filter) => (deposits ?? []).filter((d) => f === "all" || d.status === f).length;
  const sum = (s: Deposit["status"]) => (deposits ?? []).filter((d) => d.status === s).reduce((a, d) => a + d.amount, 0);

  const columns = useMemo<ColDef<Deposit>[]>(() => [
    { field: "user", headerName: t("colUser"), flex: 1.4, minWidth: 200, sortable: false, cellRenderer: UserCell },
    { field: "amount", headerName: t("finAmount"), width: 150, cellRenderer: AmountCell },
    { field: "status", headerName: t("finStatus"), width: 130, cellRenderer: StatusCell },
    { field: "createdAt", headerName: t("finDate"), width: 170, sort: "desc", cellRenderer: DateTimeCell },
    { colId: "tracking", headerName: t("finTracking"), width: 170, sortable: false, cellRenderer: TrackingCell },
    { colId: "note", headerName: t("finNote"), flex: 1, minWidth: 140, sortable: false, cellRenderer: NoteCell, tooltipField: "adminNote" },
    { colId: "actions", headerName: "", width: 200, sortable: false, cellRenderer: ActionsCell },
  ], [t]);
  const context = useMemo<Ctx>(() => ({
    isRTL, unit: t("walletUnit"), t, neverLabel: "—", busyId,
    statusLabels: { pending: t("statusPending"), approved: t("statusApproved"), rejected: t("statusRejected") },
    onApprove: setApproving,
    onReject: (d) => { setRejectNote(""); setRejecting(d); },
    onDelete: setDeleting,
  }), [isRTL, t, busyId]);

  const subject = (d: Deposit | null) => d && <>{fmt(d.amount)} {t("walletUnit")} · {d.user?.name || d.user?.email}</>;

  return (
    <div className="space-y-6">
      <PageHeader title={t("adminFinanceTitle")} description={t("afDesc")} />

      <div className="grid gap-4 sm:grid-cols-3">
        <StatTile icon={<Clock className="h-5 w-5" />} label={t("statusPending")} value={deposits ? fmt(count("pending")) : "…"} hint={deposits && <>{fmt(sum("pending"))} {t("walletUnit")} {t("afPendingSum")}</>} />
        <StatTile icon={<BadgeCheck className="h-5 w-5" />} label={t("afApprovedSum")} value={deposits ? <>{fmt(sum("approved"))} <span className="text-sm font-medium text-gray-500">{t("walletUnit")}</span></> : "…"} hint={deposits && <>{fmt(count("approved"))} × {t("statusApproved")}</>} />
        <StatTile icon={<Ban className="h-5 w-5" />} label={t("afRejectedCount")} value={deposits ? fmt(count("rejected")) : "…"} />
      </div>

      <Panel bodyClassName="p-0">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-100 px-5 py-4 dark:border-gray-800">
          <FilterPills<Filter>
            value={filter}
            onChange={setFilter}
            items={[
              { key: "pending", label: t("statusPending"), count: count("pending") },
              { key: "approved", label: t("statusApproved"), count: count("approved") },
              { key: "rejected", label: t("statusRejected"), count: count("rejected") },
              { key: "all", label: t("filterAllShort"), count: count("all") },
            ]}
          />
          <div className="relative w-full sm:w-72">
            <Search className="pointer-events-none absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" aria-hidden />
            <input type="search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder={t("afSearch")} aria-label={t("afSearch")} className={cn(inputClass, "h-9 ps-9")} />
          </div>
        </div>
        {deposits === null ? <div className="p-5"><SkeletonRows rows={5} /></div>
          : failed ? <p className="p-5 text-sm text-error-600 dark:text-error-400">{t("ovLoadFailed")}</p>
          : rows.length === 0 ? <EmptyState icon={<Receipt className="h-6 w-6" />} title={filter === "pending" ? t("aovQueueEmpty") : t("noDeposits")} />
          : <DataGrid rows={rows} columns={columns} context={context} rowHeight={60} />}
      </Panel>

      <ConfirmDialog
        open={!!approving}
        onClose={() => setApproving(null)}
        onConfirm={confirmApprove}
        busy={!!approving && busyId === approving.id}
        title={t("afApproveTitle")}
        subject={subject(approving)}
        warning={<>{t("afApproveWarn")}{approving?.payment && <><br />{t("afNodepassNote")}</>}</>}
        confirmLabel={t("approve")}
        cancelLabel={t("cancel")}
      />

      <Dialog open={!!rejecting} onClose={() => !busyId && setRejecting(null)} title={t("rejectDeposit")} description={subject(rejecting)}>
        <form onSubmit={confirmReject} className="space-y-4">
          <Field label={t("afRejectNote")} hint={t("rejectDepositDesc")} htmlFor="rej-note">
            <textarea id="rej-note" dir="auto" rows={3} autoFocus value={rejectNote} onChange={(e) => setRejectNote(e.target.value)} placeholder={t("adminNotePlaceholder")} className={cn(inputClass, "h-auto py-3")} />
          </Field>
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={() => setRejecting(null)} disabled={!!busyId} className={buttonClass("secondary")}>{t("cancel")}</button>
            <button type="submit" disabled={!!busyId} className={buttonClass("danger")}>{t("reject")}</button>
          </div>
        </form>
      </Dialog>

      <ConfirmDialog
        open={!!deleting}
        onClose={() => setDeleting(null)}
        onConfirm={confirmDelete}
        busy={!!deleting && busyId === deleting.id}
        title={t("finDeleteTitle")}
        subject={subject(deleting)}
        confirmLabel={t("delete")}
        cancelLabel={t("cancel")}
      />
    </div>
  );
}
