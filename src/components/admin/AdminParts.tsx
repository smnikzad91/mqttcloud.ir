"use client";

// Small pieces shared by the admin pages: owner cells that link to the user,
// relative-time cells, queue-age badges and deep-link helpers.

import Link from "next/link";
import { Clock } from "lucide-react";
import { useNow } from "@/lib/relativeTime";
import { RelTime, RelativeCell } from "@/components/dashboard/RelTime";
import { cn, type BadgeTone } from "@/components/dashboard/ui";

export { RelTime, RelativeCell };

export type Owner = { name: string; email: string } | null;

/** The users page filtered to one account, with its detail drawer open. */
export const userHref = (email: string) => `/admin/users?q=${encodeURIComponent(email)}&open=1`;

/** One query-string value, read on the client after mount (avoids a Suspense boundary for useSearchParams). */
export const readParam = (name: string) => (typeof window === "undefined" ? null : new URLSearchParams(window.location.search).get(name));

/** True when a grid row click started on a control inside the row (buttons, links). */
export const fromControl = (e?: Event | null) => !!(e?.target as HTMLElement | null)?.closest?.("button, a, input, select");

/** Owner name + email; the name links to the user's profile. */
export function OwnerCell({ value }: { value: Owner }) {
  if (!value) return <span className="text-gray-400">—</span>;
  return (
    <div className="flex h-full min-w-0 flex-col justify-center leading-tight">
      <Link href={userHref(value.email)} className="truncate text-sm text-gray-900 hover:text-brand-600 hover:underline dark:text-white dark:hover:text-brand-400">{value.name || value.email}</Link>
      <span dir="ltr" className="truncate text-start text-xs text-gray-500 dark:text-gray-400">{value.email}</span>
    </div>
  );
}

const AGE_TONE: Record<BadgeTone, string> = {
  neutral: "bg-gray-100 text-gray-600 dark:bg-white/5 dark:text-gray-300",
  warning: "bg-warning-50 text-warning-700 dark:bg-warning-500/10 dark:text-warning-400",
  error:   "bg-error-50 text-error-700 dark:bg-error-500/10 dark:text-error-400",
  success: "", info: "", brand: "",
};

/** How long something has been waiting in a queue; amber after 4h, red after a day. */
export function AgeBadge({ iso }: { iso: string }) {
  const now = useNow(60_000);
  const h = (now - new Date(iso).getTime()) / 36e5;
  const tone: BadgeTone = h >= 24 ? "error" : h >= 4 ? "warning" : "neutral";
  return (
    <span className={cn("inline-flex w-fit items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium", AGE_TONE[tone])}>
      <Clock className="h-3 w-3" aria-hidden />
      <RelTime iso={iso} />
    </span>
  );
}

export function AgeCell({ value }: { value: string }) {
  return <div className="flex h-full items-center"><AgeBadge iso={value} /></div>;
}
