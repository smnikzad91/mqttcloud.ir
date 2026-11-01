"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { Plus, KeyRound, Cpu, Trash2, RotateCcw, Pencil, Power, Search, Radio, ShieldCheck } from "lucide-react";
import { useT } from "@/i18n/useT";
import { useLanguage } from "@/context/LanguageContext";
import { useMqttLive, type MqttActivityEvent } from "@/context/MqttLiveContext";
import { getJson } from "@/lib/getJson";
import { formatRelative, useNow } from "@/lib/relativeTime";
import { MQTT_HOST, MQTT_PORT_TCP, MQTT_PORT_TLS, MQTT_WS_URL } from "@/lib/mqttEndpoints";
import { SNIPPET_TABS, buildSnippet, type SnippetId } from "@/lib/mqttSnippets";
import {
  PageHeader, Panel, CopyChip, StatusBadge, StatTile, EmptyState, SkeletonRows, QuotaMeter,
  Dialog, ConfirmDialog, Field, inputClass, buttonClass, cn, useFormatNumber,
} from "@/components/dashboard/ui";

type Credential = { id: string; username: string; isActive: boolean; planBlocked: boolean; maxConnection: number; createdAt: string };
type Client = { id: string; clientName: string; isOnline: boolean; lastSeenAt: string | null; createdAt: string; credential: { id: string; username: string } | null };
type PlanInfo = { limits: { maxUsers: number; clientsPerUser: number }; usage: { mqttUsers: number; clients: { mqttUserId: string; count: number }[] } };

const iconBtn = "flex h-8 w-8 items-center justify-center rounded-lg text-gray-500 transition hover:bg-gray-100 hover:text-gray-800 dark:text-gray-400 dark:hover:bg-white/5 dark:hover:text-white";
const dangerBtn = cn(iconBtn, "hover:!bg-error-50 hover:!text-error-600 dark:hover:!bg-error-500/10");

export default function UserMqttPage() {
  const t = useT();
  const { lang } = useLanguage();
  const fmt = useFormatNumber();
  const now = useNow();

  const [credentials, setCredentials] = useState<Credential[] | null>(null);
  const [clients, setClients] = useState<Client[] | null>(null);
  const [plan, setPlan] = useState<PlanInfo | null>(null);
  const [loadFailed, setLoadFailed] = useState(false);

  const load = useCallback(async () => {
    const [c, cl, p] = await Promise.all([
      getJson<Credential[]>("/api/user/mqtt/credentials"),
      getJson<Client[]>("/api/user/mqtt/clients"),
      getJson<PlanInfo>("/api/user/plan"),
    ]);
    setLoadFailed(!c || !cl);
    setCredentials(c ?? []);
    setClients(cl ?? []);
    setPlan(p);
  }, []);
  useEffect(() => { queueMicrotask(load); }, [load]);

  // Live online/offline as devices connect and disconnect.
  const onLive = useCallback((e: MqttActivityEvent) => {
    setClients((prev) => prev?.map((c) => (c.clientName === e.clientName ? { ...c, isOnline: e.event === "connect", lastSeenAt: e.createdAt } : c)) ?? prev);
  }, []);
  useMqttLive(onLive);

  const loading = credentials === null || clients === null;
  const perCred = plan?.limits.clientsPerUser;
  const devicesOf = (credId: string) => (clients ?? []).filter((c) => c.credential?.id === credId);
  const limitOf = (c: Credential) => perCred ?? c.maxConnection;
  const hasRoom = (c: Credential) => devicesOf(c.id).length < limitOf(c);
  const credFull = !!plan && plan.usage.mqttUsers >= plan.limits.maxUsers;
  const online = (clients ?? []).filter((c) => c.isOnline).length;
  const capacity = (credentials ?? []).reduce((s, c) => s + limitOf(c), 0);
  const anyRoom = (credentials ?? []).some(hasRoom);
  const seen = (iso: string | null) => (iso ? formatRelative(iso, lang, now) : t("mqttNeverSeen"));

  // Device search, applied inside each credential card.
  const [query, setQuery] = useState("");
  const q = query.trim().toLowerCase();
  const matches = (c: Client) => !q || c.clientName.toLowerCase().includes(q);
  const visibleCount = (clients ?? []).filter(matches).length;

  // ── Snippets ────────────────────────────────────────────────────────────
  const [snippetTab, setSnippetTab] = useState<SnippetId>("esp32");
  const [snippetCredId, setSnippetCredId] = useState("");
  const [snippetClientId, setSnippetClientId] = useState("");
  const snippetCred = credentials?.find((c) => c.id === snippetCredId) ?? credentials?.[0];
  const snippetClients = snippetCred ? devicesOf(snippetCred.id) : [];
  const snippetClient = snippetClients.find((c) => c.id === snippetClientId) ?? snippetClients[0];
  const snippet = buildSnippet(snippetTab, snippetCred?.username ?? "your_username", snippetClient?.clientName ?? "device-01");

  // ── Mutations ───────────────────────────────────────────────────────────
  const send = async (url: string, method: string, body?: unknown) => {
    const res = await fetch(url, { method, headers: body ? { "Content-Type": "application/json" } : undefined, body: body ? JSON.stringify(body) : undefined });
    const data = await res.json().catch(() => ({}));
    return { ok: res.ok, error: (data as { error?: string }).error };
  };

  const [credOpen, setCredOpen] = useState(false);
  const [credForm, setCredForm] = useState({ username: "", password: "" });
  const [credSaving, setCredSaving] = useState(false);
  const addCredential = async (e: React.FormEvent) => {
    e.preventDefault();
    setCredSaving(true);
    const r = await send("/api/user/mqtt/credentials", "POST", credForm);
    setCredSaving(false);
    if (!r.ok) return toast.error(r.error || t("saveError"));
    toast.success(t("mqttCredentialAdded"));
    setCredOpen(false);
    load();
  };

  const toggleActive = async (c: Credential) => {
    const r = await send(`/api/user/mqtt/credentials/${c.id}`, "PATCH", { isActive: !c.isActive });
    if (!r.ok) return toast.error(r.error || t("saveError"));
    toast.success(c.isActive ? t("mqttCredentialSuspended") : t("mqttCredentialUnsuspended"));
    load();
  };

  const [regen, setRegen] = useState<Credential | null>(null);
  const [regenPassword, setRegenPassword] = useState("");
  const [regenSaving, setRegenSaving] = useState(false);
  const regenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!regen) return;
    setRegenSaving(true);
    const r = await send(`/api/user/mqtt/credentials/${regen.id}`, "PATCH", { password: regenPassword });
    setRegenSaving(false);
    if (!r.ok) return toast.error(r.error || t("saveError"));
    toast.success(t("mqttPasswordRegenerated"));
    setRegen(null);
  };

  const [clientOpen, setClientOpen] = useState(false);
  const [clientForm, setClientForm] = useState({ mqttUserId: "", clientName: "" });
  const [clientSaving, setClientSaving] = useState(false);
  const openClient = (cred?: Credential) => {
    const target = cred ?? credentials?.find(hasRoom) ?? credentials?.[0];
    setClientForm({ mqttUserId: target?.id ?? "", clientName: "" });
    setClientOpen(true);
  };
  const addClient = async (e: React.FormEvent) => {
    e.preventDefault();
    setClientSaving(true);
    const r = await send("/api/user/mqtt/clients", "POST", clientForm);
    setClientSaving(false);
    if (!r.ok) return toast.error(r.error || t("saveError"));
    toast.success(t("mqttClientAdded"));
    setClientOpen(false);
    load();
  };

  const [rename, setRename] = useState<Client | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const [renameSaving, setRenameSaving] = useState(false);
  const doRename = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rename) return;
    setRenameSaving(true);
    const r = await send(`/api/user/mqtt/clients/${rename.id}`, "PATCH", { clientName: renameValue });
    setRenameSaving(false);
    if (!r.ok) return toast.error(r.error || t("saveError"));
    toast.success(t("mqttClientRenamed"));
    setRename(null);
    load();
  };

  const [deleting, setDeleting] = useState<{ kind: "cred"; item: Credential } | { kind: "client"; item: Client } | null>(null);
  const [deleteBusy, setDeleteBusy] = useState(false);
  const confirmDelete = async () => {
    if (!deleting) return;
    setDeleteBusy(true);
    const url = deleting.kind === "cred" ? `/api/user/mqtt/credentials/${deleting.item.id}` : `/api/user/mqtt/clients/${deleting.item.id}`;
    const r = await send(url, "DELETE");
    setDeleteBusy(false);
    if (!r.ok) return toast.error(r.error || t("saveError"));
    toast.success(deleting.kind === "cred" ? t("mqttCredentialDeleted") : t("mqttClientDeleted"));
    setDeleting(null);
    load();
  };

  const upgradeLink = <Link href="/dashboard/subscription" className="font-semibold text-brand-600 hover:underline dark:text-brand-400">{t("mqUpgrade")}</Link>;

  return (
    <div className="space-y-6">
      <PageHeader
        title={t("mqttDashboardTitle")}
        description={t("mqttDashboardDesc")}
        actions={
          <>
            <button type="button" onClick={() => { setCredForm({ username: "", password: "" }); setCredOpen(true); }} disabled={credFull || loading} className={buttonClass("secondary")}><KeyRound className="h-4 w-4" />{t("addMqttCredential")}</button>
            <button type="button" onClick={() => openClient()} disabled={loading || !credentials?.length || !anyRoom} className={buttonClass("primary")}><Plus className="h-4 w-4" />{t("brkAddDevice")}</button>
          </>
        }
      />

      {loadFailed && <p role="alert" className="rounded-xl border border-error-200 bg-error-50 p-3 text-sm text-error-700 dark:border-error-500/20 dark:bg-error-500/10 dark:text-error-400">{t("ovLoadFailed")}</p>}

      {/* At a glance */}
      <div className="grid gap-4 sm:grid-cols-3">
        <StatTile
          icon={<Radio className="h-5 w-5" />}
          label={t("brkOnline")}
          value={loading ? "…" : <span dir="ltr">{fmt(online)} <span className="text-base font-medium text-gray-400">/ {fmt(clients!.length)}</span></span>}
          hint={!loading && online > 0 && <StatusBadge status="online" label={t("msgLive")} pulse />}
        />
        <StatTile
          icon={<KeyRound className="h-5 w-5" />}
          label={t("ovCredentialSets")}
          value={!plan ? "…" : <span dir="ltr">{fmt(plan.usage.mqttUsers)} <span className="text-base font-medium text-gray-400">/ {fmt(plan.limits.maxUsers)}</span></span>}
          hint={credFull && <>{t("mqQuotaFull")} {upgradeLink}</>}
        />
        <StatTile
          icon={<Cpu className="h-5 w-5" />}
          label={t("brkRegistered")}
          value={loading ? "…" : <span dir="ltr">{fmt(clients!.length)} <span className="text-base font-medium text-gray-400">/ {fmt(capacity)}</span></span>}
          hint={!loading && !anyRoom && credentials!.length > 0 && <>{t("mqQuotaFull")} {upgradeLink}</>}
        />
      </div>

      {/* Credentials, each with its devices */}
      <Panel
        title={t("brkCredsDevices")}
        description={t("brkCredsDevicesDesc")}
        bodyClassName="p-0"
        actions={clients && clients.length > 5 && (
          <div className="relative w-full sm:w-56">
            <Search className="pointer-events-none absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" aria-hidden />
            <input type="search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder={t("brkSearchDevices")} aria-label={t("brkSearchDevices")} className={cn(inputClass, "h-9 ps-9")} />
          </div>
        )}
      >
        {loading ? <div className="p-5"><SkeletonRows rows={4} /></div>
          : credentials!.length === 0 ? (
            <EmptyState
              icon={<KeyRound className="h-6 w-6" />}
              title={t("noMqttCredentials")}
              description={t("mqCreateCredFirst")}
              action={!credFull && <button type="button" onClick={() => setCredOpen(true)} className={buttonClass("primary", "sm")}><Plus className="h-4 w-4" />{t("addMqttCredential")}</button>}
            />
          ) : (
            <div className="divide-y divide-gray-100 dark:divide-gray-800">
              {credentials!.map((c) => {
                const devices = devicesOf(c.id);
                const shown = devices.filter(matches);
                if (q && shown.length === 0) return null;
                return (
                  <section key={c.id} aria-label={c.username} className={cn("p-5", !c.isActive && "bg-gray-50/60 dark:bg-white/[0.02]")}>
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-3">
                      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-600 dark:bg-brand-500/10 dark:text-brand-400"><KeyRound className="h-5 w-5" /></span>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <CopyChip value={c.username} />
                          <StatusBadge status={c.isActive ? "active" : "suspended"} label={c.isActive ? t("mqttActive") : t("mqttSuspended")} />
                          {c.planBlocked && <StatusBadge status="planBlocked" label={t("mqttPlanBlocked")} />}
                        </div>
                        {!c.isActive && <p className="mt-1 text-xs text-error-600 dark:text-error-400">{t("brkSuspendedNote")}</p>}
                        {c.planBlocked && <p className="mt-1 text-xs text-warning-700 dark:text-warning-400">{t("brkPlanBlockedNote")}</p>}
                      </div>
                      <div className="w-full sm:w-48">
                        <QuotaMeter used={devices.length} limit={limitOf(c)} label={t("mqttClients")} />
                      </div>
                      <div className="flex items-center gap-1">
                        <button type="button" onClick={() => openClient(c)} disabled={!hasRoom(c)} className={buttonClass("secondary", "sm")}><Plus className="h-3.5 w-3.5" />{t("brkAddDevice")}</button>
                        <button type="button" className={iconBtn} onClick={() => toggleActive(c)} title={c.isActive ? t("suspend") : t("unsuspend")} aria-label={c.isActive ? t("suspend") : t("unsuspend")}><Power className="h-4 w-4" /></button>
                        <button type="button" className={iconBtn} onClick={() => { setRegen(c); setRegenPassword(""); }} title={t("regeneratePassword")} aria-label={t("regeneratePassword")}><RotateCcw className="h-4 w-4" /></button>
                        <button type="button" className={dangerBtn} onClick={() => setDeleting({ kind: "cred", item: c })} title={t("delete")} aria-label={t("delete")}><Trash2 className="h-4 w-4" /></button>
                      </div>
                    </div>

                    {devices.length === 0 ? (
                      <button type="button" onClick={() => openClient(c)} disabled={!hasRoom(c)} className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-gray-300 py-4 text-sm text-gray-500 transition hover:border-brand-400 hover:text-brand-600 dark:border-gray-700 dark:text-gray-400">
                        <Plus className="h-4 w-4" />{t("brkNoDevicesHere")}
                      </button>
                    ) : (
                      <ul className="mt-4 grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
                        {shown.map((d) => (
                          <li key={d.id} className="group flex items-center gap-3 rounded-xl border border-gray-200 bg-white px-3 py-2.5 dark:border-gray-800 dark:bg-gray-900">
                            <span className="relative flex h-2.5 w-2.5 shrink-0" aria-hidden>
                              {d.isOnline && <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-success-400 opacity-60" />}
                              <span className={cn("relative inline-flex h-2.5 w-2.5 rounded-full", d.isOnline ? "bg-success-500" : "bg-gray-300 dark:bg-gray-600")} />
                            </span>
                            <div className="min-w-0 flex-1">
                              <p className="truncate font-mono-signal text-sm text-gray-900 dark:text-white"><bdi>{d.clientName}</bdi></p>
                              <p className="text-xs text-gray-500 dark:text-gray-400" title={d.lastSeenAt ? new Date(d.lastSeenAt).toLocaleString(lang === "fa" ? "fa-IR" : "en-US") : undefined}>
                                {d.isOnline
                                  ? <span className="text-success-600 dark:text-success-400">{t("mqttOnline")}</span>
                                  : <><span className="sr-only">{t("mqttOffline")} · </span>{t("brkSeen")} {seen(d.lastSeenAt)}</>}
                              </p>
                            </div>
                            <div className="flex shrink-0 transition sm:opacity-0 sm:group-hover:opacity-100 sm:group-focus-within:opacity-100">
                              <button type="button" className={iconBtn} onClick={() => { setRename(d); setRenameValue(d.clientName); }} title={t("mqRename")} aria-label={t("mqRename")}><Pencil className="h-3.5 w-3.5" /></button>
                              <button type="button" className={dangerBtn} onClick={() => setDeleting({ kind: "client", item: d })} title={t("delete")} aria-label={t("delete")}><Trash2 className="h-3.5 w-3.5" /></button>
                            </div>
                          </li>
                        ))}
                      </ul>
                    )}
                  </section>
                );
              })}
              {q && visibleCount === 0 && <EmptyState icon={<Cpu className="h-6 w-6" />} title={t("noMqttClients")} />}
            </div>
          )}
      </Panel>

      {/* Connect */}
      <div className="grid gap-6 xl:grid-cols-5">
        <Panel title={t("brkEndpoints")} description={t("mqttConnectionInfoDesc")} className="xl:col-span-2" bodyClassName="p-0">
          <dl className="divide-y divide-gray-100 dark:divide-gray-800">
            {[
              { label: t("mqttHost"), value: MQTT_HOST },
              { label: t("mqttPortTls"), value: MQTT_PORT_TLS, recommended: true },
              { label: t("mqttPortPlain"), value: MQTT_PORT_TCP },
              { label: t("mqttWsUrl"), value: MQTT_WS_URL },
            ].map((e) => (
              <div key={e.label} className="flex flex-wrap items-center justify-between gap-2 px-5 py-3">
                <dt className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300">
                  {e.label}
                  {e.recommended && <StatusBadge tone="success" label={<span className="inline-flex items-center gap-1"><ShieldCheck className="h-3 w-3" />{t("brkRecommended")}</span>} />}
                </dt>
                <dd className="min-w-0"><CopyChip value={e.value} /></dd>
              </div>
            ))}
          </dl>
          <p className="border-t border-gray-100 px-5 py-3 text-xs leading-relaxed text-gray-500 dark:border-gray-800 dark:text-gray-400">{t("mqttTopicHint")}</p>
        </Panel>

        <Panel title={t("mqSnippets")} description={t("mqSnippetsDesc")} className="xl:col-span-3">
          {credentials && credentials.length > 0 && (
            <div className="mb-3 grid gap-3 sm:grid-cols-2">
              <Field label={t("mqSnippetCredential")} htmlFor="sn-cred">
                <select id="sn-cred" dir="ltr" value={snippetCred?.id ?? ""} onChange={(e) => { setSnippetCredId(e.target.value); setSnippetClientId(""); }} className={cn(inputClass, "h-9 font-mono-signal text-xs")}>
                  {credentials.map((c) => <option key={c.id} value={c.id}>{c.username}</option>)}
                </select>
              </Field>
              <Field label={t("brkDevice")} htmlFor="sn-dev">
                <select id="sn-dev" dir="ltr" value={snippetClient?.id ?? ""} onChange={(e) => setSnippetClientId(e.target.value)} disabled={!snippetClients.length} className={cn(inputClass, "h-9 font-mono-signal text-xs")}>
                  {snippetClients.length ? snippetClients.map((c) => <option key={c.id} value={c.id}>{c.clientName}</option>) : <option value="">device-01</option>}
                </select>
              </Field>
            </div>
          )}
          <div className="mb-3 flex gap-1 overflow-x-auto no-scrollbar" role="tablist">
            {SNIPPET_TABS.map((s) => (
              <button key={s.id} type="button" role="tab" aria-selected={snippetTab === s.id} onClick={() => setSnippetTab(s.id)}
                className={cn("whitespace-nowrap rounded-lg px-3 py-1.5 font-mono-signal text-xs font-semibold transition", snippetTab === s.id ? "bg-gray-900 text-white dark:bg-white dark:text-gray-900" : "text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-white/5")}>
                {s.label}
              </button>
            ))}
          </div>
          <div className="relative">
            <pre dir="ltr" className="max-h-80 overflow-auto rounded-xl border border-gray-800 bg-gray-950 p-4 text-start font-mono-signal text-[12.5px] leading-relaxed text-gray-200"><code>{snippet}</code></pre>
            <div className="absolute end-2 top-2"><CopyChip value={snippet} label={t("copyCardNumber")} className="!border-gray-700 !bg-gray-900 !text-gray-300" /></div>
          </div>
        </Panel>
      </div>

      {/* New credential */}
      <Dialog open={credOpen} onClose={() => !credSaving && setCredOpen(false)} title={t("addMqttCredential")}>
        <form onSubmit={addCredential} className="space-y-4">
          <Field label={t("mqttUsername")} hint={t("mqttUsernameHint")} htmlFor="cred-user">
            <input id="cred-user" required autoFocus dir="ltr" pattern="[a-zA-Z0-9_\-]{3,32}" value={credForm.username} onChange={(e) => setCredForm({ ...credForm, username: e.target.value })} className={cn(inputClass, "font-mono-signal")} />
          </Field>
          <Field label={t("mqttPassword")} hint={t("mqttPasswordHint")} htmlFor="cred-pass">
            <input id="cred-pass" required type="password" minLength={6} dir="ltr" autoComplete="new-password" value={credForm.password} onChange={(e) => setCredForm({ ...credForm, password: e.target.value })} className={inputClass} />
          </Field>
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={() => setCredOpen(false)} disabled={credSaving} className={buttonClass("secondary")}>{t("cancel")}</button>
            <button type="submit" disabled={credSaving} className={buttonClass("primary")}>{credSaving ? t("submitting") : t("addMqttCredential")}</button>
          </div>
        </form>
      </Dialog>

      {/* Regenerate password */}
      <Dialog open={!!regen} onClose={() => !regenSaving && setRegen(null)} title={t("regeneratePassword")} description={regen && <span dir="ltr" className="font-mono-signal">{regen.username}</span>}>
        <form onSubmit={regenerate} className="space-y-4">
          <Field label={t("newPassword")} hint={t("mqttPasswordHint")} htmlFor="regen-pass">
            <input id="regen-pass" required autoFocus type="password" minLength={6} dir="ltr" autoComplete="new-password" value={regenPassword} onChange={(e) => setRegenPassword(e.target.value)} className={inputClass} />
          </Field>
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={() => setRegen(null)} disabled={regenSaving} className={buttonClass("secondary")}>{t("cancel")}</button>
            <button type="submit" disabled={regenSaving || regenPassword.length < 6} className={buttonClass("primary")}>{regenSaving ? t("submitting") : t("regeneratePassword")}</button>
          </div>
        </form>
      </Dialog>

      {/* New device */}
      <Dialog open={clientOpen} onClose={() => !clientSaving && setClientOpen(false)} title={t("addMqttClient")}>
        <form onSubmit={addClient} className="space-y-4">
          <Field label={t("selectCredential")} htmlFor="client-cred">
            <select id="client-cred" dir="ltr" value={clientForm.mqttUserId} onChange={(e) => setClientForm({ ...clientForm, mqttUserId: e.target.value })} className={cn(inputClass, "font-mono-signal")}>
              {credentials?.map((c) => (
                <option key={c.id} value={c.id} disabled={!hasRoom(c)}>{c.username} ({devicesOf(c.id).length}/{limitOf(c)})</option>
              ))}
            </select>
          </Field>
          <Field label={t("mqttClientName")} hint={t("mqttClientNameHint")} htmlFor="client-name">
            <input id="client-name" required autoFocus dir="ltr" pattern="[a-zA-Z0-9_\-]{1,64}" value={clientForm.clientName} onChange={(e) => setClientForm({ ...clientForm, clientName: e.target.value })} className={cn(inputClass, "font-mono-signal")} />
          </Field>
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={() => setClientOpen(false)} disabled={clientSaving} className={buttonClass("secondary")}>{t("cancel")}</button>
            <button type="submit" disabled={clientSaving || !clientForm.mqttUserId} className={buttonClass("primary")}>{clientSaving ? t("submitting") : t("addMqttClient")}</button>
          </div>
        </form>
      </Dialog>

      {/* Rename device */}
      <Dialog open={!!rename} onClose={() => !renameSaving && setRename(null)} title={t("mqRenameTitle")}>
        <form onSubmit={doRename} className="space-y-4">
          <Field label={t("mqttClientName")} hint={t("mqttClientNameHint")} htmlFor="rename-name">
            <input id="rename-name" required autoFocus dir="ltr" pattern="[a-zA-Z0-9_\-]{1,64}" value={renameValue} onChange={(e) => setRenameValue(e.target.value)} className={cn(inputClass, "font-mono-signal")} />
          </Field>
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={() => setRename(null)} disabled={renameSaving} className={buttonClass("secondary")}>{t("cancel")}</button>
            <button type="submit" disabled={renameSaving || renameValue === rename?.clientName} className={buttonClass("primary")}>{renameSaving ? t("submitting") : t("mqSave")}</button>
          </div>
        </form>
      </Dialog>

      <ConfirmDialog
        open={!!deleting}
        onClose={() => setDeleting(null)}
        onConfirm={confirmDelete}
        busy={deleteBusy}
        title={deleting?.kind === "cred" ? t("mqDeleteCredTitle") : t("mqDeleteClientTitle")}
        subject={deleting && <span dir="ltr" className="font-mono-signal">{deleting.kind === "cred" ? deleting.item.username : deleting.item.clientName}</span>}
        warning={deleting?.kind === "cred" ? t("mqDeleteCredWarn") : t("mqDeleteClientWarn")}
        confirmLabel={t("delete")}
        cancelLabel={t("cancel")}
      />
    </div>
  );
}
