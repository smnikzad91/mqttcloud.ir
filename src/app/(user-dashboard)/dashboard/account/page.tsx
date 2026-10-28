"use client";

import Link from "next/link";
import { useState } from "react";
import { toast } from "sonner";
import { Eye, EyeOff, TriangleAlert } from "lucide-react";
import { useT } from "@/i18n/useT";
import { PageHeader, Panel, Field, inputClass, buttonClass, cn } from "@/components/dashboard/ui";

const MIN_LENGTH = 8;

/** 0–4: length plus character variety. Only a hint — the server enforces just the 8-char minimum. */
function strength(pw: string): number {
  if (pw.length < MIN_LENGTH) return pw ? 1 : 0;
  let score = 1;
  if (/[a-z]/.test(pw) && /[A-Z]/.test(pw)) score++;
  if (/\d/.test(pw)) score++;
  if (/[^A-Za-z0-9]/.test(pw) || pw.length >= 14) score++;
  return Math.min(score, 4);
}

function PasswordInput({ id, value, onChange, autoComplete, invalid }: { id: string; value: string; onChange: (v: string) => void; autoComplete: string; invalid?: boolean }) {
  const t = useT();
  const [show, setShow] = useState(false);
  return (
    <div className="relative">
      <input
        id={id}
        type={show ? "text" : "password"}
        dir="ltr"
        required
        autoComplete={autoComplete}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        aria-invalid={invalid}
        className={cn(inputClass, "pe-11", invalid && "border-error-400 focus:border-error-500 focus:ring-error-500/15")}
      />
      <button
        type="button"
        onClick={() => setShow((s) => !s)}
        aria-label={show ? t("pwHide") : t("pwShow")}
        className="absolute end-1.5 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-700 dark:hover:bg-white/5 dark:hover:text-gray-200"
      >
        {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
      </button>
    </div>
  );
}

export default function AccountPage() {
  const t = useT();
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [saving, setSaving] = useState(false);

  const score = strength(next);
  const scoreLabel = [t("pwWeak"), t("pwWeak"), t("pwFair"), t("pwGood"), t("pwStrong")][score];
  const scoreColor = ["bg-gray-200", "bg-error-500", "bg-warning-500", "bg-brand-500", "bg-success-500"][score];
  const mismatch = confirm.length > 0 && confirm !== next;
  const tooShort = next.length > 0 && next.length < MIN_LENGTH;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (next !== confirm) return toast.error(t("passwordMismatch"));
    if (next.length < MIN_LENGTH) return toast.error(t("passwordTooShort"));
    setSaving(true);
    const res = await fetch("/api/user/password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ currentPassword: current, newPassword: next }),
    });
    const data = await res.json().catch(() => ({}));
    setSaving(false);
    if (!res.ok) return toast.error(data.error || t("saveError"));
    toast.success(t("passwordUpdated"));
    setCurrent(""); setNext(""); setConfirm("");
  };

  return (
    <div className="space-y-6">
      <PageHeader title={t("accountSettingsTitle")} description={t("accountSettingsDesc2")} />

      <Panel title={t("changePassword")} className="max-w-2xl">
        <form onSubmit={submit} className="space-y-5">
          <Field label={t("currentPassword")} htmlFor="pw-current">
            <PasswordInput id="pw-current" value={current} onChange={setCurrent} autoComplete="current-password" />
          </Field>
          <Field label={t("newPassword")} htmlFor="pw-new" hint={t("pwRules")} error={tooShort ? t("passwordTooShort") : undefined}>
            <PasswordInput id="pw-new" value={next} onChange={setNext} autoComplete="new-password" invalid={tooShort} />
          </Field>
          {next && (
            <div className="space-y-1.5" aria-live="polite">
              <div className="flex gap-1.5">
                {[1, 2, 3, 4].map((i) => <span key={i} className={cn("h-1.5 flex-1 rounded-full", i <= score ? scoreColor : "bg-gray-100 dark:bg-white/5")} />)}
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400">{t("pwStrength")}: <span className="font-semibold">{scoreLabel}</span></p>
            </div>
          )}
          <Field label={t("confirmNewPassword")} htmlFor="pw-confirm" error={mismatch ? t("passwordMismatch") : undefined}>
            <PasswordInput id="pw-confirm" value={confirm} onChange={setConfirm} autoComplete="new-password" invalid={mismatch} />
          </Field>
          <div className="flex justify-end">
            <button type="submit" disabled={saving || !current || next.length < MIN_LENGTH || next !== confirm} className={buttonClass("primary")}>
              {saving ? t("saving") : t("updatePassword")}
            </button>
          </div>
        </form>
      </Panel>

      {/* No self-service delete endpoint exists yet (prompt.md → API asks), so say so honestly instead of a button that does nothing. */}
      <Panel title={<span className="text-error-600 dark:text-error-400">{t("dangerZone")}</span>} className="max-w-2xl border-error-200 dark:border-error-500/25">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex min-w-0 flex-1 gap-3">
            <TriangleAlert className="mt-0.5 h-5 w-5 shrink-0 text-error-500" aria-hidden />
            <div className="text-sm">
              <p className="font-semibold text-gray-900 dark:text-white">{t("deleteAccount")}</p>
              <p className="mt-1 text-gray-500 dark:text-gray-400">{t("dangerZoneDesc")} {t("delUnavailable")}</p>
            </div>
          </div>
          <Link href="/dashboard/support" className={buttonClass("secondary", "sm")}>{t("delContact")}</Link>
        </div>
      </Panel>
    </div>
  );
}
