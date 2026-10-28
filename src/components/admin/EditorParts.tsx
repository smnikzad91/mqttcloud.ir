"use client";

// Building blocks shared by the blog and news editors.

import React, { useRef, useState } from "react";
import { ImagePlus, Loader2, X } from "lucide-react";
import { toast } from "sonner";
import { useT } from "@/i18n/useT";
import { cn } from "@/components/dashboard/ui";

/** Uploads to /api/admin/upload under `folder`; returns the URL or null. */
export async function adminUpload(file: File, folder: string, failedLabel: string): Promise<string | null> {
  const fd = new FormData();
  fd.append("file", file);
  fd.append("folder", folder);
  try {
    const res = await fetch("/api/admin/upload", { method: "POST", body: fd });
    const data = await res.json().catch(() => ({}));
    if (res.ok && data.url) return data.url as string;
    toast.error(data.error || failedLabel);
  } catch {
    toast.error(failedLabel);
  }
  return null;
}

/** Single image slot: empty drop zone, or a preview with remove. */
export function ImageSlot({ value, onChange, folder, aspect = "aspect-video" }: { value: string; onChange: (url: string) => void; folder: string; aspect?: string }) {
  const t = useT();
  const ref = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const pick = async (file?: File) => {
    if (!file) return;
    setBusy(true);
    const url = await adminUpload(file, folder, t("tkUploadFailed"));
    setBusy(false);
    if (url) onChange(url);
  };
  return (
    <div className={cn("relative overflow-hidden rounded-xl border border-dashed border-gray-300 bg-gray-50 dark:border-gray-700 dark:bg-white/[0.03]", aspect)}>
      {value ? (
        <>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={value} alt="" className="h-full w-full object-cover" />
          <button type="button" onClick={() => onChange("")} aria-label={t("edRemoveImage")} className="absolute end-2 top-2 flex h-8 w-8 items-center justify-center rounded-full bg-gray-900/70 text-white transition hover:bg-gray-900">
            <X className="h-4 w-4" />
          </button>
        </>
      ) : (
        <button
          type="button"
          onClick={() => ref.current?.click()}
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => { e.preventDefault(); pick(e.dataTransfer.files[0]); }}
          disabled={busy}
          className="flex h-full w-full flex-col items-center justify-center gap-2 text-sm text-gray-500 transition hover:text-brand-600 dark:text-gray-400"
        >
          {busy ? <Loader2 className="h-6 w-6 animate-spin" /> : <ImagePlus className="h-6 w-6" />}
          {t("edUpload")}
        </button>
      )}
      <input ref={ref} type="file" accept="image/*" hidden onChange={(e) => { pick(e.target.files?.[0]); e.target.value = ""; }} />
    </div>
  );
}

/** Warns before leaving the page while `dirty`. */
export function useUnsavedGuard(dirty: boolean) {
  React.useEffect(() => {
    if (!dirty) return;
    const onBefore = (e: BeforeUnloadEvent) => { e.preventDefault(); };
    window.addEventListener("beforeunload", onBefore);
    return () => window.removeEventListener("beforeunload", onBefore);
  }, [dirty]);
}

/** Lowercase latin slug from a title; empty for non-latin titles (the admin then types one). */
export function slugify(s: string) {
  return s.toLowerCase().normalize("NFKD").replace(/[^\w\s-]/g, "").trim().replace(/[\s_]+/g, "-").replace(/-+/g, "-").slice(0, 80);
}
