"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import type { ColDef, ICellRendererParams } from "ag-grid-community";
import { Plus, Wallet, Receipt, Trash2, ExternalLink, Clock } from "lucide-react";
import { useT } from "@/i18n/useT";
import { useLanguage } from "@/context/LanguageContext";
import { useWallet } from "@/context/WalletContext";
import { getJson } from "@/lib/getJson";
import DataGrid, { AmountCell, DateCell, StatusCell } from "@/components/dashboard/DataGrid";
import {
  PageHeader, Panel, EmptyState, SkeletonRows, FilterPills, CopyChip, Dialog, ConfirmDialog, Field,
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
  card: { cardNumber: string; bankName: string } | null;
  payment: { trackingCode: string; payableRial: string; statusUrl: string } | null;
};
type Filter = "all" | Deposit["status"];

const MIN_AMOUNT = 10_000;
const QUICK_AMOUNTS = [100_000, 500_000, 1_000_000, 2_000_000];

type Ctx = { isRTL: boolean; unit: string; statusLabels: Record<string, string>; t: ReturnType<typeof useT>; onDelete: (d: Deposit) => void };

function TrackingCell({ data }: ICellRendererParams<Deposit>) {
  const code = data?.interceptionCode || data?.payment?.trackingCode;
  return code ? <CopyChip value={code} /> : <span className="text-gray-400">—</span>;
}

function CardCell({ value }: { value: Deposit["card"] }) {
  if (!value) return <span className="text-gray-400">—</span>;
  return (
    <span className="text-sm text-gray-700 dark:text-gray-200">
      <span dir="ltr" className="font-mono-signal">•••• {value.cardNumber.slice(-4)}</span>
      {value.bankName && <span className="ms-1.5 text-xs text-gray-400">{value.bankName}</span>}
    </span>
  );
}

function NoteCell({ data, context }: ICellRendererParams<Deposit> & { context: Ctx }) {
  if (data?.receiptImage) {
    return <a href={data.receiptImage} target="_blank" rel="noopener noreferrer" className="text-xs font-medium text-brand-600 hover:underline dark:text-brand-400">{context.t("finReceipt")}</a>;
  }
  return data?.adminNote ? <span className="text-xs text-gray-600 dark:text-gray-300">{data.adminNote}</span> : <span className="text-gray-400">—</span>;
}

function ActionsCell({ data, context }: ICellRendererParams<Deposit> & { context: Ctx }) {
  if (!data || data.status === "approved") return null;
  return (
    <div className="flex h-full items-center justify-end gap-1">
      {data.status === "pending" && data.payment?.statusUrl && (
        <a href={data.payment.statusUrl} className={buttonClass("secondary", "sm")}>
          {context.t("finContinuePay")} <ExternalLink className="h-3.5 w-3.5 rtl:-scale-x-100" />
        </a>
      )}
      <button
        type="button"
        onClick={() => context.onDelete(data)}
        aria-label={context.t("delete")}
        title={context.t("delete")}
        className="flex h-8 w-8 items-center justify-center rounded-lg text-gray-400 transition hover:bg-error-50 hover:text-error-600 dark:hover:bg-error-500/10"
      >
        <Trash2 className="h-4 w-4" />
      </button>
    </div>
  );
}

export default function FinancePage() {
  const t = useT();
  const { lang } = useLanguage();
  const isRTL = lang === "fa";
  const fmt = useFormatNumber();
  const { balance } = useWallet();

  const [deposits, setDeposits] = useState<Deposit[] | null>(null);
  const [failed, setFailed] = useState(false);
  const [filter, setFilter] = useState<Filter>("all");

  const load = useCallback(() => getJson<Deposit[]>("/api/user/finance/deposits").then((d) => { setFailed(!d); setDeposits(d ?? []); }), []);
  useEffect(() => { queueMicrotask(load); }, [load]);

  // New top-up
  const [open, setOpen] = useState(false);
  const [amount, setAmount] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const amountNum = Number(amount.replace(/\D/g, "")) || 0;
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (amountNum < MIN_AMOUNT) return toast.error(t("depositAmountMin"));
    setSubmitting(true);
    const res = await fetch("/api/user/finance/deposits", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ amount: amountNum }),
    });
    const data = await res.json().catch(() => ({}));
    if (res.ok && data.statusUrl) {
      // nodepass's hosted page shows the exact amount and receiving card.
      toast.info(t("finOpening"));
      window.location.href = data.statusUrl;
      return;
    }
    setSubmitting(false);
    toast.error(data.error || t("saveError"));
  };

  // Delete (confirmed)
  const [deleting, setDeleting] = useState<Deposit | null>(null);
  const [deleteBusy, setDeleteBusy] = useState(false);
  const confirmDelete = async () => {
    if (!deleting) return;
    setDeleteBusy(true);
    const res = await fetch(`/api/user/finance/deposits/${deleting.id}`, { method: "DELETE" });
    const data = await res.json().catch(() => ({}));
    setDeleteBusy(false);
    if (!res.ok) return toast.error(data.error || t("saveError"));
    toast.success(t("depositDeleted"));
    setDeleting(null);
    load();
  };

  const rows = useMemo(() => (deposits ?? []).filter((d) => filter === "all" || d.status === filter), [deposits, filter]);
  const count = (f: Filter) => (deposits ?? []).filter((d) => f === "all" || d.status === f).length;
  const pendingWithLink = (deposits ?? []).filter((d) => d.status === "pending" && d.payment?.statusUrl).length;
  const hasCards = (deposits ?? []).some((d) => d.card);

  const columns = useMemo<ColDef<Deposit>[]>(() => [
    { field: "amount", headerName: t("finAmount"), width: 160, cellRenderer: AmountCell },
    { field: "status", headerName: t("finStatus"), width: 140, cellRenderer: StatusCell },
    { field: "createdAt", headerName: t("finDate"), width: 140, sort: "desc", cellRenderer: DateCell },
    { colId: "tracking", headerName: t("finTracking"), width: 170, sortable: false, cellRenderer: TrackingCell },
    ...(hasCards ? [{ field: "card" as const, headerName: t("finCard"), width: 170, sortable: false, cellRenderer: CardCell, valueFormatter: () => "" }] : []),
    { colId: "note", headerName: t("finNote"), flex: 1, minWidth: 140, sortable: false, cellRenderer: NoteCell, tooltipField: "adminNote" },
    { colId: "actions", headerName: "", width: 200, pinned: "right", sortable: false, cellRenderer: ActionsCell },
  ], [t, hasCards]);

  const context = useMemo<Ctx>(() => ({
    isRTL,
    unit: t("walletUnit"),
    statusLabels: { pending: t("statusPending"), approved: t("statusApproved"), rejected: t("statusRejected") },
    t,
    onDelete: setDeleting,
  }), [isRTL, t]);

  const openTopUp = () => { setAmount(""); setOpen(true); };

  return (
    <div className="space-y-6">
      <PageHeader title={t("financeTitle")} description={t("financeDesc")} />

      {/* Wallet hero */}
      <section className="relative overflow-hidden rounded-2xl border border-brand-200 bg-gradient-to-br from-brand-500 to-theme-purple-500 p-6 text-white shadow-theme-md dark:border-brand-500/30">
        <div aria-hidden className="pointer-events-none absolute -end-16 -top-16 h-56 w-56 rounded-full bg-white/10 blur-2xl" />
        <div className="relative flex flex-wrap items-end justify-between gap-6">
          <div>
            <p className="flex items-center gap-2 text-sm text-white/80"><Wallet className="h-4 w-4" />{t("walletBalanceLabel")}</p>
            <p className="mt-2 text-4xl font-bold tracking-tight">
              {balance === null ? "—" : fmt(balance)} <span className="text-base font-medium text-white/80">{t("walletUnit")}</span>
            </p>
            <p className="mt-2 max-w-md text-sm text-white/75">{t("newDepositDesc")}</p>
          </div>
          <button type="button" onClick={openTopUp} className="inline-flex items-center gap-2 rounded-xl bg-white px-5 py-2.5 text-sm font-semibold text-brand-700 shadow-theme-sm transition hover:bg-brand-25">
            <Plus className="h-4 w-4" />{t("topUp")}
          </button>
        </div>
      </section>

      {pendingWithLink > 0 && (
        <p role="status" className="flex items-start gap-2 rounded-xl border border-warning-200 bg-warning-50 p-3 text-sm text-warning-800 dark:border-warning-500/20 dark:bg-warning-500/10 dark:text-warning-300">
          <Clock className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
          <span><strong>{fmt(pendingWithLink)}</strong> {t("finPendingBanner")}</span>
        </p>
      )}

      <Panel title={t("deposits")} description={t("depositDesc")} bodyClassName="p-0">
        <div className="border-b border-gray-100 px-5 py-3 dark:border-gray-800">
          <FilterPills<Filter>
            value={filter}
            onChange={setFilter}
            items={[
              { key: "all", label: t("filterAllShort"), count: count("all") },
              { key: "pending", label: t("statusPending"), count: count("pending") },
              { key: "approved", label: t("statusApproved"), count: count("approved") },
              { key: "rejected", label: t("statusRejected"), count: count("rejected") },
            ]}
          />
        </div>
        {deposits === null ? <div className="p-5"><SkeletonRows rows={4} /></div>
          : failed ? <p className="p-5 text-sm text-error-600 dark:text-error-400">{t("ovLoadFailed")}</p>
          : rows.length === 0 ? (
            <EmptyState
              icon={<Receipt className="h-6 w-6" />}
              title={t("noDeposits")}
              action={filter === "all" && <button type="button" onClick={openTopUp} className={buttonClass("primary", "sm")}><Plus className="h-4 w-4" />{t("topUp")}</button>}
            />
          ) : <DataGrid rows={rows} columns={columns} context={context} />}
      </Panel>

      {/* Top-up dialog */}
      <Dialog open={open} onClose={() => !submitting && setOpen(false)} title={t("newDeposit")} description={t("newDepositDesc")}>
        <form onSubmit={submit} className="space-y-4">
          <Field label={t("depositAmount")} hint={t("finMinHint")} htmlFor="dep-amount">
            <input
              id="dep-amount"
              autoFocus
              inputMode="numeric"
              dir="ltr"
              value={amountNum ? amountNum.toLocaleString("en-US") : ""}
              onChange={(e) => setAmount(e.target.value)}
              placeholder={t("depositAmountPlaceholder")}
              className={cn(inputClass, "font-mono-signal text-base")}
            />
          </Field>
          <div>
            <p className="mb-2 text-xs text-gray-500 dark:text-gray-400">{t("finQuick")}</p>
            <div className="flex flex-wrap gap-2">
              {QUICK_AMOUNTS.map((a) => (
                <button
                  key={a}
                  type="button"
                  onClick={() => setAmount(String(a))}
                  className={cn(
                    "rounded-lg border px-3 py-1.5 text-xs font-semibold transition",
                    amountNum === a ? "border-brand-500 bg-brand-50 text-brand-700 dark:bg-brand-500/10 dark:text-brand-300" : "border-gray-200 text-gray-600 hover:border-gray-300 dark:border-gray-700 dark:text-gray-300",
                  )}
                >
                  {fmt(a)}
                </button>
              ))}
            </div>
          </div>
          {amountNum >= MIN_AMOUNT && (
            <p className="rounded-xl bg-gray-50 p-3 text-sm text-gray-600 dark:bg-white/[0.03] dark:text-gray-300">
              {t("finYouPay")}: <strong className="text-gray-900 dark:text-white">{fmt(amountNum)} {t("walletUnit")}</strong>
            </p>
          )}
          <p className="text-xs text-gray-500 dark:text-gray-400">{t("depositNodepassHint")}</p>
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={() => setOpen(false)} disabled={submitting} className={buttonClass("secondary")}>{t("cancel")}</button>
            <button type="submit" disabled={submitting || amountNum < MIN_AMOUNT} className={buttonClass("primary")}>{submitting ? t("finOpening") : t("submitDeposit")}</button>
          </div>
        </form>
      </Dialog>

      <ConfirmDialog
        open={!!deleting}
        onClose={() => setDeleting(null)}
        onConfirm={confirmDelete}
        busy={deleteBusy}
        title={t("finDeleteTitle")}
        subject={deleting && <>{fmt(deleting.amount)} {t("walletUnit")}</>}
        warning={t("finDeleteWarn")}
        confirmLabel={t("delete")}
        cancelLabel={t("cancel")}
      />
    </div>
  );
}
