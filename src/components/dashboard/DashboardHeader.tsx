"use client";

import React, { useState } from "react";
import { Menu, X, Search } from "lucide-react";
import { ThemeToggleButton } from "@/components/common/ThemeToggleButton";
import NotificationDropdown from "@/components/header/NotificationDropdown";
import UserDropdown from "@/components/header/UserDropdown";
import LanguageSwitcher from "@/components/header/LanguageSwitcher";
import WalletBalance from "@/components/header/WalletBalance";
import { useT } from "@/i18n/useT";
import CommandPalette from "./CommandPalette";
import type { NavSection } from "./nav";

export default function DashboardHeader({
  sections,
  isMobileOpen,
  toggleSidebar,
  toggleMobileSidebar,
  showWallet = false,
}: {
  sections: NavSection[];
  isMobileOpen: boolean;
  toggleSidebar: () => void;
  toggleMobileSidebar: () => void;
  showWallet?: boolean;
}) {
  const t = useT();
  const [paletteOpen, setPaletteOpen] = useState(false);

  const onToggle = () => {
    if (window.innerWidth >= 1024) toggleSidebar();
    else toggleMobileSidebar();
  };

  return (
    <>
      <header className="sticky top-0 z-30 flex h-16 w-full items-center justify-between gap-3 border-b border-gray-200 bg-white/85 px-4 backdrop-blur-xl lg:px-6 dark:border-gray-800 dark:bg-gray-950/80">
        <div className="flex min-w-0 items-center gap-3">
          <button
            type="button"
            onClick={onToggle}
            aria-label={t("toggleSidebar")}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-gray-500 transition hover:bg-gray-100 lg:border lg:border-gray-200 dark:text-gray-400 dark:hover:bg-gray-800 lg:dark:border-gray-800"
          >
            {isMobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>

          {/* Opens the command palette — looks like a search field on desktop, an icon on mobile. */}
          <button
            type="button"
            onClick={() => setPaletteOpen(true)}
            aria-label={t("cmdOpen")}
            className="flex h-10 items-center gap-2.5 rounded-xl border border-gray-200 bg-gray-50 px-3 text-sm text-gray-400 transition hover:border-gray-300 lg:w-72 xl:w-96 dark:border-gray-800 dark:bg-white/[0.03] dark:text-gray-500 dark:hover:border-gray-700"
          >
            <Search className="h-4 w-4 shrink-0" />
            <span className="hidden flex-1 truncate text-start lg:block">{t("cmdPlaceholder")}</span>
            <kbd dir="ltr" className="hidden rounded-md border border-gray-200 bg-white px-1.5 py-0.5 font-mono-signal text-[10px] text-gray-500 lg:block dark:border-gray-700 dark:bg-gray-900">⌘K</kbd>
          </button>
        </div>

        <div className="flex shrink-0 items-center gap-2 sm:gap-3">
          {showWallet && <div className="hidden sm:block"><WalletBalance /></div>}
          <LanguageSwitcher />
          <ThemeToggleButton />
          <NotificationDropdown />
          <UserDropdown />
        </div>
      </header>

      <CommandPalette sections={sections} open={paletteOpen} onOpenChange={setPaletteOpen} />
    </>
  );
}
