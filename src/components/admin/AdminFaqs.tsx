"use client";

import { useState } from "react";
import { Plus, CircleQuestionMark } from "lucide-react";
import { useT } from "@/i18n/useT";
import OrderedList, { Switch, useOrderedCrud } from "@/components/dashboard/OrderedList";
import { PageHeader, Panel, EmptyState, SkeletonRows, Dialog, ConfirmDialog, Field, inputClass, buttonClass, cn } from "@/components/dashboard/ui";

type Faq = { id: string; question: string; answer: string; order: number; active: boolean };
const blank = { question: "", answer: "", active: true };

export default function AdminFaqs() {
  const t = useT();
  const crud = useOrderedCrud<Faq>("/api/admin/faqs", { saved: t("faqSaved"), added: t("faqAdded"), deleted: t("faqDeleted"), orderSaved: t("olOrderSaved"), error: t("saveError") });

  const [editing, setEditing] = useState<Faq | "new" | null>(null);
  const [form, setForm] = useState(blank);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [deleting, setDeleting] = useState<Faq | null>(null);
  const [deleteBusy, setDeleteBusy] = useState(false);

  const openNew = () => { setForm(blank); setError(""); setEditing("new"); };
  const openEdit = (f: Faq) => { setForm({ question: f.question, answer: f.answer, active: f.active }); setError(""); setEditing(f); };

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
        title={t("faqTitle")}
        description={t("faqDesc")}
        actions={<button type="button" onClick={openNew} className={buttonClass("primary")}><Plus className="h-4 w-4" />{t("faqAddBtn")}</button>}
      />
      <Panel bodyClassName="p-0" description={crud.items?.length ? t("olOrderHint") : undefined} title={crud.items?.length ? `${crud.items.length} ${t("faqTotal")}` : undefined}>
        {crud.items === null ? <div className="p-5"><SkeletonRows rows={5} /></div>
          : crud.items.length === 0 ? <EmptyState icon={<CircleQuestionMark className="h-6 w-6" />} title={t("faqEmpty")} action={<button type="button" onClick={openNew} className={buttonClass("primary", "sm")}><Plus className="h-4 w-4" />{t("faqAddBtn")}</button>} />
          : (
            <OrderedList
              items={crud.items}
              busy={crud.busy}
              onMove={crud.move}
              onToggle={(f, active) => crud.update(f.id, { active }, true)}
              onEdit={openEdit}
              onDelete={setDeleting}
              render={(f) => (
                <div className="min-w-0">
                  <p dir="auto" className="truncate text-sm font-semibold text-gray-900 dark:text-white">{f.question}</p>
                  <p dir="auto" className="mt-0.5 line-clamp-2 text-sm text-gray-500 dark:text-gray-400">{f.answer}</p>
                </div>
              )}
            />
          )}
      </Panel>

      <Dialog open={editing !== null} onClose={() => !saving && setEditing(null)} title={editing === "new" ? t("faqAddModal") : t("faqEditModal")} size="lg">
        <form onSubmit={save} className="space-y-4">
          <Field label={t("faqColQuestion")} htmlFor="faq-q">
            <input id="faq-q" required autoFocus dir="auto" value={form.question} onChange={(e) => setForm({ ...form, question: e.target.value })} placeholder={t("faqFieldQuestionPlaceholder")} className={inputClass} />
          </Field>
          <Field label={t("faqColAnswer")} htmlFor="faq-a">
            <textarea id="faq-a" required dir="auto" rows={6} value={form.answer} onChange={(e) => setForm({ ...form, answer: e.target.value })} placeholder={t("faqFieldAnswerPlaceholder")} className={cn(inputClass, "h-auto resize-y py-3")} />
          </Field>
          <label className="flex items-center gap-3 text-sm text-gray-700 dark:text-gray-300">
            <Switch checked={form.active} onChange={(v) => setForm({ ...form, active: v })} label={t("olActive")} />{t("olActive")}
          </label>
          {error && <p role="alert" className="text-sm text-error-600 dark:text-error-400">{error}</p>}
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={() => setEditing(null)} disabled={saving} className={buttonClass("secondary")}>{t("faqCancel")}</button>
            <button type="submit" disabled={saving} className={buttonClass("primary")}>{saving ? t("faqSaving") : editing === "new" ? t("faqSave") : t("faqSaveChanges")}</button>
          </div>
        </form>
      </Dialog>

      <ConfirmDialog
        open={!!deleting}
        onClose={() => setDeleting(null)}
        onConfirm={async () => { if (!deleting) return; setDeleteBusy(true); const err = await crud.remove(deleting.id); setDeleteBusy(false); if (!err) setDeleting(null); }}
        busy={deleteBusy}
        title={t("faqDeleteTitle")}
        subject={deleting && <span dir="auto">{deleting.question}</span>}
        confirmLabel={t("faqDelete")}
        cancelLabel={t("faqCancel")}
      />
    </div>
  );
}
