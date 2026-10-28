"use client";

// One editor for creating and editing news items (replaces the two
// near-identical New/Edit forms). Same layout as BlogPostEditor.

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ArrowLeft, ArrowRight, Send, Star } from "lucide-react";
import { useT } from "@/i18n/useT";
import { useLanguage } from "@/context/LanguageContext";
import ChipInput from "@/components/dashboard/ChipInput";
import { Switch } from "@/components/dashboard/OrderedList";
import { PageHeader, Panel, Field, SkeletonRows, StatusBadge, inputClass, buttonClass, cn } from "@/components/dashboard/ui";
import { ImageSlot, useUnsavedGuard } from "./EditorParts";

type NewsForm = { category: string; title: string; body: string; publishedAt: string; highlight: boolean; published: boolean; hashtags: string[]; image: string; coverImage: string };

const today = () => new Date().toISOString().slice(0, 10);
const EMPTY: NewsForm = { category: "", title: "", body: "", publishedAt: today(), highlight: false, published: false, hashtags: [], image: "", coverImage: "" };

export default function NewsItemEditor({ id }: { id?: string }) {
  const t = useT();
  const { lang } = useLanguage();
  const router = useRouter();
  const Back = lang === "fa" ? ArrowRight : ArrowLeft;
  const isNew = !id;

  const [initial, setInitial] = useState<NewsForm | null>(isNew ? EMPTY : null);
  const [form, setForm] = useState<NewsForm>(EMPTY);
  const [categories, setCategories] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/admin/news/tags").then((r) => r.json()).then((d) => setCategories(Array.isArray(d) ? d.map((c: { name: string }) => (c.name || "").replace(/^#/, "")) : [])).catch(() => {});
  }, []);

  useEffect(() => {
    if (!id) return;
    fetch(`/api/admin/news/${id}`).then((r) => r.json()).then((d) => {
      const loaded: NewsForm = {
        category: (d.category || "").replace(/^#/, ""), title: d.title ?? "", body: d.body ?? "",
        publishedAt: d.publishedAt ? new Date(d.publishedAt).toISOString().slice(0, 10) : "",
        highlight: !!d.highlight, published: !!d.published, hashtags: d.hashtags ?? [], image: d.image ?? "", coverImage: d.coverImage ?? "",
      };
      setInitial(loaded);
      setForm(loaded);
    }).catch(() => setError(t("ovLoadFailed")));
  }, [id, t]);

  const dirty = useMemo(() => !!initial && JSON.stringify(form) !== JSON.stringify(initial), [form, initial]);
  useUnsavedGuard(dirty && !saving);
  const set = <K extends keyof NewsForm>(k: K, v: NewsForm[K]) => setForm((f) => ({ ...f, [k]: v }));
  const willNotify = form.published && (isNew || !initial?.published);

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSaving(true);
    // Create omits empty images; edit sends null so a removed image is actually cleared.
    const body = isNew
      ? { ...form, image: form.image || undefined, coverImage: form.coverImage || undefined }
      : { ...form, image: form.image || null, coverImage: form.coverImage || null };
    const res = await fetch(isNew ? "/api/admin/news" : `/api/admin/news/${id}`, { method: isNew ? "POST" : "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) { setSaving(false); return setError(data.error ?? t("saveError")); }
    toast.success(t("newsSaved"));
    setInitial(form);
    router.push("/admin/news");
  };

  if (!initial) return error ? <p className="text-sm text-error-600">{error}</p> : <SkeletonRows rows={8} />;

  return (
    <form onSubmit={save} className="space-y-6">
      <PageHeader
        title={isNew ? t("newsNewItemTitle") : t("newsEditItemTitle")}
        description={<Link href="/admin/news" className="inline-flex items-center gap-1 hover:text-gray-900 dark:hover:text-white"><Back className="h-3.5 w-3.5" />{t("edBack")}</Link>}
        actions={dirty && <StatusBadge tone="warning" label={t("lgUnsaved")} />}
      />

      <div className="grid gap-6 xl:grid-cols-[1fr_340px]">
        <div className="min-w-0 space-y-6">
          <Panel title={t("edContent")}>
            <div className="space-y-4">
              <Field label={t("newsFieldTitle")} htmlFor="ni-title">
                <input id="ni-title" required dir="auto" value={form.title} onChange={(e) => set("title", e.target.value)} placeholder={t("newsFieldTitlePlaceholder")} className={cn(inputClass, "text-base font-semibold")} />
              </Field>
              <Field label={t("newsFieldBody")} htmlFor="ni-body">
                <textarea id="ni-body" required dir="auto" rows={12} value={form.body} onChange={(e) => set("body", e.target.value)} placeholder={t("newsFieldBodyPlaceholder")} className={cn(inputClass, "h-auto resize-y py-3 leading-7")} />
              </Field>
              <div className="max-w-sm">
                <p className="mb-1.5 text-sm font-medium text-gray-700 dark:text-gray-300">{t("newsFieldImage")}</p>
                <ImageSlot value={form.image} onChange={(url) => set("image", url)} folder="news" />
              </div>
            </div>
          </Panel>
        </div>

        <div className="space-y-6">
          <Panel title={t("edDetails")}>
            <div className="space-y-4">
              <label className="flex items-center justify-between gap-3 text-sm font-medium text-gray-700 dark:text-gray-300">
                {t("newsFieldPublished")}
                <Switch checked={form.published} onChange={(v) => set("published", v)} label={t("newsFieldPublished")} />
              </label>
              {willNotify && <p className="flex items-start gap-2 rounded-xl bg-blue-light-50 p-3 text-xs text-blue-light-800 dark:bg-blue-light-500/10 dark:text-blue-light-300"><Send className="h-4 w-4 shrink-0 rtl:-scale-x-100" />{t("edPublishHint")}</p>}
              <label className="flex items-center justify-between gap-3 text-sm font-medium text-gray-700 dark:text-gray-300">
                <span className="inline-flex items-center gap-1.5"><Star className="h-4 w-4 text-warning-500" />{t("newsFieldIsNew")}</span>
                <Switch checked={form.highlight} onChange={(v) => set("highlight", v)} label={t("newsFieldIsNew")} />
              </label>
              <Field label={t("newsFieldCategory")} hint={t("edCustomCategory")} htmlFor="ni-cat">
                <input id="ni-cat" required list="ni-cat-list" dir="auto" value={form.category} onChange={(e) => set("category", e.target.value.replace(/^#/, ""))} placeholder={t("newsFieldCategoryPlaceholder")} className={inputClass} />
                <datalist id="ni-cat-list">{categories.map((c) => <option key={c} value={c} />)}</datalist>
              </Field>
              <Field label={t("newsFieldDate")} htmlFor="ni-date">
                <input id="ni-date" required type="date" dir="ltr" value={form.publishedAt} onChange={(e) => set("publishedAt", e.target.value)} className={inputClass} />
              </Field>
              <Field label={t("newsFieldHashtag")} htmlFor="ni-tags">
                <ChipInput id="ni-tags" prefix="#" value={form.hashtags} onChange={(v) => set("hashtags", v)} placeholder={t("newsFieldHashtagPlaceholder")} />
              </Field>
            </div>
          </Panel>
          <Panel title={t("newsFieldCoverImage")} description={t("edCoverHint")}>
            <ImageSlot value={form.coverImage} onChange={(url) => set("coverImage", url)} folder="news" />
          </Panel>
        </div>
      </div>

      <div className="sticky bottom-0 z-20 -mx-4 border-t border-gray-200 bg-white/90 backdrop-blur sm:-mx-6 dark:border-gray-800 dark:bg-gray-950/90">
        <div className="flex items-center justify-end gap-3 px-4 py-3 sm:px-6">
          {error && <p role="alert" className="me-auto text-sm text-error-600 dark:text-error-400">{error}</p>}
          <Link href="/admin/news" className={buttonClass("secondary")}>{t("newsCancelItem")}</Link>
          <button type="submit" disabled={saving || (!isNew && !dirty)} className={buttonClass("primary")}>{saving ? t("newsSavingItem") : isNew ? t("newsSaveItem") : t("newsSaveChanges")}</button>
        </div>
      </div>
    </form>
  );
}
