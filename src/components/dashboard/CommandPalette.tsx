"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Search, CornerDownLeft, ArrowUpRight } from "lucide-react";
import { useT } from "@/i18n/useT";
import { cn } from "./ui";
import { flattenNav, type NavSection } from "./nav";

/** ⌘K / Ctrl+K page switcher built from the same nav config as the sidebar. */
export default function CommandPalette({ sections, open, onOpenChange }: { sections: NavSection[]; open: boolean; onOpenChange: (v: boolean) => void }) {
  const t = useT();
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const [query, setQuery] = useState("");
  const [cursor, setCursor] = useState(0);

  const all = useMemo(() => flattenNav(sections), [sections]);
  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return all;
    return all.filter((r) => r.label.toLowerCase().includes(q) || r.href.toLowerCase().includes(q) || (r.group ?? "").toLowerCase().includes(q));
  }, [all, query]);

  // Global shortcut.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        onOpenChange(!open);
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onOpenChange]);

  useEffect(() => {
    if (!open) return;
    queueMicrotask(() => { setQuery(""); setCursor(0); inputRef.current?.focus(); });
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = prev; };
  }, [open]);

  useEffect(() => {
    listRef.current?.querySelector<HTMLElement>(`[data-index="${cursor}"]`)?.scrollIntoView({ block: "nearest" });
  }, [cursor]);

  if (!open) return null;

  const go = (i: number) => {
    const r = results[i];
    if (!r) return;
    onOpenChange(false);
    if (r.external) window.open(r.href, "_blank");
    else router.push(r.href);
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") { e.preventDefault(); setCursor((c) => Math.min(results.length - 1, c + 1)); }
    else if (e.key === "ArrowUp") { e.preventDefault(); setCursor((c) => Math.max(0, c - 1)); }
    else if (e.key === "Enter") { e.preventDefault(); go(cursor); }
    else if (e.key === "Escape") { e.preventDefault(); onOpenChange(false); }
    else if (e.key === "Tab") { e.preventDefault(); } // keep focus inside the dialog
  };

  return (
    <div className="fixed inset-0 z-[100000] flex items-start justify-center px-4 pt-[12vh]" role="dialog" aria-modal="true" aria-label={t("cmdOpen")}>
      <div className="absolute inset-0 bg-gray-900/50 backdrop-blur-sm" onClick={() => onOpenChange(false)} aria-hidden />
      <div className="relative w-full max-w-lg overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-theme-xl dark:border-gray-800 dark:bg-gray-900" onKeyDown={onKeyDown}>
        <div className="flex items-center gap-3 border-b border-gray-100 px-4 dark:border-gray-800">
          <Search className="h-4 w-4 shrink-0 text-gray-400" aria-hidden />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => { setQuery(e.target.value); setCursor(0); }}
            placeholder={t("cmdPlaceholder")}
            role="combobox"
            aria-expanded="true"
            aria-controls="cmd-results"
            aria-activedescendant={results[cursor] ? `cmd-${cursor}` : undefined}
            className="h-12 w-full bg-transparent text-sm text-gray-900 outline-none placeholder:text-gray-400 dark:text-white"
          />
          <kbd className="hidden rounded-md border border-gray-200 px-1.5 py-0.5 font-mono-signal text-[10px] text-gray-400 sm:block dark:border-gray-700">Esc</kbd>
        </div>

        <ul ref={listRef} id="cmd-results" role="listbox" className="max-h-[50vh] overflow-y-auto p-2">
          {results.length === 0 && <li className="px-3 py-8 text-center text-sm text-gray-500 dark:text-gray-400">{t("cmdEmpty")}</li>}
          {results.map((r, i) => (
            <li
              key={r.href + r.label}
              id={`cmd-${i}`}
              data-index={i}
              role="option"
              aria-selected={i === cursor}
              onMouseEnter={() => setCursor(i)}
              onClick={() => go(i)}
              className={cn(
                "flex cursor-pointer items-center justify-between gap-3 rounded-xl px-3 py-2.5 text-sm",
                i === cursor ? "bg-brand-50 text-brand-700 dark:bg-brand-500/10 dark:text-white" : "text-gray-700 dark:text-gray-300",
              )}
            >
              <span className="min-w-0 truncate">
                {r.label}
                {r.group && <span className="ms-2 text-xs text-gray-400 dark:text-gray-500">{r.group}</span>}
              </span>
              {r.external
                ? <ArrowUpRight className="h-4 w-4 shrink-0 opacity-60 rtl:-scale-x-100" aria-hidden />
                : i === cursor && <CornerDownLeft className="h-4 w-4 shrink-0 opacity-60 rtl:-scale-x-100" aria-hidden />}
            </li>
          ))}
        </ul>

        <div className="flex items-center gap-4 border-t border-gray-100 px-4 py-2 text-[11px] text-gray-400 dark:border-gray-800">
          <span><kbd className="font-mono-signal">↑↓</kbd> {t("cmdNavigate")}</span>
          <span><kbd className="font-mono-signal">↵</kbd> {t("cmdSelect")}</span>
          <span><kbd className="font-mono-signal">Esc</kbd> {t("cmdClose")}</span>
        </div>
      </div>
    </div>
  );
}
