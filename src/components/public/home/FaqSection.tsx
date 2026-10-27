"use client";

import { useState } from "react";
import Link from "next/link";
import { Plus } from "lucide-react";
import { Reveal } from "@/components/public/shared/Reveal";
import { fa } from "./signal";
import type { FaqItem } from "./types";

export default function FaqSection({ faqs }: { faqs: FaqItem[] }) {
  // null = nothing chosen yet → first item shows open
  const [openId, setOpenId] = useState<string | null>(null);
  if (faqs.length === 0) return null;
  const current = openId ?? faqs[0]._id;

  return (
    <section id="faq" className="scroll-mt-24 border-t border-gray-200 py-16 dark:border-white/10 sm:py-28">
      <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
        <Reveal className="mb-8 text-center sm:mb-12">
          <span className="mb-3 inline-flex rounded-full border border-brand-500/30 bg-brand-500/10 px-4 py-1.5 text-xs font-extrabold text-brand-600 dark:text-theme-cyan-500">
            پرسش و پاسخ
          </span>
          <h2 className="text-3xl font-black text-gray-900 dark:text-white sm:text-4xl">سوالات متداول</h2>
          <p className="mt-3 text-sm text-gray-600 dark:text-gray-300 sm:text-base">
            پاسخ سوال خود را نیافتید؟{" "}
            <Link href="/contact" className="font-extrabold text-brand-600 hover:underline dark:text-theme-cyan-500">
              با ما در تماس باشید
            </Link>
          </p>
        </Reveal>

        <div className="space-y-3">
          {faqs.map((item, i) => {
            const open = current === item._id;
            return (
              <Reveal key={item._id} delay={Math.min(i, 5) * 0.05}>
                <div className={`overflow-hidden rounded-2xl border transition-colors duration-300 ${open ? "border-brand-500 bg-white shadow-lg dark:border-theme-cyan-500/60 dark:bg-gray-900" : "border-gray-200 bg-white/70 dark:border-white/10 dark:bg-white/[0.02]"}`}>
                  <button
                    type="button"
                    aria-expanded={open}
                    aria-controls={`faq-${item._id}`}
                    onClick={() => setOpenId(open ? "" : item._id)}
                    className="flex w-full cursor-pointer items-center justify-between gap-3 px-4 py-4 text-right sm:gap-4 sm:px-6 sm:py-5"
                  >
                    <span className="flex min-w-0 items-center gap-3">
                      <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg font-mono-signal text-xs font-black ${open ? "bg-brand-500 text-white" : "bg-gray-100 text-gray-500 dark:bg-white/10 dark:text-gray-400"}`}>
                        {fa(String(i + 1).padStart(2, "0"))}
                      </span>
                      <span className={`text-sm font-extrabold leading-relaxed transition-colors sm:text-base lg:text-lg ${open ? "text-brand-600 dark:text-theme-cyan-500" : "text-gray-900 dark:text-white"}`}>
                        {item.question}
                      </span>
                    </span>
                    <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full transition-all duration-300 ${open ? "rotate-45 bg-gradient-to-tr from-brand-500 to-theme-purple-500 text-white" : "bg-gray-100 text-gray-500 dark:bg-white/10"}`}>
                      <Plus className="h-4 w-4" aria-hidden="true" />
                    </span>
                  </button>
                  <div
                    id={`faq-${item._id}`}
                    className="grid transition-all duration-300 ease-out"
                    style={{ gridTemplateRows: open ? "1fr" : "0fr", opacity: open ? 1 : 0 }}
                  >
                    <div className="overflow-hidden">
                      <p className="border-t border-gray-100 px-4 pt-3 pb-5 text-sm leading-relaxed text-gray-600 dark:border-white/10 dark:text-gray-300 sm:px-6 sm:pb-6 sm:text-base">
                        {item.answer}
                      </p>
                    </div>
                  </div>
                </div>
              </Reveal>
            );
          })}
        </div>
      </div>
    </section>
  );
}
