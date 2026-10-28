"use client";

// Shared screen for blog categories and news categories: list with usage
// counts, add/edit dialog, delete confirmation that says how many items use
// it, and the "import from existing content" seed.

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { Plus, Tags, Pencil, Trash2, DatabaseZap } from "lucide-react";
import { useT } from "@/i18n/useT";
import type { TranslationKey } from "@/i18n/translations";
import { PageHeader, Panel, EmptyState, SkeletonRows, Dialog, ConfirmDialog, Field, inputClass, buttonClass, cn, useFormatNumber } from "@/components/dashboard/ui";

type Term = { id: string; name: string; description: string; count: number };
type Kind = "blog" | "news";

const CONFIG: Record<Kind, { endpoint: string; countField: "postCount" | "itemCount"; keys: Record<string, TranslationKey> }> = {
  blog: {
    endpoint: "/api/admin/blog/categories",
    countField: "postCount",
    keys: { title: "blogCatsTitle", desc: "txBlogDesc", add: "blogAddCatModal", edit: "blogEditCatModal", name: "blogColName", namePh: "blogCatNamePlaceholder", description: "blogColDescription", descPh: "blogCatDescPlaceholder", empty: "blogCatEmpty", unit: "blogCatPosts", save: "blogCatSave", saveChanges: "blogCatSaveChanges", saving: "blogCatSaving", saved: "blogCatSaved", deleted: "blogCatDeleted", delTitle: "blogCatDeleteConfirm", warn1: "blogCatDeleteWarning", warn2: "blogCatDeleteWarning2", seed: "txSeedBlog", seedDone: "newsTagSeedDone" },
  },
  news: {
    endpoint: "/api/admin/news/tags",
    countField: "itemCount",
    keys: { title: "newsTagsTitle", desc: "txNewsDesc", add: "newsAddTagModal", edit: "newsTagEdit", name: "newsTagColName", namePh: "newsTagNamePlaceholder", description: "newsTagColDesc", descPh: "newsTagDescPlaceholder", empty: "newsTagEmpty", unit: "newsTagItems", save: "newsTagSave", saveChanges: "newsTagSaveChanges", saving: "newsTagSaving", saved: "newsTagSaved", deleted: "newsTagDeleted", delTitle: "newsTagDeleteConfirm", warn1: "newsTagDeleteWarning", warn2: "newsTagDeleteWarning2", seed: "newsTagSeedBtn", seedDone: "newsTagSeedDone" },
  },
};

export default function TaxonomyManager({ kind }: { kind: Kind }) {
  const t = useT();
  const fmt = useFormatNumber();
  const { endpoint, countField, keys } = CONFIG[kind];
  const k = (key: string) => t(keys[key]);

  const [terms, setTerms] = useState<Term[] | null>(null);
  const [editing, setEditing] = useState<Term | "new" | null>(null);
  const [form, setForm] = useState({ name: "", description: "" });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [deleting, setDeleting] = useState<Term | null>(null);
  const [deleteBusy, setDeleteBusy] = useState(false);
  const [seeding, setSeeding] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await fetch(endpoint);
      const data = res.ok ? await res.json() : [];
      setTerms((Array.isArray(data) ? data : []).map((d: Record<string, unknown>) => ({
        id: String(d.id ?? d._id), name: String(d.name ?? ""), description: String(d.description ?? ""), count: Number(d[countField] ?? 0),
      })));
    } catch {
      setTerms([]);
    }
  }, [endpoint, countField]);
  useEffect(() => { queueMicrotask(load); }, [load]);

  const openNew = () => { setForm({ name: "", description: "" }); setError(""); setEditing("new"); };
  const openEdit = (term: Term) => { setForm({ name: term.name, description: term.description }); setError(""); setEditing(term); };

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    const isNew = editing === "new";
    const res = await fetch(isNew ? endpoint : `${endpoint}/${(editing as Term).id}`, {
      method: isNew ? "POST" : "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: form.name.replace(/^#/, "").trim(), description: form.description }),
    });
    const data = await res.json().catch(() => ({}));
    setSaving(false);
    if (!res.ok) return setError(data.error ?? t("saveError"));
    toast.success(k("saved"));
    setEditing(null);
    load();
  };

  const confirmDelete = async () => {
    if (!deleting) return;
    setDeleteBusy(true);
    const res = await fetch(`${endpoint}/${deleting.id}`, { method: "DELETE" });
    setDeleteBusy(false);
    if (!res.ok) return toast.error(t("saveError"));
    toast.success(k("deleted"));
    setDeleting(null);
    load();
  };

  const seed = async () => {
    setSeeding(true);
    const res = await fetch(`${endpoint}/seed`, { method: "POST" });
    const data = await res.json().catch(() => ({}));
    setSeeding(false);
    if (!res.ok) return toast.error(data.error ?? t("saveError"));
    toast.success(`${data.inserted} ${k("seedDone")} ${data.skipped}`);
    load();
  };

  const iconBtn = "flex h-8 w-8 items-center justify-center rounded-lg text-gray-500 transition hover:bg-gray-100 hover:text-gray-800 dark:text-gray-400 dark:hover:bg-white/5 dark:hover:text-white";

  return (
    <div className="space-y-6">
      <PageHeader
        title={k("title")}
        description={k("desc")}
        actions={
          <>
            <button type="button" onClick={seed} disabled={seeding} className={buttonClass("secondary")}><DatabaseZap className="h-4 w-4" />{seeding ? t("newsSeeding") : k("seed")}</button>
            <button type="button" onClick={openNew} className={buttonClass("primary")}><Plus className="h-4 w-4" />{k("add")}</button>
          </>
        }
      />

      <Panel bodyClassName="p-0">
        {terms === null ? <div className="p-5"><SkeletonRows rows={4} /></div>
          : terms.length === 0 ? <EmptyState icon={<Tags className="h-6 w-6" />} title={k("empty")} />
          : (
            <ul className="grid gap-px bg-gray-100 sm:grid-cols-2 xl:grid-cols-3 dark:bg-gray-800">
              {terms.map((term) => (
                <li key={term.id} className="flex items-start gap-3 bg-white p-4 dark:bg-gray-900">
                  <div className="min-w-0 flex-1">
                    <p dir="auto" className="truncate font-semibold text-gray-900 dark:text-white">#{term.name}</p>
                    <p dir="auto" className="mt-0.5 line-clamp-2 text-sm text-gray-500 dark:text-gray-400">{term.description || "—"}</p>
                    <p className={cn("mt-2 text-xs", term.count ? "text-brand-600 dark:text-brand-400" : "text-gray-400")}>{fmt(term.count)} {k("unit")}</p>
                  </div>
                  <div className="flex shrink-0 gap-0.5">
                    <button type="button" className={iconBtn} onClick={() => openEdit(term)} aria-label={k("edit")} title={k("edit")}><Pencil className="h-4 w-4" /></button>
                    <button type="button" className={cn(iconBtn, "hover:!bg-error-50 hover:!text-error-600 dark:hover:!bg-error-500/10")} onClick={() => setDeleting(term)} aria-label={t("delete")} title={t("delete")}><Trash2 className="h-4 w-4" /></button>
                  </div>
                </li>
              ))}
            </ul>
          )}
      </Panel>

      <Dialog open={editing !== null} onClose={() => !saving && setEditing(null)} title={editing === "new" ? k("add") : k("edit")}>
        <form onSubmit={save} className="space-y-4">
          <Field label={k("name")} htmlFor="tx-name">
            <input id="tx-name" required autoFocus dir="auto" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value.replace(/^#/, "") })} placeholder={k("namePh")} className={inputClass} />
          </Field>
          <Field label={k("description")} htmlFor="tx-desc">
            <input id="tx-desc" dir="auto" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder={k("descPh")} className={inputClass} />
          </Field>
          {error && <p role="alert" className="text-sm text-error-600 dark:text-error-400">{error}</p>}
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={() => setEditing(null)} disabled={saving} className={buttonClass("secondary")}>{t("cancel")}</button>
            <button type="submit" disabled={saving} className={buttonClass("primary")}>{saving ? k("saving") : editing === "new" ? k("save") : k("saveChanges")}</button>
          </div>
        </form>
      </Dialog>

      <ConfirmDialog
        open={!!deleting}
        onClose={() => setDeleting(null)}
        onConfirm={confirmDelete}
        busy={deleteBusy}
        title={k("delTitle")}
        subject={deleting && <span dir="auto">#{deleting.name}</span>}
        warning={deleting && deleting.count > 0 ? `${k("warn1")} ${fmt(deleting.count)} ${k("warn2")}` : undefined}
        confirmLabel={t("delete")}
        cancelLabel={t("cancel")}
      />
    </div>
  );
}
