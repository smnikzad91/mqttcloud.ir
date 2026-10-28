"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { MessagesSquare, Search, RefreshCw, Braces } from "lucide-react";
import { useT } from "@/i18n/useT";
import { useLanguage } from "@/context/LanguageContext";
import { getJson } from "@/lib/getJson";
import { inRange } from "@/lib/dateRange";
import { formatRelative, useNow } from "@/lib/relativeTime";
import DateRangeFilter from "@/components/user-dashboard/DateRangeFilter";
import { Switch } from "@/components/dashboard/OrderedList";
import { PageHeader, Panel, EmptyState, SkeletonRows, Drawer, CopyChip, inputClass, buttonClass, cn, useFormatNumber } from "@/components/dashboard/ui";

type Payload = { id: string; clientName: string; topic: string; payload: string; createdAt: string };

const REFRESH_MS = 10_000;

/** Pretty-prints JSON payloads; anything else is shown verbatim. */
function pretty(raw: string): { text: string; json: boolean } {
  try {
    return { text: JSON.stringify(JSON.parse(raw), null, 2), json: true };
  } catch {
    return { text: raw, json: false };
  }
}

/** Minimal JSON highlighter for already-pretty-printed text: keys, strings, numbers, literals. */
function highlight(json: string): React.ReactNode[] {
  const re = /("(?:\\.|[^"\\])*")(\s*:)?|\b(true|false|null)\b|(-?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?)/g;
  const out: React.ReactNode[] = [];
  let last = 0;
  let m: RegExpExecArray | null;
  while ((m = re.exec(json))) {
    if (m.index > last) out.push(json.slice(last, m.index));
    const [tok, str, colon, lit, num] = m;
    if (str) {
      out.push(<span key={m.index} className={colon ? "text-[#8ab4f8]" : "text-[#a5d6a7]"}>{str}</span>);
      if (colon) out.push(colon);
    } else if (lit) out.push(<span key={m.index} className="text-[#ce93d8]">{lit}</span>);
    else if (num) out.push(<span key={m.index} className="text-[#ffcc80]">{num}</span>);
    else out.push(tok);
    last = m.index + tok.length;
  }
  out.push(json.slice(last));
  return out;
}

/** user/sensors/temp → segments, with the last one emphasised. */
function TopicPath({ topic }: { topic: string }) {
  const parts = topic.split("/");
  return (
    <span dir="ltr" className="inline-flex min-w-0 flex-wrap items-center font-mono-signal text-[13px]">
      {parts.map((p, i) => (
        <span key={i} className="inline-flex items-center">
          {i > 0 && <span className="px-0.5 text-gray-300 dark:text-gray-600">/</span>}
          <span className={i === parts.length - 1 ? "font-semibold text-gray-900 dark:text-white" : "text-gray-500 dark:text-gray-400"}>{p}</span>
        </span>
      ))}
    </span>
  );
}

function Inspector({ msg }: { msg: Payload }) {
  const t = useT();
  const { lang } = useLanguage();
  const shown = pretty(msg.payload);
  return (
    <div className="space-y-4">
      <div>
        <p className="mb-1 text-xs text-gray-500 dark:text-gray-400">{t("mqttTopic")}</p>
        <div className="flex items-start justify-between gap-2"><TopicPath topic={msg.topic} /><CopyChip value={msg.topic} label={t("copyCardNumber")} /></div>
      </div>
      <dl className="grid grid-cols-2 gap-3 text-sm">
        <div><dt className="text-xs text-gray-500 dark:text-gray-400">{t("mqttClientName")}</dt><dd className="mt-1 truncate font-mono-signal text-gray-900 dark:text-white"><bdi>{msg.clientName}</bdi></dd></div>
        <div>
          <dt className="text-xs text-gray-500 dark:text-gray-400">{t("msgReceived")}</dt>
          <dd className="mt-1 text-gray-700 dark:text-gray-200">{new Date(msg.createdAt).toLocaleString(lang === "fa" ? "fa-IR" : "en-US", { dateStyle: "medium", timeStyle: "medium" })}</dd>
        </div>
      </dl>
      <div>
        <div className="mb-1.5 flex items-center justify-between gap-2">
          <span className="inline-flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400">
            {shown.json && <Braces className="h-3.5 w-3.5" />}{t("msgPayload")}
            <span dir="ltr" className="font-mono-signal">· {msg.payload.length} B</span>
          </span>
          <CopyChip value={msg.payload} label={t("copyCardNumber")} />
        </div>
        <pre dir="ltr" className="max-h-[55vh] overflow-auto rounded-xl border border-gray-800 bg-gray-950 p-4 text-start font-mono-signal text-[12.5px] leading-relaxed text-gray-200">
          <code>{shown.json ? highlight(shown.text) : shown.text}</code>
        </pre>
      </div>
    </div>
  );
}

export default function UserMqttMessagesPage() {
  const t = useT();
  const { lang } = useLanguage();
  const fmt = useFormatNumber();
  const now = useNow(15_000);

  const [payloads, setPayloads] = useState<Payload[] | null>(null);
  const [failed, setFailed] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [updatedAt, setUpdatedAt] = useState<number | null>(null);
  const [auto, setAuto] = useState(false);
  const [query, setQuery] = useState("");
  const [client, setClient] = useState("all");
  const [topic, setTopic] = useState<string | null>(null);
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);

  const load = useCallback(async () => {
    setRefreshing(true);
    const p = await getJson<Payload[]>("/api/user/mqtt/payloads");
    setRefreshing(false);
    setFailed(!p);
    if (p) { setPayloads(p); setUpdatedAt(Date.now()); }
    else setPayloads((prev) => prev ?? []);
  }, []);
  useEffect(() => { queueMicrotask(load); }, [load]);

  // Messages have no live push, so offer polling while the tab is visible.
  useEffect(() => {
    if (!auto) return;
    const id = setInterval(() => { if (document.visibilityState === "visible") load(); }, REFRESH_MS);
    return () => clearInterval(id);
  }, [auto, load]);

  const all = useMemo(() => payloads ?? [], [payloads]);
  const clientNames = useMemo(() => [...new Set(all.map((p) => p.clientName))].sort(), [all]);
  const topTopics = useMemo(() => {
    const counts = new Map<string, number>();
    for (const p of all) counts.set(p.topic, (counts.get(p.topic) ?? 0) + 1);
    return [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 6);
  }, [all]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return all.filter((p) =>
      (client === "all" || p.clientName === client) &&
      (!topic || p.topic === topic) &&
      (!q || p.topic.toLowerCase().includes(q) || p.payload.toLowerCase().includes(q)) &&
      inRange(p.createdAt, dateFrom, dateTo));
  }, [all, query, client, topic, dateFrom, dateTo]);

  const selected = filtered.find((p) => p.id === selectedId) ?? filtered[0] ?? null;
  const filtersActive = !!query || client !== "all" || !!topic || !!dateFrom || !!dateTo;

  const select = (p: Payload) => {
    setSelectedId(p.id);
    // Below xl there's no side inspector, so open it as a drawer.
    if (window.matchMedia("(max-width: 1279px)").matches) setDrawerOpen(true);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title={t("mqttPayloads")}
        description={t("mqttPayloadsDesc")}
        actions={
          <>
            <label className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300">
              <Switch checked={auto} onChange={setAuto} label={t("msgAutoRefresh")} />{t("msgAutoRefresh")}
            </label>
            <button type="button" onClick={load} disabled={refreshing} className={buttonClass("secondary")}>
              <RefreshCw className={cn("h-4 w-4", refreshing && "animate-spin")} />{t("msgRefresh")}
            </button>
          </>
        }
      />

      <Panel bodyClassName="p-0">
        <div className="space-y-3 border-b border-gray-100 px-5 py-4 dark:border-gray-800">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div className="flex flex-1 flex-wrap items-center gap-3">
              <div className="relative w-full sm:w-72">
                <Search className="pointer-events-none absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" aria-hidden />
                <input type="search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder={t("msgSearch")} aria-label={t("msgSearch")} className={cn(inputClass, "h-9 ps-9")} />
              </div>
              {clientNames.length > 1 && (
                <select aria-label={t("mqttClientName")} value={client} onChange={(e) => setClient(e.target.value)} className="h-9 rounded-lg border border-gray-200 bg-white px-2 text-xs text-gray-700 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200">
                  <option value="all">{t("allDevices")}</option>
                  {clientNames.map((n) => <option key={n} value={n}>{n}</option>)}
                </select>
              )}
            </div>
            <DateRangeFilter from={dateFrom} to={dateTo} onFromChange={setDateFrom} onToChange={setDateTo} />
          </div>
          {topTopics.length > 1 && (
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="me-1 text-xs text-gray-500 dark:text-gray-400">{t("msgTopTopics")}:</span>
              {topTopics.map(([tp, n]) => (
                <button
                  key={tp}
                  type="button"
                  onClick={() => setTopic(topic === tp ? null : tp)}
                  aria-pressed={topic === tp}
                  dir="ltr"
                  className={cn(
                    "inline-flex items-center gap-1.5 rounded-lg border px-2 py-1 font-mono-signal text-xs transition",
                    topic === tp ? "border-brand-500 bg-brand-50 text-brand-700 dark:bg-brand-500/15 dark:text-brand-300" : "border-gray-200 text-gray-600 hover:border-gray-300 dark:border-gray-700 dark:text-gray-300",
                  )}
                >
                  {tp}<span className="text-[10px] opacity-60">{fmt(n)}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        {payloads === null ? <div className="p-5"><SkeletonRows rows={6} /></div>
          : failed && all.length === 0 ? <p className="p-5 text-sm text-error-600 dark:text-error-400">{t("ovLoadFailed")}</p>
          : all.length === 0 ? <EmptyState icon={<MessagesSquare className="h-6 w-6" />} title={t("noMqttPayloads")} />
          : filtered.length === 0 ? <EmptyState title={filtersActive ? t("noResultsInRange") : t("noMqttPayloads")} />
          : (
            <div className="grid xl:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
              <ul className="max-h-[70vh] divide-y divide-gray-100 overflow-y-auto xl:border-e xl:border-gray-100 dark:divide-gray-800 xl:dark:border-gray-800" role="listbox" aria-label={t("mqttPayloads")}>
                {filtered.map((p) => {
                  const on = selected?.id === p.id;
                  return (
                    <li key={p.id} role="option" aria-selected={on}>
                      <button
                        type="button"
                        onClick={() => select(p)}
                        className={cn("block w-full px-5 py-3 text-start transition", on ? "bg-brand-50 dark:bg-brand-500/10" : "hover:bg-gray-50 dark:hover:bg-white/[0.03]")}
                      >
                        <div className="flex items-center justify-between gap-3">
                          <TopicPath topic={p.topic} />
                          <time dateTime={p.createdAt} title={new Date(p.createdAt).toLocaleString(lang === "fa" ? "fa-IR" : "en-US")} className="shrink-0 text-xs text-gray-500 dark:text-gray-400">{formatRelative(p.createdAt, lang, now)}</time>
                        </div>
                        <div className="mt-1 flex items-center gap-2">
                          <span dir="ltr" className="shrink-0 rounded-md bg-gray-100 px-1.5 py-0.5 font-mono-signal text-[11px] text-gray-600 dark:bg-white/5 dark:text-gray-300">{p.clientName}</span>
                          <span dir="ltr" className="truncate font-mono-signal text-xs text-gray-500 dark:text-gray-400">{p.payload}</span>
                        </div>
                      </button>
                    </li>
                  );
                })}
              </ul>
              <div className="hidden p-5 xl:block">
                {selected ? <Inspector msg={selected} /> : <EmptyState title={t("msgSelectHint")} />}
              </div>
            </div>
          )}

        <p className="flex flex-wrap items-center justify-between gap-2 border-t border-gray-100 px-5 py-3 text-xs text-gray-400 dark:border-gray-800 dark:text-gray-500">
          <span>{t("msgLatestNote")}</span>
          {updatedAt && <span>{fmt(filtered.length)} {t("msgShown")} · {t("msgUpdatedAt")} {formatRelative(new Date(updatedAt).toISOString(), lang, now)}</span>}
        </p>
      </Panel>

      <Drawer open={drawerOpen && !!selected} onClose={() => setDrawerOpen(false)} title={t("msgDetails")}>
        {selected && <Inspector msg={selected} />}
      </Drawer>
    </div>
  );
}
