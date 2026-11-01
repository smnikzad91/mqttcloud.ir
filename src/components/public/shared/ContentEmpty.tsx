import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import { HelpCircle, Rocket, Tag } from "lucide-react";
import { Button } from "@/components/public/shared/Button";

// Shown by the blog and news indexes before anything has been published, so
// the page still sends visitors somewhere useful instead of a bare "nothing found".
const NEXT_STEPS: { icon: LucideIcon; title: string; body: string; href: string }[] = [
  { icon: Rocket, title: "شروع سریع", body: "اتصال اولین دستگاه در چند دقیقه، با نمونه کد Node.js، پایتون و ESP32.", href: "/#how-it-works" },
  { icon: HelpCircle, title: "سوالات متداول", body: "آدرس و پورت‌ها، Client ID، تاپیک‌ها و محدودیت پلن‌ها.", href: "/faq" },
  { icon: Tag, title: "تعرفه‌ها", body: "از پلن رایگان شروع کنید و هر وقت لازم شد ارتقا دهید.", href: "/pricing" },
];

export function ContentEmpty({ icon: Icon, title, body }: { icon: LucideIcon; title: string; body: string }) {
  return (
    <div className="mx-auto max-w-3xl">
      <div className="rounded-3xl border border-gray-200 bg-white/70 px-6 py-12 text-center shadow-theme-xs backdrop-blur-sm dark:border-white/10 dark:bg-white/[0.03]">
        <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-50 text-brand-600 dark:bg-brand-500/10 dark:text-brand-400">
          <Icon className="h-7 w-7" aria-hidden="true" />
        </span>
        <h2 className="mt-5 text-xl font-extrabold text-gray-900 dark:text-white">{title}</h2>
        <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-gray-500 dark:text-gray-400">{body}</p>
        <Button href="/signup" size="md" className="mt-6">شروع رایگان</Button>
      </div>

      <ul className="mt-6 grid gap-4 sm:grid-cols-3">
        {NEXT_STEPS.map((s) => (
          <li key={s.href}>
            <Link href={s.href} className="group flex h-full flex-col rounded-2xl border border-gray-200 bg-white p-5 transition hover:-translate-y-0.5 hover:border-brand-300 hover:shadow-md dark:border-white/10 dark:bg-gray-900 dark:hover:border-brand-500/40">
              <s.icon className="h-5 w-5 text-brand-500" aria-hidden="true" />
              <span className="mt-3 text-sm font-bold text-gray-900 group-hover:text-brand-600 dark:text-white dark:group-hover:text-brand-400">{s.title}</span>
              <span className="mt-1 text-xs leading-relaxed text-gray-500 dark:text-gray-400">{s.body}</span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
