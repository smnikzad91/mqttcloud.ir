"use client";

// Shared list for blog posts and news items: search, status and category
// filters, publish toggle, re-send to Telegram, edit/view/delete, and the
// static-data import. Anything that posts to the public Telegram channel
// (publishing, re-sending) asks first.

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Plus, Search, FileText, ExternalLink, Pencil, Trash2, Send, Star, DatabaseZap, ImageOff } from "lucide-react";
import { useT } from "@/i18n/useT";
import type { TranslationKey } from "@/i18n/translations";
import { useLanguage } from "@/context/LanguageContext";
import { PageHeader, Panel, EmptyState, SkeletonRows, FilterPills, ConfirmDialog, StatusBadge, inputClass, buttonClass, cn } from "@/components/dashboard/ui";
import { Switch } from "@/components/dashboard/OrderedList";

export type ContentRow = {
  id: string;
  title: string;
  category: string;
  published: boolean;
  highlight: boolean;
  cover?: string;
  date: string;
  meta?: string;
  publicHref: string;
};

type Kind = "blog" | "news";
type Filter = "all" | "published" | "draft";

const KEYS: Record<Kind, Record<string, TranslationKey>> = {
  blog: { title: "blogPostsTitle", desc: "blogDesc", total: "blogPostsTotal", add: "blogNewPost", empty: "blogEmpty", published: "blogPublished", draft: "blogDraft", deleted: "blogDeleted", del: "blogDelete", delConfirm: "blogDeleteConfirm", sent: "blogTelegramSent", telegram: "blogTelegram", seed: "blogSeedBtn", seeding: "blogSeeding", seedDone: "blogSeedDone", view: "blogView", edit: "blogEdit" },
  news: { title: "newsListTitle", desc: "newsDesc", total: "newsListTotal", add: "newsNewItem", empty: "newsEmpty", published: "newsPublished", draft: "newsDraft", deleted: "newsDeleted", del: "newsDelete", delConfirm: "newsDeleteConfirm", sent: "newsTelegramSent", telegram: "newsTelegram", seed: "newsSeedBtn", seeding: "newsSeeding", seedDone: "newsSeedDone", view: "newsView", edit: "newsEdit" },
};

export default function ContentList({ kind, mapRow }: { kind: Kind; mapRow: (raw: Record<string, unknown>) => ContentRow }) {
  const t = useT();
  const k = (key: string) => t(KEYS[kind][key]);
  const { lang } = useLanguage();
  const base = `/api/admin/${kind}`;

  const [rows, setRows] = useState<ContentRow[] | null>(null);
  const [filter, setFilter] = useState<Filter>("all");
  const [category, setCategory] = useState("all");
  const [query, setQuery] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [seeding, setSeeding] = useState(false);
  const [confirm, setConfirm] = useState<{ kind: "publish" | "telegram" | "delete"; row: ContentRow } | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await fetch(base);
      const data = res.ok ? await res.json() : [];
      setRows((Array.isArray(data) ? data : []).map(mapRow));
    } catch {
      setRows([]);
    }
  }, [base, mapRow]);
  useEffect(() => { queueMicrotask(load); }, [load]);

  const setPublished = async (row: ContentRow, published: boolean) => {
    setBusyId(row.id);
    const res = await fetch(`${base}/${row.id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ published }) });
    setBusyId(null);
    if (!res.ok) { toast.error(t("saveError")); return false; }
    if (published) toast.success(k("sent"));
    load();
    return true;
  };

  const runConfirm = async () => {
    if (!confirm) return;
    const { row } = confirm;
    if (confirm.kind === "publish") {
      if (await setPublished(row, true)) setConfirm(null);
      return;
    }
    setBusyId(row.id);
    if (confirm.kind === "telegram") {
      const res = await fetch(`${base}/${row.id}/notify`, { method: "POST" });
      const data = await res.json().catch(() => ({}));
      if (res.ok) { toast.success(k("sent")); setConfirm(null); }
      else toast.error(data.error ?? t("saveError"));
    } else {
      const res = await fetch(`${base}/${row.id}`, { method: "DELETE" });
      if (res.ok) { toast.success(k("deleted")); setConfirm(null); load(); }
      else toast.error(t("saveError"));
    }
    setBusyId(null);
  };

  const seed = async () => {
    setSeeding(true);
    const res = await fetch(`${base}/seed`, { method: "POST" });
    const data = await res.json().catch(() => ({}));
    setSeeding(false);
    if (!res.ok) return toast.error(data.error ?? t("saveError"));
    toast.success(`${data.inserted} ${k("seedDone")} ${data.skipped}`);
    load();
  };

  const categories = useMemo(() => [...new Set((rows ?? []).map((r) => r.category).filter(Boolean))].sort(), [rows]);
  const q = query.trim().toLowerCase();
  const shown = useMemo(() => (rows ?? []).filter((r) =>
    (filter === "all" || (filter === "published") === r.published) &&
    (category === "all" || r.category === category) &&
    (!q || r.title.toLowerCase().includes(q))).sort((a, b) => +new Date(b.date) - +new Date(a.date)), [rows, filter, category, q]);
  const count = (f: Filter) => (rows ?? []).filter((r) => f === "all" || (f === "published") === r.published).length;

  const iconBtn = "flex h-8 w-8 items-center justify-center rounded-lg text-gray-500 transition hover:bg-gray-100 hover:text-gray-800 disabled:opacity-40 dark:text-gray-400 dark:hover:bg-white/5 dark:hover:text-white";
  const date = (iso: string) => new Date(iso).toLocaleDateString(lang === "fa" ? "fa-IR" : "en-US", { year: "numeric", month: "short", day: "numeric" });

  return (
    <div className="space-y-6">
      <PageHeader
        title={k("title")}
        description={k("desc")}
        actions={
          <>
            <button type="button" onClick={seed} disabled={seeding} title={t("clSeedHint")} className={buttonClass("secondary")}><DatabaseZap className="h-4 w-4" />{seeding ? k("seeding") : k("seed")}</button>
            <Link href={`/admin/${kind}/new`} className={buttonClass("primary")}><Plus className="h-4 w-4" />{k("add").replace(/^\+\s*/, "")}</Link>
          </>
        }
      />

      <Panel bodyClassName="p-0">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-100 px-5 py-4 dark:border-gray-800">
          <FilterPills<Filter>
            value={filter}
            onChange={setFilter}
            items={[
              { key: "all", label: t("filterAllShort"), count: count("all") },
              { key: "published", label: k("published"), count: count("published") },
              { key: "draft", label: k("draft"), count: count("draft") },
            ]}
          />
          <div className="flex flex-wrap items-center gap-2">
            {categories.length > 1 && (
              <select aria-label={t("clAllCategories")} value={category} onChange={(e) => setCategory(e.target.value)} className="h-9 rounded-lg border border-gray-200 bg-white px-2 text-xs text-gray-700 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200">
                <option value="all">{t("clAllCategories")}</option>
                {categories.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            )}
            <div className="relative w-full sm:w-64">
              <Search className="pointer-events-none absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" aria-hidden />
              <input type="search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder={t("clSearch")} aria-label={t("clSearch")} className={cn(inputClass, "h-9 ps-9")} />
            </div>
          </div>
        </div>

        {rows === null ? <div className="p-5"><SkeletonRows rows={5} /></div>
          : shown.length === 0 ? <EmptyState icon={<FileText className="h-6 w-6" />} title={k("empty")} />
          : (
            <ul className="divide-y divide-gray-100 dark:divide-gray-800">
              {shown.map((r) => (
                <li key={r.id} className="flex flex-wrap items-center gap-4 px-5 py-3.5 sm:flex-nowrap">
                  <div className="flex h-14 w-20 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-gray-100 dark:bg-white/5">
                    {r.cover ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={r.cover} alt="" className="h-full w-full object-cover" />
                    ) : <ImageOff className="h-5 w-5 text-gray-300 dark:text-gray-600" aria-hidden />}
                  </div>
                  <div className="min-w-0 flex-1">
                    <Link href={`/admin/${kind}/${r.id}/edit`} dir="auto" className="line-clamp-1 text-sm font-semibold text-gray-900 hover:text-brand-600 dark:text-white dark:hover:text-brand-400">{r.title}</Link>
                    <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-gray-500 dark:text-gray-400">
                      {r.category && <span className="rounded-md bg-gray-100 px-1.5 py-0.5 dark:bg-white/5">{r.category}</span>}
                      <span>{date(r.date)}</span>
                      {r.meta && <span>{r.meta}</span>}
                      {r.highlight && <span className="inline-flex items-center gap-1 text-warning-600 dark:text-warning-400"><Star className="h-3 w-3 fill-current" />{t("clFeatured")}</span>}
                    </div>
                  </div>
                  <div className="flex shrink-0 items-center gap-3">
                    <StatusBadge status={r.published ? "published" : "draft"} label={r.published ? k("published") : k("draft")} />
                    <Switch
                      checked={r.published}
                      disabled={busyId === r.id}
                      label={r.published ? t("clUnpublish") : t("clPublish")}
                      onChange={(v) => (v ? setConfirm({ kind: "publish", row: r }) : setPublished(r, false))}
                    />
                    <div className="flex items-center gap-0.5">
                      <a href={r.publicHref} target="_blank" rel="noopener noreferrer" className={iconBtn} title={k("view")} aria-label={k("view")}><ExternalLink className="h-4 w-4 rtl:-scale-x-100" /></a>
                      <Link href={`/admin/${kind}/${r.id}/edit`} className={iconBtn} title={k("edit")} aria-label={k("edit")}><Pencil className="h-4 w-4" /></Link>
                      <button type="button" className={iconBtn} disabled={!r.published || busyId === r.id} onClick={() => setConfirm({ kind: "telegram", row: r })} title={k("telegram")} aria-label={k("telegram")}><Send className="h-4 w-4 rtl:-scale-x-100" /></button>
                      <button type="button" className={cn(iconBtn, "hover:!bg-error-50 hover:!text-error-600 dark:hover:!bg-error-500/10")} onClick={() => setConfirm({ kind: "delete", row: r })} title={k("del")} aria-label={k("del")}><Trash2 className="h-4 w-4" /></button>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
      </Panel>

      <ConfirmDialog
        open={!!confirm}
        onClose={() => setConfirm(null)}
        onConfirm={runConfirm}
        busy={!!confirm && busyId === confirm.row.id}
        tone={confirm?.kind === "delete" ? "danger" : "primary"}
        title={confirm?.kind === "publish" ? t("clPublishTitle") : confirm?.kind === "telegram" ? t("clTelegramTitle") : k("delConfirm")}
        subject={confirm && <span dir="auto">{confirm.row.title}</span>}
        warning={confirm?.kind === "publish" ? t("clPublishWarn") : confirm?.kind === "telegram" ? t("clTelegramWarn") : undefined}
        confirmLabel={confirm?.kind === "publish" ? t("clPublish") : confirm?.kind === "telegram" ? k("telegram") : k("del")}
        cancelLabel={t("cancel")}
      />
    </div>
  );
}
