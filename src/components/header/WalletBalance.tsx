"use client";
import Link from "next/link";
import { Wallet } from "lucide-react";
import { useT } from "@/i18n/useT";
import { useWallet } from "@/context/WalletContext";
import { useFormatNumber } from "@/components/dashboard/ui";

export default function WalletBalance() {
  const t = useT();
  const fmt = useFormatNumber();
  const { balance } = useWallet();

  return (
    <Link
      href="/dashboard/finance"
      className="flex items-center gap-2 rounded-xl border border-gray-200 bg-gray-50 py-1.5 pe-3 ps-1.5 transition hover:border-brand-300 hover:bg-brand-25 dark:border-gray-800 dark:bg-white/[0.03] dark:hover:border-brand-700 dark:hover:bg-brand-500/10"
    >
      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-brand-50 text-brand-600 dark:bg-brand-500/10 dark:text-brand-400">
        <Wallet className="h-4 w-4" />
      </span>
      <span>
        <span className="mb-0.5 block text-[11px] leading-none text-gray-500 dark:text-gray-400">{t("walletBalance")}</span>
        <span className="block text-sm font-semibold leading-none text-gray-800 dark:text-white/90">
          {balance === null ? "—" : `${fmt(balance)} ${t("walletUnit")}`}
        </span>
      </span>
    </Link>
  );
}
