"use client";

import Image from "next/image";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useSession } from "next-auth/react";
import { toast } from "sonner";
import type { ColDef, ICellRendererParams } from "ag-grid-community";
import { Pencil, Trash2, Search, Users, Shield, UserPlus, MessageSquareWarning, PanelRight } from "lucide-react";
import { useT } from "@/i18n/useT";
import { useLanguage } from "@/context/LanguageContext";
import { getJson } from "@/lib/getJson";
import DataGrid, { DateCell } from "@/components/dashboard/DataGrid";
import {
  PageHeader, Panel, StatTile, StatusBadge, EmptyState, SkeletonRows, FilterPills, Dialog, ConfirmDialog, Drawer, Field,
  inputClass, buttonClass, cn, useFormatNumber, type BadgeTone,
} from "@/components/dashboard/ui";

type PlanKey = "free" | "basic" | "starter" | "enterprise";
interface UserRow {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  role: "admin" | "user";
  walletBalance: number;
  avatar: string;
  phone: string;
  plan: PlanKey;
  planMaxUsers: number | null;
  planClientsPerUser: number | null;
  createdAt: string;
}
type Owner = { name: string; email: string } | null;
type Related = {
  creds: { id: string; username: string; isActive: boolean; user: Owner }[];
  clients: { id: string; clientName: string; isOnline: boolean; user: Owner }[];
  deposits: { id: string; amount: number; status: string; createdAt: string; user: Owner }[];
  tickets: { id: string; subject: string; status: string; user: Owner }[];
};

const PLANS: PlanKey[] = ["free", "basic", "starter", "enterprise"];
const PLAN_TONE: Record<PlanKey, BadgeTone> = { free: "neutral", basic: "info", starter: "brand", enterprise: "success" };

type Ctx = {
  isRTL: boolean;
  t: ReturnType<typeof useT>;
  fmt: (n: number) => string;
  planLabels: Record<PlanKey, string>;
  onEdit: (u: UserRow) => void;
  onDelete: (u: UserRow) => void;
  onOpen: (u: UserRow) => void;
};

function NameCell({ data }: ICellRendererParams<UserRow>) {
  if (!data) return null;
  return (
    <div className="flex h-full items-center gap-3">
      <Image src={data.avatar || "/images/user/user-01.jpg"} alt="" width={32} height={32} className="h-8 w-8 shrink-0 rounded-full object-cover" />
      <div className="min-w-0 leading-tight">
        <p className="truncate text-sm font-medium text-gray-900 dark:text-white">{`${data.firstName} ${data.lastName}`.trim()}</p>
        <p dir="ltr" className="truncate text-start text-xs text-gray-500 dark:text-gray-400">{data.email}</p>
      </div>
    </div>
  );
}
function RoleCell({ value, context }: { value: UserRow["role"]; context: Ctx }) {
  return value === "admin" ? <StatusBadge tone="warning" label={context.t("roleAdmin")} /> : <span className="text-sm text-gray-500 dark:text-gray-400">{context.t("roleUser")}</span>;
}
function PlanCell({ value, context }: { value: PlanKey; context: Ctx }) {
  return <StatusBadge tone={PLAN_TONE[value] ?? "neutral"} label={context.planLabels[value] ?? value} />;
}
function PhoneCell({ value }: { value: string }) {
  return value ? <span dir="ltr" className="font-mono-signal text-[13px] text-gray-700 dark:text-gray-300">{value}</span> : <span className="text-gray-400">—</span>;
}
function WalletCell({ value, context }: { value: number; context: Ctx }) {
  return <span className="text-sm font-medium text-gray-800 dark:text-gray-100">{context.fmt(value ?? 0)} <span className="text-xs font-normal text-gray-400">{context.t("walletUnit")}</span></span>;
}
function ActionsCell({ data, context }: ICellRendererParams<UserRow> & { context: Ctx }) {
  if (!data) return null;
  const btn = "flex h-8 w-8 items-center justify-center rounded-lg text-gray-500 transition hover:bg-gray-100 hover:text-gray-800 dark:text-gray-400 dark:hover:bg-white/5 dark:hover:text-white";
  return (
    <div className="flex h-full items-center justify-end gap-1">
      <button type="button" className={btn} onClick={() => context.onOpen(data)} title={context.t("auOpenProfile")} aria-label={context.t("auOpenProfile")}><PanelRight className="h-4 w-4 rtl:-scale-x-100" /></button>
      <button type="button" className={btn} onClick={() => context.onEdit(data)} title={context.t("userEdit")} aria-label={context.t("userEdit")}><Pencil className="h-4 w-4" /></button>
      <button type="button" className={cn(btn, "hover:!bg-error-50 hover:!text-error-600 dark:hover:!bg-error-500/10")} onClick={() => context.onDelete(data)} title={context.t("userDelete")} aria-label={context.t("userDelete")}><Trash2 className="h-4 w-4" /></button>
    </div>
  );
}

export default function AdminUsersList() {
  const t = useT();
  const { lang } = useLanguage();
  const isRTL = lang === "fa";
  const fmt = useFormatNumber();
  const { data: session } = useSession();

  const [users, setUsers] = useState<UserRow[] | null>(null);
  const [failed, setFailed] = useState(false);
  const [query, setQuery] = useState("");
  const [planFilter, setPlanFilter] = useState<"all" | PlanKey>("all");
  const [roleFilter, setRoleFilter] = useState<"all" | "admin" | "user">("all");

  const load = useCallback(() => getJson<UserRow[]>("/api/admin/users").then((d) => { setFailed(!d); setUsers(d ?? []); }), []);
  useEffect(() => { queueMicrotask(load); }, [load]);

  const planLabels = useMemo(() => ({ free: t("planLabelFree"), basic: t("planLabelBasic"), starter: t("planLabelStarter"), enterprise: t("planLabelEnterprise") }), [t]);

  const stats = useMemo(() => {
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const list = users ?? [];
    return {
      total: list.length,
      admins: list.filter((u) => u.role === "admin").length,
      paying: list.filter((u) => u.plan === "basic" || u.plan === "starter" || u.plan === "enterprise").length,
      newMonth: list.filter((u) => new Date(u.createdAt) >= monthStart).length,
    };
  }, [users]);

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    return (users ?? []).filter((u) =>
      (planFilter === "all" || u.plan === planFilter) &&
      (roleFilter === "all" || u.role === roleFilter) &&
      (!q || `${u.firstName} ${u.lastName}`.toLowerCase().includes(q) || u.email.toLowerCase().includes(q) || (u.phone ?? "").includes(q)));
  }, [users, query, planFilter, roleFilter]);

  // ── Edit ────────────────────────────────────────────────────────────────
  const [edit, setEdit] = useState<UserRow | null>(null);
  const [form, setForm] = useState({ role: "user" as UserRow["role"], phone: "", plan: "free" as PlanKey, maxUsers: "", clientsPerUser: "" });
  const [saving, setSaving] = useState(false);
  const [editError, setEditError] = useState("");

  const openEdit = useCallback((u: UserRow) => {
    setEdit(u);
    setForm({
      role: u.role,
      phone: u.phone ?? "",
      plan: u.plan ?? "free",
      maxUsers: u.planMaxUsers != null ? String(u.planMaxUsers) : "",
      clientsPerUser: u.planClientsPerUser != null ? String(u.planClientsPerUser) : "",
    });
    setEditError("");
  }, []);

  // Only send fields that actually changed: the API texts the user an SMS
  // whenever `plan` is present in the body, so an unconditional `plan`
  // would SMS them on every phone/role edit too.
  const changes = useMemo(() => {
    if (!edit) return {};
    const body: Record<string, unknown> = {};
    if (form.role !== edit.role) body.role = form.role;
    if (form.phone !== (edit.phone ?? "")) body.phone = form.phone;
    if (form.plan !== edit.plan) body.plan = form.plan;
    const max = form.plan === "enterprise" && form.maxUsers !== "" ? Number(form.maxUsers) : null;
    const per = form.plan === "enterprise" && form.clientsPerUser !== "" ? Number(form.clientsPerUser) : null;
    if (max !== (edit.planMaxUsers ?? null)) body.planMaxUsers = max;
    if (per !== (edit.planClientsPerUser ?? null)) body.planClientsPerUser = per;
    return body;
  }, [edit, form]);
  const hasChanges = Object.keys(changes).length > 0;

  const saveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!edit) return;
    if (!hasChanges) return toast.info(t("auNoChanges"));
    setSaving(true);
    setEditError("");
    const res = await fetch(`/api/admin/users/${edit.id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(changes) });
    const data = await res.json().catch(() => ({}));
    setSaving(false);
    if (!res.ok) return setEditError(data.error ?? t("saveError"));
    toast.success(t("userSaved"));
    setEdit(null);
    load();
  };

  // ── Delete ──────────────────────────────────────────────────────────────
  const [deleting, setDeleting] = useState<UserRow | null>(null);
  const [deleteBusy, setDeleteBusy] = useState(false);
  const askDelete = useCallback((u: UserRow) => {
    if (u.id === session?.user?.id) return toast.error(t("auSelfDelete"));
    setDeleting(u);
  }, [session?.user?.id, t]);
  const confirmDelete = async () => {
    if (!deleting) return;
    setDeleteBusy(true);
    const res = await fetch(`/api/admin/users/${deleting.id}`, { method: "DELETE" });
    const data = await res.json().catch(() => ({}));
    setDeleteBusy(false);
    if (!res.ok) return toast.error(data.error || t("saveError"));
    toast.success(t("userDeleted"));
    setDeleting(null);
    load();
  };

  // ── Detail drawer ───────────────────────────────────────────────────────
  // The admin list endpoints identify owners by name/email (no user id), so
  // related records are matched on email.
  const [detail, setDetail] = useState<UserRow | null>(null);
  const [related, setRelated] = useState<Related | null>(null);
  const openDetail = useCallback((u: UserRow) => {
    setDetail(u);
    if (related) return;
    Promise.all([
      getJson<Related["creds"]>("/api/admin/mqtt/credentials"),
      getJson<Related["clients"]>("/api/admin/mqtt/clients"),
      getJson<Related["deposits"]>("/api/admin/finance/deposits"),
      getJson<Related["tickets"]>("/api/admin/tickets"),
    ]).then(([creds, clients, deposits, tickets]) => setRelated({ creds: creds ?? [], clients: clients ?? [], deposits: deposits ?? [], tickets: tickets ?? [] }));
  }, [related]);
  const mine = <T extends { user: Owner }>(list: T[] | undefined) => (list ?? []).filter((x) => detail && x.user?.email === detail.email);

  const columns = useMemo<ColDef<UserRow>[]>(() => [
    { field: "firstName", headerName: t("colUser"), flex: 2, minWidth: 240, cellRenderer: NameCell },
    { field: "role", headerName: t("colRole"), width: 110, cellRenderer: RoleCell },
    { field: "plan", headerName: t("colPlan"), width: 130, cellRenderer: PlanCell },
    { field: "phone", headerName: t("colPhone"), width: 140, sortable: false, cellRenderer: PhoneCell },
    { field: "walletBalance", headerName: t("colWallet"), width: 150, cellRenderer: WalletCell },
    { field: "createdAt", headerName: t("colJoined"), width: 130, sort: "desc", cellRenderer: DateCell },
    { colId: "actions", headerName: "", width: 130, sortable: false, cellRenderer: ActionsCell },
  ], [t]);
  const context = useMemo<Ctx>(() => ({ isRTL, t, fmt, planLabels, onEdit: openEdit, onDelete: askDelete, onOpen: openDetail }), [isRTL, t, fmt, planLabels, openEdit, askDelete, openDetail]);

  const count = (p: "all" | PlanKey) => (users ?? []).filter((u) => p === "all" || u.plan === p).length;

  return (
    <div className="space-y-6">
      <PageHeader title={t("allUsers")} description={t("auDesc")} />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatTile icon={<Users className="h-5 w-5" />} label={t("statTotalUsers")} value={users ? fmt(stats.total) : "…"} />
        <StatTile icon={<UserPlus className="h-5 w-5" />} label={t("statNewThisMonth")} value={users ? fmt(stats.newMonth) : "…"} />
        <StatTile icon={<Shield className="h-5 w-5" />} label={t("statAdmins")} value={users ? fmt(stats.admins) : "…"} />
        <StatTile icon={<Users className="h-5 w-5" />} label={`${t("planLabelBasic")} / ${t("planLabelStarter")} / ${t("planLabelEnterprise")}`} value={users ? fmt(stats.paying) : "…"} />
      </div>

      <Panel bodyClassName="p-0">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-100 px-5 py-4 dark:border-gray-800">
          <FilterPills<"all" | PlanKey>
            value={planFilter}
            onChange={setPlanFilter}
            items={[{ key: "all", label: t("auAllPlans"), count: count("all") }, ...PLANS.map((p) => ({ key: p, label: planLabels[p], count: count(p) }))]}
          />
          <div className="flex flex-wrap items-center gap-2">
            <select aria-label={t("colRole")} value={roleFilter} onChange={(e) => setRoleFilter(e.target.value as typeof roleFilter)} className="h-9 rounded-lg border border-gray-200 bg-white px-2 text-xs text-gray-700 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200">
              <option value="all">{t("auAllRoles")}</option>
              <option value="admin">{t("roleAdmin")}</option>
              <option value="user">{t("roleUser")}</option>
            </select>
            <div className="relative w-full sm:w-64">
              <Search className="pointer-events-none absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" aria-hidden />
              <input type="search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder={t("auSearch")} aria-label={t("auSearch")} className={cn(inputClass, "h-9 ps-9")} />
            </div>
          </div>
        </div>
        {users === null ? <div className="p-5"><SkeletonRows rows={6} /></div>
          : failed ? <p className="p-5 text-sm text-error-600 dark:text-error-400">{t("ovLoadFailed")}</p>
          : rows.length === 0 ? <EmptyState icon={<Users className="h-6 w-6" />} title={users.length ? t("noUsersFound") : t("userEmpty")} />
          : <DataGrid rows={rows} columns={columns} context={context} rowHeight={60} />}
      </Panel>

      {/* Edit */}
      <Dialog open={!!edit} onClose={() => !saving && setEdit(null)} title={t("userEditTitle")} description={edit && <span dir="ltr">{edit.email}</span>}>
        <form onSubmit={saveEdit} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label={t("userEditRole")} htmlFor="ue-role">
              <select id="ue-role" value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value as UserRow["role"] })} className={inputClass}>
                <option value="user">{t("roleUser")}</option>
                <option value="admin">{t("roleAdmin")}</option>
              </select>
            </Field>
            <Field label={t("userEditPhone")} htmlFor="ue-phone">
              <input id="ue-phone" dir="ltr" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="09xxxxxxxxx" className={cn(inputClass, "font-mono-signal")} />
            </Field>
          </div>
          <Field label={t("userEditPlan")} htmlFor="ue-plan">
            <select id="ue-plan" value={form.plan} onChange={(e) => setForm({ ...form, plan: e.target.value as PlanKey })} className={inputClass}>
              {PLANS.map((p) => <option key={p} value={p}>{planLabels[p]}</option>)}
            </select>
          </Field>
          {form.plan === "enterprise" && (
            <div className="space-y-2 rounded-xl border border-gray-200 p-4 dark:border-gray-800">
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label={t("userEditPlanMaxUsers")} htmlFor="ue-max" hint={t("userEditPlanBlankHint")}>
                  <input id="ue-max" type="number" min={0} dir="ltr" value={form.maxUsers} onChange={(e) => setForm({ ...form, maxUsers: e.target.value })} className={inputClass} />
                </Field>
                <Field label={t("userEditPlanClientsPerUser")} htmlFor="ue-per" hint={t("userEditPlanBlankHint")}>
                  <input id="ue-per" type="number" min={0} dir="ltr" value={form.clientsPerUser} onChange={(e) => setForm({ ...form, clientsPerUser: e.target.value })} className={inputClass} />
                </Field>
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400">{t("auEnterpriseHint")}</p>
            </div>
          )}
          {"plan" in changes && edit?.phone && (
            <p className="flex items-start gap-2 rounded-xl bg-warning-50 p-3 text-xs text-warning-800 dark:bg-warning-500/10 dark:text-warning-300">
              <MessageSquareWarning className="h-4 w-4 shrink-0" aria-hidden />{t("auSmsWarn")}
            </p>
          )}
          {editError && <p role="alert" className="text-sm text-error-600 dark:text-error-400">{editError}</p>}
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={() => setEdit(null)} disabled={saving} className={buttonClass("secondary")}>{t("userCancel")}</button>
            <button type="submit" disabled={saving || !hasChanges} className={buttonClass("primary")}>{saving ? t("userSaving") : t("userSave")}</button>
          </div>
        </form>
      </Dialog>

      <ConfirmDialog
        open={!!deleting}
        onClose={() => setDeleting(null)}
        onConfirm={confirmDelete}
        busy={deleteBusy}
        title={t("userDelete")}
        subject={deleting && <>{`${deleting.firstName} ${deleting.lastName}`.trim()} · <span dir="ltr">{deleting.email}</span></>}
        warning={t("auDeleteWarn")}
        confirmLabel={t("userDeleteConfirm")}
        cancelLabel={t("userCancel")}
      />

      {/* Detail drawer */}
      <Drawer
        open={!!detail}
        onClose={() => setDetail(null)}
        title={t("auDetails")}
        footer={detail && <button type="button" onClick={() => { const u = detail; setDetail(null); openEdit(u); }} className={buttonClass("primary", "sm")}><Pencil className="h-4 w-4" />{t("userEdit")}</button>}
      >
        {detail && (
          <div className="space-y-6">
            <div className="flex items-center gap-3">
              <Image src={detail.avatar || "/images/user/user-01.jpg"} alt="" width={48} height={48} className="h-12 w-12 rounded-full object-cover" />
              <div className="min-w-0">
                <p className="font-semibold text-gray-900 dark:text-white">{`${detail.firstName} ${detail.lastName}`.trim()}</p>
                <p dir="ltr" className="truncate text-start text-sm text-gray-500 dark:text-gray-400">{detail.email}</p>
              </div>
            </div>
            <dl className="grid grid-cols-2 gap-4 text-sm">
              <div><dt className="text-xs text-gray-500 dark:text-gray-400">{t("colPlan")}</dt><dd className="mt-1"><StatusBadge tone={PLAN_TONE[detail.plan]} label={planLabels[detail.plan]} /></dd></div>
              <div><dt className="text-xs text-gray-500 dark:text-gray-400">{t("colWallet")}</dt><dd className="mt-1 font-semibold text-gray-900 dark:text-white">{fmt(detail.walletBalance ?? 0)} {t("walletUnit")}</dd></div>
              <div><dt className="text-xs text-gray-500 dark:text-gray-400">{t("colPhone")}</dt><dd dir="ltr" className="mt-1 text-start font-mono-signal text-gray-800 dark:text-gray-200">{detail.phone || "—"}</dd></div>
              <div><dt className="text-xs text-gray-500 dark:text-gray-400">{t("colJoined")}</dt><dd className="mt-1 text-gray-800 dark:text-gray-200">{new Date(detail.createdAt).toLocaleDateString(isRTL ? "fa-IR" : "en-US", { dateStyle: "medium" })}</dd></div>
            </dl>
            {!related ? <SkeletonRows rows={4} /> : (
              <>
                <RelatedList title={t("auCredentials")} empty={t("auNone")} items={mine(related.creds).map((c) => ({ key: c.id, main: <span dir="ltr" className="font-mono-signal">{c.username}</span>, side: <StatusBadge status={c.isActive ? "active" : "suspended"} label={c.isActive ? t("mqttActive") : t("mqttSuspended")} /> }))} />
                <RelatedList title={t("auDevices")} empty={t("auNone")} items={mine(related.clients).map((c) => ({ key: c.id, main: <span dir="ltr" className="font-mono-signal">{c.clientName}</span>, side: <StatusBadge status={c.isOnline ? "online" : "offline"} label={c.isOnline ? t("mqttOnline") : t("mqttOffline")} /> }))} />
                <RelatedList title={t("auDeposits")} empty={t("auNone")} items={mine(related.deposits).slice(0, 5).map((d) => ({ key: d.id, main: <>{fmt(d.amount)} {t("walletUnit")}</>, side: <StatusBadge status={d.status} label={t(d.status === "approved" ? "statusApproved" : d.status === "rejected" ? "statusRejected" : "statusPending")} /> }))} />
                <RelatedList title={t("auTickets")} empty={t("auNone")} items={mine(related.tickets).slice(0, 5).map((x) => ({ key: x.id, main: <a href={`/admin/tickets/${x.id}`} dir="auto" className="hover:underline">{x.subject}</a>, side: <StatusBadge status={x.status} label={t(x.status === "open" ? "statusOpen" : x.status === "answered" ? "statusAnswered" : "statusClosed")} /> }))} />
              </>
            )}
          </div>
        )}
      </Drawer>
    </div>
  );
}

function RelatedList({ title, empty, items }: { title: string; empty: string; items: { key: string; main: React.ReactNode; side: React.ReactNode }[] }) {
  return (
    <section>
      <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">{title} <span className="text-gray-400">({items.length})</span></h3>
      {items.length === 0 ? <p className="text-sm text-gray-400">{empty}</p> : (
        <ul className="divide-y divide-gray-100 rounded-xl border border-gray-100 dark:divide-gray-800 dark:border-gray-800">
          {items.map((it) => (
            <li key={it.key} className="flex items-center justify-between gap-3 px-3 py-2 text-sm text-gray-800 dark:text-gray-200">
              <span className="min-w-0 truncate">{it.main}</span>
              {it.side}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
