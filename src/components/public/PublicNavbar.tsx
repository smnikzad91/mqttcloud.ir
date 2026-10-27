"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowLeft, ChevronLeft, Menu, X } from "lucide-react";
import { ThemeToggleButton } from "@/components/common/ThemeToggleButton";
import MarkIcon from "@/brand/mark.svg";
import MarkWhiteIcon from "@/brand/mark-white.svg";
import { SocialIcon, PLATFORM_LABELS_FA } from "@/components/common/SocialIcon";
import { Button } from "@/components/public/shared/Button";
import { easeSignal, staggerContainer, staggerItem } from "@/components/public/shared/motion";
import type { SocialLinkItem } from "@/components/public/home/types";

interface AnnouncementItem {
  _id: string;
  text: string;
  link?: string;
  linkText?: string;
  emoji?: string;
}

const navLinks = [
  { label: "امکانات", href: "/#features" },
  { label: "نحوه کار", href: "/#how-it-works" },
  { label: "قیمت‌گذاری", href: "/pricing" },
  { label: "وبلاگ", href: "/blog" },
  { label: "اخبار", href: "/news" },
];

function Logo() {
  return (
    <Link href="/" className="flex shrink-0 items-center gap-2.5">
      <MarkIcon viewBox="6 12 36 36" className="shrink-0 dark:hidden" width={36} height={36} />
      <MarkWhiteIcon viewBox="6 12 36 36" className="hidden shrink-0 dark:block" width={36} height={36} />
      <span dir="ltr" className="text-lg leading-none font-black tracking-tight text-gray-900 dark:text-white">
        mqttcloud<span className="bg-gradient-to-r from-brand-500 to-theme-cyan-500 bg-clip-text text-transparent">.ir</span>
      </span>
    </Link>
  );
}

export default function PublicNavbar() {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [announced, setAnnounced] = useState(true);
  const [socialLinks, setSocialLinks] = useState<SocialLinkItem[]>([]);
  const [announcement, setAnnouncement] = useState<AnnouncementItem | null>(null);
  const [prevPathname, setPrevPathname] = useState(pathname);

  if (pathname !== prevPathname) {
    setPrevPathname(pathname);
    setMenuOpen(false);
  }

  useEffect(() => {
    fetch("/api/public/social-links")
      .then((r) => r.json())
      .then((d) => setSocialLinks(Array.isArray(d) ? d : []))
      .catch(() => {});
    fetch("/api/public/announcements")
      .then((r) => r.json())
      .then((d) => setAnnouncement(d ?? null))
      .catch(() => {});
  }, []);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Lock page scroll and allow Escape while the mobile menu is open
  useEffect(() => {
    if (!menuOpen) return;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setMenuOpen(false);
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", onKey);
    };
  }, [menuOpen]);

  return (
    <>
      {/* Announcement — in normal flow (not sticky) so it never eats a phone's viewport while scrolling */}
      <AnimatePresence initial={false}>
        {announced && announcement && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: easeSignal }}
            className="overflow-hidden px-3 pt-3 sm:px-6"
          >
            <div className="mx-auto flex max-w-4xl items-center justify-between gap-3 rounded-2xl border border-brand-500/30 bg-gray-900/95 px-4 py-2.5 text-xs text-white shadow-lg backdrop-blur-xl dark:border-theme-cyan-500/25 dark:bg-gray-950/90">
              <div className="flex min-w-0 flex-1 flex-col gap-1 sm:flex-row sm:items-center sm:gap-2.5">
                <p className="line-clamp-2 leading-relaxed font-medium text-gray-200 sm:truncate">
                  <span className="me-1.5 inline-block h-1.5 w-1.5 rounded-full bg-theme-cyan-500 align-middle" />
                  {announcement.emoji && `${announcement.emoji} `}
                  {announcement.text}
                </p>
                {announcement.link && (
                  <Link href={announcement.link} className="flex shrink-0 items-center gap-1 font-bold text-theme-cyan-500 hover:underline">
                    {announcement.linkText || "بیشتر بدانید"}
                    <ArrowLeft className="h-3 w-3" aria-hidden="true" />
                  </Link>
                )}
              </div>
              <button
                type="button"
                onClick={() => setAnnounced(false)}
                aria-label="بستن اعلان"
                className="flex h-8 w-8 shrink-0 cursor-pointer items-center justify-center rounded-lg text-gray-400 transition-colors hover:bg-white/10 hover:text-white"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <header className="sticky top-0 z-50 w-full px-3 pt-3 sm:px-6" dir="rtl">
        <div
          className={`relative mx-auto flex h-16 max-w-7xl items-center justify-between rounded-2xl border px-3 transition-all duration-300 sm:px-6 ${
            scrolled
              ? "border-gray-200/80 bg-white/85 shadow-[0_16px_40px_-12px_rgba(0,0,0,0.25)] backdrop-blur-2xl dark:border-white/10 dark:bg-gray-950/85"
              : "border-gray-200/60 bg-white/70 backdrop-blur-xl dark:border-white/10 dark:bg-gray-950/65"
          }`}
        >
          <Logo />

          <nav className="hidden items-center gap-1 rounded-xl border border-gray-200/60 bg-gray-100/80 p-1 lg:flex dark:border-white/[0.06] dark:bg-white/[0.04]">
            {navLinks.map((link) => {
              const active = pathname === link.href;
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`rounded-lg px-3.5 py-1.5 text-sm font-bold transition-colors duration-200 ${
                    active
                      ? "bg-gradient-to-l from-brand-500 to-theme-purple-500 text-white shadow-sm"
                      : "text-gray-600 hover:text-gray-900 dark:text-gray-300 dark:hover:text-white"
                  }`}
                >
                  {link.label}
                </Link>
              );
            })}
          </nav>

          <div className="hidden items-center gap-2 lg:flex">
            <ThemeToggleButton />
            {socialLinks.length > 0 && (
              <>
                <div className="mx-1 h-5 w-px bg-gray-200 dark:bg-gray-700" />
                {socialLinks.map((sl) => (
                  <a
                    key={sl.id}
                    href={sl.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    title={(sl.label || PLATFORM_LABELS_FA[sl.platform]).replace(/^#/, "")}
                    className="flex h-9 w-9 items-center justify-center rounded-xl text-gray-600 transition-colors hover:bg-gray-100 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-white/5 dark:hover:text-white"
                  >
                    <SocialIcon platform={sl.platform} className="h-4 w-4" />
                  </a>
                ))}
              </>
            )}
            <div className="mx-1 h-5 w-px bg-gray-200 dark:bg-gray-700" />
            <Link
              href="/signin"
              className="px-3 py-2 text-sm font-bold text-gray-700 transition-colors hover:text-brand-600 dark:text-gray-200 dark:hover:text-theme-cyan-500"
            >
              ورود
            </Link>
            <Button href="/signup" size="sm" className="rounded-xl" endIcon={<ArrowLeft className="h-4 w-4" />}>
              شروع رایگان
            </Button>
          </div>

          <div className="flex items-center gap-2 lg:hidden">
            <ThemeToggleButton />
            <button
              type="button"
              onClick={() => setMenuOpen((o) => !o)}
              aria-label={menuOpen ? "بستن منو" : "باز کردن منو"}
              aria-expanded={menuOpen}
              aria-controls="public-mobile-menu"
              className="flex h-11 w-11 cursor-pointer items-center justify-center rounded-xl border border-gray-200 bg-gray-100 text-gray-700 dark:border-white/10 dark:bg-white/5 dark:text-gray-200"
            >
              {menuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </div>

        {/* Mobile dropdown — capped to the viewport so a short phone can still scroll it */}
        <AnimatePresence>
          {menuOpen && (
            <>
              <motion.div
                key="backdrop"
                className="fixed inset-0 -z-10 bg-black/40 backdrop-blur-sm lg:hidden"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
                onClick={() => setMenuOpen(false)}
                aria-hidden="true"
              />
              <motion.div
                key="panel"
                id="public-mobile-menu"
                className="mx-auto mt-2 max-h-[calc(100dvh-6rem)] max-w-7xl overflow-y-auto overscroll-contain rounded-2xl border border-gray-200 bg-white/95 p-4 shadow-2xl backdrop-blur-2xl lg:hidden dark:border-white/10 dark:bg-gray-950/95"
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.22, ease: easeSignal }}
              >
                <motion.div variants={staggerContainer(0.05, 0.03)} initial="hidden" animate="show" className="space-y-4">
                  <nav className="grid grid-cols-1 gap-1.5">
                    {navLinks.map((link) => {
                      const active = pathname === link.href;
                      return (
                        <motion.div key={link.href} variants={staggerItem}>
                          <Link
                            href={link.href}
                            onClick={() => setMenuOpen(false)}
                            className={`flex min-h-12 items-center justify-between rounded-xl px-4 text-base font-bold transition-colors ${
                              active
                                ? "bg-gradient-to-l from-brand-500 to-theme-purple-500 text-white"
                                : "text-gray-800 hover:bg-gray-100 dark:text-gray-200 dark:hover:bg-white/5"
                            }`}
                          >
                            {link.label}
                            <ChevronLeft className={`h-4 w-4 ${active ? "text-white/70" : "text-gray-400"}`} aria-hidden="true" />
                          </Link>
                        </motion.div>
                      );
                    })}
                  </nav>

                  {socialLinks.length > 0 && (
                    <motion.div variants={staggerItem} className="flex flex-wrap gap-2 border-t border-gray-200 pt-4 dark:border-white/10">
                      {socialLinks.map((sl) => (
                        <a
                          key={sl.id}
                          href={sl.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-gray-200 px-3 text-sm font-semibold text-gray-600 dark:border-white/10 dark:text-gray-300"
                        >
                          <SocialIcon platform={sl.platform} className="h-4 w-4 shrink-0" />
                          {(sl.label || PLATFORM_LABELS_FA[sl.platform]).replace(/^#/, "")}
                        </a>
                      ))}
                    </motion.div>
                  )}

                  <motion.div variants={staggerItem} className="grid grid-cols-2 gap-2.5 border-t border-gray-200 pt-4 dark:border-white/10">
                    <Link
                      href="/signin"
                      onClick={() => setMenuOpen(false)}
                      className="flex min-h-12 items-center justify-center rounded-xl border border-gray-200 text-sm font-bold text-gray-800 dark:border-white/15 dark:text-white"
                    >
                      ورود
                    </Link>
                    <Button href="/signup" size="lg" className="min-h-12 rounded-xl text-sm" onClick={() => setMenuOpen(false)}>
                      شروع رایگان
                    </Button>
                  </motion.div>
                </motion.div>
              </motion.div>
            </>
          )}
        </AnimatePresence>
      </header>
    </>
  );
}
