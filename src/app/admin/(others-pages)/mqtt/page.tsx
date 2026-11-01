"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import type { ColDef, ICellRendererParams } from "ag-grid-community";
import { Search, Power, Trash2, KeyRound, Cpu, Activity, RefreshCw } from "lucide-react";
import { useT } from "@/i18n/useT";
import { useLanguage } from "@/context/LanguageContext";
import { getJson } from "@/lib/getJson";
import DataGrid, { MonoCell, DateCell, StatusCell } from "@/components/dashboard/DataGrid";
import { OwnerCell, RelativeCell, RelTime, readParam, fromControl, type Owner } from "@/components/admin/AdminParts";
import { PageHeader, Panel, StatTile, EmptyState, SkeletonRows, FilterPills, ConfirmDialog, StatusBadge, inputClass, cn, useFormatNumber } from "@/components/dashboard/ui";

type Credential = { id: string; username: string; isActive: boolean; maxConnection: number; createdAt: string; user: Owner };
type CredRow = Credential & { devices: number; online: number };
type Client = { id: string; clientName: string; username: string; isOnline: boolean; lastSeenAt: string | null; createdAt: string; user: Owner };
type ActivityRow = { id: string; clientName: string; event: "connect" | "disconnect"; createdAt: string; user: Owner };
type Tab = "credentials" | "clients" | "activity";

type Ctx = {
  isRTL: boolean;
  t: ReturnType<typeof useT>;
  neverLabel: string;
  statusLabels: Record<string, string>;
  onToggle: (c: Credential) => void;
  onDelete: (c: Credential) => void;
};

function DevicesCell({ data, context }: ICellRendererParams<CredRow> & { context: Ctx }) {
  if (!data) return null;
  return (
    <div className="flex h-full items-center gap-2 text-sm">
      <span className="font-medium text-gray-900 dark:text-white" dir="ltr">{data.devices} <span className="font-normal text-gray-400">/ {data.maxConnection}</span></span>
      {data.online > 0 && <StatusBadge status="online" label={`${data.online} ${context.t("amOnlineNow")}`} />}
    </div>
  );
}

function CredActions({ data, context }: ICellRendererParams<CredRow> & { context: Ctx }) {
  if (!data) return null;
  const btn = "flex h-8 w-8 items-center justify-center rounded-lg text-gray-500 transition hover:bg-gray-100 hover:text-gray-800 dark:text-gray-400 dark:hover:bg-white/5 dark:hover:text-white";
  const label = data.isActive ? context.t("suspend") : context.t("unsuspend");
  return (
    <div className="flex h-full items-center justify-end gap-1">
      <button type="button" className={btn} onClick={() => context.onToggle(data)} title={label} aria-label={label}><Power className="h-4 w-4" /></button>
      <button type="button" className={cn(btn, "hover:!bg-error-50 hover:!text-error-600 dark:hover:!bg-error-500/10")} onClick={() => context.onDelete(data)} title={context.t("delete")} aria-label={context.t("delete")}><Trash2 className="h-4 w-4" /></button>
    </div>
  );
}

const matchOwner = (o: Owner, q: string) => !!o && (o.name.toLowerCase().includes(q) || o.email.toLowerCase().includes(q));

export default function AdminMqttPage() {
  const t = useT();
  const { lang } = useLanguage();
  const isRTL = lang === "fa";
  const fmt = useFormatNumber();

  const [creds, setCreds] = useState<Credential[] | null>(null);
  const [clients, setClients] = useState<Client[] | null>(null);
  const [activity, setActivity] = useState<ActivityRow[] | null>(null);
  const [tab, setTab] = useState<Tab>("credentials");
  const [query, setQuery] = useState("");

  const [updatedAt, setUpdatedAt] = useState<string | null>(null);
  const load = useCallback(() => Promise.all([
    getJson<Credential[]>("/api/admin/mqtt/credentials").then((d) => setCreds(d ?? [])),
    getJson<Client[]>("/api/admin/mqtt/clients").then((d) => setClients(d ?? [])),
    getJson<ActivityRow[]>("/api/admin/mqtt/activity").then((d) => setActivity(d ?? [])),
  ]).then(() => setUpdatedAt(new Date().toISOString())), []);
  useEffect(() => { queueMicrotask(load); }, [load]);
  // Deep link from other admin pages: /admin/mqtt?q=<username or email>.
  useEffect(() => { const v = readParam("q"); if (v) queueMicrotask(() => setQuery(v)); }, []);
  // Live-ish: refresh every 20s while the page is visible.
  useEffect(() => {
    const id = setInterval(() => { if (document.visibilityState === "visible") load(); }, 20_000);
    return () => clearInterval(id);
  }, [load]);

  // Suspend asks first (it locks a customer's devices out); re-activating doesn't.
  const [confirm, setConfirm] = useState<{ kind: "suspend" | "delete"; cred: Credential } | null>(null);
  const [busy, setBusy] = useState(false);
  const setActive = useCallback(async (c: Credential, isActive: boolean) => {
    const res = await fetch(`/api/admin/mqtt/credentials/${c.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ isActive }) });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) { toast.error(data.error || t("saveError")); return false; }
    toast.success(isActive ? t("mqttCredentialUnsuspended") : t("mqttCredentialSuspended"));
    load();
    return true;
  }, [load, t]);
  const onToggle = useCallback((c: Credential) => {
    if (c.isActive) setConfirm({ kind: "suspend", cred: c });
    else setActive(c, true);
  }, [setActive]);
  const onDelete = useCallback((c: Credential) => setConfirm({ kind: "delete", cred: c }), []);
  const runConfirm = async () => {
    if (!confirm) return;
    setBusy(true);
    if (confirm.kind === "suspend") {
      if (await setActive(confirm.cred, false)) setConfirm(null);
    } else {
      const res = await fetch(`/api/admin/mqtt/credentials/${confirm.cred.id}`, { method: "DELETE" });
      const data = await res.json().catch(() => ({}));
      if (res.ok) { toast.success(t("mqttCredentialDeleted")); setConfirm(null); load(); }
      else toast.error(data.error || t("saveError"));
    }
    setBusy(false);
  };

  const q = query.trim().toLowerCase();
  const credRows = useMemo<CredRow[]>(() => {
    // Registered/online devices per credential set, matched on owner + username.
    const per = new Map<string, { devices: number; online: number }>();
    for (const c of clients ?? []) {
      const k = `${c.user?.email}|${c.username}`;
      const v = per.get(k) ?? { devices: 0, online: 0 };
      v.devices++; if (c.isOnline) v.online++;
      per.set(k, v);
    }
    return (creds ?? [])
      .filter((c) => !q || c.username.toLowerCase().includes(q) || matchOwner(c.user, q))
      .map((c) => ({ ...c, ...(per.get(`${c.user?.email}|${c.username}`) ?? { devices: 0, online: 0 }) }));
  }, [creds, clients, q]);
  const clientRows = useMemo(() => (clients ?? []).filter((c) => !q || c.clientName.toLowerCase().includes(q) || c.username.toLowerCase().includes(q) || matchOwner(c.user, q)), [clients, q]);
  const activityRows = useMemo(() => (activity ?? []).filter((a) => !q || a.clientName.toLowerCase().includes(q) || matchOwner(a.user, q)), [activity, q]);

  const credCols = useMemo<ColDef<CredRow>[]>(() => [
    { field: "user", headerName: t("amOwner"), flex: 1.4, minWidth: 200, sortable: false, cellRenderer: OwnerCell },
    { field: "username", headerName: t("mqttUsername"), flex: 1, minWidth: 150, cellRenderer: MonoCell },
    { field: "isActive", headerName: t("finStatus"), width: 130, cellRenderer: StatusCell, valueGetter: (p) => (p.data?.isActive ? "active" : "suspended") },
    { field: "devices", headerName: t("amDevicesOfMax"), width: 190, cellRenderer: DevicesCell },
    { field: "createdAt", headerName: t("mqCreated"), width: 130, sort: "desc", cellRenderer: DateCell },
    { colId: "actions", headerName: "", width: 100, pinned: "right", sortable: false, cellRenderer: CredActions },
  ], [t]);
  const clientCols = useMemo<ColDef<Client>[]>(() => [
    { field: "user", headerName: t("amOwner"), flex: 1.3, minWidth: 200, sortable: false, cellRenderer: OwnerCell },
    { field: "clientName", headerName: t("mqttClientName"), flex: 1, minWidth: 150, cellRenderer: MonoCell },
    { field: "username", headerName: t("mqttUsername"), flex: 1, minWidth: 130, cellRenderer: MonoCell },
    { field: "isOnline", headerName: t("finStatus"), width: 120, cellRenderer: StatusCell, valueGetter: (p) => (p.data?.isOnline ? "online" : "offline"), sort: "desc" },
    { field: "lastSeenAt", headerName: t("mqttLastSeen"), width: 160, cellRenderer: RelativeCell },
  ], [t]);
  const activityCols = useMemo<ColDef<ActivityRow>[]>(() => [
    { field: "user", headerName: t("amOwner"), flex: 1.3, minWidth: 200, sortable: false, cellRenderer: OwnerCell },
    { field: "clientName", headerName: t("mqttClientName"), flex: 1, minWidth: 150, cellRenderer: MonoCell },
    { field: "event", headerName: t("colEvent"), width: 140, cellRenderer: StatusCell },
    { field: "createdAt", headerName: t("colTime"), width: 160, sort: "desc", cellRenderer: RelativeCell },
  ], [t]);

  const context = useMemo<Ctx>(() => ({
    isRTL, t, neverLabel: t("mqttNeverSeen"), onToggle, onDelete,
    statusLabels: {
      active: t("mqttActive"), suspended: t("mqttSuspended"), online: t("mqttOnline"), offline: t("mqttOffline"),
      connect: t("eventConnect"), disconnect: t("eventDisconnect"),
    },
  }), [isRTL, t, onToggle, onDelete]);

  const online = (clients ?? []).filter((c) => c.isOnline).length;
  const suspended = (creds ?? []).filter((c) => !c.isActive).length;
  const loading = tab === "credentials" ? creds === null : tab === "clients" ? clients === null : activity === null;

  return (
    <div className="space-y-6">
      <PageHeader title={t("adminMqttTitle")} description={t("adminMqttDesc")} />

      <div className="grid gap-4 sm:grid-cols-3">
        <StatTile icon={<KeyRound className="h-5 w-5" />} label={t("mqttTabCredentials")} value={creds ? fmt(creds.length) : "…"} hint={creds && suspended > 0 && <>{fmt(suspended)} {t("mqttSuspended")}</>} />
        <StatTile icon={<Cpu className="h-5 w-5" />} label={t("mqttTabClients")} value={clients ? <span dir="ltr">{fmt(online)} <span className="text-base font-medium text-gray-400">/ {fmt(clients.length)}</span></span> : "…"} hint={clients && <StatusBadge status="online" label={`${fmt(online)} ${t("amOnlineNow")}`} pulse={online > 0} />} />
        <StatTile icon={<Activity className="h-5 w-5" />} label={t("mqttTabActivity")} value={activity ? fmt(activity.length) : "…"} />
      </div>

      <Panel bodyClassName="p-0">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-100 px-5 py-4 dark:border-gray-800">
          <FilterPills<Tab>
            value={tab}
            onChange={setTab}
            items={[
              { key: "credentials", label: t("mqttTabCredentials"), count: credRows.length },
              { key: "clients", label: t("mqttTabClients"), count: clientRows.length },
              { key: "activity", label: t("mqttTabActivity"), count: activityRows.length },
            ]}
          />
          <div className="flex w-full items-center gap-2 sm:w-auto">
            {updatedAt && <span className="hidden whitespace-nowrap text-xs text-gray-400 lg:inline">{t("msgUpdatedAt")} <RelTime iso={updatedAt} /></span>}
            <button type="button" onClick={load} title={t("msgRefresh")} aria-label={t("msgRefresh")} className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-gray-200 text-gray-500 transition hover:bg-gray-50 hover:text-gray-800 dark:border-gray-700 dark:text-gray-400 dark:hover:bg-white/5 dark:hover:text-white"><RefreshCw className="h-4 w-4" /></button>
          <div className="relative w-full sm:w-72">
            <Search className="pointer-events-none absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" aria-hidden />
            <input type="search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder={t("amSearch")} aria-label={t("amSearch")} className={cn(inputClass, "h-9 ps-9")} />
          </div>
          </div>
        </div>

        {loading ? <div className="p-5"><SkeletonRows rows={6} /></div>
          : tab === "credentials" ? (credRows.length ? <DataGrid rows={credRows} columns={credCols} context={context} rowHeight={60} rowClass="cursor-pointer" onRowClicked={(e) => { if (e.data && !fromControl(e.event)) { setTab("clients"); setQuery(e.data.username); } }} /> : <EmptyState icon={<KeyRound className="h-6 w-6" />} title={t("noMqttCredentials")} />)
          : tab === "clients" ? (clientRows.length ? <DataGrid rows={clientRows} columns={clientCols} context={context} rowHeight={60} /> : <EmptyState icon={<Cpu className="h-6 w-6" />} title={t("noMqttClients")} />)
          : (activityRows.length ? <DataGrid rows={activityRows} columns={activityCols} context={context} rowHeight={60} /> : <EmptyState icon={<Activity className="h-6 w-6" />} title={t("noMqttActivity")} />)}
      </Panel>

      <ConfirmDialog
        open={!!confirm}
        onClose={() => setConfirm(null)}
        onConfirm={runConfirm}
        busy={busy}
        title={confirm?.kind === "suspend" ? t("amSuspendTitle") : t("mqDeleteCredTitle")}
        subject={confirm && <><span dir="ltr" className="font-mono-signal">{confirm.cred.username}</span>{confirm.cred.user && <span className="font-normal text-gray-500"> · {confirm.cred.user.name || confirm.cred.user.email}</span>}</>}
        warning={confirm?.kind === "suspend" ? t("amSuspendWarn") : t("mqDeleteCredWarn")}
        confirmLabel={confirm?.kind === "suspend" ? t("suspend") : t("delete")}
        cancelLabel={t("cancel")}
      />
    </div>
  );
}
