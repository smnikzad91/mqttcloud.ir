"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { SocialIcon, PLATFORM_LABELS_FA } from "@/components/common/SocialIcon";
import { Reveal } from "@/components/public/shared/Reveal";
import { Button } from "@/components/public/shared/Button";
import type { SocialLinkItem } from "@/components/public/home/types";

const links = {
  product: [
    { label: "امکانات", href: "/#features" },
    { label: "قیمت‌گذاری", href: "/pricing" },
    { label: "وبلاگ", href: "/blog" },
    { label: "اخبار", href: "/news" },
  ],
  support: [
    { label: "شروع سریع", href: "/#how-it-works" },
    { label: "تماس با ما", href: "/contact" },
    { label: "سوالات متداول", href: "/faq" },
  ],
  legal: [
    { label: "حریم خصوصی", href: "/privacy" },
    { label: "شرایط استفاده", href: "/terms" },
  ],
};

const linkClass = "text-sm text-gray-600 transition-colors hover:text-brand-600 dark:text-gray-400 dark:hover:text-theme-cyan-500";

export default function PublicFooter() {
  const [socialLinks, setSocialLinks] = useState<SocialLinkItem[]>([]);

  useEffect(() => {
    fetch("/api/public/social-links")
      .then((r) => r.json())
      .then((d) => setSocialLinks(Array.isArray(d) ? d : []))
      .catch(() => {});
  }, []);

  return (
    <footer className="border-t border-gray-200 bg-white pt-12 pb-8 dark:border-white/10 dark:bg-gray-950 sm:pt-16 sm:pb-12">
      <Reveal className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Phones: brand full width, the two link lists side by side, newsletter full width */}
        <div className="grid grid-cols-2 gap-x-6 gap-y-10 pb-10 lg:grid-cols-12 lg:gap-10 lg:pb-12">
          <div className="col-span-2 space-y-4 lg:col-span-4">
            <Link href="/" className="inline-flex items-center gap-2.5">
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-tr from-brand-500 to-theme-cyan-500 font-black text-gray-950">M</span>
              <span dir="ltr" className="text-xl font-black">
                <span className="text-gray-900 dark:text-white">mqttcloud</span>
                <span className="text-brand-600 dark:text-theme-cyan-500">.ir</span>
              </span>
            </Link>
            <p className="max-w-sm text-sm leading-relaxed text-gray-600 dark:text-gray-400">
              بروکر MQTT امن و مقیاس‌پذیر برای دستگاه‌ها و پروژه‌های IoT شما — با TLS و namespace اختصاصی هر اکانت.
            </p>
            {socialLinks.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {socialLinks.map((sl) => (
                  <a
                    key={sl.id}
                    href={sl.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex min-h-10 items-center gap-1.5 rounded-xl border border-gray-200 bg-gray-50 px-3 text-xs font-bold text-gray-700 transition-colors hover:border-brand-500 dark:border-white/10 dark:bg-white/5 dark:text-gray-300 dark:hover:border-theme-cyan-500"
                  >
                    <SocialIcon platform={sl.platform} className="h-3.5 w-3.5 shrink-0" />
                    {(sl.label || PLATFORM_LABELS_FA[sl.platform]).replace(/^#/, "")}
                  </a>
                ))}
              </div>
            )}
          </div>

          <div className="space-y-4 lg:col-span-2">
            <h3 className="text-sm font-black text-gray-900 dark:text-white">محصول</h3>
            <ul className="space-y-3">
              {links.product.map((l) => (
                <li key={l.href}><Link href={l.href} className={linkClass}>{l.label}</Link></li>
              ))}
            </ul>
          </div>

          <div className="space-y-4 lg:col-span-2">
            <h3 className="text-sm font-black text-gray-900 dark:text-white">پشتیبانی</h3>
            <ul className="space-y-3">
              {links.support.map((l) => (
                <li key={l.href}><Link href={l.href} className={linkClass}>{l.label}</Link></li>
              ))}
            </ul>
          </div>

          <div className="col-span-2 space-y-4 lg:col-span-4">
            <h3 className="text-sm font-black text-gray-900 dark:text-white">خبرنامه</h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">جدیدترین اخبار و به‌روزرسانی‌ها را دریافت کنید.</p>
            <form className="flex gap-2" onSubmit={(e) => e.preventDefault()}>
              <label htmlFor="footer-newsletter-email" className="sr-only">ایمیل شما</label>
              <input
                id="footer-newsletter-email"
                type="email"
                dir="ltr"
                placeholder="you@company.ir"
                className="min-w-0 flex-1 rounded-xl border border-gray-200 bg-gray-50 px-3.5 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 focus:border-brand-400 focus:ring-2 focus:ring-brand-500/15 focus:outline-none dark:border-white/15 dark:bg-white/5 dark:text-white dark:focus:border-theme-cyan-500"
              />
              <Button type="submit" size="md" className="shrink-0 rounded-xl">عضو شو</Button>
            </form>
            <div className="inline-flex items-center gap-2 text-xs font-bold text-success-600 dark:text-success-400">
              <span className="h-2.5 w-2.5 animate-pulse rounded-full bg-success-500" />
              همه سیستم‌ها عملیاتی
            </div>
          </div>
        </div>

        <div className="flex flex-col items-center justify-between gap-4 border-t border-gray-200 pt-6 text-xs text-gray-500 dark:border-white/10 sm:flex-row">
          <p>© ۱۴۰۴ mqttcloud.ir — تمام حقوق محفوظ است.</p>
          <div className="flex gap-6">
            {links.legal.map((l) => (
              <Link key={l.href} href={l.href} className="py-1 transition-colors hover:text-gray-900 dark:hover:text-gray-300">{l.label}</Link>
            ))}
          </div>
        </div>
      </Reveal>
    </footer>
  );
}
