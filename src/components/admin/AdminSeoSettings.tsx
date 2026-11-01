"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { RotateCcw } from "lucide-react";
import { useT } from "@/i18n/useT";
import { useLanguage } from "@/context/LanguageContext";
import ChipInput from "@/components/dashboard/ChipInput";
import { PageHeader, Panel, Field, SkeletonRows, StatusBadge, ConfirmDialog, inputClass, buttonClass, cn } from "@/components/dashboard/ui";
import { SeoCounter, GooglePreview } from "@/components/admin/SeoParts";

type Values = { title: string; description: string; keywords: string[] };
type PageRow = Values & {
  page: string;
  path: string;
  titleSuffix: string;
  custom: boolean;
  updatedAt: string | null;
  defaults: Values;
};

const PAGE_LABEL_KEY = {
  home: "seoPageHome", pricing: "seoPagePricing", faq: "seoPageFaq", blog: "seoPageBlog",
  news: "seoPageNews", contact: "seoPageContact", privacy: "seoPagePrivacy", terms: "seoPageTerms",
} as const;

const same = (a: Values, b: Values) => a.title === b.title && a.description === b.description && JSON.stringify(a.keywords) === JSON.stringify(b.keywords);

export default function AdminSeoSettings() {
  const t = useT();
  const { lang } = useLanguage();
  const [rows, setRows] = useState<PageRow[] | null>(null);
  const [failed, setFailed] = useState(false);
  const [selected, setSelected] = useState("home");
  // Unsaved edits per page, so switching pages doesn't lose them.
  const [drafts, setDrafts] = useState<Record<string, Values>>({});
  const [saving, setSaving] = useState(false);
  const [confirmReset, setConfirmReset] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/seo");
      if (!res.ok) throw new Error();
      setRows(await res.json());
    } catch {
      setFailed(true);
    }
  }, []);
  useEffect(() => { queueMicrotask(load); }, [load]);

  const row = rows?.find((r) => r.page === selected) ?? null;
  const draft: Values | null = row ? drafts[selected] ?? { title: row.title, description: row.description, keywords: row.keywords } : null;
  const dirty = !!row && !!draft && !same(draft, row);
  const setDraft = (v: Values) => setDrafts((d) => ({ ...d, [selected]: v }));
  const isDirty = useMemo(() => (page: string) => {
    const r = rows?.find((x) => x.page === page);
    return !!r && !!drafts[page] && !same(drafts[page], r);
  }, [rows, drafts]);

  const label = (page: string) => t(PAGE_LABEL_KEY[page as keyof typeof PAGE_LABEL_KEY] ?? "seoPageHome");
  const fullTitle = draft && row ? `${draft.title}${row.titleSuffix}` : "";

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!draft || !row) return;
    setSaving(true);
    try {
      const res = await fetch("/api/admin/seo", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ page: row.page, ...draft }) });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(d.error);
      setRows((rs) => rs?.map((r) => (r.page === row.page ? { ...r, title: d.title, description: d.description, keywords: d.keywords, custom: true, updatedAt: d.updatedAt } : r)) ?? rs);
      setDrafts((ds) => { const n = { ...ds }; delete n[row.page]; return n; });
      toast.success(t("seoSaved"));
    } catch (err) {
      toast.error(err instanceof Error && err.message ? err.message : t("seoSaveError"));
    } finally {
      setSaving(false);
    }
  };

  const reset = async () => {
    if (!row) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/admin/seo?page=${row.page}`, { method: "DELETE" });
      if (!res.ok) throw new Error();
      setRows((rs) => rs?.map((r) => (r.page === row.page ? { ...r, ...r.defaults, custom: false, updatedAt: null } : r)) ?? rs);
      setDrafts((ds) => { const n = { ...ds }; delete n[row.page]; return n; });
      setConfirmReset(false);
      toast.success(t("seoResetDone"));
    } catch {
      toast.error(t("seoSaveError"));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader title={t("seoSettingsTitle")} description={t("seoSettingsSubtitle")} actions={dirty && <StatusBadge tone="warning" label={t("lgUnsaved")} />} />

      {failed ? <p className="text-sm text-error-600 dark:text-error-400">{t("seoError")}</p> : !rows || !row || !draft ? <SkeletonRows rows={6} /> : (
        <div className="grid gap-6 xl:grid-cols-[240px_1fr]">
          {/* Page picker */}
          <Panel title={t("seoPages")} bodyClassName="p-2" className="h-fit">
            <ul className="space-y-1">
              {rows.map((r) => {
                const on = r.page === selected;
                return (
                  <li key={r.page}>
                    <button
                      type="button"
                      onClick={() => setSelected(r.page)}
                      aria-current={on ? "page" : undefined}
                      className={cn(
                        "flex w-full items-center justify-between gap-2 rounded-lg px-3 py-2.5 text-start text-sm transition",
                        on ? "bg-brand-50 font-semibold text-brand-700 dark:bg-brand-500/15 dark:text-brand-300" : "text-gray-700 hover:bg-gray-50 dark:text-gray-300 dark:hover:bg-white/[0.03]",
                      )}
                    >
                      <span className="min-w-0">
                        <span className="block truncate">{label(r.page)}</span>
                        <span dir="ltr" className="block text-start font-mono-signal text-[11px] font-normal text-gray-400">{r.path}</span>
                      </span>
                      <span className="flex shrink-0 items-center gap-1.5">
                        {isDirty(r.page) && <span className="h-1.5 w-1.5 rounded-full bg-warning-500" aria-label={t("lgUnsaved")} />}
                        <StatusBadge tone={r.custom ? "brand" : "neutral"} label={r.custom ? t("seoCustom") : t("seoDefault")} />
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </Panel>

          <div className="grid gap-6 2xl:grid-cols-5">
            <Panel
              className="2xl:col-span-3"
              title={<span className="flex items-center gap-2">{label(row.page)} <span dir="ltr" className="font-mono-signal text-xs font-normal text-gray-400">{row.path}</span></span>}
              actions={row.custom && <button type="button" onClick={() => setConfirmReset(true)} className={buttonClass("secondary", "sm")}><RotateCcw className="h-3.5 w-3.5" />{t("seoReset")}</button>}
            >
              <form onSubmit={save} className="space-y-5">
                <Field
                  label={<span className="flex w-full justify-between gap-2">{t("seoFieldTitle")}<SeoCounter n={fullTitle.length} min={30} max={60} /></span>}
                  hint={row.titleSuffix ? t("seoSuffixNote") : t("seoTitleTip")}
                  htmlFor="seo-title"
                >
                  <input id="seo-title" required dir="auto" maxLength={120} value={draft.title} onChange={(e) => setDraft({ ...draft, title: e.target.value })} placeholder={row.defaults.title} className={inputClass} />
                </Field>
                <Field label={<span className="flex w-full justify-between gap-2">{t("seoFieldDescription")}<SeoCounter n={draft.description.length} min={110} max={160} /></span>} hint={t("seoDescTip")} htmlFor="seo-desc">
                  <textarea id="seo-desc" required dir="auto" rows={4} maxLength={320} value={draft.description} onChange={(e) => setDraft({ ...draft, description: e.target.value })} placeholder={row.defaults.description} className={cn(inputClass, "h-auto resize-y py-3")} />
                </Field>
                <Field label={t("seoFieldKeywords")} hint={t("seoKeywordsNote")} htmlFor="seo-kw">
                  <ChipInput id="seo-kw" value={draft.keywords} onChange={(keywords) => setDraft({ ...draft, keywords })} placeholder={t("seoFieldKeywordsPlaceholder")} />
                </Field>
                <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
                  <span className="text-xs text-gray-400">
                    {row.updatedAt
                      ? <>{t("seoLastUpdated")}: {new Date(row.updatedAt).toLocaleString(lang === "fa" ? "fa-IR" : "en-US", { dateStyle: "medium", timeStyle: "short", hour12: false })}</>
                      : t("seoUsingDefault")}
                  </span>
                  <div className="flex gap-2">
                    {dirty && <button type="button" onClick={() => setDrafts((ds) => { const n = { ...ds }; delete n[row.page]; return n; })} className={buttonClass("secondary")}>{t("cancel")}</button>}
                    <button type="submit" disabled={saving || !dirty || !draft.title.trim() || !draft.description.trim()} className={buttonClass("primary")}>{saving ? t("seoSaving") : t("seoSave")}</button>
                  </div>
                </div>
              </form>
            </Panel>

            <Panel title={t("seoGooglePreview")} className="h-fit 2xl:col-span-2">
              <GooglePreview path={row.path} title={fullTitle} description={draft.description} />
            </Panel>
          </div>
        </div>
      )}

      <ConfirmDialog
        open={confirmReset}
        onClose={() => setConfirmReset(false)}
        onConfirm={reset}
        busy={saving}
        title={t("seoReset")}
        subject={row && <>{label(row.page)} <span dir="ltr" className="font-normal text-gray-500">{row.path}</span></>}
        warning={t("seoResetWarn")}
        confirmLabel={t("seoReset")}
        cancelLabel={t("cancel")}
        tone="primary"
      />
    </div>
  );
}
