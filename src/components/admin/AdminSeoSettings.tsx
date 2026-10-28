"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { useT } from "@/i18n/useT";
import { useLanguage } from "@/context/LanguageContext";
import ChipInput from "@/components/dashboard/ChipInput";
import { PageHeader, Panel, Field, SkeletonRows, StatusBadge, inputClass, buttonClass, cn, useFormatNumber } from "@/components/dashboard/ui";

type SeoData = { title: string; description: string; keywords: string[]; updatedAt?: string };

/** Length counter that turns amber outside the recommended range. */
function Counter({ n, min, max }: { n: number; min: number; max: number }) {
  const fmt = useFormatNumber();
  const t = useT();
  const ok = n >= min && n <= max;
  return <span className={cn("text-xs", ok ? "text-success-600 dark:text-success-400" : "text-warning-600 dark:text-warning-400")}>{fmt(n)} {t("seoChars")}</span>;
}

export default function AdminSeoSettings() {
  const t = useT();
  const { lang } = useLanguage();
  const [saved, setSaved] = useState<SeoData | null>(null);
  const [draft, setDraft] = useState<SeoData | null>(null);
  const [failed, setFailed] = useState(false);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/seo");
      if (!res.ok) throw new Error();
      const d = await res.json();
      const data = { title: d.title ?? "", description: d.description ?? "", keywords: d.keywords ?? [], updatedAt: d.updatedAt };
      setSaved(data); setDraft(data);
    } catch {
      setFailed(true);
    }
  }, []);
  useEffect(() => { queueMicrotask(load); }, [load]);

  const dirty = !!draft && !!saved && JSON.stringify([draft.title, draft.description, draft.keywords]) !== JSON.stringify([saved.title, saved.description, saved.keywords]);

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!draft) return;
    setSaving(true);
    try {
      const res = await fetch("/api/admin/seo", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ title: draft.title, description: draft.description, keywords: draft.keywords }) });
      if (!res.ok) throw new Error();
      const d = await res.json().catch(() => ({}));
      const next = { ...draft, updatedAt: d.updatedAt ?? new Date().toISOString() };
      setSaved(next); setDraft(next);
      toast.success(t("seoSaved"));
    } catch {
      toast.error(t("seoError"));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader title={t("seoSettingsTitle")} description={t("seoSettingsSubtitle")} actions={dirty && <StatusBadge tone="warning" label={t("lgUnsaved")} />} />

      {failed ? <p className="text-sm text-error-600 dark:text-error-400">{t("seoError")}</p> : !draft ? <SkeletonRows rows={6} /> : (
        <div className="grid gap-6 xl:grid-cols-5">
          <Panel className="xl:col-span-3">
            <form onSubmit={save} className="space-y-5">
              <Field label={<span className="flex w-full justify-between gap-2">{t("seoFieldTitle")}<Counter n={draft.title.length} min={50} max={60} /></span>} hint={t("seoTitleTip")} htmlFor="seo-title">
                <input id="seo-title" required dir="auto" value={draft.title} onChange={(e) => setDraft({ ...draft, title: e.target.value })} placeholder={t("seoFieldTitlePlaceholder")} className={inputClass} />
              </Field>
              <Field label={<span className="flex w-full justify-between gap-2">{t("seoFieldDescription")}<Counter n={draft.description.length} min={120} max={160} /></span>} hint={t("seoDescTip")} htmlFor="seo-desc">
                <textarea id="seo-desc" required dir="auto" rows={4} value={draft.description} onChange={(e) => setDraft({ ...draft, description: e.target.value })} placeholder={t("seoFieldDescriptionPlaceholder")} className={cn(inputClass, "h-auto resize-y py-3")} />
              </Field>
              <Field label={t("seoFieldKeywords")} hint={t("seoFieldKeywordsHint")} htmlFor="seo-kw">
                <ChipInput id="seo-kw" value={draft.keywords} onChange={(keywords) => setDraft({ ...draft, keywords })} placeholder={t("seoFieldKeywordsPlaceholder")} />
              </Field>
              <div className="flex items-center justify-between gap-3 pt-2">
                <span className="text-xs text-gray-400">
                  {saved?.updatedAt && <>{t("seoLastUpdated")}: {new Date(saved.updatedAt).toLocaleString(lang === "fa" ? "fa-IR" : "en-US", { dateStyle: "medium", timeStyle: "short" })}</>}
                </span>
                <button type="submit" disabled={saving || !dirty} className={buttonClass("primary")}>{saving ? t("seoSaving") : t("seoSave")}</button>
              </div>
            </form>
          </Panel>

          <Panel title={t("seoGooglePreview")} className="h-fit xl:col-span-2">
            {/* Approximates how Google renders the home page result. */}
            <div dir="auto" className="space-y-1 rounded-xl border border-gray-100 bg-white p-4 font-sans dark:border-gray-800 dark:bg-gray-950">
              <p dir="ltr" className="text-start text-xs text-gray-600 dark:text-gray-400">mqttcloud.ir</p>
              <p className="line-clamp-1 text-lg leading-snug text-[#1a0dab] dark:text-[#8ab4f8]">{draft.title || "…"}</p>
              <p className="line-clamp-2 text-sm leading-relaxed text-gray-700 dark:text-gray-300">{draft.description || "…"}</p>
            </div>
          </Panel>
        </div>
      )}
    </div>
  );
}
