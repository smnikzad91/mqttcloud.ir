"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { ColDef } from "ag-grid-community";
import { Activity as ActivityIcon } from "lucide-react";
import { useT } from "@/i18n/useT";
import { useLanguage } from "@/context/LanguageContext";
import { useMqttLive, type MqttActivityEvent } from "@/context/MqttLiveContext";
import { getJson } from "@/lib/getJson";
import DateRangeFilter from "@/components/user-dashboard/DateRangeFilter";
import DataGrid, { MonoCell, DateTimeCell, StatusCell } from "@/components/dashboard/DataGrid";
import { PageHeader, Panel, EmptyState, SkeletonRows, FilterPills, StatusBadge } from "@/components/dashboard/ui";
import { inRange } from "@/lib/dateRange";

type Activity = { id: string; clientName: string; event: "connect" | "disconnect"; createdAt: string };
type EventFilter = "all" | "connect" | "disconnect";

export default function UserMqttActivityPage() {
  const t = useT();
  const { lang } = useLanguage();
  const isRTL = lang === "fa";

  const [activity, setActivity] = useState<Activity[] | null>(null);
  const [failed, setFailed] = useState(false);
  const [eventFilter, setEventFilter] = useState<EventFilter>("all");
  const [client, setClient] = useState("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  useEffect(() => {
    getJson<Activity[]>("/api/user/mqtt/activity").then((a) => { setFailed(!a); setActivity(a ?? []); });
  }, []);

  // Prepend connect/disconnect events the moment they happen instead of waiting for a refetch.
  const onLive = useCallback((e: MqttActivityEvent) => setActivity((prev) => (prev ? [e, ...prev] : prev)), []);
  useMqttLive(onLive);

  const clientNames = useMemo(() => [...new Set((activity ?? []).map((a) => a.clientName))].sort(), [activity]);
  const filtered = useMemo(
    () => (activity ?? []).filter((a) =>
      (eventFilter === "all" || a.event === eventFilter) &&
      (client === "all" || a.clientName === client) &&
      inRange(a.createdAt, dateFrom, dateTo)),
    [activity, eventFilter, client, dateFrom, dateTo],
  );

  const columns = useMemo<ColDef<Activity>[]>(() => [
    { field: "clientName", headerName: t("mqttClientName"), flex: 1, minWidth: 160, cellRenderer: MonoCell },
    { field: "event", headerName: t("colEvent"), width: 150, cellRenderer: StatusCell },
    { field: "createdAt", headerName: t("colTime"), width: 190, sort: "desc", cellRenderer: DateTimeCell },
  ], [t]);
  const context = useMemo(() => ({
    isRTL,
    neverLabel: t("mqttNeverSeen"),
    statusLabels: { connect: t("eventConnect"), disconnect: t("eventDisconnect") },
  }), [isRTL, t]);

  const count = (e: EventFilter) => (activity ?? []).filter((a) => e === "all" || a.event === e).length;
  const filtersActive = eventFilter !== "all" || client !== "all" || !!dateFrom || !!dateTo;

  return (
    <div className="space-y-6">
      <PageHeader
        title={t("mqttActivity")}
        description={t("mqttActivityDesc")}
        actions={<StatusBadge status="online" label={t("msgLive")} pulse />}
      />

      <Panel bodyClassName="p-0">
        <div className="flex flex-wrap items-end justify-between gap-4 border-b border-gray-100 px-5 py-4 dark:border-gray-800">
          <div className="flex flex-wrap items-center gap-3">
            <FilterPills<EventFilter>
              value={eventFilter}
              onChange={setEventFilter}
              items={[
                { key: "all", label: t("filterAllShort"), count: count("all") },
                { key: "connect", label: t("eventConnect"), count: count("connect") },
                { key: "disconnect", label: t("eventDisconnect"), count: count("disconnect") },
              ]}
            />
            {clientNames.length > 1 && (
              <select
                aria-label={t("mqttClientName")}
                value={client}
                onChange={(e) => setClient(e.target.value)}
                className="h-8 rounded-lg border border-gray-200 bg-white px-2 text-xs text-gray-700 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200"
              >
                <option value="all">{t("allDevices")}</option>
                {clientNames.map((n) => <option key={n} value={n}>{n}</option>)}
              </select>
            )}
          </div>
          <DateRangeFilter from={dateFrom} to={dateTo} onFromChange={setDateFrom} onToChange={setDateTo} />
        </div>

        {activity === null ? <div className="p-5"><SkeletonRows rows={6} /></div>
          : failed ? <p className="p-5 text-sm text-error-600 dark:text-error-400">{t("ovLoadFailed")}</p>
          : activity.length === 0 ? <EmptyState icon={<ActivityIcon className="h-6 w-6" />} title={t("noMqttActivity")} />
          : filtered.length === 0 ? <EmptyState title={filtersActive ? t("noResultsInRange") : t("noMqttActivity")} />
          : <DataGrid rows={filtered} columns={columns} context={context} />}

        <p className="border-t border-gray-100 px-5 py-3 text-xs text-gray-400 dark:border-gray-800 dark:text-gray-500">{t("actLatestNote")}</p>
      </Panel>
    </div>
  );
}
