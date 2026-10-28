"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Plus, KeyRound, Cpu, Trash2, RotateCcw, Pencil, Power } from "lucide-react";
import { useT } from "@/i18n/useT";
import { useLanguage } from "@/context/LanguageContext";
import { useMqttLive, type MqttActivityEvent } from "@/context/MqttLiveContext";
import { getJson } from "@/lib/getJson";
import { MQTT_HOST, MQTT_PORT_TCP, MQTT_PORT_TLS, MQTT_WS_URL } from "@/lib/mqttEndpoints";
import { SNIPPET_TABS, buildSnippet, type SnippetId } from "@/lib/mqttSnippets";
import {
  PageHeader, Panel, CopyField, CopyChip, StatusBadge, EmptyState, SkeletonRows, QuotaMeter,
  Dialog, ConfirmDialog, Field, inputClass, buttonClass, cn, useFormatNumber,
} from "@/components/dashboard/ui";

type Credential = { id: string; username: string; isActive: boolean; maxConnection: number; createdAt: string };
type Client = { id: string; clientName: string; isOnline: boolean; lastSeenAt: string | null; createdAt: string; credential: { id: string; username: string } | null };
type PlanInfo = { limits: { maxUsers: number; clientsPerUser: number }; usage: { mqttUsers: number; clients: { mqttUserId: string; count: number }[] } };

export default function UserMqttPage() {
  const t = useT();
  const { lang } = useLanguage();
  const isRTL = lang === "fa";
  const fmt = useFormatNumber();

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

  const onLive = useCallback((e: MqttActivityEvent) => {
    setClients((prev) => prev?.map((c) => (c.clientName === e.clientName ? { ...c, isOnline: e.event === "connect", lastSeenAt: e.createdAt } : c)) ?? prev);
  }, []);
  useMqttLive(onLive);

  const loading = credentials === null || clients === null;
  const credFull = !!plan && plan.usage.mqttUsers >= plan.limits.maxUsers;
  const clientsOf = (credId: string) => clients?.filter((c) => c.credential?.id === credId).length ?? 0;
  const credHasRoom = (credId: string) => !plan || clientsOf(credId) < plan.limits.clientsPerUser;
  const anyCredHasRoom = (credentials ?? []).some((c) => credHasRoom(c.id));

  const dateFmt = (v: string | null) =>
    v ? new Date(v).toLocaleString(isRTL ? "fa-IR" : "en-US", { year: "numeric", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }) : t("mqttNeverSeen");

  // ── Snippets ────────────────────────────────────────────────────────────
  const [snippetTab, setSnippetTab] = useState<SnippetId>("esp32");
  const [snippetCredId, setSnippetCredId] = useState<string>("");
  const snippetCred = credentials?.find((c) => c.id === snippetCredId) ?? credentials?.[0];
  const snippetClient = clients?.find((c) => c.credential?.id === snippetCred?.id)?.clientName ?? "device-01";
  const snippet = buildSnippet(snippetTab, snippetCred?.username ?? "your_username", snippetClient);

  // ── Mutations ───────────────────────────────────────────────────────────
  const send = async (url: string, method: string, body?: unknown) => {
    const res = await fetch(url, { method, headers: body ? { "Content-Type": "application/json" } : undefined, body: body ? JSON.stringify(body) : undefined });
    const data = await res.json().catch(() => ({}));
    return { ok: res.ok, error: (data as { error?: string }).error };
  };

  // New credential
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

  // Regenerate password
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

  // New device
  const [clientOpen, setClientOpen] = useState(false);
  const [clientForm, setClientForm] = useState({ mqttUserId: "", clientName: "" });
  const [clientSaving, setClientSaving] = useState(false);
  const openClient = () => {
    const first = credentials?.find((c) => credHasRoom(c.id)) ?? credentials?.[0];
    setClientForm({ mqttUserId: first?.id ?? "", clientName: "" });
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

  // Rename device
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

  // Deletes (both confirmed first)
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

  // Device filter
  const [deviceFilter, setDeviceFilter] = useState<string>("all");
  const shownClients = useMemo(
    () => (deviceFilter === "all" ? clients ?? [] : (clients ?? []).filter((c) => c.credential?.id === deviceFilter)),
    [clients, deviceFilter],
  );

  const upgradeLink = (
    <Link href="/dashboard/subscription" className="font-semibold text-brand-600 hover:underline dark:text-brand-400">{t("mqUpgrade")}</Link>
  );
  const iconBtn = "flex h-8 w-8 items-center justify-center rounded-lg text-gray-500 transition hover:bg-gray-100 hover:text-gray-800 dark:text-gray-400 dark:hover:bg-white/5 dark:hover:text-white";

  return (
    <div className="space-y-6">
      <PageHeader title={t("mqttDashboardTitle")} description={t("mqttDashboardDesc")} />

      {loadFailed && <p role="alert" className="rounded-xl border border-error-200 bg-error-50 p-3 text-sm text-error-700 dark:border-error-500/20 dark:bg-error-500/10 dark:text-error-400">{t("ovLoadFailed")}</p>}

      {/* Connection info + snippets */}
      <div className="grid gap-6 xl:grid-cols-5">
        <Panel title={t("mqttConnectionInfo")} description={t("mqttConnectionInfoDesc")} className="xl:col-span-2">
          <div className="space-y-4">
            <CopyField label={t("mqttHost")} value={MQTT_HOST} />
            <div className="grid grid-cols-2 gap-4">
              <CopyField label={t("mqttPortTls")} value={MQTT_PORT_TLS} />
              <CopyField label={t("mqttPortPlain")} value={MQTT_PORT_TCP} />
            </div>
            <CopyField label={t("mqttWsUrl")} value={MQTT_WS_URL} />
            <p className="rounded-xl bg-gray-50 p-3 text-xs leading-relaxed text-gray-500 dark:bg-white/[0.03] dark:text-gray-400">{t("mqttTopicHint")}</p>
          </div>
        </Panel>

        <Panel
          title={t("mqSnippets")}
          description={t("mqSnippetsDesc")}
          className="xl:col-span-3"
          actions={credentials && credentials.length > 1 && (
            <select
              aria-label={t("mqSnippetCredential")}
              value={snippetCred?.id ?? ""}
              onChange={(e) => setSnippetCredId(e.target.value)}
              dir="ltr"
              className="h-9 rounded-lg border border-gray-200 bg-white px-2 font-mono-signal text-xs text-gray-700 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200"
            >
              {credentials.map((c) => <option key={c.id} value={c.id}>{c.username}</option>)}
            </select>
          )}
        >
          <div className="mb-3 flex gap-1 overflow-x-auto no-scrollbar" role="tablist">
            {SNIPPET_TABS.map((s) => (
              <button
                key={s.id}
                type="button"
                role="tab"
                aria-selected={snippetTab === s.id}
                onClick={() => setSnippetTab(s.id)}
                className={cn(
                  "whitespace-nowrap rounded-lg px-3 py-1.5 font-mono-signal text-xs font-semibold transition",
                  snippetTab === s.id ? "bg-gray-900 text-white dark:bg-white dark:text-gray-900" : "text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-white/5",
                )}
              >
                {s.label}
              </button>
            ))}
          </div>
          <div className="relative">
            <pre dir="ltr" className="max-h-80 overflow-auto rounded-xl border border-gray-800 bg-gray-950 p-4 text-start font-mono-signal text-[12.5px] leading-relaxed text-gray-200">
              <code>{snippet}</code>
            </pre>
            <div className="absolute end-2 top-2"><CopyChip value={snippet} label={t("copyCardNumber")} className="!border-gray-700 !bg-gray-900 !text-gray-300" /></div>
          </div>
        </Panel>
      </div>

      {/* Credentials */}
      <Panel
        title={t("mqttCredentials")}
        description={t("mqttCredentialsDesc")}
        bodyClassName="p-0"
        actions={
          <button type="button" onClick={() => { setCredForm({ username: "", password: "" }); setCredOpen(true); }} disabled={credFull} className={buttonClass("primary", "sm")}>
            <Plus className="h-4 w-4" />{t("addMqttCredential")}
          </button>
        }
      >
        {plan && (
          <div className="border-b border-gray-100 px-5 py-4 dark:border-gray-800">
            <QuotaMeter used={plan.usage.mqttUsers} limit={plan.limits.maxUsers} label={t("ovCredentialSets")} hint={credFull ? <>{t("mqQuotaFull")} {upgradeLink}</> : undefined} />
          </div>
        )}
        {loading ? <div className="p-5"><SkeletonRows rows={2} /></div> : credentials!.length === 0 ? (
          <EmptyState
            icon={<KeyRound className="h-6 w-6" />}
            title={t("noMqttCredentials")}
            description={t("mqCreateCredFirst")}
            action={!credFull && <button type="button" onClick={() => setCredOpen(true)} className={buttonClass("primary", "sm")}><Plus className="h-4 w-4" />{t("addMqttCredential")}</button>}
          />
        ) : (
          <ul className="divide-y divide-gray-100 dark:divide-gray-800">
            {credentials!.map((c) => (
              <li key={c.id} className="flex flex-wrap items-center gap-x-4 gap-y-3 px-5 py-4 sm:gap-x-6">
                <div className="flex min-w-0 basis-full items-center gap-3 sm:basis-auto sm:flex-1">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-600 dark:bg-brand-500/10 dark:text-brand-400"><KeyRound className="h-4 w-4" /></span>
                  <div className="min-w-0">
                    <CopyChip value={c.username} />
                    <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">{t("mqCreated")}: {dateFmt(c.createdAt)}</p>
                  </div>
                </div>
                <span dir="ltr" className="font-mono-signal text-sm text-gray-600 dark:text-gray-300">
                  {fmt(clientsOf(c.id))} / {fmt(plan?.limits.clientsPerUser ?? c.maxConnection)} <span className="font-sans text-xs text-gray-400">{t("mqDevicesUsed")}</span>
                </span>
                <StatusBadge status={c.isActive ? "active" : "suspended"} label={c.isActive ? t("mqttActive") : t("mqttSuspended")} />
                <div className="flex items-center gap-1">
                  <button type="button" className={iconBtn} onClick={() => toggleActive(c)} title={c.isActive ? t("suspend") : t("unsuspend")} aria-label={c.isActive ? t("suspend") : t("unsuspend")}><Power className="h-4 w-4" /></button>
                  <button type="button" className={iconBtn} onClick={() => { setRegen(c); setRegenPassword(""); }} title={t("regeneratePassword")} aria-label={t("regeneratePassword")}><RotateCcw className="h-4 w-4" /></button>
                  <button type="button" className={cn(iconBtn, "hover:!bg-error-50 hover:!text-error-600 dark:hover:!bg-error-500/10")} onClick={() => setDeleting({ kind: "cred", item: c })} title={t("delete")} aria-label={t("delete")}><Trash2 className="h-4 w-4" /></button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Panel>

      {/* Devices */}
      <Panel
        title={t("mqttClients")}
        description={t("mqttClientsDesc")}
        bodyClassName="p-0"
        actions={
          <>
            {credentials && credentials.length > 1 && (
              <select
                aria-label={t("mqSnippetCredential")}
                value={deviceFilter}
                onChange={(e) => setDeviceFilter(e.target.value)}
                className="h-9 rounded-lg border border-gray-200 bg-white px-2 text-xs text-gray-700 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200"
              >
                <option value="all">{t("mqAllCredentials")}</option>
                {credentials.map((c) => <option key={c.id} value={c.id}>{c.username}</option>)}
              </select>
            )}
            <button type="button" onClick={openClient} disabled={!credentials?.length || !anyCredHasRoom} className={buttonClass("primary", "sm")}>
              <Plus className="h-4 w-4" />{t("addMqttClient")}
            </button>
          </>
        }
      >
        {credentials && credentials.length > 0 && !anyCredHasRoom && (
          <p className="border-b border-gray-100 px-5 py-3 text-xs text-gray-500 dark:border-gray-800 dark:text-gray-400">{t("mqQuotaFull")} {upgradeLink}</p>
        )}
        {loading ? <div className="p-5"><SkeletonRows rows={3} /></div> : shownClients.length === 0 ? (
          <EmptyState
            icon={<Cpu className="h-6 w-6" />}
            title={t("noMqttClients")}
            description={credentials!.length === 0 ? t("mqCreateCredFirst") : undefined}
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 text-start text-xs font-medium text-gray-500 dark:border-gray-800 dark:text-gray-400">
                  <th className="px-5 py-3 text-start font-medium">{t("mqttClientName")}</th>
                  <th className="hidden px-5 py-3 text-start font-medium md:table-cell">{t("mqSnippetCredential")}</th>
                  <th className="px-5 py-3 text-start font-medium">{t("mqttLastSeen")}</th>
                  <th className="px-5 py-3"><span className="sr-only">{t("mqActions")}</span></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                {shownClients.map((cl) => (
                  <tr key={cl.id} className="hover:bg-gray-50/60 dark:hover:bg-white/[0.02]">
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-3">
                        <StatusBadge status={cl.isOnline ? "online" : "offline"} label={cl.isOnline ? t("mqttOnline") : t("mqttOffline")} pulse={cl.isOnline} />
                        <span dir="ltr" className="whitespace-nowrap font-mono-signal text-gray-900 dark:text-white">{cl.clientName}</span>
                      </div>
                    </td>
                    <td className="hidden px-5 py-3 md:table-cell"><span dir="ltr" className="font-mono-signal text-gray-500 dark:text-gray-400">{cl.credential?.username ?? "—"}</span></td>
                    <td className="whitespace-nowrap px-5 py-3 text-gray-500 dark:text-gray-400">{dateFmt(cl.lastSeenAt)}</td>
                    <td className="px-5 py-3">
                      <div className="flex justify-end gap-1">
                        <button type="button" className={iconBtn} onClick={() => { setRename(cl); setRenameValue(cl.clientName); }} title={t("mqRename")} aria-label={t("mqRename")}><Pencil className="h-4 w-4" /></button>
                        <button type="button" className={cn(iconBtn, "hover:!bg-error-50 hover:!text-error-600 dark:hover:!bg-error-500/10")} onClick={() => setDeleting({ kind: "client", item: cl })} title={t("delete")} aria-label={t("delete")}><Trash2 className="h-4 w-4" /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Panel>

      {/* New credential */}
      <Dialog
        open={credOpen}
        onClose={() => !credSaving && setCredOpen(false)}
        title={t("addMqttCredential")}
      >
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
                <option key={c.id} value={c.id} disabled={!credHasRoom(c.id)}>
                  {c.username} ({clientsOf(c.id)}/{plan?.limits.clientsPerUser ?? c.maxConnection})
                </option>
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
