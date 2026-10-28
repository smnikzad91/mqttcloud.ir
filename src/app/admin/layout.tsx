"use client";

import DashboardSidebar from "@/components/dashboard/DashboardSidebar";
import DashboardHeader from "@/components/dashboard/DashboardHeader";
import { useAdminNav } from "@/components/dashboard/nav";
import { useSidebar } from "@/context/SidebarContext";
import { useLanguage } from "@/context/LanguageContext";
import React from "react";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const sidebar = useSidebar();
  const sections = useAdminNav();
  const { lang } = useLanguage();
  const wide = sidebar.isExpanded || sidebar.isHovered;

  return (
    <div dir={lang === "fa" ? "rtl" : "ltr"} className="min-h-screen bg-gray-50 dark:bg-[#070a12]">
      <DashboardSidebar sections={sections} homeHref="/admin" sidebar={sidebar} />
      <div className={`flex min-w-0 flex-col transition-[margin] duration-300 ease-in-out ${wide ? "lg:ms-[280px]" : "lg:ms-[72px]"}`}>
        <DashboardHeader
          sections={sections}
          isMobileOpen={sidebar.isMobileOpen}
          toggleSidebar={sidebar.toggleSidebar}
          toggleMobileSidebar={sidebar.toggleMobileSidebar}
        />
        <main className="mx-auto w-full max-w-screen-2xl flex-1 px-4 py-6 sm:px-6 lg:py-8">{children}</main>
      </div>
    </div>
  );
}
