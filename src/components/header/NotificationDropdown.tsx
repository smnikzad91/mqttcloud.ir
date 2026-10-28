"use client";

// Header bell. There's no per-user notification feed yet (see prompt.md →
// "API asks"), so this shows the one real thing we have — the active site
// announcement — instead of the template's fake demo people.

import React, { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Bell, BellOff } from "lucide-react";
import { useT } from "@/i18n/useT";

type Announcement = { _id: string; text: string; link?: string; linkText?: string; emoji?: string; updatedAt?: string };

const SEEN_KEY = "notif-seen-announcement";

export default function NotificationDropdown() {
  const t = useT();
  const [open, setOpen] = useState(false);
  const [item, setItem] = useState<Announcement | null>(null);
  const [unread, setUnread] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch("/api/public/announcements")
      .then((r) => (r.ok ? r.json() : null))
      .then((a: Announcement | null) => {
        if (!a) return;
        setItem(a);
        const stamp = `${a._id}:${a.updatedAt ?? ""}`;
        let seen: string | null = null;
        try { seen = localStorage.getItem(SEEN_KEY); } catch {}
        setUnread(seen !== stamp);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => { if (!rootRef.current?.contains(e.target as Node)) setOpen(false); };
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => { document.removeEventListener("mousedown", onDown); document.removeEventListener("keydown", onKey); };
  }, [open]);

  const toggle = () => {
    setOpen((o) => !o);
    if (item && unread) {
      setUnread(false);
      try { localStorage.setItem(SEEN_KEY, `${item._id}:${item.updatedAt ?? ""}`); } catch {}
    }
  };

  return (
    <div className="relative" ref={rootRef}>
      <button
        type="button"
        onClick={toggle}
        aria-label={t("notificationTitle")}
        aria-expanded={open}
        className="relative flex h-10 w-10 items-center justify-center rounded-full border border-gray-200 bg-white text-gray-500 transition hover:bg-gray-100 hover:text-gray-700 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-white"
      >
        <Bell className="h-[18px] w-[18px]" />
        {unread && (
          <span className="absolute end-0.5 top-0.5 flex h-2.5 w-2.5">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-warning-400 opacity-75" />
            <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-warning-500 ring-2 ring-white dark:ring-gray-900" />
          </span>
        )}
      </button>

      {open && (
        <div className="absolute end-0 z-40 mt-2 w-[min(340px,calc(100vw-2rem))] overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-theme-lg dark:border-gray-800 dark:bg-gray-900">
          <div className="border-b border-gray-100 px-4 py-3 text-sm font-semibold text-gray-900 dark:border-gray-800 dark:text-white">
            {t("notificationTitle")}
          </div>
          {item ? (
            <div className="flex gap-3 px-4 py-4">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-lg dark:bg-brand-500/10">{item.emoji || "📣"}</span>
              <div className="min-w-0">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-brand-600 dark:text-brand-400">{t("notifAnnouncement")}</p>
                <p className="mt-0.5 text-sm text-gray-700 dark:text-gray-200">{item.text}</p>
                {item.link && (
                  <Link href={item.link} onClick={() => setOpen(false)} className="mt-2 inline-block text-sm font-medium text-brand-600 hover:underline dark:text-brand-400">
                    {item.linkText || item.link}
                  </Link>
                )}
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-2 px-4 py-10 text-center text-sm text-gray-500 dark:text-gray-400">
              <BellOff className="h-6 w-6 text-gray-300 dark:text-gray-600" aria-hidden />
              {t("notifEmpty")}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
