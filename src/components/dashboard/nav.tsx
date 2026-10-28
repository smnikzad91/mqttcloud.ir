"use client";

// Navigation for both dashboards. The sidebar and the ⌘K command palette both
// read from here, so a page added once shows up in both.

import React from "react";
import {
  LayoutDashboard, Radio, Activity, MessagesSquare, CreditCard, Wallet,
  UserRound, KeyRound, LifeBuoy, Users, BadgeDollarSign, Ticket, Mail,
  FileText, Newspaper, Megaphone, CircleQuestionMark, Scale, Search, Share2, Globe,
} from "lucide-react";
import { useT } from "@/i18n/useT";

export type NavLink = {
  href: string;
  label: string;
  icon?: React.ReactNode;
  /** Children render as an expandable group in the sidebar. */
  children?: { href: string; label: string; external?: boolean }[];
  /** Marks a link to the public site — opens in a new tab. */
  external?: boolean;
};

export type NavSection = { title?: string; items: NavLink[] };

const ic = "h-[18px] w-[18px]";

export function useUserNav(): NavSection[] {
  const t = useT();
  return [
    { items: [{ href: "/dashboard", label: t("linkOverview"), icon: <LayoutDashboard className={ic} /> }] },
    {
      title: t("navGroupMqtt"),
      items: [
        { href: "/dashboard/mqtt",          label: t("navMqtt"),         icon: <Radio className={ic} /> },
        { href: "/dashboard/mqtt/activity", label: t("navMqttActivity"), icon: <Activity className={ic} /> },
        { href: "/dashboard/mqtt/messages", label: t("navMqttMessages"), icon: <MessagesSquare className={ic} /> },
      ],
    },
    {
      title: t("navGroupBilling"),
      items: [
        { href: "/dashboard/subscription", label: t("linkSubscription"), icon: <CreditCard className={ic} /> },
        { href: "/dashboard/finance",      label: t("navFinance"),       icon: <Wallet className={ic} /> },
      ],
    },
    {
      title: t("navGroupAccount"),
      items: [
        { href: "/dashboard/profile", label: t("linkProfile"),         icon: <UserRound className={ic} /> },
        { href: "/dashboard/account", label: t("linkAccountSettings"), icon: <KeyRound className={ic} /> },
        { href: "/dashboard/support", label: t("linkSupport"),         icon: <LifeBuoy className={ic} /> },
      ],
    },
  ];
}

export function useAdminNav(): NavSection[] {
  const t = useT();
  return [
    { items: [{ href: "/admin", label: t("navAdminOverview"), icon: <LayoutDashboard className={ic} /> }] },
    {
      title: t("navGroupCustomers"),
      items: [
        { href: "/admin/users", label: t("navUsers"), icon: <Users className={ic} /> },
        { href: "/admin/mqtt",  label: t("navMqtt"),  icon: <Radio className={ic} /> },
      ],
    },
    {
      title: t("navGroupBilling"),
      items: [{ href: "/admin/finance", label: t("navFinance"), icon: <BadgeDollarSign className={ic} /> }],
    },
    {
      title: t("navGroupSupport"),
      items: [
        { href: "/admin/tickets", label: t("navTickets"), icon: <Ticket className={ic} /> },
        { href: "/admin/contact", label: t("navContact"), icon: <Mail className={ic} /> },
      ],
    },
    {
      title: t("navGroupContent"),
      items: [
        {
          href: "/admin/blog", label: t("navBlog"), icon: <FileText className={ic} />,
          children: [
            { href: "/admin/blog",            label: t("navBlogPosts") },
            { href: "/admin/blog/new",        label: t("navBlogNewPost") },
            { href: "/admin/blog/categories", label: t("navBlogCategories") },
            { href: "/blog",                  label: t("navBlogPublic"), external: true },
          ],
        },
        {
          href: "/admin/news", label: t("navNews"), icon: <Newspaper className={ic} />,
          children: [
            { href: "/admin/news",      label: t("navNewsItems") },
            { href: "/admin/news/new",  label: t("navNewsNew") },
            { href: "/admin/news/tags", label: t("navNewsTags") },
            { href: "/news",            label: t("navNewsPublic"), external: true },
          ],
        },
        { href: "/admin/announcements", label: t("navAnnouncements"), icon: <Megaphone className={ic} /> },
        { href: "/admin/faqs",          label: t("navFaq"),           icon: <CircleQuestionMark className={ic} /> },
        { href: "/admin/legal",         label: t("navLegal"),         icon: <Scale className={ic} /> },
      ],
    },
    {
      title: t("navGroupSite"),
      items: [
        { href: "/admin/seo-settings", label: t("navSeoSettings"), icon: <Search className={ic} /> },
        { href: "/admin/social-links", label: t("navSocialLinks"), icon: <Share2 className={ic} /> },
        { href: "/",                   label: t("navViewSite"),    icon: <Globe className={ic} />, external: true },
      ],
    },
  ];
}

/** Flattens sections into the leaf links the command palette searches. */
export function flattenNav(sections: NavSection[]) {
  const out: { href: string; label: string; group?: string; external?: boolean }[] = [];
  for (const s of sections) {
    for (const it of s.items) {
      if (it.children) {
        for (const c of it.children) out.push({ href: c.href, label: `${it.label} › ${c.label}`, group: s.title, external: c.external });
      } else {
        out.push({ href: it.href, label: it.label, group: s.title, external: it.external });
      }
    }
  }
  return out;
}
