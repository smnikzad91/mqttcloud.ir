"use client";

// Shared building blocks for the user and admin dashboards — one badge,
// copy chip, quota meter, page header, panel and empty state, so every
// screen speaks the same visual language.

import React, { useState } from "react";
import Link from "next/link";
import { Check, Copy } from "lucide-react";
import { useT } from "@/i18n/useT";
import { useLanguage } from "@/context/LanguageContext";

export function cn(...parts: (string | false | null | undefined)[]) {
  return parts.filter(Boolean).join(" ");
}

/** Localised number: Persian digits in FA, plain Latin digits in EN. */
export function useFormatNumber() {
  const { lang } = useLanguage();
  return (n: number) => n.toLocaleString(lang === "fa" ? "fa-IR" : "en-US");
}

// ── StatusBadge ─────────────────────────────────────────────────────────────

export type BadgeTone = "success" | "warning" | "error" | "info" | "brand" | "neutral";

/** Every status the dashboards show, mapped to one tone so colors never drift between screens. */
const STATUS_TONE: Record<string, BadgeTone> = {
  active: "success",
  online: "success",
  connected: "success",
  connect: "success",
  approved: "success",
  published: "success",
  answered: "brand",
  replied: "brand",
  pending: "warning",
  open: "warning",
  new: "info",
  read: "neutral",
  suspended: "error",
  rejected: "error",
  disconnected: "error",
  disconnect: "error",
  offline: "neutral",
  closed: "neutral",
  draft: "neutral",
  inactive: "neutral",
};

const TONE_CLASS: Record<BadgeTone, string> = {
  success: "bg-success-50 text-success-700 ring-success-600/20 dark:bg-success-500/10 dark:text-success-400 dark:ring-success-500/25",
  warning: "bg-warning-50 text-warning-700 ring-warning-600/20 dark:bg-warning-500/10 dark:text-warning-400 dark:ring-warning-500/25",
  error:   "bg-error-50 text-error-700 ring-error-600/20 dark:bg-error-500/10 dark:text-error-400 dark:ring-error-500/25",
  info:    "bg-blue-light-50 text-blue-light-700 ring-blue-light-600/20 dark:bg-blue-light-500/10 dark:text-blue-light-400 dark:ring-blue-light-500/25",
  brand:   "bg-brand-50 text-brand-700 ring-brand-600/20 dark:bg-brand-500/10 dark:text-brand-300 dark:ring-brand-500/25",
  neutral: "bg-gray-100 text-gray-600 ring-gray-500/20 dark:bg-white/5 dark:text-gray-400 dark:ring-white/10",
};

export function StatusBadge({
  status,
  label,
  tone,
  pulse,
}: {
  /** A status key (`active`, `pending`, `online`…) — picks the tone unless `tone` is given. */
  status?: string;
  label: React.ReactNode;
  tone?: BadgeTone;
  /** Animate the dot — for live states such as "online". */
  pulse?: boolean;
}) {
  const resolved = tone ?? STATUS_TONE[status ?? ""] ?? "neutral";
  return (
    <span className={cn("inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ring-inset", TONE_CLASS[resolved])}>
      <span className="relative flex h-1.5 w-1.5">
        {pulse && <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-current opacity-60" />}
        <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-current" />
      </span>
      {label}
    </span>
  );
}

// ── CopyChip ────────────────────────────────────────────────────────────────

/** A technical value (host, port, username, code…) rendered LTR in mono with a copy button. */
export function CopyChip({ value, label, className }: { value: string; label?: string; className?: string }) {
  const t = useT();
  const [copied, setCopied] = useState(false);
  const copy = () => {
    navigator.clipboard?.writeText(value).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1400);
    }).catch(() => {});
  };
  return (
    <button
      type="button"
      onClick={copy}
      dir="ltr"
      title={value}
      aria-label={`${t("copyCardNumber")} ${value}`}
      className={cn(
        "group inline-flex max-w-full items-center gap-2 rounded-lg border border-gray-200 bg-gray-50 px-2.5 py-1.5 font-mono-signal text-xs text-gray-700 transition hover:border-brand-300 hover:bg-brand-25 focus-visible:outline-2 focus-visible:outline-brand-500 dark:border-gray-800 dark:bg-white/[0.03] dark:text-gray-200 dark:hover:border-brand-700 dark:hover:bg-brand-500/10",
        className,
      )}
    >
      <span className="truncate">{label ?? value}</span>
      {copied
        ? <Check className="h-3.5 w-3.5 shrink-0 text-success-500" aria-hidden />
        : <Copy className="h-3.5 w-3.5 shrink-0 text-gray-400 group-hover:text-brand-500" aria-hidden />}
      <span className="sr-only" aria-live="polite">{copied ? t("copied") : ""}</span>
    </button>
  );
}

/** Label + copyable value, stacked — for connection-info style grids. */
export function CopyField({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <p className="mb-1.5 text-xs font-medium text-gray-500 dark:text-gray-400">{label}</p>
      <CopyChip value={value} className="w-full justify-between" />
    </div>
  );
}

// ── QuotaMeter ──────────────────────────────────────────────────────────────

/** `used / limit` usage bar; turns amber near the limit and red when it's full. */
export function QuotaMeter({ used, limit, label, hint }: { used: number; limit: number; label: React.ReactNode; hint?: React.ReactNode }) {
  const fmt = useFormatNumber();
  const pct = limit > 0 ? Math.min(100, Math.round((used / limit) * 100)) : 100;
  const full = used >= limit;
  const near = !full && pct >= 80;
  return (
    <div className="space-y-1.5">
      <div className="flex items-baseline justify-between gap-3 text-xs">
        <span className="font-medium text-gray-600 dark:text-gray-400">{label}</span>
        <span dir="ltr" className={cn("font-mono-signal font-semibold", full ? "text-error-600 dark:text-error-400" : near ? "text-warning-600 dark:text-warning-400" : "text-gray-800 dark:text-gray-100")}>
          {fmt(used)} / {fmt(limit)}
        </span>
      </div>
      <div
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={limit}
        aria-valuenow={used}
        className="h-1.5 w-full overflow-hidden rounded-full bg-gray-100 dark:bg-white/5"
      >
        <div
          className={cn("h-full rounded-full transition-[width] duration-500", full ? "bg-error-500" : near ? "bg-warning-500" : "bg-gradient-to-r from-brand-500 to-theme-purple-500")}
          style={{ width: `${pct}%` }}
        />
      </div>
      {hint && <p className="text-xs text-gray-500 dark:text-gray-400">{hint}</p>}
    </div>
  );
}

// ── Layout pieces ───────────────────────────────────────────────────────────

/** Title + one-line description, with the primary action on the end side and optional tabs below. */
export function PageHeader({ title, description, actions, tabs }: { title: React.ReactNode; description?: React.ReactNode; actions?: React.ReactNode; tabs?: React.ReactNode }) {
  return (
    <div className="mb-6 space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="min-w-0">
          <h1 className="text-xl font-bold tracking-tight text-gray-900 sm:text-2xl dark:text-white">{title}</h1>
          {description && <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{description}</p>}
        </div>
        {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
      </div>
      {tabs}
    </div>
  );
}

/** Underlined route tabs (e.g. MQTT Overview · Activity · Messages). */
export function RouteTabs({ items, active }: { items: { href: string; label: React.ReactNode }[]; active: string }) {
  return (
    <nav className="-mb-px flex gap-1 overflow-x-auto border-b border-gray-200 no-scrollbar dark:border-gray-800">
      {items.map((it) => {
        const on = it.href === active;
        return (
          <Link
            key={it.href}
            href={it.href}
            aria-current={on ? "page" : undefined}
            className={cn(
              "whitespace-nowrap border-b-2 px-3 pb-2.5 pt-1 text-sm font-medium transition",
              on
                ? "border-brand-500 text-brand-600 dark:text-brand-400"
                : "border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200",
            )}
          >
            {it.label}
          </Link>
        );
      })}
    </nav>
  );
}

/** Filter pills with counts (All · Pending · Approved…). */
export function FilterPills<K extends string>({ items, value, onChange }: { items: { key: K; label: React.ReactNode; count?: number }[]; value: K; onChange: (k: K) => void }) {
  const fmt = useFormatNumber();
  return (
    <div role="tablist" className="flex flex-wrap gap-1.5">
      {items.map((it) => {
        const on = it.key === value;
        return (
          <button
            key={it.key}
            type="button"
            role="tab"
            aria-selected={on}
            onClick={() => onChange(it.key)}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold transition",
              on
                ? "bg-gray-900 text-white dark:bg-white dark:text-gray-900"
                : "bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-white/5 dark:text-gray-400 dark:hover:bg-white/10",
            )}
          >
            {it.label}
            {it.count !== undefined && (
              <span className={cn("rounded-full px-1.5 text-[10px]", on ? "bg-white/20 dark:bg-gray-900/10" : "bg-white dark:bg-white/10")}>{fmt(it.count)}</span>
            )}
          </button>
        );
      })}
    </div>
  );
}

/** The standard surface every dashboard section sits on. */
export function Panel({ title, description, actions, children, className, bodyClassName }: { title?: React.ReactNode; description?: React.ReactNode; actions?: React.ReactNode; children: React.ReactNode; className?: string; bodyClassName?: string }) {
  return (
    <section className={cn("rounded-2xl border border-gray-200 bg-white shadow-theme-xs dark:border-gray-800 dark:bg-gray-900/60", className)}>
      {(title || actions) && (
        <header className="flex flex-wrap items-start justify-between gap-3 border-b border-gray-100 px-5 py-4 dark:border-gray-800">
          <div className="min-w-0">
            {title && <h2 className="text-base font-semibold text-gray-900 dark:text-white">{title}</h2>}
            {description && <p className="mt-0.5 text-sm text-gray-500 dark:text-gray-400">{description}</p>}
          </div>
          {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
        </header>
      )}
      <div className={cn("p-5", bodyClassName)}>{children}</div>
    </section>
  );
}

/** Small KPI tile: label, big value, optional hint/link. */
export function StatTile({ label, value, hint, icon, href }: { label: React.ReactNode; value: React.ReactNode; hint?: React.ReactNode; icon?: React.ReactNode; href?: string }) {
  const body = (
    <div className="flex items-start gap-3">
      {icon && <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-600 dark:bg-brand-500/10 dark:text-brand-400">{icon}</span>}
      <div className="min-w-0">
        <p className="text-xs font-medium text-gray-500 dark:text-gray-400">{label}</p>
        <p className="mt-1 truncate text-2xl font-bold tracking-tight text-gray-900 dark:text-white">{value}</p>
        {hint && <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">{hint}</p>}
      </div>
    </div>
  );
  const cls = "block rounded-2xl border border-gray-200 bg-white p-5 shadow-theme-xs dark:border-gray-800 dark:bg-gray-900/60";
  return href
    ? <Link href={href} className={cn(cls, "transition hover:border-brand-300 hover:shadow-theme-sm dark:hover:border-brand-700")}>{body}</Link>
    : <div className={cls}>{body}</div>;
}

/** Empty / no-results state with an optional primary action. */
export function EmptyState({ icon, title, description, action }: { icon?: React.ReactNode; title: React.ReactNode; description?: React.ReactNode; action?: React.ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center px-6 py-12 text-center">
      {icon && <span className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-gray-100 text-gray-400 dark:bg-white/5 dark:text-gray-500">{icon}</span>}
      <p className="text-sm font-semibold text-gray-800 dark:text-gray-100">{title}</p>
      {description && <p className="mt-1 max-w-sm text-sm text-gray-500 dark:text-gray-400">{description}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

/** Pulsing placeholder rows while a list loads. */
export function SkeletonRows({ rows = 4 }: { rows?: number }) {
  return (
    <div className="space-y-3" aria-hidden>
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="h-10 animate-pulse rounded-lg bg-gray-100 dark:bg-white/5" />
      ))}
    </div>
  );
}

// ── Buttons ─────────────────────────────────────────────────────────────────

const BTN = {
  primary:   "bg-brand-500 text-white shadow-theme-xs hover:bg-brand-600 disabled:bg-brand-300 dark:disabled:bg-brand-800",
  secondary: "border border-gray-200 bg-white text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700",
  ghost:     "text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-white/5",
  danger:    "bg-error-600 text-white hover:bg-error-700 disabled:opacity-60 dark:bg-error-500 dark:hover:bg-error-600",
} as const;

export function buttonClass(variant: keyof typeof BTN = "primary", size: "sm" | "md" = "md") {
  return cn(
    "inline-flex items-center justify-center gap-2 rounded-xl font-semibold transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-500 disabled:cursor-not-allowed",
    size === "sm" ? "px-3 py-1.5 text-xs" : "px-4 py-2.5 text-sm",
    BTN[variant],
  );
}
