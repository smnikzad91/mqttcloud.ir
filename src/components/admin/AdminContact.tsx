"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import type { ColDef, ICellRendererParams } from "ag-grid-community";
import { Search, Mail, Reply, Trash2, CheckCheck } from "lucide-react";
import { useT } from "@/i18n/useT";
import { useLanguage } from "@/context/LanguageContext";
import { getJson } from "@/lib/getJson";
import DataGrid, { DateCell, StatusCell } from "@/components/dashboard/DataGrid";
import { PageHeader, Panel, EmptyState, SkeletonRows, FilterPills, Dialog, ConfirmDialog, StatusBadge, inputClass, buttonClass, cn } from "@/components/dashboard/ui";

type ContactStatus = "new" | "read" | "replied";
type ContactRow = { id: string; name: string; email: string; subject: string; message: string; status: ContactStatus; createdAt: string };
type Filter = "all" | ContactStatus;

function SenderCell({ data }: ICellRendererParams<ContactRow>) {
  if (!data) return null;
  const unread = data.status === "new";
  return (
    <div className="flex h-full items-center gap-2">
      {unread && <span className="h-2 w-2 shrink-0 rounded-full bg-blue-light-500" aria-hidden />}
      <div className="min-w-0 leading-tight">
        <p className={cn("truncate text-sm", unread ? "font-semibold text-gray-900 dark:text-white" : "text-gray-800 dark:text-gray-200")}>{data.name}</p>
        <p dir="ltr" className="truncate text-start text-xs text-gray-500 dark:text-gray-400">{data.email}</p>
      </div>
    </div>
  );
}
function SubjectCell({ data }: ICellRendererParams<ContactRow>) {
  if (!data) return null;
  return (
    <div className="flex h-full flex-col justify-center leading-tight">
      <p dir="auto" className={cn("truncate text-sm", data.status === "new" ? "font-semibold text-gray-900 dark:text-white" : "text-gray-700 dark:text-gray-300")}>{data.subject}</p>
      <p dir="auto" className="truncate text-xs text-gray-400">{data.message}</p>
    </div>
  );
}

export default function AdminContact() {
  const t = useT();
  const { lang } = useLanguage();
  const isRTL = lang === "fa";

  const [rows, setRows] = useState<ContactRow[] | null>(null);
  const [filter, setFilter] = useState<Filter>("all");
  const [query, setQuery] = useState("");
  const [view, setView] = useState<ContactRow | null>(null);
  const [deleting, setDeleting] = useState<ContactRow | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(() => getJson<(ContactRow & { _id?: string })[]>("/api/admin/contact").then((d) => setRows((d ?? []).map((r) => ({ ...r, id: r._id ?? r.id })))), []);
  useEffect(() => { queueMicrotask(load); }, [load]);

  const setStatus = useCallback(async (id: string, status: ContactStatus, quiet = false) => {
    const res = await fetch(`/api/admin/contact/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status }) });
    if (!res.ok) return toast.error(t("saveError"));
    if (!quiet) toast.success(t("contactSaved"));
    setRows((prev) => prev?.map((r) => (r.id === id ? { ...r, status } : r)) ?? prev);
    setView((prev) => (prev?.id === id ? { ...prev, status } : prev));
  }, [t]);

  // Opening a new message marks it read.
  const open = useCallback((r: ContactRow) => {
    setView(r);
    if (r.status === "new") setStatus(r.id, "read", true);
  }, [setStatus]);

  const confirmDelete = async () => {
    if (!deleting) return;
    setBusy(true);
    const res = await fetch(`/api/admin/contact/${deleting.id}`, { method: "DELETE" });
    setBusy(false);
    if (!res.ok) return toast.error(t("saveError"));
    toast.success(t("contactDeleted"));
    if (view?.id === deleting.id) setView(null);
    setDeleting(null);
    load();
  };

  const statusLabels = useMemo(() => ({ new: t("contactStatusNew"), read: t("contactStatusRead"), replied: t("contactStatusReplied") }), [t]);
  const q = query.trim().toLowerCase();
  const shown = useMemo(() => (rows ?? []).filter((r) =>
    (filter === "all" || r.status === filter) &&
    (!q || r.name.toLowerCase().includes(q) || r.email.toLowerCase().includes(q) || r.subject.toLowerCase().includes(q))), [rows, filter, q]);
  const count = (f: Filter) => (rows ?? []).filter((r) => f === "all" || r.status === f).length;

  const columns = useMemo<ColDef<ContactRow>[]>(() => [
    { field: "name", headerName: t("contactColName"), flex: 1, minWidth: 200, cellRenderer: SenderCell },
    { field: "subject", headerName: t("contactColSubject"), flex: 2, minWidth: 240, cellRenderer: SubjectCell },
    { field: "status", headerName: t("contactColStatus"), width: 140, cellRenderer: StatusCell },
    { field: "createdAt", headerName: t("contactColDate"), width: 130, sort: "desc", cellRenderer: DateCell },
  ], [t]);
  const context = useMemo(() => ({ isRTL, statusLabels }), [isRTL, statusLabels]);

  const mailto = view && `mailto:${view.email}?subject=${encodeURIComponent(`Re: ${view.subject}`)}`;

  return (
    <div className="space-y-6">
      <PageHeader title={t("contactTitle")} description={t("acDesc")} />
      <Panel bodyClassName="p-0">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-100 px-5 py-4 dark:border-gray-800">
          <FilterPills<Filter>
            value={filter}
            onChange={setFilter}
            items={[
              { key: "all", label: t("filterAllShort"), count: count("all") },
              { key: "new", label: t("contactStatusNew"), count: count("new") },
              { key: "read", label: t("contactStatusRead"), count: count("read") },
              { key: "replied", label: t("contactStatusReplied"), count: count("replied") },
            ]}
          />
          <div className="relative w-full sm:w-72">
            <Search className="pointer-events-none absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" aria-hidden />
            <input type="search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder={t("acSearch")} aria-label={t("acSearch")} className={cn(inputClass, "h-9 ps-9")} />
          </div>
        </div>
        {rows === null ? <div className="p-5"><SkeletonRows rows={5} /></div>
          : shown.length === 0 ? <EmptyState icon={<Mail className="h-6 w-6" />} title={t("contactEmpty")} />
          : <DataGrid rows={shown} columns={columns} context={context} rowHeight={60} rowClass="cursor-pointer" onRowClicked={(e) => e.data && open(e.data)} />}
      </Panel>

      <Dialog
        open={!!view}
        onClose={() => setView(null)}
        size="lg"
        title={<span dir="auto">{view?.subject}</span>}
        description={view && <>{view.name} · <span dir="ltr">{view.email}</span> · {new Date(view.createdAt).toLocaleString(isRTL ? "fa-IR" : "en-US", { dateStyle: "medium", timeStyle: "short" })}</>}
        footer={view && (
          <>
            <button type="button" onClick={() => setDeleting(view)} className={cn(buttonClass("ghost"), "me-auto text-error-600 dark:text-error-400")}><Trash2 className="h-4 w-4" />{t("contactDelete")}</button>
            {view.status !== "replied" && (
              <button type="button" onClick={() => setStatus(view.id, "replied")} className={buttonClass("secondary")}><CheckCheck className="h-4 w-4" />{t("contactMarkReplied")}</button>
            )}
            <a href={mailto!} className={buttonClass("primary")}><Reply className="h-4 w-4 rtl:-scale-x-100" />{t("acReplyEmail")}</a>
          </>
        )}
      >
        {view && (
          <>
            <StatusBadge status={view.status} label={statusLabels[view.status]} />
            <p dir="auto" className="whitespace-pre-wrap rounded-xl bg-gray-50 p-4 text-sm leading-relaxed text-gray-800 dark:bg-white/[0.03] dark:text-gray-100">{view.message}</p>
            <p className="text-xs text-gray-500 dark:text-gray-400">{t("acReplyHint")}</p>
          </>
        )}
      </Dialog>

      <ConfirmDialog
        open={!!deleting}
        onClose={() => setDeleting(null)}
        onConfirm={confirmDelete}
        busy={busy}
        title={t("acDeleteTitle")}
        subject={deleting && <span dir="auto">{deleting.subject}</span>}
        confirmLabel={t("contactDelete")}
        cancelLabel={t("cancel")}
      />
    </div>
  );
}
