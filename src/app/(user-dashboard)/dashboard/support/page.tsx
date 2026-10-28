"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import type { ColDef, ICellRendererParams } from "ag-grid-community";
import { Plus, LifeBuoy, MessageCircle } from "lucide-react";
import { useT } from "@/i18n/useT";
import { useLanguage } from "@/context/LanguageContext";
import { getJson } from "@/lib/getJson";
import DataGrid, { DateCell, StatusCell } from "@/components/dashboard/DataGrid";
import ImageUploader from "@/components/dashboard/ImageUploader";
import { useTicketStatusLabels } from "@/components/dashboard/TicketThread";
import { PageHeader, Panel, EmptyState, SkeletonRows, FilterPills, Dialog, Field, inputClass, buttonClass, cn } from "@/components/dashboard/ui";

type Ticket = {
  id: string;
  subject: string;
  status: "open" | "answered" | "closed";
  replyCount: number;
  createdAt: string;
  updatedAt: string;
  lastReply: { sender: "user" | "admin" } | null;
};
type Filter = "all" | Ticket["status"];

const SUBJECT_MIN = 5, SUBJECT_MAX = 200, MESSAGE_MIN = 20, MESSAGE_MAX = 3000;

function SubjectCell({ data, context }: ICellRendererParams<Ticket> & { context: { t: ReturnType<typeof useT> } }) {
  if (!data) return null;
  const waiting = data.status !== "closed" && data.lastReply?.sender === "admin";
  return (
    <div className="flex h-full flex-col justify-center leading-tight">
      <span dir="auto" className={cn("truncate text-sm", waiting ? "font-semibold text-gray-900 dark:text-white" : "text-gray-800 dark:text-gray-200")}>{data.subject}</span>
      <span className={cn("mt-0.5 text-xs", waiting ? "text-brand-600 dark:text-brand-400" : "text-gray-400")}>
        {data.status === "closed" ? "" : data.lastReply?.sender === "admin" ? context.t("tkAwaitingYou") : context.t("tkAwaitingSupport")}
      </span>
    </div>
  );
}

function RepliesCell({ value }: { value: number }) {
  return <span className="inline-flex items-center gap-1.5 text-sm text-gray-500 dark:text-gray-400"><MessageCircle className="h-3.5 w-3.5" />{value}</span>;
}

export default function SupportPage() {
  const t = useT();
  const { lang } = useLanguage();
  const isRTL = lang === "fa";
  const router = useRouter();
  const statusLabels = useTicketStatusLabels();

  const [tickets, setTickets] = useState<Ticket[] | null>(null);
  const [failed, setFailed] = useState(false);
  const [filter, setFilter] = useState<Filter>("all");

  const load = useCallback(() => getJson<Ticket[]>("/api/user/tickets").then((d) => { setFailed(!d); setTickets(d ?? []); }), []);
  useEffect(() => { queueMicrotask(load); }, [load]);

  // New ticket
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ subject: "", message: "" });
  const [images, setImages] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const openNew = () => { setForm({ subject: "", message: "" }); setImages([]); setOpen(true); };

  const subjectLen = form.subject.trim().length;
  const messageLen = form.message.trim().length;
  const valid = subjectLen >= SUBJECT_MIN && subjectLen <= SUBJECT_MAX && messageLen >= MESSAGE_MIN && messageLen <= MESSAGE_MAX;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (subjectLen < SUBJECT_MIN) return toast.error(t("ticketSubjectTooShort"));
    if (messageLen < MESSAGE_MIN) return toast.error(t("ticketMessageTooShort"));
    setSubmitting(true);
    const res = await fetch("/api/user/tickets", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...form, images }) });
    const data = await res.json().catch(() => ({}));
    setSubmitting(false);
    if (!res.ok) return toast.error(data.error || t("saveError"));
    toast.success(t("ticketCreated"));
    setOpen(false);
    load();
  };

  const rows = useMemo(() => (tickets ?? []).filter((x) => filter === "all" || x.status === filter), [tickets, filter]);
  const count = (f: Filter) => (tickets ?? []).filter((x) => f === "all" || x.status === f).length;

  const columns = useMemo<ColDef<Ticket>[]>(() => [
    { field: "subject", headerName: t("ticketSubject"), flex: 2, minWidth: 220, cellRenderer: SubjectCell },
    { field: "status", headerName: t("finStatus"), width: 140, cellRenderer: StatusCell },
    { field: "replyCount", headerName: t("ticketReplyCount"), width: 110, cellRenderer: RepliesCell },
    { field: "updatedAt", headerName: t("tkUpdated"), width: 150, sort: "desc", cellRenderer: DateCell },
  ], [t]);
  const context = useMemo(() => ({ isRTL, statusLabels, t }), [isRTL, statusLabels, t]);

  return (
    <div className="space-y-6">
      <PageHeader
        title={t("supportTitle")}
        description={t("supportDesc")}
        actions={<button type="button" onClick={openNew} className={buttonClass("primary")}><Plus className="h-4 w-4" />{t("newTicket")}</button>}
      />

      <Panel bodyClassName="p-0">
        <div className="border-b border-gray-100 px-5 py-3 dark:border-gray-800">
          <FilterPills<Filter>
            value={filter}
            onChange={setFilter}
            items={[
              { key: "all", label: t("filterAllShort"), count: count("all") },
              { key: "open", label: t("statusOpen"), count: count("open") },
              { key: "answered", label: t("statusAnswered"), count: count("answered") },
              { key: "closed", label: t("statusClosed"), count: count("closed") },
            ]}
          />
        </div>
        {tickets === null ? <div className="p-5"><SkeletonRows rows={4} /></div>
          : failed ? <p className="p-5 text-sm text-error-600 dark:text-error-400">{t("ovLoadFailed")}</p>
          : rows.length === 0 ? (
            <EmptyState
              icon={<LifeBuoy className="h-6 w-6" />}
              title={t("noTickets")}
              action={filter === "all" && <button type="button" onClick={openNew} className={buttonClass("primary", "sm")}><Plus className="h-4 w-4" />{t("newTicket")}</button>}
            />
          ) : (
            <DataGrid
              rows={rows}
              columns={columns}
              context={context}
              rowHeight={64}
              rowClass="cursor-pointer"
              onRowClicked={(e) => e.data && router.push(`/dashboard/support/${e.data.id}`)}
            />
          )}
      </Panel>

      <Dialog open={open} onClose={() => !submitting && setOpen(false)} title={t("newTicket")} description={t("tkNewTicketDesc")} size="lg">
        <form onSubmit={submit} className="space-y-4">
          <Field label={t("ticketSubject")} htmlFor="tk-subject" hint={<span dir="ltr">{subjectLen}/{SUBJECT_MAX}</span>}>
            <input id="tk-subject" autoFocus dir="auto" maxLength={SUBJECT_MAX} value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })} placeholder={t("ticketSubjectPlaceholder")} className={inputClass} />
          </Field>
          <Field label={t("ticketMessage")} htmlFor="tk-message" hint={<span dir="ltr">{messageLen}/{MESSAGE_MAX}</span>}>
            <textarea id="tk-message" dir="auto" rows={6} maxLength={MESSAGE_MAX} value={form.message} onChange={(e) => setForm({ ...form, message: e.target.value })} placeholder={t("ticketMessagePlaceholder")} className={cn(inputClass, "h-auto resize-y py-3")} />
          </Field>
          <ImageUploader value={images} onChange={setImages} onBusyChange={setUploading} />
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={() => setOpen(false)} disabled={submitting} className={buttonClass("secondary")}>{t("cancel")}</button>
            <button type="submit" disabled={submitting || uploading || !valid} className={buttonClass("primary")}>{submitting ? t("submitting") : t("submitTicket")}</button>
          </div>
        </form>
      </Dialog>
    </div>
  );
}
