"use client";

// One editor for creating and editing blog posts (replaces the two
// near-identical New/Edit forms). Content on the start side, publishing
// details in a side column, sticky save bar, unsaved-changes guard.

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ArrowLeft, ArrowRight, Plus, Trash2, ArrowUp, ArrowDown, Send, Star } from "lucide-react";
import { useT } from "@/i18n/useT";
import { useLanguage } from "@/context/LanguageContext";
import ChipInput from "@/components/dashboard/ChipInput";
import { Switch } from "@/components/dashboard/OrderedList";
import { PageHeader, Panel, Field, SkeletonRows, StatusBadge, inputClass, buttonClass, cn } from "@/components/dashboard/ui";
import { ImageSlot, slugify, useUnsavedGuard } from "./EditorParts";

type Section = { heading: string; body: string; image: string };
type PostForm = {
  slug: string; category: string; title: string; excerpt: string; readTime: string;
  published: boolean; highlight: boolean; hashtags: string[]; coverImage: string; sections: Section[];
};

const EMPTY: PostForm = { slug: "", category: "", title: "", excerpt: "", readTime: "", published: false, highlight: false, hashtags: [], coverImage: "", sections: [{ heading: "", body: "", image: "" }] };

export default function BlogPostEditor({ id }: { id?: string }) {
  const t = useT();
  const { lang } = useLanguage();
  const router = useRouter();
  const Back = lang === "fa" ? ArrowRight : ArrowLeft;
  const isNew = !id;

  const [initial, setInitial] = useState<PostForm | null>(isNew ? EMPTY : null);
  const [form, setForm] = useState<PostForm>(EMPTY);
  const [slugTouched, setSlugTouched] = useState(!isNew);
  const [categories, setCategories] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/admin/blog/categories").then((r) => r.json()).then((d) => setCategories(Array.isArray(d) ? d.map((c: { name: string }) => (c.name || "").replace(/^#/, "")) : [])).catch(() => {});
  }, []);

  useEffect(() => {
    if (!id) return;
    fetch(`/api/admin/blog/${id}`).then((r) => r.json()).then((d) => {
      const loaded: PostForm = {
        slug: d.slug ?? "", category: (d.category || "").replace(/^#/, ""), title: d.title ?? "", excerpt: d.excerpt ?? "",
        readTime: d.readTime ?? "", published: !!d.published, highlight: !!d.highlight, hashtags: d.hashtags ?? [], coverImage: d.coverImage ?? "",
        sections: (d.sections ?? []).map((s: Partial<Section>) => ({ heading: s.heading ?? "", body: s.body ?? "", image: s.image ?? "" })),
      };
      if (!loaded.sections.length) loaded.sections = [{ heading: "", body: "", image: "" }];
      setInitial(loaded);
      setForm(loaded);
    }).catch(() => setError(t("ovLoadFailed")));
  }, [id, t]);

  const dirty = useMemo(() => !!initial && JSON.stringify(form) !== JSON.stringify(initial), [form, initial]);
  useUnsavedGuard(dirty && !saving);

  const set = <K extends keyof PostForm>(k: K, v: PostForm[K]) => setForm((f) => ({ ...f, [k]: v }));
  const setTitle = (title: string) => setForm((f) => ({ ...f, title, slug: slugTouched ? f.slug : slugify(title) }));
  const setSection = (i: number, patch: Partial<Section>) => set("sections", form.sections.map((s, idx) => (idx === i ? { ...s, ...patch } : s)));
  const moveSection = (i: number, dir: -1 | 1) => {
    const next = [...form.sections];
    [next[i], next[i + dir]] = [next[i + dir], next[i]];
    set("sections", next);
  };

  // Publishing (new + published, or draft → published) posts to Telegram.
  const willNotify = form.published && (isNew || !initial?.published);

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    const sections = form.sections.filter((s) => s.body.trim()).map((s) => ({
      ...(s.heading.trim() ? { heading: s.heading.trim() } : {}),
      body: s.body.trim(),
      ...(s.image ? { image: s.image } : {}),
    }));
    if (!sections.length) return setError(t("edNoSections"));
    setError("");
    setSaving(true);
    const body = { ...form, category: form.category.replace(/^#/, "").trim(), sections };
    const res = await fetch(isNew ? "/api/admin/blog" : `/api/admin/blog/${id}`, { method: isNew ? "POST" : "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) { setSaving(false); return setError(data.error ?? t("saveError")); }
    // POST /api/admin/blog doesn't persist coverImage, so set it with a follow-up PUT on the new post.
    if (isNew && form.coverImage && data.id) {
      await fetch(`/api/admin/blog/${data.id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ coverImage: form.coverImage }) });
    }
    toast.success(t("blogSaved"));
    setInitial(form);
    router.push("/admin/blog");
  };

  if (!initial) return error ? <p className="text-sm text-error-600">{error}</p> : <SkeletonRows rows={8} />;

  return (
    <form onSubmit={save} className="space-y-6">
      <PageHeader
        title={isNew ? t("blogNewPostTitle") : t("blogEditPostTitle")}
        description={<Link href="/admin/blog" className="inline-flex items-center gap-1 hover:text-gray-900 dark:hover:text-white"><Back className="h-3.5 w-3.5" />{t("edBack")}</Link>}
        actions={dirty && <StatusBadge tone="warning" label={t("lgUnsaved")} />}
      />

      <div className="grid gap-6 xl:grid-cols-[1fr_340px]">
        <div className="min-w-0 space-y-6">
          <Panel title={t("edContent")}>
            <div className="space-y-4">
              <Field label={t("blogFieldTitle")} htmlFor="bp-title">
                <input id="bp-title" required dir="auto" value={form.title} onChange={(e) => setTitle(e.target.value)} placeholder={t("blogFieldTitlePlaceholder")} className={cn(inputClass, "text-base font-semibold")} />
              </Field>
              <Field label={t("blogFieldSlug")} hint={t("edSlugHint")} htmlFor="bp-slug">
                <div className="flex items-center gap-0 overflow-hidden rounded-xl border border-gray-300 dark:border-gray-700" dir="ltr">
                  <span className="bg-gray-50 px-3 py-2.5 font-mono-signal text-xs text-gray-400 dark:bg-white/[0.03]">/blog/</span>
                  <input id="bp-slug" required value={form.slug} onChange={(e) => { setSlugTouched(true); set("slug", slugify(e.target.value) || e.target.value); }} placeholder="post-url-slug" className="h-11 flex-1 bg-white px-2 font-mono-signal text-sm text-gray-900 outline-none dark:bg-gray-900 dark:text-white" />
                </div>
              </Field>
              <Field label={t("blogFieldExcerpt")} htmlFor="bp-excerpt">
                <textarea id="bp-excerpt" required dir="auto" rows={3} value={form.excerpt} onChange={(e) => set("excerpt", e.target.value)} placeholder={t("blogFieldExcerptPlaceholder")} className={cn(inputClass, "h-auto resize-y py-3")} />
              </Field>
            </div>
          </Panel>

          <Panel title={t("blogSections")} actions={<button type="button" onClick={() => set("sections", [...form.sections, { heading: "", body: "", image: "" }])} className={buttonClass("secondary", "sm")}><Plus className="h-4 w-4" />{t("blogAddSection").replace(/^\+\s*/, "")}</button>}>
            <ol className="space-y-5">
              {form.sections.map((s, i) => (
                <li key={i} className="rounded-xl border border-gray-200 p-4 dark:border-gray-800">
                  <div className="mb-3 flex items-center justify-between gap-2">
                    <span className="text-xs font-semibold uppercase tracking-wide text-gray-400">{t("blogSectionLabel")} {i + 1}</span>
                    <div className="flex gap-0.5">
                      <button type="button" disabled={i === 0} onClick={() => moveSection(i, -1)} aria-label={t("olMoveUp")} className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 disabled:opacity-30 dark:hover:bg-white/5"><ArrowUp className="h-4 w-4" /></button>
                      <button type="button" disabled={i === form.sections.length - 1} onClick={() => moveSection(i, 1)} aria-label={t("olMoveDown")} className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 disabled:opacity-30 dark:hover:bg-white/5"><ArrowDown className="h-4 w-4" /></button>
                      {form.sections.length > 1 && <button type="button" onClick={() => set("sections", form.sections.filter((_, idx) => idx !== i))} aria-label={t("blogSectionRemove")} className="rounded-lg p-1.5 text-gray-400 hover:bg-error-50 hover:text-error-600 dark:hover:bg-error-500/10"><Trash2 className="h-4 w-4" /></button>}
                    </div>
                  </div>
                  <div className="space-y-3">
                    <input dir="auto" value={s.heading} onChange={(e) => setSection(i, { heading: e.target.value })} placeholder={t("blogSectionHeadingPlaceholder")} aria-label={t("blogSectionHeadingPlaceholder")} className={cn(inputClass, "font-semibold")} />
                    <textarea dir="auto" rows={6} value={s.body} onChange={(e) => setSection(i, { body: e.target.value })} placeholder={t("blogSectionBodyPlaceholder")} aria-label={t("blogSectionBodyPlaceholder")} className={cn(inputClass, "h-auto resize-y py-3 leading-7")} />
                    <div className="max-w-xs">
                      <p className="mb-1.5 text-xs text-gray-500 dark:text-gray-400">{t("blogSectionImage")}</p>
                      <ImageSlot value={s.image} onChange={(url) => setSection(i, { image: url })} folder="blogs" />
                    </div>
                  </div>
                </li>
              ))}
            </ol>
          </Panel>
        </div>

        <div className="space-y-6">
          <Panel title={t("edDetails")}>
            <div className="space-y-4">
              <label className="flex items-center justify-between gap-3 text-sm font-medium text-gray-700 dark:text-gray-300">
                {t("blogFieldPublished")}
                <Switch checked={form.published} onChange={(v) => set("published", v)} label={t("blogFieldPublished")} />
              </label>
              {willNotify && <p className="flex items-start gap-2 rounded-xl bg-blue-light-50 p-3 text-xs text-blue-light-800 dark:bg-blue-light-500/10 dark:text-blue-light-300"><Send className="h-4 w-4 shrink-0 rtl:-scale-x-100" />{t("edPublishHint")}</p>}
              <label className="flex items-center justify-between gap-3 text-sm font-medium text-gray-700 dark:text-gray-300">
                <span className="inline-flex items-center gap-1.5"><Star className="h-4 w-4 text-warning-500" />{t("blogFieldHighlight")}</span>
                <Switch checked={form.highlight} onChange={(v) => set("highlight", v)} label={t("blogFieldHighlight")} />
              </label>
              {form.highlight && !initial.highlight && <p className="text-xs text-gray-500 dark:text-gray-400">{t("edFeaturedHint")}</p>}
              <Field label={t("blogFieldCategory")} hint={t("edCustomCategory")} htmlFor="bp-cat">
                <input id="bp-cat" required list="bp-cat-list" dir="auto" value={form.category} onChange={(e) => set("category", e.target.value.replace(/^#/, ""))} className={inputClass} />
                <datalist id="bp-cat-list">{categories.map((c) => <option key={c} value={c} />)}</datalist>
              </Field>
              <Field label={t("blogFieldReadTime")} htmlFor="bp-read">
                <input id="bp-read" required dir="auto" value={form.readTime} onChange={(e) => set("readTime", e.target.value)} placeholder={t("edReadTimeHint")} className={inputClass} />
              </Field>
              <Field label={t("blogFieldHashtag")} htmlFor="bp-tags">
                <ChipInput id="bp-tags" prefix="#" value={form.hashtags} onChange={(v) => set("hashtags", v)} placeholder={t("blogFieldHashtagPlaceholder")} />
              </Field>
            </div>
          </Panel>
          <Panel title={t("blogCoverImage")} description={t("edCoverHint")}>
            <ImageSlot value={form.coverImage} onChange={(url) => set("coverImage", url)} folder="blogs" />
          </Panel>
        </div>
      </div>

      {/* Sticky save bar */}
      <div className="sticky bottom-0 z-20 -mx-4 border-t border-gray-200 bg-white/90 backdrop-blur sm:-mx-6 dark:border-gray-800 dark:bg-gray-950/90">
        <div className="flex items-center justify-end gap-3 px-4 py-3 sm:px-6">
          {error && <p role="alert" className="me-auto text-sm text-error-600 dark:text-error-400">{error}</p>}
          <Link href="/admin/blog" className={buttonClass("secondary")}>{t("blogCancelPost")}</Link>
          <button type="submit" disabled={saving || (!isNew && !dirty)} className={buttonClass("primary")}>{saving ? t("blogSavingPost") : isNew ? t("blogSavePost") : t("blogSaveChanges")}</button>
        </div>
      </div>
    </form>
  );
}
