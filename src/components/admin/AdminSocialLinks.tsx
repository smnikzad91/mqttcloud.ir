"use client";

import { useState } from "react";
import { Plus, Share2, ExternalLink } from "lucide-react";
import { useT } from "@/i18n/useT";
import { useLanguage } from "@/context/LanguageContext";
import { SocialIcon, PLATFORM_LABELS, PLATFORM_LABELS_FA } from "@/components/common/SocialIcon";
import type { SocialPlatform } from "@/models/SocialLink";
import OrderedList, { Switch, useOrderedCrud } from "@/components/dashboard/OrderedList";
import { PageHeader, Panel, EmptyState, SkeletonRows, Dialog, ConfirmDialog, Field, inputClass, buttonClass, cn } from "@/components/dashboard/ui";

type SocialLink = { id: string; platform: SocialPlatform; url: string; label: string; order: number; active: boolean };

const PLATFORMS: SocialPlatform[] = ["telegram", "instagram", "twitter", "youtube", "linkedin", "whatsapp", "discord", "github", "facebook", "tiktok"];
const blank = { platform: "telegram" as SocialPlatform, url: "", label: "", active: true };

export default function AdminSocialLinks() {
  const t = useT();
  const { lang } = useLanguage();
  const names = lang === "fa" ? PLATFORM_LABELS_FA : PLATFORM_LABELS;
  const crud = useOrderedCrud<SocialLink>("/api/admin/social-links", { saved: t("socialSaved"), added: t("socialSaved"), deleted: t("socialDeleted"), orderSaved: t("olOrderSaved"), error: t("saveError") });

  const [editing, setEditing] = useState<SocialLink | "new" | null>(null);
  const [form, setForm] = useState(blank);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [deleting, setDeleting] = useState<SocialLink | null>(null);
  const [deleteBusy, setDeleteBusy] = useState(false);

  const openNew = () => { setForm(blank); setError(""); setEditing("new"); };
  const openEdit = (l: SocialLink) => { setForm({ platform: l.platform, url: l.url, label: (l.label || "").replace(/^#/, ""), active: l.active }); setError(""); setEditing(l); };

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    const nextOrder = ((crud.items ?? []).at(-1)?.order ?? 0) + 10;
    const err = editing === "new" ? await crud.create({ ...form, order: nextOrder }) : editing ? await crud.update(editing.id, form) : null;
    setSaving(false);
    if (err) setError(err);
    else setEditing(null);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title={t("socialLinksTitle")}
        description={t("socialDesc")}
        actions={<button type="button" onClick={openNew} className={buttonClass("primary")}><Plus className="h-4 w-4" />{t("socialAddModal")}</button>}
      />
      <Panel bodyClassName="p-0" title={crud.items?.length ? `${crud.items.length} ${t("socialLinksTotal")}` : undefined} description={crud.items?.length ? t("olOrderHint") : undefined}>
        {crud.items === null ? <div className="p-5"><SkeletonRows rows={4} /></div>
          : crud.items.length === 0 ? <EmptyState icon={<Share2 className="h-6 w-6" />} title={t("socialEmpty")} action={<button type="button" onClick={openNew} className={buttonClass("primary", "sm")}><Plus className="h-4 w-4" />{t("socialAddModal")}</button>} />
          : (
            <OrderedList
              items={crud.items}
              busy={crud.busy}
              onMove={crud.move}
              onToggle={(l, active) => crud.update(l.id, { active }, true)}
              onEdit={openEdit}
              onDelete={setDeleting}
              render={(l) => (
                <div className="flex min-w-0 items-center gap-3">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gray-100 text-gray-700 dark:bg-white/5 dark:text-gray-200"><SocialIcon platform={l.platform} className="h-4 w-4" /></span>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-gray-900 dark:text-white">{l.label ? l.label.replace(/^#/, "") : names[l.platform]}</p>
                    <a href={l.url} target="_blank" rel="noopener noreferrer" dir="ltr" className="flex items-center gap-1 truncate font-mono-signal text-xs text-gray-400 hover:text-brand-600">
                      <span className="truncate">{l.url}</span><ExternalLink className="h-3 w-3 shrink-0" />
                    </a>
                  </div>
                </div>
              )}
            />
          )}
      </Panel>

      <Dialog open={editing !== null} onClose={() => !saving && setEditing(null)} title={editing === "new" ? t("socialAddModal") : t("socialEditModal")}>
        <form onSubmit={save} className="space-y-4">
          <Field label={t("socialColPlatform")}>
            <div className="grid grid-cols-5 gap-1.5">
              {PLATFORMS.map((p) => (
                <button key={p} type="button" onClick={() => setForm({ ...form, platform: p })} aria-pressed={form.platform === p} title={names[p]} aria-label={names[p]}
                  className={cn("flex h-11 items-center justify-center rounded-xl border transition", form.platform === p ? "border-brand-500 bg-brand-50 text-brand-700 dark:bg-brand-500/15 dark:text-brand-300" : "border-gray-200 text-gray-600 hover:border-gray-300 dark:border-gray-700 dark:text-gray-300")}>
                  <SocialIcon platform={p} className="h-5 w-5" />
                </button>
              ))}
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400">{names[form.platform]}</p>
          </Field>
          <Field label={t("socialColUrl")} htmlFor="sl-url">
            <input id="sl-url" required type="url" dir="ltr" value={form.url} onChange={(e) => setForm({ ...form, url: e.target.value })} placeholder={t("socialFieldUrlPlaceholder")} className={cn(inputClass, "font-mono-signal")} />
          </Field>
          <Field label={t("socialFieldLabel")} htmlFor="sl-label">
            <input id="sl-label" dir="auto" value={form.label} onChange={(e) => setForm({ ...form, label: e.target.value.replace(/^#/, "") })} placeholder={t("socialFieldLabelPlaceholder")} className={inputClass} />
          </Field>
          <label className="flex items-center gap-3 text-sm text-gray-700 dark:text-gray-300">
            <Switch checked={form.active} onChange={(v) => setForm({ ...form, active: v })} label={t("olActive")} />{t("olActive")}
          </label>
          {error && <p role="alert" className="text-sm text-error-600 dark:text-error-400">{error}</p>}
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={() => setEditing(null)} disabled={saving} className={buttonClass("secondary")}>{t("socialCancel")}</button>
            <button type="submit" disabled={saving} className={buttonClass("primary")}>{saving ? t("socialSaving") : editing === "new" ? t("socialSave") : t("socialSaveChanges")}</button>
          </div>
        </form>
      </Dialog>

      <ConfirmDialog
        open={!!deleting}
        onClose={() => setDeleting(null)}
        onConfirm={async () => { if (!deleting) return; setDeleteBusy(true); const err = await crud.remove(deleting.id); setDeleteBusy(false); if (!err) setDeleting(null); }}
        busy={deleteBusy}
        title={t("socialDelete")}
        subject={deleting && <span dir="ltr">{deleting.url}</span>}
        confirmLabel={t("socialDeleteConfirm")}
        cancelLabel={t("socialCancel")}
      />
    </div>
  );
}
