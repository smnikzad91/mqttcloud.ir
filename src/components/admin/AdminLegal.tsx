"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { ExternalLink } from "lucide-react";
import { useT } from "@/i18n/useT";
import { useLanguage } from "@/context/LanguageContext";
import { PageHeader, Panel, Field, SkeletonRows, FilterPills, StatusBadge, inputClass, buttonClass, cn, useFormatNumber } from "@/components/dashboard/ui";

type LegalType = "privacy" | "terms";
type LegalData = { title: string; content: string; updatedAt?: string };

/** Same paragraph rule as the public LegalPageClient, so the preview matches the site. */
function Preview({ title, content }: LegalData) {
  return (
    <article dir="auto" className="space-y-4">
      <h2 className="text-2xl font-bold text-gray-900 dark:text-white">{title}</h2>
      {content.split(/\n\n+/).map((p, i) => (
        <p key={i} className="whitespace-pre-line leading-8 text-gray-600 dark:text-gray-400">{p.trim()}</p>
      ))}
    </article>
  );
}

export default function AdminLegal() {
  const t = useT();
  const { lang } = useLanguage();
  const fmt = useFormatNumber();
  const [tab, setTab] = useState<LegalType>("privacy");
  const [mode, setMode] = useState<"write" | "preview">("write");
  const [saved, setSaved] = useState<LegalData | null>(null);
  const [draft, setDraft] = useState<LegalData | null>(null);
  const [saving, setSaving] = useState(false);
  const [failed, setFailed] = useState(false);

  const fetchTab = useCallback(async (type: LegalType) => {
    setSaved(null); setDraft(null); setFailed(false);
    try {
      const res = await fetch(`/api/admin/legal/${type}`);
      if (!res.ok) throw new Error();
      const d = await res.json();
      const data = { title: d.title ?? "", content: d.content ?? "", updatedAt: d.updatedAt };
      setSaved(data); setDraft(data);
    } catch {
      setFailed(true);
    }
  }, []);
  useEffect(() => { queueMicrotask(() => fetchTab(tab)); }, [tab, fetchTab]);

  const dirty = !!draft && !!saved && (draft.title !== saved.title || draft.content !== saved.content);

  // Warn before leaving the page with unsaved edits.
  useEffect(() => {
    if (!dirty) return;
    const onBefore = (e: BeforeUnloadEvent) => { e.preventDefault(); };
    window.addEventListener("beforeunload", onBefore);
    return () => window.removeEventListener("beforeunload", onBefore);
  }, [dirty]);

  const switchTab = (next: LegalType) => {
    if (next === tab) return;
    if (dirty && !window.confirm(t("lgLeaveConfirm"))) return;
    setTab(next);
  };

  const save = async () => {
    if (!draft) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/admin/legal/${tab}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ title: draft.title, content: draft.content }) });
      if (!res.ok) throw new Error();
      const d = await res.json();
      const next = { ...draft, updatedAt: d.updatedAt };
      setSaved(next); setDraft(next);
      toast.success(t("legalSaved"));
    } catch {
      toast.error(t("legalError"));
    } finally {
      setSaving(false);
    }
  };

  const words = draft?.content.trim() ? draft.content.trim().split(/\s+/).length : 0;

  return (
    <div className="space-y-6">
      <PageHeader
        title={t("legalTitle")}
        description={t("lgDesc")}
        actions={
          <>
            {dirty && <StatusBadge tone="warning" label={t("lgUnsaved")} />}
            <a href={tab === "privacy" ? "/privacy" : "/terms"} target="_blank" rel="noopener noreferrer" className={buttonClass("secondary")}>
              {t("lgViewOnSite")}<ExternalLink className="h-4 w-4 rtl:-scale-x-100" />
            </a>
            <button type="button" onClick={save} disabled={saving || !dirty} className={buttonClass("primary")}>{saving ? t("legalSaving") : t("legalSave")}</button>
          </>
        }
        tabs={
          <FilterPills<LegalType>
            value={tab}
            onChange={switchTab}
            items={[{ key: "privacy", label: t("legalPrivacyTab") }, { key: "terms", label: t("legalTermsTab") }]}
          />
        }
      />

      <Panel bodyClassName="p-0">
        {failed ? <p className="p-5 text-sm text-error-600 dark:text-error-400">{t("legalError")}</p>
          : !draft ? <div className="p-5"><SkeletonRows rows={6} /></div>
          : (
            <>
              <div className="space-y-4 border-b border-gray-100 p-5 dark:border-gray-800">
                <Field label={t("legalFieldTitle")} htmlFor="lg-title">
                  <input id="lg-title" dir="auto" value={draft.title} onChange={(e) => setDraft({ ...draft, title: e.target.value })} placeholder={tab === "privacy" ? t("legalPrivacyTab") : t("legalTermsTab")} className={inputClass} />
                </Field>
              </div>
              <div className="flex items-center justify-between gap-3 border-b border-gray-100 px-5 py-2.5 dark:border-gray-800">
                <div role="tablist" className="flex gap-1">
                  {(["write", "preview"] as const).map((m) => (
                    <button key={m} type="button" role="tab" aria-selected={mode === m} onClick={() => setMode(m)} className={cn("rounded-lg px-3 py-1.5 text-xs font-semibold transition", mode === m ? "bg-gray-900 text-white dark:bg-white dark:text-gray-900" : "text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-white/5")}>
                      {m === "write" ? t("lgWrite") : t("lgPreview")}
                    </button>
                  ))}
                </div>
                <span className="text-xs text-gray-400">{fmt(words)} {t("lgWords")}</span>
              </div>
              <div className="p-5">
                {mode === "write" ? (
                  <>
                    <textarea
                      aria-label={t("legalFieldContent")}
                      dir="auto"
                      value={draft.content}
                      onChange={(e) => setDraft({ ...draft, content: e.target.value })}
                      placeholder={t("legalEmpty")}
                      className={cn(inputClass, "h-auto min-h-[55vh] resize-y py-4 leading-8")}
                    />
                    <p className="mt-2 text-xs text-gray-400">{t("lgParagraphHint")}</p>
                  </>
                ) : (
                  <div className="mx-auto max-w-3xl py-4"><Preview {...draft} /></div>
                )}
              </div>
              {saved?.updatedAt && (
                <p className="border-t border-gray-100 px-5 py-3 text-xs text-gray-400 dark:border-gray-800">
                  {t("legalLastUpdated")}: {new Date(saved.updatedAt).toLocaleString(lang === "fa" ? "fa-IR" : "en-US", { dateStyle: "medium", timeStyle: "short" })}
                </p>
              )}
            </>
          )}
      </Panel>
    </div>
  );
}
