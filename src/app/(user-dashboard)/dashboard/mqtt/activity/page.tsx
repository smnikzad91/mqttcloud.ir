"use client";

// Device-centric activity: a status board (current state, how long, 24h
// connection bar, uptime) on top, and a compact day-grouped event log below
// where each disconnect says how long the session lasted and each reconnect
// how long the device was away.

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Activity as ActivityIcon, Plug, Unplug, X } from "lucide-react";
import { useT } from "@/i18n/useT";
import { useLanguage } from "@/context/LanguageContext";
import { useMqttLive, type MqttActivityEvent } from "@/context/MqttLiveContext";
import { getJson } from "@/lib/getJson";
import { formatRelative, useNow } from "@/lib/relativeTime";
import { PageHeader, Panel, EmptyState, SkeletonRows, FilterPills, StatusBadge, cn } from "@/components/dashboard/ui";

type Activity = { id: string; clientName: string; event: "connect" | "disconnect"; createdAt: string };
type Client = { id: string; clientName: string; isOnline: boolean; lastSeenAt: string | null };
type EventFilter = "all" | "connect" | "disconnect";
type Range = "24h" | "7d" | "all";

const HOUR = 36e5;
const DAY = 24 * HOUR;
const API_LIMIT = 100; // /api/user/mqtt/activity returns the latest 100 events
const ms = (iso: string) => new Date(iso).getTime();

/** Connected intervals for one device inside [from, to], from its events (any order). */
function sessionsFor(events: Activity[], isOnlineNow: boolean, from: number, to: number) {
  const evs = events.filter((e) => ms(e.createdAt) >= from).sort((a, b) => ms(a.createdAt) - ms(b.createdAt));
  // State at `from`: a first disconnect means it was online before; no events means its current state held all along.
  let online = evs.length ? evs[0].event === "disconnect" : isOnlineNow;
  let start = from;
  const out: [number, number][] = [];
  for (const e of evs) {
    const at = ms(e.createdAt);
    if (e.event === "connect" && !online) { online = true; start = at; }
    else if (e.event === "disconnect" && online) { online = false; out.push([start, at]); }
  }
  if (online) out.push([start, to]);
  return out;
}

export default function UserMqttActivityPage() {
  const t = useT();
  const { lang } = useLanguage();
  const locale = lang === "fa" ? "fa-IR" : "en-US";
  const now = useNow(30_000);

  const [activity, setActivity] = useState<Activity[] | null>(null);
  const [clients, setClients] = useState<Client[] | null>(null);
  const [failed, setFailed] = useState(false);
  const [eventFilter, setEventFilter] = useState<EventFilter>("all");
  const [range, setRange] = useState<Range>("all");
  const [device, setDevice] = useState<string | null>(null);

  // Events that arrived live get a brief highlight.
  const [fresh, setFresh] = useState<Set<string>>(new Set());
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  useEffect(() => () => timers.current.forEach(clearTimeout), []);

  useEffect(() => {
    getJson<Activity[]>("/api/user/mqtt/activity").then((a) => { setFailed(!a); setActivity(a ?? []); });
    getJson<Client[]>("/api/user/mqtt/clients").then((c) => setClients(c ?? []));
  }, []);

  const onLive = useCallback((e: MqttActivityEvent) => {
    setActivity((prev) => (prev ? [e, ...prev] : prev));
    setClients((prev) => prev?.map((c) => (c.clientName === e.clientName ? { ...c, isOnline: e.event === "connect", lastSeenAt: e.createdAt } : c)) ?? prev);
    setFresh((s) => new Set(s).add(e.id));
    timers.current.push(setTimeout(() => setFresh((s) => { const n = new Set(s); n.delete(e.id); return n; }), 4000));
  }, []);
  useMqttLive(onLive);

  const dur = useCallback((d: number) => {
    const m = Math.floor(d / 6e4);
    if (m < 1) return t("durLess");
    const h = Math.floor(m / 60);
    const n = (x: number) => x.toLocaleString(locale);
    const unit = (x: number, u: string) => (lang === "fa" ? `${n(x)} ${u}` : `${n(x)}${u}`); // "2h" vs "۲ ساعت"
    return h ? `${unit(h, t("durH"))}${m % 60 ? ` ${unit(m % 60, t("durM"))}` : ""}` : unit(m, t("durM"));
  }, [t, locale, lang]);

  const all = useMemo(() => activity ?? [], [activity]);
  const windowStart = now - DAY;
  // With a full page of events the oldest one bounds what we actually know.
  const knownFrom = all.length >= API_LIMIT ? Math.max(windowStart, Math.min(...all.map((a) => ms(a.createdAt)))) : windowStart;

  // ── Status board rows ───────────────────────────────────────────────────
  const board = useMemo(() => {
    const names = new Set([...(clients ?? []).map((c) => c.clientName), ...all.map((a) => a.clientName)]);
    return [...names].map((name) => {
      const c = clients?.find((x) => x.clientName === name);
      const evs = all.filter((a) => a.clientName === name);
      const online = c?.isOnline ?? evs[0]?.event === "connect";
      const sessions = sessionsFor(evs, online, knownFrom, now);
      const upMs = sessions.reduce((s, [a, b]) => s + (b - a), 0);
      const lastConnect = evs.find((e) => e.event === "connect");
      const lastSeen = c?.lastSeenAt ?? evs[0]?.createdAt ?? null;
      return {
        name, online, sessions, lastSeen,
        since: online && lastConnect ? ms(lastConnect.createdAt) : null,
        uptime: now > knownFrom ? Math.round((upMs / (now - knownFrom)) * 100) : 0,
      };
    }).sort((a, b) => Number(b.online) - Number(a.online) || a.name.localeCompare(b.name));
  }, [clients, all, knownFrom, now]);

  // ── Event log ───────────────────────────────────────────────────────────
  // For each event: how long the session that it ended lasted (disconnect),
  // or how long the device had been away (connect).
  const gaps = useMemo(() => {
    const info = new Map<string, number>();
    const byDevice = new Map<string, Activity[]>();
    for (const a of all) byDevice.set(a.clientName, [...(byDevice.get(a.clientName) ?? []), a]);
    for (const evs of byDevice.values()) {
      const asc = [...evs].sort((a, b) => ms(a.createdAt) - ms(b.createdAt));
      for (let i = 1; i < asc.length; i++) {
        if (asc[i].event !== asc[i - 1].event) info.set(asc[i].id, ms(asc[i].createdAt) - ms(asc[i - 1].createdAt));
      }
    }
    return info;
  }, [all]);

  const rangeStart = range === "24h" ? now - DAY : range === "7d" ? now - 7 * DAY : 0;
  const filtered = useMemo(
    () => all.filter((a) =>
      (eventFilter === "all" || a.event === eventFilter) &&
      (!device || a.clientName === device) &&
      ms(a.createdAt) >= rangeStart),
    [all, eventFilter, device, rangeStart],
  );

  const groups = useMemo(() => {
    const startOf = (x: number) => { const d = new Date(x); d.setHours(0, 0, 0, 0); return d.getTime(); };
    const today = startOf(now);
    const out: { key: number; label: string; items: Activity[] }[] = [];
    for (const a of filtered) {
      const d = startOf(ms(a.createdAt));
      const label = d === today ? t("actToday") : d === today - DAY ? t("actYesterday")
        : new Date(d).toLocaleDateString(locale, { weekday: "long", month: "long", day: "numeric" });
      const last = out[out.length - 1];
      if (last?.key === d) last.items.push(a);
      else out.push({ key: d, label, items: [a] });
    }
    return out;
  }, [filtered, now, locale, t]);

  const count = (e: EventFilter) => all.filter((a) => (e === "all" || a.event === e) && (!device || a.clientName === device) && ms(a.createdAt) >= rangeStart).length;
  const pct = (x: number) => `${((x - windowStart) / DAY) * 100}%`;
  const loading = activity === null || clients === null;

  return (
    <div className="space-y-6">
      <PageHeader title={t("mqttActivity")} description={t("mqttActivityDesc")} actions={<StatusBadge status="online" label={t("msgLive")} pulse />} />

      {/* Status board */}
      <Panel title={t("av2Devices")} description={t("av2DevicesHint")} bodyClassName="p-0">
        {loading ? <div className="p-5"><SkeletonRows rows={3} /></div>
          : board.length === 0 ? <EmptyState icon={<ActivityIcon className="h-6 w-6" />} title={t("noMqttClients")} />
          : (
            <>
              <ul className="divide-y divide-gray-100 dark:divide-gray-800">
                {board.map((d) => {
                  const on = device === d.name;
                  return (
                    <li key={d.name}>
                      <button
                        type="button"
                        onClick={() => setDevice(on ? null : d.name)}
                        aria-pressed={on}
                        className={cn("grid w-full grid-cols-1 items-center gap-x-5 gap-y-2 px-5 py-3 text-start transition md:grid-cols-[220px_1fr_64px]", on ? "bg-brand-50 dark:bg-brand-500/10" : "hover:bg-gray-50 dark:hover:bg-white/[0.03]")}
                      >
                        {/* Name + state */}
                        <div className="flex min-w-0 items-center gap-3">
                          <span className="relative flex h-2.5 w-2.5 shrink-0" aria-hidden>
                            {d.online && <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-success-400 opacity-60" />}
                            <span className={cn("relative inline-flex h-2.5 w-2.5 rounded-full", d.online ? "bg-success-500" : "bg-gray-300 dark:bg-gray-600")} />
                          </span>
                          <div className="min-w-0">
                            <p className="truncate font-mono-signal text-sm text-gray-900 dark:text-white"><bdi>{d.name}</bdi></p>
                            <p className={cn("truncate text-xs", d.online ? "text-success-600 dark:text-success-400" : "text-gray-500 dark:text-gray-400")}>
                              {d.online
                                ? (d.since ? t("av2OnlineFor").replace("{d}", dur(now - d.since)) : t("mqttOnline"))
                                : d.lastSeen ? `${t("av2OfflineSeen")} ${formatRelative(d.lastSeen, lang, now)}` : t("av2NeverConnected")}
                            </p>
                          </div>
                        </div>

                        {/* 24h connection bar; time runs toward the end edge */}
                        <div className="relative h-6 overflow-hidden rounded-md bg-gray-100 dark:bg-white/5" role="img" aria-label={`${t("av2Uptime")} ${d.uptime}%`}>
                          {knownFrom > windowStart && (
                            <div
                              className="absolute inset-y-0 start-0 bg-[repeating-linear-gradient(135deg,transparent_0_4px,rgba(127,127,127,0.18)_4px_6px)]"
                              style={{ width: pct(knownFrom) }}
                              title={t("av2Unknown")}
                            />
                          )}
                          {d.sessions.map(([a, b], i) => (
                            <div
                              key={i}
                              className="absolute inset-y-1 rounded-sm bg-success-500/85"
                              style={{ insetInlineStart: pct(a), width: `max(2px, calc(${pct(b)} - ${pct(a)}))` }}
                              title={`${new Date(a).toLocaleTimeString(locale, { hour: "2-digit", minute: "2-digit", hour12: false })} – ${new Date(b).toLocaleTimeString(locale, { hour: "2-digit", minute: "2-digit", hour12: false })} · ${dur(b - a)}`}
                            />
                          ))}
                        </div>

                        {/* Uptime */}
                        <p className="text-end text-sm font-semibold text-gray-900 dark:text-white">
                          {(d.uptime / 100).toLocaleString(locale, { style: "percent" })}<span className="sr-only"> {t("av2Uptime")}</span>
                        </p>
                      </button>
                    </li>
                  );
                })}
              </ul>
              {/* Axis under the bars (aligned with the bar column on md+) */}
              <div className="hidden grid-cols-[220px_1fr_64px] gap-x-5 border-t border-gray-100 px-5 py-2 text-[11px] text-gray-400 md:grid dark:border-gray-800">
                <span />
                <div className="flex justify-between"><span>{t("av2Ago24")}</span><span>{formatRelative(new Date(now - 12 * HOUR).toISOString(), lang, now)}</span><span>{t("av2Now")}</span></div>
                <span className="text-end">{t("av2Uptime")}</span>
              </div>
            </>
          )}
      </Panel>

      {/* Event log */}
      <Panel
        title={t("av2Log")}
        bodyClassName="p-0"
        actions={device && (
          <button type="button" onClick={() => setDevice(null)} className="inline-flex items-center gap-1.5 rounded-lg bg-brand-50 px-2.5 py-1 font-mono-signal text-xs font-semibold text-brand-700 transition hover:bg-brand-100 dark:bg-brand-500/15 dark:text-brand-300">
            <bdi>{device}</bdi><X className="h-3.5 w-3.5" aria-label={t("av2ShowAll")} />
          </button>
        )}
      >
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-100 px-5 py-3 dark:border-gray-800">
          <FilterPills<EventFilter>
            value={eventFilter}
            onChange={setEventFilter}
            items={[
              { key: "all", label: t("filterAllShort"), count: count("all") },
              { key: "connect", label: t("eventConnect"), count: count("connect") },
              { key: "disconnect", label: t("eventDisconnect"), count: count("disconnect") },
            ]}
          />
          <FilterPills<Range>
            value={range}
            onChange={setRange}
            items={[{ key: "24h", label: t("av2Range24") }, { key: "7d", label: t("av2Range7") }, { key: "all", label: t("av2RangeAll") }]}
          />
        </div>

        {activity === null ? <div className="p-5"><SkeletonRows rows={6} /></div>
          : failed ? <p className="p-5 text-sm text-error-600 dark:text-error-400">{t("ovLoadFailed")}</p>
          : all.length === 0 ? <EmptyState icon={<ActivityIcon className="h-6 w-6" />} title={t("noMqttActivity")} />
          : filtered.length === 0 ? <EmptyState title={t("noResultsInRange")} />
          : (
            <div>
              {groups.map((g) => (
                <section key={g.key}>
                  <h3 className="sticky top-16 z-[1] border-b border-gray-100 bg-gray-50/95 px-5 py-1.5 text-xs font-semibold text-gray-500 backdrop-blur dark:border-gray-800 dark:bg-gray-950/95 dark:text-gray-400">{g.label}</h3>
                  <ol className="divide-y divide-gray-100 dark:divide-gray-800">
                    {g.items.map((a) => {
                      const connect = a.event === "connect";
                      const gap = gaps.get(a.id);
                      return (
                        <li key={a.id} className={cn("flex items-center gap-3 px-5 py-2.5 transition-colors duration-700", fresh.has(a.id) && "bg-brand-50 dark:bg-brand-500/10")}>
                          <time dateTime={a.createdAt} title={formatRelative(a.createdAt, lang, now)} className="w-12 shrink-0 font-mono-signal text-xs text-gray-500 dark:text-gray-400">
                            {new Date(a.createdAt).toLocaleTimeString(locale, { hour: "2-digit", minute: "2-digit", hour12: false })}
                          </time>
                          <span className={cn("flex h-7 w-7 shrink-0 items-center justify-center rounded-full", connect ? "bg-success-50 text-success-600 dark:bg-success-500/15 dark:text-success-400" : "bg-error-50 text-error-600 dark:bg-error-500/15 dark:text-error-400")}>
                            {connect ? <Plug className="h-3.5 w-3.5" /> : <Unplug className="h-3.5 w-3.5" />}
                          </span>
                          <div className="min-w-0 flex-1 sm:flex sm:items-baseline sm:gap-2">
                            <button type="button" onClick={() => setDevice(device === a.clientName ? null : a.clientName)} className="truncate font-mono-signal text-sm text-gray-900 hover:text-brand-600 dark:text-white dark:hover:text-brand-400">
                              <bdi>{a.clientName}</bdi>
                            </button>
                            <span className={cn("block text-xs sm:inline sm:text-sm", connect ? "text-success-600 dark:text-success-400" : "text-error-600 dark:text-error-400")}>
                              {connect ? t("eventConnect") : t("eventDisconnect")}
                            </span>
                          </div>
                          {gap !== undefined && (
                            <span className="hidden shrink-0 rounded-md bg-gray-100 px-2 py-0.5 text-xs text-gray-600 sm:inline dark:bg-white/5 dark:text-gray-300">
                              {(connect ? t("av2BackAfter") : t("av2Session")).replace("{d}", dur(gap))}
                            </span>
                          )}
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
