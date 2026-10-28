"use client";

import DashboardSidebar from "@/components/dashboard/DashboardSidebar";
import DashboardHeader from "@/components/dashboard/DashboardHeader";
import { useUserNav } from "@/components/dashboard/nav";
import MqttToastBridge from "@/components/user-dashboard/MqttToastBridge";
import PhoneVerifyBanner from "@/components/user-dashboard/PhoneVerifyBanner";
import { UserSidebarProvider, useUserSidebar } from "@/context/UserSidebarContext";
import { WalletProvider } from "@/context/WalletContext";
import { MqttLiveProvider } from "@/context/MqttLiveContext";
import { useLanguage } from "@/context/LanguageContext";
import React from "react";

function UserDashboardShell({ children }: { children: React.ReactNode }) {
  const sidebar = useUserSidebar();
  const sections = useUserNav();
  const { lang } = useLanguage();
  const wide = sidebar.isExpanded || sidebar.isHovered;

  return (
    <div dir={lang === "fa" ? "rtl" : "ltr"} className="min-h-screen bg-gray-50 dark:bg-[#070a12]">
      <MqttToastBridge />
      <DashboardSidebar sections={sections} homeHref="/dashboard" sidebar={sidebar} />
      <div className={`flex min-w-0 flex-col transition-[margin] duration-300 ease-in-out ${wide ? "lg:ms-[280px]" : "lg:ms-[72px]"}`}>
        <DashboardHeader
          sections={sections}
          isMobileOpen={sidebar.isMobileOpen}
          toggleSidebar={sidebar.toggleSidebar}
          toggleMobileSidebar={sidebar.toggleMobileSidebar}
          showWallet
        />
        <PhoneVerifyBanner />
        <main className="mx-auto w-full max-w-screen-2xl flex-1 px-4 py-6 sm:px-6 lg:py-8">{children}</main>
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
