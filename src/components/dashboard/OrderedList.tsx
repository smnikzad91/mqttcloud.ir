"use client";

// Ordered CMS list (FAQs, announcements, social links): each row shows its
// content, an active switch, move up/down, edit and delete. Reordering uses
// buttons rather than drag-and-drop so it works by keyboard and on touch.

import React from "react";
import { toast } from "sonner";
import { ArrowUp, ArrowDown, Pencil, Trash2 } from "lucide-react";
import { useT } from "@/i18n/useT";
import { cn } from "./ui";

export type Ordered = { id: string; order: number; active: boolean };

export function Switch({ checked, onChange, label, disabled }: { checked: boolean; onChange: (v: boolean) => void; label: string; disabled?: boolean }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      title={label}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={cn(
        "relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-500 disabled:opacity-50",
        checked ? "bg-success-500" : "bg-gray-200 dark:bg-gray-700",
      )}
    >
      <span className={cn("inline-block h-5 w-5 rounded-full bg-white shadow transition-transform", checked ? "translate-x-[22px] rtl:-translate-x-[22px]" : "translate-x-0.5 rtl:-translate-x-0.5")} />
    </button>
  );
}

export default function OrderedList<T extends Ordered>({
  items,
  render,
  onMove,
  onToggle,
  onEdit,
  onDelete,
  busy,
}: {
  items: T[];
  render: (item: T) => React.ReactNode;
  onMove: (index: number, dir: -1 | 1) => void;
  onToggle: (item: T, active: boolean) => void;
  onEdit: (item: T) => void;
  onDelete: (item: T) => void;
  busy?: boolean;
}) {
  const t = useT();
  const btn = "flex h-8 w-8 items-center justify-center rounded-lg text-gray-500 transition hover:bg-gray-100 hover:text-gray-800 disabled:pointer-events-none disabled:opacity-30 dark:text-gray-400 dark:hover:bg-white/5 dark:hover:text-white";
  return (
    <ol className="divide-y divide-gray-100 dark:divide-gray-800">
      {items.map((item, i) => (
        <li key={item.id} className={cn("flex items-center gap-3 px-4 py-3 sm:px-5", !item.active && "opacity-60")}>
          <div className="flex shrink-0 flex-col">
            <button type="button" className={cn(btn, "h-6")} disabled={busy || i === 0} onClick={() => onMove(i, -1)} aria-label={t("olMoveUp")} title={t("olMoveUp")}><ArrowUp className="h-3.5 w-3.5" /></button>
            <button type="button" className={cn(btn, "h-6")} disabled={busy || i === items.length - 1} onClick={() => onMove(i, 1)} aria-label={t("olMoveDown")} title={t("olMoveDown")}><ArrowDown className="h-3.5 w-3.5" /></button>
          </div>
          <div className="min-w-0 flex-1">{render(item)}</div>
          <Switch checked={item.active} onChange={(v) => onToggle(item, v)} label={item.active ? t("olActive") : t("olInactive")} disabled={busy} />
          <div className="flex shrink-0 items-center gap-0.5">
            <button type="button" className={btn} onClick={() => onEdit(item)} aria-label={t("edit")} title={t("edit")}><Pencil className="h-4 w-4" /></button>
            <button type="button" className={cn(btn, "hover:!bg-error-50 hover:!text-error-600 dark:hover:!bg-error-500/10")} onClick={() => onDelete(item)} aria-label={t("delete")} title={t("delete")}><Trash2 className="h-4 w-4" /></button>
          </div>
        </li>
      ))}
    </ol>
  );
}

/**
 * Moves items[index] by `dir` and renumbers the whole list 0,10,20… so equal
 * or gapped `order` values can't make a move a no-op. Returns only the rows
 * whose order actually changed, for the caller to PUT `{ order }` on.
 */
export function reorder<T extends Ordered>(items: T[], index: number, dir: -1 | 1): { next: T[]; changed: T[] } {
  const target = index + dir;
  if (target < 0 || target >= items.length) return { next: items, changed: [] };
  const moved = [...items];
  [moved[index], moved[target]] = [moved[target], moved[index]];
  const next = moved.map((it, i) => ({ ...it, order: i * 10 }));
  const changed = next.filter((it) => items.find((o) => o.id === it.id)?.order !== it.order);
  return { next, changed };
}

/**
 * Load/create/update/delete/reorder for an admin collection at `endpoint`
 * (GET+POST on the collection, PUT/DELETE on `${endpoint}/${id}`, partial
 * `$set` updates). Rows come back with Mongo `_id`; they're exposed as `id`.
 */
export function useOrderedCrud<T extends Ordered>(endpoint: string, messages: { saved: string; added: string; deleted: string; orderSaved: string; error: string }) {
  const [items, setItems] = React.useState<T[] | null>(null);
  const [busy, setBusy] = React.useState(false);

  const load = React.useCallback(async () => {
    try {
      const res = await fetch(endpoint);
      const data = res.ok ? await res.json() : [];
      const rows = (Array.isArray(data) ? data : []) as (T & { _id?: string })[];
      setItems(rows.map((r) => ({ ...r, id: r._id ?? r.id })).sort((a, b) => a.order - b.order));
    } catch {
      setItems([]);
    }
  }, [endpoint]);
  React.useEffect(() => { queueMicrotask(load); }, [load]);

  const send = async (url: string, method: string, body?: unknown) => {
    const res = await fetch(url, { method, headers: body ? { "Content-Type": "application/json" } : undefined, body: body ? JSON.stringify(body) : undefined });
    if (res.ok) return null;
    const data = await res.json().catch(() => ({}));
    return (data as { error?: string }).error || messages.error;
  };

  /** Returns an error message, or null on success. */
  const create = async (body: Omit<T, "id">) => {
    const err = await send(endpoint, "POST", body);
    if (!err) { toast.success(messages.added); load(); }
    return err;
  };
  const update = async (id: string, body: Partial<T>, quiet = false) => {
    const err = await send(`${endpoint}/${id}`, "PUT", body);
    if (err) toast.error(err);
    else { if (!quiet) toast.success(messages.saved); load(); }
    return err;
  };
  const remove = async (id: string) => {
    const err = await send(`${endpoint}/${id}`, "DELETE");
    if (err) toast.error(err);
    else { toast.success(messages.deleted); load(); }
    return err;
  };
  const move = async (index: number, dir: -1 | 1) => {
    if (!items) return;
    const { next, changed } = reorder(items, index, dir);
    setItems(next);
    setBusy(true);
    const errors = await Promise.all(changed.map((c) => send(`${endpoint}/${c.id}`, "PUT", { order: c.order })));
    setBusy(false);
    if (errors.some(Boolean)) { toast.error(messages.error); load(); }
    else toast.success(messages.orderSaved);
  };

  return { items, busy, load, create, update, remove, move };
}
