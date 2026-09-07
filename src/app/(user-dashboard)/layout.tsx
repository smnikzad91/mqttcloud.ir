"use client";

import UserSidebar from "@/components/user-dashboard/UserSidebar";
import UserHeader from "@/components/user-dashboard/UserHeader";
import MqttToastBridge from "@/components/user-dashboard/MqttToastBridge";
import { UserSidebarProvider, useUserSidebar } from "@/context/UserSidebarContext";
import { WalletProvider } from "@/context/WalletContext";
import { MqttLiveProvider } from "@/context/MqttLiveContext";
import { useLanguage } from "@/context/LanguageContext";
import React from "react";

function UserDashboardShell({ children }: { children: React.ReactNode }) {
  const { isExpanded, isHovered, isMobileOpen } = useUserSidebar();
  const { lang } = useLanguage();
  const isRTL = lang === "fa";

  const mainContentMargin = isMobileOpen
    ? ""
    : isExpanded || isHovered
    ? isRTL ? "lg:mr-[280px]" : "lg:ml-[280px]"
    : isRTL ? "lg:mr-[72px]" : "lg:ml-[72px]";

  return (
    <div dir={isRTL ? "rtl" : "ltr"} className="min-h-screen xl:flex bg-gradient-to-br from-white to-brand-50 dark:from-[#0d1117] dark:to-[#1a2744]">
      <MqttToastBridge />
      <UserSidebar />
      <div className={`flex-1 transition-all duration-300 ease-in-out ${mainContentMargin}`}>
        <UserHeader />
        <main className="flex-1 overflow-y-auto">
          <div className="mx-auto max-w-screen-2xl px-6 py-8">{children}</div>
        </main>
      </div>
    </div>
  );
}

export default function UserDashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <UserSidebarProvider>
      <WalletProvider>
        <MqttLiveProvider>
          <UserDashboardShell>{children}</UserDashboardShell>
        </MqttLiveProvider>
      </WalletProvider>
    </UserSidebarProvider>
  );
}
