"use client";

import { useState } from "react";
import { X } from "lucide-react";
import { useT } from "@/i18n/useT";
import { cn } from "./ui";

/** Tag/keyword input: Enter or comma adds, Backspace on empty removes the last, × removes one. */
export default function ChipInput({ value, onChange, placeholder, prefix = "", id }: { value: string[]; onChange: (v: string[]) => void; placeholder?: string; prefix?: string; id?: string }) {
  const t = useT();
  const [draft, setDraft] = useState("");

  const commit = (raw: string) => {
    const tags = raw.split(/[,،\n]/).map((s) => s.trim().replace(/^#/, "")).filter(Boolean);
    const next = [...value];
    for (const tag of tags) if (!next.includes(tag)) next.push(tag);
    if (next.length !== value.length) onChange(next);
    setDraft("");
  };

  return (
    <div className="flex min-h-11 flex-wrap items-center gap-1.5 rounded-xl border border-gray-300 bg-white px-2.5 py-2 shadow-theme-xs focus-within:border-brand-400 focus-within:ring-3 focus-within:ring-brand-500/15 dark:border-gray-700 dark:bg-gray-900">
      {value.map((tag) => (
        <span key={tag} className="inline-flex items-center gap-1 rounded-lg bg-brand-50 py-1 pe-1 ps-2 text-xs font-medium text-brand-700 dark:bg-brand-500/15 dark:text-brand-300">
          <span dir="auto">{prefix}{tag}</span>
          <button type="button" onClick={() => onChange(value.filter((v) => v !== tag))} aria-label={`${t("removeLabel")} ${tag}`} className="rounded p-0.5 hover:bg-brand-100 dark:hover:bg-brand-500/25">
            <X className="h-3 w-3" />
          </button>
        </span>
      ))}
      <input
        id={id}
        dir="auto"
        value={draft}
        onChange={(e) => (/[,،]/.test(e.target.value) ? commit(e.target.value) : setDraft(e.target.value))}
        onKeyDown={(e) => {
          if (e.key === "Enter") { e.preventDefault(); commit(draft); }
          else if (e.key === "Backspace" && !draft && value.length) onChange(value.slice(0, -1));
        }}
        onBlur={() => draft.trim() && commit(draft)}
        placeholder={value.length ? "" : placeholder}
        className={cn("min-w-[8rem] flex-1 bg-transparent px-1 text-sm text-gray-900 outline-none placeholder:text-gray-400 dark:text-white")}
      />
    </div>
  );
}
