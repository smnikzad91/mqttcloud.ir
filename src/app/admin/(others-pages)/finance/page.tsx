"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import type { ColDef, ICellRendererParams } from "ag-grid-community";
import { Search, Check, X, Trash2, Receipt, Clock, BadgeCheck, Ban, ExternalLink, ArrowRight } from "lucide-react";
import { useT } from "@/i18n/useT";
import { useLanguage } from "@/context/LanguageContext";
import { getJson } from "@/lib/getJson";
import DataGrid, { AmountCell, StatusCell } from "@/components/dashboard/DataGrid";
import { OwnerCell, RelativeCell, AgeCell, AgeBadge, RelTime, userHref, readParam, fromControl } from "@/components/admin/AdminParts";
import {
  PageHeader, Panel, StatTile, StatusBadge, EmptyState, SkeletonRows, FilterPills, CopyChip, ConfirmDialog, Drawer, Field,
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
  payment: { trackingCode: string; payableRial: string } | null;
};
type Filter = "all" | Deposit["status"];
type Wallets = Record<string, number>;

type Ctx = {
  isRTL: boolean;
  unit: string;
  t: ReturnType<typeof useT>;
  statusLabels: Record<string, string>;
  onReview: (d: Deposit) => void;
  onDelete: (d: Deposit) => void;
};

function TrackingCell({ data }: ICellRendererParams<Deposit>) {
  const code = data?.interceptionCode || data?.payment?.trackingCode;
  return <div className="flex h-full items-center">{code ? <CopyChip value={code} /> : <span className="text-gray-400">—</span>}</div>;
}

function MethodCell({ data, context }: ICellRendererParams<Deposit> & { context: Ctx }) {
  if (!data) return null;
  return <span className="text-xs text-gray-600 dark:text-gray-300">{data.payment ? context.t("frMethodNodepass") : context.t("frMethodReceipt")}</span>;
}

function WhenCell(p: ICellRendererParams<Deposit> & { context: Ctx }) {
  if (!p.data) return null;
  return p.data.status === "pending" ? <AgeCell value={p.data.createdAt} /> : <RelativeCell value={p.data.createdAt} context={{}} />;
}

function ActionsCell({ data, context }: ICellRendererParams<Deposit> & { context: Ctx }) {
  if (!data) return null;
  // Money only moves from the review drawer, where the receipt is visible.
  if (data.status === "pending") {
    return (
      <div className="flex h-full items-center justify-end">
        <button type="button" onClick={() => context.onReview(data)} className={buttonClass("primary", "sm")}>{context.t("aovReview")}</button>
      </div>
    );
  }
  if (data.status === "rejected") {
    return (
      <div className="flex h-full items-center justify-end">
        <button type="button" onClick={() => context.onDelete(data)} aria-label={context.t("delete")} title={context.t("delete")} className="flex h-8 w-8 items-center justify-center rounded-lg text-gray-400 transition hover:bg-error-50 hover:text-error-600 dark:hover:bg-error-500/10">
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

  const load = useCallback(() => getJson<Deposit[]>("/api/admin/finance/deposits").then((d) => { setFailed(!d); setDeposits(d ?? []); }), []);
  useEffect(() => { queueMicrotask(load); }, [load]);

  // ── Review drawer ───────────────────────────────────────────────────────
  const [reviewId, setReviewId] = useState<string | null>(null);
  const [mode, setMode] = useState<"idle" | "approve" | "reject">("idle");
  const [rejectNote, setRejectNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [wallets, setWallets] = useState<Wallets | null>(null);
  const review = useMemo(() => deposits?.find((d) => d.id === reviewId) ?? null, [deposits, reviewId]);

  const openReview = useCallback((d: Deposit) => {
    setReviewId(d.id);
    setMode("idle");
    setRejectNote("");
    if (!wallets) {
      getJson<{ email: string; walletBalance: number }[]>("/api/admin/users").then((u) =>
        setWallets(Object.fromEntries((u ?? []).map((x) => [x.email, x.walletBalance ?? 0]))));
    }
  }, [wallets]);
  const closeReview = useCallback(() => { if (!busy) setReviewId(null); }, [busy]);

  // /admin/finance?review=<id> (from the overview queue) opens that deposit.
  useEffect(() => {
    const id = readParam("review");
    if (!id || !deposits) return;
    const d = deposits.find((x) => x.id === id);
    if (d) queueMicrotask(() => { if (d.status !== "pending") setFilter("all"); openReview(d); });
    window.history.replaceState(null, "", "/admin/finance");
  }, [deposits]); // eslint-disable-line react-hooks/exhaustive-deps

  // Oldest first: that's the order a queue should be worked in.
  const queue = useMemo(() => (deposits ?? []).filter((d) => d.status === "pending").sort((a, b) => a.createdAt.localeCompare(b.createdAt)), [deposits]);

  const decide = async (body: { status: "approved" | "rejected"; adminNote?: string }) => {
    if (!review) return;
    setBusy(true);
    const res = await fetch(`/api/admin/finance/deposits/${review.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    const data = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) { toast.error(data.error || t("saveError")); load(); return; }
    toast.success(body.status === "approved" ? t("depositApproved") : t("depositRejected"));
    if (body.status === "approved" && review.user && wallets) setWallets({ ...wallets, [review.user.email]: (wallets[review.user.email] ?? 0) + review.amount });
    // Move straight on to the next deposit waiting in the queue.
    const next = queue.find((d) => d.id !== review.id);
    if (next) { setReviewId(next.id); setMode("idle"); setRejectNote(""); }
    else { setReviewId(null); toast.success(t("frQueueDone")); }
    load();
  };

  // ── Delete (rejected only) ──────────────────────────────────────────────
  const [deleting, setDeleting] = useState<Deposit | null>(null);
  const confirmDelete = async () => {
    if (!deleting) return;
    setBusy(true);
    const res = await fetch(`/api/admin/finance/deposits/${deleting.id}`, { method: "DELETE" });
    const data = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) return toast.error(data.error || t("saveError"));
    toast.success(t("depositDeleted"));
    setDeleting(null);
    setReviewId(null);
    load();
  };

  const q = query.trim().toLowerCase();
  const rows = useMemo(() => {
    const list = (deposits ?? []).filter((d) =>
      (filter === "all" || d.status === filter) &&
      (!q || (d.user?.name ?? "").toLowerCase().includes(q) || (d.user?.email ?? "").toLowerCase().includes(q) ||
        (d.interceptionCode ?? "").toLowerCase().includes(q) || (d.payment?.trackingCode ?? "").toLowerCase().includes(q)));
    return filter === "pending" ? list.sort((a, b) => a.createdAt.localeCompare(b.createdAt)) : list;
  }, [deposits, filter, q]);
  const count = (f: Filter) => (deposits ?? []).filter((d) => f === "all" || d.status === f).length;
  const sum = (s: Deposit["status"]) => (deposits ?? []).filter((d) => d.status === s).reduce((a, d) => a + d.amount, 0);

  const columns = useMemo<ColDef<Deposit>[]>(() => [
    { field: "user", headerName: t("colUser"), flex: 1.4, minWidth: 200, sortable: false, cellRenderer: OwnerCell },
    { field: "amount", headerName: t("finAmount"), width: 150, cellRenderer: AmountCell },
    { field: "status", headerName: t("finStatus"), width: 130, cellRenderer: StatusCell },
    { field: "createdAt", headerName: filter === "pending" ? t("frWaiting") : t("finDate"), width: 150, cellRenderer: WhenCell },
    { colId: "method", headerName: t("frMethod"), width: 130, sortable: false, cellRenderer: MethodCell },
    { colId: "tracking", headerName: t("finTracking"), flex: 1, minWidth: 160, sortable: false, cellRenderer: TrackingCell },
    { colId: "actions", headerName: "", width: 110, pinned: "right", sortable: false, cellRenderer: ActionsCell },
  ], [t, filter]);
  const context = useMemo<Ctx>(() => ({
    isRTL, unit: t("walletUnit"), t,
    statusLabels: { pending: t("statusPending"), approved: t("statusApproved"), rejected: t("statusRejected") },
    onReview: openReview,
    onDelete: setDeleting,
  }), [isRTL, t, openReview]);

  const oldest = queue[0];

  return (
    <div className="space-y-6">
      <PageHeader title={t("adminFinanceTitle")} description={t("afDesc")} actions={queue.length > 0 && (
        <button type="button" onClick={() => openReview(queue[0])} className={buttonClass("primary")}>{t("frStartReview")}<ArrowRight className="h-4 w-4 rtl:-scale-x-100" /></button>
      )} />

      <div className="grid gap-4 sm:grid-cols-3">
        <StatTile icon={<Clock className="h-5 w-5" />} label={t("statusPending")} value={deposits ? fmt(queue.length) : "…"} hint={deposits && (oldest ? <>{fmt(sum("pending"))} {t("walletUnit")} · {t("frOldest")} <RelTime iso={oldest.createdAt} /></> : t("aovQueueEmpty"))} />
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
          : <DataGrid rows={rows} columns={columns} context={context} rowHeight={60} rowClass="cursor-pointer" onRowClicked={(e) => e.data && !fromControl(e.event) && openReview(e.data)} />}
      </Panel>

      <Drawer
        open={!!review}
        onClose={closeReview}
        title={t("frReviewTitle")}
        footer={review && <ReviewFooter deposit={review} mode={mode} setMode={setMode} busy={busy} rejectNote={rejectNote} onApprove={() => decide({ status: "approved" })} onReject={() => decide({ status: "rejected", adminNote: rejectNote })} onDelete={() => setDeleting(review)} />}
      >
        {review && (
          <ReviewBody
            deposit={review}
            wallet={review.user && wallets ? wallets[review.user.email] : undefined}
            history={(deposits ?? []).filter((d) => d.id !== review.id && !!review.user && d.user?.email === review.user.email)}
            queueLeft={queue.filter((d) => d.id !== review.id).length}
            mode={mode}
            rejectNote={rejectNote}
            setRejectNote={setRejectNote}
          />
        )}
      </Drawer>

      <ConfirmDialog
        open={!!deleting}
        onClose={() => setDeleting(null)}
        onConfirm={confirmDelete}
        busy={busy}
        title={t("finDeleteTitle")}
        subject={deleting && <>{fmt(deleting.amount)} {t("walletUnit")} · {deleting.user?.name || deleting.user?.email}</>}
        confirmLabel={t("delete")}
        cancelLabel={t("cancel")}
      />
    </div>
  );
}

function ReviewBody({ deposit: d, wallet, history, queueLeft, mode, rejectNote, setRejectNote }: {
  deposit: Deposit; wallet: number | undefined; history: Deposit[]; queueLeft: number;
  mode: "idle" | "approve" | "reject"; rejectNote: string; setRejectNote: (s: string) => void;
}) {
  const t = useT();
  const fmt = useFormatNumber();
  const statusLabel = d.status === "pending" ? t("statusPending") : d.status === "approved" ? t("statusApproved") : t("statusRejected");
  const code = d.interceptionCode || d.payment?.trackingCode;
  const approved = history.filter((h) => h.status === "approved").length;
  const rejected = history.filter((h) => h.status === "rejected").length;
  const row = "flex items-center justify-between gap-3 py-2.5";
  const dt = "text-sm text-gray-500 dark:text-gray-400";

  return (
    <div className="space-y-6">
      {/* Headline: amount, state, age */}
      <div>
        <div className="flex flex-wrap items-center gap-2">
          <StatusBadge status={d.status} label={statusLabel} />
          {d.status === "pending" ? <AgeBadge iso={d.createdAt} /> : <RelTime iso={d.createdAt} className="text-xs text-gray-500 dark:text-gray-400" />}
          {d.status === "pending" && queueLeft > 0 && <span className="ms-auto text-xs text-gray-500 dark:text-gray-400">{t("frQueueLeft").replace("{n}", fmt(queueLeft))}</span>}
        </div>
        <p className="mt-3 text-3xl font-bold tracking-tight text-gray-900 dark:text-white">{fmt(d.amount)} <span className="text-base font-medium text-gray-500 dark:text-gray-400">{t("walletUnit")}</span></p>
      </div>

      {/* Who */}
      {d.user && (
        <section className="rounded-xl border border-gray-200 p-4 dark:border-gray-800">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="truncate font-medium text-gray-900 dark:text-white">{d.user.name || "—"}</p>
              <p dir="ltr" className="truncate text-start text-sm text-gray-500 dark:text-gray-400">{d.user.email}</p>
            </div>
            <Link href={userHref(d.user.email)} className="shrink-0 text-sm font-medium text-brand-600 hover:underline dark:text-brand-400">{t("auOpenProfile")}</Link>
          </div>
          <dl className="mt-3 grid grid-cols-2 gap-3 border-t border-gray-100 pt-3 text-sm dark:border-gray-800">
            <div>
              <dt className="text-xs text-gray-500 dark:text-gray-400">{t("frWalletNow")}</dt>
              <dd className="mt-0.5 font-semibold text-gray-900 dark:text-white">{wallet === undefined ? "…" : <>{fmt(wallet)} {t("walletUnit")}</>}</dd>
            </div>
            {d.status === "pending" && (
              <div>
                <dt className="text-xs text-gray-500 dark:text-gray-400">{t("frWalletAfter")}</dt>
                <dd className="mt-0.5 font-semibold text-success-700 dark:text-success-400">{wallet === undefined ? "…" : <>{fmt(wallet + d.amount)} {t("walletUnit")}</>}</dd>
              </div>
            )}
          </dl>
          <p className="mt-3 text-xs text-gray-500 dark:text-gray-400">
            {history.length === 0 ? t("frFirstTopUp") : t("frHistory").replace("{n}", fmt(history.length)).replace("{a}", fmt(approved)).replace("{r}", fmt(rejected))}
          </p>
        </section>
      )}

      {/* Payment details */}
      <dl className="divide-y divide-gray-100 dark:divide-gray-800">
        <div className={row}><dt className={dt}>{t("frMethod")}</dt><dd className="text-sm font-medium text-gray-900 dark:text-white">{d.payment ? t("frMethodNodepass") : t("frMethodReceipt")}</dd></div>
        {d.card && <div className={row}><dt className={dt}>{t("finCard")}</dt><dd className="flex items-center gap-2">{d.card.bankName && <span className="text-xs text-gray-500 dark:text-gray-400">{d.card.bankName}</span>}<CopyChip value={d.card.cardNumber} /></dd></div>}
        {code && <div className={row}><dt className={dt}>{t("finTracking")}</dt><dd><CopyChip value={code} /></dd></div>}
        {d.payment?.payableRial && <div className={row}><dt className={dt}>{t("frPayable")}</dt><dd dir="ltr" className="font-mono-signal text-sm text-gray-900 dark:text-white">{Number(d.payment.payableRial).toLocaleString("en-US")}</dd></div>}
        {d.adminNote && <div className="py-2.5"><dt className={dt}>{t("finNote")}</dt><dd dir="auto" className="mt-1 text-sm text-gray-800 dark:text-gray-200">{d.adminNote}</dd></div>}
      </dl>
      {d.payment && d.status === "pending" && <p className="rounded-xl bg-blue-light-50 p-3 text-xs text-blue-light-800 dark:bg-blue-light-500/10 dark:text-blue-light-300">{t("afNodepassNote")}</p>}

      {/* Receipt */}
      {d.receiptImage ? (
        <section>
          <div className="mb-2 flex items-center justify-between">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">{t("finReceipt")}</h3>
            <a href={d.receiptImage} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-xs font-medium text-brand-600 hover:underline dark:text-brand-400">{t("frOpenFull")}<ExternalLink className="h-3 w-3" /></a>
          </div>
          <a href={d.receiptImage} target="_blank" rel="noopener noreferrer" className="block overflow-hidden rounded-xl border border-gray-200 bg-gray-50 dark:border-gray-800 dark:bg-white/[0.03]">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={d.receiptImage} alt={t("finReceipt")} className="max-h-96 w-full object-contain" />
          </a>
        </section>
      ) : !d.payment && <p className="text-sm text-gray-400">{t("frNoReceipt")}</p>}

      {mode === "reject" && (
        <Field label={t("afRejectNote")} hint={t("rejectDepositDesc")} htmlFor="rej-note">
          <textarea id="rej-note" dir="auto" rows={3} autoFocus value={rejectNote} onChange={(e) => setRejectNote(e.target.value)} placeholder={t("adminNotePlaceholder")} className={cn(inputClass, "h-auto py-3")} />
        </Field>
      )}
      {mode === "approve" && <p className="rounded-xl border border-success-200 bg-success-50/60 p-3 text-sm text-gray-700 dark:border-success-500/20 dark:bg-success-500/5 dark:text-gray-200">{t("afApproveWarn")}</p>}
    </div>
  );
}

function ReviewFooter({ deposit: d, mode, setMode, busy, rejectNote, onApprove, onReject, onDelete }: {
  deposit: Deposit; mode: "idle" | "approve" | "reject"; setMode: (m: "idle" | "approve" | "reject") => void; busy: boolean; rejectNote: string;
  onApprove: () => void; onReject: () => void; onDelete: () => void;
}) {
  const t = useT();
  const fmt = useFormatNumber();
  if (d.status === "rejected") return <button type="button" onClick={onDelete} className={buttonClass("secondary", "sm")}><Trash2 className="h-4 w-4" />{t("delete")}</button>;
  if (d.status !== "pending") return null;
  // Two steps for both decisions: pick, then confirm (approving credits real money).
  if (mode === "approve") {
    return (
      <>
        <button type="button" onClick={() => setMode("idle")} disabled={busy} className={buttonClass("secondary")}>{t("cancel")}</button>
        <button type="button" onClick={onApprove} disabled={busy} className={cn(buttonClass("primary"), "!bg-success-600 hover:!bg-success-700")}>
          <Check className="h-4 w-4" />{busy ? "…" : t("frConfirmApprove").replace("{amount}", `${fmt(d.amount)} ${t("walletUnit")}`)}
        </button>
      </>
    );
  }
  if (mode === "reject") {
    return (
      <>
        <button type="button" onClick={() => setMode("idle")} disabled={busy} className={buttonClass("secondary")}>{t("cancel")}</button>
        <button type="button" onClick={onReject} disabled={busy || !rejectNote.trim()} className={buttonClass("danger")}><X className="h-4 w-4" />{busy ? "…" : t("reject")}</button>
      </>
    );
  }
  return (
    <>
      <button type="button" onClick={() => setMode("reject")} className={buttonClass("secondary")}><X className="h-4 w-4" />{t("reject")}</button>
      <button type="button" onClick={() => setMode("approve")} className={cn(buttonClass("primary"), "!bg-success-600 hover:!bg-success-700")}><Check className="h-4 w-4" />{t("approve")}</button>
    </>
  );
}
