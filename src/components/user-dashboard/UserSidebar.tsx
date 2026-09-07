"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import Image from "next/image";
import { useSession, signOut } from "next-auth/react";
import MarkIcon from "@/brand/mark.svg";
import MarkWhiteIcon from "@/brand/mark-white.svg";
import { useUserSidebar } from "@/context/UserSidebarContext";
import { useT } from "@/i18n/useT";
import { useLanguage } from "@/context/LanguageContext";

export default function UserSidebar() {
  const pathname = usePathname();
  const { isExpanded, isHovered, isMobileOpen, toggleMobileSidebar, setIsHovered } = useUserSidebar();
  const t = useT();
  const { lang } = useLanguage();
  const isRTL = lang === "fa";
  const { data: session } = useSession();
  const userName  = session?.user?.name  ?? "";
  const userEmail = session?.user?.email ?? "";
  const avatar    = session?.user?.avatar || "/images/user/user-01.jpg";

  const links = [
    {
      href: "/dashboard",
      label: t("linkOverview"),
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
        </svg>
      ),
    },
    {
      href: "/dashboard/profile",
      label: t("linkProfile"),
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
        </svg>
      ),
    },
    {
      href: "/dashboard/account",
      label: t("linkAccountSettings"),
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
      ),
    },
    {
      href: "/dashboard/subscription",
      label: t("linkSubscription"),
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
        </svg>
      ),
    },
    {
      href: "/dashboard/finance",
      label: t("navFinance"),
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z"/>
        </svg>
      ),
    },
    {
      href: "/dashboard/mqtt",
      label: t("navMqtt"),
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
        </svg>
      ),
    },
    {
      href: "/dashboard/mqtt/activity",
      label: t("navMqttActivity"),
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M3 12h4l3 8 4-16 3 8h4" />
        </svg>
      ),
    },
    {
      href: "/dashboard/mqtt/messages",
      label: t("navMqttMessages"),
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.86 9.86 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
        </svg>
      ),
    },
    {
      href: "/dashboard/support",
      label: t("linkSupport"),
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M18.364 5.636l-3.536 3.536m0 5.656l3.536 3.536M9.172 9.172L5.636 5.636m3.536 9.192l-3.536 3.536M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-5 0a4 4 0 11-8 0 4 4 0 018 0z" />
        </svg>
      ),
    },
  ];

  const expanded = isExpanded || isHovered || isMobileOpen;

  return (
    <>
      {/* Backdrop */}
      {isMobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={toggleMobileSidebar}
        />
      )}

      <aside
        dir={isRTL ? "rtl" : "ltr"}
        className={`fixed top-0 z-50 flex h-screen flex-col bg-white transition-all duration-300 ease-in-out dark:bg-gray-900
          ${isRTL
            ? "right-0 border-l border-gray-200 dark:border-gray-800"
            : "left-0 border-r border-gray-200 dark:border-gray-800"}
          ${expanded ? "w-[280px]" : "w-[72px]"}
          ${isMobileOpen ? "translate-x-0" : isRTL ? "translate-x-full" : "-translate-x-full"}
          lg:translate-x-0 lg:mt-0 mt-16`}
        onMouseEnter={() => !isExpanded && setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        {/* Logo */}
        <div className={`flex h-16 shrink-0 items-center border-b border-gray-100 px-4 dark:border-gray-800 ${expanded ? "justify-start gap-2.5" : "justify-center"}`}>
          <MarkIcon viewBox="6 12 36 36" className="shrink-0 dark:hidden" width={36} height={36} />
          <MarkWhiteIcon viewBox="6 12 36 36" className="shrink-0 hidden dark:block" width={36} height={36} />
          {expanded && (
            <Link href="/" className="text-base font-bold tracking-tight text-gray-900 dark:text-white">
              mqttcloud<span className="font-mono font-normal text-[#16b8c9]">.ir</span>
            </Link>
          )}
        </div>

        {/* Nav */}
        <nav className="flex flex-col flex-1 overflow-y-auto no-scrollbar py-4 px-3 gap-0.5">
          {links.map((link) => {
            const active = pathname === link.href;
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-200 ${
                  expanded ? "" : "justify-center"
                } ${
                  active
                    ? "bg-brand-50 text-brand-600 dark:bg-brand-500/10 dark:text-brand-400"
                    : "text-gray-600 hover:bg-gray-100/80 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-white/5 dark:hover:text-gray-200"
                }`}
              >
                {active && expanded && (
                  <span className={`absolute top-1/2 -translate-y-1/2 h-5 w-0.5 rounded-full bg-brand-500 dark:bg-brand-400 ${isRTL ? "right-0" : "left-0"}`} />
                )}
                <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg transition-all ${
                  active
                    ? "bg-brand-500 text-white shadow-sm shadow-brand-500/30"
                    : "bg-gray-100 text-gray-500 dark:bg-white/5 dark:text-gray-400"
                } ${isRTL ? "scale-x-[-1]" : ""}`}>
                  {link.icon}
                </span>
                {expanded && link.label}
              </Link>
            );
          })}
        </nav>

        {/* User footer */}
        {expanded && (
          <div className="border-t border-gray-100 p-4 dark:border-gray-800">
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 overflow-hidden rounded-full ring-2 ring-brand-100 dark:ring-brand-900 shrink-0">
                <Image
                  src={avatar}
                  alt={userName || "User avatar"}
                  width={36}
                  height={36}
                  className="h-full w-full object-cover"
                />
              </div>
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-gray-800 dark:text-white/90">
                  {userName}
                </p>
                <p className="truncate text-xs text-gray-500 dark:text-gray-400">
                  {userEmail}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => signOut({ callbackUrl: "/signin" })}
              className="mt-3 flex w-full items-center justify-center gap-1.5 rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-600 transition-colors hover:bg-gray-50 dark:border-gray-700 dark:text-gray-400 dark:hover:bg-gray-800"
            >
              <svg className={`w-3.5 h-3.5 ${isRTL ? "scale-x-[-1]" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
              {t("signOut")}
            </button>
          </div>
        )}
      </aside>
    </>
  );
}
