"use client";

import { useState } from "react";
import { Plus, Megaphone, Send } from "lucide-react";
import { useT } from "@/i18n/useT";
import OrderedList, { Switch, useOrderedCrud } from "@/components/dashboard/OrderedList";
import { PageHeader, Panel, EmptyState, SkeletonRows, Dialog, ConfirmDialog, Field, StatusBadge, inputClass, buttonClass, cn } from "@/components/dashboard/ui";

type Announcement = { id: string; text: string; link: string; linkText: string; emoji: string; order: number; active: boolean };
const blank = { text: "", link: "", linkText: "", emoji: "🎉", active: true };

const EMOJI_LIST = [
  "🎉","📣","📢","🔔","🔥","⚡","🚀","✨","💡","🎁",
  "🏆","🎯","📌","⭐","🌟","💎","🧩","📦","🔒","🛡️",
  "⚠️","✅","❗","💬","📝","🗓️","👋","🙌","📊","📈",
];

/** Mirrors the public announcement bar closely enough to judge length and wording. */
function BarPreview({ a }: { a: Pick<Announcement, "emoji" | "text" | "link" | "linkText"> }) {
  return (
    <div className="flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-brand-600 to-theme-purple-500 px-4 py-2.5 text-center text-sm text-white">
      <span aria-hidden>{a.emoji}</span>
      <span dir="auto" className="truncate">{a.text || "…"}</span>
      {a.link && <span className="shrink-0 font-semibold underline underline-offset-2">{a.linkText || a.link}</span>}
    </div>
  );
}

export default function AdminAnnouncements() {
  const t = useT();
  const crud = useOrderedCrud<Announcement>("/api/admin/announcements", { saved: t("annSaved"), added: t("annAdded"), deleted: t("annDeleted"), orderSaved: t("olOrderSaved"), error: t("saveError") });

  const [editing, setEditing] = useState<Announcement | "new" | null>(null);
  const [form, setForm] = useState(blank);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [deleting, setDeleting] = useState<Announcement | null>(null);
  const [activating, setActivating] = useState<Announcement | null>(null);
  const [busy, setBusy] = useState(false);

  const openNew = () => { setForm(blank); setError(""); setEditing("new"); };
  const openEdit = (a: Announcement) => { setForm({ text: a.text, link: a.link ?? "", linkText: a.linkText ?? "", emoji: a.emoji || "🎉", active: a.active }); setError(""); setEditing(a); };

  // The API posts to Telegram when an announcement is created active or switched from inactive to active.
  const willPostToTelegram = form.active && (editing === "new" || (editing !== null && !editing.active));

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    const nextOrder = ((crud.items ?? []).at(-1)?.order ?? 0) + 10;
    const err = editing === "new" ? await crud.create({ ...form, order: nextOrder }) : editing ? await crud.update(editing.id, form) : null;
    setSaving(false);
    if (err) setError(err);
    else setEditing(null);
  };

  // The first active announcement (by order) is the one the public bar shows.
  const liveId = crud.items?.find((a) => a.active)?.id;

  return (
    <div className="space-y-6">
      <PageHeader
        title={t("annTitle")}
        description={t("annDesc")}
        actions={<button type="button" onClick={openNew} className={buttonClass("primary")}><Plus className="h-4 w-4" />{t("annAddBtn")}</button>}
      />
      <Panel bodyClassName="p-0" title={crud.items?.length ? `${crud.items.length} ${t("annTotal")}` : undefined} description={crud.items?.length ? t("olOrderHint") : undefined}>
        {crud.items === null ? <div className="p-5"><SkeletonRows rows={4} /></div>
          : crud.items.length === 0 ? <EmptyState icon={<Megaphone className="h-6 w-6" />} title={t("annEmpty")} action={<button type="button" onClick={openNew} className={buttonClass("primary", "sm")}><Plus className="h-4 w-4" />{t("annAddBtn")}</button>} />
          : (
            <OrderedList
              items={crud.items}
              busy={crud.busy || busy}
              onMove={crud.move}
              onToggle={(a, active) => (active ? setActivating(a) : crud.update(a.id, { active: false }, true))}
              onEdit={openEdit}
              onDelete={setDeleting}
              render={(a) => (
                <div className="flex min-w-0 items-center gap-3">
                  <span className="text-xl" aria-hidden>{a.emoji}</span>
                  <div className="min-w-0">
                    <p dir="auto" className="truncate text-sm font-medium text-gray-900 dark:text-white">{a.text}</p>
                    <div className="mt-0.5 flex items-center gap-2">
                      {a.id === liveId && <StatusBadge status="online" label={t("annLive")} pulse />}
                      {a.link && <span dir="ltr" className="truncate font-mono-signal text-xs text-gray-400">{a.link}</span>}
                    </div>
                  </div>
                </div>
              )}
            />
          )}
      </Panel>

      <Dialog open={editing !== null} onClose={() => !saving && setEditing(null)} title={editing === "new" ? t("annAddModal") : t("annEditModal")} size="lg">
        <form onSubmit={save} className="space-y-4">
          <div>
            <p className="mb-1.5 text-xs font-medium text-gray-500 dark:text-gray-400">{t("annPreview")}</p>
            <BarPreview a={form} />
          </div>
          <Field label={t("annFieldEmoji")}>
            <div className="flex flex-wrap gap-1">
              {EMOJI_LIST.map((em) => (
                <button key={em} type="button" onClick={() => setForm({ ...form, emoji: em })} aria-pressed={form.emoji === em} className={cn("flex h-9 w-9 items-center justify-center rounded-lg text-lg transition", form.emoji === em ? "bg-brand-50 ring-2 ring-brand-500 dark:bg-brand-500/15" : "hover:bg-gray-100 dark:hover:bg-white/5")}>{em}</button>
              ))}
            </div>
          </Field>
          <Field label={t("annColText")} htmlFor="ann-text">
            <input id="ann-text" required autoFocus dir="auto" value={form.text} onChange={(e) => setForm({ ...form, text: e.target.value })} placeholder={t("annFieldTextPlaceholder")} className={inputClass} />
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label={t("annFieldLink")} htmlFor="ann-link">
              <input id="ann-link" dir="ltr" value={form.link} onChange={(e) => setForm({ ...form, link: e.target.value })} placeholder={t("annFieldLinkPlaceholder")} className={cn(inputClass, "font-mono-signal")} />
            </Field>
            <Field label={t("annFieldLinkText")} htmlFor="ann-linktext">
              <input id="ann-linktext" dir="auto" value={form.linkText} onChange={(e) => setForm({ ...form, linkText: e.target.value })} placeholder={t("annFieldLinkTextPlaceholder")} className={inputClass} />
            </Field>
          </div>
          <label className="flex items-center gap-3 text-sm text-gray-700 dark:text-gray-300">
            <Switch checked={form.active} onChange={(v) => setForm({ ...form, active: v })} label={t("olActive")} />{t("olActive")}
          </label>
          {willPostToTelegram && (
            <p className="flex items-start gap-2 rounded-xl bg-blue-light-50 p-3 text-xs text-blue-light-800 dark:bg-blue-light-500/10 dark:text-blue-light-300">
              <Send className="h-4 w-4 shrink-0 rtl:-scale-x-100" aria-hidden />{t("annTelegramWarn")}
            </p>
          )}
          {error && <p role="alert" className="text-sm text-error-600 dark:text-error-400">{error}</p>}
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={() => setEditing(null)} disabled={saving} className={buttonClass("secondary")}>{t("annCancel")}</button>
            <button type="submit" disabled={saving} className={buttonClass("primary")}>{saving ? t("annSaving") : editing === "new" ? t("annSave") : t("annSaveChanges")}</button>
          </div>
        </form>
      </Dialog>

      {/* Activating from the list posts to Telegram, so confirm it like the dialog warns. */}
      <ConfirmDialog
        open={!!activating}
        onClose={() => setActivating(null)}
        onConfirm={async () => { if (!activating) return; setBusy(true); const err = await crud.update(activating.id, { active: true }); setBusy(false); if (!err) setActivating(null); }}
        busy={busy}
        title={t("olActive")}
        subject={activating && <span dir="auto">{activating.emoji} {activating.text}</span>}
        warning={t("annTelegramWarn")}
        confirmLabel={t("olActive")}
        tone="primary"
        cancelLabel={t("annCancel")}
      />

      <ConfirmDialog
        open={!!deleting}
        onClose={() => setDeleting(null)}
        onConfirm={async () => { if (!deleting) return; setBusy(true); const err = await crud.remove(deleting.id); setBusy(false); if (!err) setDeleting(null); }}
        busy={busy}
        title={t("annDeleteTitle")}
        subject={deleting && <span dir="auto">{deleting.emoji} {deleting.text}</span>}
        confirmLabel={t("annDelete")}
        cancelLabel={t("annCancel")}
      />
    </div>
  );
}
