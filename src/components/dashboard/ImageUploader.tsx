"use client";

import { useRef, useState } from "react";
import Image from "next/image";
import { toast } from "sonner";
import { ImagePlus, X, Loader2 } from "lucide-react";
import { useT } from "@/i18n/useT";
import { cn } from "./ui";

/** Uploads one image to /api/upload and returns its URL, or null (with a toast) on failure. */
export async function uploadImage(file: File, failedLabel: string): Promise<string | null> {
  const fd = new FormData();
  fd.append("file", file);
  try {
    const res = await fetch("/api/upload", { method: "POST", body: fd });
    const data = await res.json().catch(() => ({}));
    if (res.ok && data.url) return data.url as string;
    toast.error(data.error || failedLabel);
  } catch {
    toast.error(failedLabel);
  }
  return null;
}

/** Multi-image attach control: click or drop, previews with remove, capped at `max`. */
export default function ImageUploader({ value, onChange, max = 5, onBusyChange }: { value: string[]; onChange: (urls: string[]) => void; max?: number; onBusyChange?: (busy: boolean) => void }) {
  const t = useT();
  const fileRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [dragOver, setDragOver] = useState(false);

  const add = async (files: File[]) => {
    const images = files.filter((f) => f.type.startsWith("image/"));
    if (!images.length) return;
    if (value.length + images.length > max) return toast.error(t("tkMaxImages"));
    setBusy(true); onBusyChange?.(true);
    const urls: string[] = [];
    for (const f of images) {
      const url = await uploadImage(f, t("tkUploadFailed"));
      if (url) urls.push(url);
    }
    onChange([...value, ...urls]);
    setBusy(false); onBusyChange?.(false);
  };

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-2">
        {value.map((url) => (
          <div key={url} className="group relative h-16 w-16 overflow-hidden rounded-lg border border-gray-200 dark:border-gray-700">
            <Image src={url} alt="" fill sizes="64px" className="object-cover" unoptimized />
            <button
              type="button"
              onClick={() => onChange(value.filter((u) => u !== url))}
              aria-label={t("tkRemoveImage")}
              className="absolute end-0.5 top-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-gray-900/70 text-white opacity-0 transition group-hover:opacity-100 focus:opacity-100"
            >
              <X className="h-3 w-3" />
            </button>
          </div>
        ))}
        {value.length < max && (
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={(e) => { e.preventDefault(); setDragOver(false); add(Array.from(e.dataTransfer.files)); }}
            disabled={busy}
            className={cn(
              "flex h-16 min-w-16 items-center justify-center gap-2 rounded-lg border border-dashed px-3 text-xs font-medium transition",
              dragOver ? "border-brand-500 bg-brand-25 text-brand-600 dark:bg-brand-500/10" : "border-gray-300 text-gray-500 hover:border-brand-400 hover:text-brand-600 dark:border-gray-700 dark:text-gray-400",
            )}
          >
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <ImagePlus className="h-4 w-4" />}
            {value.length === 0 && t("tkAddImages")}
          </button>
        )}
      </div>
      <p className="text-xs text-gray-400 dark:text-gray-500">{t("tkImagesHint")}</p>
      <input ref={fileRef} type="file" accept="image/*" multiple hidden onChange={(e) => { const f = Array.from(e.target.files ?? []); e.target.value = ""; add(f); }} />
    </div>
  );
}
