"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { useSession } from "next-auth/react";
import { toast } from "sonner";
import { Camera, Loader2, ShieldCheck, ShieldAlert } from "lucide-react";
import { useT } from "@/i18n/useT";
import { useLanguage } from "@/context/LanguageContext";
import { getJson } from "@/lib/getJson";
import { PageHeader, Panel, Field, StatusBadge, inputClass, buttonClass, cn } from "@/components/dashboard/ui";

type Profile = { firstName: string; lastName: string; email: string; phone: string; phoneVerified?: boolean };

const IRANIAN_MOBILE = /^09[0-9]{9}$/;

export default function ProfilePage() {
  const t = useT();
  const { lang } = useLanguage();
  const { data: session, update } = useSession();
  const fileRef = useRef<HTMLInputElement>(null);

  const [profile, setProfile] = useState<Profile | null>(null);
  const [phone, setPhone] = useState("");
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    getJson<Profile>("/api/user/profile").then((p) => { if (p) { setProfile(p); setPhone(p.phone ?? ""); } });
  }, []);

  const avatar = session?.user?.avatar || "/images/user/user-01.jpg";
  const name = profile ? `${profile.firstName} ${profile.lastName}`.trim() : session?.user?.name ?? "";
  const createdAt = session?.user?.createdAt;
  const phoneValid = phone === "" || IRANIAN_MOBILE.test(phone);
  const dirty = profile !== null && phone !== (profile.phone ?? "");

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!phoneValid) return toast.error(t("phoneInvalid"));
    setSaving(true);
    const res = await fetch("/api/user/profile", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ phone }) });
    const data = await res.json().catch(() => ({}));
    setSaving(false);
    if (!res.ok) return toast.error(data.error || t("saveError"));
    toast.success(t("saved"));
    // A changed number has to be verified again (the dashboard banner offers the OTP).
    setProfile((p) => (p ? { ...p, phone, phoneVerified: phone !== p.phone ? false : p.phoneVerified } : p));
  };

  const onAvatar = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setUploading(true);
    const fd = new FormData();
    fd.append("avatar", file);
    const res = await fetch("/api/user/avatar", { method: "POST", body: fd });
    const data = await res.json().catch(() => ({}));
    setUploading(false);
    if (!res.ok) return toast.error(data.error || t("uploadError"));
    await update({ avatar: data.avatar });
    toast.success(t("avatarUpdated"));
  };

  return (
    <div className="space-y-6">
      <PageHeader title={t("profileTitle")} description={t("profileDesc")} />

      <div className="grid gap-6 xl:grid-cols-[320px_1fr]">
        {/* Identity card */}
        <Panel bodyClassName="flex flex-col items-center p-6 text-center">
          <div className="relative">
            <Image src={avatar} alt="" width={112} height={112} className="h-28 w-28 rounded-full object-cover ring-4 ring-brand-50 dark:ring-brand-500/15" />
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              disabled={uploading}
              aria-label={t("changePhoto")}
              title={t("changePhoto")}
              className="absolute bottom-0 end-0 flex h-9 w-9 items-center justify-center rounded-full bg-brand-500 text-white shadow-theme-sm ring-4 ring-white transition hover:bg-brand-600 dark:ring-gray-900"
            >
              {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Camera className="h-4 w-4" />}
            </button>
            <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp" hidden onChange={onAvatar} />
          </div>
          <p className="mt-4 text-lg font-semibold text-gray-900 dark:text-white">{name}</p>
          <p dir="ltr" className="text-sm text-gray-500 dark:text-gray-400">{profile?.email ?? session?.user?.email}</p>
          {createdAt && (
            <p className="mt-3 text-xs text-gray-400">
              {t("pfMemberSince")} {new Date(createdAt).toLocaleDateString(lang === "fa" ? "fa-IR" : "en-US", { year: "numeric", month: "long" })}
            </p>
          )}
          <p className="mt-4 text-xs text-gray-400">{t("photoHint")}</p>
        </Panel>

        {/* Details */}
        <Panel title={t("personalInfo")}>
          <form onSubmit={save} className="space-y-5">
            <div className="grid gap-5 sm:grid-cols-2">
              <Field label={t("firstName")} htmlFor="pf-first">
                <input id="pf-first" readOnly value={profile?.firstName ?? ""} className={cn(inputClass, "bg-gray-50 text-gray-500 dark:bg-white/[0.03] dark:text-gray-400")} />
              </Field>
              <Field label={t("lastName")} htmlFor="pf-last">
                <input id="pf-last" readOnly value={profile?.lastName ?? ""} className={cn(inputClass, "bg-gray-50 text-gray-500 dark:bg-white/[0.03] dark:text-gray-400")} />
              </Field>
            </div>
            <Field label={t("emailAddress")} htmlFor="pf-email" hint={t("pfReadOnly")}>
              <input id="pf-email" readOnly dir="ltr" value={profile?.email ?? ""} className={cn(inputClass, "bg-gray-50 text-gray-500 dark:bg-white/[0.03] dark:text-gray-400")} />
            </Field>
            <Field
              htmlFor="pf-phone"
              label={
                <span className="flex items-center gap-2">
                  {t("phone")}
                  {profile && profile.phone && (profile.phoneVerified === false
                    ? <StatusBadge tone="warning" label={<span className="inline-flex items-center gap-1"><ShieldAlert className="h-3 w-3" />{t("pfUnverified")}</span>} />
                    : <StatusBadge tone="success" label={<span className="inline-flex items-center gap-1"><ShieldCheck className="h-3 w-3" />{t("pfVerified")}</span>} />)}
                </span>
              }
              error={!phoneValid ? t("phoneInvalid") : undefined}
            >
              <input
                id="pf-phone"
                dir="ltr"
                inputMode="numeric"
                autoComplete="tel"
                maxLength={11}
                value={phone}
                onChange={(e) => setPhone(e.target.value.replace(/\D/g, ""))}
                placeholder={t("phonePlaceholder")}
                aria-invalid={!phoneValid}
                className={cn(inputClass, "font-mono-signal", !phoneValid && "border-error-400 focus:border-error-500 focus:ring-error-500/15")}
              />
            </Field>
            <div className="flex justify-end">
              <button type="submit" disabled={saving || !dirty || !phoneValid} className={buttonClass("primary")}>{saving ? t("saving") : t("saveChanges")}</button>
            </div>
          </form>
        </Panel>
      </div>
    </div>
  );
}
