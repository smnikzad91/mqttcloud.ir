"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
import { ChevronDown, ArrowUpRight, LogOut } from "lucide-react";
import MarkIcon from "@/brand/mark.svg";
import MarkWhiteIcon from "@/brand/mark-white.svg";
import { useT } from "@/i18n/useT";
import { cn } from "./ui";
import type { NavSection } from "./nav";

/** The slice of SidebarContext / UserSidebarContext the shell needs — both contexts already match it. */
export type SidebarState = {
  isExpanded: boolean;
  isHovered: boolean;
  isMobileOpen: boolean;
  toggleMobileSidebar: () => void;
  setIsHovered: (v: boolean) => void;
};

/** Exact match, plus "section" match for nested routes (/dashboard/support/123 → Support) — but never let a parent like /dashboard swallow its children. */
function matches(pathname: string, href: string, allHrefs: string[]) {
  if (pathname === href) return true;
  if (!pathname.startsWith(href + "/")) return false;
  // A more specific nav entry owns this path.
  return !allHrefs.some((h) => h !== href && h.startsWith(href + "/") && (pathname === h || pathname.startsWith(h + "/")));
}

export default function DashboardSidebar({
  sections,
  homeHref,
  sidebar,
  showAccountFooter = true,
}: {
  sections: NavSection[];
  homeHref: string;
  sidebar: SidebarState;
  showAccountFooter?: boolean;
}) {
  const t = useT();
  const pathname = usePathname() ?? "";
  const { isExpanded, isHovered, isMobileOpen, toggleMobileSidebar, setIsHovered } = sidebar;
  const expanded = isExpanded || isHovered || isMobileOpen;
  const { data: session } = useSession();

  const allHrefs = sections.flatMap((s) => s.items.flatMap((i) => [i.href, ...(i.children?.map((c) => c.href) ?? [])]));
  const isOn = (href: string) => matches(pathname, href, allHrefs);

  // Auto-open the group that contains the current page.
  const [openGroup, setOpenGroup] = useState<string | null>(null);
  useEffect(() => {
    const owner = sections.flatMap((s) => s.items).find((i) => i.children?.some((c) => !c.external && isOn(c.href)));
    queueMicrotask(() => setOpenGroup(owner?.href ?? null));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  // Close the mobile drawer after navigating.
  useEffect(() => {
    if (isMobileOpen) toggleMobileSidebar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  const itemBase = "group relative flex w-full items-center gap-3 rounded-xl px-2.5 py-2 text-sm font-medium transition-colors focus-visible:outline-2 focus-visible:outline-brand-500";
  const itemIdle = "text-gray-600 hover:bg-gray-100 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-white/5 dark:hover:text-gray-100";
  const itemActive = "bg-brand-50 text-brand-700 dark:bg-brand-500/10 dark:text-white";

  const iconBox = (active: boolean) => cn(
    "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg transition-colors",
    active
      ? "bg-brand-500 text-white shadow-sm shadow-brand-500/30"
      : "bg-gray-100 text-gray-500 group-hover:text-gray-700 dark:bg-white/5 dark:text-gray-400 dark:group-hover:text-gray-200",
  );

  const name = session?.user?.name ?? "";
  const email = session?.user?.email ?? "";
  const avatar = session?.user?.avatar || "/images/user/user-01.jpg";

  return (
    <>
      {isMobileOpen && (
        <div className="fixed inset-0 z-40 bg-gray-900/50 backdrop-blur-sm lg:hidden" onClick={toggleMobileSidebar} aria-hidden />
      )}

      <aside
        aria-label="Sidebar"
        className={cn(
          "fixed inset-y-0 start-0 z-50 flex h-screen flex-col border-e border-gray-200 bg-white transition-[width,translate] duration-300 ease-in-out dark:border-gray-800 dark:bg-gray-950",
          expanded ? "w-[280px]" : "w-[72px]",
          isMobileOpen ? "translate-x-0" : "-translate-x-full rtl:translate-x-full",
          "lg:translate-x-0 rtl:lg:translate-x-0",
        )}
        onMouseEnter={() => !isExpanded && setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        {/* Logo */}
        <div className={cn("flex h-16 shrink-0 items-center border-b border-gray-100 px-4 dark:border-gray-800", expanded ? "gap-2.5" : "justify-center")}>
          <Link href={homeHref} className="flex items-center gap-2.5" aria-label="mqttcloud.ir">
            <MarkIcon viewBox="6 12 36 36" className="shrink-0 dark:hidden" width={34} height={34} />
            <MarkWhiteIcon viewBox="6 12 36 36" className="hidden shrink-0 dark:block" width={34} height={34} />
            {expanded && (
              <span dir="ltr" className="text-base font-bold tracking-tight text-gray-900 dark:text-white">
                mqttcloud<span className="font-mono-signal font-normal text-[#16b8c9] dark:text-theme-cyan-500">.ir</span>
              </span>
            )}
          </Link>
        </div>

        {/* Nav */}
        <nav className="flex-1 space-y-5 overflow-y-auto px-3 py-4 no-scrollbar">
          {sections.map((section, si) => (
            <div key={si}>
              {section.title && (
                expanded
                  ? <p className="mb-1.5 px-2.5 text-[11px] font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500">{section.title}</p>
                  : <div className="mx-auto mb-2 h-px w-6 bg-gray-200 dark:bg-gray-800" />
              )}
              <ul className="space-y-0.5">
                {section.items.map((item) => {
                  if (item.children) {
                    const groupActive = item.children.some((c) => !c.external && isOn(c.href));
                    const open = openGroup === item.href;
                    return (
                      <li key={item.href}>
                        <button
                          type="button"
                          aria-expanded={open}
                          title={!expanded ? item.label : undefined}
                          onClick={() => setOpenGroup(open ? null : item.href)}
                          className={cn(itemBase, groupActive ? itemActive : itemIdle, !expanded && "justify-center")}
                        >
                          <span className={iconBox(groupActive)}>{item.icon}</span>
                          {expanded && (
                            <>
                              <span className="flex-1 text-start">{item.label}</span>
                              <ChevronDown className={cn("h-4 w-4 shrink-0 text-gray-400 transition-transform", open && "rotate-180")} />
                            </>
                          )}
                        </button>
                        {expanded && open && (
                          <ul className="ms-[26px] mt-0.5 space-y-0.5 border-s border-gray-200 ps-3 dark:border-gray-800">
                            {item.children.map((c) => {
                              const on = !c.external && isOn(c.href);
                              return (
                                <li key={c.href + c.label}>
                                  <Link
                                    href={c.href}
                                    target={c.external ? "_blank" : undefined}
                                    aria-current={on ? "page" : undefined}
                                    className={cn(
                                      "flex items-center justify-between gap-2 rounded-lg px-2.5 py-1.5 text-[13px] transition-colors",
                                      on
                                        ? "font-semibold text-brand-600 dark:text-brand-300"
                                        : "text-gray-500 hover:bg-gray-100 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-white/5 dark:hover:text-gray-100",
                                    )}
                                  >
                                    {c.label}
                                    {c.external && <ArrowUpRight className="h-3.5 w-3.5 shrink-0 opacity-60 rtl:-scale-x-100" />}
                                  </Link>
                                </li>
                              );
                            })}
                          </ul>
                        )}
                      </li>
                    );
                  }
                  const on = !item.external && isOn(item.href);
                  return (
                    <li key={item.href}>
                      <Link
                        href={item.href}
                        target={item.external ? "_blank" : undefined}
                        aria-current={on ? "page" : undefined}
                        title={!expanded ? item.label : undefined}
                        className={cn(itemBase, on ? itemActive : itemIdle, !expanded && "justify-center")}
                      >
                        {on && expanded && <span className="absolute inset-y-2 start-0 w-0.5 rounded-full bg-brand-500" />}
                        <span className={iconBox(on)}>{item.icon}</span>
                        {expanded && <span className="flex-1 truncate">{item.label}</span>}
                        {expanded && item.external && <ArrowUpRight className="h-3.5 w-3.5 shrink-0 opacity-60 rtl:-scale-x-100" />}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </nav>

        {/* Account footer */}
        {showAccountFooter && (
          <div className={cn("border-t border-gray-100 p-3 dark:border-gray-800", !expanded && "flex justify-center")}>
            {expanded ? (
              <div className="flex items-center gap-3 rounded-xl p-2">
                <Image src={avatar} alt="" width={36} height={36} className="h-9 w-9 shrink-0 rounded-full object-cover ring-2 ring-brand-100 dark:ring-brand-900" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-gray-800 dark:text-white/90">{name}</p>
                  <p dir="ltr" className="truncate text-start text-xs text-gray-500 dark:text-gray-400">{email}</p>
                </div>
                <button
                  type="button"
                  onClick={() => signOut({ callbackUrl: "/signin" })}
                  aria-label={t("signOut")}
                  title={t("signOut")}
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-gray-500 transition hover:bg-error-50 hover:text-error-600 dark:text-gray-400 dark:hover:bg-error-500/10 dark:hover:text-error-400"
                >
                  <LogOut className="h-4 w-4 rtl:-scale-x-100" />
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => signOut({ callbackUrl: "/signin" })}
                aria-label={t("signOut")}
                title={t("signOut")}
                className="flex h-9 w-9 items-center justify-center rounded-lg text-gray-500 hover:bg-error-50 hover:text-error-600 dark:text-gray-400 dark:hover:bg-error-500/10"
              >
                <LogOut className="h-4 w-4 rtl:-scale-x-100" />
              </button>
            )}
          </div>
        )}
      </aside>
    </>
  );
}
