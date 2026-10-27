"use client";

import { useRef, type PointerEvent, type ReactNode } from "react";

/** One reusable "terminal" panel look for the dark simulator areas inside each card. */
export const panelClass = "rounded-2xl border border-gray-800 bg-gray-950 text-white";

/**
 * Card with a cursor-following radial glow and two corner "circuit" traces.
 * The cursor position is written straight to CSS variables rather than React
 * state, so moving the mouse never re-renders the (heavy) card contents.
 */
export function SpotlightCard({
  children,
  className = "",
  accent = "rgba(0, 240, 255, 0.16)",
  trace = "#00f0ff",
}: {
  children: ReactNode;
  className?: string;
  accent?: string;
  trace?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);

  function onPointerMove(e: PointerEvent<HTMLDivElement>) {
    if (e.pointerType !== "mouse" || !ref.current) return;
    const rect = ref.current.getBoundingClientRect();
    ref.current.style.setProperty("--spot-x", `${e.clientX - rect.left}px`);
    ref.current.style.setProperty("--spot-y", `${e.clientY - rect.top}px`);
  }

  return (
    <div
      ref={ref}
      onPointerMove={onPointerMove}
      className={`group relative flex h-full flex-col justify-between overflow-hidden rounded-3xl border border-gray-200 bg-white p-5 shadow-theme-sm transition-[translate,box-shadow] duration-500 hover:-translate-y-1 hover:shadow-[0_24px_60px_-15px_rgba(70,95,255,0.28)] dark:border-white/10 dark:bg-gray-900 sm:p-7 ${className}`}
    >
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-300 group-hover:opacity-100"
        style={{ background: `radial-gradient(520px circle at var(--spot-x, -500px) var(--spot-y, -500px), ${accent}, transparent 70%)` }}
      />

      <svg aria-hidden="true" viewBox="0 0 120 120" className="pointer-events-none absolute top-0 left-0 h-24 w-24 opacity-25 transition-opacity duration-500 group-hover:opacity-90">
        <path d="M 0 28 L 28 28 L 44 12 L 90 12" fill="none" stroke={trace} strokeWidth="1.5" />
        <circle cx="90" cy="12" r="2.5" fill={trace} />
        <path d="M 14 0 L 14 42 L 28 56" fill="none" stroke={trace} strokeWidth="1.2" strokeOpacity="0.6" />
        <circle cx="28" cy="56" r="2" fill={trace} />
      </svg>
      <svg aria-hidden="true" viewBox="0 0 120 120" className="pointer-events-none absolute right-0 bottom-0 h-24 w-24 rotate-180 opacity-20 transition-opacity duration-500 group-hover:opacity-80">
        <path d="M 0 28 L 28 28 L 44 12 L 90 12" fill="none" stroke={trace} strokeWidth="1.5" />
        <circle cx="90" cy="12" r="2.5" fill={trace} />
      </svg>

      <div className="@container relative z-10 flex h-full w-full min-w-0 flex-col justify-between">{children}</div>
    </div>
  );
}

/** Icon chip + title (+ optional subtitle) + action button row shared by every feature card. */
export function CardHeader({
  icon,
  gradient,
  title,
  subtitle,
  action,
}: {
  icon: ReactNode;
  gradient: string;
  title: string;
  subtitle?: ReactNode;
  action?: ReactNode;
}) {
  return (
    // Stacks by the card's own width (container query), not the viewport — the lg 4-column cards are phone-narrow.
    <div className="mb-4 flex flex-col gap-3 @[26rem]:flex-row @[26rem]:items-start @[26rem]:justify-between">
      <div className="flex min-w-0 items-center gap-3">
        <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-tr text-white shadow-md ${gradient}`}>
          {icon}
        </div>
        <div className="min-w-0">
          <h3 className="text-lg font-black text-gray-900 dark:text-white sm:text-xl">{title}</h3>
          {subtitle && <div className="text-xs font-bold text-brand-600 dark:text-theme-cyan-500">{subtitle}</div>}
        </div>
      </div>
      {action}
    </div>
  );
}

/** Pill-shaped simulator trigger. min-h-10 keeps it a comfortable tap target on phones. */
export function SimButton({
  onClick,
  active,
  disabled,
  tone = "brand",
  icon,
  children,
  className = "",
}: {
  onClick: () => void;
  active: boolean;
  disabled?: boolean;
  tone?: "brand" | "error" | "success";
  icon: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  const tones = {
    brand: active
      ? "bg-success-400 text-gray-950 shadow-[0_0_25px_rgba(18,183,106,0.6)]"
      : "border border-brand-500/30 bg-brand-500/10 text-brand-600 hover:bg-brand-500 hover:text-white dark:text-theme-cyan-500 dark:hover:text-white",
    error: active
      ? "bg-error-500 text-white shadow-[0_0_20px_rgba(240,68,56,0.6)]"
      : "border border-error-500/30 bg-error-500/10 text-error-600 hover:bg-error-500 hover:text-white dark:text-error-400",
    success: active
      ? "bg-success-500 text-gray-950"
      : "border border-success-500/40 bg-success-500/15 text-success-600 hover:bg-success-500 hover:text-gray-950 dark:text-success-300",
  };

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`inline-flex min-h-10 shrink-0 cursor-pointer items-center justify-center gap-1.5 rounded-xl px-3.5 py-2 text-xs font-extrabold transition-all active:scale-95 disabled:cursor-default ${tones[tone]} ${className}`}
    >
      {icon}
      <span>{children}</span>
    </button>
  );
}
