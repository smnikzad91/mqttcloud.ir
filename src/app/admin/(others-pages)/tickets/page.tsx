"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { ColDef, ICellRendererParams } from "ag-grid-community";
import { Search, LifeBuoy, MessageCircle } from "lucide-react";
import { useT } from "@/i18n/useT";
import { useLanguage } from "@/context/LanguageContext";
import { getJson } from "@/lib/getJson";
import DataGrid, { DateTimeCell, StatusCell } from "@/components/dashboard/DataGrid";
import { useTicketStatusLabels } from "@/components/dashboard/TicketThread";
import { PageHeader, Panel, EmptyState, SkeletonRows, FilterPills, inputClass, cn } from "@/components/dashboard/ui";

type Ticket = {
  id: string;
  subject: string;
  status: "open" | "answered" | "closed";
  replyCount: number;
  createdAt: string;
  updatedAt: string;
  user: { name: string; email: string } | null;
  lastReply: { sender: "user" | "admin" } | null;
};
type Filter = "all" | Ticket["status"];

function SubjectCell({ data }: ICellRendererParams<Ticket>) {
  if (!data) return null;
  const needsReply = data.status === "open";
  return (
    <div className="flex h-full items-center gap-2">
      {needsReply && <span className="h-2 w-2 shrink-0 rounded-full bg-warning-500" aria-hidden />}
      <span dir="auto" className={cn("truncate text-sm", needsReply ? "font-semibold text-gray-900 dark:text-white" : "text-gray-700 dark:text-gray-300")}>{data.subject}</span>
    </div>
  );
}
function UserCell({ value }: { value: Ticket["user"] }) {
  if (!value) return <span className="text-gray-400">—</span>;
  return (
    <div className="flex h-full flex-col justify-center leading-tight">
      <span className="truncate text-sm text-gray-900 dark:text-white">{value.name || "—"}</span>
      <span dir="ltr" className="truncate text-start text-xs text-gray-500 dark:text-gray-400">{value.email}</span>
    </div>
  );
}
function RepliesCell({ value }: { value: number }) {
  return <span className="inline-flex items-center gap-1.5 text-sm text-gray-500 dark:text-gray-400"><MessageCircle className="h-3.5 w-3.5" />{value}</span>;
}

export default function AdminTicketsPage() {
  const t = useT();
  const { lang } = useLanguage();
  const isRTL = lang === "fa";
  const router = useRouter();
  const statusLabels = useTicketStatusLabels();

  const [tickets, setTickets] = useState<Ticket[] | null>(null);
  const [failed, setFailed] = useState(false);
  // "Open" = waiting on support, so that's the default queue.
  const [filter, setFilter] = useState<Filter>("open");
  const [query, setQuery] = useState("");

  useEffect(() => {
    getJson<Ticket[]>("/api/admin/tickets").then((d) => { setFailed(!d); setTickets(d ?? []); });
  }, []);

  const q = query.trim().toLowerCase();
  const rows = useMemo(() => (tickets ?? []).filter((x) =>
    (filter === "all" || x.status === filter) &&
    (!q || x.subject.toLowerCase().includes(q) || (x.user?.name ?? "").toLowerCase().includes(q) || (x.user?.email ?? "").toLowerCase().includes(q))), [tickets, filter, q]);
  const count = (f: Filter) => (tickets ?? []).filter((x) => f === "all" || x.status === f).length;

  const columns = useMemo<ColDef<Ticket>[]>(() => [
    { field: "subject", headerName: t("ticketSubject"), flex: 2, minWidth: 240, cellRenderer: SubjectCell },
    { field: "user", headerName: t("ticketFrom"), flex: 1.2, minWidth: 190, sortable: false, cellRenderer: UserCell },
    { field: "status", headerName: t("finStatus"), width: 140, cellRenderer: StatusCell },
    { field: "replyCount", headerName: t("ticketReplyCount"), width: 100, cellRenderer: RepliesCell },
    { field: "updatedAt", headerName: t("tkUpdated"), width: 180, sort: "desc", cellRenderer: DateTimeCell },
  ], [t]);
  const context = useMemo(() => ({ isRTL, statusLabels }), [isRTL, statusLabels]);

  return (
    <div className="space-y-6">
      <PageHeader title={t("adminTicketsTitle")} description={t("adminTicketsDesc")} />
      <Panel bodyClassName="p-0">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-100 px-5 py-4 dark:border-gray-800">
          <FilterPills<Filter>
            value={filter}
            onChange={setFilter}
            items={[
              { key: "open", label: t("statusOpen"), count: count("open") },
              { key: "answered", label: t("statusAnswered"), count: count("answered") },
              { key: "closed", label: t("statusClosed"), count: count("closed") },
              { key: "all", label: t("filterAllShort"), count: count("all") },
            ]}
          />
          <div className="relative w-full sm:w-72">
            <Search className="pointer-events-none absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" aria-hidden />
            <input type="search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder={t("auSearch")} aria-label={t("auSearch")} className={cn(inputClass, "h-9 ps-9")} />
          </div>
        </div>
        {tickets === null ? <div className="p-5"><SkeletonRows rows={5} /></div>
          : failed ? <p className="p-5 text-sm text-error-600 dark:text-error-400">{t("ovLoadFailed")}</p>
          : rows.length === 0 ? <EmptyState icon={<LifeBuoy className="h-6 w-6" />} title={filter === "open" ? t("aovQueueEmpty") : t("noTickets")} />
          : <DataGrid rows={rows} columns={columns} context={context} rowHeight={60} rowClass="cursor-pointer" onRowClicked={(e) => e.data && router.push(`/admin/tickets/${e.data.id}`)} />}
      </Panel>
    </div>
  );
}
