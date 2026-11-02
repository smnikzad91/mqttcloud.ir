"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Zap, ZapOff, Gauge, Clock, LineChart, RefreshCw } from "lucide-react";
import { useT } from "@/i18n/useT";
import { getJson } from "@/lib/getJson";
import { useTheme } from "@/context/ThemeContext";
import { RelTime } from "@/components/admin/AdminParts";
import PowerChart, { POWER_COLORS, niceAxis } from "@/components/admin/PowerChart";
import { useTopicLive, type TopicMessage, type ClientEvent } from "@/lib/useTopicLive";
import { POWER_SOURCE, POWER_CHANNELS as CHANNELS, parseTelemetry } from "@/lib/powerSource";
import { PageHeader, Panel, StatTile, EmptyState, SkeletonRows, FilterPills, StatusBadge, cn, useFormatNumber } from "@/components/dashboard/ui";

type Live = {
  latest: { ts: string; mains: number; ch: number[] } | null;
  device: { isOnline: boolean; lastSeenAt: string | null } | null;
};
type History = {
  range: string;
  samples: number;
  points: PowerPoint[];
  outages: { from: number; to: number }[];
  stats: { avg: number; max: number }[] | null;
};
type PowerPoint = { t: number; ch: (number | null)[] };
type Range = "6h" | "24h" | "7d" | "30d" | "all";

export default function AdminPowerPage() {
  const t = useT();
  const fmt = useFormatNumber();
  const { theme } = useTheme();
  const colors = theme === "dark" ? POWER_COLORS.dark : POWER_COLORS.light;
  const labels = useMemo(() => Array.from({ length: CHANNELS }, (_, i) => `${t("powerChannel")} ${i + 1}`), [t]);
  const mA = t("powerUnit");

  const [live, setLive] = useState<Live | null>(null);
  const [liveError, setLiveError] = useState(false);
  const [range, setRange] = useState<Range>("24h");
  const [history, setHistory] = useState<History | null>(null);

  const loadLive = useCallback(() => getJson<Live>("/api/admin/power/live").then((d) => {
    setLiveError(!d);
    if (d) setLive(d);
  }), []);
  const loadHistory = useCallback((r: Range) => getJson<History>(`/api/admin/power/history?range=${r}`).then((d) => {
    if (d) setHistory(d);
  }), []);

  // WebSocket push from the broker: each telemetry message the moment it's
  // published, and the device's connect/disconnect. In the 6-hour view (raw
  // 30 s points) new readings are appended to the chart as they arrive.
  const onMessage = useCallback((m: TopicMessage) => {
    const sample = parseTelemetry(m.payload);
    if (!sample) return;
    setLive((prev) => ({ device: prev?.device ?? null, latest: { ts: m.at, ...sample } }));
    if (range === "6h") {
      setHistory((h) => h && h.range === "6h" ? { ...h, samples: h.samples + 1, points: [...h.points, { t: Date.parse(m.at), ch: sample.ch }] } : h);
    }
  }, [range]);
  const onClient = useCallback((e: ClientEvent) => {
    if (e.username !== POWER_SOURCE.username || e.clientName !== POWER_SOURCE.clientName) return;
    setLive((prev) => prev && { ...prev, device: { isOnline: e.event === "connect", lastSeenAt: e.createdAt } });
  }, []);
  const pushConnected = useTopicLive(POWER_SOURCE.topic, onMessage, onClient);

  useEffect(() => { queueMicrotask(loadLive); }, [loadLive]);
  useEffect(() => { queueMicrotask(() => { setHistory(null); loadHistory(range); }); }, [range, loadHistory]);
  // Polling is the fallback: every 10 s without the socket, every minute with it
  // (keeps the device status honest if an event is missed). History and its
  // stats refresh every minute.
  useEffect(() => {
    const visible = () => document.visibilityState === "visible";
    const a = setInterval(() => { if (visible()) loadLive(); }, pushConnected ? 60_000 : 10_000);
    const b = setInterval(() => { if (visible()) loadHistory(range); }, 60_000);
    return () => { clearInterval(a); clearInterval(b); };
  }, [loadLive, loadHistory, range, pushConnected]);

  const latest = live?.latest;
  const total = latest ? latest.ch.reduce((s, v) => s + v, 0) : null;
  const totalColor = theme === "dark" ? "#7592ff" : "#465fff"; // brand, not a channel hue

  // Series for the charts: the total, and each channel on one shared y-range
  // so the small multiples compare at a glance.
  const series = useMemo(() => {
    if (!history) return null;
    const pts = history.points;
    const total = pts.map((p) => [p.t, p.ch[0] == null ? null : p.ch.reduce<number>((s, v) => s + (v ?? 0), 0)] as [number, number | null]);
    const channels = Array.from({ length: CHANNELS }, (_, i) => pts.map((p) => [p.t, p.ch[i]] as [number, number | null]));
    const all = pts.flatMap((p) => p.ch.filter((v): v is number => v != null));
    return { total, channels, axis: niceAxis(Math.min(0, ...all), Math.max(1, ...all), 3) };
  }, [history]);

  const ranges: { key: Range; label: string }[] = [
    { key: "6h", label: t("powerRange6h") },
    { key: "24h", label: t("powerRange24h") },
    { key: "7d", label: t("powerRange7d") },
    { key: "30d", label: t("powerRange30d") },
    { key: "all", label: t("powerRangeAll") },
  ];

  return (
    <div>
      <PageHeader
        title={t("powerTitle")}
        description={<span dir="ltr" className="font-mono">{POWER_SOURCE.username} / {POWER_SOURCE.clientName}</span>}
        actions={
          <>
            <span
              className={cn("inline-flex items-center gap-1.5 text-xs font-medium", pushConnected ? "text-brand-600 dark:text-brand-400" : "text-gray-500 dark:text-gray-400")}
              title={pushConnected ? t("powerLiveHint") : t("powerPollingHint")}
            >
              <span className={cn("h-2 w-2 rounded-full", pushConnected ? "animate-pulse bg-brand-500" : "bg-gray-400")} />
              {pushConnected ? t("powerLive") : t("powerPolling")}
            </span>
            {live?.device && (
              <StatusBadge status={live.device.isOnline ? "online" : "offline"} label={live.device.isOnline ? t("mqttOnline") : t("mqttOffline")} pulse={live.device.isOnline} />
            )}
            <button type="button" onClick={() => { loadLive(); loadHistory(range); }} className="flex h-9 w-9 items-center justify-center rounded-lg border border-gray-200 text-gray-500 transition hover:bg-gray-50 hover:text-gray-800 dark:border-gray-800 dark:text-gray-400 dark:hover:bg-white/5 dark:hover:text-white" title={t("msgRefresh")} aria-label={t("msgRefresh")}>
              <RefreshCw className="h-4 w-4" />
            </button>
          </>
        }
      />

      {liveError && !live ? (
        <Panel><EmptyState icon={<ZapOff className="h-6 w-6" />} title={t("powerLoadError")} /></Panel>
      ) : !live ? (
        <Panel bodyClassName="p-5"><SkeletonRows rows={3} /></Panel>
      ) : !latest ? (
        <Panel><EmptyState icon={<ZapOff className="h-6 w-6" />} title={t("powerNoData")} /></Panel>
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-3">
            <StatTile
              label={t("powerMains")}
              icon={latest.mains ? <Zap className="h-5 w-5" /> : <ZapOff className="h-5 w-5" />}
              value={<StatusBadge status={latest.mains ? "connected" : "disconnected"} label={latest.mains ? t("powerMainsOn") : t("powerMainsOff")} />}
            />
            <StatTile label={t("powerTotal")} icon={<Gauge className="h-5 w-5" />} value={<span>{fmt(total ?? 0)} <span className="text-sm font-normal text-gray-500 dark:text-gray-400">{mA}</span></span>} />
            <StatTile label={t("powerUpdated")} icon={<Clock className="h-5 w-5" />} value={<RelTime iso={latest.ts} />} />
          </div>

          {/* Channel tiles: swatch + name + live value; the swatch matches the channel's chart below. */}
          <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-6">
            {latest.ch.map((v, i) => (
              <div key={i} className="rounded-2xl border border-gray-200 bg-white p-4 shadow-theme-xs dark:border-gray-800 dark:bg-gray-900/60">
                <span className="flex items-center gap-2 text-xs font-medium text-gray-500 dark:text-gray-400">
                  <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: colors[i] }} />
                  {labels[i]}
                </span>
                <span className="mt-2 block text-2xl font-bold tabular-nums text-gray-900 dark:text-white">
                  {fmt(v)} <span className="text-sm font-normal text-gray-500 dark:text-gray-400">{mA}</span>
                </span>
                <span className={cn("mt-1 block text-xs", v === 0 ? "text-gray-400 dark:text-gray-500" : "text-success-600 dark:text-success-400")}>
                  {v === 0 ? t("powerIdle") : t("powerDrawing")}
                </span>
              </div>
            ))}
          </div>
        </>
      )}

      <Panel
        className="mt-6"
        title={t("powerHistory")}
        description={history ? t("powerHistoryDesc").replace("{n}", fmt(history.samples)) : undefined}
        actions={<FilterPills items={ranges} value={range} onChange={setRange} />}
        bodyClassName="p-4 sm:p-5"
      >
        {!history ? (
          <SkeletonRows rows={6} />
        ) : !series || history.points.length === 0 ? (
          <EmptyState icon={<LineChart className="h-6 w-6" />} title={t("powerNoHistory")} />
        ) : (
          <>
            <p className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300">
              <span className="h-2.5 w-2.5 rounded-full" style={{ background: totalColor }} />{t("powerTotal")}
            </p>
            <PowerChart name={t("powerTotal")} color={totalColor} data={series.total} outages={history.outages} outageLabel={t("powerOutage")} unit={mA} height={280} />
            {history.outages.length > 0 && (
              <p className="mt-2 flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
                <span className="h-3 w-5 rounded-sm bg-error-500/15 ring-1 ring-error-500/30" />
                {t("powerOutageNote")}
              </p>
            )}

            <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {series.channels.map((data, i) => (
                <div key={i} className="rounded-xl border border-gray-100 p-3 dark:border-gray-800">
                  <p className="flex items-center gap-2 px-1 text-xs font-medium text-gray-600 dark:text-gray-400">
                    <span className="h-2.5 w-2.5 rounded-full" style={{ background: colors[i] }} />{labels[i]}
                  </p>
                  <PowerChart compact name={labels[i]} color={colors[i]} data={data} outages={history.outages} outageLabel={t("powerOutage")} unit={mA} height={150} axis={series.axis} />
                </div>
              ))}
            </div>

            {/* Table view of the same range: exact numbers without hovering. */}
            {history.stats && (
              <div className="mt-5 overflow-x-auto">
                <table className="w-full min-w-[420px] text-sm">
                  <thead>
                    <tr className="border-b border-gray-100 text-xs text-gray-500 dark:border-gray-800 dark:text-gray-400">
                      <th className="py-2 text-start font-medium">{t("powerChannel")}</th>
                      <th className="py-2 text-end font-medium">{t("powerNow")}</th>
                      <th className="py-2 text-end font-medium">{t("powerAvg")}</th>
                      <th className="py-2 text-end font-medium">{t("powerMax")}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {history.stats.map((s, i) => (
                      <tr key={i} className="border-b border-gray-50 last:border-0 dark:border-gray-800/60">
                        <td className="py-2">
                          <span className="flex items-center gap-2 text-gray-700 dark:text-gray-300">
                            <span className="h-2.5 w-2.5 rounded-full" style={{ background: colors[i] }} />
                            {labels[i]}
                          </span>
                        </td>
                        <td className="py-2 text-end tabular-nums text-gray-900 dark:text-white">{latest ? `${fmt(latest.ch[i])} ${mA}` : "—"}</td>
                        <td className="py-2 text-end tabular-nums text-gray-700 dark:text-gray-300">{fmt(s.avg)} {mA}</td>
                        <td className="py-2 text-end tabular-nums text-gray-700 dark:text-gray-300">{fmt(s.max)} {mA}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}
      </Panel>
    </div>
  );
}
