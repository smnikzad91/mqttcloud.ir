"use client";

import { useEffect, useMemo, useState } from "react";
import type { ColDef, RowClickedEvent } from "ag-grid-community";
import { MessagesSquare, Search } from "lucide-react";
import { useT } from "@/i18n/useT";
import { useLanguage } from "@/context/LanguageContext";
import { getJson } from "@/lib/getJson";
import { inRange } from "@/lib/dateRange";
import DateRangeFilter from "@/components/user-dashboard/DateRangeFilter";
import DataGrid, { MonoCell, DateTimeCell } from "@/components/dashboard/DataGrid";
import { PageHeader, Panel, EmptyState, SkeletonRows, Dialog, CopyChip, buttonClass, inputClass, cn } from "@/components/dashboard/ui";

type Payload = { id: string; clientName: string; topic: string; payload: string; createdAt: string };

/** Pretty-prints JSON payloads; anything else is shown verbatim. */
function pretty(raw: string): { text: string; json: boolean } {
  try {
    return { text: JSON.stringify(JSON.parse(raw), null, 2), json: true };
  } catch {
    return { text: raw, json: false };
  }
}

function PayloadCell({ value }: { value: string }) {
  return <span dir="ltr" className="block truncate font-mono-signal text-[13px] text-gray-600 dark:text-gray-300">{value}</span>;
}

export default function UserMqttMessagesPage() {
  const t = useT();
  const { lang } = useLanguage();
  const isRTL = lang === "fa";

  const [payloads, setPayloads] = useState<Payload[] | null>(null);
  const [failed, setFailed] = useState(false);
  const [query, setQuery] = useState("");
  const [client, setClient] = useState("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [inspect, setInspect] = useState<Payload | null>(null);

  useEffect(() => {
    getJson<Payload[]>("/api/user/mqtt/payloads").then((p) => { setFailed(!p); setPayloads(p ?? []); });
  }, []);

  const clientNames = useMemo(() => [...new Set((payloads ?? []).map((p) => p.clientName))].sort(), [payloads]);
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return (payloads ?? []).filter((p) =>
      (client === "all" || p.clientName === client) &&
      (!q || p.topic.toLowerCase().includes(q) || p.payload.toLowerCase().includes(q)) &&
      inRange(p.createdAt, dateFrom, dateTo));
  }, [payloads, query, client, dateFrom, dateTo]);

  const columns = useMemo<ColDef<Payload>[]>(() => [
    { field: "clientName", headerName: t("mqttClientName"), flex: 1, minWidth: 140, cellRenderer: MonoCell },
    { field: "topic", headerName: t("mqttTopic"), flex: 1.3, minWidth: 180, cellRenderer: MonoCell },
    { field: "payload", headerName: t("mqttMessage"), flex: 1.8, minWidth: 220, sortable: false, cellRenderer: PayloadCell },
    { field: "createdAt", headerName: t("colTime"), width: 190, sort: "desc", cellRenderer: DateTimeCell },
  ], [t]);
  const context = useMemo(() => ({ isRTL, neverLabel: t("mqttNeverSeen") }), [isRTL, t]);

  const shown = inspect ? pretty(inspect.payload) : null;
  const filtersActive = !!query || client !== "all" || !!dateFrom || !!dateTo;

  return (
    <div className="space-y-6">
      <PageHeader title={t("mqttPayloads")} description={t("mqttPayloadsDesc")} />

      <Panel bodyClassName="p-0">
        <div className="flex flex-wrap items-end justify-between gap-4 border-b border-gray-100 px-5 py-4 dark:border-gray-800">
          <div className="flex flex-1 flex-wrap items-center gap-3">
            <div className="relative w-full sm:w-72">
              <Search className="pointer-events-none absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" aria-hidden />
              <input
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={t("msgSearch")}
                aria-label={t("msgSearch")}
                className={cn(inputClass, "h-9 ps-9")}
              />
            </div>
            {clientNames.length > 1 && (
              <select
                aria-label={t("mqttClientName")}
                value={client}
                onChange={(e) => setClient(e.target.value)}
                className="h-9 rounded-lg border border-gray-200 bg-white px-2 text-xs text-gray-700 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200"
              >
                <option value="all">{t("allDevices")}</option>
                {clientNames.map((n) => <option key={n} value={n}>{n}</option>)}
              </select>
            )}
          </div>
          <DateRangeFilter from={dateFrom} to={dateTo} onFromChange={setDateFrom} onToChange={setDateTo} />
        </div>

        {payloads === null ? <div className="p-5"><SkeletonRows rows={6} /></div>
          : failed ? <p className="p-5 text-sm text-error-600 dark:text-error-400">{t("ovLoadFailed")}</p>
          : payloads.length === 0 ? <EmptyState icon={<MessagesSquare className="h-6 w-6" />} title={t("noMqttPayloads")} />
          : filtered.length === 0 ? <EmptyState title={filtersActive ? t("noResultsInRange") : t("noMqttPayloads")} />
          : (
            <DataGrid
              rows={filtered}
              columns={columns}
              context={context}
              rowClass="cursor-pointer"
              onRowClicked={(e: RowClickedEvent<Payload>) => e.data && setInspect(e.data)}
            />
          )}

        <p className="border-t border-gray-100 px-5 py-3 text-xs text-gray-400 dark:border-gray-800 dark:text-gray-500">{t("msgLatestNote")}</p>
      </Panel>

      {/* Payload inspector */}
      <Dialog
        open={!!inspect}
        onClose={() => setInspect(null)}
        size="lg"
        title={t("msgDetails")}
        footer={<button type="button" onClick={() => setInspect(null)} className={buttonClass("secondary")}>{t("cmdClose")}</button>}
      >
        {inspect && shown && (
          <>
            <dl className="grid gap-3 text-sm sm:grid-cols-3">
              <div><dt className="text-xs text-gray-500 dark:text-gray-400">{t("mqttClientName")}</dt><dd className="mt-1"><CopyChip value={inspect.clientName} /></dd></div>
              <div className="sm:col-span-2"><dt className="text-xs text-gray-500 dark:text-gray-400">{t("mqttTopic")}</dt><dd className="mt-1"><CopyChip value={inspect.topic} /></dd></div>
              <div className="sm:col-span-3">
                <dt className="text-xs text-gray-500 dark:text-gray-400">{t("msgReceived")}</dt>
                <dd className="mt-1 text-gray-700 dark:text-gray-200">
                  {new Date(inspect.createdAt).toLocaleString(isRTL ? "fa-IR" : "en-US", { dateStyle: "medium", timeStyle: "medium" })}
                </dd>
              </div>
            </dl>
            <div>
              <div className="mb-1.5 flex items-center justify-between">
                <span className="text-xs text-gray-500 dark:text-gray-400">{t("msgPayload")}{shown.json && <span className="ms-2 rounded bg-gray-100 px-1.5 py-0.5 font-mono-signal text-[10px] dark:bg-white/10">JSON</span>}</span>
                <CopyChip value={inspect.payload} label={t("copyCardNumber")} />
              </div>
              <pre dir="ltr" className="max-h-80 overflow-auto rounded-xl border border-gray-800 bg-gray-950 p-4 text-start font-mono-signal text-[12.5px] leading-relaxed text-gray-200">
                <code>{shown.text}</code>
              </pre>
            </div>
          </>
        )}
      </Dialog>
    </div>
  );
}
