"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Activity as ActivityIcon, Plug, Unplug, Radio } from "lucide-react";
import { useT } from "@/i18n/useT";
import { useLanguage } from "@/context/LanguageContext";
import { useMqttLive, type MqttActivityEvent } from "@/context/MqttLiveContext";
import { getJson } from "@/lib/getJson";
import { inRange } from "@/lib/dateRange";
import { formatRelative, useNow } from "@/lib/relativeTime";
import DateRangeFilter from "@/components/user-dashboard/DateRangeFilter";
import DailyBars from "@/components/dashboard/DailyBars";
import { PageHeader, Panel, StatTile, EmptyState, SkeletonRows, FilterPills, StatusBadge, cn, useFormatNumber } from "@/components/dashboard/ui";

type Activity = { id: string; clientName: string; event: "connect" | "disconnect"; createdAt: string };
type Client = { id: string; clientName: string; isOnline: boolean };
type EventFilter = "all" | "connect" | "disconnect";

const DAY = 864e5;
const startOfDay = (d: Date) => { const x = new Date(d); x.setHours(0, 0, 0, 0); return x; };

export default function UserMqttActivityPage() {
  const t = useT();
  const { lang } = useLanguage();
  const locale = lang === "fa" ? "fa-IR" : "en-US";
  const fmt = useFormatNumber();
  const now = useNow();

  const [activity, setActivity] = useState<Activity[] | null>(null);
  const [clients, setClients] = useState<Client[] | null>(null);
  const [failed, setFailed] = useState(false);
  const [eventFilter, setEventFilter] = useState<EventFilter>("all");
  const [client, setClient] = useState("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  // Events that arrived live get a brief highlight.
  const [fresh, setFresh] = useState<Set<string>>(new Set());
  const freshTimers = useRef<ReturnType<typeof setTimeout>[]>([]);
  useEffect(() => () => freshTimers.current.forEach(clearTimeout), []);

  useEffect(() => {
    getJson<Activity[]>("/api/user/mqtt/activity").then((a) => { setFailed(!a); setActivity(a ?? []); });
    getJson<Client[]>("/api/user/mqtt/clients").then((c) => setClients(c ?? []));
  }, []);

  const onLive = useCallback((e: MqttActivityEvent) => {
    setActivity((prev) => (prev ? [e, ...prev] : prev));
    setClients((prev) => prev?.map((c) => (c.clientName === e.clientName ? { ...c, isOnline: e.event === "connect" } : c)) ?? prev);
    setFresh((s) => new Set(s).add(e.id));
    freshTimers.current.push(setTimeout(() => setFresh((s) => { const n = new Set(s); n.delete(e.id); return n; }), 4000));
  }, []);
  useMqttLive(onLive);

  const all = useMemo(() => activity ?? [], [activity]);
  const last24 = all.filter((a) => now - new Date(a.createdAt).getTime() < DAY);
  const online = (clients ?? []).filter((c) => c.isOnline).length;

  // Connections per hour over the last 24 hours (oldest → newest).
  const hourly = useMemo(() => {
    const top = new Date(now); top.setMinutes(0, 0, 0);
    const buckets = Array.from({ length: 24 }, (_, i) => ({ date: new Date(top.getTime() - (23 - i) * 36e5), value: 0 }));
    for (const a of all) {
      if (a.event !== "connect") continue;
      const idx = 23 - Math.floor((top.getTime() + 36e5 - 1 - new Date(a.createdAt).getTime()) / 36e5);
      if (idx >= 0 && idx < 24) buckets[idx].value++;
    }
    return buckets;
  }, [all, now]);

  const clientNames = useMemo(() => [...new Set(all.map((a) => a.clientName))].sort(), [all]);
  const filtered = useMemo(
    () => all.filter((a) =>
      (eventFilter === "all" || a.event === eventFilter) &&
      (client === "all" || a.clientName === client) &&
      inRange(a.createdAt, dateFrom, dateTo)),
    [all, eventFilter, client, dateFrom, dateTo],
  );

  // Timeline grouped by calendar day: Today, Yesterday, then dates.
  const groups = useMemo(() => {
    const today = startOfDay(new Date(now)).getTime();
    const out: { label: string; items: Activity[] }[] = [];
    for (const a of filtered) {
      const d = startOfDay(new Date(a.createdAt)).getTime();
      const label = d === today ? t("actToday") : d === today - DAY ? t("actYesterday")
        : new Date(d).toLocaleDateString(locale, { weekday: "long", month: "long", day: "numeric" });
      const last = out[out.length - 1];
      if (last?.label === label) last.items.push(a);
      else out.push({ label, items: [a] });
    }
    return out;
  }, [filtered, now, locale, t]);

  const count = (e: EventFilter) => all.filter((a) => e === "all" || a.event === e).length;
  const filtersActive = eventFilter !== "all" || client !== "all" || !!dateFrom || !!dateTo;

  return (
    <div className="space-y-6">
      <PageHeader title={t("mqttActivity")} description={t("mqttActivityDesc")} actions={<StatusBadge status="online" label={t("msgLive")} pulse />} />

      <div className="grid gap-4 sm:grid-cols-3">
        <StatTile icon={<Radio className="h-5 w-5" />} label={t("actOnlineNow")} value={clients === null ? "…" : <span dir="ltr">{fmt(online)} <span className="text-base font-medium text-gray-400">/ {fmt(clients.length)}</span></span>} />
        <StatTile icon={<Plug className="h-5 w-5" />} label={t("actConnects24")} value={activity === null ? "…" : fmt(last24.filter((a) => a.event === "connect").length)} />
        <StatTile icon={<Unplug className="h-5 w-5" />} label={t("actDisconnects24")} value={activity === null ? "…" : fmt(last24.filter((a) => a.event === "disconnect").length)} />
      </div>

      <Panel title={t("actChart")}>
        {activity === null ? <SkeletonRows rows={3} /> : <DailyBars points={hourly} granularity="hour" valueLabel={t("actConnections")} dayLabel={t("colTime")} height={120} />}
      </Panel>

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
              <select aria-label={t("mqttClientName")} value={client} onChange={(e) => setClient(e.target.value)} className="h-8 rounded-lg border border-gray-200 bg-white px-2 text-xs text-gray-700 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200">
                <option value="all">{t("allDevices")}</option>
                {clientNames.map((n) => <option key={n} value={n}>{n}</option>)}
              </select>
            )}
          </div>
          <DateRangeFilter from={dateFrom} to={dateTo} onFromChange={setDateFrom} onToChange={setDateTo} />
        </div>

        {activity === null ? <div className="p-5"><SkeletonRows rows={6} /></div>
          : failed ? <p className="p-5 text-sm text-error-600 dark:text-error-400">{t("ovLoadFailed")}</p>
          : all.length === 0 ? <EmptyState icon={<ActivityIcon className="h-6 w-6" />} title={t("noMqttActivity")} />
          : filtered.length === 0 ? <EmptyState title={filtersActive ? t("noResultsInRange") : t("noMqttActivity")} />
          : (
            <div className="px-5 pb-2">
              {groups.map((g) => (
                <section key={g.label}>
                  <h3 className="sticky top-16 z-[1] -mx-5 bg-white/95 px-5 pb-2 pt-4 text-xs font-semibold uppercase tracking-wide text-gray-500 backdrop-blur dark:bg-gray-900/95 dark:text-gray-400">{g.label}</h3>
                  <ol className="relative space-y-1 border-s border-gray-200 ps-5 dark:border-gray-800">
                    {g.items.map((a) => {
                      const connect = a.event === "connect";
                      return (
                        <li key={a.id} className={cn("relative flex items-center gap-3 rounded-xl px-3 py-2 transition-colors duration-700", fresh.has(a.id) && "bg-brand-50 dark:bg-brand-500/10")}>
                          <span className={cn("absolute -start-[29px] flex h-6 w-6 items-center justify-center rounded-full ring-4 ring-white dark:ring-gray-900", connect ? "bg-success-50 text-success-600 dark:bg-success-500/15 dark:text-success-400" : "bg-error-50 text-error-600 dark:bg-error-500/15 dark:text-error-400")}>
                            {connect ? <Plug className="h-3 w-3" /> : <Unplug className="h-3 w-3" />}
                          </span>
                          <span dir="ltr" className="min-w-0 truncate font-mono-signal text-sm text-gray-900 dark:text-white">{a.clientName}</span>
                          <span className={cn("text-sm", connect ? "text-success-600 dark:text-success-400" : "text-error-600 dark:text-error-400")}>{connect ? t("eventConnect") : t("eventDisconnect")}</span>
                          <time dateTime={a.createdAt} title={new Date(a.createdAt).toLocaleString(locale)} className="ms-auto shrink-0 text-xs text-gray-500 dark:text-gray-400">
                            {formatRelative(a.createdAt, lang, now)}
                          </time>
                        </li>
                      );
                    })}
                  </ol>
                </section>
              ))}
            </div>
          )}

        <p className="border-t border-gray-100 px-5 py-3 text-xs text-gray-400 dark:border-gray-800 dark:text-gray-500">{t("actLatestNote")}</p>
      </Panel>
    </div>
  );
}
